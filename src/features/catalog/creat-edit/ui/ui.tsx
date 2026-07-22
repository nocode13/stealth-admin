import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Image, Modal, Typography, Upload } from 'antd';
import { message as antMessage } from 'antd';
import { useUnit } from 'effector-react';
import { useForm } from 'react-hook-form';
import { useId } from 'react';

import { catalogConfig } from '@/entities/catalog';
import { userModel } from '@/entities/user';
import { SelectField, TextAreaField, TextField } from '@/shared/ui/form';

import * as model from '../model';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const CatalogItemModal = () => {
  const [
    isOpen,
    editingItem,
    mutating,
    categoryOptions,
    uploadingImage,
    validated,
    closeRequested,
    role,
    categoriesSearch,
    categoriesFetching,
    categoriesSearchChanged,
  ] = useUnit([
    model.disclosure.$isOpen,
    model.$editingItem,
    model.$mutating,
    model.$categories,
    model.uploadImageFx.pending,
    model.validated,
    model.reset,
    userModel.$role,
    model.$categoriesSearch,
    model.$categoriesFetching,
    model.categoriesSearchChanged,
  ]);

  const formId = useId();

  const form = useForm<model.FormValues>({
    resolver: standardSchemaResolver(model.schema),
    defaultValues: model.DEFAULT_VALUES,
  });
  model.form.useBindFormWithModel({ form });
  const statusOptions = catalogConfig.useStatusOptions();

  return (
    <Modal
      title={editingItem ? 'Редактировать позицию каталога' : 'Создать позицию каталога'}
      open={isOpen}
      onCancel={() => closeRequested()}
      okButtonProps={{ htmlType: 'submit', form: formId }}
      confirmLoading={mutating}
      destroyOnHidden
    >
      <form onSubmit={form.handleSubmit(() => validated())} id={formId}>
        <TextField control={form.control} name="name" label="Название" required />
        <TextField control={form.control} name="slug" label="Слаг" required />
        <SelectField
          control={form.control}
          name="categoryId"
          label="Категория"
          required
          options={categoryOptions.map((category) => ({ value: category.id, label: category.nameRu }))}
          loading={categoriesFetching}
          showSearch={{
            searchValue: categoriesSearch,
            onSearch: categoriesSearchChanged,
            filterOption: false,
            autoClearSearchValue: true,
          }}
        />
        <TextField control={form.control} name="unit" label="Единица измерения" />
        <TextAreaField control={form.control} name="description" label="Описание" />
        {!!editingItem && role === 'SUPER_ADMIN' && (
          <SelectField control={form.control} name="status" label="Статус" options={statusOptions} />
        )}
      </form>
      {editingItem ? (
        <div style={{ marginTop: 16 }}>
          <Typography.Text style={{ display: 'block', marginBottom: 6 }}>Изображение</Typography.Text>
          {!!editingItem.imageUrl && <Image src={editingItem.imageUrl} alt={editingItem.name} width={80} />}
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
                model.uploadImageFx(file);
                return false;
              }}
            >
              <Typography.Link disabled={uploadingImage}>
                {uploadingImage ? 'Загрузка...' : 'Загрузить изображение'}
              </Typography.Link>
            </Upload>
          </div>
        </div>
      ) : (
        <Typography.Text type="secondary">Сохраните позицию, чтобы загрузить изображение.</Typography.Text>
      )}
    </Modal>
  );
};
