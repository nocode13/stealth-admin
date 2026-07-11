import { message as antMessage } from 'antd';
import type { Event, Store, Unit } from 'effector';
import { attach, sample } from 'effector';
import { createGate, useGate } from 'effector-react';

import { getApiErrorMessage } from '@/shared/api';

type MessageInstance = ReturnType<typeof antMessage.useMessage>[0];
type MessageArgs = Parameters<MessageInstance['open']>[0];

type MessageWithFn<T> = {
  clock: Unit<T> | Event<T>;
  fn: (payload: T) => MessageArgs;
  errorHandle?: false;
};

type MessageWithError = {
  clock: Unit<Error> | Event<Error>;
  errorHandle: true;
  /** Фолбэк-текст, если из ошибки не удалось достать сообщение. */
  content?: string;
};

type MessageStatic<T> = {
  clock: Unit<T> | Event<T>;
  fn?: undefined;
  errorHandle?: false;
  type?: MessageArgs['type'];
  content: MessageArgs['content'];
};

type MessageProps<T> = MessageWithFn<T> | MessageWithError | MessageStatic<T>;

const MessageGate = createGate<{ messageApi: MessageInstance }>();

/** Связывает antd message-инстанс с effector-стором. Вызывать в корне app, рендерить contextHolder. */
export const useBindMessageApi = () => {
  const [messageApi, contextHolder] = antMessage.useMessage();
  useGate(MessageGate, { messageApi });
  return contextHolder;
};

export const $messageApi = MessageGate.state.map((state) => state.messageApi ?? null) as Store<MessageInstance | null>;

const showMessageFx = attach({
  source: $messageApi,
  effect: (messageApi, args: MessageArgs) => {
    messageApi?.open(args);
  },
});

export const message = <T>(props: MessageProps<T>) => {
  if (isWithError(props)) {
    sample({
      clock: props.clock,
      fn: (error): MessageArgs => ({
        type: 'error',
        content: getApiErrorMessage(error, props.content),
      }),
      target: showMessageFx,
    });
    return;
  }

  if (isWithFn(props)) {
    sample({ clock: props.clock, fn: props.fn, target: showMessageFx });
    return;
  }

  sample({
    clock: props.clock,
    fn: (): MessageArgs => ({ type: props.type, content: props.content }),
    target: showMessageFx,
  });
};

function isWithError<T>(props: MessageProps<T>): props is MessageWithError {
  return 'errorHandle' in props && !!props.errorHandle;
}

function isWithFn<T>(props: MessageProps<T>): props is MessageWithFn<T> {
  return typeof (props as MessageWithFn<T>).fn === 'function';
}
