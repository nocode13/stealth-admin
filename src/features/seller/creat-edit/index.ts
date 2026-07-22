import { SellerModal } from './ui';
import { editTriggered, createTriggered, reset, mutated } from './model';

export const SellerCreateEdit = {
  View: SellerModal,
  model: {
    editTriggered,
    createTriggered,
    reset,
    mutated,
  },
};
