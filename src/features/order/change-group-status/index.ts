import { mutated, reset, triggered } from './model';
import { ChangeGroupStatusModal } from './ui';

export const ChangeGroupStatus = {
  View: ChangeGroupStatusModal,
  model: { triggered, reset, mutated },
};
