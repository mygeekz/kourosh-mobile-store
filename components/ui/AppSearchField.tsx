import React from 'react';
import { cn } from '../../utils/cn';
import ControlShell from './ControlShell';
import { DEFAULT_FORM_CONTROL_SIZE, mergeFieldDescribedBy, type FormControlSize } from './formControlContract';

type AppSearchFieldSize = FormControlSize;

type AppSearchFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'size'> & {
  value: string;
  onChange: (value: string, event?: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  inputClassName?: string;
  wrapperClassName?: string;
  size?: AppSearchFieldSize;
  clearable?: boolean;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
};

const AppSearchField = React.forwardRef<HTMLInputElement, AppSearchFieldProps>(function AppSearchField({
  value,
  onChange,
  placeholder = 'جستجو…',
  ariaLabel = 'جستجو',
  className = '',
  inputClassName = '',
  wrapperClassName = '',
  size = DEFAULT_FORM_CONTROL_SIZE,
  clearable = false,
  autoFocus = false,
  id,
  label,
  hint,
  error,
  required = false,
  disabled = false,
  dir = 'rtl',
  autoComplete = 'off',
  spellCheck = false,
  'aria-describedby': nativeAriaDescribedBy,
  'aria-invalid': nativeAriaInvalid,
  ...inputProps
}, ref) {
  const hasValue = value.trim().length > 0;
  const generatedId = React.useId().replace(/:/g, '');
  const fieldId = id || `app-search-field-${generatedId}`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = mergeFieldDescribedBy(
    nativeAriaDescribedBy,
    error ? errorId : hint ? hintId : undefined,
  );

  return (
    <ControlShell
      className={cn('app-field app-form-field app-form-field--search app-search-field', `app-search-field--${size}`, className, wrapperClassName)}
      kind="search"
      dir="ltr"
      hasLeadingIcon
      label={label}
      required={required}
      htmlFor={fieldId}
      hint={hint}
      error={error}
      errorId={errorId}
      hintId={hintId}
      icon={<i className="fa-solid fa-magnifying-glass" />}
      iconClassName="app-search-field__icon !start-auto !end-auto !left-3 !right-auto !text-[var(--ds-control-muted)]"
      data-ui-control-size={size}
    >
      <input
        {...inputProps}
        ref={ref}
        id={fieldId}
        value={value}
        onChange={(event) => onChange(event.target.value, event)}
        type="search"
        dir={dir}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        spellCheck={spellCheck}
        required={required}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        aria-invalid={Boolean(error) || nativeAriaInvalid || undefined}
        aria-describedby={describedBy}
        data-ui-control="true"
        data-ui-control-kind="search"
        data-ui-control-size={size}
        className={cn('app-field__control app-form-field__control app-form-field__control--with-leading-icon app-search-field__input w-full min-w-0 rounded-[var(--ds-control-radius)] border border-[var(--ds-control-border)] bg-[var(--ds-control-bg)] font-semibold text-[var(--ds-control-fg)] shadow-[var(--ds-control-shadow)] outline-none transition placeholder:text-[var(--ds-control-muted)] focus:border-[var(--ds-focus-border)] focus:ring-2 focus:ring-[var(--ds-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60', inputClassName)}
      />

      {clearable && hasValue && !disabled ? (
        <button
          type="button"
          data-skip-global-button="true"
          className="app-field__clear app-search-field__clear absolute inset-y-0 end-2 my-auto inline-flex items-center justify-center rounded-full text-[var(--ds-control-muted)] transition hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-control-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
          aria-label="پاک کردن جستجو"
          onClick={() => onChange('')}
        >
          <i className="fa-solid fa-xmark" />
        </button>
      ) : null}
    </ControlShell>
  );
});

AppSearchField.displayName = 'AppSearchField';

export default AppSearchField;
export type { AppSearchFieldProps, AppSearchFieldSize };
