import { toRound } from '@/shared/lib/currency/currency';

/** bps → проценты (2000 → 20). */
export const bpsToPercent = (bps: number) => toRound(bps / 100, 2);

/** Проценты → bps (20 → 2000). */
export const percentToBps = (percent: number) => Math.round(percent * 100);

/** `YYYY-MM-DD` → `DD.MM.YYYY`. */
export const formatDay = (day: string) => day.split('-').reverse().join('.');

/** Период акции/правила для таблицы: «01.10.2026 — 07.10.2026», «с 01.10.2026», «бессрочно». */
export const formatPeriod = (startDate: string | null, endDate: string | null) => {
  if (startDate && endDate) return `${formatDay(startDate)} — ${formatDay(endDate)}`;
  if (startDate) return `с ${formatDay(startDate)}`;
  if (endDate) return `по ${formatDay(endDate)}`;
  return 'бессрочно';
};
