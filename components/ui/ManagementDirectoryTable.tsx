import React from 'react';

import { cn } from '../../utils/cn';
import ManagementDirectoryPagination, { type ManagementDirectoryPaginationProps } from './ManagementDirectoryPagination';
import { Table, TableViewport } from './TableSystem';

export type ManagementDirectoryTableColumn = {
  key: string;
  label: React.ReactNode;
  widthClassName?: string;
  align?: 'start' | 'center' | 'end';
  stickyEnd?: boolean;
};

export type ManagementDirectoryTableProps = {
  id?: string;
  title: React.ReactNode;
  rangeLabel: React.ReactNode;
  info?: React.ReactNode;
  ariaLabel: string;
  caption: React.ReactNode;
  columns: readonly ManagementDirectoryTableColumn[];
  children: React.ReactNode;
  pagination?: ManagementDirectoryPaginationProps;
  minWidthClassName?: string;
  sectionClassName?: string;
  tableClassName?: string;
  dataUi?: string;
};

const getAlignClass = (align: ManagementDirectoryTableColumn['align']) => {
  if (align === 'center') return 'text-center';
  if (align === 'end') return 'text-end';
  return 'text-start';
};

const ManagementDirectoryTable: React.FC<ManagementDirectoryTableProps> = ({
  id,
  title,
  rangeLabel,
  info,
  ariaLabel,
  caption,
  columns,
  children,
  pagination,
  minWidthClassName = 'min-w-[62rem]',
  sectionClassName,
  tableClassName,
  dataUi = 'management-directory-table',
}) => (
  <section
    id={id}
    dir="rtl"
    className={cn('min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950', sectionClassName)}
    data-ui-management-directory-table={dataUi}
    data-ui-directory-table-parity="installments-v320"
  >
    <header className="flex flex-col gap-2 border-b border-slate-200/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-slate-800">
      <div className="min-w-0">
        <h3 className="text-sm font-black text-slate-950 dark:text-white">{title}</h3>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{rangeLabel}</p>
      </div>
      {info ? (
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <i className="fa-solid fa-circle-info shrink-0" aria-hidden="true" />
          <span className="min-w-0">{info}</span>
        </span>
      ) : null}
    </header>

    <div className="min-w-0 max-w-full">
    <TableViewport ariaLabel={ariaLabel} className="w-full overflow-x-auto overscroll-x-contain">
      <Table
        className={cn('table-fixed border-collapse text-xs', tableClassName)}
        minWidthClassName={minWidthClassName}
        density="compact"
        layout="managed"
        data-ui-table="true"
        data-ui-table-layout="managed"
        data-ui-table-density="compact"
        data-ui-bidi-scope="rtl-table"
      >
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          {columns.map((column) => <col key={column.key} className={column.widthClassName} />)}
        </colgroup>
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
          <tr className="border-b border-slate-200 text-right dark:border-slate-800">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'whitespace-nowrap bg-slate-50 px-3 py-2 text-xs font-black tracking-normal before:hidden after:hidden dark:bg-slate-900',
                  getAlignClass(column.align),
                  column.stickyEnd && 'sticky end-0 z-20 bg-slate-50 px-2 text-center dark:bg-slate-900',
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white text-slate-700 dark:divide-slate-800 dark:bg-slate-950 dark:text-slate-200">{children}</tbody>
      </Table>
    </TableViewport>
    </div>

    {pagination ? <ManagementDirectoryPagination {...pagination} /> : null}
  </section>
);

export const MANAGEMENT_DIRECTORY_ROW_CLASS = 'bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900';

export default ManagementDirectoryTable;
