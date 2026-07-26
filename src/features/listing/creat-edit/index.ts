import { ListingModal } from './ui';
import { editTriggered, createTriggered, createForCatalogItemTriggered, reset, mutated } from './model';

export const ListingCreateEdit = {
  View: ListingModal,
  model: {
    editTriggered,
    createTriggered,
    createForCatalogItemTriggered,
    reset,
    mutated,
  },
};
