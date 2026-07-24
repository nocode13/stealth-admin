import type { OrderStatus } from '@/shared/api';
import { formatAmount } from '@/shared/lib/currency/currency';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Новый',
  CONFIRMED: 'Подтверждён',
  ASSEMBLING: 'Собирается',
  DELIVERING: 'В пути',
  ARRIVED: 'Курьер на месте',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
};

/**
 * Подписи кнопок — от лица продавца («что я сделал»), а не состояния заказа.
 * Зеркалит ORDER_ACTION_LABELS на бэкенде, откуда те же подписи идут в бота.
 */
export const ORDER_ACTION_LABELS: Record<OrderStatus, string> = {
  NEW: 'Вернуть в новые',
  CONFIRMED: 'Принять заказ',
  ASSEMBLING: 'Собираю',
  DELIVERING: 'Передал курьеру',
  ARRIVED: 'Курьер приехал',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменить',
};

/**
 * Карта переходов. Источник правды — ALLOWED_TRANSITIONS на бэкенде
 * (src/orders/order-status.ts): он валидирует PATCH и строит кнопки в боте.
 * Здесь копия только чтобы не показывать заведомо недоступные варианты;
 * если она разойдётся, бэкенд вернёт 400 — данные не испортятся.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ASSEMBLING', 'CANCELLED'],
  ASSEMBLING: ['DELIVERING', 'CANCELLED'],
  DELIVERING: ['ARRIVED', 'DELIVERED', 'CANCELLED'],
  ARRIVED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const formatMoney = (value: string) => formatAmount(Number(value));

/**
 * Ссылка на МАРШРУТ (а не на точку) в Яндекс.Картах: курьер жмёт и сразу едет.
 * Карт-SDK для этого не нужен — обычный внешний линк.
 */
export const routeUrl = (lat: number, lng: number) => `https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto`;
