import React, { useMemo, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';

import ColumnPicker from '@/components/ColumnPicker';
import {
  AppSearchField,
  Button,
  CheckboxField,
  DataTableShell,
  EmptyState,
  SelectField,
} from '@/components/ui';
import { formatExactNumberText } from '../../utils/exactNumber';
import ReportControlDock from './ReportControlDock';

const toCsv = (rows: string[][]) => {
  const escapeCell = (value: string) => {
    const normalized = (value ?? '').toString();
    if (/[\n\r",]/.test(normalized)) return `"${normalized.replace(/"/g, '""')}"`;
    return normalized;
  };

  return rows.map((row) => row.map(escapeCell).join(',')).join('\n');
};

const download = (filename: string, content: string, mime = 'text/csv;charset=utf-8') => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export type PremiumDataTableProps<T extends object> = {
  id: string;
  data: T[];
  columns: ColumnDef<T, unknown>[];
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  isLoading?: boolean;
  emptyText?: string;
  initialSorting?: SortingState;
  initialPageSize?: number;
  searchPlaceholder?: string;
  enableColumnToggle?: boolean;
  extraLeft?: React.ReactNode;
  extraRight?: React.ReactNode;
};

export default function PremiumDataTable<T extends object>({
  id,
  data,
  columns,
  title,
  subtitle,
  isLoading,
  emptyText = 'داده‌ای برای نمایش یافت نشد.',
  initialSorting = [],
  initialPageSize = 15,
  searchPlaceholder = 'جستجو...',
  enableColumnToggle = true,
  extraLeft,
  extraRight,
}: PremiumDataTableProps<T>) {
  const visibilityStorageKey = `premiumTable:${id}:vis`;
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    try {
      const raw = localStorage.getItem(visibilityStorageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const selectionColumn = useMemo<ColumnDef<T, unknown>>(() => ({
    id: '__select',
    header: ({ table }) => {
      const allVisibleSelected = table.getIsAllPageRowsSelected();
      const someVisibleSelected = table.getIsSomePageRowsSelected();

      return (
        <label
          className="inline-flex items-center justify-center"
          title="انتخاب همه ردیف‌های صفحه"
          data-ui-table-checkbox="true"
        >
          <CheckboxField
            controlOnly
            checked={allVisibleSelected}
            ref={(el) => {
              if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="انتخاب همه ردیف‌های صفحه"
          />
        </label>
      );
    },
    cell: ({ row }) => (
      <label
        className="inline-flex items-center justify-center"
        title="انتخاب ردیف"
        data-ui-table-checkbox="true"
      >
        <CheckboxField
          controlOnly
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          aria-label="انتخاب ردیف"
          onClick={(event) => event.stopPropagation()}
        />
      </label>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 44,
    meta: { align: 'center' },
  }), []);

  const tableColumns = useMemo<ColumnDef<T, unknown>[]>(
    () => [selectionColumn, ...columns],
    [selectionColumn, columns],
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, globalFilter, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnVisibility) : updater;
      setColumnVisibility(next);
      try {
        localStorage.setItem(visibilityStorageKey, JSON.stringify(next));
      } catch {
        // Local storage can be unavailable in hardened/private browser modes.
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: initialPageSize } },
  });

  const visibleLeafColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getIsVisible() && column.id !== '__select');
  const selectedRows = table.getSelectedRowModel().rows;
  const filteredRows = table.getFilteredRowModel().rows;
  const pageCount = Math.max(1, table.getPageCount());

  const exportRowsToCsv = (rowsToExport: ReturnType<typeof table.getRowModel>['rows']) => {
    const headers = visibleLeafColumns.map((column) => {
      const header = column.columnDef.header as unknown;
      return typeof header === 'string' ? header : column.id;
    });

    const rows = rowsToExport.map((row) => visibleLeafColumns.map((column) => {
      const value = row.getValue(column.id);
      if (value === null || value === undefined) return '';
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }));

    const csv = toCsv([headers, ...rows]);
    const today = new Date();
    const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    download(`${id}-${stamp}.csv`, csv);
  };

  const exportCsv = () => exportRowsToCsv(filteredRows);
  const exportSelectedCsv = () => exportRowsToCsv(selectedRows);

  const selectionActions = selectedRows.length > 0 ? (
    <div
      className="report-data-table__selection-bar flex flex-col gap-3 border px-3 py-3 text-sm md:flex-row md:items-center md:justify-between"
      data-ui-selection-bar="true"
    >
      <div className="flex min-w-0 items-center gap-2 text-text">
        <strong>{formatExactNumberText(selectedRows.length)}</strong>
        <span>ردیف انتخاب شده</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={exportSelectedCsv}
          leftIcon={<i className="fa-solid fa-file-export" aria-hidden="true" />}
          autoIcon={false}
        >
          خروجی انتخاب‌شده‌ها
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => table.toggleAllPageRowsSelected(true)}
          leftIcon={<i className="fa-solid fa-check-double" aria-hidden="true" />}
          autoIcon={false}
        >
          انتخاب همه صفحه
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => table.resetRowSelection()}
          leftIcon={<i className="fa-solid fa-xmark" aria-hidden="true" />}
          autoIcon={false}
        >
          پاک کردن انتخاب
        </Button>
      </div>
    </div>
  ) : undefined;

  const toolbar = (
    <ReportControlDock
      embedded
      ariaLabel="ابزارهای جدول گزارش"
      toolbarClassName="p-4 md:p-5"
      search={(
        <AppSearchField
          value={globalFilter}
          onChange={setGlobalFilter}
          placeholder={searchPlaceholder}
          ariaLabel="جستجو در جدول"
          clearable
        />
      )}
      filters={extraLeft}
      actions={(
        <>
          {extraRight}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={exportCsv}
            tooltip="خروجی CSV از تمام ردیف‌های فیلترشده"
            leftIcon={<i className="fa-solid fa-file-csv" aria-hidden="true" />}
            autoIcon={false}
          >
            خروجی CSV
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            tooltip="چاپ نمای فعلی جدول"
            leftIcon={<i className="fa-solid fa-print" aria-hidden="true" />}
            autoIcon={false}
          >
            چاپ
          </Button>
          {enableColumnToggle ? (
            <ColumnPicker
              table={table}
              storageKey={visibilityStorageKey}
              label="ستون‌ها"
            />
          ) : null}
        </>
      )}
      secondaryRow={selectionActions}
    />
  );

  const pagination = table.getRowModel().rows.length > 0 ? (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2" aria-label="صفحه‌بندی جدول">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          tooltip="صفحه اول"
          aria-label="صفحه اول"
          autoIcon={false}
        >
          « اول
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          tooltip="صفحه قبل"
          aria-label="صفحه قبل"
          autoIcon={false}
        >
          ‹ قبل
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          tooltip="صفحه بعد"
          aria-label="صفحه بعد"
          autoIcon={false}
        >
          بعد ›
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!table.getCanNextPage()}
          tooltip="صفحه آخر"
          aria-label="صفحه آخر"
          autoIcon={false}
        >
          آخر »
        </Button>
      </div>

      <div className="flex items-center gap-2 text-muted" aria-live="polite">
        <span>صفحه</span>
        <strong className="text-text">
          {formatExactNumberText(table.getState().pagination.pageIndex + 1)} از {formatExactNumberText(pageCount)}
        </strong>
      </div>

      <div className="min-w-40">
        <SelectField
          controlOnly
          value={String(table.getState().pagination.pageSize)}
          onChange={(event) => table.setPageSize(Number(event.target.value))}
          ariaLabel="تعداد ردیف در هر صفحه"
          icon={false}
          options={[
            { value: '10', label: `نمایش ${formatExactNumberText(10)} ردیف` },
            { value: '15', label: `نمایش ${formatExactNumberText(15)} ردیف` },
            { value: '20', label: `نمایش ${formatExactNumberText(20)} ردیف` },
            { value: '50', label: `نمایش ${formatExactNumberText(50)} ردیف` },
            { value: '100', label: `نمایش ${formatExactNumberText(100)} ردیف` },
          ]}
        />
      </div>
    </div>
  ) : undefined;

  return (
    <DataTableShell
      title={title}
      subtitle={subtitle}
      toolbar={toolbar}
      footer={pagination}
      className="report-data-table premium-data-table"
      aria-label={typeof title === 'string' ? title : 'جدول گزارش'}
    >
      {isLoading ? (
        <div className="flex min-h-52 items-center justify-center gap-3 px-4 py-12 text-sm font-bold text-muted" role="status">
          <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
          در حال دریافت اطلاعات…
        </div>
      ) : table.getFilteredRowModel().rows.length === 0 ? (
        <EmptyState
          title={globalFilter ? 'نتیجه‌ای برای این جستجو پیدا نشد' : emptyText}
          description={globalFilter ? 'عبارت جستجو را تغییر دهید یا جستجو را پاک کنید.' : undefined}
          actionLabel={globalFilter ? 'پاک کردن جستجو' : undefined}
          onAction={globalFilter ? () => setGlobalFilter('') : undefined}
        />
      ) : (
        <table
          className="report-table ux-data-table premium-data-table"
          data-ui-table="true"
          data-ui-table-layout="managed"
          data-ui-table-density="comfortable"
          data-ui-bidi-scope="rtl-table"
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortingState = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  const ariaSort = sortingState === 'asc'
                    ? 'ascending'
                    : sortingState === 'desc'
                      ? 'descending'
                      : 'none';

                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      aria-sort={canSort ? ariaSort : undefined}
                      data-table-column={header.column.id}
                    >
                      {header.isPlaceholder ? null : (
                        <Button
                          type="button"
                          unstyled
                          disabled={!canSort}
                          onClick={header.column.getToggleSortingHandler()}
                          className="w-full min-w-0 justify-start gap-2 p-0 text-right font-black"
                          tooltip={canSort ? 'برای مرتب‌سازی کلیک کنید' : undefined}
                          autoIcon={false}
                        >
                          <span className="min-w-0 truncate">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          {sortingState === 'asc' ? <i className="fa-solid fa-caret-up shrink-0" aria-hidden="true" /> : null}
                          {sortingState === 'desc' ? <i className="fa-solid fa-caret-down shrink-0" aria-hidden="true" /> : null}
                        </Button>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody data-ui-table-body="true">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                data-ui-table-row="true"
                aria-selected={row.getIsSelected()}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    data-ui-table-cell="true"
                    data-table-column={cell.column.id}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DataTableShell>
  );
}
