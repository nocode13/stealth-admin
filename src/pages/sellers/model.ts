import { createEffect, createEvent, createStore, merge, sample } from 'effector';
import { cache, concurrency, createQuery } from 'effector-refetch';

import { SellerChangeStatus } from '@/features/seller/change-status';
import { userModel } from '@/entities/user';
import type { Seller } from '@/entities/seller';
import { api } from '@/shared/api';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';
import { message } from '@/shared/lib/message';
import { PAGE_SIZE } from '@/shared/config/pagination';
import { fRetry } from '@/shared/lib/f-retry';

export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({ route, roles: ['SUPER_ADMIN'] });

  const loadMoreClicked = createEvent();

  const fetchPageQuery = createQuery({
    effect: createEffect((cursor?: string) => api.sellers.findAll({ cursor, limit: PAGE_SIZE })),
  });

  const $sellers = createStore<Seller[]>([]).on(fetchPageQuery.finished.done, (items, { result: { data } }) =>
    items.concat(data.items),
  );

  const $nextCursor = createStore<string | null>(null).on(
    fetchPageQuery.finished.done,
    (_, { result: { data } }) => data.nextCursor,
  );

  const purge = merge([SellerChangeStatus.model.mutated]);

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
    target: [$nextCursor.reinit, $sellers.reinit],
  });

  sample({
    clock: authorizedRoute.closed,
    target: [$nextCursor.reinit, $sellers.reinit, SellerChangeStatus.model.reset],
  });

  fRetry(fetchPageQuery, { times: 2, delay: 300 });
  concurrency(fetchPageQuery, { strategy: 'TAKE_LATEST' });
  cache(fetchPageQuery, { staleAfter: 5000, purge });

  message({
    clock: fetchPageQuery.finished.fail.map((res) => res.error),
    errorHandle: true,
  });

  return {
    $sellers,
    $nextCursor,
    $pending: fetchPageQuery.$pending,
    loadMoreClicked,
  };
};
