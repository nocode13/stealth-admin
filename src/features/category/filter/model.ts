import { combine, createEvent, merge } from 'effector';

import type { Category } from '@/entities/category';
import { textFactory } from '@/shared/lib/text-factory';
import { optionsFactory } from '@/shared/lib/options-factory';

export const reset = createEvent();

export const searchModel = textFactory({ reset });
export const statusModel = optionsFactory<Category['status']>({ reset });

export const filtersChanged = merge([searchModel.debouncedChanged, statusModel.changed]);

export const $filters = combine({
  search: searchModel.$value,
  status: statusModel.$value,
});
