import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Modal, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useForm } from 'react-hook-form';
import { useId } from 'react';

import { sellerConfig } from '@/entities/seller';
import { userModel } from '@/entities/user';
import { PREVIEW_ASPECT } from '@/shared/config/marketplace-preview';
import { SelectField, TextAreaField, TextField } from '@/shared/ui/form';
import { ImageCropUpload } from '@/shared/ui/image-crop-upload';
import { SellerBannerPreview } from '@/shared/ui/marketplace-preview';

import * as model from '../model';

export const SellerModal = () => {
  const [isOpen, editingSeller, mutating, uploadingBanner, role] = useUnit([
    model.disclosure.$isOpen,
    model.$editingSeller,
    model.$mutating,
    model.uploadBannerFx.pending,
    userModel.$role,
  ]);

  const formId = useId();

  const form = useForm<model.FormValues>({
    resolver: standardSchemaResolver(model.schema),
    defaultValues: model.DEFAULT_VALUES,
  });
  model.form.useBindFormWithModel({ form });
  const statusOptions = sellerConfig.useStatusOptions();

  return (
    <Modal
      title={editingSeller ? 'Редактировать продавца' : 'Создать продавца'}
      open={isOpen}
      onCancel={() => model.reset()}
      okButtonProps={{ htmlType: 'submit', form: formId }}
      confirmLoading={mutating}
      destroyOnHidden
    >
      <form onSubmit={form.handleSubmit(() => model.validated())} id={formId}>
        <TextField control={form.control} name="name" label="Название" required />
        <TextAreaField control={form.control} name="description" label="Описание" />
        {!editingSeller && (
          <>
            <TextField control={form.control} name="ownerEmail" label="Email владельца" required />
            <TextField control={form.control} name="ownerPassword" label="Пароль владельца" type="password" required />
            <TextField control={form.control} name="ownerPhone" label="Телефон владельца" />
          </>
        )}
        {!!editingSeller && role === 'SUPER_ADMIN' && (
          <SelectField control={form.control} name="status" label="Статус" options={statusOptions} />
        )}
      </form>
      {editingSeller ? (
        <ImageCropUpload
          aspect={PREVIEW_ASPECT.sellerBanner}
          currentUrl={editingSeller.bannerUrl}
          uploading={uploadingBanner}
          triggerText="Загрузить баннер"
          onConfirm={(file) => model.uploadBannerFx(file)}
          renderPreview={({ src, natural, area }) => (
            <SellerBannerPreview
              src={src}
              natural={natural}
              area={area}
              name={form.watch('name') || editingSeller.name}
              description={form.watch('description') || editingSeller.description || undefined}
            />
          )}
        />
      ) : (
        <Typography.Text type="secondary">Сохраните продавца, чтобы загрузить баннер.</Typography.Text>
      )}
    </Modal>
  );
};
