import { base } from './instances';
import type { FindMetricsPeriodParams, MetricsCatalog, MetricsOrders, MetricsOverview, MetricsUsers } from './types';

export const metrics = {
  /** GET /admin/metrics/users — новые пользователи за период + всего. */
  getUsers: (params?: FindMetricsPeriodParams) =>
    base.get<MetricsUsers>('/metrics/users', { params }).then((r) => r.data),
  /** GET /admin/metrics/orders — заказы и выручка за период, разбивка по статусам. */
  getOrders: (params?: FindMetricsPeriodParams) =>
    base.get<MetricsOrders>('/metrics/orders', { params }).then((r) => r.data),
  /** GET /admin/metrics/catalog — снимок продавцов/каталога: активные, ожидающие апрува. */
  getCatalog: () => base.get<MetricsCatalog>('/metrics/catalog').then((r) => r.data),
  /** GET /admin/metrics/overview — сводка для верхней части дашборда. */
  getOverview: () => base.get<MetricsOverview>('/metrics/overview').then((r) => r.data),
};
