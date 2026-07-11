import { Tag, type TagProps } from 'antd';

import type { CatalogItem } from '@/shared/api';

export const StatusTag: React.FC<{ status: CatalogItem['status'] }> = ({ status }) => {
  return <Tag color={COLOR_BY_STATUS[status]}>{status.toLowerCase()}</Tag>;
};
const COLOR_BY_STATUS: Record<CatalogItem['status'], TagProps['color']> = {
  PENDING: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
};
