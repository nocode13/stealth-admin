/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { Card, DatePicker, Flex, Spin, Statistic, Table, Typography, type TableProps } from 'antd';
import { useUnit } from 'effector-react';

import { ORDER_STATUS_LABELS } from '@/entities/order';
import { formatAmount } from '@/shared/lib/currency/currency';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { withTitle } from '@/shared/ui/with-title';
import type { MetricsOrdersByStatus } from '@/shared/api';

import { factory, type Range } from '../model';

const { RangePicker } = DatePicker;

type Model = ReturnType<typeof factory>;

const STATUS_COLUMNS: TableProps<MetricsOrdersByStatus>['columns'] = [
  {
    title: 'Статус',
    dataIndex: 'status',
    render: (status: MetricsOrdersByStatus['status']) => ORDER_STATUS_LABELS[status],
  },
  { title: 'Заказов', dataIndex: 'count' },
  { title: 'Сумма', dataIndex: 'total', render: (total: number) => formatAmount(total) },
];

const Page = ({ model }: LazyPageProps<Model>) => {
  const [overview, catalog, users, orders, range, pending] = useUnit([
    model.$overview,
    model.$catalog,
    model.$users,
    model.$orders,
    model.$range,
    model.$pending,
  ]);

  if (pending && !overview) return <Spin />;

  return (
    <Flex vertical gap="middle" style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Сегодня
      </Typography.Title>
      <Flex gap="middle" wrap>
        <Card size="small" style={{ minWidth: 200 }}>
          <Statistic title="Новые пользователи" value={overview?.today.newUsers ?? 0} />
        </Card>
        <Card size="small" style={{ minWidth: 200 }}>
          <Statistic title="Заказы" value={overview?.today.orderCount ?? 0} />
        </Card>
        <Card size="small" style={{ minWidth: 200 }}>
          <Statistic title="Выручка" value={formatAmount(overview?.today.revenue ?? 0)} suffix="сум" />
        </Card>
      </Flex>

      <Typography.Title level={4} style={{ margin: 0 }}>
        Всего
      </Typography.Title>
      <Flex gap="middle" wrap>
        <Card size="small" style={{ minWidth: 200 }}>
          <Statistic title="Пользователей" value={overview?.allTime.totalUsers ?? 0} />
        </Card>
        <Card size="small" style={{ minWidth: 200 }}>
          <Statistic title="Заказов" value={overview?.allTime.totalOrders ?? 0} />
        </Card>
        <Card size="small" style={{ minWidth: 200 }}>
          <Statistic title="Выручка" value={formatAmount(overview?.allTime.totalRevenue ?? 0)} suffix="сум" />
        </Card>
        <Card size="small" style={{ minWidth: 200 }}>
          <Statistic title="Активных продавцов" value={overview?.allTime.activeSellers ?? 0} />
        </Card>
        <Card size="small" style={{ minWidth: 200 }}>
          <Statistic title="На апруве: категории" value={overview?.allTime.pendingCategories ?? 0} />
        </Card>
        <Card size="small" style={{ minWidth: 200 }}>
          <Statistic title="На апруве: каталог" value={overview?.allTime.pendingCatalogItems ?? 0} />
        </Card>
      </Flex>

      <Typography.Title level={4} style={{ margin: 0 }}>
        За период
      </Typography.Title>
      <Flex gap="small" align="center">
        <RangePicker
          allowEmpty={[true, true]}
          onChange={(_, dateStrings) => {
            const [from, to] = dateStrings;
            model.rangeChanged(from && to ? ([from, to] as Range) : null);
          }}
        />
        {!range && <Typography.Text type="secondary">Период не выбран — показано всё время</Typography.Text>}
      </Flex>
      <Flex gap="middle" wrap>
        <Card size="small" style={{ minWidth: 200 }}>
          <Statistic title="Новые пользователи" value={users?.newInPeriod ?? 0} />
        </Card>
        <Card size="small" style={{ minWidth: 200 }}>
          <Statistic title="Заказы" value={orders?.orderCount ?? 0} />
        </Card>
        <Card size="small" style={{ minWidth: 200 }}>
          <Statistic title="Выручка" value={formatAmount(orders?.revenue ?? 0)} suffix="сум" />
        </Card>
        <Card size="small" style={{ minWidth: 200 }}>
          <Statistic title="Средний чек" value={formatAmount(orders?.averageOrderValue ?? 0)} suffix="сум" />
        </Card>
      </Flex>

      <Card title="Заказы по статусам" size="small">
        <Table
          rowKey="status"
          dataSource={orders?.byStatus ?? []}
          columns={STATUS_COLUMNS}
          pagination={false}
          size="small"
        />
      </Card>

      <Card title="Каталог" size="small">
        <Flex gap="middle" wrap>
          <Statistic title="Листингов" value={catalog?.listingCount ?? 0} />
          <Statistic title="Позиций справочника" value={catalog?.catalogItemCount ?? 0} />
        </Flex>
      </Card>
    </Flex>
  );
};

export const component = withTitle(Page, 'Метрики');
export const createModel = factory;
