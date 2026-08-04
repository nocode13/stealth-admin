import { createEffect, createEvent, sample } from 'effector';

import { api, type SellerStaff } from '@/shared/api';
import { message } from '@/shared/lib/message';

/** Владельца бэкенд удалять не даёт (400) — кнопку у него не показываем. */
export type DeleteTarget = { sellerId: string; staff: SellerStaff };

export const deleteTriggered = createEvent<DeleteTarget>();
export const mutated = createEvent<DeleteTarget>();

export const deleteFx = createEffect((target: DeleteTarget) =>
  api.sellers.staff.remove(target.sellerId, target.staff.id).then(() => target),
);

export const $mutating = deleteFx.pending;

sample({ clock: deleteTriggered, target: deleteFx });
sample({ clock: deleteFx.doneData, target: mutated });

message({ clock: mutated, type: 'success', content: 'Сотрудник удалён' });
message({ clock: deleteFx.failData, errorHandle: true });
