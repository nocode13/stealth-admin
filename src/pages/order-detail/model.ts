import { createEffect, createStore, merge, sample } from 'effector';
import { cache, concurrency, createQuery } from 'effector-refetch';

import { ChangeOrderStatus } from '@/features/order/change-status';
import type { Order } from '@/entities/order';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';
import { message } from '@/shared/lib/message';

/**
 * Первая в проекте страница с параметром роута: id берём из `route.$params`
 * (детальных страниц раньше не было — всё редактировалось в модалках).
 */
export const factory = ({ route }: LazyPageFactoryParams<{ id: string }>) => {
  const authorizedRoute = userModel.chainAuthorized({
    route,
    roles: ['SELLER', 'SUPER_ADMIN'],
  });

  const fetchQuery = createQuery({
    effect: createEffect((id: string) => api.orders.findOne(id)),
  });

  const $order = createStore<Order | null>(null)
    .on(fetchQuery.finished.done, (_, { result }) => result)
    // Смена статуса возвращает пересчитанный заказ — кладём его целиком,
    // без повторного запроса (как profileUpdated/cartReceived в мобилке).
    .on(ChangeOrderStatus.model.mutated, (_, order) => order);

  const purge = merge([ChangeOrderStatus.model.mutated]);

  concurrency(fetchQuery, { strategy: 'TAKE_LATEST' });
  cache(fetchQuery, { staleAfter: 5000, purge });

  sample({
    clock: authorizedRoute.opened,
    source: authorizedRoute.$params,
    filter: (params) => !!params.id,
    fn: (params) => params.id,
    target: fetchQuery.start,
  });

  sample({
    clock: authorizedRoute.closed,
    target: [$order.reinit, ChangeOrderStatus.model.reset],
  });

  message({
    clock: fetchQuery.finished.fail.map((res) => res.error),
    errorHandle: true,
  });

  return { $order, $pending: fetchQuery.$pending };
};
