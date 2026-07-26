import type { ReactNode } from 'react';

import { MARKETPLACE_SLOTS, PHONE_WIDTH } from '@/shared/config/marketplace-preview';
import type { PreviewTheme } from '@/shared/config/marketplace-preview';
import type { CropArea, Size } from '@/shared/lib/crop-preview';

import { CropSlot } from './crop-slot';
import { PreviewSection, PreviewShell } from './preview-shell';

const { catalogCard, catalogHero, cartThumb } = MARKETPLACE_SLOTS;

/** Ширина карточки в сетке 2×N: ширина экрана минус паддинги контейнера и зазор между колонками. */
const CARD_WIDTH = (PHONE_WIDTH - catalogCard.gridPadding * 2 - catalogCard.gridGap) / catalogCard.columns;
const CARD_IMAGE_WIDTH = CARD_WIDTH - catalogCard.cardPadding * 2;

export type CatalogPreviewProps = {
  src: string;
  natural: Size;
  area: CropArea;
  name?: string;
  category?: string;
};

const PlaceholderBar = ({ theme, width }: { theme: PreviewTheme; width: number | string }) => (
  <div style={{ height: 10, width, borderRadius: 4, background: theme.muted }} />
);

const ProductCard = ({
  theme,
  name,
  category,
  children,
}: {
  theme: PreviewTheme;
  name?: string;
  category?: string;
  children: ReactNode;
}) => (
  <div
    style={{
      width: CARD_WIDTH,
      background: theme.card,
      border: `1px solid ${theme.border}`,
      borderRadius: catalogCard.cardRadius,
      padding: catalogCard.cardPadding,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}
  >
    {children}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          color: theme.foreground,
          fontSize: 14,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {name || 'Название товара'}
      </div>
      <div
        style={{
          color: theme.mutedForeground,
          fontSize: 12,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {category || 'Категория'}
      </div>
      <PlaceholderBar theme={theme} width={64} />
    </div>
  </div>
);

/**
 * Как изображение позиции каталога выглядит в мобилке: карточка в сетке (h-32 cover),
 * хиро на странице товара (квадрат) и миниатюра в корзине (64×64).
 */
export const CatalogPreview = ({ src, natural, area, name, category }: CatalogPreviewProps) => (
  <PreviewShell>
    {(theme) => (
      <>
        <PreviewSection title="Карточка в каталоге" theme={theme}>
          <div style={{ display: 'flex', gap: catalogCard.gridGap }}>
            <ProductCard theme={theme} name={name} category={category}>
              <CropSlot
                src={src}
                natural={natural}
                area={area}
                slot={{ width: CARD_IMAGE_WIDTH, height: catalogCard.height }}
                radius={catalogCard.radius}
              />
            </ProductCard>
            <ProductCard theme={theme}>
              <div
                style={{
                  width: CARD_IMAGE_WIDTH,
                  height: catalogCard.height,
                  borderRadius: catalogCard.radius,
                  background: theme.muted,
                }}
              />
            </ProductCard>
          </div>
        </PreviewSection>

        <PreviewSection title="Страница товара" theme={theme} padded={false}>
          <CropSlot
            src={src}
            natural={natural}
            area={area}
            slot={{ width: PHONE_WIDTH, height: PHONE_WIDTH / catalogHero.aspect }}
            radius={catalogHero.radius}
          />
        </PreviewSection>

        <PreviewSection title="Корзина" theme={theme}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: theme.card,
              border: `1px solid ${theme.border}`,
              borderRadius: catalogCard.cardRadius,
              padding: catalogCard.cardPadding,
            }}
          >
            <CropSlot
              src={src}
              natural={natural}
              area={area}
              slot={{ width: cartThumb.width, height: cartThumb.height }}
              radius={cartThumb.radius}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <div style={{ color: theme.foreground, fontSize: 14, fontWeight: 600 }}>{name || 'Название товара'}</div>
              <PlaceholderBar theme={theme} width="60%" />
            </div>
          </div>
        </PreviewSection>
      </>
    )}
  </PreviewShell>
);
