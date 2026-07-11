import { createEffect, createEvent, sample } from 'effector';
import { z } from 'zod/v4';

import { userModel } from '@/entities/user';
import { api } from '@/shared/api';
import { routes } from '@/shared/config/routing';
import { createForm } from '@/shared/lib/form';
import { message } from '@/shared/lib/message';

export const schema = z.object({
  email: z.email('Неверный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
});

export type FormValues = z.infer<typeof schema>;

export const DEFAULT_VALUES: FormValues = { email: '', password: '' };

export const form = createForm<FormValues>();

export const validated = createEvent();

export const loginFx = createEffect((values: FormValues) => api.auth.login(values));

export const $mutating = loginFx.pending;

sample({
  clock: validated,
  source: form.$formValues,
  target: loginFx,
});

sample({ clock: loginFx.doneData, target: userModel.loggedIn });
sample({ clock: loginFx.done, target: routes.home.open });

message({
  clock: loginFx.failData,
  errorHandle: true,
  content: 'Неверный email или пароль',
});
