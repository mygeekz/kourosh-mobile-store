import React from 'react';

import { cn } from '../../utils/cn';
import { mergeFieldDescribedBy } from './formControlContract';

type RangeFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: React.ReactNode;
  valueLabel?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  wrapperClassName?: string;
  controlOnly?: boolean;
};

const RangeField = React.forwardRef<HTMLInputElement, RangeFieldProps>(function RangeField(
  {
    label,
    valueLabel,
    hint,
    error,
    wrapperClassName,
    className,
    controlOnly = false,
    id,
    required = false,
    'aria-describedby': nativeAriaDescribedBy,
    'aria-invalid': nativeAriaInvalid,
    ...props
  },
  ref,
) {
  const generatedId = React.useId().replace(/:/g, '');
  const fieldId = id || `range-field-${generatedId}`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = mergeFieldDescribedBy(
    nativeAriaDescribedBy,
    error ? errorId : hint ? hintId : undefined,
  );

  const control = (
    <input
      ref={ref}
      id={fieldId}
      type="range"
      required={required}
      {...props}
      data-ui-control="true"
      data-ui-control-kind="range"
      aria-required={required || undefined}
      aria-invalid={Boolean(error) || nativeAriaInvalid || undefined}
      aria-describedby={describedBy}
      className={cn('app-range-field__control', className)}
    />
  );

  if (controlOnly || (!label && valueLabel == null && !hint && !error)) return control;

  return (
    <div
      className={cn('app-range-field block min-w-0', wrapperClassName)}
      data-ui-field="true"
      data-ui-field-kind="range"
      data-field-state={error ? 'error' : hint ? 'hint' : 'default'}
    >
      <label htmlFor={fieldId} className="app-range-field__header mb-2 flex items-center justify-between gap-3">
        {label ? <span>{label}</span> : <span />}
        {valueLabel != null ? <strong>{valueLabel}</strong> : null}
      </label>
      {control}
      {error ? (
        <span id={errorId} className="ux-field-error mt-1 inline-flex items-start gap-1.5" role="alert" aria-live="polite">
          <i className="fa-solid fa-circle-exclamation shrink-0" aria-hidden="true" />
          <span className="min-w-0">{error}</span>
        </span>
      ) : hint ? <span id={hintId} className="ux-field-hint mt-1 block">{hint}</span> : null}
    </div>
  );
});

RangeField.displayName = 'RangeField';

export default RangeField;
export type { RangeFieldProps };
