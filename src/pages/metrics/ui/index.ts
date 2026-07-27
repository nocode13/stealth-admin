import { Layout } from '@/widgets/layout';
import { routes } from '@/shared/config/routing';
import { createLazyPage } from '@/shared/lib/create-lazy-page';
import { withSuspense } from '@/shared/ui/with-suspense';

const load = () => import('./ui');
const route = routes.metrics;

const Page = createLazyPage({ route, load });

export const Metrics = {
  route,
  view: withSuspense(Page),
  layout: Layout,
};
