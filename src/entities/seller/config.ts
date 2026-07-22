import type { SelectProps } from 'antd';

import type { Seller } from '@/shared/api';

export const statusOptions: Record<Seller['status'], string> = {
  PENDING: 'ожидание',
  ACTIVE: 'активен',
  SUSPENDED: 'заблокирован',
};

export const useStatusOptions = (): SelectProps['options'] => {
  return Object.entries(statusOptions).map(([value, label]) => ({ label, value }));
};
