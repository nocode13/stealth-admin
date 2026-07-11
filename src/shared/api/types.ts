export type Role = 'SUPER_ADMIN' | 'SELLER' | 'CUSTOMER';

export interface User {
  id: string;
  phone: string;
  email: string;
  role: Role;
  sellerId: string | null;
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

export type Listing = {
  id: string;
  sellerId: string;
  catalogItemId: string;
  catalogItem: CatalogItem;
  price: string;
  currency: string;
  stock: number;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
};

export type Seller = {
  id: string;
  name: string;
  status: SellerStatus;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
};
