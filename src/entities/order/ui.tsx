import type { OrderStatus } from '@/shared/api';
import { StatusTag as GenericStatusTag } from '@/shared/ui/status-tag';

import { ORDER_STATUS_LABELS } from './lib';

export const StatusTag = ({ status }: { status: OrderStatus }) => (
  <GenericStatusTag status={status} labels={ORDER_STATUS_LABELS} />
);
