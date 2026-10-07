import { triggered } from './model';
import { CampaignLinkButton, CampaignLinkModal } from './ui';

export const ListingCampaignLink = {
  Trigger: CampaignLinkButton,
  View: CampaignLinkModal,
  model: { triggered },
};
