import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Modal, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useForm, useWatch } from 'react-hook-form';
import { useEffect, useId, useRef } from 'react';

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
    categoriesFetching,
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
    model.$categoriesFetching,
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
  const [subcategories, subcategoriesSearch, subcategoriesFetching, subcategoriesSearchChanged] = useUnit([
    model.$subcategories,
    model.$subcategoriesSearch,
    model.$subcategoriesFetching,
    model.subcategoriesSearchChanged,
  ]);
  const [categoryId, subcategoryId] = useWatch({ control: form.control, name: ['categoryId', 'subcategoryId'] });

  // Подкатегория принадлежит категории: сменили категорию — снимаем подкатегорию. Переход
  // из пустого значения (открытие на редактирование, первый выбор) значение не трогает.
  const prevCategoryId = useRef(categoryId);
  useEffect(() => {
    if (prevCategoryId.current && prevCategoryId.current !== categoryId) {
      form.setValue('subcategoryId', '');
    }
    prevCategoryId.current = categoryId;
  }, [categoryId, form]);

  // Текущая подкатегория позиции может не попасть в первую сотню вариантов — держим её в списке.
  const subcategoryOptions = subcategories.map((category) => ({ value: category.id, label: category.name }));
  if (
    editingItem?.subcategory &&
    editingItem.subcategoryId === subcategoryId &&
    !subcategoryOptions.some((option) => option.value === editingItem.subcategoryId)
  ) {
    subcategoryOptions.unshift({ value: editingItem.subcategory.id, label: editingItem.subcategory.name });
  }

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
          label="Категория товаров"
          options={categoryOptions.map((category) => ({ value: category.id, label: category.name }))}
          loading={categoriesFetching}
          showSearch={{ optionFilterProp: 'label' }}
          required
        />
        <SelectField
          control={form.control}
          name="subcategoryId"
          label="Подкатегория"
          allowClear
          disabled={!categoryId}
          placeholder={categoryId ? undefined : 'Сначала выберите категорию'}
          options={subcategoryOptions}
          loading={subcategoriesFetching}
          showSearch={{
            searchValue: subcategoriesSearch,
            onSearch: subcategoriesSearchChanged,
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
                category={
                  subcategoryOptions.find((option) => option.value === subcategoryId)?.label ??
                  categoryOptions.find((category) => category.id === categoryId)?.name
                }
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
