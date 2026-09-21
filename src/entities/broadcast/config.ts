import type { Broadcast } from '@/shared/api';

export const statusOptions: Record<Broadcast['status'], string> = {
  SENDING: 'отправляется',
  DONE: 'отправлена',
  FAILED: 'прервана',
};
