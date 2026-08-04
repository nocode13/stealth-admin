import { DisconnectOutlined, PlusOutlined, ReloadOutlined, SendOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Popconfirm, Table, Tag, Typography, type TableProps } from 'antd';
import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { SellerStaffCreateEdit } from '@/features/seller-staff/creat-edit';
import { SellerStaffDelete } from '@/features/seller-staff/delete';
import { SellerStaffInvite } from '@/features/seller-staff/invite';
import type { SellerStaff } from '@/shared/api';

import type { factory } from './model';

type Model = ReturnType<typeof factory>;

export const SellerStaffTable = ({ model }: { model: Model }) => {
  const [sellerId, staff, pending, mounted, refreshClicked] = useUnit([
    model.$sellerId,
    model.$staff,
    model.$pending,
    model.mounted,
    model.refreshClicked,
  ]);

  useEffect(() => mounted(), [mounted]);

  const columns = useColumns(sellerId);

  return (
    <Card
      title="Сотрудники"
      size="small"
      extra={
        <Flex gap="small">
          <Button size="small" icon={<ReloadOutlined />} loading={pending} onClick={() => refreshClicked()} />
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            disabled={!sellerId}
            onClick={() => sellerId && SellerStaffCreateEdit.model.createTriggered(sellerId)}
          >
            Добавить
          </Button>
        </Flex>
      }
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        Новый заказ приходит в Telegram всем сотрудникам с привязкой. У кого её нет — заказ виден только в админке.
      </Typography.Paragraph>
      <Table rowKey="id" dataSource={staff} loading={pending} columns={columns} pagination={false} size="small" />
      <SellerStaffCreateEdit.View />
      <SellerStaffInvite.View />
    </Card>
  );
};

const useColumns = (sellerId: string | null): TableProps<SellerStaff>['columns'] => {
  const [unlinking, deleting] = useUnit([SellerStaffInvite.model.$unlinking, SellerStaffDelete.model.$mutating]);

  return [
    {
      title: 'Имя',
      key: 'name',
      render: (_, staff) => (
        <Flex align="center" gap="small">
          <span>{staff.name || '—'}</span>
          {!!staff.isOwner && <Tag>владелец</Tag>}
        </Flex>
      ),
    },
    { title: 'Телефон', key: 'phone', render: (_, staff) => staff.phone || '—' },
    { title: 'Email', key: 'email', render: (_, staff) => staff.email || '—' },
    {
      title: 'Telegram',
      key: 'telegram',
      render: (_, staff) =>
        staff.telegramLinked ? <Tag color="green">привязан</Tag> : <Tag color="orange">не привязан</Tag>,
    },
    {
      title: 'Админка',
      key: 'admin',
      render: (_, staff) =>
        staff.hasPassword ? (
          <Typography.Text type="secondary">есть вход</Typography.Text>
        ) : (
          <Typography.Text type="secondary">только бот</Typography.Text>
        ),
    },
    {
      key: 'actions',
      align: 'right',
      render: (_, staff) => {
        if (!sellerId) return null;

        return (
          <Flex gap="small" justify="flex-end">
            {staff.telegramLinked ? (
              <Popconfirm
                title="Отвязать Telegram?"
                description="Заказы перестанут приходить этому сотруднику. Привязать можно заново."
                onConfirm={() => SellerStaffInvite.model.unlinkTriggered({ sellerId, staff })}
                okText="Отвязать"
                cancelText="Отмена"
              >
                <Button size="small" icon={<DisconnectOutlined />} loading={unlinking} />
              </Popconfirm>
            ) : (
              <Button
                size="small"
                icon={<SendOutlined />}
                onClick={() => SellerStaffInvite.model.inviteTriggered({ sellerId, staff })}
              >
                Пригласить
              </Button>
            )}
            <Button size="small" onClick={() => SellerStaffCreateEdit.model.editTriggered({ sellerId, staff })}>
              Изменить
            </Button>
            {/* Владельца бэкенд удалять не даёт — на нём висит сам продавец. */}
            {!staff.isOwner && (
              <Popconfirm
                title="Удалить сотрудника?"
                description="Он потеряет кабинет в боте и доступ в админку."
                onConfirm={() => SellerStaffDelete.model.deleteTriggered({ sellerId, staff })}
                okText="Удалить"
                cancelText="Отмена"
              >
                <Button size="small" danger loading={deleting}>
                  Удалить
                </Button>
              </Popconfirm>
            )}
          </Flex>
        );
      },
    },
  ];
};
