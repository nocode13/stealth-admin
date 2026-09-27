import type { PriceSource } from '@/shared/api';

/** Подписи источников цены — в «Приоритетах цены» и в теге у листинга. */
export const sourceOptions: Record<PriceSource, string> = {
  PROMOTION: 'Акция',
  LISTING_MARKUP: 'Своя наценка позиции',
  BASE_MARKUP: 'Базовая наценка',
};

export const sourceDescriptions: Record<PriceSource, string> = {
  PROMOTION: 'Фиксированная цена позиции в активной акции, если она ниже обычной.',
  LISTING_MARKUP: 'Наценка, заданная супер-админом в карточке продажной позиции.',
  BASE_MARKUP: 'Ступенчатая наценка из настроек — срабатывает всегда, поэтому стоит последней.',
};
