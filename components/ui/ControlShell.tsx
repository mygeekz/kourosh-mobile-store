import React from 'react';
import { cn } from '../../utils/cn';

type ControlShellKind = 'text' | 'search' | 'select' | 'textarea' | 'custom';

type DataAttributeValue = string | number | boolean | undefined;

type ControlShellDataAttributes = {
  [key: `data-${string}`]: DataAttributeValue;
};

type ControlShellProps = Omit<React.LabelHTMLAttributes<HTMLLabelElement>, 'children' | 'className' | 'dir'> & ControlShellDataAttributes & {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  controlWrapClassName?: string;
  labelClassName?: string;
  feedbackClassName?: string;
  kind?: ControlShellKind;
  dir?: 'rtl' | 'ltr';
  hasLeadingIcon?: boolean;
  hasTrailingIcon?: boolean;
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
  feedbackClassName,
  kind = 'custom',
  dir,
  hasLeadingIcon,
  hasTrailingIcon,
  ...shellProps
}: ControlShellProps) {
  return (
    <label
      {...shellProps}
      className={cn(
        'ux-field-shell app-form-field',
        hasLeadingIcon ? 'app-form-field--with-leading-icon' : '',
        error ? 'app-form-field--error' : '',
        className,
        wrapperClassName,
      )}
      data-ui-field='true'
      data-ui-field-kind={kind}
      data-has-leading-icon={hasLeadingIcon ? 'true' : 'false'}
      data-has-trailing-icon={hasTrailingIcon ? 'true' : 'false'}
      dir={dir}
    >
      {label ? <span className={cn('ux-field-label', labelClassName)}>{label}</span> : null}
      <span className={cn('ux-field-control-wrap app-form-field__control-wrap', controlWrapClassName)}>
        {icon ? <span className='ux-field-leading-icon app-form-field__leading-icon' aria-hidden='true'>{icon}</span> : null}
        {children}
      </span>
      {error ? <span className={cn('ux-field-error', feedbackClassName)}>{error}</span> : hint ? <span className={cn('ux-field-hint', feedbackClassName)}>{hint}</span> : null}
    </label>
  );
}
