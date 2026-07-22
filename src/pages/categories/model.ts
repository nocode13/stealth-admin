import { createEffect, createEvent, createStore, merge, sample, type StoreValue } from 'effector';
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

export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({ route });

  const loadMoreClicked = createEvent();

  const $categories = createStore<Category[]>([]);
  const $nextCursor = createStore<string | null>(null);

  const purge = merge([CategoryCreateEdit.model.mutated]);

  const fetchPageQuery = createQuery({
    effect: createEffect(
      ({ cursor, filters }: { cursor?: string | null; filters: StoreValue<typeof CategoryFilters.model.$filters> }) =>
        api.category.findAll({
          cursor: cursor || undefined,
          limit: PAGE_SIZE,
          search: filters.search || undefined,
          status: filters.status || undefined,
        }),
    ),
    concurrency: 'TAKE_LATEST',
    cache: { staleAfter: 5000, purge },
  });

  fRetry(fetchPageQuery, { times: 2, delay: 300 });

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

  sample({
    clock: purge,
    target: [$nextCursor.reinit],
  });

  sample({
    clock: authorizedRoute.closed,
    target: [CategoryCreateEdit.model.reset],
  });

  message({
    clock: fetchPageQuery.finished.fail.map((res) => res.error),
    errorHandle: true,
  });

  return {
    $categories,
    $nextCursor,
    $pending: fetchPageQuery.$pending,
    loadMoreClicked,
  };
};
