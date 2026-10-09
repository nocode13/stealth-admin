import { combine, createEffect, createEvent, createStore, merge, restore, sample } from 'effector';
import { createQuery } from 'effector-refetch';
import { debounce } from 'patronum';

import { createCategoryPicker } from '@/entities/category';
import type { CatalogItem } from '@/entities/catalog';
import type { Country } from '@/entities/country';
import { api } from '@/shared/api';
import { textFactory } from '@/shared/lib/text-factory';
import { optionsFactory } from '@/shared/lib/options-factory';

/**
 * Спец-значение селекта подкатегории — «Без подкатегории». Живёт в значении того же
 * `optionsFactory`, чтобы не заводить второй стор; разбор в query-параметры
 * (`subcategoryId` vs `noSubcategory`) делает `pages/catalog/model.ts`.
 */
export const NO_SUBCATEGORY = '__none__';

export const reset = createEvent();

export const searchModel = textFactory({ reset });
export const statusModel = optionsFactory<CatalogItem['status']>({ reset });
export const categoryModel = optionsFactory<string>({ reset });
export const subcategoryModel = optionsFactory<string>({ reset });
export const countryModel = optionsFactory<string>({ reset });

export const countriesSearchChanged = createEvent<string>();

export const categoryPicker = createCategoryPicker({ $categoryId: categoryModel.$value });

// Подкатегория принадлежит категории: сменили категорию — снимаем подкатегорию. Через
// changed, а не reinit: так фильтр перезапросится уже с пустой подкатегорией.
sample({
  clock: categoryModel.changed,
  source: subcategoryModel.$value,
  filter: (subcategoryId) => subcategoryId !== null,
  fn: () => null,
  target: subcategoryModel.changed,
});

categoryPicker.load();

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
  subcategoryModel.changed,
  countryModel.changed,
]);

export const $filters = combine({
  search: searchModel.$value,
  status: statusModel.$value,
  categoryId: categoryModel.$value,
  subcategoryId: subcategoryModel.$value,
  countryId: countryModel.$value,
});
