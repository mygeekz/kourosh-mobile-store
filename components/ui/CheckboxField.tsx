import React from 'react';

import { cn } from '../../utils/cn';
import { mergeFieldDescribedBy } from './formControlContract';

type CheckboxFieldSize = 'sm' | 'md';

type CheckboxFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  label?: React.ReactNode;
  description?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  wrapperClassName?: string;
  labelClassName?: string;
  size?: CheckboxFieldSize;
  controlOnly?: boolean;
};

const CheckboxField = React.forwardRef<HTMLInputElement, CheckboxFieldProps>(function CheckboxField(
  {
    label,
    description,
    hint,
    error,
    wrapperClassName,
    labelClassName,
    className,
    size = 'sm',
    controlOnly = false,
    id,
    required = false,
    disabled = false,
    'aria-describedby': nativeAriaDescribedBy,
    'aria-invalid': nativeAriaInvalid,
    ...props
  },
  ref,
) {
  const generatedId = React.useId().replace(/:/g, '');
  const fieldId = id || `checkbox-field-${generatedId}`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = mergeFieldDescribedBy(
    nativeAriaDescribedBy,
    error ? errorId : hint ? hintId : description ? `${fieldId}-description` : undefined,
  );

  const control = (
    <input
      ref={ref}
      id={fieldId}
      type="checkbox"
      required={required}
      disabled={disabled}
      {...props}
      data-ui-control="true"
      data-ui-control-kind="checkbox"
      data-ui-control-size={size}
      aria-required={required || undefined}
      aria-invalid={Boolean(error) || nativeAriaInvalid || undefined}
      aria-describedby={describedBy}
      className={cn('app-checkbox-field__control', className)}
    />
  );

  if (controlOnly || (!label && !description && !hint && !error)) return control;

  return (
    <div
      className={cn('app-checkbox-field min-w-0', error ? 'app-checkbox-field--error' : '', wrapperClassName)}
      data-ui-field="true"
      data-ui-field-kind="checkbox"
      data-ui-control-size={size}
      data-field-state={error ? 'error' : hint || description ? 'hint' : 'default'}
    >
      <label htmlFor={fieldId} className={cn('app-checkbox-field__label inline-flex min-w-0 items-start gap-2', labelClassName)}>
        {control}
        <span className="min-w-0">
          {label ? (
            <span className="app-checkbox-field__title block">
              {label}
              {required ? <span className="ms-1 text-[var(--ds-danger)]" aria-hidden="true">*</span> : null}
            </span>
          ) : null}
          {description ? <span id={`${fieldId}-description`} className="app-checkbox-field__description block">{description}</span> : null}
        </span>
      </label>
      {error ? (
        <span id={errorId} className="ux-field-error mt-1 inline-flex items-start gap-1.5" role="alert" aria-live="polite">
          <i className="fa-solid fa-circle-exclamation shrink-0" aria-hidden="true" />
          <span className="min-w-0">{error}</span>
        </span>
      ) : hint ? (
        <span id={hintId} className="ux-field-hint mt-1 block">{hint}</span>
      ) : null}
    </div>
  );
});

CheckboxField.displayName = 'CheckboxField';

export default CheckboxField;
export type { CheckboxFieldProps, CheckboxFieldSize };
