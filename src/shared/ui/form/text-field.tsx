import { Input, Typography } from 'antd';
import type { ReactNode } from 'react';
import type { FieldValues } from 'react-hook-form';
import { useController } from 'react-hook-form';

import type { FieldProps } from './types';

export type TextFieldProps<T extends FieldValues> = FieldProps<T> & {
  label?: string;
  placeholder?: string;
  type?: 'text' | 'password';
  prefix?: ReactNode;
  autoComplete?: string;
  size?: 'small' | 'middle' | 'large';
  required?: boolean;
};

export const TextField = <T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  type = 'text',
  prefix,
  autoComplete,
  size = 'large',
  required,
}: TextFieldProps<T>) => {
  const {
    field,
    fieldState: { error },
  } = useController<T>({ name, control });

  const InputComponent = type === 'password' ? Input.Password : Input;

  return (
    <div style={{ marginBottom: 16 }}>
      {!!label && (
        <Typography.Text style={{ display: 'block', marginBottom: 6 }}>
          {label}
          {!!required && <Typography.Text type="danger"> *</Typography.Text>}
        </Typography.Text>
      )}
      <InputComponent
        {...field}
        size={size}
        placeholder={placeholder}
        prefix={prefix}
        autoComplete={autoComplete}
        status={error ? 'error' : undefined}
      />
      {!!error && (
        <Typography.Text type="danger" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
          {error.message}
        </Typography.Text>
      )}
    </div>
  );
};
