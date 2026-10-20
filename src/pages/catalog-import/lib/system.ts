import type { AxiosResponse } from 'axios';

import { api } from '@/shared/api';
import type { CatalogItem, Category, Country, CursorPage, Listing, PlatformSettings, Seller } from '@/shared/api';

import type { ApplyOutput } from './apply';

/** Живые данные системы целиком — матчинг на карточках идёт по ним, а не по снимку из prepare.py. */
export type SystemData = {
  listings: Listing[];
  catalogs: CatalogItem[];
  sellers: Seller[];
  categories: Category[];
  countries: Country[];
  settings: PlatformSettings;
  loadedAt: string;
};

const PAGE_LIMIT = 100;

const loadAll = async <T>(fetchPage: (cursor?: string) => Promise<AxiosResponse<CursorPage<T>>>): Promise<T[]> => {
  const items: T[] = [];
  let cursor: string | undefined;
  do {
    const { data } = await fetchPage(cursor);
    items.push(...data.items);
    cursor = data.nextCursor ?? undefined;
  } while (cursor);
  return items;
};

export const loadSystem = async (): Promise<SystemData> => {
  const [listings, catalogs, sellers, categories, countries, settings] = await Promise.all([
    loadAll((cursor) => api.listing.findAll({ cursor, limit: PAGE_LIMIT })),
    loadAll((cursor) => api.catalog.findAll({ cursor, limit: PAGE_LIMIT })),
    loadAll((cursor) => api.sellers.findAll({ cursor, limit: PAGE_LIMIT })),
    loadAll((cursor) => api.category.findAll({ cursor, limit: PAGE_LIMIT })),
    loadAll((cursor) => api.country.findAll({ cursor, limit: PAGE_LIMIT })),
    api.settings.get(),
  ]);
  return { listings, catalogs, sellers, categories, countries, settings, loadedAt: new Date().toISOString() };
};

const upsert = <T extends { id: string }>(items: T[], item: T) =>
  items.some((existing) => existing.id === item.id)
    ? items.map((existing) => (existing.id === item.id ? item : existing))
    : [...items, item];

/** Подменяет в снимке то, что вернул approve: соседние карточки сразу видят новую позицию и каталог. */
export const patchSystem = (system: SystemData, output: ApplyOutput): SystemData => ({
  ...system,
  listings: output.listing ? upsert(system.listings, output.listing) : system.listings,
  catalogs: output.catalog ? upsert(system.catalogs, output.catalog) : system.catalogs,
});
