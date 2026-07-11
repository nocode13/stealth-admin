/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { Card, Descriptions, Flex, Typography } from 'antd';
import { useUnit } from 'effector-react';

import { userModel } from '@/entities/user';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';

import { factory } from '../model';

type Model = ReturnType<typeof factory>;

const HomePage = (_props: LazyPageProps<Model>) => {
  const user = useUnit(userModel.$user);

  return (
    <Flex align="center" justify="center">
      <Card style={{ width: '100%', maxWidth: 480 }}>
        <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Stealth Admin
          </Typography.Title>
        </Flex>

        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Email">{user?.email ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Телефон">{user?.phone ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Роль">{user?.role ?? '—'}</Descriptions.Item>
        </Descriptions>
      </Card>
    </Flex>
  );
};

export const component = HomePage;
export const createModel = factory;
