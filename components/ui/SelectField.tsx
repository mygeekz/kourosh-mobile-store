import React from 'react';
import { cn } from '../../utils/cn';
import ControlShell from './ControlShell';

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  wrapperClassName?: string;
}

export default function SelectField({ label, hint, error, className, wrapperClassName, children, ...props }: SelectFieldProps) {
  return (
    <ControlShell
      label={label}
      hint={hint}
      error={error}
      kind="select"
      className={wrapperClassName}
      data-ui-control-kind="select"
    >
      <select
        aria-invalid={Boolean(error) || undefined}
        className={cn('ux-select h-11 w-full', error ? 'ux-control-error' : '', className)}
        {...props}
      >
        {children}
      </select>
    </ControlShell>
  );
}
