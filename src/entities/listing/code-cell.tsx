import { Flex, Typography } from 'antd';

import { formatListingCode, getListingLinks } from './links';

/**
 * Артикул + копирование ссылок: веб — для Instagram/QR (откроет приложение, если оно
 * стоит), Telegram — для канала (откроет Mini App сразу на товаре).
 */
export const ListingCodeCell = ({ code }: { code: number }) => {
  const links = getListingLinks(code);

  return (
    <Flex vertical gap={2}>
      <Typography.Text strong>{formatListingCode(code)}</Typography.Text>
      <Typography.Text type="secondary" copyable={{ text: links.web, tooltips: ['Скопировать ссылку', 'Скопировано'] }}>
        Ссылка
      </Typography.Text>
      <Typography.Text
        type="secondary"
        copyable={{ text: links.telegram, tooltips: ['Скопировать ссылку на Mini App', 'Скопировано'] }}
      >
        Telegram
      </Typography.Text>
    </Flex>
  );
};
