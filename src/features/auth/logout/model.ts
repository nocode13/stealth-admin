import { createEffect, createEvent, sample } from 'effector';

import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import { routes } from '@/shared/config/routing';

export const triggered = createEvent();
const logoutFx = createEffect(() => api.auth.logout());

export const $mutating = logoutFx.pending;

sample({ clock: triggered, target: logoutFx });

sample({
  clock: logoutFx.finally,
  target: [userModel.loggedOut, routes.auth.open],
});
