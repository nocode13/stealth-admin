import { createHistoryRouter, createRoute, createRouterControls } from 'atomic-router';

export const routes = {
  auth: createRoute(),
  home: createRoute(),
  categories: createRoute(),

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

  notFound: createRoute(),
  forbidden: createRoute(),
};

export const routesMap = [
  { route: routes.home, path: '/' },
  { route: routes.auth, path: '/login' },

  { route: routes.categories, path: '/categories' },

  { route: routes.catalog.root, path: '/catalog' },
  { route: routes.catalog.item, path: '/catalog/:id' },

  { route: routes.sellers.root, path: '/sellers' },
  { route: routes.sellers.seller, path: '/sellers/:id' },

  { route: routes.listing.root, path: '/listing' },
  { route: routes.listing.item, path: '/listing/:id' },

  { route: routes.orders.root, path: '/orders' },
  { route: routes.orders.order, path: '/orders/:id' },

  { route: routes.forbidden, path: '/forbidden' },
];

export const routerControls = createRouterControls();

export const router = createHistoryRouter({
  routes: routesMap,
  controls: routerControls,
  notFoundRoute: routes.notFound,
});
