import { createRoutesView } from 'atomic-router-react';

import { Auth } from './auth';
import { Home } from './home';
import { Categories } from './categories';
import { NotFound } from './not-found';
import { Forbidden } from './forbidden/ui';
import { Catalog } from './catalog';
import { Listing } from './listing';
import { OrderDetail } from './order-detail';
import { Orders } from './orders';
import { Sellers } from './sellers';
import { SellerDetail } from './seller-detail';

export const Pages = createRoutesView({
  routes: [Auth, Home, Categories, Catalog, Listing, Orders, OrderDetail, Sellers, SellerDetail, NotFound, Forbidden],
});
