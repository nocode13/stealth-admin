import { attach, createEvent, createStore, sample } from 'effector';
import { useUnit } from 'effector-react';
import { useEffect } from 'react';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';

/**
 * Мост между react-hook-form и effector. Портирован из stealth-mobile.
 * Заносит RHF-инстанс и живой снапшот значений в effector-сторы, чтобы модель
 * фичи могла читать значения формы (`$formValues`) и управлять ею (`resetFx`,
 * `setErrorFx`).
 */
export const createForm = <FormShape extends FieldValues, TransformedValues extends FieldValues = FormShape>() => {
  type FormInstance = UseFormReturn<FormShape, unknown, TransformedValues>;

  const formInstanceChanged = createEvent<FormInstance>();
  const formValuesChanged = createEvent<FormShape>();
  const resetFormInstance = createEvent();

  const $formInstance = createStore<FormInstance | null>(null);
  const $formValues = createStore<FormShape>({} as FormShape);
  const $resetFailed = createStore<FormShape | null>(null);

  const clearErrorsFx = attach({
    source: $formInstance,
    effect: (form) => {
      if (!form) throw new Error('Form instance is not initialized');
      form.clearErrors();
    },
  });

  const resetFx = attach({
    source: $formInstance,
    effect: (form, formValues: FormShape) => {
      if (!form) throw new Error('Form instance is not initialized');
      form.reset(formValues);
    },
  });

  const setErrorFx = attach({
    source: $formInstance,
    effect: (form, { message, name }: { name: Path<FormShape>; message: string }) => {
      if (!form) throw new Error('Form instance is not initialized');
      form.setError(name, { message });
    },
  });

  $formInstance.on(formInstanceChanged, (_, form) => form).reset(resetFormInstance);
  $formValues.on(formValuesChanged, (_, values) => values);
  $resetFailed.on(resetFx.fail, (_, { params: formShape }) => formShape).reset(resetFx.done);

  sample({
    clock: formInstanceChanged,
    source: $resetFailed,
    filter: Boolean,
    target: resetFx,
  });

  const useBindFormWithModel = ({ form }: { form: FormInstance }) => {
    const [handleFormInstanceChange, handleResetFormInstance, handleFormValuesChange] = useUnit([
      formInstanceChanged,
      resetFormInstance,
      formValuesChanged,
    ]);

    useEffect(() => {
      handleFormInstanceChange(form);

      return () => {
        handleResetFormInstance();
      };
    }, [form, handleFormInstanceChange, handleResetFormInstance]);

    useEffect(() => {
      // form.watch() без аргументов возвращает один и тот же (мутируемый in-place)
      // объект, поэтому useEffect по ссылке не срабатывает. Подписка отдаёт свежий
      // снапшот на каждое изменение; getValues сеет начальное значение.
      handleFormValuesChange(form.getValues());
      const subscription = form.watch((values) => handleFormValuesChange(values as FormShape));

      return () => subscription.unsubscribe();
    }, [form, handleFormValuesChange]);
  };

  return {
    useBindFormWithModel,

    $formInstance,
    $formValues,

    clearErrorsFx,
    setErrorFx,
    resetFx,
  };
};
