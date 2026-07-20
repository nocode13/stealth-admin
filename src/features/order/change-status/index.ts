import { mutated, reset, triggered } from './model';
import { ChangeOrderStatusModal } from './ui';

export const ChangeOrderStatus = {
  View: ChangeOrderStatusModal,
  model: { triggered, reset, mutated },
};
