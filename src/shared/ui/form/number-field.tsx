import { InputNumber, Typography } from 'antd';
import type { FieldValues } from 'react-hook-form';
import { useController } from 'react-hook-form';

import type { FieldProps } from './types';

export type NumberFieldProps<T extends FieldValues> = FieldProps<T> & {
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  size?: 'small' | 'middle' | 'large';
  required?: boolean;
};

export const NumberField = <T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  min,
  max,
  step,
  size = 'large',
  required,
}: NumberFieldProps<T>) => {
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
      <InputNumber
        {...field}
        size={size}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
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
