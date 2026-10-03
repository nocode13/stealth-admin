export const API_URL = import.meta.env.VITE_API_BASE_URL as string;

/**
 * Публичные адреса для ссылок на товар (колонка «Артикул» в листингах). Дефолты — прод:
 * ссылку копируют, чтобы выложить в Instagram/Telegram, dev-адрес там бесполезен.
 * TELEGRAM_MINI_APP_URL — direct link Mini App: t.me/<bot>/<short_name> (BotFather → /myapps).
 */
export const WEB_APP_URL = (import.meta.env.VITE_WEB_APP_URL as string | undefined) || 'https://app.egen.uz';
export const TELEGRAM_MINI_APP_URL =
  (import.meta.env.VITE_TELEGRAM_MINI_APP_URL as string | undefined) || 'https://t.me/egen13_bot/app';
