import { Flex, Switch, Typography } from 'antd';
import type { FieldValues } from 'react-hook-form';
import { useController } from 'react-hook-form';

import type { FieldProps } from './types';

export type SwitchFieldProps<T extends FieldValues> = FieldProps<T> & {
  label?: string;
};

export const SwitchField = <T extends FieldValues>({ name, control, label }: SwitchFieldProps<T>) => {
  const { field } = useController<T>({ name, control });

  return (
    <div style={{ marginBottom: 16 }}>
      <Flex align="center" gap="small">
        <Switch checked={!!field.value} onChange={field.onChange} />
        {!!label && <Typography.Text>{label}</Typography.Text>}
      </Flex>
    </div>
  );
};
