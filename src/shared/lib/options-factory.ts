import { createEvent, restore, sample, type Event } from 'effector';

export const optionsFactory = <T extends string | number>({ reset }: { reset?: Event<unknown> } = {}) => {
  const changed = createEvent<T | null>();
  const $value = restore(changed, null);

  if (reset) {
    sample({
      clock: reset,
      target: $value.reinit,
    });
  }

  return {
    changed,
    $value,
  };
};
