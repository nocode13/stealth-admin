/* eslint-disable react-refresh/only-export-components -- createLazyPage требует из модуля страницы экспорт component + createModel */
import { PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Table, Tag, Typography, type TableProps } from 'antd';
import { useUnit } from 'effector-react';

import { BroadcastCreate } from '@/features/broadcast/create';
import { StatusTag, type Broadcast } from '@/entities/broadcast';
import type { LazyPageProps } from '@/shared/lib/create-lazy-page';
import { htmlToText } from '@/shared/lib/html';
import { withTitle } from '@/shared/ui/with-title';

import { factory } from '../model';

type Model = ReturnType<typeof factory>;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const Page = ({ model }: LazyPageProps<Model>) => {
  const [broadcasts, nextCursor, pending] = useUnit([model.$broadcasts, model.$nextCursor, model.$pending]);

  return (
    <Flex vertical gap="middle" style={{ width: '100%' }}>
      <Flex justify="end">
        <Button type="primary" onClick={() => BroadcastCreate.model.createTriggered()} icon={<PlusOutlined />}>
          Новая рассылка
        </Button>
      </Flex>

      <Table
        rowKey="id"
        dataSource={broadcasts}
        // Поллинг во время отправки не должен мигать спиннером поверх таблицы.
        loading={pending && broadcasts.length === 0}
        columns={COLUMNS}
        pagination={false}
        style={{ width: '100%' }}
      />
      {nextCursor !== null && (
        <Flex justify="center">
          <Button loading={pending} onClick={() => model.loadMoreClicked()}>
            Загрузить ещё
          </Button>
        </Flex>
      )}
      <BroadcastCreate.View />
    </Flex>
  );
};

const Counter = ({ ok, failed, extra }: { ok: number; failed: number; extra?: string }) => (
  <Flex vertical>
    <Typography.Text type="success">✓ {ok}</Typography.Text>
    {failed > 0 && <Typography.Text type="danger">✗ {failed}</Typography.Text>}
    {!!extra && (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {extra}
      </Typography.Text>
    )}
  </Flex>
);

const COLUMNS: TableProps<Broadcast>['columns'] = [
  {
    title: 'Дата',
    key: 'createdAt',
    render: (_, b) => formatDateTime(b.createdAt),
    width: 150,
  },
  {
    title: 'Сообщение',
    key: 'title',
    render: (_, b) => (
      <Flex vertical style={{ maxWidth: 360 }}>
        <Typography.Text strong>{b.title.RU}</Typography.Text>
        <Typography.Text type="secondary" ellipsis style={{ fontSize: 12 }}>
          {htmlToText(b.body.RU)}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {(['UZ', 'EN'] as const).map((l) => `${l}: ${b.title[l] ? '✓' : '—'}`).join(', ')}
        </Typography.Text>
      </Flex>
    ),
  },
  {
    title: 'Получатели',
    key: 'audience',
    render: (_, b) => (
      <Flex vertical>
        <span>{b.recipientsCount}</span>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {b.audience === 'ALL' ? 'все клиенты' : 'выбранные'}
        </Typography.Text>
      </Flex>
    ),
    width: 120,
  },
  {
    title: 'Push',
    key: 'push',
    render: (_, b) => (b.sendPush ? <Counter ok={b.pushSent} failed={b.pushFailed} /> : '—'),
    width: 90,
  },
  {
    title: 'Telegram',
    key: 'telegram',
    render: (_, b) =>
      b.sendTelegram ? (
        <Counter
          ok={b.tgSent}
          failed={b.tgFailed}
          extra={b.tgBlocked > 0 ? `заблокировали: ${b.tgBlocked}` : undefined}
        />
      ) : (
        '—'
      ),
    width: 140,
  },
  {
    title: 'Кнопка',
    key: 'button',
    render: (_, b) => (b.buttonUrl ? <Tag>{b.buttonText?.RU}</Tag> : '—'),
    width: 140,
  },
  {
    title: 'Статус',
    key: 'status',
    render: (_, b) => <StatusTag status={b.status} />,
    width: 130,
  },
  {
    title: 'Автор',
    key: 'createdBy',
    render: (_, b) => b.createdBy.name || b.createdBy.email || '—',
  },
];

export const component = withTitle(Page, 'Рассылки');
export const createModel = factory;
