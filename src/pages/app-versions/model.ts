import { attach, combine, createEffect, createEvent, createStore, sample } from 'effector';
import { z } from 'zod/v4';

import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import type { AppPlatform, AppVersion } from '@/shared/api';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';
import { createForm } from '@/shared/lib/form';
import { message } from '@/shared/lib/message';

export const PLATFORMS: { value: AppPlatform; label: string }[] = [
  { value: 'ANDROID', label: 'Android (Play Market)' },
  { value: 'IOS', label: 'iOS (App Store)' },
];

// Тот же формат, что валидирует бэкенд: "1", "1.0", "1.0.21", "1.0.21.4".
const versionSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+){0,3}$/, 'Формат версии: 1.0.21');

export const schema = z
  .object({
    latestVersion: versionSchema,
    minSupportedVersion: versionSchema,
    storeUrl: z.url('Нужна полная ссылка со схемой https://'),
    releaseNotesRu: z.string().max(500),
    releaseNotesUz: z.string().max(500),
    releaseNotesEn: z.string().max(500),
    enabled: z.boolean(),
  })
  // Минимальная версия выше актуальной заблокировала бы всех пользователей кнопкой,
  // ведущей на версию, которой в сторе нет. Бэкенд такое тоже игнорирует, но ошибку
  // лучше показать здесь — иначе поле молча не работает.
  .refine((v) => compareVersions(v.minSupportedVersion, v.latestVersion) <= 0, {
    path: ['minSupportedVersion'],
    message: 'Не может быть выше актуальной версии',
  });

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = {
  latestVersion: '',
  minSupportedVersion: '',
  storeUrl: '',
  releaseNotesRu: '',
  releaseNotesUz: '',
  releaseNotesEn: '',
  enabled: true,
};

export const form = createForm<FormValues>();

export const validated = createEvent();

const toFormValues = (version: AppVersion): FormValues => ({
  latestVersion: version.latestVersion,
  minSupportedVersion: version.minSupportedVersion,
  storeUrl: version.storeUrl,
  // null в поле ввода antd превратился бы в неконтролируемый инпут; на бэкенд пустая
  // строка уедет обратно как null (`emptyToNull` в AppVersionService).
  releaseNotesRu: version.releaseNotesRu ?? '',
  releaseNotesUz: version.releaseNotesUz ?? '',
  releaseNotesEn: version.releaseNotesEn ?? '',
  enabled: version.enabled,
});

export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({
    route,
    roles: ['SUPER_ADMIN'],
  });

  const platformChanged = createEvent<AppPlatform>();

  const fetchFx = createEffect(() => api.appVersions.list());

  const $versions = createStore<AppVersion[]>([]).on(fetchFx.doneData, (_, versions) => versions);
  const $platform = createStore<AppPlatform>('ANDROID').on(platformChanged, (_, platform) => platform);

  const $current = combine(
    $versions,
    $platform,
    (versions, platform) => versions.find((v) => v.platform === platform) ?? null,
  );

  const updateFx = attach({
    source: { values: form.$formValues, platform: $platform },
    effect: ({ values, platform }: { values: FormValues; platform: AppPlatform }) =>
      api.appVersions.update(platform, {
        latestVersion: values.latestVersion.trim(),
        minSupportedVersion: values.minSupportedVersion.trim(),
        storeUrl: values.storeUrl.trim(),
        releaseNotesRu: values.releaseNotesRu,
        releaseNotesUz: values.releaseNotesUz,
        releaseNotesEn: values.releaseNotesEn,
        enabled: values.enabled,
      }),
  });

  $versions.on(updateFx.doneData, (versions, updated) =>
    versions.map((v) => (v.platform === updated.platform ? updated : v)),
  );

  sample({ clock: authorizedRoute.opened, target: fetchFx });
  sample({ clock: validated, target: updateFx });

  // Форма одна на обе платформы, поэтому её надо перезаполнять и после загрузки, и на
  // каждое переключение вкладки — иначе в iOS-вкладке остались бы android-значения.
  // Клок — сам $current, а не список событий: он уже сводит оба источника (загрузка и
  // смена вкладки) в одно обновление, и не приходится гадать про порядок .on/sample.
  sample({
    clock: $current,
    filter: (current): current is AppVersion => current !== null,
    fn: toFormValues,
    target: form.resetFx,
  });

  sample({
    clock: authorizedRoute.closed,
    target: [$versions.reinit, $platform.reinit],
  });

  message({ clock: updateFx.done, type: 'success', content: 'Версии сохранены' });
  message({ clock: updateFx.failData, errorHandle: true });
  message({ clock: fetchFx.failData, errorHandle: true });

  return {
    $current,
    $platform,
    $pending: fetchFx.pending,
    $saving: updateFx.pending,
    platformChanged,
    validated,
  };
};

/** Посегментное сравнение; невалидные строки отсекает regex до вызова. */
function compareVersions(a: string, b: string): number {
  const left = a.trim().split('.').map(Number);
  const right = b.trim().split('.').map(Number);
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}
