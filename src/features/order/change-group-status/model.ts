import { attach, createEvent, createStore, sample } from 'effector';
import { delay } from 'patronum';
import { z } from 'zod/v4';

import { ALLOWED_TRANSITIONS, type OrderGroup, type OrderStatus } from '@/entities/order';
import { api } from '@/shared/api';
import { createDisclosure } from '@/shared/lib/disclosure';
import { createForm } from '@/shared/lib/form';
import { message } from '@/shared/lib/message';

export const schema = z.object({
  status: z.string().min(1, 'Выберите статус'),
  comment: z.string().optional(),
});

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = { status: '', comment: '' };

export const form = createForm<FormValues>();
export const disclosure = createDisclosure();

export const triggered = createEvent<OrderGroup>();
export const reset = createEvent();
/** Статус группы сменился — несёт всю группу целиком, как и в change-status. */
export const mutated = createEvent<OrderGroup>();
export const validated = createEvent();

export const $group = createStore<OrderGroup | null>(null)
  .on(triggered, (_, group) => group)
  .reset(disclosure.closed);

/**
 * Варианты на выбор — пересечение ALLOWED_TRANSITIONS по всем нетерминальным
 * заказам группы: показываем только статус, куда может перейти каждый из них
 * (иначе бэкенд молча ничего не поймёт — 400 с перечислением блокирующих
 * заказов). Чисто клиентская подсказка, источник правды — сервер.
 */
export const $options = $group.map((group): OrderStatus[] => {
  if (!group) return [];
  const nonTerminal = group.orders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'DELIVERED');
  if (nonTerminal.length === 0) return [];
  return nonTerminal.reduce<OrderStatus[]>(
    (candidates, order) => candidates.filter((status) => ALLOWED_TRANSITIONS[order.status].includes(status)),
    ALLOWED_TRANSITIONS[nonTerminal[0].status],
  );
});

const changeGroupStatusFx = attach({
  source: { values: form.$formValues, group: $group },
  effect: ({ values, group }) => {
    if (!group) throw new Error('Группа не выбрана');
    return api.orders.changeGroupStatus(group.id, {
      status: values.status as OrderStatus,
      comment: values.comment?.trim() || undefined,
    });
  },
});

export const $mutating = changeGroupStatusFx.pending;

sample({ clock: triggered, target: disclosure.opened });
sample({ clock: validated, target: changeGroupStatusFx });
sample({ clock: changeGroupStatusFx.doneData, target: mutated });

// Закрываем только на успех: при 400 (недопустимый переход) юзер остаётся в модалке.
sample({ clock: [reset, mutated], target: disclosure.closed });

sample({
  clock: delay(disclosure.closed, 100),
  target: [form.resetFx.prepend(() => DEFAULT_VALUES), $group.reinit],
});

message({ clock: mutated, type: 'success', content: 'Статус группы обновлён' });
message({ clock: changeGroupStatusFx.fail.map(({ error }) => error), errorHandle: true });
