import React from 'react';
import { cn } from '../../utils/cn';
import ControlShell from './ControlShell';

type AppSelectFieldSize = 'sm' | 'md' | 'lg';

type Option<T extends string> = {
  value: T;
  label: string;
};

type AppSelectFieldProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Array<Option<T>>;
  ariaLabel?: string;
  className?: string;
  size?: AppSelectFieldSize;
  iconClassName?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
};

const AppSelectField = <T extends string>({
  value,
  onChange,
  options,
  ariaLabel = 'انتخاب',
  className = '',
  size = 'md',
  iconClassName = 'fa-solid fa-arrow-down-wide-short',
  hint,
  error,
}: AppSelectFieldProps<T>) => {
  return (
    <ControlShell
      className={['app-field app-field--select app-select-field', `app-select-field--${size}`, className].filter(Boolean).join(' ')}
      kind="select"
      dir="ltr"
      hasLeadingIcon
      hasTrailingIcon
      hint={hint}
      error={error}
      icon={<i className={iconClassName} />}
    >
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className={cn('app-field__control app-select-field__select', error ? 'ux-control-error' : '')}
        dir="rtl"
        aria-label={ariaLabel}
        aria-invalid={Boolean(error) || undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      <span className="app-select-field__chevron" aria-hidden="true">
        <i className="fa-solid fa-chevron-down" />
      </span>
    </ControlShell>
  );
};

export default AppSelectField;
