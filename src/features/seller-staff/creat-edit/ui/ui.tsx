import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Modal, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useForm } from 'react-hook-form';
import { useId } from 'react';

import { TextField } from '@/shared/ui/form';

import * as model from '../model';

export const SellerStaffModal = () => {
  const [isOpen, editingStaff, mutating] = useUnit([model.disclosure.$isOpen, model.$editingStaff, model.$mutating]);

  const formId = useId();

  const form = useForm<model.FormValues>({
    resolver: standardSchemaResolver(model.schema),
    defaultValues: model.DEFAULT_VALUES,
  });
  model.form.useBindFormWithModel({ form });

  return (
    <Modal
      title={editingStaff ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
      open={isOpen}
      onCancel={() => model.reset()}
      okButtonProps={{ htmlType: 'submit', form: formId }}
      confirmLoading={mutating}
      destroyOnHidden
    >
      <form onSubmit={form.handleSubmit(() => model.validated())} id={formId}>
        <TextField control={form.control} name="name" label="Имя" />
        <TextField control={form.control} name="phone" label="Телефон" />
        <TextField control={form.control} name="email" label="Email" />
        <TextField
          control={form.control}
          name="password"
          label={editingStaff ? 'Новый пароль' : 'Пароль'}
          type="password"
          autoComplete="new-password"
        />
      </form>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {editingStaff
          ? 'Пустой пароль оставит текущий без изменений.'
          : 'Пароль нужен только для входа в админку — заказы в боте работают и без него. Telegram привязывается отдельно, кнопкой «Пригласить».'}
      </Typography.Text>
    </Modal>
  );
};
