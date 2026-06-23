import React from 'react';
import { cn } from '../../utils/cn';
import ControlShell from './ControlShell';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  icon?: React.ReactNode;
  wrapperClassName?: string;
  /** Legacy alias used across older forms; mapped to placeholder and not forwarded to DOM. */
  preview?: string;
}

export default function TextField({ label, hint, error, icon, className, wrapperClassName, preview, placeholder, ...props }: TextFieldProps) {
  return (
    <ControlShell
      label={label}
      hint={hint}
      error={error}
      icon={icon}
      kind="text"
      className={cn(icon ? 'app-form-field--with-leading-icon' : '', error ? 'app-form-field--error' : '', wrapperClassName)}
      hasLeadingIcon={Boolean(icon)}
    >
      <input
        data-ui-control="true"
        aria-invalid={Boolean(error) || undefined}
        className={cn(
          'ux-input app-form-field__control h-14 w-full min-w-0 text-[15px] md:text-base',
          icon ? 'ux-input-affix-target--right ux-input-affix-target--wide app-form-field__control--with-leading-icon' : '',
          error ? 'ux-control-error app-form-field__control--error' : '',
          className,
        )}
        placeholder={placeholder ?? preview}
        {...props}
      />
    </ControlShell>
  );
}
