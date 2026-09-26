import { Tag, type TagProps } from 'antd';

import type { PromotionState } from '@/shared/api';

import { stateOptions } from './config';

export const StateTag: React.FC<{ state: PromotionState }> = ({ state }) => {
  return <Tag color={COLOR_BY_STATE[state]}>{stateOptions[state]}</Tag>;
};

const COLOR_BY_STATE: Record<PromotionState, TagProps['color']> = {
  active: 'green',
  scheduled: 'blue',
  ended: 'default',
  disabled: 'orange',
};
