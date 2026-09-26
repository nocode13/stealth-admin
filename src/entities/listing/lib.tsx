import { Flex, Tag, Typography, type TableProps } from 'antd';

import type { Listing } from '@/shared/api/types';
import { formatPrice } from '@/shared/lib/format';

/**
 * Колонки цены листинга. Себестоимость видят все. Розница и наценка приходят с
 * бэкенда только SUPER_ADMIN, поэтому `showRetail` — это просто «роль SUPER_ADMIN»:
 * продавец наценку платформы не видит.
 */
export const getPriceColumns = (showRetail: boolean): NonNullable<TableProps<Listing>['columns']> => [
  {
    title: 'Себестоимость',
    key: 'costPrice',
    render: (_, item) => formatPrice(item.costPrice),
  },
  ...(showRetail
    ? [
        {
          title: 'Цена',
          key: 'price',
          render: (_: unknown, item: Listing) => {
            if (item.price === undefined) return '—';
            if (!item.promotion || !item.oldPrice) return formatPrice(item.price);
            // На акции: цена со скидкой, зачёркнутая обычная и название акции.
            return (
              <Flex vertical gap={2}>
                <span>
                  {formatPrice(item.price)}{' '}
                  <Typography.Text delete type="secondary">
                    {formatPrice(item.oldPrice)}
                  </Typography.Text>
                </span>
                <Tag color="red" style={{ width: 'fit-content' }}>
                  {item.promotion.title}
                </Tag>
              </Flex>
            );
          },
        },
        {
          title: 'Наценка',
          key: 'markup',
          render: (_: unknown, item: Listing) => {
            if (item.price === undefined) return '—';
            const cost = Number(item.costPrice);
            const markup = Number(item.price) - cost;
            const percent = cost > 0 ? ` (${Math.round((markup / cost) * 100)}%)` : '';
            return `${formatPrice(String(markup))}${percent}`;
          },
        },
      ]
    : []),
];
