import React from 'react';
import { cn } from '../../utils/cn';
import ControlShell from './ControlShell';

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  icon?: React.ReactNode;
  wrapperClassName?: string;
  controlWrapClassName?: string;
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
    className,
    wrapperClassName,
    controlWrapClassName,
    controlOnly = false,
    preview,
    placeholder,
    'aria-invalid': nativeAriaInvalid,
    ...props
  },
  ref,
) {
  const control = (
    <textarea
      ref={ref}
      data-ui-control="true"
      data-ui-control-kind="textarea"
      aria-invalid={Boolean(error) || nativeAriaInvalid || undefined}
      className={cn(
        'ux-textarea app-textarea app-form-field__control w-full',
        icon ? 'ux-input-affix-target--right app-form-field__control--with-leading-icon' : '',
        error ? 'ux-control-error app-form-field__control--error' : '',
        className,
      )}
      placeholder={placeholder ?? preview}
      {...props}
    />
  );

  if (controlOnly) return control;

  return (
    <ControlShell
      label={label}
      hint={hint}
      error={error}
      icon={icon}
      kind="textarea"
      className={cn(icon ? 'app-form-field--with-leading-icon' : '', wrapperClassName)}
      controlWrapClassName={controlWrapClassName}
      hasLeadingIcon={Boolean(icon)}
      data-ui-control-kind="textarea"
    >
      {control}
    </ControlShell>
  );
});

TextareaField.displayName = 'TextareaField';

export default TextareaField;
export type { TextareaFieldProps };
