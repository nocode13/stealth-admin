import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Modal, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useForm } from 'react-hook-form';
import { useId } from 'react';

import { listingConfig } from '@/entities/listing';
import { userModel } from '@/entities/user';
import { formatPrice } from '@/shared/lib/format';
import { NumberField, SelectField } from '@/shared/ui/form';

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
        <NumberField
          control={form.control}
          name="costPrice"
          label="Себестоимость (выплата продавцу), сум"
          min={0}
          step={0.01}
          required
        />
        {/* Розница приходит только SUPER_ADMIN и считается бэкендом (наценка + правила) —
            формулу на клиенте не дублируем, показываем сохранённое значение. */}
        {role === 'SUPER_ADMIN' && editingListing?.price !== undefined && (
          <Typography.Paragraph type="secondary">
            Цена на витрине: {formatPrice(editingListing.price)} сум
            {editingListing.appliedRule ? ` · правило «${editingListing.appliedRule.name}»` : ' · базовая наценка'}
            {editingListing.promotion &&
              !!editingListing.oldPrice &&
              ` · акция «${editingListing.promotion.title}», без неё ${formatPrice(editingListing.oldPrice)} сум`}
          </Typography.Paragraph>
        )}
        <NumberField control={form.control} name="stock" label="Остаток" min={0} step={1} required />
        <SelectField control={form.control} name="status" label="Статус" options={statusOptions} />
      </form>
    </Modal>
  );
};
