import { createEffect, createEvent, createStore, merge, sample } from 'effector';
import { cache, concurrency, createQuery } from 'effector-refetch';

import { ListingCreateEdit } from '@/features/listing/creat-edit';
import { ListingDelete } from '@/features/listing/delete';
import type { Listing } from '@/entities/listing';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';
import { message } from '@/shared/lib/message';
import { PAGE_SIZE } from '@/shared/config/pagination';
import { fRetry } from '@/shared/lib/f-retry';

export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({ route, roles: ['SELLER'] });

  const loadMoreClicked = createEvent();

  const fetchPageQuery = createQuery({
    effect: createEffect((cursor?: string) => api.listing.findAll({ cursor, limit: PAGE_SIZE })),
  });

  const $listing = createStore<Listing[]>([]).on(fetchPageQuery.finished.done, (items, { result: { data } }) =>
    items.concat(data.items),
  );

  const $nextCursor = createStore<string | null>(null).on(
    fetchPageQuery.finished.done,
    (_, { result: { data } }) => data.nextCursor,
  );

  const purge = merge([ListingCreateEdit.model.mutated, ListingDelete.model.mutated]);

  sample({
    clock: [authorizedRoute.opened, purge],
    filter: authorizedRoute.$isOpened,
    target: fetchPageQuery.start.prepend(() => undefined),
  });

  sample({
    clock: loadMoreClicked,
    source: $nextCursor,
    filter: (cursor): cursor is string => cursor !== null,
    target: fetchPageQuery.start,
  });

  sample({
    clock: purge,
    target: [$nextCursor.reinit, $listing.reinit],
  });

  sample({
    clock: authorizedRoute.closed,
    target: [$nextCursor.reinit, $listing.reinit, ListingCreateEdit.model.reset],
  });

  fRetry(fetchPageQuery, { times: 2, delay: 300 });
  concurrency(fetchPageQuery, { strategy: 'TAKE_LATEST' });
  cache(fetchPageQuery, { staleAfter: 5000, purge });

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
