import React from 'react';

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
}) => {
  const hasValue = value.trim().length > 0;

  return (
    <label
      className={['app-field app-form-field app-form-field--search app-form-field--with-leading-icon app-field--search app-search-field', `app-search-field--${size}`, className].filter(Boolean).join(' ')}
      dir="ltr"
      aria-label={ariaLabel}
      data-ui-field="true"
      data-ui-field-kind="search"
      data-has-leading-icon="true"
    >
      <span className="app-field__leading-icon app-form-field__leading-icon app-search-field__icon" aria-hidden="true">
        <i className="fa-solid fa-magnifying-glass" />
      </span>

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
        data-ui-control="true"
        data-ui-control-kind="search"
        className={['app-field__control app-form-field__control app-form-field__control--with-leading-icon app-search-field__input', inputClassName].filter(Boolean).join(' ')}
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
    </label>
  );
};

export default AppSearchField;
