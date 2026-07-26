import { Segmented, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useState } from 'react';

import type { PreviewScheme, PreviewTheme } from '@/shared/config/marketplace-preview';
import { MARKETPLACE_THEME, PHONE_WIDTH } from '@/shared/config/marketplace-preview';

export type PreviewShellProps = {
  children: (theme: PreviewTheme) => ReactNode;
};

/** Рамка «телефона» + переключатель темы мобилки — общая обвязка для всех превью. */
export const PreviewShell = ({ children }: PreviewShellProps) => {
  const [scheme, setScheme] = useState<PreviewScheme>('light');
  const theme = MARKETPLACE_THEME[scheme];

  return (
    <div style={{ width: PHONE_WIDTH, maxWidth: '100%' }}>
      <Segmented
        size="small"
        value={scheme}
        onChange={(value) => setScheme(value as PreviewScheme)}
        options={[
          { value: 'light', label: 'Светлая' },
          { value: 'dark', label: 'Тёмная' },
        ]}
        style={{ marginBottom: 12 }}
      />
      <div
        style={{
          background: theme.background,
          borderRadius: 16,
          border: `1px solid ${theme.border}`,
          overflow: 'hidden',
        }}
      >
        {children(theme)}
      </div>
    </div>
  );
};

export type PreviewSectionProps = {
  title: string;
  theme: PreviewTheme;
  /** Секции мобилки с внутренними отступами; full-bleed блоки рисуем без них. */
  padded?: boolean;
  children: ReactNode;
};

export const PreviewSection = ({ title, theme, padded = true, children }: PreviewSectionProps) => (
  <div style={{ borderTop: `1px solid ${theme.border}` }}>
    <Typography.Text
      type="secondary"
      style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', padding: '8px 12px 4px' }}
    >
      {title}
    </Typography.Text>
    <div style={padded ? { padding: 8 } : undefined}>{children}</div>
  </div>
);
