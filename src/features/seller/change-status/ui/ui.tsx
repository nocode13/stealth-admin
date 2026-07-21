import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Modal } from 'antd';
import { useUnit } from 'effector-react';
import { useForm } from 'react-hook-form';
import { useId } from 'react';

import { SelectField } from '@/shared/ui/form';

import * as model from '../model';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'pending' },
  { value: 'ACTIVE', label: 'active' },
  { value: 'SUSPENDED', label: 'suspended' },
];

export const ChangeSellerStatusModal = () => {
  const [isOpen, seller, mutating, validated, closeRequested] = useUnit([
    model.disclosure.$isOpen,
    model.$seller,
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
      title={seller ? `Продавец ${seller.name}` : 'Смена статуса'}
      open={isOpen}
      onCancel={() => closeRequested()}
      okText="Сохранить"
      okButtonProps={{ htmlType: 'submit', form: formId }}
      confirmLoading={mutating}
      destroyOnHidden
    >
      <form onSubmit={form.handleSubmit(() => validated())} id={formId}>
        <SelectField control={form.control} name="status" label="Статус" options={STATUS_OPTIONS} />
      </form>
    </Modal>
  );
};
