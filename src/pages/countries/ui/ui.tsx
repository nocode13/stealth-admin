/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Popconfirm, Table, Typography, type TableProps } from 'antd';
import { useUnit } from 'effector-react';

import { CountryCreateEdit } from '@/features/country/creat-edit';
import { CountryFilters } from '@/features/country/filter';
import type { Country } from '@/entities/country';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { formatDate } from '@/shared/lib/format';
import { withTitle } from '@/shared/ui/with-title';

import { factory } from '../model';

type Model = ReturnType<typeof factory>;

const Page = ({ model }: LazyPageProps<Model>) => {
  const [countries, nextCursor, pending] = useUnit([model.$countries, model.$nextCursor, model.$pending]);
  const columns = useColumns();

  return (
    <Flex vertical gap="middle" style={{ width: '100%' }}>
      <CountryFilters.View>
        <Button
          type="primary"
          onClick={() => CountryCreateEdit.model.createTriggered()}
          icon={<PlusOutlined />}
          style={{ width: '100%' }}
        >
          Создать
        </Button>
      </CountryFilters.View>

      <Table
        rowKey="id"
        dataSource={countries}
        loading={pending}
        columns={columns}
        pagination={false}
        style={{ width: '100%' }}
      />
      {nextCursor !== null && (
        <Flex justify="center">
          <Button loading={pending} onClick={() => model.loadMoreClicked()}>
            Загрузить ещё
          </Button>
        </Flex>
      )}
      <CountryCreateEdit.View />
    </Flex>
  );
};

const useColumns = (): TableProps<Country>['columns'] => {
  return [
    {
      title: 'Код',
      dataIndex: 'code',
      width: 80,
    },
    {
      title: 'Название',
      dataIndex: 'name',
    },
    {
      title: 'Переводы',
      key: 'translations',
      render: (_, country) => {
        // auto: true — перевод не задан (значение скопировано из RU), показываем «—».
        const label = (locale: 'UZ' | 'EN') => {
          const t = country.translations.find((t) => t.locale === locale);
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
      title: 'Позиции каталога',
      key: 'itemsCount',
      render: (_, country) => country.itemsCount,
      width: 140,
    },
    {
      title: 'Создано',
      key: 'createdAt',
      render: (_, country) => formatDate(country.createdAt),
    },
    {
      key: 'actions',
      render: (_, country) => (
        <Flex gap={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => CountryCreateEdit.model.editTriggered(country)} />
          <Popconfirm
            title="Удалить страну?"
            onConfirm={() => CountryCreateEdit.model.deleteRequested(country)}
            okText="Удалить"
            cancelText="Отмена"
            disabled={country.itemsCount > 0}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={country.itemsCount > 0}
              title={country.itemsCount > 0 ? 'Сначала отвяжите позиции каталога от страны' : undefined}
            />
          </Popconfirm>
        </Flex>
      ),
      width: 90,
    },
  ];
};

export const component = withTitle(Page, 'Страны');
export const createModel = factory;
