/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Popconfirm, Table, Tag, Typography, type TableProps } from 'antd';
import { useUnit } from 'effector-react';

import { PriceRuleCreateEdit } from '@/features/price-rule/creat-edit';
import { PriceRuleFilters } from '@/features/price-rule/filter';
import { priceRuleConfig, type PriceRule } from '@/entities/price-rule';
import { bpsToPercent, formatPeriod } from '@/entities/promotion';
import { formatAmount } from '@/shared/lib/currency/currency';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { withTitle } from '@/shared/ui/with-title';

import { factory } from '../model';

type Model = ReturnType<typeof factory>;

const Page = ({ model }: LazyPageProps<Model>) => {
  const [rules, nextCursor, pending] = useUnit([model.$rules, model.$nextCursor, model.$pending]);

  return (
    <Flex vertical gap="middle" style={{ width: '100%' }}>
      <PriceRuleFilters.View>
        <Button
          type="primary"
          onClick={() => PriceRuleCreateEdit.model.createTriggered()}
          icon={<PlusOutlined />}
          style={{ width: '100%' }}
        >
          Создать
        </Button>
      </PriceRuleFilters.View>

      <Table rowKey="id" dataSource={rules} loading={pending} columns={COLUMNS} pagination={false} />
      {nextCursor !== null && (
        <Flex justify="center">
          <Button loading={pending} onClick={() => model.loadMoreClicked()}>
            Загрузить ещё
          </Button>
        </Flex>
      )}
      <PriceRuleCreateEdit.View />
    </Flex>
  );
};

const formatValue = (rule: PriceRule) => {
  switch (rule.action) {
    case 'MARKUP_PERCENT':
      return `+${bpsToPercent(rule.value)}% к себестоимости`;
    case 'DISCOUNT_PERCENT':
      return `−${bpsToPercent(rule.value)}% от розницы`;
    case 'FIXED_PRICE':
      return `${formatAmount(rule.value)} сум`;
  }
};

const formatScope = (rule: PriceRule) => {
  const parts = [
    rule.seller && `продавец «${rule.seller.name}»`,
    rule.category && `категория «${rule.category.name}»`,
    rule.catalogItem && `позиция «${rule.catalogItem.name}»`,
    rule.listing && `листинг «${rule.listing.name}»`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'вся витрина';
};

const formatStock = (rule: PriceRule) => {
  if (rule.minStock === null && rule.maxStock === null) return null;
  return `остаток ${rule.minStock ?? 0}–${rule.maxStock ?? '∞'}`;
};

const COLUMNS: TableProps<PriceRule>['columns'] = [
  {
    title: 'Приоритет',
    dataIndex: 'priority',
    width: 100,
  },
  {
    title: 'Название',
    key: 'name',
    render: (_, rule) => (
      <Flex vertical>
        <span>{rule.name}</span>
        {!rule.enabled && (
          <Tag color="orange" style={{ width: 'fit-content' }}>
            выключено
          </Tag>
        )}
      </Flex>
    ),
  },
  {
    title: 'Действие',
    key: 'action',
    render: (_, rule) => (
      <Flex vertical>
        <span>{formatValue(rule)}</span>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {priceRuleConfig.actionOptions[rule.action]}
        </Typography.Text>
      </Flex>
    ),
  },
  {
    title: 'Область',
    key: 'scope',
    render: (_, rule) => formatScope(rule),
  },
  {
    title: 'Условия',
    key: 'conditions',
    render: (_, rule) => [formatPeriod(rule.startDate, rule.endDate), formatStock(rule)].filter(Boolean).join(', '),
  },
  {
    title: 'Применено',
    key: 'appliedCount',
    render: (_, rule) => rule.appliedCount,
    width: 110,
  },
  {
    key: 'actions',
    render: (_, rule) => (
      <Flex gap={4}>
        <Button size="small" icon={<EditOutlined />} onClick={() => PriceRuleCreateEdit.model.editTriggered(rule)} />
        <Popconfirm
          title="Удалить правило?"
          description="Цены в его области сразу пересчитаются."
          onConfirm={() => PriceRuleCreateEdit.model.deleteRequested(rule)}
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

export const component = withTitle(Page, 'Правила цены');
export const createModel = factory;
