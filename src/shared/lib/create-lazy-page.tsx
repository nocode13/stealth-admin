import type { RouteInstance, RouteParams } from 'atomic-router';
import { chainRoute } from 'atomic-router';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { condition, not } from 'patronum';
import type { ComponentType } from 'react';
import { createElement, lazy, memo } from 'react';

export type LazyPageProps<Model, Props extends object = object> = Props & {
  model: Model;
};

export type LazyPageFactoryParams<Params extends RouteParams = Record<string, never>> = {
  route: RouteInstance<Params>;
};

const MODULE_NOT_FOUND_ERROR = 'module_not_found';

export const createLazyPage = <
  Params extends RouteParams,
  Model,
  Page extends ComponentType<{ model: Model }>,
  StaticDeps extends Record<string, unknown> = Record<string, never>,
>({
  route,
  load,
  staticDeps = {} as StaticDeps,
}: {
  route: RouteInstance<Params>;
  staticDeps?: StaticDeps;
  load: () => Promise<{
    createModel: (params: { route: RouteInstance<Params> } & StaticDeps) => Model | Promise<Model>;
    component: Page;
  }>;
}) => {
  const opened = createEvent();
  const loaded = createEvent();

  const chainedRoute = chainRoute({
    route,
    beforeOpen: opened,
    openOn: loaded,
  });

  let model: Promise<Model> | undefined;

  const loadFx = createEffect(async () => {
    const module = await load();
    if (!module) {
      throw Object.assign(new Error('Module not found'), {
        cause: MODULE_NOT_FOUND_ERROR,
      });
    }

    const { createModel, component } = module;
    if (!model) {
      model = Promise.resolve(createModel({ route: chainedRoute, ...staticDeps }));
    }

    return { component, model: await model };
  });

  const $isLoaded = createStore(false).on(loaded, () => true);

  condition({
    source: opened,
    if: $isLoaded,
    then: loaded,
    else: loadFx,
  });

  sample({
    clock: loadFx.doneData,
    filter: not($isLoaded),
    target: loaded,
  });

  return lazy(() =>
    loadFx()
      .then(({ model: pageModel, component }) => {
        const Component = memo((props: object) => createElement(component, { model: pageModel, ...props }));
        Component.displayName = 'LazyPage';
        return { default: Component as ComponentType };
      })
      .catch((error: unknown) => {
        if ((error as { cause?: string })?.cause === MODULE_NOT_FOUND_ERROR) {
          return new Promise<never>(() => {});
        }
        throw error;
      }),
  );
};
