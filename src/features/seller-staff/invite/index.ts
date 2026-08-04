import { SellerStaffInviteModal } from './ui';
import { inviteTriggered, unlinkTriggered, mutated, $unlinking } from './model';

export const SellerStaffInvite = {
  View: SellerStaffInviteModal,
  model: {
    inviteTriggered,
    unlinkTriggered,
    mutated,
    $unlinking,
  },
};
