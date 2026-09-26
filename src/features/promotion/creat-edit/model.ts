import { attach, createEffect, createEvent, createStore, merge, restore, sample, split } from 'effector';
import { createQuery } from 'effector-refetch';
import { debounce, delay, or } from 'patronum';
import { z } from 'zod/v4';

import type { Listing } from '@/entities/listing';
import { bpsToPercent, percentToBps, type Promotion, type PromotionDetail } from '@/entities/promotion';
import { api, type PromotionPayload } from '@/shared/api';
import { createDisclosure } from '@/shared/lib/disclosure';
import { createForm } from '@/shared/lib/form';
import { message } from '@/shared/lib/message';

/** Лимиты — зеркало `stealth-backend/src/promotions/dto/promotion.dto.ts`. */
export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 500;
export const MIN_PERCENT = 1;
export const MAX_PERCENT = 99;

const percent = z
  .number({ error: 'Укажите скидку' })
  .min(MIN_PERCENT, `От ${MIN_PERCENT}%`)
  .max(MAX_PERCENT, `До ${MAX_PERCENT}%`);

const optionalText = (max: number) => z.string().max(max, `Максимум ${max} символов`).optional();

export const schema = z
  .object({
    titleRu: z.string().trim().min(1, 'Введите название').max(TITLE_MAX, `Максимум ${TITLE_MAX} символов`),
    titleUz: optionalText(TITLE_MAX),
    titleEn: optionalText(TITLE_MAX),
    descriptionRu: optionalText(DESCRIPTION_MAX),
    descriptionUz: optionalText(DESCRIPTION_MAX),
    descriptionEn: optionalText(DESCRIPTION_MAX),
    discountPercent: percent,
    enabled: z.boolean(),
    // Дни `YYYY-MM-DD` (граница — 00:00 по Ташкенту); null — без ограничения.
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    items: z
      .array(z.object({ listingId: z.string(), discountPercent: percent.nullable() }))
      .min(1, 'Добавьте хотя бы одну позицию'),
  })
  .superRefine((values, ctx) => {
    // Строки YYYY-MM-DD сравниваются лексикографически так же, как даты.
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Раньше первого дня' });
    }
  });

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = {
  titleRu: '',
  titleUz: '',
  titleEn: '',
  descriptionRu: '',
  descriptionUz: '',
  descriptionEn: '',
  discountPercent: 10,
  enabled: true,
  startDate: null,
  endDate: null,
  items: [],
};

/** То, что форма показывает о листинге в составе акции. Цены — строки в тийинах, как в API. */
export interface ListingInfo {
  id: string;
  name: string;
  sellerName: string;
  costPrice: string;
  /** Текущая розница (с акцией, если сработала). */
  price: string | null;
  /** Розница без акции; null — не на акции. */
  oldPrice: string | null;
}

const fromListing = (l: Listing): ListingInfo => ({
  id: l.id,
  name: l.catalogItem.name,
  sellerName: l.seller?.name ?? '',
  costPrice: l.costPrice,
  price: l.price ?? null,
  oldPrice: l.oldPrice ?? null,
});

const fromDetail = (p: PromotionDetail): ListingInfo[] =>
  p.items.map(({ listing }) => ({
    id: listing.id,
    name: listing.name,
    sellerName: listing.sellerName,
    costPrice: listing.costPrice,
    price: listing.price,
    oldPrice: listing.oldPrice,
  }));

/** auto: true → перевод не задан (значение — копия RU), поле рисуем пустым. */
const pickTranslation = (p: PromotionDetail, locale: 'RU' | 'UZ' | 'EN') => {
  const t = p.translations.find((t) => t.locale === locale);
  return t && !t.auto ? t : null;
};

const toFormValues = (p: PromotionDetail): FormValues => ({
  titleRu: pickTranslation(p, 'RU')?.title ?? '',
  titleUz: pickTranslation(p, 'UZ')?.title ?? '',
  titleEn: pickTranslation(p, 'EN')?.title ?? '',
  descriptionRu: pickTranslation(p, 'RU')?.description ?? '',
  descriptionUz: pickTranslation(p, 'UZ')?.description ?? '',
  descriptionEn: pickTranslation(p, 'EN')?.description ?? '',
  discountPercent: bpsToPercent(p.discountBps),
  enabled: p.enabled,
  startDate: p.startDate,
  endDate: p.endDate,
  items: p.items.map((item) => ({
    listingId: item.listingId,
    discountPercent: item.discountBps === null ? null : bpsToPercent(item.discountBps),
  })),
});

/** Пустые UZ/EN не отправляем — бэкенд подставит RU. */
const toPayload = (values: FormValues): PromotionPayload => ({
  translations: [
    { locale: 'RU', title: values.titleRu.trim(), description: values.descriptionRu?.trim() || null },
    { locale: 'UZ', title: values.titleUz?.trim() || undefined, description: values.descriptionUz?.trim() || null },
    { locale: 'EN', title: values.titleEn?.trim() || undefined, description: values.descriptionEn?.trim() || null },
  ],
  discountBps: percentToBps(values.discountPercent),
  enabled: values.enabled,
  startDate: values.startDate,
  endDate: values.endDate,
  items: values.items.map((item) => ({
    listingId: item.listingId,
    discountBps: item.discountPercent === null ? null : percentToBps(item.discountPercent),
  })),
});

export const form = createForm<FormValues>();

export const disclosure = createDisclosure();

export const createTriggered = createEvent();
export const editTriggered = createEvent<Promotion>();
export const reset = createEvent();
export const validated = createEvent();
export const deleteRequested = createEvent<Promotion>();
export const listingsSearchChanged = createEvent<string>();

export const $editing = createStore<PromotionDetail | null>(null);
export const $mode = createStore<'create' | 'edit'>('create');

$mode.on(createTriggered, () => 'create').on(editTriggered, () => 'edit');

// ── Поиск листингов для добавления в акцию ──

export const $listingsSearch = restore(listingsSearchChanged, '');
export const $listings = createStore<ListingInfo[]>([]);
/**
 * Все когда-либо увиденные листинги по id: строки состава должны сохранять название и
 * цены, даже когда текущий поиск их уже не возвращает (как $knownCustomers в рассылках).
 */
export const $knownListings = createStore<Record<string, ListingInfo>>({});

const fetchListingsQuery = createQuery({
  effect: createEffect((search: string) => api.listing.findAll({ limit: 50, search: search || undefined })),
  concurrency: 'TAKE_LATEST',
});

export const $listingsFetching = fetchListingsQuery.$pending;

sample({
  clock: [createTriggered, editTriggered],
  fn: () => '',
  target: fetchListingsQuery.start,
});

sample({
  clock: debounce(listingsSearchChanged, 300),
  target: fetchListingsQuery.start,
});

sample({
  clock: fetchListingsQuery.finished.done,
  fn: ({ result }) => result.data.items.map(fromListing),
  target: $listings,
});

$knownListings.on(fetchListingsQuery.finished.done, (known, { result }) => ({
  ...known,
  ...Object.fromEntries(result.data.items.map((l) => [l.id, fromListing(l)])),
}));

// ── Редактирование: список отдаёт акцию без состава — догружаем деталь ──

const fetchDetailFx = createEffect((p: Promotion) => api.promotion.findOne(p.id));

export const $loadingDetail = fetchDetailFx.pending;

sample({ clock: editTriggered, target: fetchDetailFx });
sample({ clock: fetchDetailFx.doneData, target: $editing });
sample({ clock: fetchDetailFx.doneData, fn: toFormValues, target: form.resetFx });

$knownListings.on(fetchDetailFx.doneData, (known, detail) => ({
  ...known,
  ...Object.fromEntries(fromDetail(detail).map((l) => [l.id, l])),
}));

sample({
  clock: [createTriggered, editTriggered],
  target: disclosure.opened,
});

// ── Сохранение ──

export const createFx = attach({
  source: form.$formValues,
  effect: (values: FormValues) => api.promotion.create(toPayload(values)),
});

export const updateFx = attach({
  source: { values: form.$formValues, editing: $editing },
  effect: ({ values, editing }) => {
    if (!editing) throw new Error('No promotion');
    return api.promotion.update(editing.id, toPayload(values));
  },
});

export const deleteFx = createEffect((p: Promotion) => api.promotion.remove(p.id));

sample({ clock: deleteRequested, target: deleteFx });

export const $mutating = or(createFx.pending, updateFx.pending);
export const mutated = merge([createFx.done, updateFx.done, deleteFx.done]);

split({
  source: validated,
  match: $mode,
  cases: {
    create: createFx,
    edit: updateFx,
  },
});

sample({
  clock: [reset, createFx.done, updateFx.done],
  target: disclosure.closed,
});

sample({
  clock: delay(disclosure.closed, 100),
  target: [
    form.resetFx.prepend(() => DEFAULT_VALUES),
    $editing.reinit,
    $mode.reinit,
    $listings.reinit,
    $listingsSearch.reinit,
  ],
});

message({
  clock: merge([createFx.done, updateFx.done]),
  type: 'success',
  content: 'Акция сохранена — цены пересчитаны',
});
message({ clock: deleteFx.done, type: 'success', content: 'Акция удалена' });
message({
  clock: merge([createFx.failData, updateFx.failData, deleteFx.failData, fetchDetailFx.failData]),
  errorHandle: true,
});
message({
  clock: fetchListingsQuery.finished.fail.map(({ error }) => error),
  errorHandle: true,
});
