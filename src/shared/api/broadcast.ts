import { base } from './instances';
import type {
  Broadcast,
  BroadcastAudienceCount,
  BroadcastAudiencePayload,
  CreateBroadcastPayload,
  CursorPage,
  CursorPageParams,
} from './types';

export const broadcast = {
  findAll: (params?: CursorPageParams) => base.get<CursorPage<Broadcast>>('/broadcasts', { params }),
  findOne: (id: string) => base.get<Broadcast>(`/broadcasts/${id}`).then((r) => r.data),
  audienceCount: (payload: BroadcastAudiencePayload) =>
    base.post<BroadcastAudienceCount>('/broadcasts/audience-count', payload).then((r) => r.data),
  create: (payload: CreateBroadcastPayload) => base.post<Broadcast>('/broadcasts', payload).then((r) => r.data),
};
