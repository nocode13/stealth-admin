import { CategoryModal } from './ui';
import { editTriggered, createTriggered, reset, mutated } from './model';

export const CategoryCreateEdit = {
  View: CategoryModal,
  model: {
    editTriggered,
    createTriggered,
    reset,
    mutated,
  },
};
