import { DeleteOutlined } from '@ant-design/icons';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Badge, Button, Col, Drawer, Flex, InputNumber, Row, Select, Spin, Table, Tabs, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useId } from 'react';
import { Controller, useFieldArray, useForm, useWatch, type FieldErrors } from 'react-hook-form';

import type { Locale } from '@/shared/api';
import { toTiyin } from '@/shared/lib/currency/currency';
import { formatPrice } from '@/shared/lib/format';
import { DateField, SwitchField, TextAreaField, TextField } from '@/shared/ui/form';

import * as model from '../model';

const LOCALES: { key: Locale; suffix: 'Ru' | 'Uz' | 'En' }[] = [
  { key: 'RU', suffix: 'Ru' },
  { key: 'UZ', suffix: 'Uz' },
  { key: 'EN', suffix: 'En' },
];

const hasLocaleErrors = (errors: FieldErrors<model.FormValues>, suffix: string) =>
  Object.keys(errors).some((key) => key.endsWith(suffix));

/** Обычная розница листинга в тиинах: без акции, если он сейчас на какой-то акции. */
const regularPrice = (listing: model.ListingInfo) => Number(listing.oldPrice ?? listing.price) || null;

/**
 * Скидка цены по акции от обычной розницы, % — для подсказки в форме. Тот же расчёт
 * бэкенд отдаёт в `discountBps` после сохранения; null — цена по акции не ниже обычной.
 */
const discountPercent = (listing: model.ListingInfo, promoPriceSum: number) => {
  const regular = regularPrice(listing);
  const promo = toTiyin(promoPriceSum);
  if (!regular || promo >= regular) return null;
  return Math.round(((regular - promo) / regular) * 100);
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
  const items = useWatch({ control: form.control, name: 'items' });
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
            <Col xs={24} md={8}>
              <DateField control={form.control} name="startDate" label="Первый день" placeholder="Сразу" />
            </Col>
            <Col xs={24} md={8}>
              <DateField
                control={form.control}
                name="endDate"
                label="Последний день (включительно)"
                placeholder="Бессрочно"
              />
            </Col>
            <Col xs={24} md={8}>
              <Typography.Text style={{ display: 'block', marginBottom: 6 }}>Статус</Typography.Text>
              <SwitchField control={form.control} name="enabled" label="Включена" />
            </Col>
          </Row>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: -8 }}>
            По датам цены меняются в 00:00 по Ташкенту. Сохранение применяется сразу. У каждой позиции своя цена по
            акции, процент скидки считается сам от обычной цены. Цена не может быть ниже себестоимости — продавец
            получает столько же, разницу оплачивает маржа платформы. Позиция со своей наценкой получит акцию, только
            если в «Приоритетах цены» акция стоит выше.
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
              // Цену по акции админ вводит сам — пустое поле подсветит валидация.
              if (listingId) append({ listingId, promoPrice: null });
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
                title: 'Цена по акции, сум',
                key: 'promoPrice',
                width: 170,
                render: (_, field, index) => (
                  <Controller
                    control={form.control}
                    name={`items.${index}.promoPrice`}
                    render={({ field: input, fieldState }) => {
                      const belowCost = model.isBelowCost(knownListings[field.listingId], input.value);
                      return (
                        <>
                          <InputNumber
                            value={input.value}
                            onChange={(value) => input.onChange(value ?? null)}
                            onBlur={input.onBlur}
                            min={0}
                            step={1000}
                            status={fieldState.error || belowCost ? 'error' : undefined}
                            style={{ width: '100%' }}
                          />
                          {(!!fieldState.error || belowCost) && (
                            <Typography.Text type="danger" style={{ display: 'block', fontSize: 12 }}>
                              {belowCost ? 'Ниже себестоимости' : fieldState.error?.message}
                            </Typography.Text>
                          )}
                        </>
                      );
                    }}
                  />
                ),
              },
              {
                title: 'Скидка ≈',
                key: 'discount',
                render: (_, field, index) => {
                  const listing = knownListings[field.listingId];
                  const promo = items[index]?.promoPrice;
                  if (!listing || promo === null || promo === undefined) return '—';
                  const percent = discountPercent(listing, Number(promo));
                  // Не ниже обычной — движок акцию не применит (фейковое «было» запрещено).
                  return percent === null ? (
                    <Typography.Text type="warning" style={{ fontSize: 12 }}>
                      Не ниже обычной — акция не применится
                    </Typography.Text>
                  ) : (
                    `−${percent}%`
                  );
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
