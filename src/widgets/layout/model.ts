import { combine } from 'effector';
import { or } from 'patronum';
import { createElement } from 'react';
import type { RouteInstance } from 'atomic-router';
import {
  HomeOutlined,
  AppstoreOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  UnorderedListOutlined,
  TagsOutlined,
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
    roles: ['SELLER'],
    key: 'listing',
    icon: UnorderedListOutlined,
  },
];

export const $activeRoutes = combine({
  home: routes.home.$isOpened,
  categories: routes.categories.$isOpened,
  sellers: or(routes.sellers.root.$isOpened, routes.sellers.seller.$isOpened),
  catalog: or(routes.catalog.root.$isOpened, routes.catalog.item.$isOpened),
  listing: or(routes.listing.root.$isOpened, routes.listing.item.$isOpened),
  orders: or(routes.orders.root.$isOpened, routes.orders.order.$isOpened),
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
