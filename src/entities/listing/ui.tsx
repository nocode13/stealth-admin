import { Tag, type TagProps } from 'antd';

import type { Listing } from '@/shared/api';

import { statusOptions } from './config';

export const StatusTag: React.FC<{ status: Listing['status'] }> = ({ status }) => {
  return <Tag color={COLOR_BY_STATUS[status]}>{statusOptions[status]}</Tag>;
};
const COLOR_BY_STATUS: Record<Listing['status'], TagProps['color']> = {
  DRAFT: 'default',
  ACTIVE: 'green',
  ARCHIVED: 'default',
};
