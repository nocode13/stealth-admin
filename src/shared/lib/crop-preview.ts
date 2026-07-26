import type { CSSProperties } from 'react';

/** Область кропа в пикселях оригинала — форма `croppedAreaPixels` из `react-easy-crop`. */
export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Size = {
  width: number;
  height: number;
};

/**
 * Считает CSS для одного слота маркетплейса: «взять область кропа и вписать её по `cover`
 * в слот». Композиция двух преобразований (кроп → cover) в одну трансформацию, поэтому
 * работает и для слотов с другим соотношением сторон (карточка 128px, баннер 112px).
 *
 * Без canvas — превью пересчитывается на каждый кадр перетаскивания рамки, гонять
 * `toBlob` так часто нельзя.
 */
export const cropSlotStyles = (
  natural: Size,
  area: CropArea,
  slot: Size,
): { wrapper: CSSProperties; image: CSSProperties } => {
  const scale = Math.max(slot.width / area.width, slot.height / area.height);

  return {
    wrapper: {
      position: 'relative',
      overflow: 'hidden',
      width: slot.width,
      height: slot.height,
      flexShrink: 0,
    },
    image: {
      position: 'absolute',
      width: natural.width * scale,
      height: natural.height * scale,
      maxWidth: 'none',
      left: -area.x * scale + (slot.width - area.width * scale) / 2,
      top: -area.y * scale + (slot.height - area.height * scale) / 2,
    },
  };
};
