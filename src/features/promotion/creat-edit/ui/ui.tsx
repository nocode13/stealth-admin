import { DeleteOutlined } from '@ant-design/icons';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Badge, Button, Col, Drawer, Flex, InputNumber, Row, Select, Spin, Table, Tabs, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useId } from 'react';
import { Controller, useFieldArray, useForm, useWatch, type FieldErrors } from 'react-hook-form';

import type { Locale } from '@/shared/api';
import { formatPrice } from '@/shared/lib/format';
import { DateField, NumberField, SwitchField, TextAreaField, TextField } from '@/shared/ui/form';

import * as model from '../model';

const LOCALES: { key: Locale; suffix: 'Ru' | 'Uz' | 'En' }[] = [
  { key: 'RU', suffix: 'Ru' },
  { key: 'UZ', suffix: 'Uz' },
  { key: 'EN', suffix: 'En' },
];

const hasLocaleErrors = (errors: FieldErrors<model.FormValues>, suffix: string) =>
  Object.keys(errors).some((key) => key.endsWith(suffix));

/**
 * Прикидка цены по акции — только для подсказки в форме: скидка от обычной розницы,
 * не ниже себестоимости. Точную цену (с округлением) считает бэкенд после сохранения.
 */
const estimatePromoPrice = (listing: model.ListingInfo, percent: number) => {
  const regular = Number(listing.oldPrice ?? listing.price);
  if (!regular) return null;
  return String(Math.max(Math.round(regular * (1 - percent / 100)), Number(listing.costPrice)));
};

export const PromotionDrawer = () => {
  const [
    isOpen,
    editing,
    mode,
    loadingDetail,
    mutating,
    listings,
    knownListings,
    listingsSearch,
    listingsFetching,
    listingsSearchChanged,
    validated,
    closeRequested,
  ] = useUnit([
    model.disclosure.$isOpen,
    model.$editing,
    model.$mode,
    model.$loadingDetail,
    model.$mutating,
    model.$listings,
    model.$knownListings,
    model.$listingsSearch,
    model.$listingsFetching,
    model.listingsSearchChanged,
    model.validated,
    model.reset,
  ]);

  const formId = useId();

  const form = useForm<model.FormValues>({
    resolver: standardSchemaResolver(model.schema),
    defaultValues: model.DEFAULT_VALUES,
  });
  model.form.useBindFormWithModel({ form });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const [discountPercent, items] = useWatch({ control: form.control, name: ['discountPercent', 'items'] });
  const errors = form.formState.errors;

  const selectedIds = new Set(items.map((item) => item.listingId));
  const listingOptions = listings
    .filter((l) => !selectedIds.has(l.id))
    .map((l) => ({ value: l.id, label: `${l.name} — ${l.sellerName}` }));

  const loading = mode === 'edit' && (loadingDetail || !editing);

  return (
    <Drawer
      title={mode === 'edit' ? 'Редактировать акцию' : 'Новая акция'}
      open={isOpen}
      onClose={() => closeRequested()}
      size={1000}
      destroyOnHidden
      extra={
        <Flex gap="small">
          <Button onClick={() => closeRequested()}>Отмена</Button>
          <Button type="primary" htmlType="submit" form={formId} loading={mutating} disabled={loading}>
            Сохранить
          </Button>
        </Flex>
      }
    >
      <Spin spinning={loading}>
        <form onSubmit={form.handleSubmit(() => validated())} id={formId}>
          <Tabs
            items={LOCALES.map(({ key, suffix }) => ({
              key,
              label: (
                <Badge dot={hasLocaleErrors(errors, suffix)} offset={[6, 0]}>
                  {key}
                </Badge>
              ),
              forceRender: true,
              children: (
                <>
                  {key !== 'RU' && (
                    <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
                      Пустые поля заменятся русским текстом.
                    </Typography.Paragraph>
                  )}
                  <TextField
                    control={form.control}
                    name={`title${suffix}` as const}
                    label="Название — покупатель увидит его в карточке товара"
                    placeholder="Осенняя распродажа"
                    required={key === 'RU'}
                  />
                  <TextAreaField
                    control={form.control}
                    name={`description${suffix}` as const}
                    label="Описание"
                    placeholder="Скидки на розы до конца недели"
                    rows={2}
                  />
                </>
              ),
            }))}
          />

          <Row gutter={16}>
            <Col xs={24} md={6}>
              <NumberField
                control={form.control}
                name="discountPercent"
                label="Скидка, %"
                min={model.MIN_PERCENT}
                max={model.MAX_PERCENT}
                step={1}
                required
              />
            </Col>
            <Col xs={24} md={6}>
              <DateField control={form.control} name="startDate" label="Первый день" placeholder="Сразу" />
            </Col>
            <Col xs={24} md={6}>
              <DateField
                control={form.control}
                name="endDate"
                label="Последний день (включительно)"
                placeholder="Бессрочно"
              />
            </Col>
            <Col xs={24} md={6}>
              <Typography.Text style={{ display: 'block', marginBottom: 6 }}>Статус</Typography.Text>
              <SwitchField control={form.control} name="enabled" label="Включена" />
            </Col>
          </Row>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: -8 }}>
            По датам цены меняются в 00:00 по Ташкенту. Сохранение применяется сразу. Скидка считается от обычной цены и
            не опускает её ниже себестоимости — продавец получает столько же, разницу оплачивает маржа платформы.
          </Typography.Paragraph>

          <Typography.Title level={5}>
            Позиции<Typography.Text type="danger"> *</Typography.Text>
          </Typography.Title>
          <Select
            value={null}
            placeholder="Найти позицию и добавить в акцию"
            showSearch={{
              searchValue: listingsSearch,
              onSearch: listingsSearchChanged,
              filterOption: false,
              autoClearSearchValue: true,
            }}
            options={listingOptions}
            loading={listingsFetching}
            notFoundContent={listingsFetching ? 'Поиск…' : 'Ничего не нашли'}
            onChange={(listingId: string | null) => {
              if (listingId) append({ listingId, discountPercent: null });
            }}
            size="large"
            style={{ width: '100%', marginBottom: 12 }}
          />
          {!!errors.items && (
            <Typography.Text type="danger" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
              {errors.items.message ?? errors.items.root?.message}
            </Typography.Text>
          )}

          <Table
            rowKey="id"
            dataSource={fields}
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Позиция',
                key: 'name',
                render: (_, field) => {
                  const listing = knownListings[field.listingId];
                  if (!listing) return field.listingId;
                  return (
                    <Flex vertical>
                      <span>{listing.name}</span>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {listing.sellerName}
                      </Typography.Text>
                    </Flex>
                  );
                },
              },
              {
                title: 'Себестоимость',
                key: 'costPrice',
                render: (_, field) => {
                  const listing = knownListings[field.listingId];
                  return listing ? formatPrice(listing.costPrice) : '—';
                },
              },
              {
                title: 'Обычная цена',
                key: 'regular',
                render: (_, field) => {
                  const listing = knownListings[field.listingId];
                  const regular = listing?.oldPrice ?? listing?.price;
                  return regular ? formatPrice(regular) : '—';
                },
              },
              {
                title: 'Своя скидка, %',
                key: 'discountPercent',
                width: 140,
                render: (_, _field, index) => (
                  <Controller
                    control={form.control}
                    name={`items.${index}.discountPercent`}
                    render={({ field, fieldState }) => (
                      <InputNumber
                        value={field.value}
                        onChange={(value) => field.onChange(value ?? null)}
                        onBlur={field.onBlur}
                        min={model.MIN_PERCENT}
                        max={model.MAX_PERCENT}
                        placeholder={String(discountPercent ?? '')}
                        status={fieldState.error ? 'error' : undefined}
                        style={{ width: '100%' }}
                      />
                    )}
                  />
                ),
              },
              {
                title: 'Цена по акции ≈',
                key: 'estimate',
                render: (_, field, index) => {
                  const listing = knownListings[field.listingId];
                  const percent = items[index]?.discountPercent ?? discountPercent;
                  const estimate = listing && percent ? estimatePromoPrice(listing, percent) : null;
                  return estimate ? formatPrice(estimate) : '—';
                },
              },
              {
                key: 'actions',
                width: 50,
                render: (_, _field, index) => (
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(index)} />
                ),
              },
            ]}
          />
        </form>
      </Spin>
    </Drawer>
  );
};
