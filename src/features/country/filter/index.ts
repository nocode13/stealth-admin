import { $filters, filtersChanged } from './model';
import { View } from './ui';

export const CountryFilters = {
  View,
  model: {
    $filters,
    filtersChanged,
  },
};
