import { MARKETPLACE_SLOTS, PHONE_WIDTH } from '@/shared/config/marketplace-preview';
import type { CropArea, Size } from '@/shared/lib/crop-preview';

import { CropSlot } from './crop-slot';
import { PreviewSection, PreviewShell } from './preview-shell';

const { categoryTile } = MARKETPLACE_SLOTS;

/** Соседние плитки-заглушки: иконку видно в ряду из четырёх, как на главной. */
const PLACEHOLDERS = ['Горшки', 'Удобрения', 'Услуги'];

export type CategoryIconPreviewProps = {
  src: string;
  natural: Size;
  area: CropArea;
  name?: string;
};

/** Как иконка категории товаров выглядит в сетке категорий на главной мобилки. */
export const CategoryIconPreview = ({ src, natural, area, name }: CategoryIconPreviewProps) => (
  <PreviewShell>
    {(theme) => (
      <PreviewSection title="Главная: сетка категорий" theme={theme}>
        <div
          style={{
            width: PHONE_WIDTH - 32,
            display: 'grid',
            gridTemplateColumns: `repeat(${categoryTile.columns}, 1fr)`,
            gap: 8,
          }}
        >
          {[name || 'Категория', ...PLACEHOLDERS].map((label, index) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {index === 0 ? (
                <CropSlot
                  src={src}
                  natural={natural}
                  area={area}
                  slot={{ width: categoryTile.size, height: categoryTile.size }}
                  radius={categoryTile.radius}
                />
              ) : (
                <div
                  style={{
                    width: categoryTile.size,
                    height: categoryTile.size,
                    borderRadius: categoryTile.radius,
                    background: theme.muted,
                  }}
                />
              )}
              <div
                style={{
                  color: index === 0 ? theme.foreground : theme.mutedForeground,
                  fontSize: 12,
                  lineHeight: '16px',
                  textAlign: 'center',
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </PreviewSection>
    )}
  </PreviewShell>
);
