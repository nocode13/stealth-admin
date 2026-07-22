import { Col, Input, InputNumber, Row, Select, theme } from 'antd';
import { useUnit } from 'effector-react';

import { listingConfig } from '@/entities/listing';

import * as model from '../model';

export const View: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [
    search,
    searchChanged,
    status,
    statusChanged,
    categoryId,
    categoryChanged,
    categories,
    minPrice,
    minPriceChanged,
    maxPrice,
    maxPriceChanged,
  ] = useUnit([
    model.searchModel.$value,
    model.searchModel.changed,
    model.statusModel.$value,
    model.statusModel.changed,
    model.categoryModel.$value,
    model.categoryModel.changed,
    model.$categories,
    model.minPriceModel.$value,
    model.minPriceModel.changed,
    model.maxPriceModel.$value,
    model.maxPriceModel.changed,
  ]);
  const { token } = theme.useToken();

  const statusOptions = listingConfig.useStatusOptions();
  const categoryOptions = categories.map((category) => ({ label: category.nameRu, value: category.id }));

  return (
    <Row gutter={[token.margin, token.margin]} style={{ width: '100%' }}>
      <Col span={6}>
        <Input
          value={search}
          onChange={(event) => searchChanged(event.target.value)}
          allowClear
          placeholder="Название"
        />
      </Col>
      <Col span={6}>
        <Select
          value={categoryId}
          options={categoryOptions}
          onChange={(value) => categoryChanged(value ?? null)}
          allowClear
          style={{ width: '100%' }}
          placeholder="Категория"
        />
      </Col>
      <Col span={5}>
        <Select
          value={status}
          options={statusOptions}
          onChange={(value) => statusChanged(value ?? null)}
          allowClear
          style={{ width: '100%' }}
          placeholder="Статус"
        />
      </Col>
      <Col span={3}>
        <InputNumber
          value={minPrice}
          onChange={(value) => minPriceChanged(value ?? null)}
          min={0}
          style={{ width: '100%' }}
          placeholder="Цена от"
        />
      </Col>
      <Col span={3}>
        <InputNumber
          value={maxPrice}
          onChange={(value) => maxPriceChanged(value ?? null)}
          min={0}
          style={{ width: '100%' }}
          placeholder="Цена до"
        />
      </Col>
      <Col span={1}>{children}</Col>
    </Row>
  );
};
