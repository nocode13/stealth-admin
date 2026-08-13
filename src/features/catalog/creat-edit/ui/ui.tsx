import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Button, Flex, Image, Modal, Space, Spin, Typography, Upload, message as antMessage } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlayCircleFilled } from '@ant-design/icons';
import { useUnit } from 'effector-react';
import { useForm } from 'react-hook-form';
import { useId, useState } from 'react';
import type { CSSProperties } from 'react';

import { catalogConfig } from '@/entities/catalog';
import { userModel } from '@/entities/user';
import type { CatalogItemMedia } from '@/shared/api';
import { PREVIEW_ASPECT } from '@/shared/config/marketplace-preview';
import { MAX_IMAGE_SIZE } from '@/shared/lib/crop-image';
import { SelectField, TextAreaField, TextField } from '@/shared/ui/form';
import { ImageCropModal } from '@/shared/ui/image-crop-upload';
import { CatalogPreview } from '@/shared/ui/marketplace-preview';

import * as model from '../model';

const THUMB_SIZE = 80;

const thumbBoxStyle: CSSProperties = {
  width: THUMB_SIZE,
  height: THUMB_SIZE,
  background: 'rgba(0, 0, 0, 0.04)',
  borderRadius: 6,
  textAlign: 'center',
  padding: 4,
};

/**
 * Плитка галереи. Фото и видео лежат в одном списке, поэтому вид выбирается по
 * `type`/`status`: у готового видео показываем его обложку с бейджем play (клик
 * открывает mp4 в новой вкладке), у необработанного — спиннер.
 */
const MediaThumb = ({ media, alt }: { media: CatalogItemMedia; alt: string }) => {
  if (media.type === 'IMAGE') {
    return <Image src={media.url} alt={alt} width={THUMB_SIZE} height={THUMB_SIZE} style={{ objectFit: 'cover' }} />;
  }

  if (media.status === 'PROCESSING') {
    return (
      <Flex vertical align="center" justify="center" gap={4} style={thumbBoxStyle}>
        <Spin size="small" />
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          обработка
        </Typography.Text>
      </Flex>
    );
  }

  if (media.status === 'FAILED') {
    return (
      <Flex align="center" justify="center" style={thumbBoxStyle}>
        <Typography.Text type="danger" style={{ fontSize: 11 }}>
          не обработалось
        </Typography.Text>
      </Flex>
    );
  }

  return (
    <a href={media.url} target="_blank" rel="noreferrer" style={{ position: 'relative', display: 'block' }}>
      <img
        src={media.posterUrl ?? undefined}
        alt={alt}
        width={THUMB_SIZE}
        height={THUMB_SIZE}
        style={{ objectFit: 'cover', borderRadius: 6, display: 'block' }}
      />
      <PlayCircleFilled
        style={{
          position: 'absolute',
          inset: 0,
          margin: 'auto',
          fontSize: 24,
          color: '#fff',
          height: 24,
          textShadow: '0 0 6px rgba(0, 0, 0, 0.6)',
        }}
      />
    </a>
  );
};

export const CatalogItemModal = () => {
  const [
    isOpen,
    editingItem,
    mutating,
    categoryOptions,
    uploadingMedia,
    removingMediaId,
    reorderingMediaId,
    hasProcessingMedia,
    refreshing,
    refreshTriggered,
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
    model.addMediaFx.pending,
    model.removeMediaFx.pending,
    model.reorderMediaFx.pending,
    model.$hasProcessingMedia,
    model.$refreshing,
    model.refreshTriggered,
    model.validated,
    model.reset,
    userModel.$role,
    model.$categoriesSearch,
    model.$categoriesFetching,
    model.categoriesSearchChanged,
  ]);

  const formId = useId();
  const [pickedImage, setPickedImage] = useState<File | null>(null);

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
          <Typography.Text style={{ display: 'block', marginTop: 16, marginBottom: 6 }}>Фото и видео</Typography.Text>
          {editingItem.media.length > 0 && (
            <Space wrap style={{ marginBottom: 8 }}>
              {editingItem.media.map((media, index) => (
                <Flex key={media.id} vertical align="center" gap={4}>
                  <MediaThumb media={media} alt={editingItem.name} />
                  <Space size={4}>
                    <Button
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={index === 0 || reorderingMediaId}
                      loading={reorderingMediaId}
                      onClick={() => model.reorderMediaFx({ mediaId: media.id, direction: 'up' })}
                    />
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={index === editingItem.media.length - 1 || reorderingMediaId}
                      loading={reorderingMediaId}
                      onClick={() => model.reorderMediaFx({ mediaId: media.id, direction: 'down' })}
                    />
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={removingMediaId}
                      loading={removingMediaId}
                      onClick={() => model.removeMediaFx(media.id)}
                    />
                  </Space>
                </Flex>
              ))}
            </Space>
          )}
          {/* Одна кнопка на фото и видео — эндпоинт `POST /catalog/:id/media` общий, тип
              бэкенд определяет по содержимому. Разница только в клиентском шаге: фото
              прогоняем через кадрирование с превью маркетплейса, видео грузим как есть —
              обложку бэкенд вырезает из кадра сам. */}
          <div style={{ marginTop: 8 }}>
            <Upload
              accept="image/*,video/*"
              showUploadList={false}
              beforeUpload={(file) => {
                const picked = file as unknown as File;
                if (picked.type.startsWith('video/')) {
                  if (picked.size > model.MAX_VIDEO_SIZE) {
                    void antMessage.error('Видео больше 50 МБ');
                  } else {
                    model.addMediaFx(picked);
                  }
                } else if (picked.type.startsWith('image/')) {
                  if (picked.size > MAX_IMAGE_SIZE) {
                    void antMessage.error('Максимальный размер фото — 5 МБ');
                  } else {
                    setPickedImage(picked);
                  }
                } else {
                  void antMessage.error('Нужен файл изображения или видео');
                }
                return Upload.LIST_IGNORE;
              }}
            >
              <Button loading={uploadingMedia}>Добавить фото или видео</Button>
            </Upload>
          </div>

          <ImageCropModal
            file={pickedImage}
            aspect={PREVIEW_ASPECT.catalog}
            uploading={uploadingMedia}
            onCancel={() => setPickedImage(null)}
            onConfirm={(file) => {
              model.addMediaFx(file);
              setPickedImage(null);
            }}
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
          {hasProcessingMedia && (
            <Flex align="center" gap={8} style={{ marginTop: 8 }}>
              <Typography.Text type="secondary">Видео обрабатывается на сервере.</Typography.Text>
              <Button size="small" loading={refreshing} onClick={() => refreshTriggered()}>
                Обновить
              </Button>
            </Flex>
          )}
        </>
      ) : (
        <Typography.Text type="secondary">Сохраните позицию, чтобы загрузить фото или видео.</Typography.Text>
      )}
    </Modal>
  );
};
