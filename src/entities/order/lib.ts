import type { OrderGroupStatus, OrderStatus } from '@/shared/api';
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

/** Подписи статуса ГРУППЫ — зеркалят ORDER_STATUS_LABELS, плюс своё значение
 * PARTIALLY_DELIVERED (часть заказов группы уже доставлена, часть ещё нет). */
export const ORDER_GROUP_STATUS_LABELS: Record<OrderGroupStatus, string> = {
  NEW: ORDER_STATUS_LABELS.NEW,
  CONFIRMED: ORDER_STATUS_LABELS.CONFIRMED,
  ASSEMBLING: ORDER_STATUS_LABELS.ASSEMBLING,
  DELIVERING: ORDER_STATUS_LABELS.DELIVERING,
  ARRIVED: ORDER_STATUS_LABELS.ARRIVED,
  PARTIALLY_DELIVERED: 'Частично доставлен',
  DELIVERED: ORDER_STATUS_LABELS.DELIVERED,
  CANCELLED: ORDER_STATUS_LABELS.CANCELLED,
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
