import { Tag, type TagProps } from 'antd';

import type { Category } from '@/shared/api';

import { statusOptions } from './config';

export const StatusTag: React.FC<{ status: Category['status'] }> = ({ status }) => {
  return <Tag color={COLOR_BY_STATUS[status]}>{statusOptions[status]}</Tag>;
};

const COLOR_BY_STATUS: Record<Category['status'], TagProps['color']> = {
  PENDING: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
};
