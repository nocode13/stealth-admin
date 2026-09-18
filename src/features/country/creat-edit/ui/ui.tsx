import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Modal } from 'antd';
import { useUnit } from 'effector-react';
import { useForm } from 'react-hook-form';
import { useId } from 'react';

import { TextField } from '@/shared/ui/form';

import * as model from '../model';

export const CountryModal = () => {
  const [isOpen, editingCountry, mutating, validated, closeRequested] = useUnit([
    model.disclosure.$isOpen,
    model.$editingCountry,
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
      title={editingCountry ? 'Редактировать страну' : 'Создать страну'}
      open={isOpen}
      onCancel={() => closeRequested()}
      okButtonProps={{ htmlType: 'submit', form: formId }}
      confirmLoading={mutating}
      destroyOnHidden
    >
      <form onSubmit={form.handleSubmit(() => validated())} id={formId}>
        <TextField
          control={form.control}
          name="code"
          label="Код страны (ISO, напр. NL)"
          required
          disabled={!!editingCountry}
        />
        <TextField control={form.control} name="nameRu" label="Название (RU)" required />
        <TextField control={form.control} name="nameUz" label="Название (UZ)" />
        <TextField control={form.control} name="nameEn" label="Название (EN)" />
      </form>
    </Modal>
  );
};
