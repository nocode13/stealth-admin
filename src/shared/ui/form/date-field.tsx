import { DatePicker, Typography } from 'antd';
import dayjs from 'dayjs';
import type { FieldValues } from 'react-hook-form';
import { useController } from 'react-hook-form';

import type { FieldProps } from './types';

const DAY_FORMAT = 'YYYY-MM-DD';

export type DateFieldProps<T extends FieldValues> = FieldProps<T> & {
  label?: string;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  required?: boolean;
  allowClear?: boolean;
};

/**
 * Выбор дня без времени. Значение в форме — строка `YYYY-MM-DD` (как ждёт бэкенд) или
 * `null`; dayjs живёт только внутри пикера, наружу не утекает.
 */
export const DateField = <T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  size = 'large',
  required,
  allowClear = true,
}: DateFieldProps<T>) => {
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
      <DatePicker
        ref={field.ref}
        name={field.name}
        onBlur={field.onBlur}
        value={field.value ? dayjs(field.value as string, DAY_FORMAT) : null}
        onChange={(value) => field.onChange(value ? value.format(DAY_FORMAT) : null)}
        format="DD.MM.YYYY"
        size={size}
        placeholder={placeholder}
        allowClear={allowClear}
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
