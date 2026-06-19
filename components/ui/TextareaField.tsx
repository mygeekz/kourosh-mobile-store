import React from 'react';
import { cn } from '../../utils/cn';

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  wrapperClassName?: string;
}

export default function TextareaField({ label, hint, error, className, wrapperClassName, ...props }: TextareaFieldProps) {
  return (
    <label className={cn('ux-field-shell', wrapperClassName)}>
      {label ? <span className="ux-field-label">{label}</span> : null}
      <textarea className={cn('ux-textarea w-full', error ? 'ux-control-error' : '', className)} {...props} />
      {error ? <span className="ux-field-error">{error}</span> : hint ? <span className="ux-field-hint">{hint}</span> : null}
    </label>
  );
}
