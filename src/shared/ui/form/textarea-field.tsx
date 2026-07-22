import { Input, Typography } from 'antd';
import type { FieldValues } from 'react-hook-form';
import { useController } from 'react-hook-form';

import type { FieldProps } from './types';

export type TextAreaFieldProps<T extends FieldValues> = FieldProps<T> & {
  label?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
};

export const TextAreaField = <T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  rows = 3,
  required,
}: TextAreaFieldProps<T>) => {
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
      <Input.TextArea {...field} rows={rows} placeholder={placeholder} status={error ? 'error' : undefined} />
      {!!error && (
        <Typography.Text type="danger" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
          {error.message}
        </Typography.Text>
      )}
    </div>
  );
};
