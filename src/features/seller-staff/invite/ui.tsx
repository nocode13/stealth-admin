import { Flex, Modal, QRCode, Spin, Typography } from 'antd';
import { useUnit } from 'effector-react';

import * as model from './model';

export const SellerStaffInviteModal = () => {
  const [isOpen, session, staff, pending, close] = useUnit([
    model.disclosure.$isOpen,
    model.$session,
    model.$staff,
    model.$pending,
    model.closed,
  ]);

  return (
    <Modal
      title={staff?.name ? `Привязка Telegram — ${staff.name}` : 'Привязка Telegram'}
      open={isOpen}
      onCancel={() => close()}
      footer={null}
      destroyOnHidden
    >
      {pending || !session ? (
        <Spin />
      ) : (
        <Flex vertical align="center" gap="middle">
          <Typography.Paragraph type="secondary" style={{ textAlign: 'center', margin: 0 }}>
            Отправьте ссылку сотруднику или дайте отсканировать QR. Он открывает бота, нажимает Start — и новые заказы
            начинают приходить ему в Telegram наравне с остальной командой.
          </Typography.Paragraph>
          {/* QR — чтобы привязать с чужого телефона, не пересылая ссылку. */}
          <QRCode value={session.botUrl} size={180} />
          <Typography.Link href={session.botUrl} target="_blank" rel="noreferrer" copyable>
            {session.botUrl}
          </Typography.Link>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Ссылка действует {Math.round(session.expiresIn / 60)} мин и срабатывает один раз. Закройте окно, чтобы
            обновить список.
          </Typography.Text>
        </Flex>
      )}
    </Modal>
  );
};
