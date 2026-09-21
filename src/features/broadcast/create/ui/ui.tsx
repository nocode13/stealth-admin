import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Badge, Button, Col, Drawer, Flex, Modal, Radio, Row, Tabs, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useId, useState } from 'react';
import { Controller, useForm, useWatch, type FieldErrors } from 'react-hook-form';

import type { Customer, Locale } from '@/shared/api';
import { RichTextField, SelectField, SwitchField, TextField } from '@/shared/ui/form';

import * as model from '../model';
import { BroadcastPreview } from './preview';

const LOCALES: { key: Locale; suffix: 'Ru' | 'Uz' | 'En' }[] = [
  { key: 'RU', suffix: 'Ru' },
  { key: 'UZ', suffix: 'Uz' },
  { key: 'EN', suffix: 'En' },
];

const customerLabel = (c: Customer) =>
  [c.name, c.phone, c.email, c.telegramId ? `TG ${c.telegramId}` : null].filter(Boolean).join(' · ') || c.id;

const hasLocaleErrors = (errors: FieldErrors<model.FormValues>, suffix: string) =>
  Object.keys(errors).some((key) => key.endsWith(suffix));

export const BroadcastDrawer = () => {
  const [
    isOpen,
    pending,
    sending,
    audienceCount,
    customers,
    knownCustomers,
    customersSearch,
    customersFetching,
    validated,
    closeRequested,
    confirmed,
    confirmCancelled,
    customersSearchChanged,
  ] = useUnit([
    model.disclosure.$isOpen,
    model.$pending,
    model.$sending,
    model.$audienceCount,
    model.$customers,
    model.$knownCustomers,
    model.$customersSearch,
    model.$customersFetching,
    model.validated,
    model.reset,
    model.confirmed,
    model.confirmCancelled,
    model.customersSearchChanged,
  ]);

  const formId = useId();
  const [locale, setLocale] = useState<Locale>('RU');

  const form = useForm<model.FormValues>({
    resolver: standardSchemaResolver(model.schema),
    defaultValues: model.DEFAULT_VALUES,
  });
  model.form.useBindFormWithModel({ form });

  const [audience, recipientIds, sendPush, sendTelegram] = useWatch({
    control: form.control,
    name: ['audience', 'recipientIds', 'sendPush', 'sendTelegram'],
  });
  const errors = form.formState.errors;

  // Выбранные — первыми и всегда с подписью, даже если текущий поиск их не вернул.
  const selected = recipientIds.map((id) => knownCustomers[id]).filter(Boolean);
  const customerOptions = [...selected, ...customers.filter((c) => !recipientIds.includes(c.id))].map((c) => ({
    value: c.id,
    label: customerLabel(c),
  }));

  return (
    <Drawer
      title="Новая рассылка"
      open={isOpen}
      onClose={() => closeRequested()}
      size={1100}
      destroyOnHidden
      extra={
        <Flex gap="small">
          <Button onClick={() => closeRequested()}>Отмена</Button>
          <Button type="primary" htmlType="submit" form={formId} loading={pending || sending}>
            Отправить
          </Button>
        </Flex>
      }
    >
      <Row gutter={32}>
        <Col xs={24} lg={14}>
          <form onSubmit={form.handleSubmit(() => validated())} id={formId}>
            <Tabs
              activeKey={locale}
              onChange={(key) => setLocale(key as Locale)}
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
                      label="Заголовок"
                      placeholder="Скидка 20% на все букеты"
                      required={key === 'RU'}
                    />
                    <RichTextField
                      control={form.control}
                      name={`body${suffix}` as const}
                      label="Текст"
                      placeholder="В push уйдёт без форматирования, в Telegram — с ним"
                      required={key === 'RU'}
                      headings={false}
                      links
                    />
                    <TextField
                      control={form.control}
                      name={`buttonText${suffix}` as const}
                      label="Текст кнопки в Telegram"
                      placeholder="Открыть магазин"
                    />
                  </>
                ),
              }))}
            />

            <TextField
              control={form.control}
              name="buttonUrl"
              label="Ссылка кнопки в Telegram"
              placeholder="https://"
            />

            <Typography.Text style={{ display: 'block', marginBottom: 6 }}>
              Каналы<Typography.Text type="danger"> *</Typography.Text>
            </Typography.Text>
            <Flex gap="large">
              <SwitchField control={form.control} name="sendPush" label="Push-уведомление" />
              <SwitchField control={form.control} name="sendTelegram" label="Telegram-бот" />
            </Flex>
            {!!errors.sendTelegram && (
              <Typography.Text
                type="danger"
                style={{ display: 'block', marginTop: -12, marginBottom: 16, fontSize: 12 }}
              >
                {errors.sendTelegram.message}
              </Typography.Text>
            )}

            <Typography.Text style={{ display: 'block', marginBottom: 6 }}>Получатели</Typography.Text>
            <Controller
              control={form.control}
              name="audience"
              render={({ field }) => (
                <Radio.Group
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  style={{ marginBottom: 16 }}
                  options={[
                    { value: 'ALL', label: 'Всем клиентам' },
                    { value: 'SELECTED', label: 'Выбранным' },
                  ]}
                />
              )}
            />
            {audience === 'SELECTED' && (
              <SelectField
                control={form.control}
                name="recipientIds"
                mode="multiple"
                placeholder="Имя, телефон, email или Telegram ID"
                required
                options={customerOptions}
                loading={customersFetching}
                notFoundContent={customersFetching ? 'Поиск…' : 'Никого не нашли'}
                showSearch={{
                  searchValue: customersSearch,
                  onSearch: customersSearchChanged,
                  filterOption: false,
                  autoClearSearchValue: true,
                }}
              />
            )}
          </form>
        </Col>
        <Col xs={24} lg={10}>
          <BroadcastPreview control={form.control} locale={locale} />
        </Col>
      </Row>

      <Modal
        title="Отправить рассылку?"
        open={audienceCount !== null}
        onOk={() => confirmed()}
        onCancel={() => confirmCancelled()}
        okText="Отправить"
        cancelText="Отмена"
        confirmLoading={sending}
      >
        {audienceCount && (
          <Flex vertical gap={4}>
            <Typography.Text>
              Получателей: <b>{audienceCount.total}</b> — всем появится уведомление в приложении.
            </Typography.Text>
            {sendPush && (
              <Typography.Text>
                Push: <b>{audienceCount.withPush}</b> с установленным приложением
              </Typography.Text>
            )}
            {sendTelegram && (
              <Typography.Text>
                Telegram: <b>{audienceCount.withTelegram}</b> с привязанным ботом
              </Typography.Text>
            )}
            <Typography.Text type="secondary">Отменить отправку будет нельзя.</Typography.Text>
          </Flex>
        )}
      </Modal>
    </Drawer>
  );
};
