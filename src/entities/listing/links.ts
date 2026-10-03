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
