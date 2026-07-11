import { base } from './instances';
import type { CursorPage, CursorPageParams, Listing } from './types';

export const listing = {
  findAll: (params?: CursorPageParams) => base.get<CursorPage<Listing>>('/listings', { params }),
};
