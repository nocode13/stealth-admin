import { attach, createEffect, createEvent, createStore, merge, sample, split } from 'effector';
import { z } from 'zod/v4';
import { delay, or } from 'patronum';

import type { CatalogItem } from '@/entities/catalog';
import type { Listing } from '@/entities/listing';
import { api } from '@/shared/api';
import { createDisclosure } from '@/shared/lib/disclosure';
import { createForm } from '@/shared/lib/form';
import { message } from '@/shared/lib/message';

export const schema = z.object({
  catalogItemId: z.string().min(1, 'Выберите товар'),
  price: z.coerce.number().min(0, 'Цена не может быть отрицательной'),
  currency: z.string().optional(),
  stock: z.coerce.number().int().min(0, 'Остаток не может быть отрицательным'),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
});

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = {
  catalogItemId: '',
  price: 0,
  currency: 'UZS',
  stock: 0,
  status: 'DRAFT',
};

export const form = createForm<FormValues>();

export const disclosure = createDisclosure();

export const createTriggered = createEvent();
export const editTriggered = createEvent<Listing>();
export const reset = createEvent();
export const mutated = createEvent<Listing>();
export const validated = createEvent();

export const $editingListing = createStore<Listing | null>(null)
  .on(editTriggered, (_, listing) => listing)
  .reset(disclosure.closed);
export const $mode = createStore<'create' | 'edit'>('create')
  .on(createTriggered, () => 'create')
  .on(editTriggered, () => 'edit');

const catalogItemOptionsFetchedFx = createEffect(() => api.catalog.findAll({ limit: 100 }).then((r) => r.data));

export const $catalogItemOptions = createStore<CatalogItem[]>([]).on(catalogItemOptionsFetchedFx.doneData, (_, page) =>
  page.items.filter((item) => item.status === 'APPROVED'),
);

sample({
  clock: [createTriggered, editTriggered],
  target: catalogItemOptionsFetchedFx,
});

sample({
  clock: [createTriggered, editTriggered],
  target: disclosure.opened,
});

sample({
  clock: editTriggered,
  fn: (listing): FormValues => ({
    catalogItemId: listing.catalogItemId,
    price: Number(listing.price),
    currency: listing.currency,
    stock: listing.stock,
    status: listing.status,
  }),
  target: form.resetFx,
});

export const createFx = attach({
  source: form.$formValues,
  effect: (values: FormValues) =>
    api.listing.create({
      catalogItemId: values.catalogItemId,
      price: values.price,
      currency: values.currency || undefined,
      stock: values.stock,
      status: values.status,
    }),
});

export const updateFx = attach({
  source: { values: form.$formValues, editing: $editingListing },
  effect: ({ values, editing }) => {
    if (!editing) throw new Error('No listing');
    return api.listing.update(editing.id, {
      catalogItemId: values.catalogItemId,
      price: values.price,
      currency: values.currency || undefined,
      stock: values.stock,
      status: values.status,
    });
  },
});

export const $mutating = or(createFx.pending, updateFx.pending);

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
  target: [form.resetFx.prepend(() => DEFAULT_VALUES), $editingListing.reinit, $mode.reinit],
});

message({ clock: mutated, type: 'success', content: 'Позиция сохранена' });
message({ clock: merge([createFx.fail, updateFx.fail]).map(({ error }) => error), errorHandle: true });
