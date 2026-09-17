import { combine, createEffect, createEvent, createStore, merge, restore, sample } from 'effector';
import { createQuery } from 'effector-refetch';
import { debounce } from 'patronum';

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

export const categoriesSearchChanged = createEvent<string>();

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
