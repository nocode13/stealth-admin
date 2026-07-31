import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Button, Flex, Image, Modal, Space, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined } from '@ant-design/icons';
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
    removingImageId,
    reorderingImageId,
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
    model.addImageFx.pending,
    model.removeImageFx.pending,
    model.reorderImageFx.pending,
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
        <>
          <Typography.Text style={{ display: 'block', marginTop: 16, marginBottom: 6 }}>Фото</Typography.Text>
          {editingItem.images.length > 0 && (
            <Space wrap style={{ marginBottom: 8 }}>
              {editingItem.images.map((image, index) => (
                <Flex key={image.id} vertical align="center" gap={4}>
                  <Image src={image.url} alt={editingItem.name} width={80} height={80} style={{ objectFit: 'cover' }} />
                  <Space size={4}>
                    <Button
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={index === 0 || reorderingImageId}
                      loading={reorderingImageId}
                      onClick={() => model.reorderImageFx({ imageId: image.id, direction: 'up' })}
                    />
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={index === editingItem.images.length - 1 || reorderingImageId}
                      loading={reorderingImageId}
                      onClick={() => model.reorderImageFx({ imageId: image.id, direction: 'down' })}
                    />
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={removingImageId}
                      loading={removingImageId}
                      onClick={() => model.removeImageFx(image.id)}
                    />
                  </Space>
                </Flex>
              ))}
            </Space>
          )}
          <ImageCropUpload
            aspect={PREVIEW_ASPECT.catalog}
            uploading={uploadingImage}
            triggerText="Добавить фото"
            onConfirm={(file) => model.addImageFx(file)}
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
        </>
      ) : (
        <Typography.Text type="secondary">Сохраните позицию, чтобы загрузить изображение.</Typography.Text>
      )}
    </Modal>
  );
};
