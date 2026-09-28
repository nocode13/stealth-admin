import { attach, createEffect, createEvent, createStore, sample } from 'effector';

import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import type { PriceSource } from '@/shared/api';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';
import { message } from '@/shared/lib/message';

/** Сдвиг источника на одну позицию. Базовая наценка закреплена последней — её не двигаем. */
export const moveSource = (order: PriceSource[], index: number, direction: 'up' | 'down'): PriceSource[] | null => {
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= order.length) return null;
  if (order[index] === 'BASE_MARKUP' || order[target] === 'BASE_MARKUP') return null;
  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({
    route,
    roles: ['SUPER_ADMIN'],
  });

  const moved = createEvent<{ index: number; direction: 'up' | 'down' }>();

  const fetchFx = createEffect(() => api.pricePriority.get());

  const $order = createStore<PriceSource[]>([]);

  const updateFx = attach({
    source: $order,
    effect: (order, { index, direction }: { index: number; direction: 'up' | 'down' }) => {
      const next = moveSource(order, index, direction);
      if (!next) throw new Error('Этот источник нельзя сдвинуть');
      return api.pricePriority.update(next);
    },
  });

  $order.on(fetchFx.doneData, (_, order) => order).on(updateFx.doneData, (_, order) => order);

  sample({ clock: authorizedRoute.opened, target: fetchFx });
  sample({ clock: moved, filter: updateFx.pending.map((pending) => !pending), target: updateFx });
  sample({ clock: authorizedRoute.closed, target: $order.reinit });

  message({ clock: updateFx.done, type: 'success', content: 'Приоритет сохранён — цены пересчитаны' });
  message({ clock: updateFx.failData, errorHandle: true });
  message({ clock: fetchFx.failData, errorHandle: true });

  return {
    $order,
    $pending: fetchFx.pending,
    $saving: updateFx.pending,
    moved,
  };
};
