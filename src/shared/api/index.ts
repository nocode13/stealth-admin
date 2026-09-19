import { appVersions } from './app-versions';
import { auth } from './auth';
import { catalog } from './catalog';
import { category } from './category';
import { country } from './country';
import { listing } from './listing';
import { metrics } from './metrics';
import { orders } from './orders';
import { sellers } from './sellers';
import { settings } from './settings';

export type {
  AppPlatform,
  AppVersion,
  BotLinkSession,
  CatalogItem,
  CatalogItemMedia,
  CatalogItemPayload,
  Category,
  CategoryPayload,
  ChangeOrderStatusPayload,
  Country,
  CountryPayload,
  CreateCountryPayload,
  CursorPage,
  FindCountriesParams,
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
  OrderGroup,
  OrderGroupStatus,
  OrderItem,
  OrderStatus,
  OrderStatusHistoryEntry,
  PaymentMethod,
  PaymentStatus,
  PlatformSettings,
  ReviewStatus,
  Role,
  Seller,
  SellerStaff,
  SellerStaffPayload,
  SellerStatus,
  UpdateAppVersionPayload,
  UpdateOrderCourierPayload,
  UpdatePlatformSettingsPayload,
  User,
} from './types';
export { getApiErrorMessage } from './error';
export { base } from './instances';

export const api = { appVersions, auth, category, catalog, country, listing, metrics, orders, sellers, settings };
