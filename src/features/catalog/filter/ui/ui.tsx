import { Col, Input, Row, Select, theme } from 'antd';
import { useUnit } from 'effector-react';

import { catalogConfig } from '@/entities/catalog';

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
    categoriesSearch,
    categoriesFetching,
    categoriesSearchChanged,
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
    model.$categories,
    model.$categoriesSearch,
    model.$categoriesFetching,
    model.categoriesSearchChanged,
    model.countryModel.$value,
    model.countryModel.changed,
    model.$countries,
    model.$countriesSearch,
    model.$countriesFetching,
    model.countriesSearchChanged,
  ]);
  const { token } = theme.useToken();

  const statusOptions = catalogConfig.useStatusOptions();
  const categoryOptions = [
    { label: 'Без категории', value: model.NO_CATEGORY },
    ...categories.map((category) => ({ label: category.name, value: category.id })),
  ];
  const countryOptions = countries.map((country) => ({ label: country.name, value: country.id }));

  return (
    <Row gutter={token.margin} style={{ width: '100%' }}>
      <Col span={5}>
        <Input
          value={search}
          onChange={(event) => searchChanged(event.target.value)}
          allowClear
          placeholder="Название"
        />
      </Col>
      <Col span={5}>
        <Select
          value={categoryId}
          options={categoryOptions}
          onChange={(value) => categoryChanged(value ?? null)}
          allowClear
          style={{ width: '100%' }}
          placeholder="Категория"
          loading={categoriesFetching}
          showSearch={{
            searchValue: categoriesSearch,
            onSearch: categoriesSearchChanged,
            // Фильтрация серверная — клиентскую отключаем, иначе она режет ответ бэка.
            filterOption: false,
            autoClearSearchValue: true,
          }}
        />
      </Col>
      <Col span={5}>
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
      <Col span={4}>{children}</Col>
    </Row>
  );
};
