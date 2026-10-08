import { LinkOutlined } from '@ant-design/icons';
import { Button, Flex, Form, Input, Modal, QRCode, Segmented, Select, Tooltip, Typography } from 'antd';
import { useUnit } from 'effector-react';

import { formatListingCode, ListingTitle, type Listing } from '@/entities/listing';

import { MEDIUM_OPTIONS, SOURCE_OPTIONS } from '../config';
import * as model from '../model';

const COPY_TOOLTIPS = ['Скопировать ссылку', 'Скопировано'];

export const CampaignLinkButton = ({ item }: { item: Listing }) => {
  const triggered = useUnit(model.triggered);

  return (
    <Tooltip title="Ссылка для рекламы">
      <Button size="small" icon={<LinkOutlined />} onClick={() => triggered(item)} />
    </Tooltip>
  );
};

export const CampaignLinkModal = () => {
  const [
    isOpen,
    listing,
    links,
    source,
    sourceChanged,
    medium,
    mediumChanged,
    campaign,
    campaignChanged,
    content,
    contentChanged,
    close,
  ] = useUnit([
    model.disclosure.$isOpen,
    model.$listing,
    model.$links,
    model.$source,
    model.sourceChanged,
    model.$medium,
    model.mediumChanged,
    model.campaignModel.$value,
    model.campaignModel.changed,
    model.contentModel.$value,
    model.contentModel.changed,
    model.closed,
  ]);

  return (
    <Modal
      title={listing ? `Ссылка для рекламы · ${formatListingCode(listing.code)}` : 'Ссылка для рекламы'}
      open={isOpen}
      onCancel={() => close()}
      footer={null}
      destroyOnHidden
    >
      <Flex vertical gap="middle">
        {listing && <ListingTitle name={listing.catalogItem.name} variant={listing} />}
        {/* Сабмита нет — ссылка пересобирается на каждый ввод, Form нужен только ради подписей. */}
        <Form layout="vertical" component={false}>
          <Form.Item label="Источник">
            <Segmented block options={SOURCE_OPTIONS} value={source} onChange={sourceChanged} />
          </Form.Item>
          <Form.Item label="Формат">
            <Select
              value={medium}
              options={MEDIUM_OPTIONS}
              onChange={(value) => mediumChanged(value ?? null)}
              allowClear
              placeholder="Не указан"
            />
          </Form.Item>
          <Form.Item label="Кампания" extra="По ней PostHog разбивает выручку. Латиницей: 2026-10_autumn_roses">
            <Input
              value={campaign}
              onChange={(event) => campaignChanged(event.target.value)}
              allowClear
              placeholder="2026-10_autumn_roses"
            />
          </Form.Item>
          <Form.Item label="Креатив" extra="Какая именно сторис или пост, если их несколько: story_1007_a">
            <Input
              value={content}
              onChange={(event) => contentChanged(event.target.value)}
              allowClear
              placeholder="story_1007_a"
            />
          </Form.Item>
        </Form>
        {links && (
          <Flex gap="middle" align="flex-start">
            <QRCode value={links.web} size={120} />
            <Flex vertical gap="small" style={{ flex: 1, minWidth: 0 }}>
              <Typography.Text strong>Ссылка</Typography.Text>
              <Typography.Paragraph
                copyable={{ text: links.web, tooltips: COPY_TOOLTIPS }}
                style={{ margin: 0, wordBreak: 'break-all' }}
              >
                {links.web}
              </Typography.Paragraph>
              {source === 'telegram' && (
                <>
                  <Typography.Text strong>Mini App</Typography.Text>
                  <Typography.Paragraph
                    copyable={{ text: links.telegram, tooltips: COPY_TOOLTIPS }}
                    style={{ margin: 0, wordBreak: 'break-all' }}
                  >
                    {links.telegram}
                  </Typography.Paragraph>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Откроет товар сразу в Telegram. Формат, кампанию и креатив Telegram в такую ссылку не пропускает — в
                    аналитике будет только источник.
                  </Typography.Text>
                </>
              )}
            </Flex>
          </Flex>
        )}
      </Flex>
    </Modal>
  );
};
