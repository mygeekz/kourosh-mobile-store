import React from 'react';

import { cn } from '../../utils/cn';
import ControlShell from './ControlShell';
import { glassControlClasses, type SurfaceMaterial } from './Surface';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  icon?: React.ReactNode;
  trailingAction?: React.ReactNode;
  surface?: SurfaceMaterial;
  wrapperClassName?: string;
  controlWrapClassName?: string;
  labelClassName?: string;
  iconClassName?: string;
  trailingActionClassName?: string;
  /** Render only the canonical input control when an existing field shell owns the label/layout. */
  controlOnly?: boolean;
  /** Preserve an existing feature-owned class contract while this component owns the native renderer. */
  unstyled?: boolean;
  /** Legacy alias used across older forms; mapped to placeholder and not forwarded to DOM. */
  preview?: string;
}

const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    hint,
    error,
    icon,
    trailingAction,
    surface = 'default',
    className,
    wrapperClassName,
    controlWrapClassName,
    labelClassName,
    iconClassName,
    trailingActionClassName,
    controlOnly = false,
    unstyled = false,
    preview,
    placeholder,
    'aria-invalid': nativeAriaInvalid,
    ...props
  },
  ref,
) {
  const isGlass = surface === 'glass';

  const control = (
    <input
      ref={ref}
      data-ui-control="true"
      data-ui-control-kind="text"
      aria-invalid={Boolean(error) || nativeAriaInvalid || undefined}
      className={cn(
        !unstyled ? 'ux-input app-input app-form-field__control w-full min-w-0 text-[15px] md:text-base' : '',
        !unstyled && icon ? 'ux-input-affix-target--right ux-input-affix-target--wide app-form-field__control--with-leading-icon' : '',
        !unstyled && error ? 'ux-control-error app-form-field__control--error' : '',
        !unstyled && isGlass ? glassControlClasses.input : '',
        className,
      )}
      placeholder={placeholder ?? preview}
      {...props}
    />
  );

  if (controlOnly) return control;

  return (
    <ControlShell
      label={label}
      hint={hint}
      error={error}
      icon={icon}
      kind="text"
      data-ui-material={surface}
      className={cn(
        icon ? 'app-form-field--with-leading-icon' : '',
        error ? 'app-form-field--error' : '',
        isGlass ? glassControlClasses.shell : '',
        wrapperClassName,
      )}
      controlWrapClassName={cn(isGlass ? glassControlClasses.controlWrap : '', controlWrapClassName)}
      labelClassName={cn(isGlass ? glassControlClasses.label : undefined, labelClassName)}
      iconClassName={cn(isGlass ? glassControlClasses.icon : undefined, iconClassName)}
      hasLeadingIcon={Boolean(icon)}
      hasTrailingIcon={Boolean(trailingAction)}
    >
      {control}
      {trailingAction ? <span className={cn('app-form-field__trailing-action', trailingActionClassName)}>{trailingAction}</span> : null}
    </ControlShell>
  );
});

TextField.displayName = 'TextField';

export default TextField;
export type { TextFieldProps };
