import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Button, Card, Flex, theme, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useForm } from 'react-hook-form';

import { TextField } from '@/shared/ui/form';

import * as model from '../model';

export const LoginForm = () => {
  const { token } = theme.useToken();
  const [mutating, validated] = useUnit([model.$mutating, model.validated]);

  const form = useForm<model.FormValues>({
    resolver: standardSchemaResolver(model.schema),
    defaultValues: model.DEFAULT_VALUES,
  });
  model.form.useBindFormWithModel({ form });

  return (
    <Flex align="center" justify="center" style={{ height: '100%', width: '100%' }}>
      <Card style={{ width: '100%', maxWidth: 380, padding: token.padding }} variant="borderless">
        <Flex vertical align="center" style={{ marginBottom: 24 }}>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            Stealth Admin
          </Typography.Title>
          <Typography.Text type="secondary">Вход в панель управления</Typography.Text>
        </Flex>

        <form onSubmit={form.handleSubmit(() => validated())}>
          <TextField
            control={form.control}
            name="email"
            label="Email"
            placeholder="admin@stealth.local"
            prefix={<MailOutlined />}
            autoComplete="email"
          />
          <TextField
            control={form.control}
            name="password"
            label="Пароль"
            type="password"
            placeholder="••••••"
            prefix={<LockOutlined />}
            autoComplete="current-password"
          />
          <Button type="primary" htmlType="submit" size="large" block loading={mutating} style={{ marginTop: 8 }}>
            Войти
          </Button>
        </form>
      </Card>
    </Flex>
  );
};
