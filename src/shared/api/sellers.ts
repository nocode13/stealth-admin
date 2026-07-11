import { base } from './instances';
import type { CursorPage, CursorPageParams, Seller } from './types';

export const sellers = {
  findAll: (params?: CursorPageParams) => base.get<CursorPage<Seller>>('/sellers', { params }),
};
