import { attach, createEffect, createEvent, createStore, merge, sample, split } from 'effector';
import { z } from 'zod/v4';
import { delay, or } from 'patronum';

import type { Country } from '@/entities/country';
import { api } from '@/shared/api';
import { createDisclosure } from '@/shared/lib/disclosure';
import { createForm } from '@/shared/lib/form';
import { message } from '@/shared/lib/message';

export const schema = z.object({
  code: z
    .string()
    .length(2, 'Код из 2 букв')
    .regex(/^[A-Za-z]{2}$/, 'Только латинские буквы'),
  nameRu: z.string().min(2, 'Минимум 2 символа'),
  nameUz: z.string().optional(),
  nameEn: z.string().optional(),
});

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = {
  code: '',
  nameRu: '',
  nameUz: '',
  nameEn: '',
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
export const editTriggered = createEvent<Country>();
export const reset = createEvent();
export const validated = createEvent();
export const deleteRequested = createEvent<Country>();

export const $editingCountry = createStore<Country | null>(null);
export const $mode = createStore<'create' | 'edit'>('create');

$mode.on(createTriggered, () => 'create').on(editTriggered, () => 'edit');

sample({ clock: editTriggered, target: $editingCountry });

export const createFx = attach({
  source: form.$formValues,
  effect: (values: FormValues) =>
    api.country.create({ code: values.code.toUpperCase(), translations: toTranslations(values) }),
});

export const updateFx = attach({
  source: { values: form.$formValues, editing: $editingCountry },
  effect: ({ values, editing }) => {
    if (!editing) {
      throw new Error('No country');
    }
    // code в PATCH не отправляется — бэкенд его не меняет.
    return api.country.update(editing.id, { translations: toTranslations(values) });
  },
});

export const deleteFx = createEffect((country: Country) => api.country.remove(country.id));

sample({ clock: deleteRequested, target: deleteFx });

export const $mutating = or(createFx.pending, updateFx.pending);
export const mutated = merge([createFx.done, updateFx.done, deleteFx.done]);

sample({
  clock: [createTriggered, editTriggered],
  target: disclosure.opened,
});

/** auto: true → перевод не задан (значение — копия RU), поле рисуем пустым. */
const pickTranslation = (country: Country, locale: 'RU' | 'UZ' | 'EN') => {
  const t = country.translations.find((t) => t.locale === locale);
  return t && !t.auto ? t.name : '';
};

sample({
  clock: editTriggered,
  fn: (country): FormValues => ({
    code: country.code,
    nameRu: pickTranslation(country, 'RU'),
    nameUz: pickTranslation(country, 'UZ'),
    nameEn: pickTranslation(country, 'EN'),
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
  target: [form.resetFx.prepend(() => DEFAULT_VALUES), $editingCountry.reinit, $mode.reinit],
});

message({ clock: merge([createFx.done, updateFx.done]), type: 'success', content: 'Страна сохранена' });
message({ clock: deleteFx.done, type: 'success', content: 'Страна удалена' });
message({ clock: merge([createFx.failData, updateFx.failData, deleteFx.failData]), errorHandle: true });
