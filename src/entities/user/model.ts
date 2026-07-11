import type { RouteInstance, RouteParams, RouteParamsAndQuery } from 'atomic-router';
import { chainRoute } from 'atomic-router';
import type { EventCallable } from 'effector';
import { createEffect, createEvent, createStore, merge, sample, split } from 'effector';
import { condition, reshape } from 'patronum';

import { api } from '@/shared/api';
import type { Role, User } from '@/shared/api';
import { routes } from '@/shared/config/routing';

// erasableSyntaxOnly запрещает enum — используем const-объект + union.
export const SessionStatus = {
  Initial: 'Initial',
  Pending: 'Pending',
  Authorized: 'Authorized',
  UnAuthorized: 'UnAuthorized',
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const loggedIn = createEvent<User>();
export const loggedOut = createEvent();

export const $session = createStore<SessionStatus>(SessionStatus.Initial);

export const sessionStatus = reshape({
  source: $session,
  shape: {
    $isInitial: (status) => status === SessionStatus.Initial,
    $isAuthorized: (status) => status === SessionStatus.Authorized,
    $isUnAuthorized: (status) => status === SessionStatus.UnAuthorized,
  },
});

export const $user = createStore<User | null>(null);
export const $role = $user.map((user) => user?.role ?? null);

/** whoami: GET /admin/auth/me (401 если сессии нет). */
export const sessionFx = createEffect<void, User>(() => api.auth.getMe());

export const authorized = sessionFx.doneData;
export const notAuthorized = sessionFx.failData;

$user
  .on(sessionFx.doneData, (_, user) => user)
  .on(loggedIn, (_, user) => user)
  .reset(loggedOut);

$session.on(loggedIn, () => SessionStatus.Authorized).reset(loggedOut);

sample({
  clock: sessionFx,
  filter: sessionStatus.$isInitial,
  fn: () => SessionStatus.Pending,
  target: $session,
});

sample({
  clock: authorized,
  fn: () => SessionStatus.Authorized,
  target: $session,
});

sample({
  clock: notAuthorized,
  fn: () => SessionStatus.UnAuthorized,
  target: $session,
});

type ChainOptions<Params extends RouteParams> = {
  route: RouteInstance<Params>;
  otherwise?: EventCallable<void>;
  roles?: Role[];
};

export const chainAuthorized = <Params extends RouteParams>({ route, otherwise, roles }: ChainOptions<Params>) => {
  const authCheckStarted = createEvent<RouteParamsAndQuery<Params>>();
  const authCheckFailed = createEvent();
  const roleCheckFailed = createEvent();

  const roleAndAuthCheckDone = createEvent();

  const { alreadyAuthorized, alreadyAnonymous } = split(sample({ clock: authCheckStarted, source: sessionStatus }), {
    alreadyAuthorized: (session) => session.$isAuthorized,
    alreadyAnonymous: (status) => status.$isUnAuthorized,
  });

  const authCheckDone = merge([alreadyAuthorized, authorized]);

  condition({
    source: authCheckDone,
    if: $role.map((currentRole) => {
      if (!currentRole) {
        return false;
      }
      if (!roles) {
        return true;
      }
      return roles.includes(currentRole);
    }),
    then: roleAndAuthCheckDone,
    else: roleCheckFailed,
  });

  sample({
    clock: authCheckStarted,
    filter: sessionStatus.$isInitial,
    target: sessionFx,
  });

  sample({
    clock: [alreadyAnonymous, notAuthorized],
    filter: route.$isOpened,
    target: authCheckFailed,
  });

  if (otherwise) {
    sample({
      clock: authCheckFailed,
      target: otherwise,
    });
  } else {
    sample({
      clock: [alreadyAnonymous, notAuthorized],
      filter: route.$isOpened,
      target: routes.auth.open,
    });
  }

  sample({
    clock: roleCheckFailed,
    target: routes.forbidden.open,
  });

  return chainRoute({
    route,
    beforeOpen: authCheckStarted,
    openOn: roleAndAuthCheckDone,
    cancelOn: [authCheckFailed, roleCheckFailed],
  });
};

export const chainAnonymous = <Params extends RouteParams>({ route, otherwise }: ChainOptions<Params>) => {
  const authCheckStarted = createEvent<RouteParamsAndQuery<Params>>();
  const authCheckDone = createEvent();

  const { alreadyAuthorized, alreadyAnonymous } = split(sample({ clock: authCheckStarted, source: sessionStatus }), {
    alreadyAuthorized: (session) => session.$isAuthorized,
    alreadyAnonymous: (session) => session.$isUnAuthorized,
  });

  sample({
    clock: authCheckStarted,
    filter: sessionStatus.$isInitial,
    target: sessionFx,
  });

  sample({
    clock: [alreadyAuthorized, authorized],
    filter: route.$isOpened,
    target: authCheckDone,
  });

  if (otherwise) {
    sample({ clock: authCheckDone, target: otherwise });
  } else {
    sample({ clock: authCheckDone, target: routes.home.open });
  }

  return chainRoute({
    route,
    beforeOpen: authCheckStarted,
    openOn: [alreadyAnonymous, notAuthorized],
    cancelOn: authCheckDone,
  });
};
