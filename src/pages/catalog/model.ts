import { createEffect, createEvent, createStore, merge, sample, type StoreValue } from 'effector';
import { createQuery } from 'effector-refetch';
import { spread } from 'patronum';

import { CatalogCreateEdit } from '@/features/catalog/creat-edit';
import { CatalogDelete } from '@/features/catalog/delete';
import { CatalogFilters } from '@/features/catalog/filter';
import { ListingCreateEdit } from '@/features/listing/creat-edit';
import type { CatalogItem } from '@/entities/catalog';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';
import { message } from '@/shared/lib/message';
import { PAGE_SIZE } from '@/shared/config/pagination';
import { fRetry } from '@/shared/lib/f-retry';

export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({ route });

  const loadMoreClicked = createEvent();

  const $catalog = createStore<CatalogItem[]>([]);
  const $nextCursor = createStore<string | null>(null);

  const purge = merge([CatalogCreateEdit.model.mutated, CatalogDelete.model.mutated]);

  const fetchPageQuery = createQuery({
    effect: createEffect(
      ({ cursor, filters }: { cursor?: string | null; filters: StoreValue<typeof CatalogFilters.model.$filters> }) =>
        api.catalog.findAll({
          cursor: cursor || undefined,
          limit: PAGE_SIZE,
          search: filters.search || undefined,
          categoryId:
            filters.categoryId && filters.categoryId !== CatalogFilters.NO_CATEGORY ? filters.categoryId : undefined,
          noCategory: filters.categoryId === CatalogFilters.NO_CATEGORY || undefined,
          status: filters.status || undefined,
        }),
    ),
    concurrency: 'TAKE_LATEST',
    cache: { staleAfter: 5000, purge },
  });

  fRetry(fetchPageQuery, { times: 2, delay: 300 });

  sample({
    clock: [authorizedRoute.opened, purge],
    source: { filters: CatalogFilters.model.$filters },
    filter: authorizedRoute.$isOpened,
    target: fetchPageQuery.start,
  });

  sample({
    clock: loadMoreClicked,
    source: { cursor: $nextCursor, filters: CatalogFilters.model.$filters },
    target: fetchPageQuery.start,
  });

  sample({
    clock: CatalogFilters.model.filtersChanged,
    source: { filters: CatalogFilters.model.$filters },
    fn: ({ filters }) => ({ cursor: undefined, filters }),
    target: fetchPageQuery.start,
  });

  sample({
    clock: fetchPageQuery.finished.done,
    source: $catalog,
    fn: (catalog, res) => ({
      catalog: res.params.cursor ? [...catalog, ...res.result.data.items] : res.result.data.items,
      cursor: res.result.data.nextCursor,
    }),
    target: spread({
      catalog: $catalog,
      cursor: $nextCursor,
    }),
  });

  sample({
    clock: purge,
    target: [$nextCursor.reinit],
  });

  // Сразу после создания позиции каталога админ заводит по ней продажную позицию:
  // фича листинга открывается с предвыбранным товаром и селектом продавца. У продавца
  // цепочки нет — его позиция уходит в PENDING, и бэкенд листинг по ней не даст создать.
  // Склейка двух фич живёт на уровне страницы: features друг друга импортировать не могут.
  sample({
    clock: CatalogCreateEdit.model.created,
    filter: userModel.$role.map((role) => role === 'SUPER_ADMIN'),
    target: ListingCreateEdit.model.createForCatalogItemTriggered,
  });

  sample({
    clock: authorizedRoute.closed,
    target: [CatalogCreateEdit.model.reset, ListingCreateEdit.model.reset],
  });

  message({
    clock: fetchPageQuery.finished.fail.map((res) => res.error),
    errorHandle: true,
  });

  return {
    $catalog,
    $nextCursor,
    $pending: fetchPageQuery.$pending,
    loadMoreClicked,
  };
};
