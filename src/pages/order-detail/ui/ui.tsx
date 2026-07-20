/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { Button, Card, Descriptions, Flex, Spin, Steps, Table, Typography, type TableProps } from 'antd';
import { useUnit } from 'effector-react';

import { ChangeOrderStatus } from '@/features/order/change-status';
import { ORDER_STATUS_LABELS, StatusTag, formatMoney, routeUrl, type OrderItem } from '@/entities/order';
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
  const [order, pending] = useUnit([model.$order, model.$pending]);

  if (pending && !order) return <Spin />;
  if (!order) return <Typography.Text type="secondary">Заказ не найден</Typography.Text>;

  return (
    <Flex vertical gap="middle" style={{ width: '100%' }}>
      <Flex justify="space-between" align="center">
        <Flex align="center" gap="small">
          <Typography.Title level={3} style={{ margin: 0 }}>
            Заказ #{order.orderNumber}
          </Typography.Title>
          <StatusTag status={order.status} />
        </Flex>
        <Flex gap="small">
          <Button onClick={() => routes.orders.root.open()}>К списку</Button>
          <Button type="primary" onClick={() => ChangeOrderStatus.model.triggered(order)}>
            Сменить статус
          </Button>
        </Flex>
      </Flex>

      <Card title="Доставка" size="small">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Получатель">{order.contactName}</Descriptions.Item>
          <Descriptions.Item label="Телефон">{order.contactPhone}</Descriptions.Item>
          <Descriptions.Item label="Адрес" span={2}>
            {order.deliveryAddress}
          </Descriptions.Item>
          {!!order.deliveryComment && (
            <Descriptions.Item label="Комментарий" span={2}>
              {order.deliveryComment}
            </Descriptions.Item>
          )}
          {order.deliveryLat != null && order.deliveryLng != null && (
            <Descriptions.Item label="Геопозиция" span={2}>
              {/* Ссылка сразу на МАРШРУТ — курьер жмёт и едет, карт-SDK не нужен. */}
              <Typography.Link href={routeUrl(order.deliveryLat, order.deliveryLng)} target="_blank" rel="noreferrer">
                Построить маршрут в Яндекс.Картах
              </Typography.Link>
            </Descriptions.Item>
          )}
          {!!order.courierName && (
            <Descriptions.Item label="Курьер" span={2}>
              {order.courierName}
              {order.courierPhone ? ` · ${order.courierPhone}` : ''}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="Состав" size="small">
        <Table rowKey="id" dataSource={order.items} columns={ITEM_COLUMNS} pagination={false} size="small" />
        <Flex justify="flex-end" style={{ marginTop: 12 }}>
          <Typography.Text strong>
            Итого: {formatMoney(order.total)} {order.currency} · наличными курьеру
          </Typography.Text>
        </Flex>
      </Card>

      <Card title="История статусов" size="small">
        <Steps
          direction="vertical"
          size="small"
          current={order.history.length - 1}
          items={order.history.map((entry) => ({
            title: ORDER_STATUS_LABELS[entry.status],
            description: [formatDate(entry.createdAt), entry.comment].filter(Boolean).join(' · '),
          }))}
        />
      </Card>

      {!!order.cancelReason && <Typography.Text type="secondary">Причина отмены: {order.cancelReason}</Typography.Text>}

      <ChangeOrderStatus.View />
    </Flex>
  );
};

export const component = withTitle(Page, 'Заказ');
export const createModel = factory;
