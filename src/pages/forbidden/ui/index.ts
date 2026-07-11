import { routes } from '@/shared/config/routing';
import { createLazyPage } from '@/shared/lib/create-lazy-page';
import { withSuspense } from '@/shared/ui/with-suspense';

const load = () => import('./ui');
const route = routes.forbidden;

const Page = createLazyPage({ route, load });

export const Forbidden = {
  route,
  view: withSuspense(Page),
};
