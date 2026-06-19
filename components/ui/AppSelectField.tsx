import React from 'react';

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
};

const AppSelectField = <T extends string>({
  value,
  onChange,
  options,
  ariaLabel = 'انتخاب',
  className = '',
  size = 'md',
  iconClassName = 'fa-solid fa-arrow-down-wide-short',
}: AppSelectFieldProps<T>) => {
  return (
    <label
      className={['app-field app-field--select app-select-field', `app-select-field--${size}`, className].filter(Boolean).join(' ')}
      dir="ltr"
      aria-label={ariaLabel}
    >
      <span className="app-field__leading-icon app-select-field__icon" aria-hidden="true">
        <i className={iconClassName} />
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="app-field__control app-select-field__select"
        dir="rtl"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      <span className="app-select-field__chevron" aria-hidden="true">
        <i className="fa-solid fa-chevron-down" />
      </span>
    </label>
  );
};

export default AppSelectField;
