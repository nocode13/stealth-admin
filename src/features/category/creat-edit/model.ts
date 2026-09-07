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
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = {
  nameRu: '',
  nameUz: '',
  nameEn: '',
  status: undefined,
};

/** Пустая строка = не переведено, бэкенд сам подставит RU и пометит auto: true. */
const toTranslations = (values: FormValues) => [
  { locale: 'RU' as const, name: values.nameRu },
  { locale: 'UZ' as const, name: values.nameUz || undefined },
  { locale: 'EN' as const, name: values.nameEn || undefined },
];

export const form = createForm<FormValues>();

export const disclosure = createDisclosure();

export const createTriggered = createEvent();
export const editTriggered = createEvent<Category>();
export const reset = createEvent();
export const validated = createEvent();

export const $editingCategory = createStore<Category | null>(null);
export const $mode = createStore<'create' | 'edit'>('create');

$mode.on(createTriggered, () => 'create').on(editTriggered, () => 'edit');

sample({ clock: editTriggered, target: $editingCategory });

export const createFx = attach({
  source: form.$formValues,
  effect: (values: FormValues) => api.category.create({ translations: toTranslations(values) }),
});

export const updateFx = attach({
  source: { values: form.$formValues, editing: $editingCategory, role: userModel.$role },
  effect: ({ values, editing, role }) => {
    if (!editing || !role) {
      throw new Error('No category or role');
    }
    return api.category.update(editing.id, {
      translations: toTranslations(values),
      status: role === 'SUPER_ADMIN' ? values.status : undefined,
    });
  },
});

export const $mutating = or(createFx.pending, updateFx.pending);
export const mutated = merge([createFx.done, updateFx.done]);

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
  clock: editTriggered,
  fn: (category): FormValues => ({
    nameRu: pickTranslation(category, 'RU'),
    nameUz: pickTranslation(category, 'UZ'),
    nameEn: pickTranslation(category, 'EN'),
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
  clock: [reset, mutated],
  target: disclosure.closed,
});

sample({
  clock: delay(disclosure.closed, 100),
  target: [form.resetFx.prepend(() => DEFAULT_VALUES), $editingCategory.reinit, $mode.reinit],
});

message({ clock: mutated, type: 'success', content: 'Категория сохранена' });
message({ clock: merge([createFx.failData, updateFx.failData]), errorHandle: true });
