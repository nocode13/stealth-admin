/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { Button, Flex, Segmented, Table, Typography, type TableProps } from 'antd';
import { useUnit } from 'effector-react';

import { GroupStatusTag, ORDER_GROUP_STATUS_LABELS, formatMoney, type OrderGroup } from '@/entities/order';
import { userModel } from '@/entities/user';
import { routes } from '@/shared/config/routing';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { formatDate } from '@/shared/lib/format';
import { withTitle } from '@/shared/ui/with-title';

import { factory, type StatusFilter } from '../model';

type Model = ReturnType<typeof factory>;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Все' },
  { value: 'NEW', label: ORDER_GROUP_STATUS_LABELS.NEW },
  { value: 'CONFIRMED', label: ORDER_GROUP_STATUS_LABELS.CONFIRMED },
  { value: 'ASSEMBLING', label: ORDER_GROUP_STATUS_LABELS.ASSEMBLING },
  { value: 'DELIVERING', label: ORDER_GROUP_STATUS_LABELS.DELIVERING },
  { value: 'ARRIVED', label: ORDER_GROUP_STATUS_LABELS.ARRIVED },
  { value: 'PARTIALLY_DELIVERED', label: ORDER_GROUP_STATUS_LABELS.PARTIALLY_DELIVERED },
  { value: 'DELIVERED', label: ORDER_GROUP_STATUS_LABELS.DELIVERED },
  { value: 'CANCELLED', label: ORDER_GROUP_STATUS_LABELS.CANCELLED },
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
        onRow={(group) => ({
          onClick: () => routes.orders.order.open({ id: group.id }),
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
    </Flex>
  );
};

const useColumns = (): TableProps<OrderGroup>['columns'] => {
  const [role] = useUnit([userModel.$role]);

  return [
    {
      title: '№',
      key: 'groupNumber',
      render: (_, group) => <Typography.Text strong>№{group.groupNumber}</Typography.Text>,
      width: 90,
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_, group) => <GroupStatusTag status={group.status} />,
    },
    {
      title: 'Получатель',
      key: 'contact',
      render: (_, group) => (
        <Flex vertical>
          <span>{group.contactName}</span>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {group.contactPhone}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Адрес',
      key: 'address',
      render: (_, group) => <Typography.Text style={{ fontSize: 12 }}>{group.deliveryAddress}</Typography.Text>,
    },
    // Продавец видит только свои заказы в каждой группе, колонка ему не нужна.
    ...(role === 'SUPER_ADMIN'
      ? [
          {
            title: 'Продавцы',
            key: 'sellers',
            render: (_: unknown, group: OrderGroup) => group.orders.map((order) => order.seller.name).join(', '),
          },
        ]
      : []),
    {
      title: 'Сумма',
      key: 'total',
      render: (_, group) => formatMoney(group.total),
    },
    {
      title: 'Создан',
      key: 'createdAt',
      render: (_, group) => formatDate(group.createdAt),
    },
  ];
};

export const component = withTitle(Page, 'Заказы');
export const createModel = factory;
