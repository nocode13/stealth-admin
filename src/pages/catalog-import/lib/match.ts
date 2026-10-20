import type { CatalogItem, Category, Listing, ListingVariant, MarkupTier } from '@/shared/api';

import type { ManifestGroup, ManifestPlant, MatchConfidence } from './manifest';

/** Откуда взялся выбранный каталог — показываем на карточке. */
export type CatalogSource = 'sku' | 'batch' | 'claude' | 'manual' | 'none';

export type CatalogChoice = { kind: 'existing'; catalogItemId: string } | { kind: 'new' };
export type ListingChoice = { kind: 'existing'; listingId: string } | { kind: 'new' };

export type ListingOptions = {
  /** Тот же вариант (объём + PP + росток; высота, если задана с обеих сторон). */
  exact: Listing[];
  /** Ничему не противоречат, но часть атрибутов у позиции не заполнена — старые позиции без SKU. */
  partial: Listing[];
  /** Другой вариант того же растения у этого продавца. */
  others: Listing[];
};

export const normalizeName = (text: string) =>
  text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'“”„`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const firstWord = (text: string) => normalizeName(text).split(' ')[0] ?? '';

export const findBySku = (listings: Listing[], code: string | null) =>
  code ? listings.filter((listing) => listing.sku?.trim() === code) : [];

/**
 * Каталог по умолчанию. Порядок: позиция с этим SKU уже есть → каталог, созданный другой карточкой
 * этого же растения в партии → предложение Claude (кроме low) → новый каталог.
 */
export const defaultCatalog = ({
  plant,
  skuHits,
  sellerId,
  catalogs,
  created,
}: {
  plant: ManifestPlant | undefined;
  skuHits: Listing[];
  sellerId: string | null;
  catalogs: CatalogItem[];
  created: string | undefined;
}): { choice: CatalogChoice; source: CatalogSource; confidence: MatchConfidence | null } => {
  const hit = skuHits.find((listing) => listing.sellerId === sellerId) ?? skuHits[0];
  if (hit) return { choice: { kind: 'existing', catalogItemId: hit.catalogItemId }, source: 'sku', confidence: 'sku' };

  const exists = (id: string | null | undefined): id is string => !!id && catalogs.some((c) => c.id === id);
  if (exists(created)) return { choice: { kind: 'existing', catalogItemId: created }, source: 'batch', confidence: null };

  const match = plant?.match;
  if (match && exists(match.catalogItemId) && match.confidence !== 'low') {
    return {
      choice: { kind: 'existing', catalogItemId: match.catalogItemId },
      source: 'claude',
      confidence: match.confidence,
    };
  }
  return { choice: { kind: 'new' }, source: 'none', confidence: null };
};

const sameOrUnknown = <T>(a: T | null, b: T | null) => a === null || b === null || a === b;

export const listingOptions = (
  listings: Listing[],
  catalogItemId: string,
  sellerId: string | null,
  variant: ListingVariant,
): ListingOptions => {
  const options: ListingOptions = { exact: [], partial: [], others: [] };
  if (!sellerId) return options;
  for (const listing of listings) {
    if (listing.catalogItemId !== catalogItemId || listing.sellerId !== sellerId) continue;
    const exact =
      listing.seedling === variant.seedling &&
      listing.potVolumeMl === variant.potVolumeMl &&
      listing.stemCount === variant.stemCount &&
      sameOrUnknown(listing.heightCm, variant.heightCm);
    const partial =
      listing.seedling === variant.seedling &&
      sameOrUnknown(listing.potVolumeMl, variant.potVolumeMl) &&
      sameOrUnknown(listing.stemCount, variant.stemCount) &&
      sameOrUnknown(listing.heightCm, variant.heightCm);
    if (exact) options.exact.push(listing);
    else if (partial) options.partial.push(listing);
    else options.others.push(listing);
  }
  return options;
};

/**
 * Позиция по умолчанию: та, у которой уже стоит этот SKU → точный вариант → единственная позиция
 * без заполненного варианта и без своего SKU (типичная старая позиция) → новый размер.
 */
export const defaultListing = (options: ListingOptions, code: string | null): ListingChoice => {
  const all = [...options.exact, ...options.partial, ...options.others];
  const bySku = code ? all.find((listing) => listing.sku?.trim() === code) : undefined;
  if (bySku) return { kind: 'existing', listingId: bySku.id };
  if (options.exact[0]) return { kind: 'existing', listingId: options.exact[0].id };
  const orphans = options.partial.filter((listing) => !listing.sku);
  if (orphans.length === 1) return { kind: 'existing', listingId: orphans[0].id };
  return { kind: 'new' };
};

/**
 * Категория/подкатегория для нового каталога: подкатегория с именем рода → самая частая пара среди
 * каталогов того же рода → `null` (тогда дефолт партии).
 */
export const guessCategory = (
  genus: string | null | undefined,
  categories: Category[],
  catalogs: CatalogItem[],
): { categoryId: string; subcategoryId: string | null } | null => {
  const key = genus ? firstWord(genus) : '';
  if (!key) return null;

  const sub = categories.find((category) => category.parentId && normalizeName(category.name) === key);
  if (sub?.parentId) return { categoryId: sub.parentId, subcategoryId: sub.id };

  const votes = new Map<string, { categoryId: string; subcategoryId: string | null; count: number }>();
  for (const catalog of catalogs) {
    if (firstWord(catalog.name) !== key) continue;
    const id = `${catalog.categoryId}:${catalog.subcategoryId ?? ''}`;
    const vote = votes.get(id) ?? { categoryId: catalog.categoryId, subcategoryId: catalog.subcategoryId, count: 0 };
    vote.count += catalog.subcategoryId ? 2 : 1;
    votes.set(id, vote);
  }
  const best = [...votes.values()].sort((a, b) => b.count - a.count)[0];
  return best ? { categoryId: best.categoryId, subcategoryId: best.subcategoryId } : null;
};

/** Себестоимость в сумах = розница из прайса (USD) × курс, до целого сума. */
export const costFromRetail = (retailUsd: number | null, rate: number | null) =>
  retailUsd && rate ? Math.round(retailUsd * rate) : null;

/** Подсказка «≈ розница» по базовой ступени — без округления, формулу цены считает бэкенд. */
export const approxRetailTiyin = (costTiyin: number, tiers: MarkupTier[]) => {
  const tier = [...tiers].sort((a, b) => a.minCost - b.minCost).filter((t) => t.minCost <= costTiyin).pop();
  return tier ? Math.round(costTiyin * (1 + tier.markupBps / 10000)) : costTiyin;
};

export const defaultExcelRowIndex = (group: ManifestGroup) => {
  const index = group.excelRows.findIndex((row) => row.retailUsd !== null);
  return index === -1 ? 0 : index;
};
