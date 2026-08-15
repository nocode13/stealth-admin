import type { OrderGroupStatus, OrderStatus } from '@/shared/api';
import { StatusTag as GenericStatusTag } from '@/shared/ui/status-tag';

import { ORDER_GROUP_STATUS_LABELS, ORDER_STATUS_LABELS } from './lib';

export const StatusTag = ({ status }: { status: OrderStatus }) => (
  <GenericStatusTag status={status} labels={ORDER_STATUS_LABELS} />
);

/** Статус ГРУППЫ (шапка деталки, колонка листинга) — отдельный тег: набор значений
 * шире на PARTIALLY_DELIVERED, свой Record меток. */
export const GroupStatusTag = ({ status }: { status: OrderGroupStatus }) => (
  <GenericStatusTag status={status} labels={ORDER_GROUP_STATUS_LABELS} />
);
