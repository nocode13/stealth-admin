import { base } from './instances';
import type { CursorPage, FindListingsParams, Listing, ListingPayload } from './types';

export const listing = {
  findAll: (params?: FindListingsParams) => base.get<CursorPage<Listing>>('/listings', { params }),
  create: (payload: ListingPayload) => base.post<Listing>('/listings', payload).then((r) => r.data),
  update: (id: string, payload: Partial<ListingPayload>) =>
    base.patch<Listing>(`/listings/${id}`, payload).then((r) => r.data),
  remove: (id: string) => base.delete<void>(`/listings/${id}`).then((r) => r.data),
};
