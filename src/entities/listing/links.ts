import { TELEGRAM_MINI_APP_URL, WEB_APP_URL } from '@/shared/config/env';

/**
 * Ссылки на карточку товара — зеркало `stealth-mobile/src/shared/lib/listing-link.ts`,
 * формат должен совпадать: веб-ссылку перехватывает приложение (Universal/App Link),
 * `startapp=l_<code>` разбирает Mini App.
 */
export const formatListingCode = (code: number): string => `#${code}`;

export const getListingLinks = (code: number) => ({
  web: `${WEB_APP_URL}/l/${code}`,
  telegram: `${TELEGRAM_MINI_APP_URL}?startapp=l_${code}`,
});

/**
 * Метки рекламной ссылки — конвенция UTM из `stealth-mobile/src/shared/analytics/AGENTS.md`.
 * `source` — только `[a-z0-9]{1,20}`: он же уходит суффиксом в `startapp`.
 */
export type CampaignUtm = {
  source: string;
  medium: string | null;
  campaign: string;
  content: string;
};

/**
 * Ссылки на товар с метками источника. Веб-бандл кладёт UTM в `entry_utm_*` на каждое событие
 * сессии (`stealth-mobile/src/shared/analytics/attribution.ts`). В Mini App влезает только источник:
 * Telegram пускает в `startapp` лишь `[A-Za-z0-9_-]` до 64 символов, отсюда `l_<code>_<source>`.
 */
export const getListingCampaignLinks = (code: number, utm: CampaignUtm) => {
  const params = new URLSearchParams({ utm_source: utm.source });
  if (utm.medium) params.set('utm_medium', utm.medium);
  if (utm.campaign) params.set('utm_campaign', utm.campaign);
  if (utm.content) params.set('utm_content', utm.content);

  return {
    web: `${WEB_APP_URL}/l/${code}?${params}`,
    telegram: `${TELEGRAM_MINI_APP_URL}?startapp=l_${code}_${utm.source}`,
  };
};
