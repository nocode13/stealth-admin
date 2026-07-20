import { auth } from './auth';
import { catalog } from './catalog';
import { category } from './category';
import { listing } from './listing';
import { orders } from './orders';
import { sellers } from './sellers';

export type {
  BotLinkSession,
  CatalogItem,
  Category,
  CategoryPayload,
  ChangeOrderStatusPayload,
  CursorPage,
  FindOrdersParams,
  Listing,
  ListingStatus,
  LoginPayload,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistoryEntry,
  PaymentMethod,
  PaymentStatus,
  ReviewStatus,
  Role,
  Seller,
  SellerStatus,
  UpdateOrderCourierPayload,
  User,
} from './types';
export { getApiErrorMessage } from './error';
export { base } from './instances';

export const api = { auth, category, catalog, listing, orders, sellers };
