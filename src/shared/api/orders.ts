import { base } from './instances';
import type { ChangeOrderStatusPayload, CursorPage, FindOrdersParams, Order, UpdateOrderCourierPayload } from './types';

export const orders = {
  /** GET /admin/orders — SELLER видит только свои, SUPER_ADMIN все. */
  findAll: (params?: FindOrdersParams) => base.get<CursorPage<Order>>('/orders', { params }),
  /** GET /admin/orders/:id — заказ целиком: позиции + история статусов. */
  findOne: (id: string) => base.get<Order>(`/orders/${id}`).then((r) => r.data),
  /**
   * PATCH /admin/orders/:id/status — переход валидируется бэкендом по той же карте
   * ALLOWED_TRANSITIONS, что строит кнопки в кабинете продавца в боте.
   */
  changeStatus: (id: string, payload: ChangeOrderStatusPayload) =>
    base.patch<Order>(`/orders/${id}/status`, payload).then((r) => r.data),
  /** PATCH /admin/orders/:id/courier — кто везёт (задел под курьерскую систему). */
  updateCourier: (id: string, payload: UpdateOrderCourierPayload) =>
    base.patch<Order>(`/orders/${id}/courier`, payload).then((r) => r.data),
};
