import { SellerStaffModal } from './ui';
import { createTriggered, editTriggered, reset, mutated } from './model';

export const SellerStaffCreateEdit = {
  View: SellerStaffModal,
  model: {
    createTriggered,
    editTriggered,
    reset,
    mutated,
  },
};
