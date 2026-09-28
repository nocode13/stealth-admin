/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Button, Card, Flex, InputNumber, Spin, Table, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';

import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { thousandsSeparator } from '@/shared/lib/currency/currency';
import { NumberField } from '@/shared/ui/form';
import { withTitle } from '@/shared/ui/with-title';

import { factory, form as formBridge, DEFAULT_VALUES, MAX_TIERS, schema } from '../model';

type Model = ReturnType<typeof factory>;

const Page = ({ model }: LazyPageProps<Model>) => {
  const [settings, pending, saving, validated] = useUnit([
    model.$settings,
    model.$pending,
    model.$saving,
    model.validated,
  ]);

  const form = useForm<typeof DEFAULT_VALUES>({
    resolver: standardSchemaResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });
  formBridge.useBindFormWithModel({ form });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'markupTiers' });
  const tiers = useWatch({ control: form.control, name: 'markupTiers' });
  const tiersError = form.formState.errors.markupTiers;

  if (pending && !settings) return <Spin />;

  return (
    <form onSubmit={form.handleSubmit(() => validated())} style={{ width: '100%', maxWidth: 560 }}>
      <Flex vertical gap="middle">
        <Card title="Доставка" size="small">
          <NumberField control={form.control} name="deliveryFee" label="Стоимость доставки, сум" min={0} required />
          <NumberField
            control={form.control}
            name="freeDeliveryThreshold"
            label="Порог бесплатной доставки, сум"
            placeholder="Без порога"
            min={0}
          />
          <Typography.Text type="secondary" style={{ display: 'block' }}>
            Пустое поле — бесплатной доставки по порогу нет. Доставка также бесплатна, если все позиции корзины из
            вайтлиста в каталоге.
          </Typography.Text>
        </Card>
        <Card title="Ценообразование" size="small">
          <Typography.Text style={{ display: 'block', marginBottom: 6 }}>
            Базовая наценка по себестоимости<Typography.Text type="danger"> *</Typography.Text>
          </Typography.Text>
          <Table
            rowKey="id"
            dataSource={fields}
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Себестоимость от, сум',
                key: 'fromSum',
                render: (_, _field, index) => (
                  <Controller
                    control={form.control}
                    name={`markupTiers.${index}.fromSum`}
                    render={({ field, fieldState }) => (
                      <>
                        <InputNumber
                          value={field.value}
                          onChange={(value) => field.onChange(value ?? null)}
                          onBlur={field.onBlur}
                          min={0}
                          // Первая ступень всегда с нуля — иначе дешёвые позиции остались бы без наценки.
                          disabled={index === 0}
                          status={fieldState.error ? 'error' : undefined}
                          style={{ width: '100%' }}
                        />
                        {!!fieldState.error && (
                          <Typography.Text type="danger" style={{ display: 'block', fontSize: 12 }}>
                            {fieldState.error.message}
                          </Typography.Text>
                        )}
                      </>
                    )}
                  />
                ),
              },
              {
                title: 'до, сум',
                key: 'toSum',
                render: (_, _field, index) => {
                  const next = tiers[index + 1]?.fromSum;
                  return next ? thousandsSeparator(Number(next) - 1) : 'и выше';
                },
              },
              {
                title: 'Наценка, %',
                key: 'percent',
                width: 130,
                render: (_, _field, index) => (
                  <Controller
                    control={form.control}
                    name={`markupTiers.${index}.percent`}
                    render={({ field, fieldState }) => (
                      <InputNumber
                        value={field.value}
                        onChange={(value) => field.onChange(value ?? null)}
                        onBlur={field.onBlur}
                        min={0}
                        step={0.01}
                        status={fieldState.error ? 'error' : undefined}
                        style={{ width: '100%' }}
                      />
                    )}
                  />
                ),
              },
              {
                key: 'actions',
                width: 50,
                render: (_, _field, index) =>
                  index > 0 && <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(index)} />,
              },
            ]}
          />
          {!!tiersError?.root?.message && (
            <Typography.Text type="danger" style={{ display: 'block', fontSize: 12 }}>
              {tiersError.root.message}
            </Typography.Text>
          )}
          <Button
            icon={<PlusOutlined />}
            disabled={fields.length >= MAX_TIERS}
            onClick={() => {
              const last = tiers[tiers.length - 1];
              append({ fromSum: Number(last?.fromSum ?? 0) + 50_000, percent: Number(last?.percent ?? 20) });
            }}
            style={{ margin: '8px 0 16px' }}
          >
            Добавить ступень
          </Button>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Вся себестоимость позиции берётся под процент своей ступени. Цена не опускается ниже самой дорогой цены
            предыдущей ступени: при «до 50 000 — 60%, дальше 40%» позиция за 51 000 стоит 80 000, а не 71 400. Своя
            наценка позиции и акции — в карточке позиции и «Приоритетах цены».
          </Typography.Text>
          <NumberField
            control={form.control}
            name="priceRoundingStep"
            label="Округление цены вверх, сум"
            min={0.01}
            step={1}
            required
          />
          <Typography.Text type="secondary" style={{ display: 'block' }}>
            Цена на витрине = себестоимость продавца + наценка, округлённая вверх до шага. Изменение ступеней или шага
            пересчитывает цены всех позиций сразу.
          </Typography.Text>
        </Card>
        <div>
          <Button type="primary" htmlType="submit" loading={saving}>
            Сохранить
          </Button>
        </div>
      </Flex>
    </form>
  );
};

export const component = withTitle(Page, 'Настройки');
export const createModel = factory;
