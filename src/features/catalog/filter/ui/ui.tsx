import { Col, Input, Row, Select, theme } from 'antd';
import { useUnit } from 'effector-react';

import { catalogConfig } from '@/entities/catalog';
import { useCategoryPickerSelects } from '@/entities/category';

import * as model from '../model';

export const View: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [
    search,
    searchChanged,
    status,
    statusChanged,
    categoryId,
    categoryChanged,
    subcategoryId,
    subcategoryChanged,
    countryId,
    countryChanged,
    countries,
    countriesSearch,
    countriesFetching,
    countriesSearchChanged,
  ] = useUnit([
    model.searchModel.$value,
    model.searchModel.changed,
    model.statusModel.$value,
    model.statusModel.changed,
    model.categoryModel.$value,
    model.categoryModel.changed,
    model.subcategoryModel.$value,
    model.subcategoryModel.changed,
    model.countryModel.$value,
    model.countryModel.changed,
    model.$countries,
    model.$countriesSearch,
    model.$countriesFetching,
    model.countriesSearchChanged,
  ]);
  const { token } = theme.useToken();

  const statusOptions = catalogConfig.useStatusOptions();
  const { categorySelect, subcategorySelect } = useCategoryPickerSelects({
    picker: model.categoryPicker,
    categoryId,
    subcategoryId,
    onCategoryChange: categoryChanged,
    onSubcategoryChange: subcategoryChanged,
    extraSubcategoryOptions: [{ label: 'Без подкатегории', value: model.NO_SUBCATEGORY }],
  });
  const countryOptions = countries.map((country) => ({ label: country.name, value: country.id }));

  return (
    <Row gutter={token.margin} style={{ width: '100%' }}>
      <Col span={4}>
        <Input
          value={search}
          onChange={(event) => searchChanged(event.target.value)}
          allowClear
          placeholder="Название"
        />
      </Col>
      <Col span={4}>{categorySelect}</Col>
      <Col span={4}>{subcategorySelect}</Col>
      <Col span={4}>
        <Select
          value={countryId}
          options={countryOptions}
          onChange={(value) => countryChanged(value ?? null)}
          allowClear
          style={{ width: '100%' }}
          placeholder="Страна"
          loading={countriesFetching}
          showSearch={{
            searchValue: countriesSearch,
            onSearch: countriesSearchChanged,
            filterOption: false,
            autoClearSearchValue: true,
          }}
        />
      </Col>
      <Col span={4}>
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
