import { CatalogItemModal } from './ui';
import { editTriggered, createTriggered, created, reset, mutated } from './model';

export const CatalogCreateEdit = {
  View: CatalogItemModal,
  model: {
    editTriggered,
    createTriggered,
    created,
    reset,
    mutated,
  },
};
