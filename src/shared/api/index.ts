import { auth } from './auth';
import { catalog } from './catalog';
import { category } from './category';
import { listing } from './listing';
import { sellers } from './sellers';

export type {
  CatalogItem,
  Category,
  CategoryPayload,
  CursorPage,
  Listing,
  ListingStatus,
  LoginPayload,
  ReviewStatus,
  Role,
  Seller,
  SellerStatus,
  User,
} from './types';
export { getApiErrorMessage } from './error';
export { base } from './instances';

export const api = { auth, category, catalog, listing, sellers };
