import { DeleteOutlined } from '@ant-design/icons';
import { Button, Popconfirm } from 'antd';
import { useUnit } from 'effector-react';

import type { Listing } from '@/entities/listing';

import * as model from '../model';

export const ListingDeleteButton = ({ item }: { item: Listing }) => {
  const [mutating, deleteTriggered] = useUnit([model.$mutating, model.deleteTriggered]);

  return (
    <Popconfirm title="Удалить позицию?" onConfirm={() => deleteTriggered(item)} okText="Удалить" cancelText="Отмена">
      <Button size="small" danger icon={<DeleteOutlined />} loading={mutating} />
    </Popconfirm>
  );
};
