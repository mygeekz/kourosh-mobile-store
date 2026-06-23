import React from 'react';
import { cn } from '../../utils/cn';
import ControlShell from './ControlShell';

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  wrapperClassName?: string;
}

export default function TextareaField({ label, hint, error, className, wrapperClassName, ...props }: TextareaFieldProps) {
  return (
    <ControlShell
      label={label}
      hint={hint}
      error={error}
      kind="textarea"
      className={wrapperClassName}
      data-ui-control-kind="textarea"
    >
      <textarea
        aria-invalid={Boolean(error) || undefined}
        className={cn('ux-textarea w-full', error ? 'ux-control-error' : '', className)}
        {...props}
      />
    </ControlShell>
  );
}
