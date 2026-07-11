import { createEffect, createEvent, createStore, sample } from 'effector';
import { cache, concurrency, createQuery } from 'effector-refetch';

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

  const fetchPageQuery = createQuery({
    effect: createEffect((cursor?: string) => api.catalog.findAll({ cursor, limit: PAGE_SIZE })),
  });

  const $catalog = createStore<CatalogItem[]>([]).on(fetchPageQuery.finished.done, (items, { result: { data } }) =>
    items.concat(data.items),
  );

  const $nextCursor = createStore<string | null>(null).on(
    fetchPageQuery.finished.done,
    (_, { result: { data } }) => data.nextCursor,
  );

  sample({
    clock: authorizedRoute.opened,
    target: fetchPageQuery.start.prepend(() => undefined),
  });

  sample({
    clock: loadMoreClicked,
    source: $nextCursor,
    filter: (cursor): cursor is string => cursor !== null,
    target: fetchPageQuery.start,
  });

  sample({
    clock: authorizedRoute.closed,
    target: [$nextCursor.reinit, $catalog.reinit],
  });

  fRetry(fetchPageQuery, { times: 2, delay: 300 });
  concurrency(fetchPageQuery, { strategy: 'TAKE_LATEST' });
  cache(fetchPageQuery, { staleAfter: 5000 });

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
