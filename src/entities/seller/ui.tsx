import { Tag, type TagProps } from 'antd';

import type { Seller } from '@/shared/api';

import { statusOptions } from './config';

export const StatusTag: React.FC<{ status: Seller['status'] }> = ({ status }) => {
  return <Tag color={COLOR_BY_STATUS[status]}>{statusOptions[status]}</Tag>;
};
const COLOR_BY_STATUS: Record<Seller['status'], TagProps['color']> = {
  PENDING: 'blue',
  ACTIVE: 'green',
  SUSPENDED: 'red',
};
