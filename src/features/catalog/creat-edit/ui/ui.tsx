import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Modal, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useForm } from 'react-hook-form';
import { useId } from 'react';

import { catalogConfig } from '@/entities/catalog';
import { userModel } from '@/entities/user';
import { PREVIEW_ASPECT } from '@/shared/config/marketplace-preview';
import { RichTextField, SelectField, SwitchField, TextField } from '@/shared/ui/form';
import { CatalogPreview } from '@/shared/ui/marketplace-preview';
import { MediaGallery } from '@/shared/ui/media-gallery';

import * as model from '../model';

export const CatalogItemModal = () => {
  const [
    isOpen,
    editingItem,
    mutating,
    categoryOptions,
    uploadingMedia,
    removingMediaId,
    reorderingMediaId,
    refreshing,
    refreshTriggered,
    validated,
    closeRequested,
    role,
    categoriesSearch,
    categoriesFetching,
    categoriesSearchChanged,
    countryOptions,
    countriesSearch,
    countriesFetching,
    countriesSearchChanged,
  ] = useUnit([
    model.disclosure.$isOpen,
    model.$editingItem,
    model.$mutating,
    model.$categories,
    model.addMediaFx.pending,
    model.removeMediaFx.pending,
    model.reorderMediaFx.pending,
    model.$refreshing,
    model.refreshTriggered,
    model.validated,
    model.reset,
    userModel.$role,
    model.$categoriesSearch,
    model.$categoriesFetching,
    model.categoriesSearchChanged,
    model.$countries,
    model.$countriesSearch,
    model.$countriesFetching,
    model.countriesSearchChanged,
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
        <TextField control={form.control} name="nameRu" label="Название (RU)" required />
        <TextField control={form.control} name="nameUz" label="Название (UZ)" />
        <TextField control={form.control} name="nameEn" label="Название (EN)" />
        <SelectField
          control={form.control}
          name="categoryId"
          label="Категория"
          allowClear
          options={categoryOptions.map((category) => ({ value: category.id, label: category.name }))}
          loading={categoriesFetching}
          showSearch={{
            searchValue: categoriesSearch,
            onSearch: categoriesSearchChanged,
            filterOption: false,
            autoClearSearchValue: true,
          }}
        />
        <SelectField
          control={form.control}
          name="countryId"
          label="Страна"
          allowClear
          options={countryOptions.map((country) => ({ value: country.id, label: country.name }))}
          loading={countriesFetching}
          showSearch={{
            searchValue: countriesSearch,
            onSearch: countriesSearchChanged,
            filterOption: false,
            autoClearSearchValue: true,
          }}
        />
        <TextField control={form.control} name="unitRu" label="Единица измерения (RU)" />
        <TextField control={form.control} name="unitUz" label="Единица измерения (UZ)" />
        <TextField control={form.control} name="unitEn" label="Единица измерения (EN)" />
        <RichTextField control={form.control} name="descriptionRu" label="Описание (RU)" />
        <RichTextField control={form.control} name="descriptionUz" label="Описание (UZ)" />
        <RichTextField control={form.control} name="descriptionEn" label="Описание (EN)" />
        {!!editingItem && role === 'SUPER_ADMIN' && (
          <>
            <SelectField
              control={form.control}
              name="status"
              label="Статус"
              options={statusOptions}
              disabled={editingItem.listingsCount > 0}
            />
            {editingItem.listingsCount > 0 && (
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: -10, marginBottom: 16 }}>
                Статус нельзя изменить: по позиции заведено продажных позиций — {editingItem.listingsCount}.
              </Typography.Text>
            )}
          </>
        )}
        {role === 'SUPER_ADMIN' && (
          <SwitchField control={form.control} name="freeDelivery" label="Бесплатная доставка" />
        )}
      </form>
      {editingItem ? (
        <>
          <Typography.Text style={{ display: 'block', marginTop: 16, marginBottom: 6 }}>Фото и видео</Typography.Text>
          <MediaGallery
            media={editingItem.media}
            alt={editingItem.name}
            uploading={uploadingMedia}
            removing={removingMediaId}
            reordering={reorderingMediaId}
            refreshing={refreshing}
            onUpload={(file) => model.addMediaFx(file)}
            onRemove={(mediaId) => model.removeMediaFx(mediaId)}
            onReorder={(mediaId, direction) => model.reorderMediaFx({ mediaId, direction })}
            onRefresh={() => refreshTriggered()}
            cropAspect={PREVIEW_ASPECT.catalog}
            renderCropPreview={({ src, natural, area }) => (
              <CatalogPreview
                src={src}
                natural={natural}
                area={area}
                name={form.watch('nameRu') || editingItem.name}
                category={categoryOptions.find((category) => category.id === form.watch('categoryId'))?.name}
              />
            )}
          />
        </>
      ) : (
        <Typography.Text type="secondary">Сохраните позицию, чтобы загрузить фото или видео.</Typography.Text>
      )}
    </Modal>
  );
};
