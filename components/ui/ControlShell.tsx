import React from 'react';
import { cn } from '../../utils/cn';

type ControlShellKind = 'text' | 'number' | 'search' | 'select' | 'textarea' | 'checkbox' | 'range' | 'date' | 'custom' | 'modal';
type ControlShellElement = 'label' | 'div';

type DataAttributeValue = string | number | boolean | undefined;

type ControlShellDataAttributes = {
  [key: `data-${string}`]: DataAttributeValue;
};

type ControlShellProps = Omit<React.HTMLAttributes<HTMLElement>, 'children' | 'className' | 'dir'> & ControlShellDataAttributes & {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  controlWrapClassName?: string;
  labelClassName?: string;
  iconClassName?: string;
  feedbackClassName?: string;
  feedbackWrapClassName?: string;
  errorClassName?: string;
  hintClassName?: string;
  extras?: React.ReactNode;
  extrasClassName?: string;
  kind?: ControlShellKind;
  dir?: 'rtl' | 'ltr';
  hasLeadingIcon?: boolean;
  hasTrailingIcon?: boolean;
  as?: ControlShellElement;
  htmlFor?: string;
  required?: boolean;
  requiredClassName?: string;
  wrapLabelContent?: boolean;
  errorId?: string;
  hintId?: string;
  errorIcon?: React.ReactNode;
  hintIcon?: React.ReactNode;
};

export default function ControlShell({
  label,
  hint,
  error,
  icon,
  children,
  className,
  wrapperClassName,
  controlWrapClassName,
  labelClassName,
  iconClassName,
  feedbackClassName,
  feedbackWrapClassName,
  errorClassName,
  hintClassName,
  extras,
  extrasClassName,
  kind = 'custom',
  dir,
  hasLeadingIcon,
  hasTrailingIcon,
  as = 'label',
  htmlFor,
  required = false,
  requiredClassName,
  wrapLabelContent = false,
  errorId,
  hintId,
  errorIcon = <i className="fa-solid fa-circle-exclamation shrink-0" aria-hidden="true" />,
  hintIcon,
  ...shellProps
}: ControlShellProps) {
  const shellClassName = cn(
    'ux-field-shell app-form-field',
    hasLeadingIcon ? 'app-form-field--with-leading-icon' : '',
    hasTrailingIcon ? 'app-form-field--with-trailing-icon' : '',
    error ? 'app-form-field--error' : '',
    className,
    wrapperClassName,
  );

  const labelContent = label ? (
    wrapLabelContent ? (
      <>
        <span>{label}</span>
        {required ? <span className={cn('text-[var(--ds-danger)]', requiredClassName)} aria-hidden="true">*</span> : null}
      </>
    ) : (
      <>
        {label}
        {required ? <span className={cn('text-[var(--ds-danger)]', requiredClassName)} aria-hidden="true">*</span> : null}
      </>
    )
  ) : null;

  const feedback = error ? (
    <span
      id={errorId}
      className={cn('ux-field-error inline-flex min-w-0 items-start gap-1.5', feedbackClassName, errorClassName)}
      role="alert"
      aria-live="polite"
    >
      {errorIcon}
      <span className="min-w-0">{error}</span>
    </span>
  ) : hint ? (
    <span id={hintId} className={cn('ux-field-hint inline-flex min-w-0 items-start gap-1.5', feedbackClassName, hintClassName)}>
      {hintIcon}
      <span className="min-w-0">{hint}</span>
    </span>
  ) : null;

  const controlContent = (
    <>
      {icon ? (
        <span
          className={cn('ux-field-leading-icon app-form-field__leading-icon pointer-events-none absolute inset-y-0 start-2.5 z-10 flex w-6 items-center justify-center text-[var(--ds-control-muted)]', iconClassName)}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      {children}
    </>
  );

  const content = (
    <>
      {labelContent ? (
        as === 'div' ? (
          <label className={cn('ux-field-label', labelClassName)} htmlFor={htmlFor}>{labelContent}</label>
        ) : (
          <span className={cn('ux-field-label', labelClassName)}>{labelContent}</span>
        )
      ) : null}
      {as === 'div' ? (
        <div className={cn('ux-field-control-wrap app-form-field__control-wrap relative min-w-0', controlWrapClassName)}>{controlContent}</div>
      ) : (
        <span className={cn('ux-field-control-wrap app-form-field__control-wrap relative min-w-0', controlWrapClassName)}>{controlContent}</span>
      )}
      {extras ? (
        as === 'div'
          ? <div className={extrasClassName}>{extras}</div>
          : <span className={extrasClassName}>{extras}</span>
      ) : null}
      {feedback ? (
        feedbackWrapClassName
          ? as === 'div'
            ? <div className={feedbackWrapClassName}>{feedback}</div>
            : <span className={feedbackWrapClassName}>{feedback}</span>
          : feedback
      ) : null}
    </>
  );

  const sharedProps = {
    ...shellProps,
    className: shellClassName,
    'data-ui-field': 'true',
    'data-ui-field-kind': kind,
    'data-has-leading-icon': hasLeadingIcon ? 'true' : 'false',
    'data-has-trailing-icon': hasTrailingIcon ? 'true' : 'false',
    'data-field-state': error ? 'error' : hint ? 'hint' : 'default',
    'data-required': required ? 'true' : 'false',
    dir,
  } as const;

  if (as === 'div') {
    return <div {...sharedProps}>{content}</div>;
  }

  return <label {...sharedProps} htmlFor={htmlFor}>{content}</label>;
}

export type { ControlShellElement, ControlShellKind, ControlShellProps };
