import { attach, createEvent, createStore, sample } from 'effector';
import { delay } from 'patronum';
import { z } from 'zod/v4';

import type { Seller } from '@/entities/seller';
import { api } from '@/shared/api';
import { createDisclosure } from '@/shared/lib/disclosure';
import { createForm } from '@/shared/lib/form';
import { message } from '@/shared/lib/message';

export const schema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']),
});

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = { status: 'PENDING' };

export const form = createForm<FormValues>();
export const disclosure = createDisclosure();

export const triggered = createEvent<Seller>();
export const reset = createEvent();
export const mutated = createEvent<Seller>();
export const validated = createEvent();

export const $seller = createStore<Seller | null>(null)
  .on(triggered, (_, seller) => seller)
  .reset(disclosure.closed);

const changeStatusFx = attach({
  source: { values: form.$formValues, seller: $seller },
  effect: ({ values, seller }) => {
    if (!seller) throw new Error('Продавец не выбран');
    return api.sellers.updateStatus(seller.id, { status: values.status });
  },
});

export const $mutating = changeStatusFx.pending;

sample({ clock: triggered, target: disclosure.opened });

sample({
  clock: triggered,
  fn: (seller): FormValues => ({ status: seller.status }),
  target: form.resetFx,
});

sample({ clock: validated, target: changeStatusFx });
sample({ clock: changeStatusFx.doneData, target: mutated });

sample({ clock: [reset, mutated], target: disclosure.closed });

sample({
  clock: delay(disclosure.closed, 100),
  target: [form.resetFx.prepend(() => DEFAULT_VALUES), $seller.reinit],
});

message({ clock: mutated, type: 'success', content: 'Статус продавца обновлён' });
message({ clock: changeStatusFx.fail.map(({ error }) => error), errorHandle: true });
