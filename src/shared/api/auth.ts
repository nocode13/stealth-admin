import { base } from './instances';
import type { BotLinkSession, LoginPayload, User } from './types';

export const auth = {
  /** POST /admin/auth/login — email + password, ставит сессионную cookie. */
  login: (payload: LoginPayload) => base.post<User>('/auth/login', payload).then((r) => r.data),
  /** GET /admin/auth/me — текущий пользователь (401 без сессии). */
  getMe: () => base.get<User>('/auth/me').then((r) => r.data),
  /** POST /admin/auth/logout — завершает сессию. */
  logout: () => base.post<{ success: boolean }>('/auth/logout').then((r) => r.data),
  /**
   * POST /admin/auth/telegram/link — ссылка на бота для привязки Telegram.
   * После привязки заказы падают продавцу в чат, и статусы он меняет прямо там.
   */
  linkTelegram: () => base.post<BotLinkSession>('/auth/telegram/link').then((r) => r.data),
  /** POST /admin/auth/telegram/unlink — отвязывает Telegram от аккаунта. */
  unlinkTelegram: () => base.post<User>('/auth/telegram/unlink').then((r) => r.data),
};
