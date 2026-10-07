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

const optionalNumber = (inner: z.ZodType<number>) =>
  z.preprocess((value) => (value === '' || value === undefined ? null : value), z.union([z.null(), inner]));

export const schema = z.object({
  catalogItemId: z.string().min(1, 'Выберите товар'),
  // Код продавца для поиска; пусто = null («кода нет»).
  sku: z.string().trim().max(64, 'Не больше 64 символов').optional(),
  // Себестоимость — столько платформа должна продавцу. Розницу считает бэкенд
  // (наценка + акции), в форме её нет.
  costPrice: z.coerce.number().min(0, 'Себестоимость не может быть отрицательной'),
  // Своя наценка, % — только SUPER_ADMIN. Пусто = null = базовая ступенчатая, а не 0:
  // z.coerce.number() иначе молча превратил бы пустое поле в 0% (как порог в настройках).
  customMarkupPercent: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.union([z.null(), z.coerce.number().min(0, 'Не может быть отрицательной').max(1000, 'Не больше 1000%')]),
  ),
  stock: z.coerce.number().int().min(0, 'Остаток не может быть отрицательным'),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  // Атрибуты варианта. Пустое поле = null = «не указано» (тот же z.preprocess, что у
  // наценки): у одной позиции каталога у продавца бывает несколько вариантов.
  seedling: z.boolean().optional(),
  // В UI — литры, в API — мл (0,5 л = 500).
  potVolumeLiters: optionalNumber(z.coerce.number().positive('Больше нуля').max(1000, 'Не больше 1000 л')),
  stemCount: optionalNumber(z.coerce.number().int('Целое число').min(1, 'Минимум 1').max(10000)),
  heightCm: optionalNumber(z.coerce.number().int('Целое число').min(1, 'Минимум 1').max(10000)),
  // Обязательность зависит от роли и режима (только SUPER_ADMIN + create),
  // а zod о них не знает — проверка живёт в `$sellerMissing` ниже.
  sellerId: z.string().optional(),
});

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = {
  catalogItemId: '',
  sku: '',
  costPrice: 0,
  customMarkupPercent: null,
  stock: 0,
  status: 'DRAFT',
  sellerId: '',
  seedling: false,
  potVolumeLiters: null,
  stemCount: null,
  heightCm: null,
};

const $isSuperAdmin = userModel.$role.map((role) => role === 'SUPER_ADMIN');

// В UI — проценты, в API — базисные пункты (35% = 3500); null — базовая наценка.
const toMarkupBps = (percent: FormValues['customMarkupPercent']) =>
  percent === null ? null : Math.round(Number(percent) * 100);

// Пустой код — null: в PATCH это снимает код, а не пишет пустую строку.
const toSku = (value: FormValues['sku']) => value?.trim() || null;

// `$formValues` — сырой снапшот формы, zod-коэрсия до эффектов не доходит: числа
// приводим вручную, пустое поле — null («не указано»).
const toNullableInt = (value: unknown) =>
  value === null || value === undefined || value === '' ? null : Math.trunc(Number(value));

const toVariantPayload = (values: FormValues) => ({
  seedling: !!values.seedling,
  potVolumeMl:
    values.potVolumeLiters === null || values.potVolumeLiters === undefined || String(values.potVolumeLiters) === ''
      ? null
      : Math.round(Number(values.potVolumeLiters) * 1000),
  stemCount: toNullableInt(values.stemCount),
  heightCm: toNullableInt(values.heightCm),
});

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
/** Ручное «Обновить» в галерее: подтянуть листинг, пока его видео обрабатывается. */
export const refreshTriggered = createEvent();

export const $editingListing = createStore<Listing | null>(null);
export const $mode = createStore<'create' | 'edit'>('create');

const opened = merge([createTriggered, createForCatalogItemTriggered, editTriggered]);

$mode.on([createTriggered, createForCatalogItemTriggered], () => 'create').on(editTriggered, () => 'edit');

// $editingListing синхронизируется и ответами операций с галереей — там свежий ownMedia.
// Эффекты объявлены ниже, поэтому sample — после них.

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
    sku: listing.sku ?? '',
    costPrice: toSum(Number(listing.costPrice)),
    customMarkupPercent:
      listing.customMarkupBps === null || listing.customMarkupBps === undefined ? null : listing.customMarkupBps / 100,
    stock: listing.stock,
    status: listing.status,
    sellerId: listing.sellerId,
    seedling: listing.seedling,
    potVolumeLiters: listing.potVolumeMl === null ? null : listing.potVolumeMl / 1000,
    stemCount: listing.stemCount,
    heightCm: listing.heightCm,
  }),
  target: form.resetFx,
});

export const createFx = attach({
  source: { values: form.$formValues, isSuperAdmin: $isSuperAdmin },
  effect: ({ values, isSuperAdmin }) =>
    api.listing.create({
      catalogItemId: values.catalogItemId,
      sku: toSku(values.sku),
      // `$formValues` — сырой снапшот из form.watch(), zod-коэрсия (z.coerce.number())
      // применяется только валидатором и до эффекта не доходит — приводим типы вручную.
      costPrice: toTiyin(Number(values.costPrice)),
      stock: Math.trunc(Number(values.stock)),
      status: values.status,
      // Продавцу sellerId проставляет бэкенд из сессии.
      sellerId: isSuperAdmin ? values.sellerId : undefined,
      // Свою наценку бэкенд принимает только от SUPER_ADMIN (продавцу — 403).
      customMarkupBps: isSuperAdmin ? toMarkupBps(values.customMarkupPercent) : undefined,
      ...toVariantPayload(values),
    }),
});

export const updateFx = attach({
  source: { values: form.$formValues, editing: $editingListing, isSuperAdmin: $isSuperAdmin },
  effect: ({ values, editing, isSuperAdmin }) => {
    if (!editing) throw new Error('No listing');
    // sellerId в PATCH не отправляем: продавца у листинга менять нельзя.
    return api.listing.update(editing.id, {
      catalogItemId: values.catalogItemId,
      sku: toSku(values.sku),
      costPrice: toTiyin(Number(values.costPrice)),
      stock: Math.trunc(Number(values.stock)),
      status: values.status,
      customMarkupBps: isSuperAdmin ? toMarkupBps(values.customMarkupPercent) : undefined,
      ...toVariantPayload(values),
    });
  },
});

// Своя галерея варианта — только в режиме редактирования (эндпоинту нужен id).
export const addMediaFx = attach({
  source: $editingListing,
  effect: (listing, file: File) => {
    if (!listing) throw new Error('Сначала сохраните позицию');
    return api.listing.addMedia(listing.id, file);
  },
});

export const removeMediaFx = attach({
  source: $editingListing,
  effect: (listing, mediaId: string) => {
    if (!listing) throw new Error('Сначала сохраните позицию');
    return api.listing.removeMedia(listing.id, mediaId);
  },
});

export const reorderMediaFx = attach({
  source: $editingListing,
  effect: (listing, params: { mediaId: string; direction: 'up' | 'down' }) => {
    if (!listing) throw new Error('Сначала сохраните позицию');
    return api.listing.reorderMedia(listing.id, params.mediaId, params.direction);
  },
});

/** Перечитывает листинг, пока его видео транскодится на бэкенде (поллинга нет намеренно). */
const refetchListingFx = attach({
  source: $editingListing,
  effect: (listing) => {
    if (!listing) throw new Error('Нет открытой позиции');
    return api.listing.findOne(listing.id);
  },
});

export const $refreshing = refetchListingFx.pending;

sample({ clock: refreshTriggered, target: refetchListingFx });

sample({
  clock: [
    editTriggered,
    addMediaFx.doneData,
    removeMediaFx.doneData,
    reorderMediaFx.doneData,
    refetchListingFx.doneData,
  ],
  target: $editingListing,
});

export const $mutating = or(createFx.pending, updateFx.pending, addMediaFx.pending);
export const mutated = merge([createFx.done, updateFx.done, addMediaFx.done, removeMediaFx.done, reorderMediaFx.done]);
/**
 * Модалку закрывает только сохранение самой позиции: после операций с галереей она
 * остаётся открытой, чтобы был виден результат. `mutated` при этом инвалидирует
 * список страницы.
 */
const saved = merge([createFx.done, updateFx.done]);

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
  clock: [reset, saved],
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
message({
  clock: merge([
    createFx.failData,
    updateFx.failData,
    addMediaFx.failData,
    removeMediaFx.failData,
    reorderMediaFx.failData,
  ]),
  errorHandle: true,
});
