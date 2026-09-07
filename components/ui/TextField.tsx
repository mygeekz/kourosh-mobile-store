import React from 'react';

import { cn } from '../../utils/cn';
import ControlShell from './ControlShell';
import { DEFAULT_FORM_CONTROL_SIZE, mergeFieldDescribedBy, type FormControlSize } from './formControlContract';
import { resolveBidiDirection, type BidiContentKind } from './BidiText';
import { glassControlClasses, type SurfaceMaterial } from './Surface';

type TextFieldControlSize = FormControlSize;

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  icon?: React.ReactNode;
  trailingAction?: React.ReactNode;
  surface?: SurfaceMaterial;
  /** Canonical visual density. Compact is the app default. */
  controlSize?: TextFieldControlSize;
  wrapperClassName?: string;
  controlWrapClassName?: string;
  labelClassName?: string;
  iconClassName?: string;
  trailingActionClassName?: string;
  /** Render only the canonical input control when an existing field shell owns the label/layout. */
  controlOnly?: boolean;
  /** Preserve a feature-owned visual class contract while this component owns the native renderer. */
  unstyled?: boolean;
  /** Legacy alias used across older forms; mapped to placeholder and not forwarded to DOM. */
  preview?: string;
  /** Semantic direction for mixed RTL/LTR values. Explicit dir still wins. */
  valueKind?: BidiContentKind;
}

const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    hint,
    error,
    icon,
    trailingAction,
    surface = 'default',
    controlSize = DEFAULT_FORM_CONTROL_SIZE,
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
    id,
    required = false,
    dir,
    valueKind,
    type = 'text',
    inputMode,
    'aria-invalid': nativeAriaInvalid,
    'aria-describedby': nativeAriaDescribedBy,
    ...props
  },
  ref,
) {
  const isGlass = surface === 'glass';
  const generatedId = React.useId().replace(/:/g, '');
  const fieldId = id || `text-field-${generatedId}`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = mergeFieldDescribedBy(
    nativeAriaDescribedBy,
    error ? errorId : hint ? hintId : undefined,
  );
  const isNumeric = type === 'number' || inputMode === 'numeric' || inputMode === 'decimal' || valueKind === 'number' || valueKind === 'currency';
  const kind = isNumeric ? 'number' : 'text';
  const resolvedControlDir = dir || resolveBidiDirection(valueKind ?? (isNumeric ? 'number' : 'text'));

  const control = (
    <input
      ref={ref}
      id={fieldId}
      required={required}
      type={type}
      inputMode={inputMode}
      dir={resolvedControlDir}
      {...props}
      data-ui-control={unstyled ? undefined : 'true'}
      data-ui-control-kind={kind}
      data-ui-control-size={controlSize}
      data-numeric={isNumeric ? 'true' : undefined}
      data-bidi-kind={valueKind}
      aria-required={required || undefined}
      aria-invalid={Boolean(error) || nativeAriaInvalid || undefined}
      aria-describedby={describedBy}
      className={cn(
        !unstyled ? 'ux-input app-input app-form-field__control w-full min-w-0 rounded-[var(--ds-control-radius)] border border-[var(--ds-control-border)] bg-[var(--ds-control-bg)] px-[var(--ds-control-padding-x)] [font-size:var(--ds-control-font-size)] font-semibold text-[var(--ds-control-fg)] shadow-[var(--ds-control-shadow)] outline-none transition placeholder:text-[var(--ds-control-muted)] focus:border-[var(--ds-focus-border)] focus:ring-2 focus:ring-[var(--ds-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60' : '',
        !unstyled && icon ? 'ux-input-affix-target--right ux-input-affix-target--wide app-form-field__control--with-leading-icon' : '',
        !unstyled && error ? 'ux-control-error app-form-field__control--error' : '',
        !unstyled && isGlass ? glassControlClasses.input : '',
        className,
      )}
      placeholder={placeholder ?? preview}
    />
  );

  if (controlOnly) return control;

  return (
    <ControlShell
      label={label}
      hint={hint}
      error={error}
      errorId={errorId}
      hintId={hintId}
      icon={icon}
      kind={kind}
      dir="rtl"
      required={required}
      htmlFor={fieldId}
      data-ui-control-size={controlSize}
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
export type { TextFieldControlSize, TextFieldProps };
