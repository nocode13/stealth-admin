import { attach, createEffect, createEvent, createStore, merge, sample, split } from 'effector';
import { createQuery } from 'effector-refetch';
import { z } from 'zod/v4';
import { delay, or } from 'patronum';

import type { Category } from '@/entities/category';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import { createDisclosure } from '@/shared/lib/disclosure';
import { createForm } from '@/shared/lib/form';
import { message } from '@/shared/lib/message';

/**
 * Уровень дерева: `root` — категория товаров (только SUPER_ADMIN, с `code`, порядком и
 * иконкой), `sub` — подкатегория (родитель — категория товаров). Лежит в форме, а не
 * отдельным стором, чтобы схема могла валидировать поля по уровню.
 */
export type CategoryLevel = 'root' | 'sub';

/** Зеркало `CATEGORY_CODE_PATTERN` бэкенда. */
const CODE_PATTERN = /^[a-z][a-z0-9_-]{1,49}$/;

export const schema = z
  .object({
    level: z.enum(['root', 'sub']),
    nameRu: z.string().min(2, 'Минимум 2 символа'),
    nameUz: z.string().optional(),
    nameEn: z.string().optional(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    code: z.string().optional(),
    position: z.number().int().min(0).max(10000).nullable().optional(),
    parentId: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.level === 'root' && !CODE_PATTERN.test(values.code ?? '')) {
      ctx.addIssue({
        code: 'custom',
        path: ['code'],
        message: 'Латиница в нижнем регистре, цифры, «_» и «-», начинается с буквы',
      });
    }
    if (values.level === 'sub' && !values.parentId) {
      ctx.addIssue({ code: 'custom', path: ['parentId'], message: 'Выберите категорию' });
    }
  });

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = {
  level: 'sub',
  nameRu: '',
  nameUz: '',
  nameEn: '',
  status: undefined,
  code: '',
  position: null,
  parentId: undefined,
};

/** Пустая строка = не переведено, бэкенд сам подставит RU и пометит auto: true. */
const toTranslations = (values: FormValues) => [
  { locale: 'RU' as const, name: values.nameRu },
  { locale: 'UZ' as const, name: values.nameUz || undefined },
  { locale: 'EN' as const, name: values.nameEn || undefined },
];

export const form = createForm<FormValues>();

export const disclosure = createDisclosure();

/** `parentId` — сразу выбранный родитель (кнопка «Добавить подкатегорию» в строке категории). */
export const createTriggered = createEvent<{ level: 'root' } | { level: 'sub'; parentId?: string }>();
export const editTriggered = createEvent<Category>();
export const reset = createEvent();
export const validated = createEvent();

export const $editingCategory = createStore<Category | null>(null);
export const $mode = createStore<'create' | 'edit'>('create');

$mode.on(createTriggered, () => 'create').on(editTriggered, () => 'edit');

// Категории товаров — варианты родителя для подкатегории. Продавцу бэкенд отдаёт только
// master APPROVED, так что фильтр по статусу ниже нужен лишь SUPER_ADMIN.
const fetchRootsQuery = createQuery({
  effect: createEffect(() => api.category.findAll({ root: true, status: 'APPROVED', limit: 100 })),
  concurrency: 'TAKE_LATEST',
});

export const $rootOptions = createStore<{ value: string; label: string }[]>([]);
export const $rootsPending = fetchRootsQuery.$pending;

sample({
  clock: fetchRootsQuery.finished.done,
  fn: (res) => res.result.data.items.map((c) => ({ value: c.id, label: c.name })),
  target: $rootOptions,
});

sample({
  clock: createTriggered,
  filter: (params) => params.level === 'sub',
  target: fetchRootsQuery.start,
});

sample({
  clock: editTriggered,
  filter: (category) => !!category.parentId,
  target: fetchRootsQuery.start,
});

export const createFx = attach({
  source: form.$formValues,
  effect: (values: FormValues) =>
    api.category.create(
      values.level === 'root'
        ? {
            translations: toTranslations(values),
            code: values.code,
            position: values.position ?? undefined,
          }
        : { translations: toTranslations(values), parentId: values.parentId },
    ),
});

export const updateFx = attach({
  source: { values: form.$formValues, editing: $editingCategory, role: userModel.$role },
  effect: ({ values, editing, role }) => {
    if (!editing || !role) {
      throw new Error('No category or role');
    }
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const isRoot = editing.parentId === null;
    return api.category.update(editing.id, {
      translations: toTranslations(values),
      status: isSuperAdmin ? values.status : undefined,
      code: isSuperAdmin && isRoot ? values.code : undefined,
      position: isSuperAdmin && isRoot ? (values.position ?? undefined) : undefined,
    });
  },
});

// Иконка грузится только на существующую категорию — как баннер продавца: сначала
// сохраняем карточку, потом загружаем изображение. Модалка после загрузки не
// закрывается, чтобы был виден результат.
export const uploadIconFx = attach({
  source: $editingCategory,
  effect: (category, file: File) => {
    if (!category) throw new Error('Сначала сохраните категорию');
    return api.category.uploadIcon(category.id, file);
  },
});

export const $mutating = or(createFx.pending, updateFx.pending, uploadIconFx.pending);
export const mutated = merge([createFx.done, updateFx.done, uploadIconFx.done]);
const saved = merge([createFx.done, updateFx.done]);

sample({
  clock: [editTriggered, uploadIconFx.doneData],
  target: $editingCategory,
});

sample({
  clock: [createTriggered, editTriggered],
  target: disclosure.opened,
});

/** auto: true → перевод не задан (значение — копия RU), поле рисуем пустым. */
const pickTranslation = (category: Category, locale: 'RU' | 'UZ' | 'EN') => {
  const t = category.translations.find((t) => t.locale === locale);
  return t && !t.auto ? t.name : '';
};

sample({
  clock: createTriggered,
  fn: (params): FormValues => ({
    ...DEFAULT_VALUES,
    level: params.level,
    parentId: params.level === 'sub' ? params.parentId : undefined,
  }),
  target: form.resetFx,
});

sample({
  clock: editTriggered,
  fn: (category): FormValues => ({
    level: category.parentId ? 'sub' : 'root',
    nameRu: pickTranslation(category, 'RU'),
    nameUz: pickTranslation(category, 'UZ'),
    nameEn: pickTranslation(category, 'EN'),
    status: category.status,
    code: category.code ?? '',
    position: category.position,
    parentId: category.parentId ?? undefined,
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
  clock: [reset, saved],
  target: disclosure.closed,
});

sample({
  clock: delay(disclosure.closed, 100),
  target: [form.resetFx.prepend(() => DEFAULT_VALUES), $editingCategory.reinit, $mode.reinit],
});

message({ clock: saved, type: 'success', content: 'Категория сохранена' });
message({ clock: uploadIconFx.done, type: 'success', content: 'Иконка загружена' });
message({ clock: merge([createFx.failData, updateFx.failData, uploadIconFx.failData]), errorHandle: true });
message({ clock: fetchRootsQuery.finished.fail.map((res) => res.error), errorHandle: true });
