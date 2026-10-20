import { api, getApiErrorMessage } from '@/shared/api';
import type { CatalogItem, CatalogItemPayload, Listing, ListingVariant, Locale } from '@/shared/api';

import { fetchMediaFile } from './manifest';

export type CatalogTexts = {
  nameRu: string;
  nameUz: string;
  nameEn: string;
  descriptionRu: string;
  descriptionUz: string;
  descriptionEn: string;
};

/** Всё, что нужно применить по одной карточке. Собирается на карточке после approve. */
export type ApplyPlan = {
  batch: string;
  groupId: string;
  plantKey: string;
  sku: string | null;
  sellerId: string;
  /** У существующего `description` — дописать описание, если у каталога его нет. */
  catalog:
    | { kind: 'existing'; catalogItemId: string; description: CatalogTexts | null }
    | {
        kind: 'new';
        texts: CatalogTexts;
        categoryId: string;
        subcategoryId: string | null;
        countryId: string | null;
      };
  listing: { kind: 'existing'; listingId: string } | { kind: 'new' };
  /** В тийинах. */
  costPrice: number;
  stock: number;
  variant: ListingVariant;
  /** Фото с белым фоном (лучшее первым — оно станет обложкой), затем видео. */
  media: { white: string[]; video: string | null };
};

export type ApplyStep = 'catalog' | 'listing' | 'media' | 'activate';

export type ApplyResult = {
  status: 'done' | 'error' | 'skipped';
  plantKey: string;
  catalogItemId?: string;
  listingId?: string;
  listingCode?: number;
  /** Галерея уже залита — повтор после ошибки на активации её не трогает. */
  mediaDone?: boolean;
  failedStep?: ApplyStep;
  error?: string;
  at: string;
};

export type ApplyOutput = {
  result: ApplyResult;
  /** Свежие сущности — страница подменяет их в своём снимке, чтобы соседние карточки видели изменения. */
  listing: Listing | null;
  catalog: CatalogItem | null;
};

const LOCALES: { locale: Locale; name: keyof CatalogTexts; description: keyof CatalogTexts }[] = [
  { locale: 'RU', name: 'nameRu', description: 'descriptionRu' },
  { locale: 'UZ', name: 'nameUz', description: 'descriptionUz' },
  { locale: 'EN', name: 'nameEn', description: 'descriptionEn' },
];

const newTranslations = (texts: CatalogTexts): CatalogItemPayload['translations'] =>
  LOCALES.map(({ locale, name, description }) => ({
    locale,
    name: texts[name].trim() || undefined,
    description: texts[description].trim() || undefined,
    ...(locale === 'RU' ? { unit: 'шт' } : {}),
  }));

/**
 * PATCH шлёт переводы целиком (бэкенд upsert'ит все локали), поэтому сохраняем текущие имена и
 * единицы. Локаль с `auto: true` отправляем без имени — пусть остаётся фолбэком на RU.
 */
const withDescriptions = (catalog: CatalogItem, texts: CatalogTexts): CatalogItemPayload['translations'] =>
  LOCALES.map(({ locale, description }) => {
    const current = catalog.translations.find((t) => t.locale === locale);
    const own = current && !current.auto;
    return {
      locale,
      name: own ? current.name : locale === 'RU' ? catalog.name : undefined,
      unit: own ? current.unit : undefined,
      description: texts[description].trim() || undefined,
    };
  });

const findSellerListingBySku = async (sellerId: string, sku: string) => {
  const { data } = await api.listing.findAll({ search: sku, sellerId, limit: 100 });
  return data.items.find((listing) => listing.sku?.trim() === sku) ?? null;
};

/**
 * Применяет карточку по шагам. Не бросает: ошибка возвращается в `result` вместе с уже созданными id,
 * и повторный approve продолжает с упавшего шага, а не плодит дубли каталога/позиции.
 */
export const applyPlan = async (plan: ApplyPlan, previous: ApplyResult | undefined): Promise<ApplyOutput> => {
  const result: ApplyResult = {
    status: 'done',
    plantKey: plan.plantKey,
    catalogItemId: previous?.catalogItemId,
    listingId: previous?.listingId,
    listingCode: previous?.listingCode,
    mediaDone: previous?.mediaDone,
    at: new Date().toISOString(),
  };
  let catalog: CatalogItem | null = null;
  let listing: Listing | null = null;
  let step: ApplyStep = 'catalog';

  try {
    // 1. Каталог
    if (!result.catalogItemId) {
      if (plan.catalog.kind === 'new') {
        catalog = await api.catalog.create({
          translations: newTranslations(plan.catalog.texts),
          categoryId: plan.catalog.categoryId,
          subcategoryId: plan.catalog.subcategoryId ?? undefined,
          countryId: plan.catalog.countryId ?? undefined,
        });
        result.catalogItemId = catalog.id;
      } else {
        result.catalogItemId = plan.catalog.catalogItemId;
        if (plan.catalog.description) {
          const current = await api.catalog.findOne(plan.catalog.catalogItemId);
          if (!current.description?.trim()) {
            catalog = await api.catalog.update(current.id, {
              translations: withDescriptions(current, plan.catalog.description),
            });
          }
        }
      }
    }
    const catalogItemId = result.catalogItemId;
    if (!catalogItemId) throw new Error('Каталог не определён');

    // 2. Продажная позиция
    step = 'listing';
    if (result.listingId) {
      listing = await api.listing.update(result.listingId, { costPrice: plan.costPrice, stock: plan.stock });
    } else if (plan.listing.kind === 'existing') {
      const current = await api.listing.findOne(plan.listing.listingId);
      // Вариант дописываем только там, где он пустой: чужие заполненные значения не трогаем.
      listing = await api.listing.update(current.id, {
        sku: current.sku ? undefined : plan.sku,
        costPrice: plan.costPrice,
        stock: plan.stock,
        potVolumeMl: current.potVolumeMl ?? plan.variant.potVolumeMl,
        stemCount: current.stemCount ?? plan.variant.stemCount,
        heightCm: current.heightCm ?? plan.variant.heightCm,
      });
    } else {
      const existing = plan.sku ? await findSellerListingBySku(plan.sellerId, plan.sku) : null;
      listing = existing
        ? await api.listing.update(existing.id, { costPrice: plan.costPrice, stock: plan.stock })
        : await api.listing.create({
            catalogItemId,
            sellerId: plan.sellerId,
            sku: plan.sku,
            costPrice: plan.costPrice,
            stock: plan.stock,
            // ACTIVE — только после фото, чтобы позиция не мелькнула на витрине без них.
            status: 'DRAFT',
            ...plan.variant,
          });
    }
    result.listingId = listing.id;
    result.listingCode = listing.code;

    // 3. Галерея позиции: старые фото удаляем, затем белые фото и видео — строго по очереди,
    // порядок в галерее = порядок загрузки
    step = 'media';
    if (!result.mediaDone) {
      const fresh = await api.listing.findOne(listing.id);
      for (const media of fresh.ownMedia) {
        await api.listing.removeMedia(listing.id, media.id);
      }
      for (const path of plan.media.white) {
        listing = await api.listing.addMedia(listing.id, await fetchMediaFile(plan.batch, path));
      }
      if (plan.media.video) {
        listing = await api.listing.addMedia(listing.id, await fetchMediaFile(plan.batch, plan.media.video));
      }
      result.mediaDone = true;
    }

    // 4. На витрину
    step = 'activate';
    listing = await api.listing.update(listing.id, { status: 'ACTIVE' });
  } catch (error) {
    result.status = 'error';
    result.failedStep = step;
    result.error = getApiErrorMessage(error, error instanceof Error ? error.message : undefined);
  }

  return { result, listing, catalog: catalog ?? listing?.catalogItem ?? null };
};
