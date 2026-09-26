import { base } from './instances';
import type { CursorPage, FindPromotionsParams, Promotion, PromotionDetail, PromotionPayload } from './types';

export const promotion = {
  findAll: (params?: FindPromotionsParams) => base.get<CursorPage<Promotion>>('/promotions', { params }),
  findOne: (id: string) => base.get<PromotionDetail>(`/promotions/${id}`).then((r) => r.data),
  create: (payload: PromotionPayload) => base.post<PromotionDetail>('/promotions', payload).then((r) => r.data),
  update: (id: string, payload: Partial<PromotionPayload>) =>
    base.patch<PromotionDetail>(`/promotions/${id}`, payload).then((r) => r.data),
  remove: (id: string) => base.delete<void>(`/promotions/${id}`).then((r) => r.data),
};
