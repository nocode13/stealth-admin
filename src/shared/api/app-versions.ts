import { base } from './instances';
import type { AppPlatform, AppVersion, UpdateAppVersionPayload } from './types';

export const appVersions = {
  list: () => base.get<AppVersion[]>('/app-versions').then((r) => r.data),
  update: (platform: AppPlatform, payload: UpdateAppVersionPayload) =>
    base.patch<AppVersion>(`/app-versions/${platform}`, payload).then((r) => r.data),
};
