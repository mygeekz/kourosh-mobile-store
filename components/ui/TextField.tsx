import React from 'react';
import { cn } from '../../utils/cn';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  icon?: React.ReactNode;
  wrapperClassName?: string;
}

export default function TextField({ label, hint, error, icon, className, wrapperClassName, ...props }: TextFieldProps) {
  return (
    <label className={cn('ux-field-shell app-form-field', icon ? 'app-form-field--with-leading-icon' : '', error ? 'app-form-field--error' : '', wrapperClassName)} data-ui-field="true" data-ui-field-kind="text" data-has-leading-icon={icon ? 'true' : 'false'}>
      {label ? <span className="ux-field-label">{label}</span> : null}
      <span className="ux-field-control-wrap app-form-field__control-wrap">
        {icon ? <span className="ux-field-leading-icon app-form-field__leading-icon" aria-hidden="true">{icon}</span> : null}
        <input data-ui-control="true" className={cn('ux-input app-form-field__control h-14 w-full min-w-0 text-[15px] md:text-base', icon ? 'ux-input-affix-target--right ux-input-affix-target--wide app-form-field__control--with-leading-icon' : '', error ? 'ux-control-error app-form-field__control--error' : '', className)} {...props} />
      </span>
      {error ? <span className="ux-field-error">{error}</span> : hint ? <span className="ux-field-hint">{hint}</span> : null}
    </label>
  );
}
