import { base } from './instances';
import type {
  CatalogItem,
  CatalogItemPayload,
  CursorPage,
  CursorPageParams,
  UpdateCatalogItemStatusPayload,
} from './types';

export const catalog = {
  findAll: (params?: CursorPageParams) => base.get<CursorPage<CatalogItem>>('/catalog', { params }),
  create: (payload: CatalogItemPayload) => base.post<CatalogItem>('/catalog', payload).then((r) => r.data),
  update: (id: string, payload: Partial<CatalogItemPayload>) =>
    base.patch<CatalogItem>(`/catalog/${id}`, payload).then((r) => r.data),
  remove: (id: string) => base.delete<void>(`/catalog/${id}`).then((r) => r.data),
  updateStatus: (id: string, payload: UpdateCatalogItemStatusPayload) =>
    base.patch<CatalogItem>(`/catalog/${id}/status`, payload).then((r) => r.data),
  uploadImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    // Content-Type сбрасываем, чтобы браузер сам проставил multipart boundary —
    // инстанс `base` задаёт 'application/json' по умолчанию для всех запросов.
    return base
      .post<CatalogItem>(`/catalog/${id}/image`, formData, { headers: { 'Content-Type': undefined } })
      .then((r) => r.data);
  },
};
