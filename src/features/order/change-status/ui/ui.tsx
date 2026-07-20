import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Modal, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useId } from 'react';
import { useForm } from 'react-hook-form';

import { ORDER_ACTION_LABELS, ORDER_STATUS_LABELS } from '@/entities/order';
import { SelectField, TextField } from '@/shared/ui/form';

import * as model from '../model';

export const ChangeOrderStatusModal = () => {
  const [isOpen, order, options, mutating, validated, closeRequested] = useUnit([
    model.disclosure.$isOpen,
    model.$order,
    model.$options,
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

  return (
    <Modal
      title={order ? `Заказ №${order.orderNumber}` : 'Смена статуса'}
      open={isOpen}
      onCancel={() => closeRequested()}
      okText="Сохранить"
      okButtonProps={{ htmlType: 'submit', form: formId, disabled: options.length === 0 }}
      confirmLoading={mutating}
      destroyOnHidden
    >
      {!!order && (
        <Typography.Paragraph type="secondary">
          Текущий статус: {ORDER_STATUS_LABELS[order.status]}
        </Typography.Paragraph>
      )}
      {options.length === 0 ? (
        <Typography.Text type="secondary">Заказ завершён — статус больше не меняется.</Typography.Text>
      ) : (
        <form onSubmit={form.handleSubmit(() => validated())} id={formId}>
          <SelectField
            control={form.control}
            name="status"
            label="Новый статус"
            options={options.map((status) => ({ value: status, label: ORDER_ACTION_LABELS[status] }))}
          />
          <TextField control={form.control} name="comment" label="Комментарий (попадёт в историю)" />
        </form>
      )}
    </Modal>
  );
};
