import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Modal, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useId } from 'react';
import { useForm } from 'react-hook-form';

import { ORDER_ACTION_LABELS, ORDER_GROUP_STATUS_LABELS } from '@/entities/order';
import { SelectField, TextField } from '@/shared/ui/form';

import * as model from '../model';

export const ChangeGroupStatusModal = () => {
  const [isOpen, group, options, mutating, validated, closeRequested] = useUnit([
    model.disclosure.$isOpen,
    model.$group,
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
      title={group ? `Группа №${group.groupNumber} — статус всех заказов` : 'Смена статуса группы'}
      open={isOpen}
      onCancel={() => closeRequested()}
      okText="Сохранить"
      okButtonProps={{ htmlType: 'submit', form: formId, disabled: options.length === 0 }}
      confirmLoading={mutating}
      destroyOnHidden
    >
      {!!group && (
        <Typography.Paragraph type="secondary">
          Текущий статус группы: {ORDER_GROUP_STATUS_LABELS[group.status]}. Новый статус применится ко всем заказам
          группы, которые ещё не завершены.
        </Typography.Paragraph>
      )}
      {options.length === 0 ? (
        <Typography.Text type="secondary">
          Нет общего доступного статуса для всех заказов группы — меняйте статус заказов по отдельности.
        </Typography.Text>
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
