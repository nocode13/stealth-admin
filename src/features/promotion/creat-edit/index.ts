import { PromotionDrawer } from './ui';
import { editTriggered, createTriggered, reset, mutated, deleteRequested } from './model';

export const PromotionCreateEdit = {
  View: PromotionDrawer,
  model: {
    editTriggered,
    createTriggered,
    reset,
    mutated,
    deleteRequested,
  },
};
