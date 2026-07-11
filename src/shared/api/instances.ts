import axios from 'axios';

import { API_URL } from '@/shared/config/env';

/**
 * Единственный axios-инстанс для админ-API.
 * Авторизация — сессионная httpOnly cookie бэкенда, поэтому `withCredentials: true`
 * и никаких Authorization-заголовков/refresh-логики не требуется.
 */
export const base = axios.create({
  baseURL: `${API_URL}/admin`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});
