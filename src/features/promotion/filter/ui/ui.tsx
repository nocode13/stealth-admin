import { Col, Input, Row, Select, theme } from 'antd';
import { useUnit } from 'effector-react';

import { promotionConfig, type PromotionState } from '@/entities/promotion';

import * as model from '../model';

const STATE_OPTIONS = (Object.keys(promotionConfig.stateOptions) as PromotionState[]).map((value) => ({
  value,
  label: promotionConfig.stateOptions[value],
}));

export const View: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [search, searchChanged, state, stateChanged] = useUnit([
    model.searchModel.$value,
    model.searchModel.changed,
    model.stateModel.$value,
    model.stateModel.changed,
  ]);
  const { token } = theme.useToken();

  return (
    <Row gutter={token.margin} style={{ width: '100%' }}>
      <Col span={14}>
        <Input
          value={search}
          onChange={(event) => searchChanged(event.target.value)}
          allowClear
          placeholder="Название акции"
        />
      </Col>
      <Col span={6}>
        <Select
          value={state}
          onChange={(value: PromotionState | undefined) => stateChanged(value ?? null)}
          allowClear
          placeholder="Статус"
          options={STATE_OPTIONS}
          style={{ width: '100%' }}
        />
      </Col>
      <Col span={4}>{children}</Col>
    </Row>
  );
};
