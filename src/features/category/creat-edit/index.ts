import { CategoryModal } from './ui';
import { editTriggered, createTriggered, reset, mutated } from './model';
import { itemDetached } from './items';

export const CategoryCreateEdit = {
  View: CategoryModal,
  model: {
    editTriggered,
    createTriggered,
    reset,
    mutated,
    itemDetached,
  },
};
