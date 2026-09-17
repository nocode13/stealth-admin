import { DisconnectOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Table, Typography, type TableProps } from 'antd';
import { useUnit } from 'effector-react';

import { StatusTag } from '@/entities/catalog';
import type { CatalogItem } from '@/entities/catalog';

import * as items from '../items';

export const CategoryItems = () => {
  const [list, pending, hasMore] = useUnit([items.$items, items.$pending, items.$hasMore]);
  const columns = useColumns();

  return (
    <>
      <Typography.Title level={5} style={{ marginTop: 24 }}>
        Позиции каталога
      </Typography.Title>
      <Table rowKey="id" dataSource={list} loading={pending} columns={columns} pagination={false} size="small" />
      {hasMore && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Показаны первые 100 позиций — остальные ищите на странице «Каталог».
        </Typography.Text>
      )}
    </>
  );
};

const useColumns = (): TableProps<CatalogItem>['columns'] => {
  const [detachingIds, detachTriggered] = useUnit([items.$detachingIds, items.detachTriggered]);

  return [
    { title: 'Название', dataIndex: 'name' },
    {
      title: 'Статус',
      key: 'status',
      render: (_, item) => <StatusTag status={item.status} />,
      width: 120,
    },
    {
      key: 'actions',
      align: 'right',
      render: (_, item) => (
        <Popconfirm
          title="Отвязать позицию от категории?"
          description="Позиция останется в каталоге, но без категории."
          onConfirm={() => detachTriggered(item)}
          okText="Отвязать"
          cancelText="Отмена"
        >
          <Button size="small" danger icon={<DisconnectOutlined />} loading={detachingIds.includes(item.id)} />
        </Popconfirm>
      ),
      width: 57,
    },
  ];
};
