import { CatalogItemModal } from './ui';
import { editTriggered, createTriggered, reset, mutated } from './model';

export const CatalogCreateEdit = {
  View: CatalogItemModal,
  model: {
    editTriggered,
    createTriggered,
    reset,
    mutated,
  },
};
