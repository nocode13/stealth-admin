import { createEffect, createEvent, createStore, merge, sample } from 'effector';

import { api, type BotLinkSession, type SellerStaff } from '@/shared/api';
import { createDisclosure } from '@/shared/lib/disclosure';
import { message } from '@/shared/lib/message';

/**
 * Привязка Telegram сотруднику — ссылкой/QR, а не его собственным входом в
 * админку: пароль ему можно вообще не заводить. Пока он не привязался, заказы
 * ему в бота не приходят, остальным по команде — приходят.
 *
 * Результат привязки виден только в чате бота, поллинга нет — после привязки
 * список обновляется кнопкой (тот же компромисс, что и у самопривязки в сайдбаре).
 */
export type InviteTarget = { sellerId: string; staff: SellerStaff };

export const inviteTriggered = createEvent<InviteTarget>();
export const closed = createEvent();
export const unlinkTriggered = createEvent<InviteTarget>();

export const disclosure = createDisclosure();

const inviteFx = createEffect(({ sellerId, staff }: InviteTarget) => api.sellers.staff.invite(sellerId, staff.id));

const unlinkFx = createEffect(({ sellerId, staff }: InviteTarget) => api.sellers.staff.unlink(sellerId, staff.id));

export const $session = createStore<BotLinkSession | null>(null)
  .on(inviteFx.doneData, (_, session) => session)
  .reset(closed);

export const $staff = createStore<SellerStaff | null>(null)
  .on(inviteTriggered, (_, { staff }) => staff)
  .reset(closed);

export const $pending = inviteFx.pending;
export const $unlinking = unlinkFx.pending;

/** Любая привязка/отвязка меняет команду — по этому событию список перезапрашивается. */
export const mutated = merge([unlinkFx.done, closed]);

sample({ clock: inviteTriggered, target: [inviteFx, disclosure.opened] });
sample({ clock: closed, target: disclosure.closed });
sample({ clock: unlinkTriggered, target: unlinkFx });

message({ clock: unlinkFx.doneData, type: 'success', content: 'Telegram отвязан' });
message({ clock: merge([inviteFx.failData, unlinkFx.failData]), errorHandle: true });
