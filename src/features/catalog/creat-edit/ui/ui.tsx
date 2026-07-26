import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Modal, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useForm } from 'react-hook-form';
import { useId } from 'react';

import { catalogConfig } from '@/entities/catalog';
import { userModel } from '@/entities/user';
import { PREVIEW_ASPECT } from '@/shared/config/marketplace-preview';
import { SelectField, TextAreaField, TextField } from '@/shared/ui/form';
import { ImageCropUpload } from '@/shared/ui/image-crop-upload';
import { CatalogPreview } from '@/shared/ui/marketplace-preview';

import * as model from '../model';

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
          allowClear
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
        <ImageCropUpload
          aspect={PREVIEW_ASPECT.catalog}
          currentUrl={editingItem.imageUrl}
          uploading={uploadingImage}
          label="Изображение"
          triggerText="Загрузить изображение"
          onConfirm={(file) => model.uploadImageFx(file)}
          renderPreview={({ src, natural, area }) => (
            <CatalogPreview
              src={src}
              natural={natural}
              area={area}
              name={form.watch('name') || editingItem.name}
              category={categoryOptions.find((category) => category.id === form.watch('categoryId'))?.nameRu}
            />
          )}
        />
      ) : (
        <Typography.Text type="secondary">Сохраните позицию, чтобы загрузить изображение.</Typography.Text>
      )}
    </Modal>
  );
};
