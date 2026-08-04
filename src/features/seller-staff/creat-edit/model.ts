import { attach, createEvent, createStore, merge, sample, split } from 'effector';
import { z } from 'zod/v4';
import { delay, or } from 'patronum';

import { api, type SellerStaff } from '@/shared/api';
import { createDisclosure } from '@/shared/lib/disclosure';
import { createForm } from '@/shared/lib/form';
import { message } from '@/shared/lib/message';

/**
 * Карточка сотрудника продавца. Все поля опциональны: минимальный сценарий —
 * завести человека с одним именем и выдать ему инвайт-ссылку в бота. Пароль
 * нужен только тем, кто будет ходить в админку.
 */
export const schema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.literal(''), z.email('Некорректный email')]).optional(),
  password: z.union([z.literal(''), z.string().min(6, 'Минимум 6 символов')]).optional(),
});

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = {
  name: '',
  phone: '',
  email: '',
  password: '',
};

export const form = createForm<FormValues>();

export const disclosure = createDisclosure();

export const createTriggered = createEvent<string>();
export const editTriggered = createEvent<{ sellerId: string; staff: SellerStaff }>();
export const reset = createEvent();
export const validated = createEvent();

const $sellerId = createStore<string | null>(null);
export const $editingStaff = createStore<SellerStaff | null>(null);
export const $mode = createStore<'create' | 'edit'>('create');

$mode.on(createTriggered, () => 'create').on(editTriggered, () => 'edit');
$sellerId.on(createTriggered, (_, sellerId) => sellerId).on(editTriggered, (_, { sellerId }) => sellerId);
$editingStaff.on(editTriggered, (_, { staff }) => staff);

sample({ clock: [createTriggered, editTriggered], target: disclosure.opened });

sample({
  clock: editTriggered,
  fn: ({ staff }): FormValues => ({
    name: staff.name ?? '',
    phone: staff.phone ?? '',
    email: staff.email ?? '',
    // Пароль не показываем и не префиллим: пустое поле = «не менять».
    password: '',
  }),
  target: form.resetFx,
});

// Пустая строка → undefined: бэкенду это «поле не прислали», а не «очистить».
const payload = (values: FormValues) => ({
  name: values.name || undefined,
  phone: values.phone || undefined,
  email: values.email || undefined,
  password: values.password || undefined,
});

export const createFx = attach({
  source: { values: form.$formValues, sellerId: $sellerId },
  effect: ({ values, sellerId }) => {
    if (!sellerId) throw new Error('Не выбран продавец');
    return api.sellers.staff.create(sellerId, payload(values));
  },
});

export const updateFx = attach({
  source: { values: form.$formValues, sellerId: $sellerId, editing: $editingStaff },
  effect: ({ values, sellerId, editing }) => {
    if (!sellerId || !editing) throw new Error('Не выбран сотрудник');
    return api.sellers.staff.update(sellerId, editing.id, payload(values));
  },
});

export const $mutating = or(createFx.pending, updateFx.pending);
export const mutated = merge([createFx.done, updateFx.done]);

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
  target: [form.resetFx.prepend(() => DEFAULT_VALUES), $editingStaff.reinit, $mode.reinit, $sellerId.reinit],
});

message({ clock: mutated, type: 'success', content: 'Сотрудник сохранён' });
message({ clock: merge([createFx.failData, updateFx.failData]), errorHandle: true });
