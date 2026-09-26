import type { PromotionState } from '@/shared/api';

export const stateOptions: Record<PromotionState, string> = {
  active: 'идёт',
  scheduled: 'запланирована',
  ended: 'закончилась',
  disabled: 'выключена',
};
