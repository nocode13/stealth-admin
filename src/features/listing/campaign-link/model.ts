import { combine, createEvent, createStore, restore, sample } from 'effector';

import { getListingCampaignLinks, type Listing } from '@/entities/listing';
import { createDisclosure } from '@/shared/lib/disclosure';
import { textFactory } from '@/shared/lib/text-factory';

import type { UtmMedium, UtmSource } from './config';

/**
 * Рекламная ссылка на товар: собирается на клиенте, бэкенд не нужен. Воронки и выручка по
 * кампаниям в PostHog («Атрибуция: Instagram, share, лендинг») читают именно эти метки.
 */
export const triggered = createEvent<Listing>();
export const closed = createEvent();

export const disclosure = createDisclosure();

export const $listing = createStore<Listing | null>(null);

// Метки при закрытии не сбрасываются: ссылки на несколько товаров одной кампании делают
// подряд, и вводить кампанию заново на каждый товар незачем.
export const sourceChanged = createEvent<UtmSource>();
export const mediumChanged = createEvent<UtmMedium | null>();

export const $source = restore(sourceChanged, 'instagram');
export const $medium = restore(mediumChanged, 'story');
export const campaignModel = textFactory();
export const contentModel = textFactory();

/** `Осенние Розы ` → `осенние_розы`: одна кампания не должна дробиться в отчёте на варианты написания. */
const toUtmValue = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '_');

export const $links = combine(
  {
    listing: $listing,
    source: $source,
    medium: $medium,
    campaign: campaignModel.$value,
    content: contentModel.$value,
  },
  ({ listing, source, medium, campaign, content }) =>
    listing &&
    getListingCampaignLinks(listing.code, {
      source,
      medium,
      campaign: toUtmValue(campaign),
      content: toUtmValue(content),
    }),
);

sample({ clock: triggered, target: $listing });
sample({ clock: triggered, target: disclosure.opened });
sample({ clock: closed, target: disclosure.closed });
