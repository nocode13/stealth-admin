import { combine, createEffect, createEvent, createStore, merge, sample } from 'effector';
import { createQuery } from 'effector-refetch';

import type { Category } from '@/entities/category';
import type { Listing } from '@/entities/listing';
import type { Seller } from '@/entities/seller';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import { textFactory } from '@/shared/lib/text-factory';
import { optionsFactory } from '@/shared/lib/options-factory';
import { numberFactory } from '@/shared/lib/number-factory';

export const reset = createEvent();

export const searchModel = textFactory({ reset });
export const statusModel = optionsFactory<Listing['status']>({ reset });
export const categoryModel = optionsFactory<string>({ reset });
export const sellerModel = optionsFactory<string>({ reset });
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

export const $sellers = createStore<Seller[]>([]);

// Список продавцов виден только SUPER_ADMIN (`GET /admin/sellers` закрыт ролью),
// поэтому запрос стартует не на импорте модуля, как категории, а по факту роли.
const fetchSellersQuery = createQuery({
  effect: createEffect(() => api.sellers.findAll({ limit: 100, status: 'ACTIVE' })),
  cache: { staleAfter: 10_000 },
  concurrency: 'TAKE_LATEST',
});

sample({
  clock: userModel.$role,
  filter: (role) => role === 'SUPER_ADMIN',
  fn: () => undefined,
  target: fetchSellersQuery.start,
});

sample({
  clock: fetchSellersQuery.finished.done,
  fn: (res) => res.result.data.items,
  target: $sellers,
});

export const filtersChanged = merge([
  searchModel.debouncedChanged,
  statusModel.changed,
  categoryModel.changed,
  sellerModel.changed,
  minPriceModel.debouncedChanged,
  maxPriceModel.debouncedChanged,
]);

export const $filters = combine({
  search: searchModel.$value,
  status: statusModel.$value,
  categoryId: categoryModel.$value,
  sellerId: sellerModel.$value,
  minPrice: minPriceModel.$value,
  maxPrice: maxPriceModel.$value,
});
