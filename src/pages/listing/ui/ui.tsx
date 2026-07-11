/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { Button, Flex, Table, type TableProps } from 'antd';
import { useUnit } from 'effector-react';

import type { Listing } from '@/entities/listing';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { formatDate, formatPrice } from '@/shared/lib/format';
import { StatusTag } from '@/shared/ui/status-tag';
import { withTitle } from '@/shared/ui/with-title';

import { factory } from '../model';

type Model = ReturnType<typeof factory>;

const STATUS_LABELS: Record<Listing['status'], string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активна',
  ARCHIVED: 'В архиве',
};

const Page = ({ model }: LazyPageProps<Model>) => {
  const [listing, nextCursor, pending] = useUnit([model.$listing, model.$nextCursor, model.$pending]);
  const columns = useColumns();

  return (
    <Flex vertical gap="middle" style={{ width: '100%' }}>
      <Table
        rowKey="id"
        dataSource={listing}
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

const useColumns = (): TableProps<Listing>['columns'] => {
  return [
    {
      title: 'Товар',
      key: 'product',
      render: (_, item) => item.catalogItem.name,
    },
    {
      title: 'Категория',
      key: 'category',
      render: (_, item) => item.catalogItem.category.nameRu,
    },
    {
      title: 'Цена',
      key: 'price',
      render: (_, item) => formatPrice(item.price, item.currency),
    },
    {
      title: 'Остаток',
      dataIndex: 'stock',
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_, item) => <StatusTag status={item.status} labels={STATUS_LABELS} />,
    },
    {
      title: 'Создано',
      key: 'createdAt',
      render: (_, item) => formatDate(item.createdAt),
    },
  ];
};

export const component = withTitle(Page, 'Продажные позиции');
export const createModel = factory;
