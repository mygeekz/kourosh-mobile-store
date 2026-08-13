import React, { useId } from 'react';

import { cn } from '../../utils/cn';
import ControlShell from './ControlShell';
import SelectField, { type SelectFieldProps } from './SelectField';
import TextareaField from './TextareaField';
import TextField from './TextField';

type ModalFieldProps = {
  label: React.ReactNode;
  iconClass?: string;
  required?: boolean;
  error?: string | null;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

type ChildProps = Record<string, unknown> & {
  id?: string;
  name?: string;
  className?: string;
  placeholder?: string;
  preview?: string;
  title?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode | false;
  controlOnly?: boolean;
  error?: React.ReactNode;
  'aria-describedby'?: string;
  'data-ui-control'?: string;
  'data-ui-control-kind'?: string;
  'data-field-key'?: string;
  'data-error-key'?: string;
  'data-tooltip'?: string;
};

const mergeClasses = (...parts: Array<string | undefined | null | false>) => parts.filter(Boolean).join(' ');

const ModalField: React.FC<ModalFieldProps> = ({ label, iconClass, required, error, hint, children, className }) => {
  const fieldId = useId();
  const helpId = `${fieldId}-help`;
  const errorId = `${fieldId}-error`;
  const describedBy = error ? errorId : hint ? helpId : undefined;
  const childItems = React.Children.toArray(children);
  const primaryChild = childItems.find((child) => React.isValidElement(child));
  const extraChildren = childItems.filter((child) => child !== primaryChild);
  const isElement = React.isValidElement(primaryChild);
  const childProps = isElement ? ((primaryChild.props as ChildProps) || {}) : {};
  const childId = isElement ? (childProps.id || childProps.name || fieldId) : fieldId;
  const fieldKey = isElement ? (childProps.name || childProps.id || childId) : childId;
  const hasLeadingIcon = Boolean(iconClass);
  const iconClassName = hasLeadingIcon ? 'premium-has-leading-icon' : 'premium-no-leading-icon';
  const commonControlProps: ChildProps = {
    id: childId,
    className: mergeClasses(
      'app-form-field__control',
      error && 'modal-control-error app-form-field__control--error',
    ),
    'data-ui-control': childProps['data-ui-control'] || 'true',
    placeholder: childProps.placeholder || childProps.preview || undefined,
    'data-tooltip': childProps['data-tooltip'] || childProps.preview || (typeof label === 'string' ? label : undefined),
    title: childProps.title || undefined,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': mergeClasses(childProps['aria-describedby'] as string | undefined, describedBy),
    'data-field-state': error ? 'error' : hint ? 'hint' : undefined,
    'data-field-key': childProps['data-field-key'] || fieldKey,
    'data-error-key': error ? (childProps['data-error-key'] || fieldKey) : childProps['data-error-key'],
  };

  let renderedChild: React.ReactNode = isElement ? primaryChild : children;

  if (isElement) {
    const controlIcon = hasLeadingIcon ? <i className={iconClass} /> : undefined;

    if (primaryChild.type === TextField) {
      renderedChild = React.createElement(TextField, {
        ...(childProps as React.InputHTMLAttributes<HTMLInputElement>),
        ...commonControlProps,
        controlOnly: true,
        icon: controlIcon,
        error: error || undefined,
        className: mergeClasses('app-input modal-control-premium', iconClassName, commonControlProps.className),
      });
    } else if (primaryChild.type === SelectField) {
      const { size: _nativeSelectSize, ...selectChildProps } = childProps;
      renderedChild = React.createElement(SelectField, {
        ...(selectChildProps as SelectFieldProps),
        ...commonControlProps,
        controlOnly: true,
        icon: false,
        error: error || undefined,
        className: mergeClasses('app-select modal-control-premium premium-select-control', iconClassName, commonControlProps.className),
        children: childProps.children,
      });
    } else if (primaryChild.type === TextareaField) {
      renderedChild = React.createElement(TextareaField, {
        ...(childProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>),
        ...commonControlProps,
        controlOnly: true,
        icon: controlIcon,
        error: error || undefined,
        className: mergeClasses('app-textarea modal-control-premium modal-control-textarea', iconClassName, commonControlProps.className),
      });
    } else {
      const fieldKind = childProps['data-ui-control-kind'] || 'custom';
      renderedChild = React.cloneElement(primaryChild as React.ReactElement<ChildProps>, {
        ...commonControlProps,
        className: mergeClasses('modal-control-premium', iconClassName, commonControlProps.className),
        'data-ui-control-kind': fieldKind,
      });
    }
  }

  return (
    <ControlShell
      as="div"
      htmlFor={childId}
      label={label}
      required={required}
      wrapLabelContent
      error={error || undefined}
      hint={hint}
      icon={iconClass ? <i className={iconClass} /> : undefined}
      kind="modal"
      className={cn(
        'app-field app-form-field modal-field modal-field-premium',
        iconClass ? 'app-form-field--with-leading-icon' : 'app-form-field--no-leading-icon',
        error ? 'modal-field-premium--error app-form-field--error' : hint ? 'modal-field-premium--hint' : '',
        className,
      )}
      labelClassName="modal-field-label"
      controlWrapClassName="app-field__control-wrap app-form-field__control-wrap premium-input-wrap"
      iconClassName="app-field__leading-icon app-form-field__leading-icon premium-input-leading-icon premium-input-leading-chip"
      extras={extraChildren.length ? extraChildren : undefined}
      extrasClassName="app-form-field__extras modal-field-premium__extras"
      feedbackWrapClassName="app-field__feedback app-field-feedback"
      errorClassName="app-error"
      hintClassName="app-help"
      errorId={errorId}
      hintId={helpId}
      errorIcon={<i className="fa-solid fa-circle-exclamation" aria-hidden="true" />}
      hintIcon={<i className="fa-regular fa-circle-question" aria-hidden="true" />}
      hasLeadingIcon={hasLeadingIcon}
      data-field-key={fieldKey}
      data-error-key={error ? fieldKey : undefined}
      data-field-state={error ? 'error' : hint ? 'hint' : undefined}
    >
      {iconClass ? <span className="app-field__control-divider app-form-field__control-divider premium-input-divider" aria-hidden="true" /> : null}
      {renderedChild}
    </ControlShell>
  );
};

export default ModalField;
export type { ModalFieldProps };
