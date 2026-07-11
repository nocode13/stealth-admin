import { AxiosError } from 'axios';
import { retry, type RetryConfig } from 'effector-refetch';

const restrictedStatusesForRetry = [404, 403];

export const fRetry = (query: Parameters<typeof retry>[0], config: RetryConfig) => {
  return retry(query, {
    ...config,
    filter: (ctx) => {
      if (ctx.error instanceof AxiosError && ctx.error.status) {
        return !restrictedStatusesForRetry.includes(ctx.error.status);
      }

      return true;
    },
  });
};
