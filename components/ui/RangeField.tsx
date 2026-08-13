import React from 'react';

import { cn } from '../../utils/cn';

type RangeFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: React.ReactNode;
  valueLabel?: React.ReactNode;
  wrapperClassName?: string;
  controlOnly?: boolean;
};

const RangeField = React.forwardRef<HTMLInputElement, RangeFieldProps>(function RangeField(
  { label, valueLabel, wrapperClassName, className, controlOnly = false, ...props },
  ref,
) {
  const control = (
    <input
      ref={ref}
      type="range"
      data-ui-control="true"
      data-ui-control-kind="range"
      className={cn(className)}
      {...props}
    />
  );

  if (controlOnly || (!label && valueLabel == null)) return control;

  return (
    <label className={cn('block min-w-0', wrapperClassName)}>
      <span className="mb-2 flex items-center justify-between gap-3">
        {label ? <span>{label}</span> : <span />}
        {valueLabel != null ? <strong>{valueLabel}</strong> : null}
      </span>
      {control}
    </label>
  );
});

RangeField.displayName = 'RangeField';

export default RangeField;
export type { RangeFieldProps };
