import { base } from './instances';
import type { CatalogItem, CatalogItemPayload, CursorPage, FindCatalogParams } from './types';

export const catalog = {
  findAll: (params?: FindCatalogParams) => base.get<CursorPage<CatalogItem>>('/catalog', { params }),
  create: (payload: CatalogItemPayload) => base.post<CatalogItem>('/catalog', payload).then((r) => r.data),
  update: (id: string, payload: Partial<CatalogItemPayload>) =>
    base.patch<CatalogItem>(`/catalog/${id}`, payload).then((r) => r.data),
  remove: (id: string) => base.delete<void>(`/catalog/${id}`).then((r) => r.data),
  addImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    // Content-Type сбрасываем, чтобы браузер сам проставил multipart boundary —
    // инстанс `base` задаёт 'application/json' по умолчанию для всех запросов.
    return base
      .post<CatalogItem>(`/catalog/${id}/images`, formData, { headers: { 'Content-Type': undefined } })
      .then((r) => r.data);
  },
  removeImage: (id: string, imageId: string) =>
    base.delete<CatalogItem>(`/catalog/${id}/images/${imageId}`).then((r) => r.data),
  reorderImage: (id: string, imageId: string, direction: 'up' | 'down') =>
    base.patch<CatalogItem>(`/catalog/${id}/images/${imageId}/reorder`, { direction }).then((r) => r.data),
};
