/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { Login } from '@/features/auth/login';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';

import { factory } from '../model';

type Model = ReturnType<typeof factory>;

const AuthPage = (_props: LazyPageProps<Model>) => <Login.View />;

export const component = AuthPage;
export const createModel = factory;
