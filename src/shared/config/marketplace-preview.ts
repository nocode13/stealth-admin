/**
 * Снапшот геометрии и палитры маркетплейса (`../stealth-mobile`) — нужен, чтобы админ видел,
 * как загружаемая картинка будет обрезана в мобилке (везде `cover` с фиксированной высотой).
 *
 * Это **копия**, а не импорт: проекты не связаны сборкой. Источники правды —
 * `stealth-mobile/src/shared/config/colors.ts` и компоненты, перечисленные в `MARKETPLACE_SLOTS`.
 * Меняется вёрстка мобилки — правим здесь.
 */

export type PreviewScheme = 'light' | 'dark';

export type PreviewTheme = {
  background: string;
  card: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  primary: string;
};

export const MARKETPLACE_THEME = {
  light: {
    background: 'rgb(238 246 241)',
    card: 'rgb(255 255 255)',
    foreground: 'rgb(12 20 15)',
    muted: 'rgb(225 237 230)',
    mutedForeground: 'rgb(106 122 112)',
    border: 'rgb(209 223 213)',
    primary: 'rgb(27 127 68)',
  },
  dark: {
    background: 'rgb(11 18 14)',
    card: 'rgb(18 27 21)',
    foreground: 'rgb(233 240 234)',
    muted: 'rgb(30 42 34)',
    mutedForeground: 'rgb(150 166 155)',
    border: 'rgb(39 52 44)',
    primary: 'rgb(46 167 92)',
  },
} as const satisfies Record<PreviewScheme, PreviewTheme>;

/** Соотношение сторон кропа: квадрат под товар, 5:2 под баннер магазина. */
export const PREVIEW_ASPECT = {
  catalog: 1,
  sellerBanner: 5 / 2,
} as const;

/** Ширина «телефона» в превью — типичный логический viewport мобилки. */
export const PHONE_WIDTH = 390;

/**
 * Размеры слотов в мобилке (px). Комментарии — файлы-источники.
 */
export const MARKETPLACE_SLOTS = {
  /** `shared/ui/listing-card.tsx`: 2 колонки, `Card size="sm"` (p-3, rounded-xl), картинка h-32 rounded-md */
  catalogCard: { height: 128, radius: 6, cardPadding: 12, cardRadius: 12, columns: 2, gridGap: 8, gridPadding: 8 },
  /** `shared/ui/full-img.tsx`: w-full aspect-square, без радиуса */
  catalogHero: { aspect: 1, radius: 0 },
  /** `pages/cart/ui.tsx`: h-16 w-16 rounded-md */
  cartThumb: { width: 64, height: 64, radius: 6 },
  /** `pages/seller/ui.tsx`: full-bleed h-40 */
  sellerBanner: { height: 160, radius: 0 },
  /** `pages/listing-detail/ui.tsx`: карточка магазина, h-28, rounded-lg сверху */
  sellerCardBanner: { height: 112, radius: 8 },
} as const;
