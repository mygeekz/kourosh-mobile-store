import React, { useMemo, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  RowSelectionState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';

const toCsv = (rows: string[][]) => {
  const esc = (v: string) => {
    const s = (v ?? '').toString();
    if (/[\n\r",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return rows.map((r) => r.map(esc).join(',')).join('\n');
};

const download = (filename: string, content: string, mime = 'text/csv;charset=utf-8') => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export type PremiumDataTableProps<T extends object> = {
  id: string;
  data: T[];
  columns: ColumnDef<T, unknown>[];
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
  isLoading,
  emptyText = 'داده‌ای برای نمایش یافت نشد.',
  initialSorting = [],
  initialPageSize = 15,
  searchPlaceholder = 'جستجو...',
  enableColumnToggle = true,
  extraLeft,
  extraRight,
}: PremiumDataTableProps<T>) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    try {
      const raw = localStorage.getItem(`premiumTable:${id}:vis`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });


  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const selectionColumn = useMemo<ColumnDef<T, unknown>>(() => ({
    id: '__select',
    header: ({ table }) => {
      const allVisibleSelected = table.getIsAllPageRowsSelected();
      const someVisibleSelected = table.getIsSomePageRowsSelected();
      return (
        <label className="inline-flex items-center justify-center" title="انتخاب همه ردیف‌های صفحه" data-ui-table-checkbox="true">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-primary/20 text-primary   "
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
      <label className="inline-flex items-center justify-center" title="انتخاب ردیف" data-ui-table-checkbox="true">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-primary/20 text-primary   "
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          aria-label="انتخاب ردیف"
          onClick={(e) => e.stopPropagation()}
        />
      </label>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 44,
    meta: { align: 'center' },
  }), []);

  const tableColumns = useMemo<ColumnDef<T, unknown>[]>(() => [selectionColumn, ...columns], [selectionColumn, columns]);

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
        localStorage.setItem(`premiumTable:${id}:vis`, JSON.stringify(next));
      } catch {}
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: initialPageSize } },
  });

  const visibleLeafColumns = table.getAllLeafColumns().filter((c) => c.getIsVisible() && c.id !== '__select');
  const selectedRows = table.getSelectedRowModel().rows;

  const exportCsv = () => exportRowsToCsv(table.getRowModel().rows);
  const exportSelectedCsv = () => exportRowsToCsv(selectedRows);

  const allColumns = useMemo(() => table.getAllLeafColumns().filter((c) => c.id !== '__select'), [table]);

  const exportRowsToCsv = (rowsToExport: ReturnType<typeof table.getRowModel>['rows']) => {
    const headers = visibleLeafColumns.map((c) => {
      const h = c.columnDef.header as unknown;
      if (typeof h === 'string') return h;
      return c.id;
    });

    const rows = rowsToExport.map((r) =>
      visibleLeafColumns.map((c) => {
        const v = r.getValue(c.id);
        if (v === null || v === undefined) return '';
        return typeof v === 'object' ? JSON.stringify(v) : String(v);
      })
    );

    const csv = toCsv([headers, ...rows]);
    const today = new Date();
    const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    download(`${id}-${stamp}.csv`, csv);
  };

  return (
    <div className="report-data-table rounded-2xl border border-primary/10 bg-white/60 dark:bg-black/20 overflow-hidden" data-ui-surface="data-table" data-ui-table-shell="true" dir="rtl">
      <div className="report-data-table__toolbar p-4 md:p-5 border-b border-primary/10" data-ui-table-toolbar="true">
        {selectedRows.length > 0 ? (
          <div className="report-data-table__selection-bar mb-3 flex flex-col gap-2 rounded-2xl border border-primary/15 bg-primary/5 px-3 py-3 text-sm md:flex-row md:items-center md:justify-between" data-ui-selection-bar="true">
            <div className="flex items-center gap-2 text-text">
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white/80 px-2 text-xs font-bold text-primary shadow-sm dark:bg-black/30">
                {selectedRows.length.toLocaleString('fa-IR')}
              </span>
              <span className="font-semibold">ردیف انتخاب شده</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={exportSelectedCsv}
                className="px-3 py-2 rounded-xl border border-primary/15 bg-white dark:bg-black/30 hover:bg-primary/5 transition-colors text-sm"
                data-ui-table-action="true"
              >
                <i className="fa-solid fa-file-export ml-2" />
                خروجی انتخاب‌شده‌ها
              </button>
              <button
                type="button"
                onClick={() => table.toggleAllPageRowsSelected(true)}
                className="px-3 py-2 rounded-xl border border-primary/15 bg-white dark:bg-black/30 hover:bg-primary/5 transition-colors text-sm"
                data-ui-table-action="true"
              >
                <i className="fa-solid fa-check-double ml-2" />
                انتخاب همه صفحه
              </button>
              <button
                type="button"
                onClick={() => table.resetRowSelection()}
                className="px-3 py-2 rounded-xl border border-primary/15 bg-white dark:bg-black/30 hover:bg-primary/5 transition-colors text-sm"
                data-ui-table-action="true"
              >
                <i className="fa-solid fa-xmark ml-2" />
                پاک کردن انتخاب
              </button>
            </div>
          </div>
        ) : null}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <div className="ux-table-search ux-single-surface-search-shell relative w-full md:w-[340px]" data-ui-field="true" data-ui-field-kind="table-search">
              <input
                type="text"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder={searchPlaceholder}
                className="ux-table-search ux-single-surface-search-input w-full pr-3 pl-10 py-2 rounded-xl border border-primary/15 bg-white dark:bg-black/30 text-text   "
                data-ui-control="true"
                data-ui-control-kind="search"
              />
              <div className="ux-table-search ux-single-surface-search-icon absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <i className="fa-solid fa-search text-muted" />
              </div>
            </div>
            {extraLeft}
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
            {extraRight}
            <button
              onClick={exportCsv}
              className="px-3 py-2 rounded-xl border border-primary/15 bg-white dark:bg-black/30 hover:bg-primary/5 transition-colors text-sm"
              title="خروجی CSV"
              data-ui-table-action="true"
            >
              <i className="fa-solid fa-file-csv ml-2" />
              خروجی CSV
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl border border-primary/15 bg-white dark:bg-black/30 hover:bg-primary/5 transition-colors text-sm"
              title="چاپ"
              data-ui-table-action="true"
            >
              <i className="fa-solid fa-print ml-2" />
              چاپ
            </button>

            {enableColumnToggle ? (
              <details className="relative">
                <summary className="list-none cursor-pointer px-3 py-2 rounded-xl border border-primary/15 bg-white dark:bg-black/30 hover:bg-primary/5 transition-colors text-sm" data-ui-table-action="true">
                  <i className="fa-solid fa-columns ml-2" />
                  ستون‌ها
                </summary>
                <div className="absolute z-30 mt-2 left-0 w-56 rounded-xl border border-primary/15 bg-white dark:bg-gray-950 shadow-xl p-2" data-ui-table-menu="true">
                  {allColumns.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 text-sm text-text hover:bg-primary/5 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={c.getIsVisible()}
                        onChange={c.getToggleVisibilityHandler()}
                      />
                      <span className="truncate">
                        {typeof c.columnDef.header === 'string' ? (c.columnDef.header as string) : c.id}
                      </span>
                    </label>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <i className="fas fa-spinner fa-spin text-3xl text-primary" />
        </div>
      ) : table.getRowModel().rows.length === 0 ? (
        <div className="text-center py-12 text-muted">{emptyText}</div>
      ) : (
        <>
          <div className="overflow-x-auto" data-ui-table-scroll="true">
            <table className="report-table min-w-full text-sm" data-ui-table="true">
              <thead className="report-table__head bg-primary/5">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        onClick={h.column.getToggleSortingHandler()}
                        className={`px-4 py-3 text-right font-semibold uppercase tracking-wider text-text whitespace-nowrap ${
                          h.column.getCanSort() ? 'cursor-pointer hover:bg-primary/10' : ''
                        }`}
                        title={h.column.getCanSort() ? 'برای مرتب‌سازی کلیک کنید' : ''}
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {{ asc: '↑', desc: '↓' }[h.column.getIsSorted() as string] ?? null}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              <tbody className="report-table__body bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800/60" data-ui-table-body="true">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-primary/5 transition-colors ${row.getIsSelected() ? 'bg-primary/5 ring-1 ring-inset ring-primary/10' : ''}`}
                    data-ui-table-row="true"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={`px-4 py-3 whitespace-nowrap ${cell.column.id === '__select' ? 'w-12 text-center' : ''}`} data-ui-table-cell="true">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="report-table-pagination flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 border-t border-primary/10 text-sm" data-ui-table-pagination="true">
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 rounded-lg border border-primary/15 disabled:opacity-50" data-ui-table-page-button="true"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                «
              </button>
              <button
                className="px-2 py-1 rounded-lg border border-primary/15 disabled:opacity-50" data-ui-table-page-button="true"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                ‹
              </button>
              <button
                className="px-2 py-1 rounded-lg border border-primary/15 disabled:opacity-50" data-ui-table-page-button="true"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                ›
              </button>
              <button
                className="px-2 py-1 rounded-lg border border-primary/15 disabled:opacity-50" data-ui-table-page-button="true"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                »
              </button>
            </div>

            <div className="flex items-center gap-2 text-muted">
              <span>صفحه</span>
              <strong className="text-text">
                {table.getState().pagination.pageIndex + 1} از {table.getPageCount()}
              </strong>
            </div>

            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="p-2 rounded-xl border border-primary/15 bg-white dark:bg-black/30"
              data-ui-control="true"
              data-ui-control-kind="select"
            >
              <option value="10">نمایش 10</option>
              <option value="15">نمایش 15</option>
              <option value="20">نمایش 20</option>
              <option value="50">نمایش 50</option>
              <option value="100">نمایش 100</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}
