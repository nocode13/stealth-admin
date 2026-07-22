import { Col, Input, Row, Select, theme } from 'antd';
import { useUnit } from 'effector-react';

import { catalogConfig } from '@/entities/catalog';

import * as model from '../model';

export const View: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [search, searchChanged, status, statusChanged, categoryId, categoryChanged, categories] = useUnit([
    model.searchModel.$value,
    model.searchModel.changed,
    model.statusModel.$value,
    model.statusModel.changed,
    model.categoryModel.$value,
    model.categoryModel.changed,
    model.$categories,
  ]);
  const { token } = theme.useToken();

  const statusOptions = catalogConfig.useStatusOptions();
  const categoryOptions = categories.map((category) => ({ label: category.nameRu, value: category.id }));

  return (
    <Row gutter={token.margin} style={{ width: '100%' }}>
      <Col span={7}>
        <Input
          value={search}
          onChange={(event) => searchChanged(event.target.value)}
          allowClear
          placeholder="Название"
        />
      </Col>
      <Col span={7}>
        <Select
          value={categoryId}
          options={categoryOptions}
          onChange={(value) => categoryChanged(value ?? null)}
          allowClear
          style={{ width: '100%' }}
          placeholder="Категория"
        />
      </Col>
      <Col span={6}>
        <Select
          value={status}
          options={statusOptions}
          onChange={(value) => statusChanged(value ?? null)}
          allowClear
          style={{ width: '100%' }}
          placeholder="Статус"
        />
      </Col>
      <Col span={4}>{children}</Col>
    </Row>
  );
};
