import { createEffect, createEvent, createStore, sample } from 'effector';

import { userModel } from '@/entities/user';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';
import { message } from '@/shared/lib/message';

import { applyPlan, type ApplyPlan, type ApplyResult } from './lib/apply';
import type { ImportDefaults, Overrides } from './lib/draft';
import { fetchBatches, fetchManifest, type BatchInfo, type Manifest } from './lib/manifest';
import { readStored, resultsKey, writeStored } from './lib/storage';
import { loadSystem, patchSystem, type SystemData } from './lib/system';

export type CardFilter = 'pending' | 'warnings' | 'noPrice' | 'done' | 'skipped' | 'error' | 'all';

const EMPTY_DEFAULTS: ImportDefaults = { sellerId: null, categoryId: null, subcategoryId: null, countryId: null };

/**
 * Импорт каталога из Telegram + прайса: партию готовит `tools/catalog-import/prepare.py`, страница
 * показывает карточки на approve и применяет их существующими admin-эндпоинтами. Живёт только в
 * ветке инструмента, в main не уходит.
 */
export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({ route, roles: ['SUPER_ADMIN'] });

  const batchSelected = createEvent<string>();
  const refreshClicked = createEvent();
  const rateChanged = createEvent<number | null>();
  const defaultsChanged = createEvent<Partial<ImportDefaults>>();
  const filterChanged = createEvent<CardFilter>();
  const approveClicked = createEvent<ApplyPlan>();
  const skipClicked = createEvent<{ groupId: string; plantKey: string }>();
  const unskipClicked = createEvent<string>();
  const overrideChanged = createEvent<{ groupId: string; patch: Overrides }>();

  const $batches = createStore<BatchInfo[]>([]);
  const $batch = createStore<string | null>(readStored<string | null>('batch', null));
  const $manifest = createStore<Manifest | null>(null);
  const $system = createStore<SystemData | null>(null);
  const $rate = createStore<number | null>(readStored<number | null>('rate', null));
  const $defaults = createStore<ImportDefaults>(readStored('defaults', EMPTY_DEFAULTS));
  const $filter = createStore<CardFilter>('pending');
  /** Итоги approve/skip по id группы — для повтора после ошибки и счётчиков. */
  const $results = createStore<Record<string, ApplyResult>>({});
  const $applyingId = createStore<string | null>(null);
  /** Правки руками по карточкам (только UI) — переживают переключение страниц списка. */
  const $overrides = createStore<Record<string, Overrides>>({});

  /** plantKey → каталог, уже выбранный или созданный другой карточкой того же растения. */
  const $plantCatalogs = $results.map((results) => {
    const map: Record<string, string> = {};
    for (const result of Object.values(results)) {
      if (result.catalogItemId) map[result.plantKey] = result.catalogItemId;
    }
    return map;
  });

  const loadBatchesFx = createEffect(fetchBatches);
  const loadManifestFx = createEffect(fetchManifest);
  const loadSystemFx = createEffect(loadSystem);
  const readResultsFx = createEffect((manifest: Manifest) =>
    readStored<Record<string, ApplyResult>>(resultsKey(manifest), {}),
  );
  const persistFx = createEffect(({ key, value }: { key: string; value: unknown }) => writeStored(key, value));
  const applyFx = createEffect(({ plan, previous }: { plan: ApplyPlan; previous: ApplyResult | undefined }) =>
    applyPlan(plan, previous),
  );

  // --- загрузка: список партий и живые данные системы; «Обновить» перечитывает всё
  sample({
    clock: [authorizedRoute.opened, refreshClicked],
    target: [loadBatchesFx, loadSystemFx],
  });

  sample({ clock: loadBatchesFx.doneData, target: $batches });

  // Запомненная партия, если она ещё есть, иначе самая свежая.
  sample({
    clock: loadBatchesFx.doneData,
    source: $batch,
    filter: (_, batches) => batches.length > 0,
    fn: (current, batches) => (current && batches.some((b) => b.batch === current) ? current : batches[0].batch),
    target: batchSelected,
  });

  sample({ clock: batchSelected, target: [$batch, loadManifestFx] });
  // Итоги читаются под ключом конкретной сборки партии — поэтому после манифеста, а не по имени.
  // Сбрасывать $results на смене партии нельзя: запись ушла бы под ключ ещё старого манифеста.
  sample({ clock: loadManifestFx.doneData, target: readResultsFx });
  sample({ clock: batchSelected, fn: (batch) => ({ key: 'batch', value: batch }), target: persistFx });
  sample({ clock: loadManifestFx.doneData, target: $manifest });
  sample({ clock: readResultsFx.doneData, target: $results });
  sample({ clock: loadSystemFx.doneData, target: $system });

  // --- настройки партии
  sample({ clock: rateChanged, target: $rate });
  sample({ clock: rateChanged, fn: (rate) => ({ key: 'rate', value: rate }), target: persistFx });
  sample({
    clock: defaultsChanged,
    source: $defaults,
    fn: (defaults, patch) => ({ ...defaults, ...patch }),
    target: $defaults,
  });
  sample({ clock: $defaults.updates, fn: (defaults) => ({ key: 'defaults', value: defaults }), target: persistFx });
  sample({ clock: filterChanged, target: $filter });

  sample({
    clock: overrideChanged,
    source: $overrides,
    fn: (all, { groupId, patch }) => {
      const prev = all[groupId] ?? {};
      return {
        ...all,
        [groupId]: {
          ...prev,
          ...patch,
          texts: patch.texts ? { ...prev.texts, ...patch.texts } : prev.texts,
          variant: patch.variant ? { ...prev.variant, ...patch.variant } : prev.variant,
        },
      };
    },
    target: $overrides,
  });
  sample({ clock: batchSelected, fn: () => ({}), target: $overrides });

  // --- approve: по одной карточке за раз — следующая карточка того же растения должна увидеть
  // созданный каталог
  sample({
    clock: approveClicked,
    source: $results,
    fn: (results, plan) => ({ plan, previous: results[plan.groupId] }),
    target: applyFx,
  });
  sample({ clock: approveClicked, fn: (plan) => plan.groupId, target: $applyingId });
  sample({ clock: applyFx.finally, fn: () => null, target: $applyingId });

  sample({
    clock: applyFx.done,
    source: $results,
    fn: (results, { params, result }) => ({ ...results, [params.plan.groupId]: result.result }),
    target: $results,
  });
  sample({
    clock: applyFx.doneData,
    source: $system,
    filter: (system): system is SystemData => system !== null,
    fn: (system, output) => patchSystem(system, output),
    target: $system,
  });

  sample({
    clock: skipClicked,
    source: $results,
    fn: (results, { groupId, plantKey }) => ({
      ...results,
      [groupId]: { status: 'skipped' as const, plantKey, at: new Date().toISOString() },
    }),
    target: $results,
  });
  sample({
    clock: unskipClicked,
    source: $results,
    fn: (results, groupId) => Object.fromEntries(Object.entries(results).filter(([id]) => id !== groupId)),
    target: $results,
  });

  sample({
    clock: $results.updates,
    source: $manifest,
    filter: (manifest): manifest is Manifest => manifest !== null,
    fn: (manifest, results) => ({ key: resultsKey(manifest), value: results }),
    target: persistFx,
  });

  message({
    clock: applyFx.doneData,
    fn: ({ result }) =>
      result.status === 'done'
        ? { type: 'success', content: `Готово: позиция #${result.listingCode} на витрине` }
        : { type: 'error', content: `Ошибка на шаге «${result.failedStep}»: ${result.error}` },
  });
  message({ clock: loadSystemFx.failData, errorHandle: true });
  message({ clock: loadManifestFx.failData, errorHandle: true });

  return {
    $batches,
    $batch,
    $manifest,
    $system,
    $rate,
    $defaults,
    $filter,
    $results,
    $applyingId,
    $overrides,
    $plantCatalogs,
    $systemPending: loadSystemFx.pending,
    $manifestPending: loadManifestFx.pending,
    batchSelected,
    refreshClicked,
    rateChanged,
    defaultsChanged,
    filterChanged,
    approveClicked,
    skipClicked,
    unskipClicked,
    overrideChanged,
  };
};
