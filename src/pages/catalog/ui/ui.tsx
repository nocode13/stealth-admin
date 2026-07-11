/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { Avatar, Button, Flex, Table, type TableProps } from 'antd';
import { useUnit } from 'effector-react';

import { StatusTag, type CatalogItem } from '@/entities/catalog';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { formatDate } from '@/shared/lib/format';
import { withTitle } from '@/shared/ui/with-title';

import { factory } from '../model';

type Model = ReturnType<typeof factory>;

const Page = ({ model }: LazyPageProps<Model>) => {
  const [catalog, nextCursor, pending] = useUnit([model.$catalog, model.$nextCursor, model.$pending]);
  const columns = useColumns();

  return (
    <Flex vertical gap="middle" style={{ width: '100%' }}>
      <Table
        rowKey="id"
        dataSource={catalog}
        loading={pending}
        columns={columns}
        pagination={false}
        style={{ width: '100%' }}
      />
      {nextCursor !== null && (
        <Flex justify="center">
          <Button loading={pending} onClick={() => model.loadMoreClicked()}>
            Загрузить ещё
          </Button>
        </Flex>
      )}
    </Flex>
  );
};

const useColumns = (): TableProps<CatalogItem>['columns'] => {
  return [
    {
      title: 'Изображение',
      dataIndex: 'imageUrl',
      render: (imageUrl: CatalogItem['imageUrl'], item) => (
        <Avatar shape="square" src={imageUrl ?? undefined}>
          {item.name.at(0)}
        </Avatar>
      ),
    },
    {
      title: 'Название',
      dataIndex: 'name',
    },
    {
      title: 'Категория',
      key: 'category',
      render: (_, item) => item.category.nameRu,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
    },
    {
      title: 'Источник',
      key: 'source',
      render: (_, item) => (item.sellerId ? 'Продавец' : 'Мастер'),
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_, item) => <StatusTag status={item.status} />,
    },
    {
      title: 'Создано',
      key: 'createdAt',
      render: (_, item) => formatDate(item.createdAt),
    },
  ];
};

export const component = withTitle(Page, 'Каталог');
export const createModel = factory;
