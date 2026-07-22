/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Table, type TableProps } from 'antd';
import { useUnit } from 'effector-react';

import { SellerCreateEdit } from '@/features/seller/creat-edit';
import { SellerFilters } from '@/features/seller/filter';
import { StatusTag, type Seller } from '@/entities/seller';
import { routes } from '@/shared/config/routing';
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
      <SellerFilters.View>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => SellerCreateEdit.model.createTriggered()}
          style={{ width: '100%' }}
        >
          Создать продавца
        </Button>
      </SellerFilters.View>
      <Table
        rowKey="id"
        dataSource={sellers}
        loading={pending}
        columns={columns}
        pagination={false}
        style={{ width: '100%' }}
        onRow={(seller) => ({
          onClick: () => routes.sellers.seller.open({ id: seller.id }),
          style: { cursor: 'pointer' },
        })}
      />
      {nextCursor !== null && (
        <Flex justify="center">
          <Button loading={pending} onClick={() => model.loadMoreClicked()}>
            Загрузить ещё
          </Button>
        </Flex>
      )}
      <SellerCreateEdit.View />
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
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={(event) => {
            // Иначе сработает onRow и нас уведёт на детальную.
            event.stopPropagation();
            SellerCreateEdit.model.editTriggered(seller);
          }}
        />
      ),
      width: 57,
    },
  ];
};

export const component = withTitle(Page, 'Продавцы');
export const createModel = factory;
