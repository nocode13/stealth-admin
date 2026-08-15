/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { Button, Card, Descriptions, Flex, Spin, Steps, Table, Typography, type TableProps } from 'antd';
import { useUnit } from 'effector-react';

import { ChangeGroupStatus } from '@/features/order/change-group-status';
import { ChangeOrderStatus } from '@/features/order/change-status';
import {
  GroupStatusTag,
  ORDER_STATUS_LABELS,
  StatusTag,
  formatMoney,
  routeUrl,
  type Order,
  type OrderItem,
} from '@/entities/order';
import { userModel } from '@/entities/user';
import { routes } from '@/shared/config/routing';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { formatDate } from '@/shared/lib/format';
import { withTitle } from '@/shared/ui/with-title';

import { factory } from '../model';

type Model = ReturnType<typeof factory>;

const ITEM_COLUMNS: TableProps<OrderItem>['columns'] = [
  { title: 'Позиция', dataIndex: 'catalogItemName' },
  {
    title: 'Количество',
    key: 'quantity',
    render: (_, item) => `${item.quantity} ${item.unit}`,
  },
  { title: 'Цена', key: 'price', render: (_, item) => formatMoney(item.price) },
  { title: 'Сумма', key: 'total', render: (_, item) => formatMoney(item.total) },
];

const Page = ({ model }: LazyPageProps<Model>) => {
  const [group, pending, role] = useUnit([model.$order, model.$pending, userModel.$role]);

  if (pending && !group) return <Spin />;
  if (!group) return <Typography.Text type="secondary">Заказ не найден</Typography.Text>;

  const isSuperAdmin = role === 'SUPER_ADMIN';

  return (
    <Flex vertical gap="middle" style={{ width: '100%' }}>
      <Flex justify="space-between" align="center">
        <Flex align="center" gap="small">
          <Typography.Title level={3} style={{ margin: 0 }}>
            Заказ №{group.groupNumber}
          </Typography.Title>
          <GroupStatusTag status={group.status} />
          {isSuperAdmin && (
            <Button size="small" onClick={() => ChangeGroupStatus.model.triggered(group)}>
              Сменить статус группы
            </Button>
          )}
        </Flex>
        <Button onClick={() => routes.orders.root.open()}>К списку</Button>
      </Flex>

      <Card title="Доставка" size="small">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Получатель">{group.contactName}</Descriptions.Item>
          <Descriptions.Item label="Телефон">{group.contactPhone}</Descriptions.Item>
          <Descriptions.Item label="Адрес" span={2}>
            {group.deliveryAddress}
          </Descriptions.Item>
          {!!group.deliveryComment && (
            <Descriptions.Item label="Комментарий" span={2}>
              {group.deliveryComment}
            </Descriptions.Item>
          )}
          {group.deliveryLat != null && group.deliveryLng != null && (
            <Descriptions.Item label="Геопозиция" span={2}>
              {/* Ссылка сразу на МАРШРУТ — курьер жмёт и едет, карт-SDK не нужен. */}
              <Typography.Link href={routeUrl(group.deliveryLat, group.deliveryLng)} target="_blank" rel="noreferrer">
                Построить маршрут в Яндекс.Картах
              </Typography.Link>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="Оплата" size="small">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Товары">{formatMoney(group.itemsTotal)}</Descriptions.Item>
          {/* Продавцу бэкенд отдаёт 0 — платформенная логистика его не касается,
              но саму строку показываем только SUPER_ADMIN, чтобы не путать нулём. */}
          {isSuperAdmin && <Descriptions.Item label="Доставка">{formatMoney(group.deliveryFee)}</Descriptions.Item>}
          <Descriptions.Item label="Итого">
            <Typography.Text strong>{formatMoney(group.total)}</Typography.Text> · наличными курьеру
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {group.orders.map((order) => (
        <OrderCard key={order.id} order={order} isSuperAdmin={isSuperAdmin} />
      ))}

      <ChangeOrderStatus.View />
      <ChangeGroupStatus.View />
    </Flex>
  );
};

const OrderCard = ({ order, isSuperAdmin }: { order: Order; isSuperAdmin: boolean }) => (
  <Card
    size="small"
    title={
      <Flex align="center" gap="small">
        <span>
          Заказ #{order.orderNumber} · {order.seller.name}
        </span>
        <StatusTag status={order.status} />
      </Flex>
    }
    extra={
      isSuperAdmin ? (
        <Button size="small" onClick={() => ChangeOrderStatus.model.triggered(order)}>
          Сменить статус
        </Button>
      ) : undefined
    }
  >
    <Table rowKey="id" dataSource={order.items} columns={ITEM_COLUMNS} pagination={false} size="small" />
    <Flex justify="flex-end" style={{ marginTop: 12 }}>
      <Typography.Text strong>Товары: {formatMoney(order.itemsTotal)}</Typography.Text>
    </Flex>

    {!!order.courierName && (
      <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
        Курьер: {order.courierName}
        {order.courierPhone ? ` · ${order.courierPhone}` : ''}
      </Typography.Paragraph>
    )}
    {!!order.cancelReason && <Typography.Text type="secondary">Причина отмены: {order.cancelReason}</Typography.Text>}

    <Steps
      direction="vertical"
      size="small"
      style={{ marginTop: 12 }}
      current={order.history.length - 1}
      items={order.history.map((entry) => ({
        title: ORDER_STATUS_LABELS[entry.status],
        description: [formatDate(entry.createdAt), entry.comment].filter(Boolean).join(' · '),
      }))}
    />
  </Card>
);

export const component = withTitle(Page, 'Заказ');
export const createModel = factory;
