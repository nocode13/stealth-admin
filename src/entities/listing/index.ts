import type { Listing } from '@/shared/api/types';

export { type Listing } from '@/shared/api/types';

export const STATUS_LABELS: Record<Listing['status'], string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активна',
  ARCHIVED: 'В архиве',
};
