import { BellOutlined, SendOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Typography, theme } from 'antd';
import { useWatch, type Control } from 'react-hook-form';

import type { Locale } from '@/shared/api';
import { htmlToText } from '@/shared/lib/html';
import { RichTextView } from '@/shared/ui/rich-text';

import type { FormValues } from '../model';

const SUFFIX: Record<Locale, 'Ru' | 'Uz' | 'En'> = { RU: 'Ru', UZ: 'Uz', EN: 'En' };

type Props = {
  control: Control<FormValues>;
  locale: Locale;
};

/**
 * Примерный вид на выбранном языке, с тем же фолбэком на RU, что у бэкенда. Push — plain
 * text (разметку рендерит ОС, а не мы), Telegram — HTML как в редакторе: бэкенд
 * разворачивает списки в «• », а заголовков в форме рассылки нет.
 */
export const BroadcastPreview = ({ control, locale }: Props) => {
  const { token } = theme.useToken();
  const values = useWatch({ control });
  const suffix = SUFFIX[locale];

  const pick = (field: 'title' | 'body' | 'buttonText') => {
    const own = values[`${field}${suffix}` as const] ?? '';
    const hasOwn = field === 'body' ? !!htmlToText(own) : !!own.trim();
    return hasOwn ? own : (values[`${field}Ru` as const] ?? '');
  };

  const title = pick('title');
  const body = pick('body');
  const buttonText = pick('buttonText');
  const plain = htmlToText(body);

  return (
    <Flex vertical gap="middle" style={{ position: 'sticky', top: 0 }}>
      <Typography.Text type="secondary">Предпросмотр · {locale}</Typography.Text>

      {values.sendPush && (
        <Card
          size="small"
          title={
            <>
              <BellOutlined /> Push
            </>
          }
        >
          <Typography.Text strong style={{ display: 'block' }}>
            {title || 'Заголовок'}
          </Typography.Text>
          <Typography.Paragraph type="secondary" ellipsis={{ rows: 3 }} style={{ marginBottom: 0 }}>
            {plain || 'Текст уведомления'}
          </Typography.Paragraph>
        </Card>
      )}

      {values.sendTelegram && (
        <Card
          size="small"
          title={
            <>
              <SendOutlined /> Telegram
            </>
          }
        >
          <div
            style={{
              background: token.colorFillQuaternary,
              borderRadius: token.borderRadiusLG,
              padding: '8px 12px',
            }}
          >
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              {title || 'Заголовок'}
            </Typography.Text>
            {plain ? <RichTextView html={body} /> : <Typography.Text type="secondary">Текст сообщения</Typography.Text>}
          </div>
          {!!buttonText.trim() && !!values.buttonUrl && (
            <Button block style={{ marginTop: 4 }} href={values.buttonUrl} target="_blank" rel="noreferrer">
              {buttonText}
            </Button>
          )}
        </Card>
      )}
    </Flex>
  );
};
