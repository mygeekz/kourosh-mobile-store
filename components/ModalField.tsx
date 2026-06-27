import React, { useId } from 'react';

type Props = {
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
  'aria-describedby'?: string;
  'data-ui-control'?: string;
  'data-ui-control-kind'?: string;
  'data-field-key'?: string;
  'data-error-key'?: string;
  'data-tooltip'?: string;
};

const mergeClasses = (...parts: Array<string | undefined | null | false>) => parts.filter(Boolean).join(' ');

const ModalField: React.FC<Props> = ({ label, iconClass, required, error, hint, children, className }) => {
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
  let renderedChild: React.ReactNode = isElement ? primaryChild : children;

  if (isElement) {
    // Canonical modal fields own their visual styling. Caller classes are intentionally
    // not forwarded to the native control because legacy Tailwind border/ring/bg
    // classes caused nested boxes and blue focus halos inside modals.
    const tag = typeof primaryChild.type === 'string' ? primaryChild.type : '';
    const fieldKind = tag === 'textarea' ? 'textarea' : tag === 'select' ? 'select' : 'text';
    const hasLeadingIcon = Boolean(iconClass);
    const iconClassName = hasLeadingIcon ? 'premium-has-leading-icon' : 'premium-no-leading-icon';
    const baseClass = tag === 'textarea'
      ? `app-textarea modal-control-premium modal-control-textarea ${iconClassName}`
      : tag === 'select'
      ? `app-select modal-control-premium premium-select-control ${iconClassName}`
      : `app-input modal-control-premium ${iconClassName}`;

    renderedChild = React.cloneElement(primaryChild as React.ReactElement<ChildProps>, {
      id: childId,
      className: mergeClasses(baseClass, 'app-form-field__control', error && 'modal-control-error app-form-field__control--error'),
      'data-ui-control': childProps['data-ui-control'] || 'true',
      'data-ui-control-kind': childProps['data-ui-control-kind'] || fieldKind,
      placeholder: childProps.placeholder || childProps.preview || undefined,
      'data-tooltip': childProps['data-tooltip'] || childProps.preview || (typeof label === 'string' ? label : undefined),
      title: childProps.title || undefined,
      'aria-invalid': error ? 'true' : undefined,
      'aria-describedby': mergeClasses(childProps['aria-describedby'] as string | undefined, describedBy),
      'data-field-state': error ? 'error' : hint ? 'hint' : undefined,
      'data-field-key': childProps['data-field-key'] || fieldKey,
      'data-error-key': error ? (childProps['data-error-key'] || fieldKey) : childProps['data-error-key'],
    });
  }

  return (
    <div data-field-key={fieldKey} data-error-key={error ? fieldKey : undefined} className={mergeClasses('app-field app-form-field modal-field modal-field-premium', iconClass ? 'app-form-field--with-leading-icon' : 'app-form-field--no-leading-icon', error ? 'modal-field-premium--error app-form-field--error' : hint ? 'modal-field-premium--hint' : null, className)} data-ui-field="true" data-ui-field-kind="modal" data-has-leading-icon={iconClass ? 'true' : 'false'}>
      <label className="modal-field-label" htmlFor={childId}>
        <span>{label}</span>
        {required ? <span className="text-rose-500">*</span> : null}
      </label>
      <div className="app-field__control-wrap app-form-field__control-wrap premium-input-wrap">
        {iconClass ? (
          <span className="app-field__leading-icon app-form-field__leading-icon premium-input-leading-icon premium-input-leading-chip" aria-hidden="true">
            <i className={iconClass} />
          </span>
        ) : null}
        {iconClass ? <span className="app-field__control-divider app-form-field__control-divider premium-input-divider" aria-hidden="true" /> : null}
        {renderedChild}
      </div>
      {extraChildren.length ? <div className="app-form-field__extras modal-field-premium__extras">{extraChildren}</div> : null}
      {error || hint ? (
        <div className={mergeClasses('app-field__feedback app-field-feedback', error ? 'app-field-feedback--error' : 'app-field-feedback--hint')}>
          {error ? <p id={errorId} className="app-error"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> <span>{error}</span></p> : null}
          {hint ? <p id={helpId} className="app-help"><i className="fa-regular fa-circle-question" aria-hidden="true" /> <span>{hint}</span></p> : null}
        </div>
      ) : null}
    </div>
  );
};

export default ModalField;
