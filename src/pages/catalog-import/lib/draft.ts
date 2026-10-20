import type { CatalogItem, Listing, ListingVariant } from '@/shared/api';
import { toTiyin } from '@/shared/lib/currency/currency';

import type { ApplyPlan, CatalogTexts } from './apply';
import type { ExcelRow, ManifestGroup, ManifestPlant, MatchConfidence } from './manifest';
import {
  costFromRetail,
  defaultCatalog,
  defaultExcelRowIndex,
  defaultListing,
  findBySku,
  guessCategory,
  listingOptions,
  type CatalogChoice,
  type CatalogSource,
  type ListingChoice,
  type ListingOptions,
} from './match';
import type { SystemData } from './system';

export type ImportDefaults = {
  sellerId: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  countryId: string | null;
};

/** Только то, что поменяли руками на карточке; остальное считается заново от данных и дефолтов. */
export type Overrides = {
  sellerId?: string | null;
  excelRowIndex?: number;
  catalog?: CatalogChoice;
  listing?: ListingChoice;
  variant?: Partial<ListingVariant>;
  costPriceSum?: number | null;
  stock?: number | null;
  texts?: Partial<CatalogTexts>;
  categoryId?: string | null;
  subcategoryId?: string | null;
  countryId?: string | null;
  addDescription?: boolean;
};

export type Draft = {
  sellerId: string | null;
  excelRowIndex: number;
  excelRow: ExcelRow | null;
  skuHits: Listing[];
  catalog: CatalogChoice;
  catalogSource: CatalogSource;
  catalogConfidence: MatchConfidence | null;
  catalogItem: CatalogItem | null;
  listingOptions: ListingOptions;
  listing: ListingChoice;
  listingItem: Listing | null;
  variant: ListingVariant;
  costPriceSum: number | null;
  stock: number;
  texts: CatalogTexts;
  categoryId: string | null;
  subcategoryId: string | null;
  countryId: string | null;
  /** У выбранного каталога нет описания, а Claude его написал. */
  canAddDescription: boolean;
  addDescription: boolean;
  warnings: string[];
  /** Пока не пусто — approve недоступен. */
  blockers: string[];
};

const EMPTY_OPTIONS: ListingOptions = { exact: [], partial: [], others: [] };

const variantFrom = (base: ListingVariant, patch: Partial<ListingVariant> | undefined): ListingVariant => ({
  ...base,
  ...patch,
});

export const resolveDraft = ({
  group,
  plant,
  system,
  defaults,
  rate,
  created,
  overrides,
}: {
  group: ManifestGroup;
  plant: ManifestPlant | undefined;
  system: SystemData;
  defaults: ImportDefaults;
  rate: number | null;
  created: string | undefined;
  overrides: Overrides;
}): Draft => {
  const warnings: string[] = [];
  const blockers: string[] = [];

  const sellerId = overrides.sellerId !== undefined ? overrides.sellerId : defaults.sellerId;
  const excelRowIndex = overrides.excelRowIndex ?? defaultExcelRowIndex(group);
  const excelRow = group.excelRows[excelRowIndex] ?? null;
  const variant = variantFrom(group.variant, overrides.variant);
  const skuHits = findBySku(system.listings, group.code);

  // --- каталог
  const auto = defaultCatalog({ plant, skuHits, sellerId, catalogs: system.catalogs, created });
  const catalog = overrides.catalog ?? auto.choice;
  const catalogSource: CatalogSource = overrides.catalog ? 'manual' : auto.source;
  const catalogItem =
    catalog.kind === 'existing' ? (system.catalogs.find((c) => c.id === catalog.catalogItemId) ?? null) : null;

  // --- позиция
  const options = catalogItem ? listingOptions(system.listings, catalogItem.id, sellerId, variant) : EMPTY_OPTIONS;
  const inOptions = [...options.exact, ...options.partial, ...options.others];
  const listingOverride = overrides.listing;
  // Выбор руками держим, только пока позиция есть среди вариантов текущих каталога и продавца.
  const overriddenListing =
    listingOverride?.kind === 'existing' ? inOptions.find((l) => l.id === listingOverride.listingId) : undefined;
  const listing: ListingChoice =
    catalog.kind === 'new'
      ? { kind: 'new' }
      : listingOverride?.kind === 'new'
        ? { kind: 'new' }
        : overriddenListing
          ? { kind: 'existing', listingId: overriddenListing.id }
          : defaultListing(options, group.code);
  const listingItem = listing.kind === 'existing' ? (inOptions.find((l) => l.id === listing.listingId) ?? null) : null;

  // --- цена и остаток
  const costPriceSum =
    overrides.costPriceSum !== undefined ? overrides.costPriceSum : costFromRetail(excelRow?.retailUsd ?? null, rate);
  const stock = overrides.stock ?? Math.max(0, Math.round(excelRow?.stock ?? 0));

  // --- тексты и категории нового каталога
  const generated = plant?.generated;
  const texts: CatalogTexts = {
    nameRu: generated?.nameRu ?? '',
    nameUz: generated?.nameUz ?? '',
    nameEn: generated?.nameEn ?? '',
    descriptionRu: generated?.descriptionRu ?? '',
    descriptionUz: generated?.descriptionUz ?? '',
    descriptionEn: generated?.descriptionEn ?? '',
    ...overrides.texts,
  };
  const guess = guessCategory(generated?.genusRu ?? plant?.names[0], system.categories, system.catalogs);
  const categoryId =
    overrides.categoryId !== undefined ? overrides.categoryId : (guess?.categoryId ?? defaults.categoryId);
  const subcategoryId =
    overrides.subcategoryId !== undefined
      ? overrides.subcategoryId
      : guess
        ? guess.subcategoryId
        : defaults.subcategoryId;
  const countryId = overrides.countryId !== undefined ? overrides.countryId : defaults.countryId;
  const canAddDescription = !!catalogItem && !catalogItem.description?.trim() && !!texts.descriptionRu.trim();
  const addDescription = canAddDescription && (overrides.addDescription ?? true);

  // --- предупреждения
  const sellerName = (id: string) => system.sellers.find((s) => s.id === id)?.name ?? id;
  for (const hit of skuHits.filter((l) => l.sellerId !== sellerId)) {
    warnings.push(`Код ${group.code} уже у позиции #${hit.code} продавца «${sellerName(hit.sellerId)}»`);
  }
  if (listingItem?.sku && listingItem.sku.trim() !== group.code) {
    warnings.push(`У выбранной позиции свой код ${listingItem.sku} — его не трогаем`);
  }
  if (listingItem && options.partial.includes(listingItem)) {
    warnings.push('У позиции не заполнен вариант — допишем объём/PP/высоту из прайса');
  }
  if (listingItem && options.others.includes(listingItem)) {
    warnings.push('Выбрана позиция с другим вариантом — её вариант не изменится');
  }

  // --- что мешает approve
  if (!sellerId) blockers.push('Выбери продавца');
  if (costPriceSum === null && excelRow?.retailUsd && !rate) blockers.push('Укажи курс USD');
  else if (!costPriceSum || costPriceSum <= 0) blockers.push('Нет себестоимости — введи вручную');
  if (!group.media.white.length) blockers.push('Нет фото с белым фоном');
  if (catalog.kind === 'new') {
    if (!texts.nameRu.trim()) blockers.push('Нет названия каталога');
    if (!categoryId) blockers.push('Выбери категорию');
  } else if (!catalogItem) {
    blockers.push('Каталог не найден — обнови данные');
  } else {
    if (catalogItem.status !== 'APPROVED') blockers.push('Каталог не одобрен');
    if (catalogItem.sellerId && catalogItem.sellerId !== sellerId) blockers.push('Каталог принадлежит другому продавцу');
  }
  if (listing.kind === 'new') {
    if (options.exact[0]) blockers.push(`У продавца уже есть такой вариант (#${options.exact[0].code}) — выбери его`);
    const sameSellerHit = skuHits.find((l) => l.sellerId === sellerId);
    if (sameSellerHit) blockers.push(`Код ${group.code} уже у позиции #${sameSellerHit.code} этого продавца`);
  }

  return {
    sellerId,
    excelRowIndex,
    excelRow,
    skuHits,
    catalog,
    catalogSource,
    catalogConfidence: overrides.catalog ? null : auto.confidence,
    catalogItem,
    listingOptions: options,
    listing,
    listingItem,
    variant,
    costPriceSum,
    stock,
    texts,
    categoryId,
    subcategoryId,
    countryId,
    canAddDescription,
    addDescription,
    warnings,
    blockers,
  };
};

export const buildPlan = (batch: string, group: ManifestGroup, draft: Draft): ApplyPlan | null => {
  if (draft.blockers.length || !draft.sellerId || !draft.costPriceSum || !group.media.white.length) return null;
  return {
    batch,
    groupId: group.id,
    plantKey: group.plantKey,
    sku: group.code,
    sellerId: draft.sellerId,
    catalog:
      draft.catalog.kind === 'new'
        ? {
            kind: 'new',
            texts: draft.texts,
            categoryId: draft.categoryId ?? '',
            subcategoryId: draft.subcategoryId,
            countryId: draft.countryId,
          }
        : {
            kind: 'existing',
            catalogItemId: draft.catalog.catalogItemId,
            description: draft.addDescription ? draft.texts : null,
          },
    listing: draft.listing,
    costPrice: toTiyin(draft.costPriceSum),
    stock: draft.stock,
    variant: draft.variant,
    media: { white: group.media.white, video: group.media.video },
  };
};
