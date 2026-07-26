import { MARKETPLACE_SLOTS, PHONE_WIDTH } from '@/shared/config/marketplace-preview';
import type { CropArea, Size } from '@/shared/lib/crop-preview';

import { CropSlot } from './crop-slot';
import { PreviewSection, PreviewShell } from './preview-shell';

const { sellerBanner, sellerCardBanner } = MARKETPLACE_SLOTS;

/** Карточка магазина на странице товара живёт в контейнере с горизонтальным паддингом 8. */
const STORE_CARD_WIDTH = PHONE_WIDTH - 16;

export type SellerBannerPreviewProps = {
  src: string;
  natural: Size;
  area: CropArea;
  name?: string;
  description?: string;
};

/**
 * Как баннер продавца выглядит в мобилке: шапка страницы магазина (full-bleed h-40)
 * и карточка магазина на странице товара (h-28 со скруглённым верхом).
 */
export const SellerBannerPreview = ({ src, natural, area, name, description }: SellerBannerPreviewProps) => (
  <PreviewShell>
    {(theme) => (
      <>
        <PreviewSection title="Страница магазина" theme={theme} padded={false}>
          <CropSlot
            src={src}
            natural={natural}
            area={area}
            slot={{ width: PHONE_WIDTH, height: sellerBanner.height }}
            radius={sellerBanner.radius}
          />
          <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ color: theme.foreground, fontSize: 20, fontWeight: 700 }}>{name || 'Название магазина'}</div>
            <div style={{ color: theme.mutedForeground, fontSize: 14 }}>
              {description || 'Описание магазина появится здесь'}
            </div>
          </div>
        </PreviewSection>

        <PreviewSection title="Карточка магазина на странице товара" theme={theme}>
          <div
            style={{
              width: STORE_CARD_WIDTH,
              background: theme.muted,
              border: `1px solid ${theme.border}`,
              borderRadius: sellerCardBanner.radius,
              overflow: 'hidden',
            }}
          >
            <CropSlot
              src={src}
              natural={natural}
              area={area}
              slot={{ width: STORE_CARD_WIDTH, height: sellerCardBanner.height }}
            />
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ color: theme.foreground, fontSize: 18, fontWeight: 600 }}>
                {name || 'Название магазина'}
              </div>
              <div style={{ color: theme.mutedForeground, fontSize: 14 }}>
                {description || 'Описание магазина появится здесь'}
              </div>
              <div style={{ color: theme.primary, fontSize: 14, fontWeight: 500 }}>Посетить магазин →</div>
            </div>
          </div>
        </PreviewSection>
      </>
    )}
  </PreviewShell>
);
