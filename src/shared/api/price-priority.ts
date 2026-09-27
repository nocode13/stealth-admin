import { base } from './instances';
import type { PriceSource } from './types';

export const pricePriority = {
  get: () => base.get<PriceSource[]>('/price-priorities').then((r) => r.data),
  update: (order: PriceSource[]) => base.put<PriceSource[]>('/price-priorities', { order }).then((r) => r.data),
};
