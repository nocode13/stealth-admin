import { Col, Input, InputNumber, Row, Select, theme } from 'antd';
import { useUnit } from 'effector-react';

import { listingConfig } from '@/entities/listing';
import { userModel } from '@/entities/user';

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
    sellerId,
    sellerChanged,
    sellers,
    role,
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
    model.sellerModel.$value,
    model.sellerModel.changed,
    model.$sellers,
    userModel.$role,
  ]);
  const { token } = theme.useToken();

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const statusOptions = listingConfig.useStatusOptions();
  const categoryOptions = categories.map((category) => ({ label: category.name, value: category.id }));
  const sellerOptions = sellers.map((seller) => ({ label: seller.name, value: seller.id }));

  return (
    <Row gutter={[token.margin, token.margin]} style={{ width: '100%' }}>
      <Col span={isSuperAdmin ? 4 : 6}>
        <Input
          value={search}
          onChange={(event) => searchChanged(event.target.value)}
          allowClear
          placeholder="Название"
        />
      </Col>
      <Col span={isSuperAdmin ? 4 : 6}>
        <Select
          value={categoryId}
          options={categoryOptions}
          onChange={(value) => categoryChanged(value ?? null)}
          allowClear
          style={{ width: '100%' }}
          placeholder="Категория"
        />
      </Col>
      {isSuperAdmin && (
        <Col span={5}>
          <Select
            value={sellerId}
            options={sellerOptions}
            onChange={(value) => sellerChanged(value ?? null)}
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: '100%' }}
            placeholder="Продавец"
          />
        </Col>
      )}
      <Col span={isSuperAdmin ? 4 : 5}>
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
