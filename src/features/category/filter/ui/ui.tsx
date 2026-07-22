import { Col, Input, Row, Select, theme } from 'antd';
import { useUnit } from 'effector-react';

import { categoryConfig } from '@/entities/category';

import * as model from '../model';

export const View: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [search, searchChanged, status, statusChanged] = useUnit([
    model.searchModel.$value,
    model.searchModel.changed,
    model.statusModel.$value,
    model.statusModel.changed,
  ]);
  const { token } = theme.useToken();

  const statusOptions = categoryConfig.useStatusOptions();

  return (
    <Row gutter={token.margin} style={{ width: '100%' }}>
      <Col span={10}>
        <Input
          value={search}
          onChange={(event) => searchChanged(event.target.value)}
          allowClear
          placeholder="Название"
        />
      </Col>
      <Col span={10}>
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
