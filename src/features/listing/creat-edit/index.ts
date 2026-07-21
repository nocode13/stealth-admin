import { ListingModal } from './ui';
import { editTriggered, createTriggered, reset, mutated } from './model';

export const ListingCreateEdit = {
  View: ListingModal,
  model: {
    editTriggered,
    createTriggered,
    reset,
    mutated,
  },
};
