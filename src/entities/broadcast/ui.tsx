import { Tag, type TagProps } from 'antd';

import type { Broadcast } from '@/shared/api';

import { statusOptions } from './config';

export const StatusTag: React.FC<{ status: Broadcast['status'] }> = ({ status }) => {
  return <Tag color={COLOR_BY_STATUS[status]}>{statusOptions[status]}</Tag>;
};

const COLOR_BY_STATUS: Record<Broadcast['status'], TagProps['color']> = {
  SENDING: 'processing',
  DONE: 'green',
  FAILED: 'red',
};
