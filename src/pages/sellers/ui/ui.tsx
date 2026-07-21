/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { EditOutlined } from '@ant-design/icons';
import { Button, Flex, Table, type TableProps } from 'antd';
import { useUnit } from 'effector-react';

import { SellerChangeStatus } from '@/features/seller/change-status';
import { StatusTag, type Seller } from '@/entities/seller';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { formatDate } from '@/shared/lib/format';
import { withTitle } from '@/shared/ui/with-title';

import { factory } from '../model';

type Model = ReturnType<typeof factory>;

const Page = ({ model }: LazyPageProps<Model>) => {
  const [sellers, nextCursor, pending] = useUnit([model.$sellers, model.$nextCursor, model.$pending]);
  const columns = useColumns();

  return (
    <Flex vertical gap="middle" style={{ width: '100%' }}>
      <Table
        rowKey="id"
        dataSource={sellers}
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
      <SellerChangeStatus.View />
    </Flex>
  );
};

const useColumns = (): TableProps<Seller>['columns'] => {
  return [
    {
      title: 'Название',
      dataIndex: 'name',
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_, seller) => <StatusTag status={seller.status} />,
    },
    {
      title: 'Создано',
      key: 'createdAt',
      render: (_, seller) => formatDate(seller.createdAt),
    },
    {
      key: 'actions',
      render: (_, seller) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => SellerChangeStatus.model.triggered(seller)} />
      ),
      width: 57,
    },
  ];
};

export const component = withTitle(Page, 'Продавцы');
export const createModel = factory;
