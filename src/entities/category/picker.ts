import { createEffect, createEvent, createStore, restore, sample, type Store } from 'effector';
import { createQuery } from 'effector-refetch';
import { debounce } from 'patronum';

import { api } from '@/shared/api';
import type { Category } from '@/shared/api';

/**
 * Пара селектов «категория товаров → подкатегория» — общая для формы позиции каталога и
 * фильтров каталога/листингов. Категорий товаров немного: грузятся разом (`load`), поиск по
 * ним клиентский. Подкатегорий много (роды растений): грузятся под выбранную категорию,
 * поиск серверный. Само значение подкатегории при смене категории сбрасывает потребитель —
 * у формы и у фильтра оно хранится по-разному.
 *
 * Параметр `status` бэкенд применяет только для SUPER_ADMIN: продавцу он всё равно отдаёт
 * его собственные категории в любом статусе — поэтому дофильтровываем на клиенте.
 */
export const createCategoryPicker = ({ $categoryId }: { $categoryId: Store<string | null> }) => {
  const subcategoriesSearchChanged = createEvent<string>();

  const $categories = createStore<Category[]>([]);
  const $subcategories = createStore<Category[]>([]);
  const $subcategoriesSearch = restore(subcategoriesSearchChanged, '');

  const fetchCategoriesQuery = createQuery({
    effect: createEffect(() => api.category.findAll({ root: true, limit: 100, status: 'APPROVED' })),
    cache: { staleAfter: 10_000 },
    concurrency: 'TAKE_LATEST',
  });

  const fetchSubcategoriesQuery = createQuery({
    effect: createEffect(({ parentId, search }: { parentId: string; search?: string }) =>
      api.category.findAll({ parentId, limit: 100, status: 'APPROVED', search: search || undefined }),
    ),
    cache: { staleAfter: 10_000 },
    concurrency: 'TAKE_LATEST',
  });

  sample({
    clock: fetchCategoriesQuery.finished.done,
    fn: (res) => res.result.data.items.filter((category) => category.status === 'APPROVED'),
    target: $categories,
  });

  sample({
    clock: fetchSubcategoriesQuery.finished.done,
    fn: (res) => res.result.data.items.filter((category) => category.status === 'APPROVED'),
    target: $subcategories,
  });

  sample({
    clock: $categoryId.updates,
    filter: Boolean,
    fn: (parentId) => ({ parentId }),
    target: fetchSubcategoriesQuery.start,
  });

  sample({
    clock: $categoryId.updates,
    filter: (categoryId) => !categoryId,
    target: [$subcategories.reinit, $subcategoriesSearch.reinit],
  });

  sample({
    clock: debounce(subcategoriesSearchChanged, 300),
    source: $categoryId,
    filter: Boolean,
    fn: (parentId, search) => ({ parentId, search }),
    target: fetchSubcategoriesQuery.start,
  });

  return {
    load: fetchCategoriesQuery.start,
    subcategoriesSearchChanged,
    $categories,
    $categoriesFetching: fetchCategoriesQuery.$pending,
    $subcategories,
    $subcategoriesSearch,
    $subcategoriesFetching: fetchSubcategoriesQuery.$pending,
  };
};
