import { Button, Flex, Image, Space, Spin, Typography, Upload, message as antMessage } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlayCircleFilled } from '@ant-design/icons';
import { useState } from 'react';
import type { CSSProperties } from 'react';

import type { CatalogItemMedia } from '@/shared/api';
import { MAX_IMAGE_SIZE } from '@/shared/lib/crop-image';
import { ImageCropModal } from '@/shared/ui/image-crop-upload';
import type { ImageCropModalProps } from '@/shared/ui/image-crop-upload';

/** Лимит на видео из mediaUploadOptions бэкенда — отсекаем до отправки 50 МБ по сети. */
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

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

export type MediaGalleryProps = {
  media: CatalogItemMedia[];
  alt: string;
  uploading: boolean;
  removing: boolean;
  reordering: boolean;
  refreshing: boolean;
  onUpload: (file: File) => void;
  onRemove: (mediaId: string) => void;
  onReorder: (mediaId: string, direction: 'up' | 'down') => void;
  /** Ручное «Обновить», пока видео обрабатывается на бэкенде (поллинга нет намеренно). */
  onRefresh: () => void;
  cropAspect: number;
  renderCropPreview: ImageCropModalProps['renderPreview'];
};

/**
 * Галерея фото/видео — общая для позиции каталога и варианта (листинга): на бэкенде
 * это одна таблица и один пайплайн (`MediaGalleryService`). Владелец состояния и
 * эффектов — фича; компонент только рисует и зовёт колбэки.
 */
export const MediaGallery = ({
  media,
  alt,
  uploading,
  removing,
  reordering,
  refreshing,
  onUpload,
  onRemove,
  onReorder,
  onRefresh,
  cropAspect,
  renderCropPreview,
}: MediaGalleryProps) => {
  const [pickedImage, setPickedImage] = useState<File | null>(null);
  const hasProcessing = media.some((item) => item.status === 'PROCESSING');

  return (
    <>
      {media.length > 0 && (
        <Space wrap style={{ marginBottom: 8 }}>
          {media.map((item, index) => (
            <Flex key={item.id} vertical align="center" gap={4}>
              <MediaThumb media={item} alt={alt} />
              <Space size={4}>
                <Button
                  size="small"
                  icon={<ArrowUpOutlined />}
                  disabled={index === 0 || reordering}
                  loading={reordering}
                  onClick={() => onReorder(item.id, 'up')}
                />
                <Button
                  size="small"
                  icon={<ArrowDownOutlined />}
                  disabled={index === media.length - 1 || reordering}
                  loading={reordering}
                  onClick={() => onReorder(item.id, 'down')}
                />
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={removing}
                  loading={removing}
                  onClick={() => onRemove(item.id)}
                />
              </Space>
            </Flex>
          ))}
        </Space>
      )}
      {/* Одна кнопка на фото и видео — эндпоинт `POST …/:id/media` общий, тип
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
              if (picked.size > MAX_VIDEO_SIZE) {
                void antMessage.error('Видео больше 50 МБ');
              } else {
                onUpload(picked);
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
          <Button loading={uploading}>Добавить фото или видео</Button>
        </Upload>
      </div>

      <ImageCropModal
        file={pickedImage}
        aspect={cropAspect}
        uploading={uploading}
        onCancel={() => setPickedImage(null)}
        onConfirm={(file) => {
          onUpload(file);
          setPickedImage(null);
        }}
        renderPreview={renderCropPreview}
      />
      {hasProcessing && (
        <Flex align="center" gap={8} style={{ marginTop: 8 }}>
          <Typography.Text type="secondary">Видео обрабатывается на сервере.</Typography.Text>
          <Button size="small" loading={refreshing} onClick={() => onRefresh()}>
            Обновить
          </Button>
        </Flex>
      )}
    </>
  );
};
