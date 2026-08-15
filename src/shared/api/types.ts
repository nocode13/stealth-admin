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

export type Category = {
  id: string;
  nameRu: string;
  nameUz: string | null;
  nameEn: string | null;
  nameKaa: string | null;
  sellerId: string | null;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
};

export interface CategoryPayload {
  nameRu: string;
  nameUz?: string;
  nameEn?: string;
  nameKaa?: string;
  status?: ReviewStatus;
}

export interface FindCategoriesParams extends CursorPageParams {
  search?: string;
  status?: ReviewStatus;
  /** Только для SUPER_ADMIN — SELLER скоупится по видимости на бэкенде. */
  sellerId?: string;
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
  name: string;
  categoryId: string | null;
  category: Category | null;
  description: string | null;
  /** Фото и видео одной галереей, сквозной порядок по sortOrder. */
  media: CatalogItemMedia[];
  unit: string;
  sellerId: string | null;
  status: ReviewStatus;
  /** Вайтлист бесплатной доставки — ставит только SUPER_ADMIN. */
  freeDelivery: boolean;
  createdAt: string;
  updatedAt: string;
};

export interface CatalogItemPayload {
  name: string;
  /** `null` в PATCH снимает категорию; `undefined` — не менять. */
  categoryId?: string | null;
  description?: string;
  unit?: string;
  status?: ReviewStatus;
  /** Только для SUPER_ADMIN — для остальных ролей молча игнорируется на бэкенде. */
  freeDelivery?: boolean;
}

export interface FindCatalogParams extends CursorPageParams {
  search?: string;
  categoryId?: string;
  /** Только позиции без категории; `categoryId` при этом игнорируется. */
  noCategory?: boolean;
  status?: ReviewStatus;
  /** Только для SUPER_ADMIN — SELLER скоупится по видимости на бэкенде. */
  sellerId?: string;
  /** Только позиции из вайтлиста бесплатной доставки. */
  freeDelivery?: boolean;
}

/** Платформенный тариф доставки — синглтон, правит только SUPER_ADMIN. */
export interface PlatformSettings {
  /** В тиинах (1 сум = 100 тиинов). */
  deliveryFee: number;
  /** В тиинах; `null` — бесплатной доставки по порогу нет. */
  freeDeliveryThreshold: number | null;
}

export interface UpdatePlatformSettingsPayload {
  deliveryFee?: number;
  freeDeliveryThreshold?: number | null;
}

export type Listing = {
  id: string;
  sellerId: string;
  seller?: Pick<Seller, 'id' | 'name'>;
  catalogItemId: string;
  catalogItem: CatalogItem;
  /** В тиинах (1 сум = 100 тиинов). */
  price: string;
  stock: number;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
};

export interface ListingPayload {
  catalogItemId: string;
  /** В тиинах (1 сум = 100 тиинов). */
  price: number;
  stock: number;
  status?: ListingStatus;
  /** Только для SUPER_ADMIN (он не привязан к продавцу) и только при создании. */
  sellerId?: string;
}

export interface FindListingsParams extends CursorPageParams {
  search?: string;
  categoryId?: string;
  status?: ListingStatus;
  /** В тиинах. */
  minPrice?: number;
  /** В тиинах. */
  maxPrice?: number;
  /** Только для SUPER_ADMIN — SELLER всегда скоупится своим продавцом. */
  sellerId?: string;
}

export type Seller = {
  id: string;
  name: string;
  description: string | null;
  bannerUrl: string | null;
  status: SellerStatus;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
};

export interface CreateSellerPayload {
  name: string;
  description?: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerPhone?: string;
}

export interface UpdateSellerPayload {
  name?: string;
  description?: string;
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
  price: string;
  quantity: number;
  total: string;
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
  /** Доля этого продавца. Доставка на заказ не раскладывается — она платформенная,
   * посчитана один раз и живёт в OrderGroup.deliveryFee/total. */
  itemsTotal: string;
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
  };
  allTime: {
    totalUsers: number;
    totalOrders: number;
    /** В тиинах (1 сум = 100 тиинов). */
    totalRevenue: number;
    activeSellers: number;
    pendingCategories: number;
    pendingCatalogItems: number;
  };
}
