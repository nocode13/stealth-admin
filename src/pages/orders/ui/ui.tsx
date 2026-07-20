/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { Button, Flex, Segmented, Table, Typography, type TableProps } from 'antd';
import { useUnit } from 'effector-react';

import { ChangeOrderStatus } from '@/features/order/change-status';
import { ORDER_STATUS_LABELS, StatusTag, formatMoney, type Order } from '@/entities/order';
import { userModel } from '@/entities/user';
import { routes } from '@/shared/config/routing';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { formatDate } from '@/shared/lib/format';
import { withTitle } from '@/shared/ui/with-title';

import { factory, type StatusFilter } from '../model';

type Model = ReturnType<typeof factory>;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Все' },
  { value: 'NEW', label: ORDER_STATUS_LABELS.NEW },
  { value: 'CONFIRMED', label: ORDER_STATUS_LABELS.CONFIRMED },
  { value: 'ASSEMBLING', label: ORDER_STATUS_LABELS.ASSEMBLING },
  { value: 'DELIVERING', label: ORDER_STATUS_LABELS.DELIVERING },
  { value: 'ARRIVED', label: ORDER_STATUS_LABELS.ARRIVED },
  { value: 'DELIVERED', label: ORDER_STATUS_LABELS.DELIVERED },
  { value: 'CANCELLED', label: ORDER_STATUS_LABELS.CANCELLED },
];

const Page = ({ model }: LazyPageProps<Model>) => {
  const [orders, nextCursor, pending, status] = useUnit([
    model.$orders,
    model.$nextCursor,
    model.$pending,
    model.$status,
  ]);
  const columns = useColumns();

  return (
    <Flex vertical gap="middle" style={{ width: '100%' }}>
      <Segmented
        value={status}
        options={FILTER_OPTIONS}
        onChange={(value) => model.statusChanged(value as StatusFilter)}
      />
      <Table
        rowKey="id"
        dataSource={orders}
        loading={pending}
        columns={columns}
        pagination={false}
        style={{ width: '100%' }}
        onRow={(order) => ({
          onClick: () => routes.orders.order.open({ id: order.id }),
          style: { cursor: 'pointer' },
        })}
      />
      {nextCursor !== null && (
        <Flex justify="center">
          <Button loading={pending} onClick={() => model.loadMoreClicked()}>
            Загрузить ещё
          </Button>
        </Flex>
      )}
      <ChangeOrderStatus.View />
    </Flex>
  );
};

const useColumns = (): TableProps<Order>['columns'] => {
  const [role] = useUnit([userModel.$role]);

  return [
    {
      title: '№',
      key: 'orderNumber',
      render: (_, order) => <Typography.Text strong>#{order.orderNumber}</Typography.Text>,
      width: 90,
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_, order) => <StatusTag status={order.status} />,
    },
    {
      title: 'Получатель',
      key: 'contact',
      render: (_, order) => (
        <Flex vertical>
          <span>{order.contactName}</span>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {order.contactPhone}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Адрес',
      key: 'address',
      render: (_, order) => <Typography.Text style={{ fontSize: 12 }}>{order.deliveryAddress}</Typography.Text>,
    },
    // Продавец видит только свои заказы, колонка ему не нужна.
    ...(role === 'SUPER_ADMIN'
      ? [
          {
            title: 'Продавец',
            key: 'seller',
            render: (_: unknown, order: Order) => order.seller.name,
          },
        ]
      : []),
    {
      title: 'Сумма',
      key: 'total',
      render: (_, order) => `${formatMoney(order.total)} ${order.currency}`,
    },
    {
      title: 'Создан',
      key: 'createdAt',
      render: (_, order) => formatDate(order.createdAt),
    },
    {
      key: 'actions',
      render: (_, order) => (
        <Button
          size="small"
          onClick={(event) => {
            // Иначе сработает onRow и нас уведёт на детальную.
            event.stopPropagation();
            ChangeOrderStatus.model.triggered(order);
          }}
        >
          Статус
        </Button>
      ),
      width: 96,
    },
  ];
};

export const component = withTitle(Page, 'Заказы');
export const createModel = factory;
