import { userModel } from '@/entities/user';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';

// Guard: без валидной сессии редиректит на /login.
export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({ route });

  return { authorizedRoute };
};
