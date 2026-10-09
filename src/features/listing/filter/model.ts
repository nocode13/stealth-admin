import { combine, createEffect, createEvent, createStore, merge, sample } from 'effector';
import { createQuery } from 'effector-refetch';

import { createCategoryPicker } from '@/entities/category';
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
export const subcategoryModel = optionsFactory<string>({ reset });
export const sellerModel = optionsFactory<string>({ reset });
export const minPriceModel = numberFactory({ reset });
export const maxPriceModel = numberFactory({ reset });

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
  subcategoryModel.changed,
  sellerModel.changed,
  minPriceModel.debouncedChanged,
  maxPriceModel.debouncedChanged,
]);

export const $filters = combine({
  search: searchModel.$value,
  status: statusModel.$value,
  categoryId: categoryModel.$value,
  subcategoryId: subcategoryModel.$value,
  sellerId: sellerModel.$value,
  minPrice: minPriceModel.$value,
  maxPrice: maxPriceModel.$value,
});
