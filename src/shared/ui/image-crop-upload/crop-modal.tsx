import { Modal, Slider, Typography, message as antMessage } from 'antd';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

import type { CropArea, Size } from '@/shared/lib/crop-preview';
import { cropImageToFile } from '@/shared/lib/crop-image';

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

export type ImageCropModalProps = {
  /** Выбранный пользователем файл; `null` — модалка закрыта. Владелец состояния — вызывающий. */
  file: File | null;
  aspect: number;
  /** Внешняя загрузка (эффект) — держит модалку в confirmLoading. */
  uploading: boolean;
  onConfirm: (file: File) => void;
  onCancel: () => void;
  renderPreview: (params: { src: string; natural: Size; area: CropArea }) => ReactNode;
};

/**
 * Контролируемая модалка кадрирования с превью маркетплейса. Не выбирает файл сама —
 * файл приходит пропом от вызывающего компонента (см. `ImageCropUpload` — триггер-обёртка
 * над этой же модалкой, и кнопка «Добавить фото или видео» в каталоге).
 */
export const ImageCropModal = ({
  file,
  aspect,
  uploading,
  onConfirm,
  onCancel,
  renderPreview,
}: ImageCropModalProps) => {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<Size | null>(null);
  const [area, setArea] = useState<CropArea | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [cropping, setCropping] = useState(false);

  // objectURL живёт до закрытия модалки (смены/сброса file) — иначе утечка на каждый выбранный файл.
  useEffect(() => {
    if (!file) {
      setSrc(null);
      setNatural(null);
      setArea(null);
      setCrop({ x: 0, y: 0 });
      setZoom(ZOOM_MIN);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const confirm = async () => {
    if (!file || !src || !area) return;

    setCropping(true);
    try {
      const { file: cropped, recompressed } = await cropImageToFile(src, area, file.name);
      if (recompressed) {
        void antMessage.warning('Изображение пересжато, чтобы уложиться в 5 МБ');
      }
      onConfirm(cropped);
    } catch (error) {
      void antMessage.error(error instanceof Error ? error.message : 'Не удалось обработать изображение');
    } finally {
      setCropping(false);
    }
  };

  return (
    <Modal
      title="Кадрирование"
      open={!!file}
      onCancel={onCancel}
      onOk={() => void confirm()}
      okText="Загрузить"
      okButtonProps={{ disabled: !area }}
      confirmLoading={cropping || uploading}
      width={980}
      destroyOnHidden
    >
      {!!file && !!src && (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 380px', minWidth: 320 }}>
            <div style={{ position: 'relative', height: 380, background: '#000', borderRadius: 8 }}>
              <Cropper
                image={src}
                aspect={aspect}
                crop={crop}
                zoom={zoom}
                minZoom={ZOOM_MIN}
                maxZoom={ZOOM_MAX}
                objectFit="contain"
                showGrid
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onMediaLoaded={(media) => setNatural({ width: media.naturalWidth, height: media.naturalHeight })}
                onCropComplete={(_croppedArea: Area, croppedAreaPixels: Area) => setArea(croppedAreaPixels)}
              />
            </div>
            <Typography.Text type="secondary" style={{ display: 'block', margin: '12px 0 4px' }}>
              Масштаб
            </Typography.Text>
            <Slider
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={0.01}
              value={zoom}
              onChange={setZoom}
              tooltip={{ open: false }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Качество не меняется — обрезка идёт в исходном разрешении.
            </Typography.Text>
          </div>
          <div style={{ flex: '0 0 auto', maxHeight: 520, overflowY: 'auto' }}>
            {natural && area ? (
              renderPreview({ src, natural, area })
            ) : (
              <Typography.Text type="secondary">Загрузка превью...</Typography.Text>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
