/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Col, Empty, Flex, InputNumber, List, Row, Segmented, Select, Spin, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useState } from 'react';

import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { formatDate } from '@/shared/lib/format';
import { withTitle } from '@/shared/ui/with-title';

import type { ApplyResult } from '../lib/apply';
import type { ManifestGroup } from '../lib/manifest';
import { factory, type CardFilter } from '../model';
import { ImportCard } from './import-card';

type Model = ReturnType<typeof factory>;

const PAGE_SIZE = 10;

const FILTERS: { value: CardFilter; label: string }[] = [
  { value: 'pending', label: 'Ожидают' },
  { value: 'warnings', label: 'С предупреждениями' },
  { value: 'noPrice', label: 'Без цены' },
  { value: 'error', label: 'Ошибки' },
  { value: 'done', label: 'Готово' },
  { value: 'skipped', label: 'Пропущены' },
  { value: 'all', label: 'Все' },
];

const matchesFilter = (filter: CardFilter, group: ManifestGroup, result: ApplyResult | undefined) => {
  const open = result?.status !== 'done' && result?.status !== 'skipped';
  switch (filter) {
    case 'pending':
      return open;
    case 'warnings':
      return open && group.warnings.length > 0;
    case 'noPrice':
      return open && !group.excelRows.some((row) => row.retailUsd !== null);
    case 'error':
      return result?.status === 'error';
    case 'done':
      return result?.status === 'done';
    case 'skipped':
      return result?.status === 'skipped';
    case 'all':
      return true;
  }
};

const Toolbar = ({ model }: { model: Model }) => {
  const [batches, batch, system, rate, defaults, systemPending] = useUnit([
    model.$batches,
    model.$batch,
    model.$system,
    model.$rate,
    model.$defaults,
    model.$systemPending,
  ]);
  const roots = system?.categories.filter((category) => !category.parentId) ?? [];
  const subcategories = system?.categories.filter((category) => category.parentId === defaults.categoryId) ?? [];

  return (
    <Row gutter={[12, 12]} align="middle">
      <Col xs={24} lg={8}>
        <Select
          style={{ width: '100%' }}
          placeholder="Партия"
          value={batch}
          options={batches.map((b) => ({
            value: b.batch,
            label: `${b.batch} · ${b.groups} постов · ${formatDate(b.createdAt)}`,
          }))}
          onChange={(value: string) => model.batchSelected(value)}
        />
      </Col>
      <Col xs={12} lg={4}>
        <InputNumber
          style={{ width: '100%' }}
          min={1}
          precision={0}
          prefix="1 $ ="
          suffix="сум"
          placeholder="курс"
          value={rate}
          status={rate ? undefined : 'error'}
          onChange={(value) => model.rateChanged(value === null ? null : Number(value))}
        />
      </Col>
      <Col xs={12} lg={4}>
        <Select
          style={{ width: '100%' }}
          placeholder="Продавец по умолчанию"
          value={defaults.sellerId}
          options={system?.sellers.map((seller) => ({ value: seller.id, label: seller.name })) ?? []}
          showSearch={{ optionFilterProp: 'label' }}
          allowClear
          onChange={(value: string | undefined) => model.defaultsChanged({ sellerId: value ?? null })}
        />
      </Col>
      <Col xs={12} lg={3}>
        <Select
          style={{ width: '100%' }}
          placeholder="Категория"
          value={defaults.categoryId}
          options={roots.map((category) => ({ value: category.id, label: category.name }))}
          allowClear
          onChange={(value: string | undefined) =>
            model.defaultsChanged({ categoryId: value ?? null, subcategoryId: null })
          }
        />
      </Col>
      <Col xs={12} lg={3}>
        <Select
          style={{ width: '100%' }}
          placeholder="Подкатегория"
          value={defaults.subcategoryId}
          options={subcategories.map((category) => ({ value: category.id, label: category.name }))}
          showSearch={{ optionFilterProp: 'label' }}
          allowClear
          disabled={!defaults.categoryId}
          onChange={(value: string | undefined) => model.defaultsChanged({ subcategoryId: value ?? null })}
        />
      </Col>
      <Col xs={12} lg={2}>
        <Select
          style={{ width: '100%' }}
          placeholder="Страна"
          value={defaults.countryId}
          options={system?.countries.map((country) => ({ value: country.id, label: country.name })) ?? []}
          showSearch={{ optionFilterProp: 'label' }}
          allowClear
          onChange={(value: string | undefined) => model.defaultsChanged({ countryId: value ?? null })}
        />
      </Col>
      <Col xs={24}>
        <Flex gap={12} align="center" wrap>
          <Button icon={<ReloadOutlined />} loading={systemPending} onClick={() => model.refreshClicked()}>
            Обновить данные
          </Button>
          <Typography.Text type="secondary">
            {system
              ? `В системе: ${system.catalogs.length} каталогов, ${system.listings.length} позиций · ` +
                `загружено ${new Date(system.loadedAt).toLocaleTimeString('ru-RU')}`
              : 'Загружаю каталог и позиции…'}
          </Typography.Text>
        </Flex>
      </Col>
    </Row>
  );
};

const Page = ({ model }: LazyPageProps<Model>) => {
  const [
    batches,
    batch,
    manifest,
    system,
    rate,
    defaults,
    filter,
    results,
    applyingId,
    overrides,
    plantCatalogs,
    manifestPending,
  ] = useUnit([
    model.$batches,
    model.$batch,
    model.$manifest,
    model.$system,
    model.$rate,
    model.$defaults,
    model.$filter,
    model.$results,
    model.$applyingId,
    model.$overrides,
    model.$plantCatalogs,
    model.$manifestPending,
  ]);
  const [page, setPage] = useState(1);

  const groups = manifest?.groups ?? [];
  const visible = groups.filter((group) => matchesFilter(filter, group, results[group.id]));
  const counts = Object.fromEntries(
    FILTERS.map(({ value }) => [value, groups.filter((group) => matchesFilter(value, group, results[group.id])).length]),
  ) as Record<CardFilter, number>;

  return (
    <Flex vertical gap="middle" style={{ width: '100%' }}>
      <Toolbar model={model} />

      {batches.length === 0 && (
        <Empty
          description={
            <>
              Партий нет. Подготовь её скриптом <Typography.Text code>tools/catalog-import/prepare.py</Typography.Text>{' '}
              (см. README рядом) и нажми «Обновить данные».
            </>
          }
        />
      )}

      {manifest?.apiBaseUrl && (
        <Alert
          type="info"
          showIcon
          title={`Каталоги Claude подбирал по снимку ${manifest.apiBaseUrl} от ${manifest.snapshotAt?.replace('T', ' ')}. Позиции и SKU на карточках сверяются с живыми данными.`}
        />
      )}

      {manifest && (
        <Segmented
          options={FILTERS.map(({ value, label }) => ({ value, label: `${label} · ${counts[value]}` }))}
          value={filter}
          onChange={(value) => {
            model.filterChanged(value as CardFilter);
            setPage(1);
          }}
        />
      )}

      {batch && (manifestPending || !system) && <Spin />}

      {manifest && system && batch && (
        <List
          dataSource={visible}
          rowKey={(group) => group.id}
          pagination={{ current: page, pageSize: PAGE_SIZE, onChange: setPage, showSizeChanger: false }}
          renderItem={(group) => (
            <List.Item style={{ display: 'block', borderBlockEnd: 'none', paddingBlock: 6 }}>
              <ImportCard
                batch={batch}
                group={group}
                plant={manifest.plants[group.plantKey]}
                system={system}
                defaults={defaults}
                rate={rate}
                overrides={overrides[group.id] ?? {}}
                plantCatalog={plantCatalogs[group.plantKey]}
                result={results[group.id]}
                applying={applyingId === group.id}
                busy={applyingId !== null}
                onChange={(patch) => model.overrideChanged({ groupId: group.id, patch })}
                onApprove={(plan) => model.approveClicked(plan)}
                onSkip={() => model.skipClicked({ groupId: group.id, plantKey: group.plantKey })}
                onUnskip={() => model.unskipClicked(group.id)}
              />
            </List.Item>
          )}
        />
      )}
    </Flex>
  );
};

export const component = withTitle(Page, 'Импорт каталога');
export const createModel = factory;
