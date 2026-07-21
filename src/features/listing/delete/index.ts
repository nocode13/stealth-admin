import { ListingDeleteButton } from './ui';
import { deleteTriggered, mutated } from './model';

export const ListingDelete = {
  View: ListingDeleteButton,
  model: {
    deleteTriggered,
    mutated,
  },
};
