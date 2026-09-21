import { createEffect, createEvent, createStore, sample } from 'effector';
import { createQuery } from 'effector-refetch';
import { interval, spread } from 'patronum';

import { BroadcastCreate } from '@/features/broadcast/create';
import type { Broadcast } from '@/entities/broadcast';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';
import { message } from '@/shared/lib/message';
import { PAGE_SIZE } from '@/shared/config/pagination';
import { fRetry } from '@/shared/lib/f-retry';

// Доставка идёт в фоне на бэкенде — пока есть SENDING, обновляем счётчики.
const POLL_MS = 5000;

export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({ route, roles: ['SUPER_ADMIN'] });

  const loadMoreClicked = createEvent();

  const $broadcasts = createStore<Broadcast[]>([]);
  const $nextCursor = createStore<string | null>(null);

  const purge = BroadcastCreate.model.mutated;

  const fetchPageQuery = createQuery({
    effect: createEffect(({ cursor }: { cursor?: string | null }) =>
      api.broadcast.findAll({ cursor: cursor || undefined, limit: PAGE_SIZE }),
    ),
    concurrency: 'TAKE_LATEST',
  });

  fRetry(fetchPageQuery, { times: 2, delay: 300 });

  // Статус меняется только у свежих рассылок, поэтому поллим первую страницу (подгруженный
  // «Загрузить ещё» хвост при этом сбрасывается — старые записи давно в DONE/FAILED).
  const refreshed = fetchPageQuery.start.prepend(() => ({ cursor: undefined }));

  sample({
    clock: [authorizedRoute.opened, purge],
    filter: authorizedRoute.$isOpened,
    target: refreshed,
  });

  sample({
    clock: loadMoreClicked,
    source: { cursor: $nextCursor },
    target: fetchPageQuery.start,
  });

  sample({
    clock: fetchPageQuery.finished.done,
    source: $broadcasts,
    fn: (broadcasts, res) => ({
      broadcasts: res.params.cursor ? [...broadcasts, ...res.result.data.items] : res.result.data.items,
      cursor: res.result.data.nextCursor,
    }),
    target: spread({
      broadcasts: $broadcasts,
      cursor: $nextCursor,
    }),
  });

  const $hasSending = $broadcasts.map((list) => list.some((b) => b.status === 'SENDING'));

  const { tick } = interval({
    timeout: POLL_MS,
    start: $hasSending.updates.filter({ fn: Boolean }),
    stop: [$hasSending.updates.filter({ fn: (has) => !has }), authorizedRoute.closed],
  });

  sample({
    clock: tick,
    filter: authorizedRoute.$isOpened,
    target: refreshed,
  });

  sample({
    clock: authorizedRoute.closed,
    target: [BroadcastCreate.model.reset],
  });

  message({
    clock: fetchPageQuery.finished.fail.map((res) => res.error),
    errorHandle: true,
  });

  return {
    $broadcasts,
    $nextCursor,
    $pending: fetchPageQuery.$pending,
    loadMoreClicked,
  };
};
