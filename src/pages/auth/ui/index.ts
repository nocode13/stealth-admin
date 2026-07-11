import { routes } from '@/shared/config/routing';
import { createLazyPage } from '@/shared/lib/create-lazy-page';
import { withSuspense } from '@/shared/ui/with-suspense';

const load = () => import('./ui');
const route = routes.auth;

const Page = createLazyPage({ route, load });

export const Auth = {
  route,
  view: withSuspense(Page),
};
