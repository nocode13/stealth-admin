import { attach, createEvent, createStore, merge, sample, split } from 'effector';
import { z } from 'zod/v4';
import { delay, or } from 'patronum';

import type { Seller } from '@/entities/seller';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import { createDisclosure } from '@/shared/lib/disclosure';
import { createForm } from '@/shared/lib/form';
import { message } from '@/shared/lib/message';

export const schema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  description: z.string().optional(),
  ownerEmail: z.union([z.literal(''), z.email('Некорректный email')]).optional(),
  ownerPassword: z.string().optional(),
  ownerPhone: z.string().optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']).optional(),
});

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = {
  name: '',
  description: '',
  ownerEmail: '',
  ownerPassword: '',
  ownerPhone: '',
  status: undefined,
};

export const form = createForm<FormValues>();

export const disclosure = createDisclosure();

export const createTriggered = createEvent();
export const editTriggered = createEvent<Seller>();
export const reset = createEvent();
export const validated = createEvent();

export const $editingSeller = createStore<Seller | null>(null);
export const $mode = createStore<'create' | 'edit'>('create');

$mode.on(createTriggered, () => 'create').on(editTriggered, () => 'edit');

sample({ clock: [createTriggered, editTriggered], target: disclosure.opened });

sample({
  clock: editTriggered,
  fn: (seller): FormValues => ({
    name: seller.name,
    description: seller.description ?? '',
    ownerEmail: '',
    ownerPassword: '',
    ownerPhone: '',
    status: seller.status,
  }),
  target: form.resetFx,
});

export const createFx = attach({
  source: form.$formValues,
  effect: (values: FormValues) => {
    if (!values.ownerEmail || !values.ownerPassword) {
      throw new Error('Укажите email и пароль владельца');
    }
    return api.sellers.create({
      name: values.name,
      description: values.description || undefined,
      ownerEmail: values.ownerEmail,
      ownerPassword: values.ownerPassword,
      ownerPhone: values.ownerPhone || undefined,
    });
  },
});

export const updateFx = attach({
  source: { values: form.$formValues, editing: $editingSeller, role: userModel.$role },
  effect: ({ values, editing, role }) => {
    if (!editing) throw new Error('No seller');
    return api.sellers.update(editing.id, {
      name: values.name,
      description: values.description || undefined,
      status: role === 'SUPER_ADMIN' ? values.status : undefined,
    });
  },
});

// Баннер грузится только на существующего продавца — тот же паттерн, что у каталога:
// сначала сохраняем карточку, потом загружаем изображение.
export const uploadBannerFx = attach({
  source: $editingSeller,
  effect: (seller, file: File) => {
    if (!seller) throw new Error('Сначала сохраните продавца');
    return api.sellers.uploadBanner(seller.id, file);
  },
});

export const $mutating = or(createFx.pending, updateFx.pending, uploadBannerFx.pending);
export const mutated = merge([createFx.done, updateFx.done, uploadBannerFx.done]);

sample({
  clock: [editTriggered, uploadBannerFx.doneData],
  target: $editingSeller,
});

split({
  source: validated,
  match: $mode,
  cases: {
    create: createFx,
    edit: updateFx,
  },
});

sample({ clock: [reset, mutated], target: disclosure.closed });

sample({
  clock: delay(disclosure.closed, 100),
  target: [form.resetFx.prepend(() => DEFAULT_VALUES), $editingSeller.reinit, $mode.reinit],
});

message({ clock: mutated, type: 'success', content: 'Продавец сохранён' });
message({
  clock: merge([createFx.failData, updateFx.failData, uploadBannerFx.failData]),
  errorHandle: true,
});
