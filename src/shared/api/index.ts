import { auth } from './auth';
import { catalog } from './catalog';
import { category } from './category';
import { listing } from './listing';
import { metrics } from './metrics';
import { orders } from './orders';
import { sellers } from './sellers';

export type {
  BotLinkSession,
  CatalogItem,
  CatalogItemPayload,
  Category,
  CategoryPayload,
  ChangeOrderStatusPayload,
  CursorPage,
  FindMetricsPeriodParams,
  FindOrdersParams,
  Listing,
  ListingPayload,
  ListingStatus,
  LoginPayload,
  MetricsCatalog,
  MetricsOrders,
  MetricsOrdersByStatus,
  MetricsOverview,
  MetricsUsers,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistoryEntry,
  PaymentMethod,
  PaymentStatus,
  ReviewStatus,
  Role,
  Seller,
  SellerStaff,
  SellerStaffPayload,
  SellerStatus,
  UpdateOrderCourierPayload,
  User,
} from './types';
export { getApiErrorMessage } from './error';
export { base } from './instances';

export const api = { auth, category, catalog, listing, metrics, orders, sellers };
