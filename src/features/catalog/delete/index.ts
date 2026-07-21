import { CatalogDeleteButton } from './ui';
import { deleteTriggered, mutated } from './model';

export const CatalogDelete = {
  View: CatalogDeleteButton,
  model: {
    deleteTriggered,
    mutated,
  },
};
