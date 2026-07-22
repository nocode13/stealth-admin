import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Image, Modal, Typography, Upload } from 'antd';
import { message as antMessage } from 'antd';
import { useUnit } from 'effector-react';
import { useForm } from 'react-hook-form';
import { useId } from 'react';

import { sellerConfig } from '@/entities/seller';
import { userModel } from '@/entities/user';
import { SelectField, TextAreaField, TextField } from '@/shared/ui/form';

import * as model from '../model';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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
        <div style={{ marginTop: 16 }}>
          <Typography.Text style={{ display: 'block', marginBottom: 6 }}>Баннер</Typography.Text>
          {!!editingSeller.bannerUrl && <Image src={editingSeller.bannerUrl} alt={editingSeller.name} width={160} />}
          <div style={{ marginTop: 8 }}>
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={(file) => {
                if (!file.type.startsWith('image/')) {
                  void antMessage.error('Файл должен быть изображением');
                  return Upload.LIST_IGNORE;
                }
                if (file.size > MAX_IMAGE_SIZE) {
                  void antMessage.error('Максимальный размер файла — 5 МБ');
                  return Upload.LIST_IGNORE;
                }
                model.uploadBannerFx(file);
                return false;
              }}
            >
              <Typography.Link disabled={uploadingBanner}>
                {uploadingBanner ? 'Загрузка...' : 'Загрузить баннер'}
              </Typography.Link>
            </Upload>
          </div>
        </div>
      ) : (
        <Typography.Text type="secondary">Сохраните продавца, чтобы загрузить баннер.</Typography.Text>
      )}
    </Modal>
  );
};
