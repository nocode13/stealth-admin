/**
 * Партия, подготовленная `tools/catalog-import/prepare.py`. Лежит в `public/catalog-import/<batch>/`
 * (gitignored) и отдаётся дев-сервером Vite как статика. Типы — зеркало того, что пишет скрипт.
 */

export const IMPORT_ROOT = '/catalog-import';

export type BatchInfo = {
  batch: string;
  createdAt: string;
  groups: number;
};

export type ExcelRow = {
  /** Одинаковые строки с разных листов схлопнуты — здесь все листы, где она встретилась. */
  sheets: string[];
  warehouse: string | null;
  name: string;
  stock: number | null;
  wholesaleUsd: number | null;
  /** `null` — розницы в прайсе нет (0 или пусто). */
  retailUsd: number | null;
};

export type ManifestVariant = {
  seedling: boolean;
  potVolumeMl: number | null;
  stemCount: number | null;
  heightCm: number | null;
};

export type ManifestGroup = {
  /** id первого сообщения альбома в канале. */
  id: string;
  date: string;
  caption: string;
  code: string | null;
  codeSources: { caption: string | null; label: string | null };
  /** Строки прайса по коду; первыми — с розницей. */
  excelRows: ExcelRow[];
  excelConflict: boolean;
  variant: ManifestVariant;
  plantKey: string;
  /** Текст бирки, как его прочитал Claude. Нет в партиях, собранных до этого поля. */
  labelText?: string;
  /** Заметки Claude по посту — справка, не предупреждение. */
  notes?: string;
  media: {
    /** Пути относительно папки партии. */
    photos: string[];
    /** Фото бирки — на витрину не идёт. */
    labelIndex: number | null;
    /** Фото растения, лучшее первым. */
    plantIndexes: number[];
    /** Те же фото растения с белым фоном, в том же порядке — их и заливаем. */
    white: string[];
    video: string | null;
  };
  warnings: string[];
};

export type MatchConfidence = 'sku' | 'high' | 'medium' | 'low';

export type MatchCandidate = {
  catalogItemId: string;
  name: string;
  coverUrl: string | null;
  reason: string;
};

export type GeneratedTexts = {
  nameRu: string;
  nameUz: string;
  nameEn: string;
  descriptionRu: string;
  descriptionUz: string;
  descriptionEn: string;
  genusRu: string;
};

export type ManifestPlant = {
  key: string;
  names: string[];
  codes: string[];
  /** `null` — скрипт запускали с `--no-match`. */
  match: {
    catalogItemId: string | null;
    confidence: MatchConfidence | null;
    reason: string;
    candidates: MatchCandidate[];
  } | null;
  generated: GeneratedTexts | null;
};

export type Manifest = {
  version: 1;
  batch: string;
  createdAt: string;
  /** С какого бэкенда снимали каталог для матчинга. */
  apiBaseUrl: string | null;
  snapshotAt: string | null;
  groups: ManifestGroup[];
  plants: Record<string, ManifestPlant>;
};

const getJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Не удалось загрузить ${path}: ${response.status}`);
  return (await response.json()) as T;
};

/** Пустой список, если prepare.py ещё ни разу не запускали. */
export const fetchBatches = async (): Promise<BatchInfo[]> => {
  try {
    return await getJson<BatchInfo[]>(`${IMPORT_ROOT}/index.json`);
  } catch {
    return [];
  }
};

export const fetchManifest = (batch: string) =>
  getJson<Manifest>(`${IMPORT_ROOT}/${encodeURIComponent(batch)}/manifest.json`);

export const mediaUrl = (batch: string, path: string) => `${IMPORT_ROOT}/${encodeURIComponent(batch)}/${path}`;

/** Файл партии → `File` для multipart-загрузки в галерею позиции. */
export const fetchMediaFile = async (batch: string, path: string): Promise<File> => {
  const response = await fetch(mediaUrl(batch, path));
  if (!response.ok) throw new Error(`Не удалось прочитать ${path}`);
  const blob = await response.blob();
  return new File([blob], path.split('/').pop() ?? 'file', { type: blob.type });
};
