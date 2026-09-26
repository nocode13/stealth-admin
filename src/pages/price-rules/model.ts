import { createEffect, createEvent, createStore, sample, type StoreValue } from 'effector';
import { createQuery } from 'effector-refetch';
import { spread } from 'patronum';

import { PriceRuleCreateEdit } from '@/features/price-rule/creat-edit';
import { PriceRuleFilters } from '@/features/price-rule/filter';
import type { PriceRule } from '@/entities/price-rule';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';
import { message } from '@/shared/lib/message';
import { PAGE_SIZE } from '@/shared/config/pagination';
import { fRetry } from '@/shared/lib/f-retry';

export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({ route, roles: ['SUPER_ADMIN'] });

  const loadMoreClicked = createEvent();

  const $rules = createStore<PriceRule[]>([]);
  const $nextCursor = createStore<string | null>(null);

  const purge = PriceRuleCreateEdit.model.mutated;

  const fetchPageQuery = createQuery({
    effect: createEffect(
      ({
        cursor,
        filters,
      }: {
        cursor?: string | null;
        filters: StoreValue<typeof PriceRuleFilters.model.$filters>;
      }) =>
        api.priceRule.findAll({
          cursor: cursor || undefined,
          limit: PAGE_SIZE,
          search: filters.search || undefined,
        }),
    ),
    concurrency: 'TAKE_LATEST',
    cache: { staleAfter: 5000, purge },
  });

  fRetry(fetchPageQuery, { times: 2, delay: 300 });

  sample({
    clock: [authorizedRoute.opened, purge],
    source: { filters: PriceRuleFilters.model.$filters },
    filter: authorizedRoute.$isOpened,
    target: fetchPageQuery.start,
  });

  sample({
    clock: loadMoreClicked,
    source: { cursor: $nextCursor, filters: PriceRuleFilters.model.$filters },
    target: fetchPageQuery.start,
  });

  sample({
    clock: PriceRuleFilters.model.filtersChanged,
    source: { filters: PriceRuleFilters.model.$filters },
    fn: ({ filters }) => ({ cursor: undefined, filters }),
    target: fetchPageQuery.start,
  });

  sample({
    clock: fetchPageQuery.finished.done,
    source: $rules,
    fn: (rules, res) => ({
      rules: res.params.cursor ? [...rules, ...res.result.data.items] : res.result.data.items,
      cursor: res.result.data.nextCursor,
    }),
    target: spread({
      rules: $rules,
      cursor: $nextCursor,
    }),
  });

  sample({
    clock: purge,
    target: [$nextCursor.reinit],
  });

  sample({
    clock: authorizedRoute.closed,
    target: [PriceRuleCreateEdit.model.reset],
  });

  message({
    clock: fetchPageQuery.finished.fail.map((res) => res.error),
    errorHandle: true,
  });

  return {
    $rules,
    $nextCursor,
    $pending: fetchPageQuery.$pending,
    loadMoreClicked,
  };
};
