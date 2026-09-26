import { base } from './instances';
import type { CursorPage, FindPriceRulesParams, PriceRule, PriceRulePayload } from './types';

export const priceRule = {
  findAll: (params?: FindPriceRulesParams) => base.get<CursorPage<PriceRule>>('/price-rules', { params }),
  findOne: (id: string) => base.get<PriceRule>(`/price-rules/${id}`).then((r) => r.data),
  create: (payload: PriceRulePayload) => base.post<PriceRule>('/price-rules', payload).then((r) => r.data),
  update: (id: string, payload: Partial<PriceRulePayload>) =>
    base.patch<PriceRule>(`/price-rules/${id}`, payload).then((r) => r.data),
  remove: (id: string) => base.delete<void>(`/price-rules/${id}`).then((r) => r.data),
};
