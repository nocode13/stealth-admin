import { createEffect, createEvent, createStore, sample } from 'effector';

import { userModel } from '@/entities/user';
import { api, type BotLinkSession } from '@/shared/api';
import { createDisclosure } from '@/shared/lib/disclosure';
import { message } from '@/shared/lib/message';

/**
 * Привязка Telegram к аккаунту продавца. Без неё заказы приходят только в админку:
 * бот не знает, кому писать, потому что вход сюда по email/паролю, а не через Telegram.
 *
 * После привязки продавец получает заказ в чат и может менять статусы прямо там
 * (кнопки в карточке заказа), не открывая админку.
 */
export const triggered = createEvent();
export const closed = createEvent();

export const disclosure = createDisclosure();

const createLinkFx = createEffect(() => api.auth.linkTelegram());

export const $session = createStore<BotLinkSession | null>(null)
  .on(createLinkFx.doneData, (_, session) => session)
  .reset(closed);

export const $pending = createLinkFx.pending;

/**
 * Уже привязан — вместо кнопки показываем статус. Смотрим именно
 * `staffTelegramId`: `telegramId` — это адрес покупателя в основном боте, у
 * продавца он обычно пустой и к заказам в кабинете отношения не имеет.
 */
export const $isLinked = userModel.$user.map((user) => !!user?.staffTelegramId);

sample({ clock: triggered, target: [createLinkFx, disclosure.opened] });
sample({ clock: closed, target: disclosure.closed });

// 409 «Telegram занят другим аккаунтом» приходит с бэка — показываем как есть.
message({ clock: createLinkFx.failData, errorHandle: true });

export const unlinkTriggered = createEvent();

const unlinkFx = createEffect(() => api.auth.unlinkTelegram());

export const $unlinking = unlinkFx.pending;

sample({ clock: unlinkTriggered, target: unlinkFx });
sample({ clock: unlinkFx.doneData, target: userModel.updated });

message({ clock: unlinkFx.doneData, type: 'success', content: 'Telegram отвязан' });
message({ clock: unlinkFx.fail.map(({ error }) => error), errorHandle: true });
