import { BroadcastDrawer } from './ui';
import { createTriggered, reset, mutated } from './model';

export const BroadcastCreate = {
  View: BroadcastDrawer,
  model: {
    createTriggered,
    reset,
    mutated,
  },
};
