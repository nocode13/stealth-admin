import { createEvent, restore, sample, type Event } from 'effector';
import { debounce } from 'patronum';

export const numberFactory = ({ reset }: { reset?: Event<unknown> } = {}) => {
  const changed = createEvent<number | null>();
  const debouncedChanged = debounce(changed, 300);
  const $value = restore(changed, null);

  if (reset) {
    sample({
      clock: reset,
      target: $value.reinit,
    });
  }

  return {
    $value,
    changed,
    debouncedChanged,
  };
};
