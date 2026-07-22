import { createEvent, restore, sample, type Event } from 'effector';
import { debounce } from 'patronum';

export const textFactory = ({ reset }: { reset?: Event<unknown> } = {}) => {
  const changed = createEvent<string>();
  const debouncedChanged = debounce(changed, 300);
  const $value = restore(changed, '');

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
