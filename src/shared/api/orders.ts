import { base } from './instances';
import type {
  ChangeOrderStatusPayload,
  CursorPage,
  FindOrdersParams,
  OrderGroup,
  UpdateOrderCourierPayload,
} from './types';

export const orders = {
  /** GET /admin/orders — группы чекаута. SELLER видит только группы, где участвует
   * (и внутри — только свою часть), SUPER_ADMIN — все целиком. */
  findAll: (params?: FindOrdersParams) => base.get<CursorPage<OrderGroup>>('/orders', { params }),
  /** GET /admin/orders/:id — группа целиком: :id — id группы. */
  findOne: (id: string) => base.get<OrderGroup>(`/orders/${id}`).then((r) => r.data),
  /**
   * PATCH /admin/orders/:orderId/status — только SUPER_ADMIN; :orderId — id заказа
   * внутри группы. Переход валидируется бэкендом по ALLOWED_TRANSITIONS. Ответ —
   * вся группа, чтобы деталка заменила состояние целиком.
   */
  changeStatus: (orderId: string, payload: ChangeOrderStatusPayload) =>
    base.patch<OrderGroup>(`/orders/${orderId}/status`, payload).then((r) => r.data),
  /**
   * PATCH /admin/orders/:id/group-status — только SUPER_ADMIN; :id — id ГРУППЫ.
   * Статус каскадом применяется ко всем её нетерминальным заказам; если хотя бы
   * один не может перейти в целевой статус — бэкенд отклоняет всё действие (400).
   */
  changeGroupStatus: (groupId: string, payload: ChangeOrderStatusPayload) =>
    base.patch<OrderGroup>(`/orders/${groupId}/group-status`, payload).then((r) => r.data),
  /** PATCH /admin/orders/:orderId/courier — только SUPER_ADMIN. */
  updateCourier: (orderId: string, payload: UpdateOrderCourierPayload) =>
    base.patch<OrderGroup>(`/orders/${orderId}/courier`, payload).then((r) => r.data),
};
