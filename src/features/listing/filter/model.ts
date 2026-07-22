import { combine, createEffect, createEvent, createStore, merge, sample } from 'effector';
import { createQuery } from 'effector-refetch';

import type { Category } from '@/entities/category';
import type { Listing } from '@/entities/listing';
import { api } from '@/shared/api';
import { textFactory } from '@/shared/lib/text-factory';
import { optionsFactory } from '@/shared/lib/options-factory';
import { numberFactory } from '@/shared/lib/number-factory';

export const reset = createEvent();

export const searchModel = textFactory({ reset });
export const statusModel = optionsFactory<Listing['status']>({ reset });
export const categoryModel = optionsFactory<string>({ reset });
export const minPriceModel = numberFactory({ reset });
export const maxPriceModel = numberFactory({ reset });

export const $categories = createStore<Category[]>([]);

const fetchCategoriesQuery = createQuery({
  effect: createEffect(() => api.category.findAll({ limit: 100, status: 'APPROVED' })),
  cache: { staleAfter: 10_000 },
  concurrency: 'TAKE_LATEST',
});

sample({
  clock: fetchCategoriesQuery.finished.done,
  fn: (res) => res.result.data.items,
  target: $categories,
});

fetchCategoriesQuery.start();

export const filtersChanged = merge([
  searchModel.debouncedChanged,
  statusModel.changed,
  categoryModel.changed,
  minPriceModel.debouncedChanged,
  maxPriceModel.debouncedChanged,
]);

export const $filters = combine({
  search: searchModel.$value,
  status: statusModel.$value,
  categoryId: categoryModel.$value,
  minPrice: minPriceModel.$value,
  maxPrice: maxPriceModel.$value,
});
