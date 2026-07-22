import { createEffect, createEvent, createStore, merge, sample } from 'effector';
import { cache, concurrency, createQuery } from 'effector-refetch';

import { SellerCreateEdit } from '@/features/seller/creat-edit';
import { ChangeOrderStatus } from '@/features/order/change-status';
import type { Order } from '@/entities/order';
import type { Category } from '@/entities/category';
import type { CatalogItem } from '@/entities/catalog';
import type { Listing } from '@/entities/listing';
import type { Seller } from '@/entities/seller';
import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import { PAGE_SIZE } from '@/shared/config/pagination';
import { fRetry } from '@/shared/lib/f-retry';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';
import { message } from '@/shared/lib/message';

// Категории/каталог/листинги продавца грузятся одним запросом (limit 50, без
// подгрузки) — это вспомогательные списки на странице, а не основной раздел.
const SIDE_LIST_LIMIT = 50;

// Заказы продавца — переиспользуем GET /admin/orders?sellerId=, отдельный сторе от
// pages/orders (его стор инкапсулирован в factory() и не переиспользуется, тот же
// принцип, что и у категорий/каталога).
export const factory = ({ route }: LazyPageFactoryParams<{ id: string }>) => {
  const authorizedRoute = userModel.chainAuthorized({ route, roles: ['SUPER_ADMIN'] });

  const loadMoreClicked = createEvent();

  const fetchSellerQuery = createQuery({
    effect: createEffect((id: string) => api.sellers.findOne(id)),
  });

  const $seller = createStore<Seller | null>(null).on(fetchSellerQuery.finished.done, (_, { result }) => result);

  sample({
    clock: SellerCreateEdit.model.mutated,
    fn: ({ result }) => result,
    target: $seller,
  });

  const fetchOrdersQuery = createQuery({
    effect: createEffect((params: { sellerId: string; cursor?: string }) =>
      api.orders.findAll({ sellerId: params.sellerId, cursor: params.cursor, limit: PAGE_SIZE }),
    ),
  });

  const $orders = createStore<Order[]>([]).on(fetchOrdersQuery.finished.done, (items, { result: { data } }) =>
    items.concat(data.items),
  );

  const $nextCursor = createStore<string | null>(null).on(
    fetchOrdersQuery.finished.done,
    (_, { result: { data } }) => data.nextCursor,
  );

  const fetchCategoriesQuery = createQuery({
    effect: createEffect((sellerId: string) =>
      api.category.findAll({ sellerId, limit: SIDE_LIST_LIMIT }).then((r) => r.data),
    ),
  });
  const $categories = createStore<Category[]>([]).on(
    fetchCategoriesQuery.finished.done,
    (_, { result }) => result.items,
  );

  const fetchCatalogQuery = createQuery({
    effect: createEffect((sellerId: string) =>
      api.catalog.findAll({ sellerId, limit: SIDE_LIST_LIMIT }).then((r) => r.data),
    ),
  });
  const $catalogItems = createStore<CatalogItem[]>([]).on(
    fetchCatalogQuery.finished.done,
    (_, { result }) => result.items,
  );

  const fetchListingsQuery = createQuery({
    effect: createEffect((sellerId: string) =>
      api.listing.findAll({ sellerId, limit: SIDE_LIST_LIMIT }).then((r) => r.data),
    ),
  });
  const $listings = createStore<Listing[]>([]).on(fetchListingsQuery.finished.done, (_, { result }) => result.items);

  sample({
    clock: authorizedRoute.opened,
    source: authorizedRoute.$params,
    filter: (params) => !!params.id,
    fn: (params) => params.id,
    target: fetchSellerQuery.start,
  });

  sample({
    clock: authorizedRoute.opened,
    source: authorizedRoute.$params,
    filter: (params) => !!params.id,
    fn: (params) => ({ sellerId: params.id }),
    target: fetchOrdersQuery.start,
  });

  sample({
    clock: authorizedRoute.opened,
    source: authorizedRoute.$params,
    filter: (params) => !!params.id,
    fn: (params) => params.id,
    target: [fetchCategoriesQuery.start, fetchCatalogQuery.start, fetchListingsQuery.start],
  });

  sample({
    clock: loadMoreClicked,
    source: { params: authorizedRoute.$params, cursor: $nextCursor },
    filter: ({ cursor }): cursor is string => cursor !== null,
    fn: ({ params, cursor }) => ({ sellerId: params.id, cursor }),
    target: fetchOrdersQuery.start,
  });

  sample({
    clock: authorizedRoute.closed,
    target: [
      $seller.reinit,
      $orders.reinit,
      $nextCursor.reinit,
      $categories.reinit,
      $catalogItems.reinit,
      $listings.reinit,
      SellerCreateEdit.model.reset,
      ChangeOrderStatus.model.reset,
    ],
  });

  fRetry(fetchSellerQuery, { times: 2, delay: 300 });
  fRetry(fetchOrdersQuery, { times: 2, delay: 300 });
  fRetry(fetchCategoriesQuery, { times: 2, delay: 300 });
  fRetry(fetchCatalogQuery, { times: 2, delay: 300 });
  fRetry(fetchListingsQuery, { times: 2, delay: 300 });
  concurrency(fetchOrdersQuery, { strategy: 'TAKE_LATEST' });
  cache(fetchSellerQuery, { staleAfter: 5000 });

  message({
    clock: merge([
      fetchSellerQuery.finished.fail,
      fetchOrdersQuery.finished.fail,
      fetchCategoriesQuery.finished.fail,
      fetchCatalogQuery.finished.fail,
      fetchListingsQuery.finished.fail,
    ]).map((res) => res.error),
    errorHandle: true,
  });

  return {
    $seller,
    $orders,
    $nextCursor,
    $categories,
    $catalogItems,
    $listings,
    $pending: fetchSellerQuery.$pending,
    $ordersPending: fetchOrdersQuery.$pending,
    $categoriesPending: fetchCategoriesQuery.$pending,
    $catalogPending: fetchCatalogQuery.$pending,
    $listingsPending: fetchListingsQuery.$pending,
    loadMoreClicked,
  };
};
