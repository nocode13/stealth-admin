import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Modal } from 'antd';
import { useUnit } from 'effector-react';
import { useForm } from 'react-hook-form';
import { useId } from 'react';

import { listingConfig } from '@/entities/listing';
import { NumberField, SelectField, TextField } from '@/shared/ui/form';

import * as model from '../model';

export const ListingModal = () => {
  const [isOpen, editingListing, mutating, catalogItemOptions, validated, closeRequested] = useUnit([
    model.disclosure.$isOpen,
    model.$editingListing,
    model.$mutating,
    model.$catalogItemOptions,
    model.validated,
    model.reset,
  ]);

  const formId = useId();

  const form = useForm<model.FormValues>({
    resolver: standardSchemaResolver(model.schema),
    defaultValues: model.DEFAULT_VALUES,
  });
  model.form.useBindFormWithModel({ form });
  const statusOptions = listingConfig.useStatusOptions();

  return (
    <Modal
      title={editingListing ? 'Редактировать позицию' : 'Создать позицию'}
      open={isOpen}
      onCancel={() => closeRequested()}
      okButtonProps={{ htmlType: 'submit', form: formId }}
      confirmLoading={mutating}
      destroyOnHidden
    >
      <form onSubmit={form.handleSubmit(() => validated())} id={formId}>
        <SelectField
          control={form.control}
          name="catalogItemId"
          label="Товар"
          required
          options={catalogItemOptions.map((item) => ({ value: item.id, label: item.name }))}
        />
        <NumberField control={form.control} name="price" label="Цена" min={0} step={0.01} required />
        <TextField control={form.control} name="currency" label="Валюта" />
        <NumberField control={form.control} name="stock" label="Остаток" min={0} step={1} required />
        <SelectField control={form.control} name="status" label="Статус" options={statusOptions} />
      </form>
    </Modal>
  );
};
