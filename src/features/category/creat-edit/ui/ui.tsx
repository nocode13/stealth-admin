import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Modal } from 'antd';
import { useUnit } from 'effector-react';
import { useForm } from 'react-hook-form';
import { useId } from 'react';

import { userModel } from '@/entities/user';
import { SelectField, TextField } from '@/shared/ui/form';

import * as model from '../model';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'pending' },
  { value: 'APPROVED', label: 'approved' },
  { value: 'REJECTED', label: 'rejected' },
];

export const CategoryModal = () => {
  const [isOpen, editingCategory, mutating, validated, closeRequested, role] = useUnit([
    model.disclosure.$isOpen,
    model.$editingCategory,
    model.$mutating,
    model.validated,
    model.reset,
    userModel.$role,
  ]);

  const formId = useId();

  const form = useForm<model.FormValues>({
    resolver: standardSchemaResolver(model.schema),
    defaultValues: model.DEFAULT_VALUES,
  });
  model.form.useBindFormWithModel({ form });

  return (
    <Modal
      title={editingCategory ? 'Редактировать категорию' : 'Создать категорию'}
      open={isOpen}
      onCancel={() => closeRequested()}
      okButtonProps={{ htmlType: 'submit', form: formId }}
      confirmLoading={mutating}
      destroyOnHidden
    >
      <form onSubmit={form.handleSubmit(() => validated())} id={formId}>
        <TextField control={form.control} name="nameRu" label="Название (RU)" />
        <TextField control={form.control} name="nameUz" label="Название (UZ)" />
        <TextField control={form.control} name="nameEn" label="Название (EN)" />
        <TextField control={form.control} name="nameKaa" label="Название (KAA)" />
        {!!editingCategory && role === 'SUPER_ADMIN' && (
          <SelectField control={form.control} name="status" label="Статус" options={STATUS_OPTIONS} />
        )}
      </form>
    </Modal>
  );
};
