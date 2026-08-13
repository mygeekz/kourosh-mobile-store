import React from 'react';

import { cn } from '../../utils/cn';
import ControlShell from './ControlShell';

type SelectFieldSize = 'sm' | 'md' | 'lg';

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
  size = 'md',
  className,
  wrapperClassName,
  controlWrapClassName,
  controlOnly = false,
  unstyled = false,
  showChevron = true,
  dir = 'rtl',
  multiple,
  'aria-label': nativeAriaLabel,
  'aria-invalid': nativeAriaInvalid,
  ...selectProps
}: SelectFieldProps<T>) => {
  const leadingIcon = icon === false
    ? undefined
    : icon ?? <i className={iconClassName} />;
  const hasChevron = !multiple && showChevron;

  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    onValueChange?.(event.target.value as T, event);
    onChange?.(event);
  };

  const control = (
    <>
      <select
        {...selectProps}
        value={value}
        onChange={handleChange}
        multiple={multiple}
        className={cn(
          !unstyled ? 'app-field__control app-select-field__select ux-select app-select app-form-field__control w-full' : '',
          !unstyled && leadingIcon ? 'app-select-field__select--with-leading-icon ux-input-affix-target--right app-form-field__control--with-leading-icon' : '',
          !unstyled && error ? 'ux-control-error app-form-field__control--error' : '',
          className,
        )}
        dir={dir}
        aria-label={nativeAriaLabel || ariaLabel}
        aria-invalid={Boolean(error) || nativeAriaInvalid || undefined}
        data-ui-control="true"
        data-ui-control-kind="select"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>

      {hasChevron ? (
        <span className="app-select-field__chevron" aria-hidden="true">
          <i className="fa-solid fa-chevron-down" />
        </span>
      ) : null}
    </>
  );

  if (controlOnly) {
    return (
      <span
        className={cn(
          'app-select-field app-select-field--control-only relative block min-w-0 w-full',
          `app-select-field--${size}`,
        )}
        dir={dir}
        data-ui-select-control-only="true"
      >
        {control}
      </span>
    );
  }

  return (
    <ControlShell
      className={cn(
        'app-field app-field--select app-select-field',
        `app-select-field--${size}`,
        leadingIcon ? 'app-select-field--with-leading-icon' : '',
        wrapperClassName,
      )}
      controlWrapClassName={controlWrapClassName}
      label={label}
      kind="select"
      dir={dir}
      hasLeadingIcon={Boolean(leadingIcon)}
      hasTrailingIcon={hasChevron}
      hint={hint}
      error={error}
      icon={leadingIcon}
      data-field-state={error ? 'error' : undefined}
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
