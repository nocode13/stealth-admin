import { attach, createEffect, createEvent, createStore, merge, restore, sample, split } from 'effector';
import { z } from 'zod/v4';
import { debounce, delay, or } from 'patronum';
import { createQuery } from 'effector-refetch';

import type { Category } from '@/entities/category';
import type { CatalogItem } from '@/entities/catalog';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
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
export const validated = createEvent();
export const categoriesSearchChanged = createEvent<string>();

export const $editingItem = createStore<CatalogItem | null>(null);
export const $mode = createStore<'create' | 'edit'>('create');

export const $categories = createStore<Category[]>([]);
export const $categoriesSearch = restore(categoriesSearchChanged, '');

const fetchCategoriesQuery = createQuery({
  effect: createEffect((search?: string) =>
    api.category.findAll({ limit: 100, status: 'APPROVED', search: search || undefined }),
  ),
  cache: { staleAfter: 10_000 },
  concurrency: 'TAKE_LATEST',
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
      status: values.status,
    }),
});

export const updateFx = attach({
  source: { values: form.$formValues, editing: $editingItem, role: userModel.$role },
  effect: ({ values, editing, role }) => {
    if (!editing) throw new Error('No catalog item');
    return api.catalog.update(editing.id, {
      name: values.name,
      slug: values.slug,
      categoryId: values.categoryId,
      description: values.description || undefined,
      unit: values.unit || undefined,
      status: role === 'SUPER_ADMIN' ? values.status : undefined,
    });
  },
});

export const uploadImageFx = attach({
  source: $editingItem,
  effect: (item, file: File) => {
    if (!item) throw new Error('Сначала сохраните позицию');
    return api.catalog.uploadImage(item.id, file);
  },
});

export const $mutating = or(createFx.pending, updateFx.pending, uploadImageFx.pending);
export const mutated = merge([createFx.done, updateFx.done, uploadImageFx.done]);
export const $categoriesFetching = fetchCategoriesQuery.$pending;

$mode.on(createTriggered, () => 'create').on(editTriggered, () => 'edit');

sample({
  clock: [createTriggered, editTriggered],
  fn: () => undefined,
  target: [fetchCategoriesQuery.start, disclosure.opened],
});

sample({
  clock: [editTriggered, uploadImageFx.doneData],
  target: $editingItem,
});

sample({
  clock: fetchCategoriesQuery.finished.done,
  fn: (res) => res.result.data.items,
  target: $categories,
});

sample({
  clock: debounce(categoriesSearchChanged, 300),
  target: fetchCategoriesQuery.start,
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

split({
  source: validated,
  match: $mode,
  cases: {
    create: createFx,
    edit: updateFx,
  },
});

sample({
  clock: [reset, mutated],
  target: disclosure.closed,
});

sample({
  clock: delay(disclosure.closed, 100),
  target: [
    form.resetFx.prepend(() => DEFAULT_VALUES),
    $editingItem.reinit,
    $mode.reinit,
    $categories.reinit,
    $categoriesSearch.reinit,
  ],
});

message({ clock: mutated, type: 'success', content: 'Позиция каталога сохранена' });

message({
  clock: merge([createFx.failData, updateFx.failData, uploadImageFx.failData]),
  errorHandle: true,
});
