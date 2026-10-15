import { Flex, Tag, Typography, type TagProps } from 'antd';

import type { CatalogItem } from '@/shared/api';

import { statusOptions } from './config';

export const StatusTag: React.FC<{ status: CatalogItem['status'] }> = ({ status }) => {
  return <Tag color={COLOR_BY_STATUS[status]}>{statusOptions[status]}</Tag>;
};
const COLOR_BY_STATUS: Record<CatalogItem['status'], TagProps['color']> = {
  PENDING: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
};

/** «Категория / Подкатегория» позиции каталога для таблиц; подкатегории может не быть. */
export const CategoryPath: React.FC<{ item: Pick<CatalogItem, 'category' | 'subcategory'> }> = ({ item }) => (
  <Flex vertical>
    <span>{item.category.name}</span>
    {item.subcategory && (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {item.subcategory.name}
      </Typography.Text>
    )}
  </Flex>
);
