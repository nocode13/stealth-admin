import { attach, createEvent, sample } from 'effector';

import type { CatalogItem } from '@/entities/catalog';
import { api } from '@/shared/api';
import { message } from '@/shared/lib/message';

export const deleteTriggered = createEvent<CatalogItem>();
export const mutated = createEvent<CatalogItem>();

export const deleteFx = attach({
  effect: (item: CatalogItem) => api.catalog.remove(item.id).then(() => item),
});

export const $mutating = deleteFx.pending;

sample({ clock: deleteTriggered, target: deleteFx });
sample({ clock: deleteFx.doneData, target: mutated });

message({ clock: mutated, type: 'success', content: 'Позиция каталога удалена' });
message({ clock: deleteFx.fail.map(({ error }) => error), errorHandle: true });
