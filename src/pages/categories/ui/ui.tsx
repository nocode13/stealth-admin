/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Avatar, Button, Flex, Table, Tag, Tooltip, Typography, type TableProps } from 'antd';
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
  const [categories, nextCursor, pending, isTree, expandedKeys, childrenByParent, childrenPending, role] = useUnit([
    model.$categories,
    model.$nextCursor,
    model.$pending,
    model.$isTree,
    model.$expandedKeys,
    model.$childrenByParent,
    model.$childrenPending,
    userModel.$role,
  ]);
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const columns = useColumns({ isTree });
  const subColumns = useColumns({ isTree: false, nested: true });

  return (
    <Flex vertical gap="middle" style={{ width: '100%' }}>
      <CategoryFilters.View>
        {/* Продавец предлагает только подкатегории — категории товаров заводит супер-админ. */}
        <Button
          type="primary"
          onClick={() => CategoryCreateEdit.model.createTriggered(isSuperAdmin ? { level: 'root' } : { level: 'sub' })}
          icon={<PlusOutlined />}
          style={{ width: '100%' }}
        >
          {isSuperAdmin ? 'Категория' : 'Подкатегория'}
        </Button>
      </CategoryFilters.View>

      <Table
        rowKey="id"
        dataSource={categories}
        loading={pending}
        columns={columns}
        pagination={false}
        style={{ width: '100%' }}
        expandable={
          isTree
            ? {
                expandedRowKeys: expandedKeys,
                onExpandedRowsChange: (keys) => model.expandedChanged(keys.map(String)),
                rowExpandable: () => true,
                expandedRowRender: (category) => (
                  <Flex vertical gap="small">
                    <Table
                      rowKey="id"
                      size="small"
                      dataSource={childrenByParent[category.id] ?? []}
                      loading={childrenPending.includes(category.id)}
                      columns={subColumns}
                      pagination={false}
                      locale={{ emptyText: 'Подкатегорий нет' }}
                    />
                    <div>
                      <Button
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() =>
                          CategoryCreateEdit.model.createTriggered({ level: 'sub', parentId: category.id })
                        }
                      >
                        {isSuperAdmin ? 'Добавить подкатегорию' : 'Предложить подкатегорию'}
                      </Button>
                    </div>
                  </Flex>
                ),
              }
            : undefined
        }
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

/**
 * `isTree` — таблица верхнего уровня без поиска: иконка, код, порядок, число подкатегорий.
 * `nested` — вложенная таблица подкатегорий. Иначе — плоская выдача поиска обоих уровней.
 */
const useColumns = ({
  isTree,
  nested = false,
}: {
  isTree: boolean;
  nested?: boolean;
}): TableProps<Category>['columns'] => {
  const [role] = useUnit([userModel.$role]);

  return [
    {
      key: 'icon',
      hidden: !isTree,
      render: (_, category) => <Avatar shape="square" size={40} src={category.iconUrl ?? undefined} />,
      width: 56,
    },
    {
      title: 'Название',
      key: 'name',
      render: (_, category) => (
        <Flex vertical>
          <span>{category.name}</span>
          {!isTree && !nested && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {category.parentId ? 'Подкатегория' : 'Категория товаров'}
            </Typography.Text>
          )}
        </Flex>
      ),
    },
    {
      title: 'Код',
      key: 'code',
      hidden: !isTree,
      render: (_, category) => <Tag>{category.code}</Tag>,
    },
    {
      title: (
        <Tooltip title="Порядок плиток на главной мобилки">
          <span>Порядок</span>
        </Tooltip>
      ),
      key: 'position',
      hidden: !isTree,
      render: (_, category) => category.position,
      width: 100,
    },
    {
      title: 'Переводы',
      key: 'translations',
      render: (_, category) => {
        // auto: true — перевод не задан (значение скопировано из RU), показываем «—».
        const label = (locale: 'UZ' | 'EN') => {
          const t = category.translations.find((t) => t.locale === locale);
          return `${locale}: ${t && !t.auto ? t.name : '—'}`;
        };

        return (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {[label('UZ'), label('EN')].join(', ')}
          </Typography.Text>
        );
      },
    },
    {
      title: 'Источник',
      key: 'source',
      hidden: isTree,
      render: (_, category) => (category.sellerId ? 'Продавец' : 'Мастер'),
    },
    {
      title: 'Подкатегории',
      key: 'childrenCount',
      hidden: !isTree,
      render: (_, category) => category.childrenCount,
      width: 130,
    },
    {
      title: 'Позиции каталога',
      key: 'itemsCount',
      render: (_, category) => category.itemsCount,
      width: 140,
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_, category) => <StatusTag status={category.status} />,
    },
    {
      title: 'Создано',
      key: 'createdAt',
      hidden: isTree,
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
