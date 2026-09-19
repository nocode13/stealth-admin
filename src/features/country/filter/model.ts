import { combine, createEvent } from 'effector';

import { textFactory } from '@/shared/lib/text-factory';

export const reset = createEvent();

export const searchModel = textFactory({ reset });

export const filtersChanged = searchModel.debouncedChanged;

export const $filters = combine({
  search: searchModel.$value,
});
