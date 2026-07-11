import { Flex, Spin } from 'antd';

export const FullScreenLoader = ({ fullscreen }: { fullscreen?: boolean }) => (
  <Flex flex={1} justify="center" align="center" style={{ minHeight: '100dvh' }}>
    <Spin size="large" fullscreen={fullscreen} />
  </Flex>
);
