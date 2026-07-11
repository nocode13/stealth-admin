import { createRoutesView } from 'atomic-router-react';

import { Auth } from './auth';
import { Home } from './home';
import { Categories } from './categories';
import { NotFound } from './not-found';
import { Forbidden } from './forbidden/ui';
import { Catalog } from './catalog';
import { Listing } from './listing';
import { Sellers } from './sellers';

export const Pages = createRoutesView({
  routes: [Auth, Home, Categories, Catalog, Listing, Sellers, NotFound, Forbidden],
});
