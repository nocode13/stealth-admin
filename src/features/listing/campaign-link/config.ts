/**
 * Источники и форматы — конвенция UTM из `stealth-mobile/src/shared/analytics/AGENTS.md`.
 * `share` и `leadgen` ставят сами приложение и лендинг, руками их не выбирают. `bio` тоже нет:
 * шапка профиля ведёт на `egen.uz/taplink`, а не на товар.
 */
export type UtmSource = 'instagram' | 'telegram' | 'facebook';
export type UtmMedium = 'story' | 'reel' | 'post' | 'paid' | 'dm';

export const SOURCE_OPTIONS: { label: string; value: UtmSource }[] = [
  { label: 'Instagram', value: 'instagram' },
  { label: 'Telegram', value: 'telegram' },
  { label: 'Facebook', value: 'facebook' },
];

export const MEDIUM_OPTIONS: { label: string; value: UtmMedium }[] = [
  { label: 'Сторис', value: 'story' },
  { label: 'Reels', value: 'reel' },
  { label: 'Пост', value: 'post' },
  { label: 'Платная реклама', value: 'paid' },
  { label: 'Личные сообщения', value: 'dm' },
];
