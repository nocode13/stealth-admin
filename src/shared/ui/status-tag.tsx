import { Tag } from 'antd';

const COLOR_BY_STATUS: Record<string, string> = {
  PENDING: 'gold',
  APPROVED: 'green',
  ACTIVE: 'green',
  REJECTED: 'red',
  SUSPENDED: 'red',
  DRAFT: 'default',
  ARCHIVED: 'default',
};

export const StatusTag = <Status extends string>({
  status,
  labels,
}: {
  status: Status;
  labels: Record<Status, string>;
}) => <Tag color={COLOR_BY_STATUS[status] ?? 'default'}>{labels[status]}</Tag>;
