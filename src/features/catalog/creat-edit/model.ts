import { attach, createEffect, createEvent, createStore, merge, sample, split } from 'effector';
import { z } from 'zod/v4';
import { delay, or } from 'patronum';

import type { Category } from '@/entities/category';
import type { CatalogItem } from '@/entities/catalog';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import type { ReviewStatus } from '@/shared/api';
import { createDisclosure } from '@/shared/lib/disclosure';
import { createForm } from '@/shared/lib/form';
import { message } from '@/shared/lib/message';

export const schema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  slug: z.string().min(2, 'Минимум 2 символа'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  description: z.string().optional(),
  unit: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = {
  name: '',
  slug: '',
  categoryId: '',
  description: '',
  unit: '',
  status: undefined,
};

export const form = createForm<FormValues>();

export const disclosure = createDisclosure();

export const createTriggered = createEvent();
export const editTriggered = createEvent<CatalogItem>();
export const reset = createEvent();
export const mutated = createEvent<CatalogItem>();
export const validated = createEvent();

export const $editingItem = createStore<CatalogItem | null>(null)
  .on(editTriggered, (_, item) => item)
  .reset(disclosure.closed);
export const $mode = createStore<'create' | 'edit'>('create')
  .on(createTriggered, () => 'create')
  .on(editTriggered, () => 'edit');

const categoryOptionsFetchedFx = createEffect(() => api.category.findAll({ limit: 100 }).then((r) => r.data));

export const $categoryOptions = createStore<Category[]>([]).on(categoryOptionsFetchedFx.doneData, (_, page) =>
  page.items.filter((category) => category.status === 'APPROVED'),
);

sample({
  clock: [createTriggered, editTriggered],
  target: categoryOptionsFetchedFx,
});

sample({
  clock: [createTriggered, editTriggered],
  target: disclosure.opened,
});

sample({
  clock: editTriggered,
  fn: (item): FormValues => ({
    name: item.name,
    slug: item.slug,
    categoryId: item.categoryId,
    description: item.description ?? '',
    unit: item.unit ?? '',
    status: item.status,
  }),
  target: form.resetFx,
});

export const createFx = attach({
  source: form.$formValues,
  effect: (values: FormValues) =>
    api.catalog.create({
      name: values.name,
      slug: values.slug,
      categoryId: values.categoryId,
      description: values.description || undefined,
      unit: values.unit || undefined,
    }),
});

export const updateFx = attach({
  source: { values: form.$formValues, editing: $editingItem },
  effect: ({ values, editing }) => {
    if (!editing) throw new Error('No catalog item');
    return api.catalog.update(editing.id, {
      name: values.name,
      slug: values.slug,
      categoryId: values.categoryId,
      description: values.description || undefined,
      unit: values.unit || undefined,
    });
  },
});

export const updateStatusFx = attach({
  source: { editing: $editingItem, role: userModel.$role },
  effect: ({ editing, role }, status: ReviewStatus) => {
    if (!editing || role !== 'SUPER_ADMIN') throw new Error('Not allowed');
    return api.catalog.updateStatus(editing.id, { status });
  },
});

export const uploadImageFx = attach({
  source: $editingItem,
  effect: (item, file: File) => {
    if (!item) throw new Error('Сначала сохраните позицию');
    return api.catalog.uploadImage(item.id, file);
  },
});

export const $mutating = or(createFx.pending, updateFx.pending, updateStatusFx.pending, uploadImageFx.pending);

split({
  source: validated,
  match: $mode,
  cases: {
    create: createFx,
    edit: updateFx,
  },
});

sample({
  clock: updateFx.doneData,
  source: { values: form.$formValues, role: userModel.$role, editing: $editingItem },
  filter: ({ role, values, editing }) => role === 'SUPER_ADMIN' && !!values.status && values.status !== editing?.status,
  fn: ({ values }) => values.status!,
  target: updateStatusFx,
});

sample({
  clock: createFx.doneData,
  target: mutated,
});

sample({
  clock: updateFx.doneData,
  source: { values: form.$formValues, role: userModel.$role, editing: $editingItem },
  filter: ({ role, values, editing }) =>
    !(role === 'SUPER_ADMIN' && !!values.status && values.status !== editing?.status),
  fn: (_, item) => item,
  target: mutated,
});

sample({
  clock: updateStatusFx.doneData,
  target: mutated,
});

sample({
  clock: uploadImageFx.doneData,
  target: [$editingItem, mutated],
});

sample({
  clock: [reset, mutated],
  target: disclosure.closed,
});

sample({
  clock: delay(disclosure.closed, 100),
  target: [form.resetFx.prepend(() => DEFAULT_VALUES), $editingItem.reinit, $mode.reinit],
});

message({ clock: mutated, type: 'success', content: 'Позиция каталога сохранена' });
message({
  clock: merge([createFx.fail, updateFx.fail, updateStatusFx.fail, uploadImageFx.fail]).map(({ error }) => error),
  errorHandle: true,
});
