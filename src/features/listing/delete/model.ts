import { attach, createEvent, sample } from 'effector';

import type { Listing } from '@/entities/listing';
import { api } from '@/shared/api';
import { message } from '@/shared/lib/message';

export const deleteTriggered = createEvent<Listing>();
export const mutated = createEvent<Listing>();

export const deleteFx = attach({
  effect: (item: Listing) => api.listing.remove(item.id).then(() => item),
});

export const $mutating = deleteFx.pending;

sample({ clock: deleteTriggered, target: deleteFx });
sample({ clock: deleteFx.doneData, target: mutated });

message({ clock: mutated, type: 'success', content: 'Позиция удалена' });
message({ clock: deleteFx.fail.map(({ error }) => error), errorHandle: true });
