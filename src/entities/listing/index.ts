import { statusOptions, useStatusOptions } from './config';

export { ListingTitle, StatusTag } from './ui';
export { getPriceColumns } from './lib';
export { formatVariant } from './variant';
export { type Listing } from '@/shared/api/types';

export const listingConfig = {
  statusOptions,
  useStatusOptions,
};
