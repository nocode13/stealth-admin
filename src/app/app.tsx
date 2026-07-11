import { ConfigProvider, Spin } from 'antd';
import { RouterProvider } from 'atomic-router-react';
import { useStoreMap } from 'effector-react';

import { Pages } from '@/pages';
import { userModel } from '@/entities/user';
import { router } from '@/shared/config/routing';
import { useBindMessageApi } from '@/shared/lib/message';
import './index.css';
import { useBindNotificationApi } from '@/shared/lib/notification';

export const App = () => {
  const isFetchingSession = useStoreMap(userModel.$session, (session) => session === userModel.SessionStatus.Pending);
  const messageContextHolder = useBindMessageApi();
  const notificationContextHolder = useBindNotificationApi();

  return (
    <ConfigProvider>
      <RouterProvider router={router}>
        {isFetchingSession ? <Spin spinning size="large" fullscreen /> : <Pages />}
      </RouterProvider>
      {messageContextHolder}
      {notificationContextHolder}
    </ConfigProvider>
  );
};
