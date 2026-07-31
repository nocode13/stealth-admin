import { Image, Modal, Slider, Typography, Upload } from 'antd';
import { message as antMessage } from 'antd';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

import type { CropArea, Size } from '@/shared/lib/crop-preview';
import { MAX_IMAGE_SIZE, cropImageToFile } from '@/shared/lib/crop-image';

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

type Picked = {
  src: string;
  name: string;
};

export type ImageCropUploadProps = {
  /** Соотношение сторон кропа — `PREVIEW_ASPECT.catalog` / `PREVIEW_ASPECT.sellerBanner`. */
  aspect: number;
  /** Уже загруженное изображение — показывается над кнопкой. Не передавать, если превью не нужно (например, галерея из нескольких фото рендерится отдельно). */
  currentUrl?: string | null;
  uploading: boolean;
  triggerText: string;
  onConfirm: (file: File) => void;
  /** Превью маркетплейса; перерисовывается на каждое движение рамки. */
  renderPreview: (params: { src: string; natural: Size; area: CropArea }) => ReactNode;
};

/**
 * Выбор изображения с кропом и превью того, как оно будет выглядеть в маркетплейсе.
 * Состояние локальное: наружу отдаётся только готовый `File` через `onConfirm`.
 */
export const ImageCropUpload = ({
  aspect,
  currentUrl,
  uploading,
  triggerText,
  onConfirm,
  renderPreview,
}: ImageCropUploadProps) => {
  const [picked, setPicked] = useState<Picked | null>(null);
  const [natural, setNatural] = useState<Size | null>(null);
  const [area, setArea] = useState<CropArea | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [cropping, setCropping] = useState(false);

  // objectURL живёт до закрытия модалки — иначе утечка на каждый выбранный файл.
  useEffect(() => {
    if (!picked) return;
    return () => URL.revokeObjectURL(picked.src);
  }, [picked]);

  const close = () => {
    setPicked(null);
    setNatural(null);
    setArea(null);
    setCrop({ x: 0, y: 0 });
    setZoom(ZOOM_MIN);
  };

  const confirm = async () => {
    if (!picked || !area) return;

    setCropping(true);
    try {
      const { file, recompressed } = await cropImageToFile(picked.src, area, picked.name);
      if (recompressed) {
        void antMessage.warning('Изображение пересжато, чтобы уложиться в 5 МБ');
      }
      onConfirm(file);
      close();
    } catch (error) {
      void antMessage.error(error instanceof Error ? error.message : 'Не удалось обработать изображение');
    } finally {
      setCropping(false);
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      {!!currentUrl && <Image src={currentUrl} width={aspect >= 2 ? 160 : 80} />}
      <div style={{ marginTop: 8 }}>
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={(file) => {
            if (!file.type.startsWith('image/')) {
              void antMessage.error('Файл должен быть изображением');
              return Upload.LIST_IGNORE;
            }
            if (file.size > MAX_IMAGE_SIZE) {
              void antMessage.error('Максимальный размер файла — 5 МБ');
              return Upload.LIST_IGNORE;
            }
            setPicked({ src: URL.createObjectURL(file), name: file.name });
            return false;
          }}
        >
          <Typography.Link disabled={uploading}>{uploading ? 'Загрузка...' : triggerText}</Typography.Link>
        </Upload>
      </div>

      <Modal
        title="Кадрирование"
        open={!!picked}
        onCancel={close}
        onOk={() => void confirm()}
        okText="Загрузить"
        okButtonProps={{ disabled: !area }}
        confirmLoading={cropping || uploading}
        width={980}
        destroyOnHidden
      >
        {!!picked && (
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 380px', minWidth: 320 }}>
              <div style={{ position: 'relative', height: 380, background: '#000', borderRadius: 8 }}>
                <Cropper
                  image={picked.src}
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
                renderPreview({ src: picked.src, natural, area })
              ) : (
                <Typography.Text type="secondary">Загрузка превью...</Typography.Text>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
