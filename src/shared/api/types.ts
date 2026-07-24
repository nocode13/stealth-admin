export type Role = 'SUPER_ADMIN' | 'SELLER' | 'CUSTOMER';

export interface User {
  id: string;
  phone: string;
  email: string;
  role: Role;
  sellerId: string | null;
  /** Привязанный Telegram. Пока null — заказы продавцу в бота не приходят. */
  telegramId: string | null;
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

export type CatalogItem = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  category: Category;
  description: string | null;
  imageUrl: string | null;
  unit: string;
  sellerId: string | null;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
};

export interface CatalogItemPayload {
  name: string;
  slug: string;
  categoryId: string;
  description?: string;
  unit?: string;
  status?: ReviewStatus;
}

export interface FindCatalogParams extends CursorPageParams {
  search?: string;
  categoryId?: string;
  status?: ReviewStatus;
  /** Только для SUPER_ADMIN — SELLER скоупится по видимости на бэкенде. */
  sellerId?: string;
}

export type Listing = {
  id: string;
  sellerId: string;
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

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'ASSEMBLING'
  | 'DELIVERING'
  /** Курьер на месте — покупателю в этот момент уходит сообщение в боте. */
  | 'ARRIVED'
  | 'DELIVERED'
  | 'CANCELLED';

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
  changedByUserId: string | null;
  createdAt: string;
}

/** Заказ — всегда на одного продавца; общий checkout связывает groupId. */
export interface Order {
  id: string;
  groupId: string;
  orderNumber: number;
  userId: string;
  sellerId: string;
  seller: { id: string; name: string };
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  itemsTotal: string;
  deliveryFee: string;
  total: string;
  contactName: string;
  contactPhone: string;
  deliveryAddress: string;
  deliveryComment: string | null;
  /** Координаты из Telegram-локации: по ним строится ссылка «Маршрут». */
  deliveryLat: number | null;
  deliveryLng: number | null;
  courierName: string | null;
  courierPhone: string | null;
  cancelReason: string | null;
  items: OrderItem[];
  history: OrderStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  deliveredAt: string | null;
}

export interface FindOrdersParams extends CursorPageParams {
  status?: OrderStatus;
  /** Номер заказа, телефон или имя получателя. */
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
