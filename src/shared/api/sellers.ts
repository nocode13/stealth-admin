import { base } from './instances';
import type { CreateSellerPayload, CursorPage, FindSellersParams, Seller, UpdateSellerPayload } from './types';

export const sellers = {
  findAll: (params?: FindSellersParams) => base.get<CursorPage<Seller>>('/sellers', { params }),
  findOne: (id: string) => base.get<Seller>(`/sellers/${id}`).then((r) => r.data),
  create: (payload: CreateSellerPayload) => base.post<Seller>('/sellers', payload).then((r) => r.data),
  update: (id: string, payload: UpdateSellerPayload) =>
    base.patch<Seller>(`/sellers/${id}`, payload).then((r) => r.data),
  uploadBanner: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    // Content-Type сбрасываем, чтобы браузер сам проставил multipart boundary —
    // инстанс `base` задаёт 'application/json' по умолчанию для всех запросов.
    return base
      .post<Seller>(`/sellers/${id}/image`, formData, { headers: { 'Content-Type': undefined } })
      .then((r) => r.data);
  },
};
