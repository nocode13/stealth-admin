import { combine, createEffect, createEvent, createStore, merge, restore, sample } from 'effector';
import { createQuery } from 'effector-refetch';
import { debounce } from 'patronum';

import type { Category } from '@/entities/category';
import type { CatalogItem } from '@/entities/catalog';
import type { Country } from '@/entities/country';
import { api } from '@/shared/api';
import { textFactory } from '@/shared/lib/text-factory';
import { optionsFactory } from '@/shared/lib/options-factory';

/**
 * Спец-значение селекта категории — «Без категории». Живёт в значении того же
 * `optionsFactory`, чтобы не заводить второй стор; разбор в query-параметры
 * (`categoryId` vs `noCategory`) делает `pages/catalog/model.ts`.
 */
export const NO_CATEGORY = '__none__';

export const reset = createEvent();

export const searchModel = textFactory({ reset });
export const statusModel = optionsFactory<CatalogItem['status']>({ reset });
export const categoryModel = optionsFactory<string>({ reset });
export const countryModel = optionsFactory<string>({ reset });

export const categoriesSearchChanged = createEvent<string>();
export const countriesSearchChanged = createEvent<string>();

export const $categories = createStore<Category[]>([]);
export const $categoriesSearch = restore(categoriesSearchChanged, '');

const fetchCategoriesQuery = createQuery({
  effect: createEffect((search?: string) =>
    api.category.findAll({ limit: 100, status: 'APPROVED', search: search || undefined }),
  ),
  cache: { staleAfter: 10_000 },
  concurrency: 'TAKE_LATEST',
});

export const $categoriesFetching = fetchCategoriesQuery.$pending;

sample({
  clock: fetchCategoriesQuery.finished.done,
  // Параметр status бэкенд применяет только для SUPER_ADMIN: продавцу он всё равно
  // отдаёт его собственные категории в любом статусе — дофильтровываем на клиенте.
  fn: (res) => res.result.data.items.filter((category) => category.status === 'APPROVED'),
  target: $categories,
});

sample({
  clock: debounce(categoriesSearchChanged, 300),
  target: fetchCategoriesQuery.start,
});

fetchCategoriesQuery.start();

export const $countries = createStore<Country[]>([]);
export const $countriesSearch = restore(countriesSearchChanged, '');

const fetchCountriesQuery = createQuery({
  effect: createEffect((search?: string) => api.country.findAll({ limit: 100, search: search || undefined })),
  cache: { staleAfter: 10_000 },
  concurrency: 'TAKE_LATEST',
});

export const $countriesFetching = fetchCountriesQuery.$pending;

sample({
  clock: fetchCountriesQuery.finished.done,
  fn: (res) => res.result.data.items,
  target: $countries,
});

sample({
  clock: debounce(countriesSearchChanged, 300),
  target: fetchCountriesQuery.start,
});

fetchCountriesQuery.start();

export const filtersChanged = merge([
  searchModel.debouncedChanged,
  statusModel.changed,
  categoryModel.changed,
  countryModel.changed,
]);

export const $filters = combine({
  search: searchModel.$value,
  status: statusModel.$value,
  categoryId: categoryModel.$value,
  countryId: countryModel.$value,
});
