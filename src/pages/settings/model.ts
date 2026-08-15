import { attach, createEffect, createEvent, createStore, sample } from 'effector';
import { z } from 'zod/v4';

import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import type { PlatformSettings } from '@/shared/api';
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

export const schema = z.object({
  deliveryFee: z.coerce.number().min(0, 'Не может быть отрицательным'),
  freeDeliveryThreshold: thresholdSchema,
});

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = {
  deliveryFee: 0,
  freeDeliveryThreshold: null,
};

export const form = createForm<FormValues>();

export const validated = createEvent();

const toFormValues = (settings: PlatformSettings): FormValues => ({
  deliveryFee: toSum(settings.deliveryFee),
  freeDeliveryThreshold: settings.freeDeliveryThreshold === null ? null : toSum(settings.freeDeliveryThreshold),
});

export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({
    route,
    roles: ['SUPER_ADMIN'],
  });

  const fetchFx = createEffect(() => api.settings.get());

  const updateFx = attach({
    source: form.$formValues,
    effect: (values: FormValues) =>
      api.settings.update({
        deliveryFee: toTiyin(values.deliveryFee),
        freeDeliveryThreshold: values.freeDeliveryThreshold === null ? null : toTiyin(values.freeDeliveryThreshold),
      }),
  });

  const $settings = createStore<PlatformSettings | null>(null)
    .on(fetchFx.doneData, (_, settings) => settings)
    .on(updateFx.doneData, (_, settings) => settings);

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
