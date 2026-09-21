import { attach, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { createQuery } from 'effector-refetch';
import { debounce, delay } from 'patronum';
import { z } from 'zod/v4';

import { api, type BroadcastAudienceCount, type Customer, type LocalizedText } from '@/shared/api';
import { createDisclosure } from '@/shared/lib/disclosure';
import { createForm } from '@/shared/lib/form';
import { htmlToText } from '@/shared/lib/html';
import { message } from '@/shared/lib/message';

/** Лимиты — зеркало `stealth-backend/src/broadcasts/dto/broadcast.dto.ts`. */
export const TITLE_MAX = 100;
export const BODY_TEXT_MAX = 3500;
export const BUTTON_TEXT_MAX = 40;

const optionalText = (max: number) => z.string().max(max, `Максимум ${max} символов`).optional();
// Лимит тела — по тексту без разметки, как считает бэкенд.
const bodyText = z.string().refine((html) => htmlToText(html).length <= BODY_TEXT_MAX, {
  message: `Максимум ${BODY_TEXT_MAX} символов`,
});

export const schema = z
  .object({
    titleRu: z.string().trim().min(1, 'Введите заголовок').max(TITLE_MAX, `Максимум ${TITLE_MAX} символов`),
    titleUz: optionalText(TITLE_MAX),
    titleEn: optionalText(TITLE_MAX),
    bodyRu: bodyText.refine((html) => htmlToText(html).length > 0, { message: 'Введите текст' }),
    bodyUz: bodyText.optional(),
    bodyEn: bodyText.optional(),
    buttonTextRu: optionalText(BUTTON_TEXT_MAX),
    buttonTextUz: optionalText(BUTTON_TEXT_MAX),
    buttonTextEn: optionalText(BUTTON_TEXT_MAX),
    buttonUrl: z.union([z.literal(''), z.url({ protocol: /^https?$/, error: 'Ссылка вида https://…' })]).optional(),
    sendPush: z.boolean(),
    sendTelegram: z.boolean(),
    audience: z.enum(['ALL', 'SELECTED']),
    recipientIds: z.array(z.string()),
  })
  .superRefine((values, ctx) => {
    if (!values.sendPush && !values.sendTelegram) {
      ctx.addIssue({ code: 'custom', path: ['sendTelegram'], message: 'Выберите хотя бы один канал' });
    }
    if (values.audience === 'SELECTED' && values.recipientIds.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['recipientIds'], message: 'Выберите получателей' });
    }
    // Кнопка — только целиком: текст без ссылки и ссылка без текста бессмысленны.
    const hasButtonText = !!values.buttonTextRu?.trim();
    if (values.buttonUrl && !hasButtonText) {
      ctx.addIssue({ code: 'custom', path: ['buttonTextRu'], message: 'Введите текст кнопки' });
    }
    if (hasButtonText && !values.buttonUrl) {
      ctx.addIssue({ code: 'custom', path: ['buttonUrl'], message: 'Введите ссылку кнопки' });
    }
  });

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = {
  titleRu: '',
  titleUz: '',
  titleEn: '',
  bodyRu: '',
  bodyUz: '',
  bodyEn: '',
  buttonTextRu: '',
  buttonTextUz: '',
  buttonTextEn: '',
  buttonUrl: '',
  sendPush: true,
  sendTelegram: true,
  audience: 'ALL',
  recipientIds: [],
};

/** Пустые UZ/EN не отправляем — бэкенд подставит RU. */
const localized = (ru: string, uz?: string, en?: string): LocalizedText => ({
  RU: ru.trim(),
  ...(uz?.trim() ? { UZ: uz.trim() } : {}),
  ...(en?.trim() ? { EN: en.trim() } : {}),
});

// HTML пустого редактора — '' (см. RichTextField), но на всякий случай режем и документ без текста.
const localizedHtml = (ru: string, uz?: string, en?: string): LocalizedText => ({
  RU: ru,
  ...(uz && htmlToText(uz) ? { UZ: uz } : {}),
  ...(en && htmlToText(en) ? { EN: en } : {}),
});

const toAudience = (values: FormValues) => ({
  audience: values.audience,
  recipientIds: values.audience === 'SELECTED' ? values.recipientIds : undefined,
});

export const form = createForm<FormValues>();

export const disclosure = createDisclosure();

export const createTriggered = createEvent();
export const reset = createEvent();
/** Форма прошла валидацию → считаем аудиторию и спрашиваем подтверждение. */
export const validated = createEvent();
export const confirmed = createEvent();
export const confirmCancelled = createEvent();
export const customersSearchChanged = createEvent<string>();

/** Не null — открыт диалог подтверждения с этими цифрами. */
export const $audienceCount = createStore<BroadcastAudienceCount | null>(null);

export const $customersSearch = restore(customersSearchChanged, '');
export const $customers = createStore<Customer[]>([]);
/**
 * Все когда-либо найденные покупатели по id: выбранные должны сохранять подпись в Select,
 * даже когда следующий поиск их уже не возвращает.
 */
export const $knownCustomers = createStore<Record<string, Customer>>({});

const fetchCustomersQuery = createQuery({
  effect: createEffect((search: string) => api.customer.findAll({ limit: 50, search: search || undefined })),
  concurrency: 'TAKE_LATEST',
});

export const $customersFetching = fetchCustomersQuery.$pending;

export const audienceCountFx = attach({
  source: form.$formValues,
  effect: (values: FormValues) => api.broadcast.audienceCount(toAudience(values)),
});

export const createFx = attach({
  source: form.$formValues,
  effect: (values: FormValues) => {
    const withButton = !!values.buttonUrl && !!values.buttonTextRu?.trim();
    return api.broadcast.create({
      ...toAudience(values),
      title: localized(values.titleRu, values.titleUz, values.titleEn),
      body: localizedHtml(values.bodyRu, values.bodyUz, values.bodyEn),
      sendPush: values.sendPush,
      sendTelegram: values.sendTelegram,
      buttonText: withButton
        ? localized(values.buttonTextRu ?? '', values.buttonTextUz, values.buttonTextEn)
        : undefined,
      buttonUrl: withButton ? values.buttonUrl : undefined,
    });
  },
});

export const $pending = audienceCountFx.pending;
export const $sending = createFx.pending;
export const mutated = createFx.done;

sample({ clock: createTriggered, target: disclosure.opened });

// Первая страница покупателей — сразу при открытии, дальше — серверный поиск.
sample({
  clock: createTriggered,
  fn: () => '',
  target: fetchCustomersQuery.start,
});

sample({
  clock: debounce(customersSearchChanged, 300),
  target: fetchCustomersQuery.start,
});

sample({
  clock: fetchCustomersQuery.finished.done,
  fn: ({ result }) => result.data.items,
  target: $customers,
});

$knownCustomers.on(fetchCustomersQuery.finished.done, (known, { result }) => ({
  ...known,
  ...Object.fromEntries(result.data.items.map((c) => [c.id, c])),
}));

sample({ clock: validated, target: audienceCountFx });
sample({ clock: audienceCountFx.doneData, target: $audienceCount });

sample({ clock: confirmed, target: createFx });
sample({ clock: [confirmCancelled, createFx.finally], target: $audienceCount.reinit });

sample({
  clock: [reset, mutated],
  target: disclosure.closed,
});

sample({
  clock: delay(disclosure.closed, 100),
  target: [
    form.resetFx.prepend(() => DEFAULT_VALUES),
    $audienceCount.reinit,
    $customersSearch.reinit,
    $customers.reinit,
  ],
});

message({ clock: createFx.done, type: 'success', content: 'Рассылка запущена' });
message({
  clock: fetchCustomersQuery.finished.fail.map(({ error }) => error),
  errorHandle: true,
});
message({ clock: audienceCountFx.failData, errorHandle: true });
message({ clock: createFx.failData, errorHandle: true });
