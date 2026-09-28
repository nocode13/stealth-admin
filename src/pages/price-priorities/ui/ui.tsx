/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { ArrowDownOutlined, ArrowUpOutlined, LockOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Spin, Typography } from 'antd';
import { useUnit } from 'effector-react';

import { pricePriorityConfig } from '@/entities/price-priority';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { withTitle } from '@/shared/ui/with-title';

import { factory, moveSource } from '../model';

type Model = ReturnType<typeof factory>;

const Page = ({ model }: LazyPageProps<Model>) => {
  const [order, pending, saving, moved] = useUnit([model.$order, model.$pending, model.$saving, model.moved]);

  if (pending && order.length === 0) return <Spin />;

  return (
    <Flex vertical gap="middle" style={{ width: '100%', maxWidth: 560 }}>
      <Typography.Text type="secondary">
        Цену позиции даёт первый подходящий источник сверху. Например, если «Своя наценка позиции» стоит выше «Акции», у
        позиций со своей наценкой акция не применяется. Изменение сразу пересчитывает цены всей витрины.
      </Typography.Text>
      {order.map((source, index) => {
        const locked = source === 'BASE_MARKUP';
        return (
          <Card key={source} size="small">
            <Flex align="center" gap="middle">
              <Typography.Text strong style={{ width: 20 }}>
                {index + 1}
              </Typography.Text>
              <Flex vertical style={{ flex: 1 }}>
                <Typography.Text strong>{pricePriorityConfig.sourceOptions[source]}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {pricePriorityConfig.sourceDescriptions[source]}
                </Typography.Text>
              </Flex>
              {locked ? (
                <LockOutlined title="Закреплена последней" />
              ) : (
                <Flex gap="small">
                  <Button
                    icon={<ArrowUpOutlined />}
                    disabled={saving || !moveSource(order, index, 'up')}
                    onClick={() => moved({ index, direction: 'up' })}
                  />
                  <Button
                    icon={<ArrowDownOutlined />}
                    disabled={saving || !moveSource(order, index, 'down')}
                    onClick={() => moved({ index, direction: 'down' })}
                  />
                </Flex>
              )}
            </Flex>
          </Card>
        );
      })}
    </Flex>
  );
};

export const component = withTitle(Page, 'Приоритеты цены');
export const createModel = factory;
