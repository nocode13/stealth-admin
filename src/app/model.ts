import { createEffect, sample } from 'effector';
import { createBrowserHistory } from 'history';

import { router } from '@/shared/config/routing';
import { appStarted } from '@/shared/config/system';

const createBrowserHistoryFx = createEffect(() => createBrowserHistory());

sample({ clock: appStarted, target: createBrowserHistoryFx });
sample({ clock: createBrowserHistoryFx.doneData, target: router.setHistory });
