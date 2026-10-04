import type { ListingVariant } from '@/shared/api/types';

const stemsWord = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'стебель';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'стебля';
  return 'стеблей';
};

/**
 * Подпись варианта: «росток · 3 л · 5 стеблей · 60 см». `null` — атрибутов нет
 * (или заказ оформлен до вариантов). Бэкенд отдаёт атрибуты сырыми — подпись
 * собирается здесь, копия логики бота (`stealth-backend/src/listings/variant.ts`).
 */
export const formatVariant = (variant: ListingVariant | null | undefined): string | null => {
  if (!variant) return null;
  const parts = [
    variant.seedling ? 'росток' : null,
    variant.potVolumeMl !== null
      ? `${(variant.potVolumeMl / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} л`
      : null,
    variant.stemCount !== null ? `${variant.stemCount} ${stemsWord(variant.stemCount)}` : null,
    variant.heightCm !== null ? `${variant.heightCm} см` : null,
  ].filter((part): part is string => part !== null);
  return parts.length ? parts.join(' · ') : null;
};
