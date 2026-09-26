import { stateOptions } from './config';

export { StateTag } from './ui';
export { bpsToPercent, percentToBps, formatDay, formatPeriod } from './lib';
export { type Promotion, type PromotionDetail, type PromotionItem, type PromotionState } from '@/shared/api/types';

export const promotionConfig = {
  stateOptions,
};
