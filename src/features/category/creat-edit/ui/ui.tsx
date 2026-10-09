import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Modal, Typography } from 'antd';
import { useUnit } from 'effector-react';
import { useForm, useWatch } from 'react-hook-form';
import { useId } from 'react';

import { categoryConfig } from '@/entities/category';
import { userModel } from '@/entities/user';
import { PREVIEW_ASPECT } from '@/shared/config/marketplace-preview';
import { NumberField, SelectField, TextField } from '@/shared/ui/form';
import { ImageCropUpload } from '@/shared/ui/image-crop-upload';
import { CategoryIconPreview } from '@/shared/ui/marketplace-preview';

import * as model from '../model';
import { CategoryItems } from './items';

const TITLES = {
  create: { root: 'Создать категорию товаров', sub: 'Создать подкатегорию' },
  edit: { root: 'Редактировать категорию товаров', sub: 'Редактировать подкатегорию' },
} as const;

export const CategoryModal = () => {
  const [isOpen, editingCategory, mode, mutating, uploadingIcon, validated, closeRequested, role] = useUnit([
    model.disclosure.$isOpen,
    model.$editingCategory,
    model.$mode,
    model.$mutating,
    model.uploadIconFx.pending,
    model.validated,
    model.reset,
    userModel.$role,
  ]);
  const [rootOptions, rootsPending] = useUnit([model.$rootOptions, model.$rootsPending]);

  const formId = useId();

  const form = useForm<model.FormValues>({
    resolver: standardSchemaResolver(model.schema),
    defaultValues: model.DEFAULT_VALUES,
  });
  model.form.useBindFormWithModel({ form });
  const statusOptions = categoryConfig.useStatusOptions();
  const [level, nameRu] = useWatch({ control: form.control, name: ['level', 'nameRu'] });

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isRoot = level === 'root';
  // Сменить статус нельзя, пока к категории что-то привязано (бэкенд отдаст 409).
  const statusLocked = !!editingCategory && (editingCategory.itemsCount > 0 || editingCategory.childrenCount > 0);

  return (
    <Modal
      title={TITLES[mode][level]}
      open={isOpen}
      onCancel={() => closeRequested()}
      okButtonProps={{ htmlType: 'submit', form: formId }}
      confirmLoading={mutating}
      width={720}
      destroyOnHidden
    >
      <form onSubmit={form.handleSubmit(() => validated())} id={formId}>
        {!isRoot && (
          // Родителя выбирают только при создании: перенос подкатегории рассинхронизировал бы
          // позиции каталога (у них пара categoryId/subcategoryId).
          <SelectField
            control={form.control}
            name="parentId"
            label="Категория товаров"
            options={rootOptions}
            loading={rootsPending}
            disabled={mode === 'edit'}
            showSearch={{ optionFilterProp: 'label' }}
            required
          />
        )}
        <TextField control={form.control} name="nameRu" label="Название (RU)" required />
        <TextField control={form.control} name="nameUz" label="Название (UZ)" />
        <TextField control={form.control} name="nameEn" label="Название (EN)" />
        {isRoot && isSuperAdmin && (
          <>
            <TextField
              control={form.control}
              name="code"
              label="Код (для мобилки, например houseplants)"
              placeholder="houseplants"
              required
            />
            <Typography.Text type="secondary" style={{ display: 'block', marginTop: -10, marginBottom: 16 }}>
              По коду мобилка отличает категорию (например, набор фильтров). Менять код у живой категории — только
              вместе с релизом мобилки.
            </Typography.Text>
            <NumberField control={form.control} name="position" label="Порядок на главной" min={0} max={10000} />
          </>
        )}
        {!!editingCategory && isSuperAdmin && (
          <>
            <SelectField
              control={form.control}
              name="status"
              label="Статус"
              options={statusOptions}
              disabled={statusLocked}
            />
            {statusLocked && (
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: -10, marginBottom: 16 }}>
                Статус нельзя изменить: привязано позиций каталога — {editingCategory.itemsCount}, подкатегорий —{' '}
                {editingCategory.childrenCount}.
              </Typography.Text>
            )}
          </>
        )}
      </form>
      {isRoot &&
        isSuperAdmin &&
        (editingCategory ? (
          <ImageCropUpload
            aspect={PREVIEW_ASPECT.categoryIcon}
            currentUrl={editingCategory.iconUrl}
            uploading={uploadingIcon}
            triggerText={editingCategory.iconUrl ? 'Заменить иконку' : 'Загрузить иконку'}
            onConfirm={(file) => model.uploadIconFx(file)}
            renderPreview={({ src, natural, area }) => (
              <CategoryIconPreview src={src} natural={natural} area={area} name={nameRu || editingCategory.name} />
            )}
          />
        ) : (
          <Typography.Text type="secondary">Сохраните категорию, чтобы загрузить иконку.</Typography.Text>
        ))}
      {!!editingCategory && <CategoryItems />}
    </Modal>
  );
};
