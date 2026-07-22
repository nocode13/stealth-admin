import { Select, Typography, type SelectProps } from 'antd';
import type { FieldValues } from 'react-hook-form';
import { useController } from 'react-hook-form';

import type { FieldProps } from './types';

export type SelectFieldProps<T extends FieldValues> = FieldProps<T> &
  Pick<SelectProps, 'showSearch' | 'allowClear' | 'searchValue' | 'loading' | 'options'> & {
    label?: string;
    size?: 'small' | 'middle' | 'large';
    required?: boolean;
  };

export const SelectField = <T extends FieldValues>({
  name,
  control,
  label,
  options,
  size = 'large',
  required,
  ...selectProps
}: SelectFieldProps<T>) => {
  const {
    field,
    fieldState: { error },
  } = useController<T>({ name, control });

  return (
    <div style={{ marginBottom: 16 }}>
      {!!label && (
        <Typography.Text style={{ display: 'block', marginBottom: 6 }}>
          {label}
          {!!required && <Typography.Text type="danger"> *</Typography.Text>}
        </Typography.Text>
      )}
      <Select
        {...selectProps}
        {...field}
        size={size}
        options={options}
        status={error ? 'error' : undefined}
        style={{ width: '100%' }}
      />
      {!!error && (
        <Typography.Text type="danger" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
          {error.message}
        </Typography.Text>
      )}
    </div>
  );
};
