import { attach, combine, createEffect, createEvent, createStore, merge, restore, sample, split } from 'effector';
import { z } from 'zod/v4';
import { createQuery } from 'effector-refetch';
import { debounce, delay, not, or } from 'patronum';

import type { CatalogItem } from '@/entities/catalog';
import type { Listing } from '@/entities/listing';
import type { Seller } from '@/entities/seller';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import { createDisclosure } from '@/shared/lib/disclosure';
import { createForm } from '@/shared/lib/form';
import { message } from '@/shared/lib/message';
import { toSum, toTiyin } from '@/shared/lib/currency/currency';

export const schema = z.object({
  catalogItemId: z.string().min(1, 'Выберите товар'),
  price: z.coerce.number().min(0, 'Цена не может быть отрицательной'),
  stock: z.coerce.number().int().min(0, 'Остаток не может быть отрицательным'),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  // Обязательность зависит от роли и режима (только SUPER_ADMIN + create),
  // а zod о них не знает — проверка живёт в `$sellerMissing` ниже.
  sellerId: z.string().optional(),
});

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = {
  catalogItemId: '',
  price: 0,
  stock: 0,
  status: 'DRAFT',
  sellerId: '',
};

const $isSuperAdmin = userModel.$role.map((role) => role === 'SUPER_ADMIN');

export const form = createForm<FormValues>();

export const disclosure = createDisclosure();

export const createTriggered = createEvent();
/** Создание листинга по только что заведённой позиции каталога (цепочка со страницы каталога). */
export const createForCatalogItemTriggered = createEvent<CatalogItem>();
export const editTriggered = createEvent<Listing>();
export const reset = createEvent();
export const validated = createEvent();
export const catalogItemsSearchChanged = createEvent<string>();
export const sellersSearchChanged = createEvent<string>();

export const $editingListing = createStore<Listing | null>(null);
export const $mode = createStore<'create' | 'edit'>('create');

const opened = merge([createTriggered, createForCatalogItemTriggered, editTriggered]);

$mode.on([createTriggered, createForCatalogItemTriggered], () => 'create').on(editTriggered, () => 'edit');

sample({ clock: editTriggered, target: $editingListing });

const $catalogItems = createStore<CatalogItem[]>([]);
export const $catalogItemsSearch = restore(catalogItemsSearchChanged, '');

// `status: 'APPROVED'` бэкенд применяет только для SUPER_ADMIN — SELLER'у он всегда отдаёт
// master APPROVED + свои позиции любого статуса, поэтому клиентский фильтр остаётся.
const fetchCatalogItemsQuery = createQuery({
  effect: createEffect((search?: string) =>
    api.catalog.findAll({ limit: 100, status: 'APPROVED', search: search || undefined }),
  ),
  cache: { staleAfter: 10_000 },
  concurrency: 'TAKE_LATEST',
});

export const $catalogItemsFetching = fetchCatalogItemsQuery.$pending;

// Выбранная позиция может не попасть в текущую выдачу (первая сотня отсортирована по имени,
// а поиск её ещё и сужает) — тогда селект показал бы голый id, поэтому подмешиваем её
// к опциям вручную: и товар из цепочки «создали каталог → создаём листинг», и товар
// редактируемого листинга.
const withPreselected = (items: CatalogItem[], preselected: CatalogItem | null) =>
  !preselected || items.some((item) => item.id === preselected.id) ? items : [preselected, ...items];

const $preselectedCatalogItem = createStore<CatalogItem | null>(null);

export const $catalogItemOptions = combine($catalogItems, $preselectedCatalogItem, withPreselected);

export const $sellers = createStore<Seller[]>([]);
export const $sellersSearch = restore(sellersSearchChanged, '');

// `GET /admin/sellers` закрыт ролью SUPER_ADMIN — у продавца запрос вернул бы 403,
// поэтому старт запроса везде гейтится ролью.
const fetchSellersQuery = createQuery({
  effect: createEffect((search?: string) =>
    api.sellers.findAll({ limit: 100, status: 'ACTIVE', search: search || undefined }),
  ),
  cache: { staleAfter: 10_000 },
  concurrency: 'TAKE_LATEST',
});

export const $sellersFetching = fetchSellersQuery.$pending;

sample({
  clock: opened,
  fn: () => undefined,
  target: [fetchCatalogItemsQuery.start, disclosure.opened],
});

sample({
  clock: debounce(catalogItemsSearchChanged, 300),
  target: fetchCatalogItemsQuery.start,
});

sample({
  clock: fetchCatalogItemsQuery.finished.done,
  fn: (res) => res.result.data.items.filter((item) => item.status === 'APPROVED'),
  target: $catalogItems,
});

sample({ clock: createForCatalogItemTriggered, target: $preselectedCatalogItem });

sample({
  clock: editTriggered,
  fn: (listing) => listing.catalogItem,
  target: $preselectedCatalogItem,
});

sample({
  clock: opened,
  filter: $isSuperAdmin,
  fn: () => undefined,
  target: fetchSellersQuery.start,
});

sample({
  clock: debounce(sellersSearchChanged, 300),
  filter: $isSuperAdmin,
  target: fetchSellersQuery.start,
});

sample({
  clock: fetchSellersQuery.finished.done,
  fn: (res) => res.result.data.items,
  target: $sellers,
});

sample({
  clock: createForCatalogItemTriggered,
  fn: (item): FormValues => ({ ...DEFAULT_VALUES, catalogItemId: item.id }),
  target: form.resetFx,
});

sample({
  clock: editTriggered,
  fn: (listing): FormValues => ({
    catalogItemId: listing.catalogItemId,
    price: toSum(Number(listing.price)),
    stock: listing.stock,
    status: listing.status,
    sellerId: listing.sellerId,
  }),
  target: form.resetFx,
});

export const createFx = attach({
  source: { values: form.$formValues, isSuperAdmin: $isSuperAdmin },
  effect: ({ values, isSuperAdmin }) =>
    api.listing.create({
      catalogItemId: values.catalogItemId,
      // `$formValues` — сырой снапшот из form.watch(), zod-коэрсия (z.coerce.number())
      // применяется только валидатором и до эффекта не доходит — приводим типы вручную.
      price: toTiyin(Number(values.price)),
      stock: Math.trunc(Number(values.stock)),
      status: values.status,
      // Продавцу sellerId проставляет бэкенд из сессии.
      sellerId: isSuperAdmin ? values.sellerId : undefined,
    }),
});

export const updateFx = attach({
  source: { values: form.$formValues, editing: $editingListing },
  effect: ({ values, editing }) => {
    if (!editing) throw new Error('No listing');
    // sellerId в PATCH не отправляем: продавца у листинга менять нельзя.
    return api.listing.update(editing.id, {
      catalogItemId: values.catalogItemId,
      price: toTiyin(Number(values.price)),
      stock: Math.trunc(Number(values.stock)),
      status: values.status,
    });
  },
});

export const $mutating = or(createFx.pending, updateFx.pending);
export const mutated = merge([createFx.done, updateFx.done]);

const $sellerMissing = combine(
  form.$formValues,
  $isSuperAdmin,
  $mode,
  (values, isSuperAdmin, mode) => isSuperAdmin && mode === 'create' && !values.sellerId,
);

const submitted = sample({ clock: validated, filter: not($sellerMissing) });

split({
  source: submitted,
  match: $mode,
  cases: {
    create: createFx,
    edit: updateFx,
  },
});

message({
  clock: sample({ clock: validated, filter: $sellerMissing }),
  type: 'error',
  content: 'Выберите продавца',
});

sample({
  clock: [reset, mutated],
  target: disclosure.closed,
});

sample({
  clock: delay(disclosure.closed, 100),
  target: [
    form.resetFx.prepend(() => DEFAULT_VALUES),
    $editingListing.reinit,
    $mode.reinit,
    $catalogItems.reinit,
    $catalogItemsSearch.reinit,
    $preselectedCatalogItem.reinit,
    $sellers.reinit,
    $sellersSearch.reinit,
  ],
});

message({ clock: mutated, type: 'success', content: 'Позиция сохранена' });
message({ clock: merge([createFx.failData, updateFx.failData]), errorHandle: true });
