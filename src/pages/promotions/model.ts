import { createEffect, createEvent, createStore, sample, type StoreValue } from 'effector';
import { createQuery } from 'effector-refetch';
import { spread } from 'patronum';

import { PromotionCreateEdit } from '@/features/promotion/creat-edit';
import { PromotionFilters } from '@/features/promotion/filter';
import type { Promotion } from '@/entities/promotion';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';
import { message } from '@/shared/lib/message';
import { PAGE_SIZE } from '@/shared/config/pagination';
import { fRetry } from '@/shared/lib/f-retry';

export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({ route, roles: ['SUPER_ADMIN'] });

  const loadMoreClicked = createEvent();

  const $promotions = createStore<Promotion[]>([]);
  const $nextCursor = createStore<string | null>(null);

  const purge = PromotionCreateEdit.model.mutated;

  const fetchPageQuery = createQuery({
    effect: createEffect(
      ({ cursor, filters }: { cursor?: string | null; filters: StoreValue<typeof PromotionFilters.model.$filters> }) =>
        api.promotion.findAll({
          cursor: cursor || undefined,
          limit: PAGE_SIZE,
          search: filters.search || undefined,
          state: filters.state ?? undefined,
        }),
    ),
    concurrency: 'TAKE_LATEST',
    cache: { staleAfter: 5000, purge },
  });

  fRetry(fetchPageQuery, { times: 2, delay: 300 });

  sample({
    clock: [authorizedRoute.opened, purge],
    source: { filters: PromotionFilters.model.$filters },
    filter: authorizedRoute.$isOpened,
    target: fetchPageQuery.start,
  });

  sample({
    clock: loadMoreClicked,
    source: { cursor: $nextCursor, filters: PromotionFilters.model.$filters },
    target: fetchPageQuery.start,
  });

  sample({
    clock: PromotionFilters.model.filtersChanged,
    source: { filters: PromotionFilters.model.$filters },
    fn: ({ filters }) => ({ cursor: undefined, filters }),
    target: fetchPageQuery.start,
  });

  sample({
    clock: fetchPageQuery.finished.done,
    source: $promotions,
    fn: (promotions, res) => ({
      promotions: res.params.cursor ? [...promotions, ...res.result.data.items] : res.result.data.items,
      cursor: res.result.data.nextCursor,
    }),
    target: spread({
      promotions: $promotions,
      cursor: $nextCursor,
    }),
  });

  sample({
    clock: purge,
    target: [$nextCursor.reinit],
  });

  sample({
    clock: authorizedRoute.closed,
    target: [PromotionCreateEdit.model.reset],
  });

  message({
    clock: fetchPageQuery.finished.fail.map((res) => res.error),
    errorHandle: true,
  });

  return {
    $promotions,
    $nextCursor,
    $pending: fetchPageQuery.$pending,
    loadMoreClicked,
  };
};
