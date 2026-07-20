import { createEffect, createEvent, createStore, merge, sample } from 'effector';
import { cache, concurrency, createQuery } from 'effector-refetch';
import { interval } from 'patronum';

import { ChangeOrderStatus } from '@/features/order/change-status';
import type { Order, OrderStatus } from '@/entities/order';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import { PAGE_SIZE } from '@/shared/config/pagination';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';
import { fRetry } from '@/shared/lib/f-retry';
import { message } from '@/shared/lib/message';
import { notification } from '@/shared/lib/notification';

/** Как часто проверяем, не появились ли новые заказы, пока вкладка открыта. */
const POLL_INTERVAL_MS = 30_000;

/** Фильтр «Активные» — то, что требует действий продавца прямо сейчас. */
export type StatusFilter = OrderStatus | 'ALL';

/** Курсор здесь же, а не отдельным параметром: фильтр обязан ехать с каждой страницей. */
type FetchParams = { cursor?: string; status: StatusFilter };

export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({
    route,
    roles: ['SELLER', 'SUPER_ADMIN'],
  });

  const loadMoreClicked = createEvent();
  const statusChanged = createEvent<StatusFilter>();
  const pollTicked = createEvent();

  const $status = createStore<StatusFilter>('ALL').on(statusChanged, (_, status) => status);

  const fetchPageQuery = createQuery({
    effect: createEffect(({ cursor, status }: FetchParams) =>
      api.orders.findAll({
        cursor,
        limit: PAGE_SIZE,
        status: status === 'ALL' ? undefined : status,
      }),
    ),
  });

  const $orders = createStore<Order[]>([]).on(fetchPageQuery.finished.done, (items, { params, result: { data } }) =>
    // Курсор в параметрах отличает дозагрузку от перезагрузки с нуля (и от тика поллинга).
    params.cursor ? items.concat(data.items) : data.items,
  );

  const $nextCursor = createStore<string | null>(null).on(
    fetchPageQuery.finished.done,
    (_, { result: { data } }) => data.nextCursor,
  );

  // Смена статуса из модалки инвалидирует список — как mutated у категорий.
  const purge = merge([ChangeOrderStatus.model.mutated, statusChanged]);

  fRetry(fetchPageQuery, { times: 2, delay: 300 });
  concurrency(fetchPageQuery, { strategy: 'TAKE_LATEST' });
  cache(fetchPageQuery, { staleAfter: 5000, purge });

  sample({
    clock: [authorizedRoute.opened, purge],
    source: $status,
    filter: authorizedRoute.$isOpened,
    fn: (status): FetchParams => ({ status }),
    target: fetchPageQuery.start,
  });

  sample({
    clock: loadMoreClicked,
    source: { cursor: $nextCursor, status: $status },
    filter: ({ cursor }) => cursor !== null,
    fn: ({ cursor, status }): FetchParams => ({ cursor: cursor ?? undefined, status }),
    target: fetchPageQuery.start,
  });

  sample({
    clock: [purge, authorizedRoute.closed],
    target: [$nextCursor.reinit, $orders.reinit],
  });

  sample({
    clock: authorizedRoute.closed,
    target: [$status.reinit, ChangeOrderStatus.model.reset],
  });

  /**
   * Поллинг новых заказов. Websocket'ов в бэкенде нет и заводить их ради одного
   * экрана незачем: раз в POLL_INTERVAL_MS перечитываем первую страницу, пока
   * вкладка открыта. Интервал обязан гаситься на закрытии роута, иначе он
   * продолжит стучать в фоне.
   */
  const poll = interval({
    timeout: POLL_INTERVAL_MS,
    start: authorizedRoute.opened,
    stop: authorizedRoute.closed,
  });

  sample({ clock: poll.tick, target: pollTicked });
  sample({
    clock: pollTicked,
    source: $status,
    filter: authorizedRoute.$isOpened,
    fn: (status): FetchParams => ({ status }),
    target: fetchPageQuery.start,
  });

  /**
   * Появились заказы, которых не было в предыдущем ответе, — показываем
   * нотификацию. Сравниваем по id, а не по длине: заказ мог и уехать из выборки
   * при активном фильтре.
   */
  const newOrdersArrived = sample({
    clock: fetchPageQuery.finished.done,
    source: $orders,
    filter: (previous, { params, result: { data } }) => {
      if (params.cursor || previous.length === 0) return false;
      const known = new Set(previous.map((order) => order.id));
      return data.items.some((order) => !known.has(order.id));
    },
    fn: (previous, { result: { data } }) => {
      const known = new Set(previous.map((order) => order.id));
      return data.items.filter((order) => !known.has(order.id)).length;
    },
  });

  notification({
    clock: newOrdersArrived,
    fn: (count) => ({
      type: 'info' as const,
      title: 'Новые заказы',
      description: `Поступило заказов: ${count}`,
    }),
  });

  message({
    clock: fetchPageQuery.finished.fail.map((res) => res.error),
    errorHandle: true,
  });

  return {
    $orders,
    $nextCursor,
    $status,
    $pending: fetchPageQuery.$pending,
    loadMoreClicked,
    statusChanged,
  };
};
