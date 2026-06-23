import React from 'react';
import { cn } from '../../utils/cn';
import ControlShell from './ControlShell';

type AppSearchFieldSize = 'sm' | 'md' | 'lg';

type AppSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  inputClassName?: string;
  size?: AppSearchFieldSize;
  clearable?: boolean;
  autoFocus?: boolean;
  id?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
};

const AppSearchField: React.FC<AppSearchFieldProps> = ({
  value,
  onChange,
  placeholder = 'جستجو…',
  ariaLabel = 'جستجو',
  className = '',
  inputClassName = '',
  size = 'md',
  clearable = false,
  autoFocus = false,
  id,
  hint,
  error,
}) => {
  const hasValue = value.trim().length > 0;

  return (
    <ControlShell
      className={['app-field app-form-field app-form-field--search app-search-field', `app-search-field--${size}`, className].filter(Boolean).join(' ')}
      kind="search"
      dir="ltr"
      hasLeadingIcon
      label={undefined}
      hint={hint}
      error={error}
      icon={<i className="fa-solid fa-magnifying-glass" />}
    >
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type="search"
        dir="rtl"
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        aria-label={ariaLabel}
        aria-invalid={Boolean(error) || undefined}
        data-ui-control="true"
        data-ui-control-kind="search"
        className={cn('app-field__control app-form-field__control app-form-field__control--with-leading-icon app-search-field__input', inputClassName)}
      />

      {clearable && hasValue ? (
        <button
          type="button"
          data-skip-global-button="true"
          className="app-field__clear app-search-field__clear"
          aria-label="پاک کردن جستجو"
          onClick={() => onChange('')}
        >
          <i className="fa-solid fa-xmark" />
        </button>
      ) : null}
    </ControlShell>
  );
};

export default AppSearchField;
