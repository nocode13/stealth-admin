import { base } from './instances';
import type { CursorPage, CursorPageParams, Seller, UpdateSellerStatusPayload } from './types';

export const sellers = {
  findAll: (params?: CursorPageParams) => base.get<CursorPage<Seller>>('/sellers', { params }),
  updateStatus: (id: string, payload: UpdateSellerStatusPayload) =>
    base.patch<Seller>(`/sellers/${id}/status`, payload).then((r) => r.data),
};
