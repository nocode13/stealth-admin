import { combine, createEvent, merge } from 'effector';

import type { PromotionState } from '@/entities/promotion';
import { optionsFactory } from '@/shared/lib/options-factory';
import { textFactory } from '@/shared/lib/text-factory';

export const reset = createEvent();

export const searchModel = textFactory({ reset });
export const stateModel = optionsFactory<PromotionState>({ reset });

export const filtersChanged = merge([searchModel.debouncedChanged, stateModel.changed]);

export const $filters = combine({
  search: searchModel.$value,
  state: stateModel.$value,
});
