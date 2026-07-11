import type { ComponentType } from 'react';
import { Suspense } from 'react';

import { FullScreenLoader } from './full-screen-loader';

export const withSuspense = (Component: ComponentType) => {
  const ComponentWithSuspense = () => (
    <Suspense fallback={<FullScreenLoader />}>
      <Component />
    </Suspense>
  );
  return ComponentWithSuspense;
};
