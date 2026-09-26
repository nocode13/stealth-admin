/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Popconfirm, Table, type TableProps } from 'antd';
import { useUnit } from 'effector-react';

import { PromotionCreateEdit } from '@/features/promotion/creat-edit';
import { PromotionFilters } from '@/features/promotion/filter';
import { StateTag, bpsToPercent, formatPeriod, type Promotion } from '@/entities/promotion';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { withTitle } from '@/shared/ui/with-title';

import { factory } from '../model';

type Model = ReturnType<typeof factory>;

const Page = ({ model }: LazyPageProps<Model>) => {
  const [promotions, nextCursor, pending] = useUnit([model.$promotions, model.$nextCursor, model.$pending]);

  return (
    <Flex vertical gap="middle" style={{ width: '100%' }}>
      <PromotionFilters.View>
        <Button
          type="primary"
          onClick={() => PromotionCreateEdit.model.createTriggered()}
          icon={<PlusOutlined />}
          style={{ width: '100%' }}
        >
          Создать
        </Button>
      </PromotionFilters.View>

      <Table
        rowKey="id"
        dataSource={promotions}
        loading={pending}
        columns={COLUMNS}
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
      <PromotionCreateEdit.View />
    </Flex>
  );
};

const COLUMNS: TableProps<Promotion>['columns'] = [
  {
    title: 'Название',
    dataIndex: 'title',
  },
  {
    title: 'Скидка',
    key: 'discount',
    render: (_, promotion) => `−${bpsToPercent(promotion.discountBps)}%`,
    width: 100,
  },
  {
    title: 'Период',
    key: 'period',
    render: (_, promotion) => formatPeriod(promotion.startDate, promotion.endDate),
  },
  {
    title: 'Статус',
    key: 'state',
    render: (_, promotion) => <StateTag state={promotion.state} />,
    width: 140,
  },
  {
    title: 'Позиций',
    dataIndex: 'itemsCount',
    width: 100,
  },
  {
    key: 'actions',
    render: (_, promotion) => (
      <Flex gap={4}>
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => PromotionCreateEdit.model.editTriggered(promotion)}
        />
        <Popconfirm
          title="Удалить акцию?"
          description="Цены позиций сразу вернутся к обычным."
          onConfirm={() => PromotionCreateEdit.model.deleteRequested(promotion)}
          okText="Удалить"
          cancelText="Отмена"
        >
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Flex>
    ),
    width: 90,
  },
];

export const component = withTitle(Page, 'Акции');
export const createModel = factory;
