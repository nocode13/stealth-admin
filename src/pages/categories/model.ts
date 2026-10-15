import { attach, createEffect, createEvent, createStore, merge, sample, type StoreValue } from 'effector';
import { createQuery } from 'effector-refetch';
import { spread } from 'patronum';

import { CategoryCreateEdit } from '@/features/category/creat-edit';
import { CategoryFilters } from '@/features/category/filter';
import type { Category } from '@/entities/category';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';
import { message } from '@/shared/lib/message';
import { PAGE_SIZE } from '@/shared/config/pagination';
import { fRetry } from '@/shared/lib/f-retry';

/** Подкатегорий у одной категории немного — грузим разом, без пагинации. */
const CHILDREN_LIMIT = 100;

type Filters = StoreValue<typeof CategoryFilters.model.$filters>;

export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({ route });

  const loadMoreClicked = createEvent();
  /** Раскрытые строки категорий товаров — подкатегории грузятся при раскрытии. */
  const expandedChanged = createEvent<string[]>();

  /**
   * Без поиска — дерево: верхний уровень (по `position`), подкатегории по раскрытию.
   * С поиском — плоский список обоих уровней: искомый род может лежать в любой категории.
   */
  const $categories = createStore<Category[]>([]);
  const $nextCursor = createStore<string | null>(null);
  const $isTree = CategoryFilters.model.$filters.map((filters) => !filters.search);
  const $expandedKeys = createStore<string[]>([]).on(expandedChanged, (_, keys) => keys);
  const $childrenByParent = createStore<Record<string, Category[]>>({});
  const $childrenPending = createStore<string[]>([]);

  // Отвязка позиции меняет itemsCount — перезапрашиваем список, не закрывая модалку.
  const purge = merge([CategoryCreateEdit.model.mutated, CategoryCreateEdit.model.itemDetached]);

  const fetchPageQuery = createQuery({
    effect: createEffect(({ cursor, filters }: { cursor?: string | null; filters: Filters }) =>
      api.category.findAll({
        cursor: cursor || undefined,
        limit: PAGE_SIZE,
        search: filters.search || undefined,
        status: filters.status || undefined,
        root: !filters.search || undefined,
      }),
    ),
    concurrency: 'TAKE_LATEST',
    cache: { staleAfter: 5000, purge },
  });

  fRetry(fetchPageQuery, { times: 2, delay: 300 });

  const fetchChildrenFx = attach({
    source: CategoryFilters.model.$filters,
    effect: (filters, parentId: string) =>
      api.category
        .findAll({ parentId, limit: CHILDREN_LIMIT, status: filters.status || undefined })
        .then((res) => ({ parentId, items: res.data.items })),
  });
  // Параллельно по одной категории: pending и ошибка — на каждую строку свои.
  const fetchChildrenOfFx = createEffect((parentIds: string[]) => parentIds.forEach((id) => fetchChildrenFx(id)));

  sample({
    clock: [authorizedRoute.opened, purge],
    source: { filters: CategoryFilters.model.$filters },
    filter: authorizedRoute.$isOpened,
    target: fetchPageQuery.start,
  });

  sample({
    clock: loadMoreClicked,
    source: { cursor: $nextCursor, filters: CategoryFilters.model.$filters },
    target: fetchPageQuery.start,
  });

  sample({
    clock: CategoryFilters.model.filtersChanged,
    source: { filters: CategoryFilters.model.$filters },
    fn: ({ filters }) => ({ cursor: undefined, filters }),
    target: fetchPageQuery.start,
  });

  sample({
    clock: fetchPageQuery.finished.done,
    source: $categories,
    fn: (categories, res) => ({
      categories: res.params.cursor ? [...categories, ...res.result.data.items] : res.result.data.items,
      cursor: res.result.data.nextCursor,
    }),
    target: spread({
      categories: $categories,
      cursor: $nextCursor,
    }),
  });

  // Подгружаем только что раскрытые строки — уже загруженные не перезапрашиваем.
  sample({
    clock: expandedChanged,
    source: $childrenByParent,
    fn: (loaded, keys) => keys.filter((key) => !loaded[key]),
    target: fetchChildrenOfFx,
  });

  // Мутация и смена статус-фильтра меняют подкатегории — перезапрашиваем раскрытые.
  sample({
    clock: [purge, CategoryFilters.model.filtersChanged],
    source: $expandedKeys,
    target: fetchChildrenOfFx,
  });

  // Свёрнутые строки после мутации устарели — выкидываем, при раскрытии загрузятся заново.
  sample({
    clock: [purge, CategoryFilters.model.filtersChanged],
    source: { loaded: $childrenByParent, expanded: $expandedKeys },
    fn: ({ loaded, expanded }) => Object.fromEntries(Object.entries(loaded).filter(([id]) => expanded.includes(id))),
    target: $childrenByParent,
  });

  $childrenByParent.on(fetchChildrenFx.doneData, (state, { parentId, items }) => ({ ...state, [parentId]: items }));
  $childrenPending
    .on(fetchChildrenFx, (ids, parentId) => [...ids, parentId])
    .on(fetchChildrenFx.finally, (ids, { params }) => ids.filter((id) => id !== params));

  sample({
    clock: purge,
    target: [$nextCursor.reinit],
  });

  sample({
    clock: authorizedRoute.closed,
    target: [CategoryCreateEdit.model.reset, $expandedKeys.reinit, $childrenByParent.reinit],
  });

  message({
    clock: merge([fetchPageQuery.finished.fail.map((res) => res.error), fetchChildrenFx.failData]),
    errorHandle: true,
  });

  return {
    $categories,
    $nextCursor,
    $pending: fetchPageQuery.$pending,
    $isTree,
    $expandedKeys,
    $childrenByParent,
    $childrenPending,
    loadMoreClicked,
    expandedChanged,
  };
};
