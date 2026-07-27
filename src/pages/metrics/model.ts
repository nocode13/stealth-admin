import { createEffect, createEvent, createStore, merge, sample } from 'effector';
import { cache, concurrency, createQuery } from 'effector-refetch';

import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import type {
  FindMetricsPeriodParams,
  MetricsCatalog,
  MetricsOrders,
  MetricsOverview,
  MetricsUsers,
} from '@/shared/api';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';
import { message } from '@/shared/lib/message';

/** Период из RangePicker: [from, to] в ISO-датах, либо null — без фильтра (всё время). */
export type Range = [string, string] | null;

export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({
    route,
    roles: ['SUPER_ADMIN'],
  });

  const rangeChanged = createEvent<Range>();
  const $range = createStore<Range>(null).on(rangeChanged, (_, range) => range);

  const $periodParams = $range.map((range): FindMetricsPeriodParams => (range ? { from: range[0], to: range[1] } : {}));

  const overviewQuery = createQuery({
    effect: createEffect(() => api.metrics.getOverview()),
  });
  const catalogQuery = createQuery({
    effect: createEffect(() => api.metrics.getCatalog()),
  });
  const usersQuery = createQuery({
    effect: createEffect((params: FindMetricsPeriodParams) => api.metrics.getUsers(params)),
  });
  const ordersQuery = createQuery({
    effect: createEffect((params: FindMetricsPeriodParams) => api.metrics.getOrders(params)),
  });

  const $overview = createStore<MetricsOverview | null>(null).on(
    overviewQuery.finished.done,
    (_, { result }) => result,
  );
  const $catalog = createStore<MetricsCatalog | null>(null).on(catalogQuery.finished.done, (_, { result }) => result);
  const $users = createStore<MetricsUsers | null>(null).on(usersQuery.finished.done, (_, { result }) => result);
  const $orders = createStore<MetricsOrders | null>(null).on(ordersQuery.finished.done, (_, { result }) => result);

  concurrency(overviewQuery, { strategy: 'TAKE_LATEST' });
  concurrency(catalogQuery, { strategy: 'TAKE_LATEST' });
  concurrency(usersQuery, { strategy: 'TAKE_LATEST' });
  concurrency(ordersQuery, { strategy: 'TAKE_LATEST' });

  cache(overviewQuery, { staleAfter: 5000 });
  cache(catalogQuery, { staleAfter: 5000 });
  cache(usersQuery, { staleAfter: 5000, purge: rangeChanged });
  cache(ordersQuery, { staleAfter: 5000, purge: rangeChanged });

  sample({
    clock: authorizedRoute.opened,
    target: [overviewQuery.start, catalogQuery.start],
  });

  sample({
    clock: [authorizedRoute.opened, rangeChanged],
    source: $periodParams,
    target: [usersQuery.start, ordersQuery.start],
  });

  sample({
    clock: authorizedRoute.closed,
    target: [$range.reinit, $overview.reinit, $catalog.reinit, $users.reinit, $orders.reinit],
  });

  message({
    clock: merge([
      overviewQuery.finished.fail,
      catalogQuery.finished.fail,
      usersQuery.finished.fail,
      ordersQuery.finished.fail,
    ]).map((res) => res.error),
    errorHandle: true,
  });

  return {
    $overview,
    $catalog,
    $users,
    $orders,
    $range,
    $pending: overviewQuery.$pending,
    rangeChanged,
  };
};
