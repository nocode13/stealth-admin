import { createHistoryRouter, createRoute, createRouterControls } from 'atomic-router';

export const routes = {
  auth: createRoute(),
  home: createRoute(),
  categories: createRoute(),
  countries: createRoute(),

  catalog: {
    root: createRoute(),
    item: createRoute(),
  },

  sellers: {
    root: createRoute(),
    seller: createRoute<{ id: string }>(),
  },

  listing: {
    root: createRoute(),
    item: createRoute<{ id: string }>(),
  },

  orders: {
    root: createRoute(),
    order: createRoute<{ id: string }>(),
  },

  // Своя команда — для владельца продавца: раздела «Продавцы» у него нет.
  team: createRoute(),

  metrics: createRoute(),

  settings: createRoute(),

  appVersions: createRoute(),

  broadcasts: createRoute(),

  promotions: createRoute(),
  priceRules: createRoute(),

  notFound: createRoute(),
  forbidden: createRoute(),
};

export const routesMap = [
  { route: routes.home, path: '/' },
  { route: routes.auth, path: '/login' },

  { route: routes.categories, path: '/categories' },
  { route: routes.countries, path: '/countries' },

  { route: routes.catalog.root, path: '/catalog' },
  { route: routes.catalog.item, path: '/catalog/:id' },

  { route: routes.sellers.root, path: '/sellers' },
  { route: routes.sellers.seller, path: '/sellers/:id' },

  { route: routes.listing.root, path: '/listing' },
  { route: routes.listing.item, path: '/listing/:id' },

  { route: routes.orders.root, path: '/orders' },
  { route: routes.orders.order, path: '/orders/:id' },

  { route: routes.team, path: '/team' },

  { route: routes.metrics, path: '/metrics' },

  { route: routes.settings, path: '/settings' },
  { route: routes.appVersions, path: '/app-versions' },
  { route: routes.broadcasts, path: '/broadcasts' },
  { route: routes.promotions, path: '/promotions' },
  { route: routes.priceRules, path: '/price-rules' },

  { route: routes.forbidden, path: '/forbidden' },
];

export const routerControls = createRouterControls();

export const router = createHistoryRouter({
  routes: routesMap,
  controls: routerControls,
  notFoundRoute: routes.notFound,
});
