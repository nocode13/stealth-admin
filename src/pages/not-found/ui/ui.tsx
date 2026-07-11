/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { Button, Flex, theme, Typography } from 'antd';

import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { routes } from '@/shared/config/routing';

import { factory } from '../model';

type Model = ReturnType<typeof factory>;

const NotFoundPage = (_props: LazyPageProps<Model>) => {
  const { token } = theme.useToken();

  return (
    <Flex align="center" justify="center" style={{ height: '100%', width: '100%' }}>
      <Flex vertical gap={token.margin} align="center">
        <Typography.Title style={{ margin: 0 }} level={2}>
          404
        </Typography.Title>
        <Button onClick={() => routes.home.open()}>Главная</Button>
      </Flex>
    </Flex>
  );
};

export const component = NotFoundPage;
export const createModel = factory;
