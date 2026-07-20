import { attach, createEvent, createStore, sample } from 'effector';
import { delay } from 'patronum';
import { z } from 'zod/v4';

import { ALLOWED_TRANSITIONS, type Order, type OrderStatus } from '@/entities/order';
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

export const triggered = createEvent<Order>();
export const reset = createEvent();
/** Статус сменился — списки заказов слушают это событие для инвалидации. */
export const mutated = createEvent<Order>();
export const validated = createEvent();

export const $order = createStore<Order | null>(null)
  .on(triggered, (_, order) => order)
  .reset(disclosure.closed);

/** Доступные переходы из текущего статуса — из них строится селект. */
export const $options = $order.map((order) => (order ? ALLOWED_TRANSITIONS[order.status] : []));

const changeStatusFx = attach({
  source: { values: form.$formValues, order: $order },
  effect: ({ values, order }) => {
    if (!order) throw new Error('Заказ не выбран');
    return api.orders.changeStatus(order.id, {
      status: values.status as OrderStatus,
      comment: values.comment?.trim() || undefined,
    });
  },
});

export const $mutating = changeStatusFx.pending;

sample({ clock: triggered, target: disclosure.opened });
sample({ clock: validated, target: changeStatusFx });
sample({ clock: changeStatusFx.doneData, target: mutated });

// Закрываем только на успех: при 400 (недопустимый переход) юзер остаётся в модалке.
sample({ clock: [reset, mutated], target: disclosure.closed });

sample({
  clock: delay(disclosure.closed, 100),
  target: [form.resetFx.prepend(() => DEFAULT_VALUES), $order.reinit],
});

message({ clock: mutated, type: 'success', content: 'Статус обновлён' });
message({ clock: changeStatusFx.fail.map(({ error }) => error), errorHandle: true });
