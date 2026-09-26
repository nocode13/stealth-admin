import { Col, Input, Row, theme } from 'antd';
import { useUnit } from 'effector-react';

import * as model from '../model';

export const View: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [search, searchChanged] = useUnit([model.searchModel.$value, model.searchModel.changed]);
  const { token } = theme.useToken();

  return (
    <Row gutter={token.margin} style={{ width: '100%' }}>
      <Col span={20}>
        <Input
          value={search}
          onChange={(event) => searchChanged(event.target.value)}
          allowClear
          placeholder="Название правила"
        />
      </Col>
      <Col span={4}>{children}</Col>
    </Row>
  );
};
