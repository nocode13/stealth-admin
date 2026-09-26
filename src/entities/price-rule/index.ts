import type { PriceRuleAction } from '@/shared/api';

export { type PriceRule, type PriceRuleAction } from '@/shared/api/types';

export const actionOptions: Record<PriceRuleAction, string> = {
  MARKUP_PERCENT: 'Своя наценка, %',
  DISCOUNT_PERCENT: 'Скидка от розницы, %',
  FIXED_PRICE: 'Фиксированная цена, сум',
};

export const priceRuleConfig = {
  actionOptions,
};
