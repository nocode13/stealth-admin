import { userModel } from '@/entities/user';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';

// Guard: авторизованного уводим на главную, анониму показываем форму логина.
export const factory = ({ route }: LazyPageFactoryParams) => {
  userModel.chainAnonymous({ route });
  return {};
};
