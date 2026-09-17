import { createEffect, createEvent, createStore, sample } from 'effector';
import { createQuery } from 'effector-refetch';
import { delay, spread } from 'patronum';

import type { CatalogItem } from '@/entities/catalog';
import { api } from '@/shared/api';
import { fRetry } from '@/shared/lib/f-retry';
import { message } from '@/shared/lib/message';

import { disclosure, editTriggered } from './model';

/** Пагинации в модалке нет намеренно: показываем первую сотню, дальше — страница /catalog. */
const ITEMS_LIMIT = 100;

export const detachTriggered = createEvent<CatalogItem>();
/** Публичное событие: позиция отвязана. Страница категорий по нему перезапрашивает счётчики. */
export const itemDetached = createEvent<CatalogItem>();

export const $items = createStore<CatalogItem[]>([]);
/** true — позиций больше, чем ITEMS_LIMIT: показываем подсказку под таблицей. */
export const $hasMore = createStore(false);
/** id позиций, по которым сейчас идёт запрос — для loading на конкретной строке. */
export const $detachingIds = createStore<string[]>([]);

const fetchItemsQuery = createQuery({
  effect: createEffect((categoryId: string) => api.catalog.findAll({ categoryId, limit: ITEMS_LIMIT })),
  concurrency: 'TAKE_LATEST',
});

fRetry(fetchItemsQuery, { times: 2, delay: 300 });

export const $pending = fetchItemsQuery.$pending;

// Список грузим только в режиме редактирования: у новой категории позиций быть не может.
sample({
  clock: editTriggered,
  fn: (category) => category.id,
  target: fetchItemsQuery.start,
});

// ВАЖНО: api.catalog.findAll возвращает сырой axios-ответ (в отличие от create/update),
// поэтому данные лежат в res.result.data — та же асимметрия, что у api.category.findAll.
sample({
  clock: fetchItemsQuery.finished.done,
  fn: (res) => ({
    items: res.result.data.items,
    hasMore: res.result.data.nextCursor !== null,
  }),
  target: spread({ items: $items, hasMore: $hasMore }),
});

const detachFx = createEffect((item: CatalogItem) =>
  // Отдельный запрос, не связанный с сохранением формы категории:
  // categoryId: null — единственный способ снять категорию у позиции.
  api.catalog.update(item.id, { categoryId: null }).then(() => item),
);

sample({ clock: detachTriggered, target: detachFx });
sample({ clock: detachFx.doneData, target: itemDetached });

$detachingIds
  .on(detachTriggered, (ids, item) => [...ids, item.id])
  .on(detachFx.finally, (ids, { params }) => ids.filter((id) => id !== params.id));

// Строку убираем локально — перезапрашивать весь список ради одной отвязки незачем.
$items.on(itemDetached, (items, item) => items.filter((i) => i.id !== item.id));

// Сброс тем же клоком, которым model.ts сбрасывает форму после закрытия модалки.
sample({
  clock: delay(disclosure.closed, 100),
  target: [$items.reinit, $hasMore.reinit, $detachingIds.reinit],
});

message({ clock: itemDetached, type: 'success', content: 'Позиция отвязана от категории' });
message({ clock: detachFx.failData, errorHandle: true });
message({ clock: fetchItemsQuery.finished.fail.map((res) => res.error), errorHandle: true });
