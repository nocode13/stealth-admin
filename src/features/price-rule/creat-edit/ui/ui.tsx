import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Button, Col, Drawer, Flex, Row, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useId } from 'react';
import { useForm, useWatch, type Control } from 'react-hook-form';

import { priceRuleConfig, type PriceRuleAction } from '@/entities/price-rule';
import { DateField, NumberField, SelectField, SwitchField, TextField } from '@/shared/ui/form';

import * as model from '../model';

const ACTION_OPTIONS = (Object.keys(priceRuleConfig.actionOptions) as PriceRuleAction[]).map((value) => ({
  value,
  label: priceRuleConfig.actionOptions[value],
}));

const VALUE_LABEL: Record<PriceRuleAction, string> = {
  MARKUP_PERCENT: 'Наценка на себестоимость, %',
  DISCOUNT_PERCENT: 'Скидка от розницы по базовой наценке, %',
  FIXED_PRICE: 'Цена, сум',
};

type ScopeSelect = typeof model.sellerSelect;

/** Селект области правила с серверным поиском; пусто = без ограничения. */
const ScopeField = ({
  control,
  name,
  label,
  select,
}: {
  control: Control<model.FormValues>;
  name: 'sellerId' | 'categoryId' | 'catalogItemId' | 'listingId';
  label: string;
  select: ScopeSelect;
}) => {
  const [options, known, search, fetching, searchChanged] = useUnit([
    select.$options,
    select.$known,
    select.$search,
    select.$fetching,
    select.searchChanged,
  ]);
  const value = useWatch({ control, name });
  // Выбранное — всегда с подписью, даже если текущий поиск его не вернул.
  const selected = value && known[value] && !options.some((o) => o.id === value) ? [known[value]] : [];

  return (
    <SelectField
      control={control}
      name={name}
      label={label}
      placeholder="Любой"
      allowClear
      options={[...selected, ...options].map((o) => ({ value: o.id, label: o.name }))}
      loading={fetching}
      notFoundContent={fetching ? 'Поиск…' : 'Ничего не нашли'}
      showSearch={{
        searchValue: search,
        onSearch: searchChanged,
        filterOption: false,
        autoClearSearchValue: true,
      }}
    />
  );
};

export const PriceRuleDrawer = () => {
  const [isOpen, mode, mutating, validated, closeRequested] = useUnit([
    model.disclosure.$isOpen,
    model.$mode,
    model.$mutating,
    model.validated,
    model.reset,
  ]);

  const formId = useId();

  const form = useForm<model.FormValues>({
    resolver: standardSchemaResolver(model.schema),
    defaultValues: model.DEFAULT_VALUES,
  });
  model.form.useBindFormWithModel({ form });

  const action = useWatch({ control: form.control, name: 'action' });

  return (
    <Drawer
      title={mode === 'edit' ? 'Редактировать правило цены' : 'Новое правило цены'}
      open={isOpen}
      onClose={() => closeRequested()}
      size={720}
      destroyOnHidden
      extra={
        <Flex gap="small">
          <Button onClick={() => closeRequested()}>Отмена</Button>
          <Button type="primary" htmlType="submit" form={formId} loading={mutating}>
            Сохранить
          </Button>
        </Flex>
      }
    >
      <form onSubmit={form.handleSubmit(() => validated())} id={formId}>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          Правило скрыто от покупателя — он видит только итоговую цену. Для видимой скидки с плашкой используйте
          «Акции». Из подходящих правил применяется одно — с наибольшим приоритетом; цена никогда не опускается ниже
          себестоимости.
        </Typography.Paragraph>

        <TextField control={form.control} name="name" label="Название (видно только в админке)" required />
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <SelectField control={form.control} name="action" label="Действие" options={ACTION_OPTIONS} required />
          </Col>
          <Col xs={24} md={12}>
            <NumberField
              control={form.control}
              name="value"
              label={VALUE_LABEL[action]}
              min={0}
              step={action === 'FIXED_PRICE' ? 1000 : 1}
              required
            />
          </Col>
          <Col xs={24} md={12}>
            <NumberField control={form.control} name="priority" label="Приоритет" step={1} required />
          </Col>
          <Col xs={24} md={12}>
            <Typography.Text style={{ display: 'block', marginBottom: 6 }}>Статус</Typography.Text>
            <SwitchField control={form.control} name="enabled" label="Включено" />
          </Col>
        </Row>

        <Typography.Title level={5}>Область</Typography.Title>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          Пустые поля — без ограничения, заполненные сужают область (все условия вместе).
        </Typography.Paragraph>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <ScopeField control={form.control} name="sellerId" label="Продавец" select={model.sellerSelect} />
          </Col>
          <Col xs={24} md={12}>
            <ScopeField control={form.control} name="categoryId" label="Категория" select={model.categorySelect} />
          </Col>
          <Col xs={24} md={12}>
            <ScopeField
              control={form.control}
              name="catalogItemId"
              label="Позиция каталога"
              select={model.catalogItemSelect}
            />
          </Col>
          <Col xs={24} md={12}>
            <ScopeField
              control={form.control}
              name="listingId"
              label="Продажная позиция"
              select={model.listingSelect}
            />
          </Col>
        </Row>

        <Typography.Title level={5}>Условия</Typography.Title>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <DateField control={form.control} name="startDate" label="Первый день" placeholder="Сразу" />
          </Col>
          <Col xs={24} md={12}>
            <DateField
              control={form.control}
              name="endDate"
              label="Последний день (включительно)"
              placeholder="Бессрочно"
            />
          </Col>
          <Col xs={24} md={12}>
            <NumberField control={form.control} name="minStock" label="Остаток от" min={0} step={1} />
          </Col>
          <Col xs={24} md={12}>
            <NumberField control={form.control} name="maxStock" label="Остаток до" min={0} step={1} />
          </Col>
        </Row>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: -8 }}>
          По датам цены меняются в 00:00 по Ташкенту, сохранение применяется сразу.
        </Typography.Paragraph>
      </form>
    </Drawer>
  );
};
