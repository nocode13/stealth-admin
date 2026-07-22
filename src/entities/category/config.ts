import type { SelectProps } from 'antd';

import type { Category } from '@/shared/api';

export const statusOptions: Record<Category['status'], string> = {
  PENDING: 'ожидание',
  APPROVED: 'одобрен',
  REJECTED: 'отклонен',
};

export const useStatusOptions = (): SelectProps['options'] => {
  return Object.entries(statusOptions).map(([value, label]) => ({ label, value }));
};
