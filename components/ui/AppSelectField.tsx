import React from 'react';

import SelectField, {
  type SelectFieldNativeProps,
  type SelectFieldOption,
  type SelectFieldSize,
} from './SelectField';

type AppSelectFieldProps<T extends string> = {
  value?: T;
  onChange?: (value: T, event: React.ChangeEvent<HTMLSelectElement>) => void;
  options?: readonly SelectFieldOption<T>[];
  children?: React.ReactNode;
  label?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  selectClassName?: string;
  size?: SelectFieldSize;
  iconClassName?: string;
  icon?: React.ReactNode | false;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  selectProps?: SelectFieldNativeProps;
};

/**
 * Legacy compatibility adapter. New code must import SelectField from
 * @/components/ui. The native select renderer is owned only by SelectField.
 */
const AppSelectField = <T extends string,>({
  value,
  onChange,
  options,
  children,
  label,
  ariaLabel,
  className,
  selectClassName,
  size,
  iconClassName,
  icon,
  hint,
  error,
  selectProps,
}: AppSelectFieldProps<T>) => (
  <SelectField
    {...selectProps}
    value={value}
    onValueChange={onChange}
    options={options}
    label={label}
    ariaLabel={ariaLabel}
    wrapperClassName={className}
    className={selectClassName}
    size={size}
    iconClassName={iconClassName}
    icon={icon}
    hint={hint}
    error={error}
  >
    {children}
  </SelectField>
);

export default AppSelectField;
export type {
  AppSelectFieldProps,
  SelectFieldNativeProps as AppSelectNativeProps,
  SelectFieldOption as AppSelectOption,
  SelectFieldSize as AppSelectFieldSize,
};
