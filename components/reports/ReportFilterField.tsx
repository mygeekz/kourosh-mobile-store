import React from 'react';

type Props = {
  label?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  minWidthClassName?: string;
  grow?: boolean;
};

const ReportFilterField: React.FC<Props> = ({
  label,
  icon,
  children,
  className,
  minWidthClassName,
  grow = false,
}) => {
  return (
    <div
      className={[
        'report-filter-field',
        grow ? 'report-filter-field--grow' : '',
        minWidthClassName || 'basis-full sm:basis-[12rem] sm:min-w-[12rem]',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
      dir="rtl"
      data-ui-report-filter-field="true"
      data-ui-field="true"
    >
      {label ? (
        <div className="report-filter-field__head" data-ui-report-filter-head="true">
          {icon ? <span className="report-filter-field__icon" aria-hidden="true">{icon}</span> : null}
          <span className="report-filter-field__label">{label}</span>
        </div>
      ) : null}
      <div className="report-filter-field__body" data-ui-report-filter-body="true">{children}</div>
    </div>
  );
};

export default ReportFilterField;
