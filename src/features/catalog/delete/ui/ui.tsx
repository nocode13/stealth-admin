import { DeleteOutlined } from '@ant-design/icons';
import { Button, Popconfirm } from 'antd';
import { useUnit } from 'effector-react';

import type { CatalogItem } from '@/entities/catalog';

import * as model from '../model';

export const CatalogDeleteButton = ({ item }: { item: CatalogItem }) => {
  const [mutating, deleteTriggered] = useUnit([model.$mutating, model.deleteTriggered]);

  return (
    <Popconfirm
      title="Удалить позицию каталога?"
      onConfirm={() => deleteTriggered(item)}
      okText="Удалить"
      cancelText="Отмена"
    >
      <Button size="small" danger icon={<DeleteOutlined />} loading={mutating} />
    </Popconfirm>
  );
};
