import { attach, createEvent, createStore, merge, sample, split } from 'effector';
import { z } from 'zod/v4';
import { delay, or } from 'patronum';

import type { Category } from '@/entities/category';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import { createDisclosure } from '@/shared/lib/disclosure';
import { createForm } from '@/shared/lib/form';
import { message } from '@/shared/lib/message';

export const schema = z.object({
  nameRu: z.string().min(2, 'Минимум 2 символа'),
  nameUz: z.string().optional(),
  nameEn: z.string().optional(),
  nameKaa: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = {
  nameRu: '',
  nameUz: '',
  nameEn: '',
  nameKaa: '',
  status: undefined,
};

export const form = createForm<FormValues>();

export const disclosure = createDisclosure();

export const createTriggered = createEvent();
export const editTriggered = createEvent<Category>();
export const reset = createEvent();
export const mutated = createEvent<Category>();
export const validated = createEvent();

export const $editingCategory = createStore<Category | null>(null)
  .on(editTriggered, (_, category) => category)
  .reset(disclosure.closed);
export const $mode = createStore<'create' | 'edit'>('create')
  .on(createTriggered, () => 'create')
  .on(editTriggered, () => 'edit');

export const createFx = attach({
  source: form.$formValues,
  effect: (values: FormValues) => api.category.create(values),
});

export const updateFx = attach({
  source: { values: form.$formValues, editing: $editingCategory, role: userModel.$role },
  effect: ({ values, editing, role }) => {
    if (!editing || !role) {
      throw new Error('No category or role');
    }
    return api.category.update(editing.id, { ...values, status: role === 'SUPER_ADMIN' ? values.status : undefined });
  },
});

export const $mutating = or(createFx.pending, updateFx.pending);

sample({
  clock: [createTriggered, editTriggered],
  target: disclosure.opened,
});

sample({
  clock: editTriggered,
  fn: (category): FormValues => ({
    nameRu: category.nameRu,
    nameUz: category.nameUz ?? '',
    nameEn: category.nameEn ?? '',
    nameKaa: category.nameKaa ?? '',
    status: category.status,
  }),
  target: form.resetFx,
});

split({
  source: validated,
  match: $mode,
  cases: {
    create: createFx,
    edit: updateFx,
  },
});

sample({
  clock: [createFx.doneData, updateFx.doneData],
  target: mutated,
});

sample({
  clock: [reset, mutated],
  target: disclosure.closed,
});

sample({
  clock: delay(disclosure.closed, 100),
  target: [form.resetFx.prepend(() => DEFAULT_VALUES), $editingCategory.reinit, $mode.reinit],
});

message({ clock: mutated, type: 'success', content: 'Категория сохранена' });
message({ clock: merge([createFx.fail, updateFx.fail]).map(({ error }) => error), errorHandle: true });
