import React from 'react';
import { cn } from '../../utils/cn';

interface DataTableShellProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function DataTableShell({ title, subtitle, actions, children, className }: DataTableShellProps) {
  return (
    <section className={cn('ux-table-shell report-data-table-shell', className)} data-ui-surface="table-shell" data-ui-table-shell="true" dir="rtl">
      {(title || actions) ? (
        <header className="ux-table-shell__header" data-ui-table-toolbar="true">
          <div className="ux-table-shell__heading">
            <span className="ux-table-shell__kicker">جدول حسابداری</span>
            {title ? <h3 className="ux-table-shell__title">{title}</h3> : null}
            {subtitle ? <p className="ux-table-shell__subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="ux-table-shell__actions" data-ui-table-actions="true">{actions}</div> : null}
        </header>
      ) : null}
      <div className="ux-table-shell__body" data-ui-table-scroll="true">{children}</div>
    </section>
  );
}
