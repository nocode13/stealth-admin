import { Flex, theme, Typography } from 'antd';

export const withTitle = <T extends object>(Component: React.FC<T>, title: string) => {
  const ComponentWithTitle: React.FC<T> = (props) => {
    const { token } = theme.useToken();

    return (
      <Flex vertical>
        <Typography.Title
          level={3}
          style={{
            margin: 0,
            padding: token.padding,
          }}
        >
          {title}
        </Typography.Title>
        <Flex style={{ padding: token.paddingXS }}>
          <Component {...props} />
        </Flex>
      </Flex>
    );
  };

  return ComponentWithTitle;
};
