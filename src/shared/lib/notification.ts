import { notification as antNotification } from 'antd';
import type { Event, Store, Unit } from 'effector';
import { attach, sample } from 'effector';
import { createGate, useGate } from 'effector-react';

import { getApiErrorMessage } from '@/shared/api';

type NotificationInstance = ReturnType<typeof antNotification.useNotification>[0];
type NotificationArgs = Parameters<NotificationInstance['open']>[0];

type NotificationWithFn<T> = {
  clock: Unit<T> | Event<T>;
  fn: (payload: T) => NotificationArgs;
  errorHandle?: false;
};

type NotificationWithError = {
  clock: Unit<Error> | Event<Error>;
  errorHandle: true;
  /** Фолбэк-текст, если из ошибки не удалось достать сообщение. */
  content?: string;
  title?: NotificationArgs['title'];
  description?: NotificationArgs['description'];
};

type NotificationStatic<T> = {
  clock: Unit<T> | Event<T>;
  fn?: undefined;
  errorHandle?: false;
  type?: NotificationArgs['type'];
  title: NotificationArgs['title'];
  description: NotificationArgs['description'];
};

type NotificationProps<T> = NotificationWithFn<T> | NotificationWithError | NotificationStatic<T>;

const NotificationGate = createGate<{ notificationApi: NotificationInstance }>();

/** Связывает antd notification-инстанс с effector-стором. Вызывать в корне app, рендерить contextHolder. */
export const useBindNotificationApi = () => {
  const [notificationApi, contextHolder] = antNotification.useNotification();
  useGate(NotificationGate, { notificationApi });
  return contextHolder;
};

export const $notificationApi = NotificationGate.state.map(
  (state) => state.notificationApi ?? null,
) as Store<NotificationInstance | null>;

const showNotificationFx = attach({
  source: $notificationApi,
  effect: (notificationApi, args: NotificationArgs) => {
    notificationApi?.open(args);
  },
});

export const notification = <T>(props: NotificationProps<T>) => {
  if (isWithError(props)) {
    sample({
      clock: props.clock,
      fn: (error): NotificationArgs => ({
        type: 'error',
        title: props.title || 'Что то пошло не так',
        description: getApiErrorMessage(error, props.content) || props.description,
      }),
      target: showNotificationFx,
    });
    return;
  }

  if (isWithFn(props)) {
    sample({ clock: props.clock, fn: props.fn, target: showNotificationFx });
    return;
  }

  sample({
    clock: props.clock,
    fn: (): NotificationArgs => ({
      type: props.type,
      title: props.title || 'Что то пошло не так',
      description: props.description,
    }),
    target: showNotificationFx,
  });
};

function isWithError<T>(props: NotificationProps<T>): props is NotificationWithError {
  return 'errorHandle' in props && !!props.errorHandle;
}

function isWithFn<T>(props: NotificationProps<T>): props is NotificationWithFn<T> {
  return typeof (props as NotificationWithFn<T>).fn === 'function';
}
