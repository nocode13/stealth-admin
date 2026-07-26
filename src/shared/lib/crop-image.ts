import type { CropArea } from './crop-preview';

/** Тот же лимит, что у бэкенда (`stealth-backend/src/admin/upload.options.ts`). */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** Ступени пересжатия — только если lossless-кроп не влез в лимит. */
const QUALITY_STEPS = [1, 0.95, 0.9, 0.85];

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Не удалось прочитать изображение'));
    image.src = src;
  });

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * Режет изображение по области кропа **в нативном разрешении** — качество и размер не
 * понижаем, меняется только кадр. Даунскейл (1600 по длинной стороне) и финальное сжатие
 * делает бэкенд в `ImageService`.
 *
 * Возвращает `{ file, recompressed }`: `recompressed === true`, если lossless-результат не
 * влез в 5 МБ и пришлось понизить качество.
 */
export const cropImageToFile = async (
  src: string,
  area: CropArea,
  fileName: string,
): Promise<{ file: File; recompressed: boolean }> => {
  const image = await loadImage(src);

  const width = Math.round(area.width);
  const height = Math.round(area.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Не удалось подготовить изображение');

  ctx.drawImage(image, Math.round(area.x), Math.round(area.y), width, height, 0, 0, width, height);

  let blob: Blob | null = null;
  let usedQuality = QUALITY_STEPS[0];

  for (const quality of QUALITY_STEPS) {
    // ступени пересжатия по определению последовательны
    const candidate = (await toBlob(canvas, 'image/webp', quality)) ?? (await toBlob(canvas, 'image/png', quality));
    if (!candidate) continue;

    blob = candidate;
    usedQuality = quality;
    if (candidate.size <= MAX_IMAGE_SIZE) break;
  }

  if (!blob) throw new Error('Не удалось подготовить изображение');

  const extension = blob.type === 'image/png' ? 'png' : 'webp';
  const baseName = fileName.replace(/\.[^./\\]+$/, '') || 'image';

  return {
    file: new File([blob], `${baseName}.${extension}`, { type: blob.type }),
    recompressed: usedQuality !== QUALITY_STEPS[0],
  };
};
