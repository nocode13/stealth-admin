import { base } from './instances';
import type { CatalogItem, CatalogItemPayload, CursorPage, FindCatalogParams } from './types';

export const catalog = {
  findAll: (params?: FindCatalogParams) => base.get<CursorPage<CatalogItem>>('/catalog', { params }),
  /** Нужен для поллинга галереи, пока видео обрабатывается на бэкенде. */
  findOne: (id: string) => base.get<CatalogItem>(`/catalog/${id}`).then((r) => r.data),
  create: (payload: CatalogItemPayload) => base.post<CatalogItem>('/catalog', payload).then((r) => r.data),
  update: (id: string, payload: Partial<CatalogItemPayload>) =>
    base.patch<CatalogItem>(`/catalog/${id}`, payload).then((r) => r.data),
  remove: (id: string) => base.delete<void>(`/catalog/${id}`).then((r) => r.data),
  /** Один роут и для фото, и для видео — тип определяется на бэкенде по содержимому файла. */
  addMedia: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    // Content-Type сбрасываем, чтобы браузер сам проставил multipart boundary —
    // инстанс `base` задаёт 'application/json' по умолчанию для всех запросов.
    return base
      .post<CatalogItem>(`/catalog/${id}/media`, formData, { headers: { 'Content-Type': undefined } })
      .then((r) => r.data);
  },
  removeMedia: (id: string, mediaId: string) =>
    base.delete<CatalogItem>(`/catalog/${id}/media/${mediaId}`).then((r) => r.data),
  reorderMedia: (id: string, mediaId: string, direction: 'up' | 'down') =>
    base.patch<CatalogItem>(`/catalog/${id}/media/${mediaId}/reorder`, { direction }).then((r) => r.data),
};
