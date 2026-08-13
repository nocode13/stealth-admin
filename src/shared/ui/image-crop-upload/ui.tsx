import { Image, Typography, Upload } from 'antd';
import { message as antMessage } from 'antd';
import type { ReactNode } from 'react';
import { useState } from 'react';

import type { CropArea, Size } from '@/shared/lib/crop-preview';
import { MAX_IMAGE_SIZE } from '@/shared/lib/crop-image';

import { ImageCropModal } from './crop-modal';

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
  const [picked, setPicked] = useState<File | null>(null);

  return (
    <div style={{ marginTop: 16 }}>
      {!!currentUrl && <Image src={currentUrl} width={aspect >= 2 ? 160 : 80} />}
      <div style={{ marginTop: 8 }}>
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={(file) => {
            const picked = file as unknown as File;
            if (!picked.type.startsWith('image/')) {
              void antMessage.error('Файл должен быть изображением');
              return Upload.LIST_IGNORE;
            }
            if (picked.size > MAX_IMAGE_SIZE) {
              void antMessage.error('Максимальный размер файла — 5 МБ');
              return Upload.LIST_IGNORE;
            }
            setPicked(picked);
            return Upload.LIST_IGNORE;
          }}
        >
          <Typography.Link disabled={uploading}>{uploading ? 'Загрузка...' : triggerText}</Typography.Link>
        </Upload>
      </div>

      <ImageCropModal
        file={picked}
        aspect={aspect}
        uploading={uploading}
        onCancel={() => setPicked(null)}
        onConfirm={(file) => {
          onConfirm(file);
          setPicked(null);
        }}
        renderPreview={renderPreview}
      />
    </div>
  );
};
