import React from 'react';
import { cn } from '../../utils/cn';
import ControlShell from './ControlShell';
import { DEFAULT_FORM_CONTROL_SIZE, mergeFieldDescribedBy, type FormControlSize } from './formControlContract';

type TextareaFieldControlSize = FormControlSize;

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  icon?: React.ReactNode;
  controlSize?: TextareaFieldControlSize;
  wrapperClassName?: string;
  controlWrapClassName?: string;
  labelClassName?: string;
  iconClassName?: string;
  /** Render only the canonical textarea control when an existing field shell owns the label/layout. */
  controlOnly?: boolean;
  /** Legacy placeholder alias retained for safe migration of older forms. */
  preview?: string;
}

const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField(
  {
    label,
    hint,
    error,
    icon,
    controlSize = DEFAULT_FORM_CONTROL_SIZE,
    className,
    wrapperClassName,
    controlWrapClassName,
    labelClassName,
    iconClassName,
    controlOnly = false,
    preview,
    placeholder,
    id,
    required = false,
    dir = 'rtl',
    rows = 3,
    'aria-invalid': nativeAriaInvalid,
    'aria-describedby': nativeAriaDescribedBy,
    ...props
  },
  ref,
) {
  const generatedId = React.useId().replace(/:/g, '');
  const fieldId = id || `textarea-field-${generatedId}`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = mergeFieldDescribedBy(
    nativeAriaDescribedBy,
    error ? errorId : hint ? hintId : undefined,
  );

  const control = (
    <textarea
      ref={ref}
      id={fieldId}
      required={required}
      dir={dir}
      rows={rows}
      {...props}
      data-ui-control="true"
      data-ui-control-kind="textarea"
      data-ui-control-size={controlSize}
      aria-required={required || undefined}
      aria-invalid={Boolean(error) || nativeAriaInvalid || undefined}
      aria-describedby={describedBy}
      className={cn(
        'ux-textarea app-textarea app-form-field__control w-full min-w-0 resize-y rounded-[var(--ds-control-radius)] border border-[var(--ds-control-border)] bg-[var(--ds-control-bg)] px-[var(--ds-control-padding-x)] [font-size:var(--ds-control-font-size)] font-semibold leading-relaxed text-[var(--ds-control-fg)] shadow-[var(--ds-control-shadow)] outline-none transition placeholder:text-[var(--ds-control-muted)] focus:border-[var(--ds-focus-border)] focus:ring-2 focus:ring-[var(--ds-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60',
        icon ? 'ux-input-affix-target--right app-form-field__control--with-leading-icon' : '',
        error ? 'ux-control-error app-form-field__control--error' : '',
        className,
      )}
      placeholder={placeholder ?? preview}
    />
  );

  if (controlOnly) return control;

  return (
    <ControlShell
      label={label}
      hint={hint}
      error={error}
      errorId={errorId}
      hintId={hintId}
      icon={icon}
      kind="textarea"
      dir="rtl"
      required={required}
      htmlFor={fieldId}
      className={cn(icon ? 'app-form-field--with-leading-icon' : '', wrapperClassName)}
      controlWrapClassName={controlWrapClassName}
      labelClassName={labelClassName}
      iconClassName={iconClassName}
      hasLeadingIcon={Boolean(icon)}
      data-ui-control-size={controlSize}
    >
      {control}
    </ControlShell>
  );
});

TextareaField.displayName = 'TextareaField';

export default TextareaField;
export type { TextareaFieldControlSize, TextareaFieldProps };
