import { attach, createEffect, createEvent, createStore, sample } from 'effector';
import { z } from 'zod/v4';

import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import type { MarkupTier, PlatformSettings } from '@/shared/api';
import { toSum, toTiyin } from '@/shared/lib/currency/currency';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';
import { createForm } from '@/shared/lib/form';
import { message } from '@/shared/lib/message';

// Пустое поле = «порога нет», а не 0 — z.coerce.number() иначе молча превратил бы
// пустую строку в 0 (Number('') === 0), а не в null.
const thresholdSchema = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.union([z.null(), z.coerce.number().min(0, 'Не может быть отрицательным')]),
);

export const MAX_TIERS = 20;

// Ступень наценки: в UI — «от, сум» и проценты, в API — тиины и базисные пункты (20% = 2000).
const tierSchema = z.object({
  fromSum: z.coerce.number({ error: 'Укажите границу' }).min(0, 'Не может быть отрицательной'),
  percent: z.coerce
    .number({ error: 'Укажите наценку' })
    .min(0, 'Не может быть отрицательной')
    .max(1000, 'Не больше 1000%'),
});

export const schema = z.object({
  deliveryFee: z.coerce.number().min(0, 'Не может быть отрицательным'),
  freeDeliveryThreshold: thresholdSchema,
  // Зеркало проверок бэкенда (PricingService.updateSettings): первая ступень с 0, границы по возрастанию.
  markupTiers: z
    .array(tierSchema)
    .min(1, 'Нужна хотя бы одна ступень')
    .max(MAX_TIERS, `Не больше ${MAX_TIERS} ступеней`)
    .superRefine((tiers, ctx) => {
      if (tiers[0] && tiers[0].fromSum !== 0) {
        ctx.addIssue({ code: 'custom', path: [0, 'fromSum'], message: 'Первая ступень — с 0' });
      }
      tiers.forEach((tier, index) => {
        if (index > 0 && tier.fromSum <= tiers[index - 1].fromSum) {
          ctx.addIssue({ code: 'custom', path: [index, 'fromSum'], message: 'Больше предыдущей границы' });
        }
      });
    }),
  // В UI — сумы, в API — тиины.
  priceRoundingStep: z.coerce.number().min(0.01, 'Минимум 0,01 сум'),
});

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = {
  deliveryFee: 0,
  freeDeliveryThreshold: null,
  markupTiers: [{ fromSum: 0, percent: 20 }],
  priceRoundingStep: 1,
};

const toBps = (percent: number) => Math.round(Number(percent) * 100);

const toMarkupTiers = (tiers: FormValues['markupTiers']): MarkupTier[] =>
  tiers.map((tier) => ({ minCost: toTiyin(Number(tier.fromSum)), markupBps: toBps(tier.percent) }));

const sameTiers = (a: MarkupTier[], b: MarkupTier[]) =>
  a.length === b.length && a.every((tier, i) => tier.minCost === b[i].minCost && tier.markupBps === b[i].markupBps);

export const form = createForm<FormValues>();

export const validated = createEvent();

const toFormValues = (settings: PlatformSettings): FormValues => ({
  deliveryFee: toSum(settings.deliveryFee),
  freeDeliveryThreshold: settings.freeDeliveryThreshold === null ? null : toSum(settings.freeDeliveryThreshold),
  markupTiers: settings.markupTiers.map((tier) => ({ fromSum: toSum(tier.minCost), percent: tier.markupBps / 100 })),
  priceRoundingStep: toSum(settings.priceRoundingStep),
});

export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({
    route,
    roles: ['SUPER_ADMIN'],
  });

  const fetchFx = createEffect(() => api.settings.get());

  const $settings = createStore<PlatformSettings | null>(null);

  const updateFx = attach({
    source: { values: form.$formValues, settings: $settings },
    effect: ({ values, settings }) => {
      const markupTiers = toMarkupTiers(values.markupTiers);
      const priceRoundingStep = toTiyin(Number(values.priceRoundingStep));
      // Ступени и округление шлём только если они изменились: их смена пересчитывает
      // цены всей витрины на бэкенде, правка тарифа доставки этого делать не должна.
      return api.settings.update({
        deliveryFee: toTiyin(values.deliveryFee),
        freeDeliveryThreshold: values.freeDeliveryThreshold === null ? null : toTiyin(values.freeDeliveryThreshold),
        markupTiers: settings && sameTiers(markupTiers, settings.markupTiers) ? undefined : markupTiers,
        priceRoundingStep: priceRoundingStep !== settings?.priceRoundingStep ? priceRoundingStep : undefined,
      });
    },
  });

  $settings.on(fetchFx.doneData, (_, settings) => settings).on(updateFx.doneData, (_, settings) => settings);

  sample({ clock: authorizedRoute.opened, target: fetchFx });
  sample({ clock: validated, target: updateFx });

  sample({
    clock: [fetchFx.doneData, updateFx.doneData],
    fn: toFormValues,
    target: form.resetFx,
  });

  sample({ clock: authorizedRoute.closed, target: $settings.reinit });

  message({ clock: updateFx.done, type: 'success', content: 'Настройки сохранены' });
  message({ clock: updateFx.failData, errorHandle: true });
  message({ clock: fetchFx.failData, errorHandle: true });

  return {
    $settings,
    $pending: fetchFx.pending,
    $saving: updateFx.pending,
    validated,
  };
};
