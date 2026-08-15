import { base } from './instances';
import type { PlatformSettings, UpdatePlatformSettingsPayload } from './types';

export const settings = {
  get: () => base.get<PlatformSettings>('/settings').then((r) => r.data),
  update: (payload: UpdatePlatformSettingsPayload) =>
    base.patch<PlatformSettings>('/settings', payload).then((r) => r.data),
};
