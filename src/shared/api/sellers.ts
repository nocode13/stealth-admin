import { base } from './instances';
import type {
  BotLinkSession,
  CreateSellerPayload,
  CursorPage,
  FindSellersParams,
  Seller,
  SellerStaff,
  SellerStaffPayload,
  UpdateSellerPayload,
} from './types';

export const sellers = {
  findAll: (params?: FindSellersParams) => base.get<CursorPage<Seller>>('/sellers', { params }),
  findOne: (id: string) => base.get<Seller>(`/sellers/${id}`).then((r) => r.data),
  create: (payload: CreateSellerPayload) => base.post<Seller>('/sellers', payload).then((r) => r.data),
  update: (id: string, payload: UpdateSellerPayload) =>
    base.patch<Seller>(`/sellers/${id}`, payload).then((r) => r.data),
  uploadBanner: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    // Content-Type сбрасываем, чтобы браузер сам проставил multipart boundary —
    // инстанс `base` задаёт 'application/json' по умолчанию для всех запросов.
    return base
      .post<Seller>(`/sellers/${id}/image`, formData, { headers: { 'Content-Type': undefined } })
      .then((r) => r.data);
  },

  /**
   * Команда продавца. Доступна SUPER_ADMIN по любому продавцу и владельцу — по
   * своему; рядовой сотрудник получает 403. Список без пагинации: команда мелкая.
   */
  staff: {
    findAll: (sellerId: string) => base.get<SellerStaff[]>(`/sellers/${sellerId}/staff`).then((r) => r.data),
    create: (sellerId: string, payload: SellerStaffPayload) =>
      base.post<SellerStaff>(`/sellers/${sellerId}/staff`, payload).then((r) => r.data),
    update: (sellerId: string, staffId: string, payload: SellerStaffPayload) =>
      base.patch<SellerStaff>(`/sellers/${sellerId}/staff/${staffId}`, payload).then((r) => r.data),
    remove: (sellerId: string, staffId: string) => base.delete<void>(`/sellers/${sellerId}/staff/${staffId}`),
    /** Ссылка/QR «открой бота и привяжись» — сотруднику вход в админку не нужен. */
    invite: (sellerId: string, staffId: string) =>
      base.post<BotLinkSession>(`/sellers/${sellerId}/staff/${staffId}/telegram/invite`).then((r) => r.data),
    unlink: (sellerId: string, staffId: string) =>
      base.post<SellerStaff>(`/sellers/${sellerId}/staff/${staffId}/telegram/unlink`).then((r) => r.data),
  },
};
