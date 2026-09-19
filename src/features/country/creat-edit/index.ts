import { CountryModal } from './ui';
import { editTriggered, createTriggered, reset, mutated, deleteRequested } from './model';

export const CountryCreateEdit = {
  View: CountryModal,
  model: {
    editTriggered,
    createTriggered,
    reset,
    mutated,
    deleteRequested,
  },
};
