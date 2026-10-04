import { Flex, Tag, Typography, type TagProps } from 'antd';

import type { Listing, ListingVariant } from '@/shared/api';

import { statusOptions } from './config';
import { formatVariant } from './variant';

/** Название позиции + подпись варианта серым под ним (если атрибуты заданы). */
export const ListingTitle: React.FC<{ name: string; variant: ListingVariant | null }> = ({ name, variant }) => {
  const label = formatVariant(variant);
  if (!label) return <>{name}</>;
  return (
    <Flex vertical gap={0}>
      <span>{name}</span>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {label}
      </Typography.Text>
    </Flex>
  );
};

export const StatusTag: React.FC<{ status: Listing['status'] }> = ({ status }) => {
  return <Tag color={COLOR_BY_STATUS[status]}>{statusOptions[status]}</Tag>;
};
const COLOR_BY_STATUS: Record<Listing['status'], TagProps['color']> = {
  DRAFT: 'default',
  ACTIVE: 'green',
  ARCHIVED: 'default',
};
