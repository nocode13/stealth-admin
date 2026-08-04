import { sample } from 'effector';

import { sellerStaffFactory } from '@/widgets/seller-staff';
import { SellerStaffCreateEdit } from '@/features/seller-staff/creat-edit';
import { userModel } from '@/entities/user';
import type { LazyPageFactoryParams } from '@/shared/lib/create-lazy-page';

/**
 * «Сотрудники» — та же команда, что SUPER_ADMIN видит на карточке продавца, но
 * своего продавца и без выбора: пункта «Продавцы» в меню у SELLER нет.
 *
 * Роль тут не всё: бэкенд пустит сюда только владельца (`Seller.ownerUserId`),
 * рядовой сотрудник получит 403 и увидит сообщение об ошибке.
 */
export const factory = ({ route }: LazyPageFactoryParams) => {
  const authorizedRoute = userModel.chainAuthorized({ route, roles: ['SELLER'] });

  const staffModel = sellerStaffFactory({
    $sellerId: userModel.$user.map((user) => user?.sellerId ?? null),
  });

  sample({ clock: authorizedRoute.closed, target: SellerStaffCreateEdit.model.reset });

  return { staffModel };
};
