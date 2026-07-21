import { ChangeSellerStatusModal } from './ui';
import { mutated, reset, triggered } from './model';

export const SellerChangeStatus = {
  View: ChangeSellerStatusModal,
  model: { triggered, reset, mutated },
};
