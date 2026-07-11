import { Layout as AntLayout, Button, Flex, Menu, theme, Typography } from 'antd';
import { useState } from 'react';
import { useUnit } from 'effector-react';
import { LogoutOutlined } from '@ant-design/icons';

import { logoutModel } from '@/features/auth/logout';

import * as model from './model';

const { Sider, Content } = AntLayout;

export const Layout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [items, activeRoutes, mutating] = useUnit([model.$items, model.$activeRoutes, logoutModel.$mutating]);
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();

  return (
    <AntLayout hasSider>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'sticky',
          insetInlineStart: 0,
          top: 0,
          scrollbarWidth: 'thin',
          scrollbarGutter: 'stable',
          background: token.colorBgBase,
        }}
      >
        <Flex
          vertical
          gap={token.margin}
          style={{ padding: `${token.padding}px 0`, height: '100%' }}
          justify="space-between"
        >
          <Typography.Title level={3} style={{ margin: 0, textAlign: 'center' }}>
            {collapsed ? 'S' : 'Stealth'}
          </Typography.Title>
          <Menu selectedKeys={activeRoutes} mode="inline" items={items} style={{ flex: 1 }} />
          <Button
            style={{ margin: `0 ${token.marginXS}px` }}
            icon={<LogoutOutlined />}
            onClick={() => logoutModel.triggered()}
            loading={mutating}
          >
            {collapsed || 'Выйти'}
          </Button>
        </Flex>
      </Sider>
      <AntLayout>
        {/* <Header
          style={{
            padding: 0,
            background: token.colorBgBase,
            position: "sticky",
            top: 0,
            zIndex: 1,
            boxShadow: token.boxShadowTertiary,
            margin: token.margin,
            borderRadius: token.borderRadius,
          }}
        /> */}
        <Content
          style={{
            margin: token.margin,
          }}
        >
          <div
            style={{
              backgroundColor: token.colorBgBase,
              minHeight: '100%',
              borderRadius: token.borderRadius,
              boxShadow: token.boxShadowTertiary,
            }}
          >
            {children}
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};
