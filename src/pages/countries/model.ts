import { createEffect, createEvent, createStore, sample, type StoreValue } from 'effector';
import { createQuery } from 'effector-refetch';
import { spread } from 'patronum';

import { CountryCreateEdit } from '@/features/country/creat-edit';
import { CountryFilters } from '@/features/country/filter';
import type { Country } from '@/entities/country';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';
import { message } from '@/shared/lib/message';
import { PAGE_SIZE } from '@/shared/config/pagination';
import { fRetry } from '@/shared/lib/f-retry';

export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({ route, roles: ['SUPER_ADMIN'] });

  const loadMoreClicked = createEvent();

  const $countries = createStore<Country[]>([]);
  const $nextCursor = createStore<string | null>(null);

  const purge = CountryCreateEdit.model.mutated;

  const fetchPageQuery = createQuery({
    effect: createEffect(
      ({ cursor, filters }: { cursor?: string | null; filters: StoreValue<typeof CountryFilters.model.$filters> }) =>
        api.country.findAll({
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
    source: { filters: CountryFilters.model.$filters },
    filter: authorizedRoute.$isOpened,
    target: fetchPageQuery.start,
  });

  sample({
    clock: loadMoreClicked,
    source: { cursor: $nextCursor, filters: CountryFilters.model.$filters },
    target: fetchPageQuery.start,
  });

  sample({
    clock: CountryFilters.model.filtersChanged,
    source: { filters: CountryFilters.model.$filters },
    fn: ({ filters }) => ({ cursor: undefined, filters }),
    target: fetchPageQuery.start,
  });

  sample({
    clock: fetchPageQuery.finished.done,
    source: $countries,
    fn: (countries, res) => ({
      countries: res.params.cursor ? [...countries, ...res.result.data.items] : res.result.data.items,
      cursor: res.result.data.nextCursor,
    }),
    target: spread({
      countries: $countries,
      cursor: $nextCursor,
    }),
  });

  sample({
    clock: purge,
    target: [$nextCursor.reinit],
  });

  sample({
    clock: authorizedRoute.closed,
    target: [CountryCreateEdit.model.reset],
  });

  message({
    clock: fetchPageQuery.finished.fail.map((res) => res.error),
    errorHandle: true,
  });

  return {
    $countries,
    $nextCursor,
    $pending: fetchPageQuery.$pending,
    loadMoreClicked,
  };
};
