import React from 'react';
import { cn } from '../../utils/cn';

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  wrapperClassName?: string;
}

export default function SelectField({ label, hint, error, className, wrapperClassName, children, ...props }: SelectFieldProps) {
  return (
    <label className={cn('ux-field-shell', wrapperClassName)}>
      {label ? <span className="ux-field-label">{label}</span> : null}
      <select className={cn('ux-select h-11 w-full', error ? 'ux-control-error' : '', className)} {...props}>
        {children}
      </select>
      {error ? <span className="ux-field-error">{error}</span> : hint ? <span className="ux-field-hint">{hint}</span> : null}
    </label>
  );
}
