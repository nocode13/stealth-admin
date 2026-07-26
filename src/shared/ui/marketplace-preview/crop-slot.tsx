import type { CropArea, Size } from '@/shared/lib/crop-preview';
import { cropSlotStyles } from '@/shared/lib/crop-preview';

export type CropSlotProps = {
  src: string;
  natural: Size;
  area: CropArea;
  /** Размер слота в мобилке — см. `MARKETPLACE_SLOTS`. */
  slot: Size;
  radius?: number;
};

/** Один слот маркетплейса: область кропа, вписанная по `cover`, как это делает RN `Image`. */
export const CropSlot = ({ src, natural, area, slot, radius = 0 }: CropSlotProps) => {
  const styles = cropSlotStyles(natural, area, slot);

  return (
    <div style={{ ...styles.wrapper, borderRadius: radius }}>
      <img src={src} alt="" style={styles.image} />
    </div>
  );
};
