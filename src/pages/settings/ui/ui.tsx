/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Button, Card, Flex, Spin, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useForm } from 'react-hook-form';

import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { NumberField } from '@/shared/ui/form';
import { withTitle } from '@/shared/ui/with-title';

import { factory, form as formBridge, DEFAULT_VALUES, schema } from '../model';

type Model = ReturnType<typeof factory>;

const Page = ({ model }: LazyPageProps<Model>) => {
  const [settings, pending, saving, validated] = useUnit([
    model.$settings,
    model.$pending,
    model.$saving,
    model.validated,
  ]);

  const form = useForm<typeof DEFAULT_VALUES>({
    resolver: standardSchemaResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });
  formBridge.useBindFormWithModel({ form });

  if (pending && !settings) return <Spin />;

  return (
    <Flex vertical gap="middle" style={{ width: '100%', maxWidth: 480 }}>
      <Card title="Доставка" size="small">
        <form onSubmit={form.handleSubmit(() => validated())}>
          <NumberField control={form.control} name="deliveryFee" label="Стоимость доставки, сум" min={0} required />
          <NumberField
            control={form.control}
            name="freeDeliveryThreshold"
            label="Порог бесплатной доставки, сум"
            placeholder="Без порога"
            min={0}
          />
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Пустое поле — бесплатной доставки по порогу нет. Доставка также бесплатна, если все позиции корзины из
            вайтлиста в каталоге.
          </Typography.Text>
          <Button type="primary" htmlType="submit" loading={saving}>
            Сохранить
          </Button>
        </form>
      </Card>
    </Flex>
  );
};

export const component = withTitle(Page, 'Настройки');
export const createModel = factory;
