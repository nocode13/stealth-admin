export type Role = 'SUPER_ADMIN' | 'SELLER' | 'CUSTOMER';

export interface User {
  id: string;
  phone: string;
  email: string;
  role: Role;
  sellerId: string | null;
  /** Адрес покупателя в основном боте — к админке отношения не имеет. */
  telegramId: string | null;
  /** Рабочий Telegram (бот продавца). Пока null — заказы в бота не приходят. */
  staffTelegramId: string | null;
}

/** Ответ POST /admin/auth/telegram/link — ссылка на бота с одноразовым nonce. */
export interface BotLinkSession {
  nonce: string;
  /** https://t.me/<bot>?start=sel_<nonce> */
  botUrl: string;
  expiresIn: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type SellerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface CursorPageParams {
  cursor?: string;
  limit?: number;
}

export type Locale = 'RU' | 'UZ' | 'EN';

export type Translation<T> = T & { locale: Locale; auto: boolean };

export type Category = {
  id: string;
  /** Резолвленное имя (для админки всегда RU) — для таблиц и селектов. */
  name: string;
  translations: Translation<{ name: string }>[];
  sellerId: string | null;
  status: ReviewStatus;
  /** Сколько позиций каталога привязано к категории (считает бэкенд, без учёта видимости). */
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
};

export interface CategoryPayload {
  /** RU обязателен, остальные локали опциональны — пусто = не переведено. */
  translations: { locale: Locale; name?: string }[];
  status?: ReviewStatus;
}

export interface FindCategoriesParams extends CursorPageParams {
  search?: string;
  status?: ReviewStatus;
  /** Только для SUPER_ADMIN — SELLER скоупится по видимости на бэкенде. */
  sellerId?: string;
}

/** Платформенный справочник стран — в отличие от Category, нет status/sellerId: продавец
 * страну не предлагает, только выбирает из готового списка, заводит SUPER_ADMIN. */
export type Country = {
  id: string;
  /** ISO 3166-1 alpha-2, заглавными. Задаётся при создании, PATCH его не меняет. */
  code: string;
  /** Резолвленное имя (для админки всегда RU) — для таблиц и селектов. */
  name: string;
  translations: Translation<{ name: string }>[];
  /** Сколько позиций каталога ссылается на страну. Считает бэкенд. */
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
};

export interface CountryPayload {
  /** RU обязателен, остальные локали опциональны — пусто = не переведено. */
  translations: { locale: Locale; name?: string }[];
}

export interface CreateCountryPayload extends CountryPayload {
  code: string;
}

export interface FindCountriesParams extends CursorPageParams {
  search?: string;
}

export type MediaType = 'IMAGE' | 'VIDEO';

/** PROCESSING/FAILED бывают только у видео: транскод идёт фоном уже после ответа на загрузку. */
export type MediaStatus = 'PROCESSING' | 'READY' | 'FAILED';

export type CatalogItemMedia = {
  id: string;
  type: MediaType;
  status: MediaStatus;
  /** У видео до окончания обработки — ссылка на оригинал, после — на mp4. */
  url: string;
  /** Обложка видео (кадр из него), у фото всегда null. */
  posterUrl: string | null;
  sortOrder: number;
};

export type CatalogItem = {
  id: string;
  /** Резолвленное имя/описание/единица (для админки всегда RU). */
  name: string;
  description: string | null;
  unit: string;
  translations: Translation<{ name: string; description: string | null; unit: string }>[];
  categoryId: string | null;
  category: Category | null;
  countryId: string | null;
  country: Country | null;
  /** Фото и видео одной галереей, сквозной порядок по sortOrder. */
  media: CatalogItemMedia[];
  sellerId: string | null;
  status: ReviewStatus;
  /** Вайтлист бесплатной доставки — ставит только SUPER_ADMIN. */
  freeDelivery: boolean;
  /** Сколько продажных позиций заведено по этой позиции каталога. Считает бэкенд. */
  listingsCount: number;
  createdAt: string;
  updatedAt: string;
};

export interface CatalogItemPayload {
  /** RU обязателен, остальные локали опциональны — пусто = не переведено. */
  translations: { locale: Locale; name?: string; description?: string; unit?: string }[];
  /** `null` в PATCH снимает категорию; `undefined` — не менять. */
  categoryId?: string | null;
  /** `null` в PATCH снимает страну; `undefined` — не менять. */
  countryId?: string | null;
  status?: ReviewStatus;
  /** Только для SUPER_ADMIN — для остальных ролей молча игнорируется на бэкенде. */
  freeDelivery?: boolean;
}

export interface FindCatalogParams extends CursorPageParams {
  search?: string;
  categoryId?: string;
  /** Только позиции без категории; `categoryId` при этом игнорируется. */
  noCategory?: boolean;
  countryId?: string;
  status?: ReviewStatus;
  /** Только для SUPER_ADMIN — SELLER скоупится по видимости на бэкенде. */
  sellerId?: string;
  /** Только позиции из вайтлиста бесплатной доставки. */
  freeDelivery?: boolean;
}

/** Платформенный тариф доставки и наценка — синглтон, правит только SUPER_ADMIN. */
export interface PlatformSettings {
  /** В тиинах (1 сум = 100 тиинов). */
  deliveryFee: number;
  /** В тиинах; `null` — бесплатной доставки по порогу нет. */
  freeDeliveryThreshold: number | null;
  /** Базовая наценка поверх себестоимости, в базисных пунктах (2000 = 20%). */
  markupBps: number;
  /** Шаг округления розничной цены вверх, в тиинах (100 = до целого сума). */
  priceRoundingStep: number;
}

export interface UpdatePlatformSettingsPayload {
  deliveryFee?: number;
  freeDeliveryThreshold?: number | null;
  markupBps?: number;
  priceRoundingStep?: number;
}

export type AppPlatform = 'IOS' | 'ANDROID';

/** Версия приложения в сторе — по строке на платформу. */
export interface AppVersion {
  platform: AppPlatform;
  latestVersion: string;
  minSupportedVersion: string;
  storeUrl: string;
  releaseNotesRu: string | null;
  releaseNotesUz: string | null;
  releaseNotesEn: string | null;
  enabled: boolean;
  updatedAt: string;
}

export type UpdateAppVersionPayload = Partial<Omit<AppVersion, 'platform' | 'updatedAt'>>;

export type Listing = {
  id: string;
  sellerId: string;
  seller?: Pick<Seller, 'id' | 'name'>;
  catalogItemId: string;
  catalogItem: CatalogItem;
  /** Себестоимость — столько платформа должна продавцу. В тиинах (1 сум = 100 тиинов). */
  costPrice: string;
  /** Розница на витрине, в тиинах. Считает бэкенд; приходит только SUPER_ADMIN. */
  price?: string;
  /** Сработавшее правило цены; `null` — базовая наценка. Приходит только SUPER_ADMIN. */
  appliedRule?: { id: string; name: string } | null;
  /** Розница без акции (зачёркнутая «было»); `null` — не на акции. Только SUPER_ADMIN. */
  oldPrice?: string | null;
  /** Акция, давшая текущую цену. Только SUPER_ADMIN. */
  promotion?: { id: string; title: string } | null;
  stock: number;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
};

export interface ListingPayload {
  catalogItemId: string;
  /** Себестоимость в тиинах (1 сум = 100 тиинов). Розницу считает бэкенд. */
  costPrice: number;
  stock: number;
  status?: ListingStatus;
  /** Только для SUPER_ADMIN (он не привязан к продавцу) и только при создании. */
  sellerId?: string;
}

export interface FindListingsParams extends CursorPageParams {
  search?: string;
  categoryId?: string;
  status?: ListingStatus;
  /** В тиинах. У SUPER_ADMIN — по рознице, у SELLER — по себестоимости. */
  minPrice?: number;
  /** В тиинах. У SUPER_ADMIN — по рознице, у SELLER — по себестоимости. */
  maxPrice?: number;
  /** Только для SUPER_ADMIN — SELLER всегда скоупится своим продавцом. */
  sellerId?: string;
}

export type Seller = {
  id: string;
  /** Резолвленное имя/описание (для админки всегда RU). */
  name: string;
  description: string | null;
  translations: Translation<{ name: string; description: string | null }>[];
  bannerUrl: string | null;
  status: SellerStatus;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
};

export interface CreateSellerPayload {
  /** RU обязателен, остальные локали опциональны — пусто = не переведено. */
  translations: { locale: Locale; name?: string; description?: string }[];
  ownerEmail: string;
  ownerPassword: string;
  ownerPhone?: string;
}

export interface UpdateSellerPayload {
  translations?: { locale: Locale; name?: string; description?: string }[];
  status?: SellerStatus;
}

export interface FindSellersParams extends CursorPageParams {
  search?: string;
  status?: SellerStatus;
}

/**
 * Сотрудник продавца. Их может быть несколько на одного продавца, и новый заказ
 * в бота получают все с `telegramLinked: true`. Владелец — такой же сотрудник,
 * только неудаляемый.
 */
export interface SellerStaff {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  /** Привязан рабочий Telegram — значит заказы приходят в бота продавца. */
  telegramLinked: boolean;
  isOwner: boolean;
  /** Задан пароль — может входить в админку. Без него остаётся только бот. */
  hasPassword: boolean;
  createdAt: string;
}

/** Все поля опциональны: минимум — имя, дальше инвайт-ссылка в бота. */
export interface SellerStaffPayload {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
}

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'ASSEMBLING'
  | 'DELIVERING'
  /** Курьер на месте — покупателю в этот момент уходит сообщение в боте. */
  | 'ARRIVED'
  | 'DELIVERED'
  | 'CANCELLED';

/** Статус группы (чекаута целиком) — как OrderStatus, плюс PARTIALLY_DELIVERED:
 * часть заказов группы уже доставлена, часть ещё нет. Выводится на бэкенде из
 * статусов заказов группы, руками не выставляется. */
export type OrderGroupStatus = OrderStatus | 'PARTIALLY_DELIVERED';

export type PaymentMethod = 'CASH';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED';

/** Позиция заказа — снапшот на момент оформления, а не ссылка на живой листинг. */
export interface OrderItem {
  id: string;
  listingId: string | null;
  catalogItemName: string;
  catalogItemImageUrl: string | null;
  unit: string;
  /** Розница. У SELLER сервер кладёт сюда себестоимость — розницу он не видит. */
  price: string;
  quantity: number;
  /** Розница × количество (у SELLER — себестоимость × количество). */
  total: string;
  /** Только SUPER_ADMIN. */
  costPrice?: string;
  /** Только SUPER_ADMIN. */
  costTotal?: string;
  /** Только SUPER_ADMIN: акция из снапшота позиции; `null` — без акции. */
  promotionTitle?: string | null;
  /** Только SUPER_ADMIN: розница без акции на момент оформления. */
  oldPrice?: string | null;
  createdAt: string;
}

export interface OrderStatusHistoryEntry {
  id: string;
  status: OrderStatus;
  comment: string | null;
  createdAt: string;
}

/** Заказ — доля одного продавца внутри группы чекаута; общие данные оформления
 * (контакты, адрес, оплата, доставка, итог) — на корне, см. OrderGroup. */
export interface Order {
  id: string;
  orderNumber: number;
  seller: { id: string; name: string };
  status: OrderStatus;
  /** Сумма товаров этого продавца: розница, у SELLER — себестоимость (к выплате).
   * Доставка на заказ не раскладывается — она платформенная, посчитана один раз и
   * живёт в OrderGroup.deliveryFee/total. */
  itemsTotal: string;
  /** Выплата продавцу. Только SUPER_ADMIN. */
  costTotal?: string;
  courierName: string | null;
  courierPhone: string | null;
  cancelReason: string | null;
  items: OrderItem[];
  history: OrderStatusHistoryEntry[];
  createdAt: string;
  confirmedAt: string | null;
  deliveredAt: string | null;
}

/** Группа чекаута — корень ответа: общие данные оформления (контакты, адрес, оплата,
 * доставка, итог), одна на весь checkout, и заказы по продавцам внутри неё. */
export interface OrderGroup {
  id: string;
  groupNumber: number;
  status: OrderGroupStatus;
  contactName: string;
  contactPhone: string;
  deliveryAddress: string;
  deliveryComment: string | null;
  /** Координаты из Telegram-локации: по ним строится ссылка «Маршрут». */
  deliveryLat: number | null;
  deliveryLng: number | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  itemsTotal: string;
  deliveryFee: string;
  total: string;
  /** Сколько заказов ВИДНО в этом ответе — у SELLER это не то же самое, что общее
   * число заказов в группе: сервер отдаёт и пересчитывает только его часть. */
  ordersCount: number;
  createdAt: string;
  orders: Order[];
  /** Сумма выплат продавцам по группе. Только SUPER_ADMIN. */
  costTotal?: string;
  /** itemsTotal − costTotal: маржа платформы на товарах. Только SUPER_ADMIN. */
  margin?: string;
}

export interface FindOrdersParams extends CursorPageParams {
  status?: OrderGroupStatus;
  /** Номер группы, номер заказа, телефон или имя получателя. */
  search?: string;
  /** Только для SUPER_ADMIN — SELLER всегда скоупится своим продавцом. */
  sellerId?: string;
}

export interface ChangeOrderStatusPayload {
  status: OrderStatus;
  comment?: string;
}

export interface UpdateOrderCourierPayload {
  courierName?: string;
  courierPhone?: string;
}

export interface FindMetricsPeriodParams {
  /** ISO-дата, включительно. Не задано — без нижней границы. */
  from?: string;
  /** ISO-дата, включительно. Не задано — без верхней границы. */
  to?: string;
}

export interface MetricsUsers {
  newInPeriod: number;
  totalUsers: number;
}

export interface MetricsOrdersByStatus {
  status: OrderStatus;
  count: number;
  /** В тиинах (1 сум = 100 тиинов). */
  total: number;
}

export interface MetricsOrders {
  orderCount: number;
  /** В тиинах (1 сум = 100 тиинов). Исключает CANCELLED. */
  revenue: number;
  /** Маржа платформы: revenue − выплаты продавцам. В тиинах, исключает CANCELLED. */
  margin: number;
  /** В тиинах (1 сум = 100 тиинов). */
  averageOrderValue: number;
  byStatus: MetricsOrdersByStatus[];
}

export interface MetricsCatalog {
  activeSellers: number;
  listingCount: number;
  catalogItemCount: number;
  pendingCategories: number;
  pendingCatalogItems: number;
}

export interface MetricsOverview {
  today: {
    newUsers: number;
    orderCount: number;
    /** В тиинах (1 сум = 100 тиинов). */
    revenue: number;
    /** Маржа платформы, в тиинах. */
    margin: number;
  };
  allTime: {
    totalUsers: number;
    totalOrders: number;
    /** В тиинах (1 сум = 100 тиинов). */
    totalRevenue: number;
    /** Маржа платформы, в тиинах. */
    totalMargin: number;
    activeSellers: number;
    pendingCategories: number;
    pendingCatalogItems: number;
  };
}

/** Текст сразу всеми языками — как хранит бэкенд (`LocalizedText`). RU обязателен, пустые UZ/EN не приходят. */
export type LocalizedText = Partial<Record<Locale, string>> & { RU: string };

export type BroadcastAudience = 'ALL' | 'SELECTED';
export type BroadcastStatus = 'SENDING' | 'DONE' | 'FAILED';

export interface Broadcast {
  id: string;
  createdBy: { id: string; name: string | null; email: string | null };
  title: LocalizedText;
  /** HTML из rich-text редактора. */
  body: LocalizedText;
  buttonText: LocalizedText | null;
  buttonUrl: string | null;
  sendPush: boolean;
  sendTelegram: boolean;
  audience: BroadcastAudience;
  recipientIds: string[];
  status: BroadcastStatus;
  /** Строк в ленте = покупателей на момент отправки. */
  recipientsCount: number;
  /** Push считается по установкам, а не по людям. */
  pushSent: number;
  pushFailed: number;
  tgSent: number;
  tgFailed: number;
  /** Юзер заблокировал бота. */
  tgBlocked: number;
  createdAt: string;
  finishedAt: string | null;
}

export interface BroadcastAudiencePayload {
  audience: BroadcastAudience;
  recipientIds?: string[];
}

export interface BroadcastAudienceCount {
  total: number;
  withPush: number;
  withTelegram: number;
}

export interface CreateBroadcastPayload extends BroadcastAudiencePayload {
  title: LocalizedText;
  body: LocalizedText;
  sendPush: boolean;
  sendTelegram: boolean;
  buttonText?: LocalizedText;
  buttonUrl?: string;
}

export interface Customer {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  telegramId: string | null;
  locale: Locale | null;
  createdAt: string;
}

export interface FindCustomersParams extends CursorPageParams {
  search?: string;
}

/** День `YYYY-MM-DD`: даты акций и правил цены — с точностью до дня, граница — 00:00 по Ташкенту. */
export type BusinessDay = string;

export type PromotionState = 'active' | 'scheduled' | 'ended' | 'disabled';

/** Акция для покупателя. Скидки — в bps (2000 = −20%). Только SUPER_ADMIN. */
export interface Promotion {
  id: string;
  /** RU — для таблиц. */
  title: string;
  translations: Translation<{ title: string; description: string | null }>[];
  discountBps: number;
  enabled: boolean;
  /** Первый день; `null` — сразу. */
  startDate: BusinessDay | null;
  /** Последний день включительно; `null` — бессрочно. */
  endDate: BusinessDay | null;
  state: PromotionState;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionItem {
  listingId: string;
  /** Своя скидка листинга, bps; `null` — скидка акции. */
  discountBps: number | null;
  listing: {
    id: string;
    name: string;
    sellerName: string;
    costPrice: string;
    price: string;
    oldPrice: string | null;
    /** Сейчас цена листинга посчитана по этой акции. */
    appliedHere: boolean;
    stock: number;
    status: ListingStatus;
  };
}

export interface PromotionDetail extends Promotion {
  items: PromotionItem[];
}

export interface PromotionPayload {
  /** RU обязателен, остальные локали опциональны — пусто = не переведено. */
  translations: { locale: Locale; title?: string; description?: string | null }[];
  discountBps: number;
  enabled: boolean;
  startDate: BusinessDay | null;
  endDate: BusinessDay | null;
  /** Заменяет состав акции целиком. */
  items: { listingId: string; discountBps: number | null }[];
}

export interface FindPromotionsParams extends CursorPageParams {
  search?: string;
  state?: PromotionState;
}

export type PriceRuleAction = 'MARKUP_PERCENT' | 'DISCOUNT_PERCENT' | 'FIXED_PRICE';

/** Скрытое правило цены — покупатель его не видит. Только SUPER_ADMIN. */
export interface PriceRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  action: PriceRuleAction;
  /** bps для *_PERCENT, тийины для FIXED_PRICE. */
  value: number;
  sellerId: string | null;
  seller: { id: string; name: string } | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  catalogItemId: string | null;
  catalogItem: { id: string; name: string } | null;
  listingId: string | null;
  listing: { id: string; name: string } | null;
  startDate: BusinessDay | null;
  endDate: BusinessDay | null;
  minStock: number | null;
  maxStock: number | null;
  /** Сколько листингов сейчас получили цену по правилу. */
  appliedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PriceRulePayload {
  name: string;
  enabled: boolean;
  priority: number;
  action: PriceRuleAction;
  value: number;
  sellerId: string | null;
  categoryId: string | null;
  catalogItemId: string | null;
  listingId: string | null;
  startDate: BusinessDay | null;
  endDate: BusinessDay | null;
  minStock: number | null;
  maxStock: number | null;
}

export interface FindPriceRulesParams extends CursorPageParams {
  search?: string;
}
