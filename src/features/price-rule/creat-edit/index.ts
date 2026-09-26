import { PriceRuleDrawer } from './ui';
import { editTriggered, createTriggered, reset, mutated, deleteRequested } from './model';

export const PriceRuleCreateEdit = {
  View: PriceRuleDrawer,
  model: {
    editTriggered,
    createTriggered,
    reset,
    mutated,
    deleteRequested,
  },
};
