import React from 'react';

import { cn } from '../../utils/cn';
import ControlShell from './ControlShell';
import { DEFAULT_FORM_CONTROL_SIZE, mergeFieldDescribedBy, type FormControlSize } from './formControlContract';

type SelectFieldSize = FormControlSize;

type SelectFieldOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
};

type SelectFieldNativeProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'children' | 'className' | 'onChange' | 'size' | 'value'
> & Record<`data-${string}`, string | number | boolean | undefined>;

type SelectFieldProps<T extends string = string> = SelectFieldNativeProps & {
  value?: T | number | readonly string[];
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  onValueChange?: (value: T, event: React.ChangeEvent<HTMLSelectElement>) => void;
  options?: readonly SelectFieldOption<T>[];
  children?: React.ReactNode;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  icon?: React.ReactNode | false;
  iconClassName?: string;
  ariaLabel?: string;
  size?: SelectFieldSize;
  className?: string;
  wrapperClassName?: string;
  controlWrapClassName?: string;
  /** Render only the select control when an existing field shell owns the label/layout. */
  controlOnly?: boolean;
  /** Preserve an existing feature-owned class contract while this component owns the native renderer. */
  unstyled?: boolean;
  /** Disable the extra canonical chevron when the existing class contract already draws one. */
  showChevron?: boolean;
};

const SelectField = <T extends string = string,>({
  value,
  onChange,
  onValueChange,
  options = [],
  children,
  label,
  hint,
  error,
  icon,
  iconClassName = 'fa-solid fa-arrow-down-wide-short',
  ariaLabel = 'انتخاب',
  size = DEFAULT_FORM_CONTROL_SIZE,
  className,
  wrapperClassName,
  controlWrapClassName,
  controlOnly = false,
  unstyled = false,
  showChevron = true,
  id,
  required = false,
  dir = 'rtl',
  multiple,
  'aria-label': nativeAriaLabel,
  'aria-invalid': nativeAriaInvalid,
  'aria-describedby': nativeAriaDescribedBy,
  ...selectProps
}: SelectFieldProps<T>) => {
  const generatedId = React.useId().replace(/:/g, '');
  const fieldId = id || `select-field-${generatedId}`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = mergeFieldDescribedBy(
    nativeAriaDescribedBy,
    error ? errorId : hint ? hintId : undefined,
  );
  const leadingIcon = icon === false
    ? undefined
    : icon ?? <i className={iconClassName} aria-hidden="true" />;
  const hasChevron = !multiple && showChevron;

  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    onValueChange?.(event.target.value as T, event);
    onChange?.(event);
  };

  const control = (
    <>
      <select
        {...selectProps}
        id={fieldId}
        required={required}
        value={value}
        onChange={handleChange}
        multiple={multiple}
        className={cn(
          !unstyled ? 'app-field__control app-select-field__select ux-select app-select app-form-field__control w-full min-w-0 appearance-none truncate rounded-[var(--ds-control-radius)] border border-[var(--ds-control-border)] bg-[var(--ds-control-bg)] ps-[var(--ds-control-padding-x)] pe-10 font-semibold text-[var(--ds-control-fg)] shadow-[var(--ds-control-shadow)] outline-none transition focus:border-[var(--ds-focus-border)] focus:ring-2 focus:ring-[var(--ds-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60' : '',
          !unstyled && leadingIcon ? 'app-select-field__select--with-leading-icon ux-input-affix-target--right app-form-field__control--with-leading-icon !ps-10' : '',
          !unstyled && error ? 'ux-control-error app-form-field__control--error' : '',
          className,
        )}
        dir={dir}
        aria-label={nativeAriaLabel || ariaLabel}
        aria-required={required || undefined}
        aria-invalid={Boolean(error) || nativeAriaInvalid || undefined}
        aria-describedby={describedBy}
        data-ui-control="true"
        data-ui-control-kind="select"
        data-ui-control-size={size}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>

      {hasChevron ? (
        <span className="app-select-field__chevron pointer-events-none absolute inset-y-0 end-2.5 z-10 flex w-5 items-center justify-center text-[var(--ds-control-muted)]" aria-hidden="true">
          <i className="fa-solid fa-chevron-down" />
        </span>
      ) : null}
    </>
  );

  if (controlOnly) {
    return (
      <span
        className={cn(
          'app-select-field app-select-field--control-only relative block min-w-0 w-full bg-transparent',
          `app-select-field--${size}`,
        )}
        dir={dir}
        data-ui-select-control-only="true"
        data-ui-control-size={size}
      >
        {control}
      </span>
    );
  }

  return (
    <ControlShell
      className={cn(
        'app-field app-field--select app-select-field relative block min-w-0 bg-transparent',
        `app-select-field--${size}`,
        leadingIcon ? 'app-select-field--with-leading-icon' : '',
        wrapperClassName,
      )}
      controlWrapClassName={controlWrapClassName}
      label={label}
      kind="select"
      dir="rtl"
      htmlFor={fieldId}
      required={required}
      data-ui-control-size={size}
      hasLeadingIcon={Boolean(leadingIcon)}
      hasTrailingIcon={hasChevron}
      hint={hint}
      error={error}
      errorId={errorId}
      hintId={hintId}
      icon={leadingIcon}
    >
      {control}
    </ControlShell>
  );
};

export default SelectField;
export type {
  SelectFieldNativeProps,
  SelectFieldOption,
  SelectFieldProps,
  SelectFieldSize,
};
