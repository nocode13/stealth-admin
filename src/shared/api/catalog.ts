import { base } from './instances';
import type { CatalogItem, CursorPage, CursorPageParams } from './types';

export const catalog = {
  findAll: (params?: CursorPageParams) => base.get<CursorPage<CatalogItem>>('/catalog', { params }),
};
