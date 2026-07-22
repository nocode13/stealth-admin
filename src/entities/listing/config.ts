import type { SelectProps } from 'antd';

import type { Listing } from '@/shared/api';

// Без перевода — показываем сырое значение enum как есть.
export const statusOptions: Record<Listing['status'], string> = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
};

export const useStatusOptions = (): SelectProps['options'] => {
  return Object.entries(statusOptions).map(([value, label]) => ({ label, value }));
};
