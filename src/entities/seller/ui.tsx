import { Tag, type TagProps } from 'antd';

import type { Seller } from '@/shared/api';

export const StatusTag: React.FC<{ status: Seller['status'] }> = ({ status }) => {
  return <Tag color={COLOR_BY_STATUS[status]}>{status.toLowerCase()}</Tag>;
};
const COLOR_BY_STATUS: Record<Seller['status'], TagProps['color']> = {
  PENDING: 'blue',
  ACTIVE: 'green',
  SUSPENDED: 'red',
};
