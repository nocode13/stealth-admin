/**
 * localStorage только для удобства одного браузера: курс, дефолты и итоги approve по партии.
 * Источник правды — бэкенд: повторный approve сверяется с живыми данными, а не с этим хранилищем.
 */

import { API_URL } from '@/shared/config/env';

const PREFIX = 'catalog-import';

export const readStored = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(`${PREFIX}:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const writeStored = (key: string, value: unknown) => {
  try {
    localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify(value));
  } catch {
    // приватный режим / переполнение — просто не запомним
  }
};

/**
 * Итоги approve привязаны к бэкенду и конкретной сборке партии: пересобранная партия с тем же именем
 * или переключение dev → прод не подхватят чужие id из прошлого раза.
 */
export const resultsKey = (manifest: { batch: string; createdAt: string }) =>
  `results:${API_URL}:${manifest.batch}:${manifest.createdAt}`;
