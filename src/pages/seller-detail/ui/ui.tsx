/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { Button, Card, Flex, Image, Spin, Table, Typography, type TableProps } from 'antd';
import { useUnit } from 'effector-react';

import { SellerStaffTable } from '@/widgets/seller-staff';
import { SellerCreateEdit } from '@/features/seller/creat-edit';
import { StatusTag as SellerStatusTag } from '@/entities/seller';
import { GroupStatusTag, formatMoney, type OrderGroup } from '@/entities/order';
import { StatusTag as CategoryStatusTag, type Category } from '@/entities/category';
import { StatusTag as CatalogStatusTag, type CatalogItem } from '@/entities/catalog';
import { StatusTag as ListingStatusTag, type Listing } from '@/entities/listing';
import { routes } from '@/shared/config/routing';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { formatDate } from '@/shared/lib/format';
import { RichTextView } from '@/shared/ui/rich-text';
import { withTitle } from '@/shared/ui/with-title';

import { factory } from '../model';

type Model = ReturnType<typeof factory>;

const Page = ({ model }: LazyPageProps<Model>) => {
  const [
    seller,
    orders,
    nextCursor,
    pending,
    ordersPending,
    categories,
    categoriesPending,
    catalogItems,
    catalogPending,
    listings,
    listingsPending,
  ] = useUnit([
    model.$seller,
    model.$orders,
    model.$nextCursor,
    model.$pending,
    model.$ordersPending,
    model.$categories,
    model.$categoriesPending,
    model.$catalogItems,
    model.$catalogPending,
    model.$listings,
    model.$listingsPending,
  ]);
  const columns = useColumns();
  const categoryColumns = useCategoryColumns();
  const catalogColumns = useCatalogColumns();
  const listingColumns = useListingColumns();

  if (pending && !seller) return <Spin />;
  if (!seller) return <Typography.Text type="secondary">Продавец не найден</Typography.Text>;

  return (
    <Flex vertical gap="middle" style={{ width: '100%' }}>
      <Flex justify="space-between" align="center">
        <Button onClick={() => routes.sellers.root.open()}>К списку</Button>
        <Flex gap="small">
          <Button type="primary" onClick={() => SellerCreateEdit.model.editTriggered(seller)}>
            Редактировать
          </Button>
        </Flex>
      </Flex>

      <Card size="small">
        {!!seller.bannerUrl && (
          <Image src={seller.bannerUrl} alt={seller.name} width="100%" style={{ maxHeight: 240, objectFit: 'cover' }} />
        )}
        <Flex align="center" gap="small" style={{ marginTop: 16 }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {seller.name}
          </Typography.Title>
          <SellerStatusTag status={seller.status} />
        </Flex>
        {!!seller.description && (
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            <RichTextView html={seller.description} />
          </Typography.Paragraph>
        )}
      </Card>

      <Card title="Заказы" size="small">
        <Table rowKey="id" dataSource={orders} loading={ordersPending} columns={columns} pagination={false} />
        {nextCursor !== null && (
          <Flex justify="center" style={{ marginTop: 12 }}>
            <Button loading={ordersPending} onClick={() => model.loadMoreClicked()}>
              Загрузить ещё
            </Button>
          </Flex>
        )}
      </Card>

      <SellerStaffTable model={model.staffModel} />

      <Card title="Свои категории" size="small">
        <Table
          rowKey="id"
          dataSource={categories}
          loading={categoriesPending}
          columns={categoryColumns}
          pagination={false}
          size="small"
        />
      </Card>

      <Card title="Свой каталог" size="small">
        <Table
          rowKey="id"
          dataSource={catalogItems}
          loading={catalogPending}
          columns={catalogColumns}
          pagination={false}
          size="small"
        />
      </Card>

      <Card title="Листинги" size="small">
        <Table
          rowKey="id"
          dataSource={listings}
          loading={listingsPending}
          columns={listingColumns}
          pagination={false}
          size="small"
        />
      </Card>

      <SellerCreateEdit.View />
    </Flex>
  );
};

const useColumns = (): TableProps<OrderGroup>['columns'] => {
  return [
    {
      title: '№',
      key: 'groupNumber',
      render: (_, group) => <Typography.Text strong>№{group.groupNumber}</Typography.Text>,
      width: 90,
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_, group) => <GroupStatusTag status={group.status} />,
    },
    {
      title: 'Получатель',
      key: 'contact',
      render: (_, group) => (
        <Flex vertical>
          <span>{group.contactName}</span>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {group.contactPhone}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      // Группа могла зацепить и других продавцов (мультипродавцовый чекаут) —
      // страница открыта только SUPER_ADMIN, показываем всех участников группы.
      title: 'Продавцы',
      key: 'sellers',
      render: (_, group) => group.orders.map((order) => order.seller.name).join(', '),
    },
    {
      title: 'Сумма',
      key: 'total',
      render: (_, group) => formatMoney(group.total),
    },
    {
      title: 'Создан',
      key: 'createdAt',
      render: (_, group) => formatDate(group.createdAt),
    },
  ];
};

const useCategoryColumns = (): TableProps<Category>['columns'] => {
  return [
    { title: 'Название', dataIndex: 'name' },
    {
      title: 'Статус',
      key: 'status',
      render: (_, category) => <CategoryStatusTag status={category.status} />,
    },
    {
      title: 'Создано',
      key: 'createdAt',
      render: (_, category) => formatDate(category.createdAt),
    },
  ];
};

const useCatalogColumns = (): TableProps<CatalogItem>['columns'] => {
  return [
    { title: 'Название', dataIndex: 'name' },
    { title: 'Категория', key: 'category', render: (_, item) => item.category?.name ?? '—' },
    {
      title: 'Статус',
      key: 'status',
      render: (_, item) => <CatalogStatusTag status={item.status} />,
    },
    {
      title: 'Создано',
      key: 'createdAt',
      render: (_, item) => formatDate(item.createdAt),
    },
  ];
};

const useListingColumns = (): TableProps<Listing>['columns'] => {
  return [
    { title: 'Позиция', key: 'catalogItem', render: (_, listing) => listing.catalogItem.name },
    {
      title: 'Цена',
      key: 'price',
      render: (_, listing) => formatMoney(listing.price),
    },
    { title: 'Остаток', dataIndex: 'stock' },
    {
      title: 'Статус',
      key: 'status',
      render: (_, listing) => <ListingStatusTag status={listing.status} />,
    },
  ];
};

export const component = withTitle(Page, 'Продавец');
export const createModel = factory;
