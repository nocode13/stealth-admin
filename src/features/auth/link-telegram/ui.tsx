import { CheckCircleOutlined, DisconnectOutlined, SendOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Popconfirm, QRCode, Spin, Typography } from 'antd';
import { useUnit } from 'effector-react';

import * as model from './model';

export const LinkTelegramButton = ({ collapsed }: { collapsed?: boolean }) => {
  const [isLinked, pending, trigger, unlinking, unlinkTrigger] = useUnit([
    model.$isLinked,
    model.$pending,
    model.triggered,
    model.$unlinking,
    model.unlinkTriggered,
  ]);

  if (isLinked) {
    return (
      <Flex justify="center" align="center" gap={4} style={{ padding: '0 8px' }}>
        <CheckCircleOutlined style={{ color: '#52c41a' }} />
        {!collapsed && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Telegram привязан
          </Typography.Text>
        )}
        <Popconfirm
          title="Отвязать Telegram?"
          description="Заказы перестанут приходить в бота. Привязать можно заново в любой момент."
          onConfirm={() => unlinkTrigger()}
          okText="Отвязать"
          cancelText="Отмена"
        >
          <Button type="text" size="small" danger icon={<DisconnectOutlined />} loading={unlinking} />
        </Popconfirm>
      </Flex>
    );
  }

  return (
    <Button icon={<SendOutlined />} loading={pending} onClick={() => trigger()}>
      {collapsed || 'Привязать Telegram'}
    </Button>
  );
};

export const LinkTelegramModal = () => {
  const [isOpen, session, pending, close] = useUnit([
    model.disclosure.$isOpen,
    model.$session,
    model.$pending,
    model.closed,
  ]);

  return (
    <Modal title="Привязка Telegram" open={isOpen} onCancel={() => close()} footer={null} destroyOnHidden>
      {pending || !session ? (
        <Spin />
      ) : (
        <Flex vertical align="center" gap="middle">
          <Typography.Paragraph type="secondary" style={{ textAlign: 'center', margin: 0 }}>
            Откройте бота и нажмите Start. После этого заказы будут приходить вам в Telegram, и статус можно будет
            менять прямо в чате.
          </Typography.Paragraph>
          {/* QR — чтобы привязать с телефона, не пересылая ссылку себе. */}
          <QRCode value={session.botUrl} size={180} />
          <Typography.Link href={session.botUrl} target="_blank" rel="noreferrer">
            Открыть бота
          </Typography.Link>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Ссылка действует {Math.round(session.expiresIn / 60)} мин. После привязки обновите страницу.
          </Typography.Text>
        </Flex>
      )}
    </Modal>
  );
};
