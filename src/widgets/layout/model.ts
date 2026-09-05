import { combine } from 'effector';
import { or } from 'patronum';
import { createElement } from 'react';
import type { RouteInstance } from 'atomic-router';
import {
  HomeOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  MobileOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  UnorderedListOutlined,
  TagsOutlined,
  TeamOutlined,
} from '@ant-design/icons';

import { userModel, type Role } from '@/entities/user';
import { routes } from '@/shared/config/routing';

const MENU_ROUTES: { route: RouteInstance<object>; label: string; roles: Role[]; key: string; icon: React.FC }[] = [
  {
    route: routes.home,
    label: 'Главная',
    roles: ['SELLER', 'SUPER_ADMIN'],
    key: 'home',
    icon: HomeOutlined,
  },
  {
    route: routes.orders.root,
    label: 'Заказы',
    roles: ['SELLER', 'SUPER_ADMIN'],
    key: 'orders',
    icon: ShoppingCartOutlined,
  },
  {
    route: routes.categories,
    label: 'Категории',
    roles: ['SELLER', 'SUPER_ADMIN'],
    key: 'categories',
    icon: TagsOutlined,
  },
  {
    route: routes.sellers.root,
    label: 'Продавцы',
    roles: ['SUPER_ADMIN'],
    key: 'sellers',
    icon: ShopOutlined,
  },
  {
    route: routes.catalog.root,
    label: 'Каталог',
    roles: ['SELLER', 'SUPER_ADMIN'],
    key: 'catalog',
    icon: AppstoreOutlined,
  },
  {
    route: routes.listing.root,
    label: 'Продажные позиции',
    roles: ['SELLER', 'SUPER_ADMIN'],
    key: 'listing',
    icon: UnorderedListOutlined,
  },
  {
    // Пускаем только SELLER: у SUPER_ADMIN команда живёт на карточке продавца,
    // потому что своей у него нет.
    route: routes.team,
    label: 'Сотрудники',
    roles: ['SELLER'],
    key: 'team',
    icon: TeamOutlined,
  },
  {
    route: routes.metrics,
    label: 'Метрики',
    roles: ['SUPER_ADMIN'],
    key: 'metrics',
    icon: BarChartOutlined,
  },
  {
    route: routes.settings,
    label: 'Настройки',
    roles: ['SUPER_ADMIN'],
    key: 'settings',
    icon: SettingOutlined,
  },
  {
    route: routes.appVersions,
    label: 'Версии приложения',
    roles: ['SUPER_ADMIN'],
    key: 'appVersions',
    icon: MobileOutlined,
  },
];

export const $activeRoutes = combine({
  home: routes.home.$isOpened,
  categories: routes.categories.$isOpened,
  sellers: or(routes.sellers.root.$isOpened, routes.sellers.seller.$isOpened),
  catalog: or(routes.catalog.root.$isOpened, routes.catalog.item.$isOpened),
  listing: or(routes.listing.root.$isOpened, routes.listing.item.$isOpened),
  orders: or(routes.orders.root.$isOpened, routes.orders.order.$isOpened),
  team: routes.team.$isOpened,
  metrics: routes.metrics.$isOpened,
  settings: routes.settings.$isOpened,
  appVersions: routes.appVersions.$isOpened,
}).map((routes) =>
  Object.entries(routes)
    .filter(([_, value]) => value)
    .map(([key]) => key),
);

export const $items = userModel.$role.map((role) => {
  if (!role) {
    return [];
  }

  return MENU_ROUTES.filter(({ roles }) => roles.includes(role)).map(({ label, route, key, icon }) => ({
    key,
    label,
    icon: createElement(icon),
    onClick: () => route.open({}),
  }));
});
