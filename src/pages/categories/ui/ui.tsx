/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Table, Typography, type TableProps } from 'antd';
import { useUnit } from 'effector-react';

import { CategoryCreateEdit } from '@/features/category/creat-edit';
import { CategoryFilters } from '@/features/category/filter';
import type { Category } from '@/entities/category';
import { StatusTag } from '@/entities/category';
import { userModel } from '@/entities/user';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { formatDate } from '@/shared/lib/format';
import { withTitle } from '@/shared/ui/with-title';

import { factory } from '../model';

type Model = ReturnType<typeof factory>;

const Page = ({ model }: LazyPageProps<Model>) => {
  const [categories, nextCursor, pending] = useUnit([model.$categories, model.$nextCursor, model.$pending]);
  const columns = useColumns(model);

  return (
    <Flex vertical gap="middle" style={{ width: '100%' }}>
      <CategoryFilters.View>
        <Button
          type="primary"
          onClick={() => CategoryCreateEdit.model.createTriggered()}
          icon={<PlusOutlined />}
          style={{ width: '100%' }}
        >
          Создать
        </Button>
      </CategoryFilters.View>

      <Table
        rowKey="id"
        dataSource={categories}
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
      <CategoryCreateEdit.View />
    </Flex>
  );
};

const useColumns = (_: Model): TableProps<Category>['columns'] => {
  const [role] = useUnit([userModel.$role]);

  return [
    {
      title: 'Название',
      dataIndex: 'nameRu',
    },
    {
      title: 'Переводы',
      key: 'translations',
      render: (_, category) => {
        const translations = [
          category.nameUz && `UZ: ${category.nameUz}`,
          category.nameEn && `EN: ${category.nameEn}`,
          category.nameKaa && `KAA: ${category.nameKaa}`,
        ].filter(Boolean);

        return (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {translations.join(', ')}
          </Typography.Text>
        );
      },
    },
    {
      title: 'Источник',
      key: 'source',
      render: (_, category) => (category.sellerId ? 'Продавец' : 'Мастер'),
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_, category) => <StatusTag status={category.status} />,
    },
    {
      title: 'Создано',
      key: 'createdAt',
      render: (_, category) => formatDate(category.createdAt),
    },
    {
      key: 'actions',
      render: (_, category) =>
        (role === 'SUPER_ADMIN' || !!category.sellerId) && (
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => CategoryCreateEdit.model.editTriggered(category)}
          />
        ),
      width: 57,
    },
  ];
};

export const component = withTitle(Page, 'Категории');
export const createModel = factory;
