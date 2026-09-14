import type { CSSProperties } from 'react';

import { RICH_TEXT_CLASS } from './const';

type RichTextViewProps = {
  html: string;
  style?: CSSProperties;
};

/**
 * Read-only вывод HTML-описания. HTML уже прошёл allowlist бэкенда
 * (`stealth-backend/src/common/rich-text.ts`: без атрибутов, ссылок и медиа), поэтому
 * вставляем как есть.
 */
export const RichTextView = ({ html, style }: RichTextViewProps) => (
  <div className={RICH_TEXT_CLASS} style={style} dangerouslySetInnerHTML={{ __html: html }} />
);
