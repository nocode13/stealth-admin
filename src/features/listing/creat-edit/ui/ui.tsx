import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Modal, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useForm, useWatch } from 'react-hook-form';
import { useId } from 'react';

import { formatVariant, listingConfig } from '@/entities/listing';
import { userModel } from '@/entities/user';
import { PREVIEW_ASPECT } from '@/shared/config/marketplace-preview';
import { formatAmount } from '@/shared/lib/currency/currency';
import { formatPrice } from '@/shared/lib/format';
import { NumberField, SelectField, SwitchField, TextField } from '@/shared/ui/form';
import { CatalogPreview } from '@/shared/ui/marketplace-preview';
import { MediaGallery } from '@/shared/ui/media-gallery';

import * as model from '../model';

export const ListingModal = () => {
  const [
    isOpen,
    editingListing,
    mutating,
    catalogItemOptions,
    catalogItemsSearch,
    catalogItemsFetching,
    catalogItemsSearchChanged,
    validated,
    closeRequested,
    role,
    sellers,
    sellersSearch,
    sellersFetching,
    sellersSearchChanged,
    uploadingMedia,
    removingMedia,
    reorderingMedia,
    refreshing,
    refreshTriggered,
  ] = useUnit([
    model.disclosure.$isOpen,
    model.$editingListing,
    model.$mutating,
    model.$catalogItemOptions,
    model.$catalogItemsSearch,
    model.$catalogItemsFetching,
    model.catalogItemsSearchChanged,
    model.validated,
    model.reset,
    userModel.$role,
    model.$sellers,
    model.$sellersSearch,
    model.$sellersFetching,
    model.sellersSearchChanged,
    model.addMediaFx.pending,
    model.removeMediaFx.pending,
    model.reorderMediaFx.pending,
    model.$refreshing,
    model.refreshTriggered,
  ]);

  const formId = useId();

  const form = useForm<model.FormValues>({
    resolver: standardSchemaResolver(model.schema),
    defaultValues: model.DEFAULT_VALUES,
  });
  model.form.useBindFormWithModel({ form });
  const statusOptions = listingConfig.useStatusOptions();
  const [costPrice, customMarkupPercent] = useWatch({
    control: form.control,
    name: ['costPrice', 'customMarkupPercent'],
  });
  // Прикидка для подсказки, без округления — точную розницу считает бэкенд после сохранения.
  const customEstimate =
    customMarkupPercent !== null && customMarkupPercent !== undefined && String(customMarkupPercent) !== ''
      ? formatAmount(Math.ceil(Number(costPrice) * 100 * (1 + Number(customMarkupPercent) / 100)))
      : null;

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
          loading={catalogItemsFetching}
          showSearch={{
            searchValue: catalogItemsSearch,
            onSearch: catalogItemsSearchChanged,
            filterOption: false,
            autoClearSearchValue: true,
          }}
        />
        {/* Продавца выбирает только SUPER_ADMIN и только при создании: у продавца он
            берётся из сессии, а сменить продавца у существующего листинга нельзя. */}
        {role === 'SUPER_ADMIN' && !editingListing && (
          <SelectField
            control={form.control}
            name="sellerId"
            label="Продавец"
            required
            options={sellers.map((seller) => ({ value: seller.id, label: seller.name }))}
            loading={sellersFetching}
            showSearch={{
              searchValue: sellersSearch,
              onSearch: sellersSearchChanged,
              filterOption: false,
              autoClearSearchValue: true,
            }}
          />
        )}
        {/* Код продавца — необязательный, для быстрого поиска в таблице. Уникален у
            продавца: дубль бэкенд отвергнет 409. */}
        <TextField control={form.control} name="sku" label="Код" placeholder="Необязательно, например R-60" />
        <NumberField
          control={form.control}
          name="costPrice"
          label="Себестоимость (выплата продавцу), сум"
          min={0}
          step={0.01}
          required
        />
        {/* Своя наценка — рычаг платформы: поле и значение видит только SUPER_ADMIN,
            продавцу бэкенд его не отдаёт и не принимает. */}
        {role === 'SUPER_ADMIN' && (
          <>
            <NumberField
              control={form.control}
              name="customMarkupPercent"
              label="Своя наценка, %"
              placeholder="Базовая ступенчатая"
              min={0}
              step={0.01}
            />
            <Typography.Paragraph type="secondary" style={{ marginTop: -12 }}>
              {customEstimate
                ? `Цена без акции ≈ ${customEstimate} сум (до округления). Сработает, если в «Приоритетах цены» стоит выше базовой наценки.`
                : 'Пусто — базовая ступенчатая наценка из настроек.'}
            </Typography.Paragraph>
          </>
        )}
        {/* Розница приходит только SUPER_ADMIN и считается бэкендом (наценка + акции) —
            формулу на клиенте не дублируем, показываем сохранённое значение. */}
        {role === 'SUPER_ADMIN' && editingListing?.price !== undefined && (
          <Typography.Paragraph type="secondary">
            Цена на витрине: {formatPrice(editingListing.price)} сум
            {editingListing.priceSource === 'LISTING_MARKUP' && ' · своя наценка'}
            {editingListing.priceSource === 'BASE_MARKUP' && ' · базовая наценка'}
            {editingListing.promotion &&
              !!editingListing.oldPrice &&
              ` · акция «${editingListing.promotion.title}», без неё ${formatPrice(editingListing.oldPrice)} сум`}
          </Typography.Paragraph>
        )}
        <NumberField control={form.control} name="stock" label="Остаток" min={0} step={1} required />
        <SelectField control={form.control} name="status" label="Статус" options={statusOptions} />

        {/* Вариант: у одной позиции каталога у продавца может быть несколько листингов
            (росток, горшок 3 л, 60 см…). Набор атрибутов уникален — дубль бэкенд отвергнет 409. */}
        <Typography.Text strong style={{ display: 'block', marginTop: 8, marginBottom: 8 }}>
          Вариант
        </Typography.Text>
        <SwitchField control={form.control} name="seedling" label="Росток" />
        <NumberField
          control={form.control}
          name="potVolumeLiters"
          label="Объём горшка, л"
          placeholder="Не указан"
          min={0}
          step={0.1}
        />
        <NumberField
          control={form.control}
          name="stemCount"
          label="Количество стеблей"
          placeholder="Не указано"
          min={1}
          step={1}
        />
        <NumberField
          control={form.control}
          name="heightCm"
          label="Высота, см"
          placeholder="Не указана"
          min={1}
          step={1}
        />
      </form>

      <Typography.Text style={{ display: 'block', marginTop: 16, marginBottom: 6 }}>
        Фото и видео варианта
      </Typography.Text>
      {editingListing ? (
        <>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
            Нет своих фото — на витрине показываются фото позиции каталога. Свои фото заменяют их целиком.
          </Typography.Paragraph>
          <MediaGallery
            media={editingListing.ownMedia}
            alt={editingListing.catalogItem.name}
            uploading={uploadingMedia}
            removing={removingMedia}
            reordering={reorderingMedia}
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
                name={[editingListing.catalogItem.name, formatVariant(editingListing)].filter(Boolean).join(' · ')}
                category={editingListing.catalogItem.subcategory?.name ?? editingListing.catalogItem.category.name}
              />
            )}
          />
        </>
      ) : (
        <Typography.Text type="secondary">Сохраните позицию, чтобы загрузить свои фото или видео.</Typography.Text>
      )}
    </Modal>
  );
};
