import { createRoutesView } from 'atomic-router-react';

import { Auth } from './auth';
import { Home } from './home';
import { Categories } from './categories';
import { Countries } from './countries';
import { NotFound } from './not-found';
import { Forbidden } from './forbidden/ui';
import { Catalog } from './catalog';
import { Listing } from './listing';
import { Metrics } from './metrics';
import { OrderDetail } from './order-detail';
import { Orders } from './orders';
import { Sellers } from './sellers';
import { SellerDetail } from './seller-detail';
import { Settings } from './settings';
import { AppVersions } from './app-versions';
import { Team } from './team';
import { Broadcasts } from './broadcasts';

export const Pages = createRoutesView({
  routes: [
    Auth,
    Home,
    Categories,
    Countries,
    Catalog,
    Listing,
    Orders,
    OrderDetail,
    Sellers,
    SellerDetail,
    Team,
    Metrics,
    Settings,
    AppVersions,
    Broadcasts,
    NotFound,
    Forbidden,
  ],
});
