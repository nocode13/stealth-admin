import { createEffect, createEvent, createStore, merge, sample, type StoreValue } from 'effector';
import { createQuery } from 'effector-refetch';
import { spread } from 'patronum';

import { ListingCreateEdit } from '@/features/listing/creat-edit';
import { ListingDelete } from '@/features/listing/delete';
import { ListingFilters } from '@/features/listing/filter';
import type { Listing } from '@/entities/listing';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';
import { message } from '@/shared/lib/message';
import { PAGE_SIZE } from '@/shared/config/pagination';
import { fRetry } from '@/shared/lib/f-retry';
import { toTiyin } from '@/shared/lib/currency/currency';

export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({ route, roles: ['SELLER'] });

  const loadMoreClicked = createEvent();

  const $listing = createStore<Listing[]>([]);
  const $nextCursor = createStore<string | null>(null);

  const purge = merge([ListingCreateEdit.model.mutated, ListingDelete.model.mutated]);

  const fetchPageQuery = createQuery({
    effect: createEffect(
      ({ cursor, filters }: { cursor?: string | null; filters: StoreValue<typeof ListingFilters.model.$filters> }) =>
        api.listing.findAll({
          cursor: cursor || undefined,
          limit: PAGE_SIZE,
          search: filters.search || undefined,
          categoryId: filters.categoryId || undefined,
          status: filters.status || undefined,
          minPrice: filters.minPrice != null ? toTiyin(filters.minPrice) : undefined,
          maxPrice: filters.maxPrice != null ? toTiyin(filters.maxPrice) : undefined,
        }),
    ),
    concurrency: 'TAKE_LATEST',
    cache: { staleAfter: 5000, purge },
  });

  fRetry(fetchPageQuery, { times: 2, delay: 300 });

  sample({
    clock: [authorizedRoute.opened, purge],
    source: { filters: ListingFilters.model.$filters },
    filter: authorizedRoute.$isOpened,
    target: fetchPageQuery.start,
  });

  sample({
    clock: loadMoreClicked,
    source: { cursor: $nextCursor, filters: ListingFilters.model.$filters },
    target: fetchPageQuery.start,
  });

  sample({
    clock: ListingFilters.model.filtersChanged,
    source: { filters: ListingFilters.model.$filters },
    fn: ({ filters }) => ({ cursor: undefined, filters }),
    target: fetchPageQuery.start,
  });

  sample({
    clock: fetchPageQuery.finished.done,
    source: $listing,
    fn: (listing, res) => ({
      listing: res.params.cursor ? [...listing, ...res.result.data.items] : res.result.data.items,
      cursor: res.result.data.nextCursor,
    }),
    target: spread({
      listing: $listing,
      cursor: $nextCursor,
    }),
  });

  sample({
    clock: purge,
    target: [$nextCursor.reinit],
  });

  sample({
    clock: authorizedRoute.closed,
    target: [ListingCreateEdit.model.reset],
  });

  message({
    clock: fetchPageQuery.finished.fail.map(({ error }) => error),
    errorHandle: true,
  });

  return {
    $listing,
    $nextCursor,
    $pending: fetchPageQuery.$pending,
    loadMoreClicked,
  };
};
