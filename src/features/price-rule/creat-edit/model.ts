import { attach, createEffect, createEvent, createStore, merge, restore, sample, split, type Event } from 'effector';
import { createQuery } from 'effector-refetch';
import { debounce, delay, or } from 'patronum';
import { z } from 'zod/v4';

import type { PriceRule } from '@/entities/price-rule';
import { bpsToPercent, percentToBps } from '@/entities/promotion';
import { api, type CursorPage, type PriceRuleAction, type PriceRulePayload } from '@/shared/api';
import { toSum, toTiyin } from '@/shared/lib/currency/currency';
import { createDisclosure } from '@/shared/lib/disclosure';
import { createForm } from '@/shared/lib/form';
import { message } from '@/shared/lib/message';

export const schema = z
  .object({
    name: z.string().trim().min(1, 'Введите название').max(200, 'Максимум 200 символов'),
    enabled: z.boolean(),
    priority: z.number({ error: 'Укажите приоритет' }).int('Целое число'),
    action: z.enum(['MARKUP_PERCENT', 'DISCOUNT_PERCENT', 'FIXED_PRICE']),
    // Проценты для *_PERCENT, сумы для FIXED_PRICE — в bps/тийины переводится при отправке.
    value: z.number({ error: 'Укажите значение' }).min(0, 'Не меньше 0'),
    // nullish: antd-селект с allowClear при очистке отдаёт undefined, а не null.
    sellerId: z.string().nullish(),
    categoryId: z.string().nullish(),
    catalogItemId: z.string().nullish(),
    listingId: z.string().nullish(),
    startDate: z.string().nullish(),
    endDate: z.string().nullish(),
    minStock: z.number().int().min(0).nullish(),
    maxStock: z.number().int().min(0).nullish(),
  })
  .superRefine((values, ctx) => {
    if (values.action === 'MARKUP_PERCENT' && values.value > 1000) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'Наценка не больше 1000%' });
    }
    if (values.action === 'DISCOUNT_PERCENT' && values.value > 100) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'Скидка не больше 100%' });
    }
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Раньше первого дня' });
    }
    if (values.minStock != null && values.maxStock != null && values.minStock > values.maxStock) {
      ctx.addIssue({ code: 'custom', path: ['maxStock'], message: 'Меньше минимального' });
    }
  });

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = {
  name: '',
  enabled: true,
  priority: 10,
  action: 'MARKUP_PERCENT',
  value: 20,
  sellerId: null,
  categoryId: null,
  catalogItemId: null,
  listingId: null,
  startDate: null,
  endDate: null,
  minStock: null,
  maxStock: null,
};

const isPercent = (action: PriceRuleAction) => action !== 'FIXED_PRICE';

const toFormValues = (rule: PriceRule): FormValues => ({
  name: rule.name,
  enabled: rule.enabled,
  priority: rule.priority,
  action: rule.action,
  value: isPercent(rule.action) ? bpsToPercent(rule.value) : toSum(rule.value),
  sellerId: rule.sellerId,
  categoryId: rule.categoryId,
  catalogItemId: rule.catalogItemId,
  listingId: rule.listingId,
  startDate: rule.startDate,
  endDate: rule.endDate,
  minStock: rule.minStock,
  maxStock: rule.maxStock,
});

// Пустое поле → null явно: в PATCH undefined значит «не трогать», а очищенная в форме
// область/дата/остаток должна сняться.
const toPayload = (values: FormValues): PriceRulePayload => ({
  name: values.name.trim(),
  enabled: values.enabled,
  priority: values.priority,
  action: values.action,
  value: isPercent(values.action) ? percentToBps(values.value) : toTiyin(values.value),
  sellerId: values.sellerId ?? null,
  categoryId: values.categoryId ?? null,
  catalogItemId: values.catalogItemId ?? null,
  listingId: values.listingId ?? null,
  startDate: values.startDate ?? null,
  endDate: values.endDate ?? null,
  minStock: values.minStock ?? null,
  maxStock: values.maxStock ?? null,
});

// ── Поисковые селекты области правила ──

export interface ScopeOption {
  id: string;
  name: string;
}

/**
 * Селект с серверным поиском: первая сотня при открытии формы, дальше — поиск с
 * debounce. `$known` копит всё когда-либо найденное, чтобы выбранное значение не
 * превращалось в голый id, когда текущая выдача его не содержит.
 */
const createScopeSelect = <T extends ScopeOption>(
  fetch: (search: string) => Promise<{ data: CursorPage<T> }>,
  opened: Event<unknown>,
) => {
  const searchChanged = createEvent<string>();
  const $search = restore(searchChanged, '');
  const $options = createStore<ScopeOption[]>([]);
  const $known = createStore<Record<string, ScopeOption>>({});

  const query = createQuery({
    effect: createEffect((search: string) => fetch(search)),
    concurrency: 'TAKE_LATEST',
  });

  sample({ clock: opened, fn: () => '', target: query.start });
  sample({ clock: debounce(searchChanged, 300), target: query.start });

  const found = query.finished.done.map(({ result }) =>
    result.data.items.map((item) => ({ id: item.id, name: item.name })),
  );
  sample({ clock: found, target: $options });
  $known.on(found, (known, items) => ({ ...known, ...Object.fromEntries(items.map((i) => [i.id, i])) }));

  message({ clock: query.finished.fail.map(({ error }) => error), errorHandle: true });

  return { searchChanged, $search, $options, $known, $fetching: query.$pending };
};

export const form = createForm<FormValues>();

export const disclosure = createDisclosure();

export const createTriggered = createEvent();
export const editTriggered = createEvent<PriceRule>();
export const reset = createEvent();
export const validated = createEvent();
export const deleteRequested = createEvent<PriceRule>();

export const $editing = createStore<PriceRule | null>(null);
export const $mode = createStore<'create' | 'edit'>('create');

$mode.on(createTriggered, () => 'create').on(editTriggered, () => 'edit');

const opened = merge([createTriggered, editTriggered]);

export const sellerSelect = createScopeSelect(
  (search) => api.sellers.findAll({ limit: 100, search: search || undefined }),
  opened,
);
export const categorySelect = createScopeSelect(
  (search) => api.category.findAll({ limit: 100, status: 'APPROVED', search: search || undefined }),
  opened,
);
export const catalogItemSelect = createScopeSelect(
  (search) => api.catalog.findAll({ limit: 100, status: 'APPROVED', search: search || undefined }),
  opened,
);
// У листинга своего имени нет — подписываем «позиция — продавец», как на бэкенде.
export const listingSelect = createScopeSelect(
  (search) =>
    api.listing.findAll({ limit: 100, search: search || undefined }).then((res) => ({
      data: {
        ...res.data,
        items: res.data.items.map((l) => ({
          id: l.id,
          name: l.seller ? `${l.catalogItem.name} — ${l.seller.name}` : l.catalogItem.name,
        })),
      },
    })),
  opened,
);

// Выбранные значения редактируемого правила — сразу с подписями.
sample({ clock: editTriggered, target: $editing });
sample({ clock: editTriggered, fn: toFormValues, target: form.resetFx });

const withScopeOf =
  (pick: (rule: PriceRule) => ScopeOption | null) => (known: Record<string, ScopeOption>, rule: PriceRule) => {
    const option = pick(rule);
    return option ? { ...known, [option.id]: option } : known;
  };
sellerSelect.$known.on(
  editTriggered,
  withScopeOf((r) => r.seller),
);
categorySelect.$known.on(
  editTriggered,
  withScopeOf((r) => r.category),
);
catalogItemSelect.$known.on(
  editTriggered,
  withScopeOf((r) => r.catalogItem),
);
listingSelect.$known.on(
  editTriggered,
  withScopeOf((r) => r.listing),
);

sample({ clock: opened, target: disclosure.opened });

// ── Сохранение ──

export const createFx = attach({
  source: form.$formValues,
  effect: (values: FormValues) => api.priceRule.create(toPayload(values)),
});

export const updateFx = attach({
  source: { values: form.$formValues, editing: $editing },
  effect: ({ values, editing }) => {
    if (!editing) throw new Error('No price rule');
    return api.priceRule.update(editing.id, toPayload(values));
  },
});

export const deleteFx = createEffect((rule: PriceRule) => api.priceRule.remove(rule.id));

sample({ clock: deleteRequested, target: deleteFx });

export const $mutating = or(createFx.pending, updateFx.pending);
export const mutated = merge([createFx.done, updateFx.done, deleteFx.done]);

split({
  source: validated,
  match: $mode,
  cases: {
    create: createFx,
    edit: updateFx,
  },
});

sample({
  clock: [reset, createFx.done, updateFx.done],
  target: disclosure.closed,
});

sample({
  clock: delay(disclosure.closed, 100),
  target: [form.resetFx.prepend(() => DEFAULT_VALUES), $editing.reinit, $mode.reinit],
});

message({
  clock: merge([createFx.done, updateFx.done]),
  type: 'success',
  content: 'Правило сохранено — цены пересчитаны',
});
message({ clock: deleteFx.done, type: 'success', content: 'Правило удалено' });
message({ clock: merge([createFx.failData, updateFx.failData, deleteFx.failData]), errorHandle: true });
