import type { SelectProps } from 'antd';

import type { CatalogItem } from '@/shared/api';

export const statusOptions: Record<CatalogItem['status'], string> = {
  PENDING: 'ожидание',
  APPROVED: 'одобрен',
  REJECTED: 'отклонен',
};

export const useStatusOptions = (): SelectProps['options'] => {
  return Object.entries(statusOptions).map(([value, label]) => ({ label, value }));
};
