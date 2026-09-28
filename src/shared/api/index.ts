import { appVersions } from './app-versions';
import { auth } from './auth';
import { broadcast } from './broadcast';
import { catalog } from './catalog';
import { category } from './category';
import { country } from './country';
import { customer } from './customer';
import { listing } from './listing';
import { metrics } from './metrics';
import { orders } from './orders';
import { pricePriority } from './price-priority';
import { promotion } from './promotion';
import { sellers } from './sellers';
import { settings } from './settings';

export type {
  AppPlatform,
  AppVersion,
  BotLinkSession,
  Broadcast,
  BroadcastAudience,
  BroadcastAudienceCount,
  BroadcastAudiencePayload,
  BroadcastStatus,
  BusinessDay,
  CatalogItem,
  CatalogItemMedia,
  CatalogItemPayload,
  Category,
  CategoryPayload,
  ChangeOrderStatusPayload,
  Country,
  CountryPayload,
  CreateBroadcastPayload,
  CreateCountryPayload,
  CursorPage,
  Customer,
  FindCountriesParams,
  FindCustomersParams,
  FindMetricsPeriodParams,
  FindOrdersParams,
  FindPromotionsParams,
  Listing,
  ListingPayload,
  ListingStatus,
  Locale,
  LocalizedText,
  LoginPayload,
  MarkupTier,
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
  PriceSource,
  Promotion,
  PromotionDetail,
  PromotionItem,
  PromotionPayload,
  PromotionState,
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

export const api = {
  appVersions,
  auth,
  broadcast,
  category,
  catalog,
  country,
  customer,
  listing,
  metrics,
  orders,
  pricePriority,
  promotion,
  sellers,
  settings,
};
