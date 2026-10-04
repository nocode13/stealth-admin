import { base } from './instances';
import type { CursorPage, FindListingsParams, Listing, ListingPayload } from './types';

export const listing = {
  findAll: (params?: FindListingsParams) => base.get<CursorPage<Listing>>('/listings', { params }),
  /** Нужен для «Обновить» в галерее варианта, пока видео обрабатывается на бэкенде. */
  findOne: (id: string) => base.get<Listing>(`/listings/${id}`).then((r) => r.data),
  create: (payload: ListingPayload) => base.post<Listing>('/listings', payload).then((r) => r.data),
  update: (id: string, payload: Partial<ListingPayload>) =>
    base.patch<Listing>(`/listings/${id}`, payload).then((r) => r.data),
  remove: (id: string) => base.delete<void>(`/listings/${id}`).then((r) => r.data),
  /** Своя галерея варианта — тот же пайплайн, что у каталога (фото и видео одним роутом). */
  addMedia: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    // Content-Type сбрасываем, чтобы браузер сам проставил multipart boundary.
    return base
      .post<Listing>(`/listings/${id}/media`, formData, { headers: { 'Content-Type': undefined } })
      .then((r) => r.data);
  },
  removeMedia: (id: string, mediaId: string) =>
    base.delete<Listing>(`/listings/${id}/media/${mediaId}`).then((r) => r.data),
  reorderMedia: (id: string, mediaId: string, direction: 'up' | 'down') =>
    base.patch<Listing>(`/listings/${id}/media/${mediaId}/reorder`, { direction }).then((r) => r.data),
};
