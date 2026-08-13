import React from 'react';

import { cn } from '../../utils/cn';

type CheckboxFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: React.ReactNode;
  description?: React.ReactNode;
  wrapperClassName?: string;
  controlOnly?: boolean;
};

const CheckboxField = React.forwardRef<HTMLInputElement, CheckboxFieldProps>(function CheckboxField(
  { label, description, wrapperClassName, className, controlOnly = false, ...props },
  ref,
) {
  const control = (
    <input
      ref={ref}
      type="checkbox"
      data-ui-control="true"
      data-ui-control-kind="checkbox"
      className={cn(className)}
      {...props}
    />
  );

  if (controlOnly || (!label && !description)) return control;

  return (
    <label className={cn('inline-flex min-w-0 items-start gap-2', wrapperClassName)}>
      {control}
      <span className="min-w-0">
        {label ? <span className="block">{label}</span> : null}
        {description ? <span className="block text-xs text-muted">{description}</span> : null}
      </span>
    </label>
  );
});

CheckboxField.displayName = 'CheckboxField';

export default CheckboxField;
export type { CheckboxFieldProps };
