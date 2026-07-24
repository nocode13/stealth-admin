import { formatAmount } from './currency/currency';

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export const formatPrice = (price: string) => formatAmount(Number(price));
