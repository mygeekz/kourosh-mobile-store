import React from 'react';

import { cn } from '../../utils/cn';
import Surface from './Surface';

export type DataTableColumn<T> = {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

interface DataTableShellProps<T = never> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  titleIcon?: React.ReactNode;
  kicker?: React.ReactNode;
  kickerIcon?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  rows?: T[];
  columns?: DataTableColumn<T>[];
  getRowKey?: (row: T, index: number) => React.Key;
  getRowProps?: (row: T, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
  tableClassName?: string;
  headerLayout?: 'default' | 'compact';
}

export default function DataTableShell<T = never>({
  title,
  titleIcon = <i className="fa-solid fa-receipt" aria-hidden="true" />,
  kicker = 'جدول داده',
  kickerIcon = <i className="fa-solid fa-table-list" aria-hidden="true" />,
  subtitle,
  actions,
  meta,
  toolbar,
  footer,
  children,
  className,
  rows,
  columns,
  getRowKey,
  getRowProps,
  tableClassName,
  headerLayout = 'default',
  ...surfaceProps
}: DataTableShellProps<T>) {
  const hasHeader = Boolean(title || actions || meta || subtitle);
  const hasStructuredRows = Array.isArray(rows) && Array.isArray(columns);

  return (
    <Surface
      {...surfaceProps}
      surface="default"
      wrapContent={false}
      className={cn('ux-table-shell report-data-table-shell rounded-[26px]', className)}
      data-ui-surface="table-shell"
      data-ui-table-shell="true"
      data-ui-table-responsive="scroll"
      data-ui-table-header-layout={headerLayout}
      data-ui-card="true"
      dir="rtl"
    >
      {hasHeader ? (
        <header
          className={cn(
            'ux-table-shell__header [&&]:!bg-transparent',
            headerLayout === 'compact'
              ? '!grid !grid-cols-1 !items-center !gap-4 !px-5 !py-4 sm:!px-6 lg:!grid-cols-[minmax(0,1fr)_auto] lg:!px-7'
              : '',
          )}
          data-ui-table-toolbar="true"
        >
          <div className={cn('ux-table-shell__heading', headerLayout === 'compact' ? 'min-w-0 flex-1' : '')}>
            <span className="ux-table-shell__kicker">{kickerIcon}{kicker}</span>
            {title ? (
              <div className="ux-table-shell__title-row">
                {titleIcon}
                <h3 className="ux-table-shell__title">{title}</h3>
              </div>
            ) : null}
            {subtitle ? (
              <p className="ux-table-shell__subtitle">
                <i className="fa-solid fa-list-ol" aria-hidden="true" />
                <span>{subtitle}</span>
              </p>
            ) : null}
          </div>
          {actions || meta ? (
            <div
              className={cn(
                'ux-table-shell__actions flex min-w-0 flex-wrap items-center gap-2',
                headerLayout === 'compact' ? 'lg:!w-auto lg:!justify-end' : '',
              )}
              data-ui-table-actions="true"
            >
              {meta ? <div className="ux-table-shell__meta">{meta}</div> : null}
              {actions}
            </div>
          ) : null}
        </header>
      ) : null}
      {toolbar ? (
        <div className="report-data-table__toolbar [&&]:!bg-transparent" data-ui-table-toolbar="true">
          {toolbar}
        </div>
      ) : null}
      <div className="ux-table-shell__body [&&]:!bg-transparent" data-ui-table-scroll="true">
        {hasStructuredRows ? (
          <table className={cn('report-table ux-data-table', tableClassName)} data-ui-table="true" data-ui-table-density="comfortable">
            <thead>
              <tr>{columns.map((column) => <th key={column.id} className={column.className}>{column.header}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={getRowKey ? getRowKey(row, rowIndex) : rowIndex} {...(getRowProps ? getRowProps(row, rowIndex) : {})}>
                  {columns.map((column) => <td key={column.id} className={column.className}>{column.cell(row)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        ) : children}
      </div>
      {footer ? (
        <footer className="report-table-pagination border-t border-primary/10 p-4" data-ui-table-pagination="true">
          {footer}
        </footer>
      ) : null}
    </Surface>
  );
}
