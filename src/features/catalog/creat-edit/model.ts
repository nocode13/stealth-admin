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

/** Лимит на видео из mediaUploadOptions бэкенда — отсекаем до отправки 50 МБ по сети. */
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

export const schema = z.object({
  nameRu: z.string().min(2, 'Минимум 2 символа'),
  nameUz: z.string().optional(),
  nameEn: z.string().optional(),
  categoryId: z.string().optional(),
  descriptionRu: z.string().optional(),
  descriptionUz: z.string().optional(),
  descriptionEn: z.string().optional(),
  unitRu: z.string().optional(),
  unitUz: z.string().optional(),
  unitEn: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  freeDelivery: z.boolean().optional(),
});

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = {
  nameRu: '',
  nameUz: '',
  nameEn: '',
  categoryId: '',
  descriptionRu: '',
  descriptionUz: '',
  descriptionEn: '',
  unitRu: '',
  unitUz: '',
  unitEn: '',
  status: undefined,
  freeDelivery: false,
};

/** Пустая строка = не переведено, бэкенд сам подставит RU и пометит auto: true. */
const toTranslations = (values: FormValues) => [
  {
    locale: 'RU' as const,
    name: values.nameRu,
    description: values.descriptionRu || undefined,
    unit: values.unitRu || undefined,
  },
  {
    locale: 'UZ' as const,
    name: values.nameUz || undefined,
    description: values.descriptionUz || undefined,
    unit: values.unitUz || undefined,
  },
  {
    locale: 'EN' as const,
    name: values.nameEn || undefined,
    description: values.descriptionEn || undefined,
    unit: values.unitEn || undefined,
  },
];

export const form = createForm<FormValues>();

export const disclosure = createDisclosure();

export const createTriggered = createEvent();
export const editTriggered = createEvent<CatalogItem>();
export const reset = createEvent();
export const validated = createEvent();
export const categoriesSearchChanged = createEvent<string>();
/** Ручное «Обновить» в модалке: подтянуть позицию, пока её видео обрабатывается. */
export const refreshTriggered = createEvent();

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
  source: { values: form.$formValues, role: userModel.$role },
  effect: ({ values, role }) =>
    api.catalog.create({
      translations: toTranslations(values),
      categoryId: values.categoryId || undefined,
      freeDelivery: role === 'SUPER_ADMIN' ? values.freeDelivery : undefined,
    }),
});

export const updateFx = attach({
  source: { values: form.$formValues, editing: $editingItem, role: userModel.$role },
  effect: ({ values, editing, role }) => {
    if (!editing) throw new Error('No catalog item');
    return api.catalog.update(editing.id, {
      translations: toTranslations(values),
      // Именно null, а не undefined: undefined в PATCH означает «не менять»,
      // и очистка селекта не доехала бы до бэкенда.
      categoryId: values.categoryId || null,
      status: role === 'SUPER_ADMIN' ? values.status : undefined,
      freeDelivery: role === 'SUPER_ADMIN' ? values.freeDelivery : undefined,
    });
  },
});

export const addMediaFx = attach({
  source: $editingItem,
  effect: (item, file: File) => {
    if (!item) throw new Error('Сначала сохраните позицию');
    return api.catalog.addMedia(item.id, file);
  },
});

export const removeMediaFx = attach({
  source: $editingItem,
  effect: (item, mediaId: string) => {
    if (!item) throw new Error('Сначала сохраните позицию');
    return api.catalog.removeMedia(item.id, mediaId);
  },
});

export const reorderMediaFx = attach({
  source: $editingItem,
  effect: (item, params: { mediaId: string; direction: 'up' | 'down' }) => {
    if (!item) throw new Error('Сначала сохраните позицию');
    return api.catalog.reorderMedia(item.id, params.mediaId, params.direction);
  },
});

/** Перечитывает позицию, пока её видео транскодится на бэкенде. */
const refetchItemFx = attach({
  source: $editingItem,
  effect: (item) => {
    if (!item) throw new Error('Нет открытой позиции');
    return api.catalog.findOne(item.id);
  },
});

export const $mutating = or(createFx.pending, updateFx.pending, addMediaFx.pending);
export const mutated = merge([createFx.done, updateFx.done, addMediaFx.done, removeMediaFx.done, reorderMediaFx.done]);
/**
 * Закрывает модалку только сохранение самой позиции: после операций с галереей модалка
 * остаётся открытой, чтобы был виден результат. `mutated` при этом продолжает
 * инвалидировать список страницы — иначе таблица не подтянет новые `media`.
 */
const saved = merge([createFx.done, updateFx.done]);
/** Только что созданная позиция — из неё страница каталога заводит продажную позицию. */
export const created = createFx.doneData;
export const $categoriesFetching = fetchCategoriesQuery.$pending;

$mode.on(createTriggered, () => 'create').on(editTriggered, () => 'edit');

sample({
  clock: [createTriggered, editTriggered],
  fn: () => undefined,
  target: [fetchCategoriesQuery.start, disclosure.opened],
});

sample({
  clock: [editTriggered, addMediaFx.doneData, removeMediaFx.doneData, reorderMediaFx.doneData, refetchItemFx.doneData],
  target: $editingItem,
});

/**
 * Видео транскодится фоном, поэтому строка приходит со `status: PROCESSING`, и
 * готовое mp4 с обложкой появляются только в следующем ответе. Поллинга нет
 * намеренно — состояние обновляется кнопкой «Обновить» в модалке.
 */
export const $hasProcessingMedia = $editingItem.map(
  (item) => !!item?.media.some((media) => media.status === 'PROCESSING'),
);

export const $refreshing = refetchItemFx.pending;

sample({ clock: refreshTriggered, target: refetchItemFx });

sample({
  clock: fetchCategoriesQuery.finished.done,
  fn: (res) => res.result.data.items,
  target: $categories,
});

sample({
  clock: debounce(categoriesSearchChanged, 300),
  target: fetchCategoriesQuery.start,
});

/** auto: true → перевод не задан (значение — копия RU), поле рисуем пустым. */
const pickTranslation = (item: CatalogItem, locale: 'RU' | 'UZ' | 'EN') =>
  item.translations.find((t) => t.locale === locale);

sample({
  clock: editTriggered,
  fn: (item): FormValues => {
    const ru = pickTranslation(item, 'RU');
    const uz = pickTranslation(item, 'UZ');
    const en = pickTranslation(item, 'EN');
    return {
      nameRu: ru?.name ?? '',
      nameUz: uz && !uz.auto ? uz.name : '',
      nameEn: en && !en.auto ? en.name : '',
      categoryId: item.categoryId ?? '',
      descriptionRu: ru?.description ?? '',
      descriptionUz: uz && !uz.auto ? (uz.description ?? '') : '',
      descriptionEn: en && !en.auto ? (en.description ?? '') : '',
      unitRu: ru?.unit ?? '',
      unitUz: uz && !uz.auto ? uz.unit : '',
      unitEn: en && !en.auto ? en.unit : '',
      status: item.status,
      freeDelivery: item.freeDelivery,
    };
  },
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
  clock: [reset, saved],
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
  clock: merge([
    createFx.failData,
    updateFx.failData,
    addMediaFx.failData,
    removeMediaFx.failData,
    reorderMediaFx.failData,
  ]),
  errorHandle: true,
});
