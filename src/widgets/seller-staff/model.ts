import { createEffect, createEvent, createStore, merge, sample, type Store } from 'effector';
import { createQuery } from 'effector-refetch';

import { SellerStaffCreateEdit } from '@/features/seller-staff/creat-edit';
import { SellerStaffDelete } from '@/features/seller-staff/delete';
import { SellerStaffInvite } from '@/features/seller-staff/invite';
import { api, type SellerStaff } from '@/shared/api';
import { fRetry } from '@/shared/lib/f-retry';
import { message } from '@/shared/lib/message';

/**
 * Команда одного продавца. Фабрика, а не синглтон: виджет висит и на карточке
 * продавца у SUPER_ADMIN, и на своей странице «Сотрудники» у владельца —
 * `sellerId` в этих двух местах берётся из разных источников.
 *
 * Пагинации нет намеренно: команда — это единицы людей, бэкенд отдаёт список целиком.
 */
export const factory = ({ $sellerId }: { $sellerId: Store<string | null> }) => {
  const mounted = createEvent();
  const refreshClicked = createEvent();

  // Любая мутация команды (включая закрытие окна привязки) перезапрашивает список.
  const mutated = merge([
    SellerStaffCreateEdit.model.mutated,
    SellerStaffDelete.model.mutated,
    SellerStaffInvite.model.mutated,
  ]);

  const fetchQuery = createQuery({
    effect: createEffect((sellerId: string) => api.sellers.staff.findAll(sellerId)),
    concurrency: 'TAKE_LATEST',
  });

  const $staff = createStore<SellerStaff[]>([]).on(fetchQuery.finished.done, (_, { result }) => result);

  fRetry(fetchQuery, { times: 2, delay: 300 });

  // Грузим по mount, а не по открытию роута: виджет живёт на двух разных
  // страницах, и обе рендерят его уже с готовым sellerId (роут открывается
  // только после chainAuthorized, то есть после ответа /me).
  sample({
    clock: [mounted, refreshClicked, mutated],
    source: $sellerId,
    filter: (sellerId): sellerId is string => !!sellerId,
    target: fetchQuery.start,
  });

  message({ clock: fetchQuery.finished.fail.map((res) => res.error), errorHandle: true });

  return {
    $sellerId,
    $staff,
    $pending: fetchQuery.$pending,
    mounted,
    refreshClicked,
  };
};
