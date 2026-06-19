// pages/reports/ProfitabilityReport.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

import { ProfitabilityAnalysisItem, NotificationMessage } from '../../types';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/apiFetch';

import ModernReportShell from '../../components/reports/ModernReportShell';
import ModernKpiCard from '../../components/reports/ModernKpiCard';
import ModernTableTools from '../../components/reports/ModernTableTools';

const columnHelper = createColumnHelper<ProfitabilityAnalysisItem>();

const formatPrice = (v: number) =>
  (v ?? 0).toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' تومان';
const formatNumber = (v: number) => (v ?? 0).toLocaleString('fa-IR');
const formatPercent = (v: number) => (v ?? 0).toLocaleString('fa-IR', { maximumFractionDigits: 2 }) + '٪';

function downloadCsv(filename: string, rows: Record<string, any>[]) {
  const headers = Object.keys(rows[0] || {});
  const escape = (s: any) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const ProfitabilityReport: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [reportData, setReportData] = useState<ProfitabilityAnalysisItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'grossProfit', desc: true }]);

  useEffect(() => {
    if (currentUser && currentUser.roleName === 'Salesperson') {
      setNotification({ type: 'error', text: 'شما اجازه دسترسی به این صفحه را ندارید.' });
      navigate('/reports/analysis');
      return;
    }

    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch('/api/analysis/profitability');
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت گزارش سودآوری');
        setReportData(json.data || []);
      } catch (e: any) {
        setNotification({ type: 'error', text: e.message || 'خطا در عملیاتی نامشخص' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [currentUser, navigate]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('itemName', {
        header: 'کالا/محصول',
        enableSorting: false,
        cell: (info) => <span className="font-semibold text-slate-900 dark:text-slate-100">{info.getValue()}</span>,
      }),
      columnHelper.accessor('totalQuantitySold', {
        header: 'تعداد فروش',
        cell: (info) => formatNumber(info.getValue()),
      }),
      columnHelper.accessor('totalRevenue', {
        header: 'درآمد کل',
        cell: (info) => <span className="font-semibold">{formatPrice(info.getValue())}</span>,
      }),
      columnHelper.accessor('totalCost', {
        header: 'بهای تمام‌شده',
        cell: (info) => formatPrice(info.getValue()),
      }),
      columnHelper.accessor('grossProfit', {
        header: 'سود ناخالص',
        cell: (info) => <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatPrice(info.getValue())}</span>,
      }),
      columnHelper.accessor('profitMargin', {
        header: 'حاشیه سود',
        cell: (info) => formatPercent(info.getValue()),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: reportData,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue ?? '').trim();
      if (!q) return true;
      return String(row.original.itemName ?? '').includes(q);
    },
  });

  const totals = useMemo(() => {
    const revenue = reportData.reduce((s, r) => s + (r.totalRevenue ?? 0), 0);
    const cost = reportData.reduce((s, r) => s + (r.totalCost ?? 0), 0);
    const profit = reportData.reduce((s, r) => s + (r.grossProfit ?? 0), 0);
    const qty = reportData.reduce((s, r) => s + (r.totalQuantitySold ?? 0), 0);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, cost, profit, margin, qty, items: reportData.length };
  }, [reportData]);

  const handleExport = () => {
    const rows = table.getFilteredRowModel().rows.map((r) => r.original);
    if (!rows.length) return;
    downloadCsv('profitability_report.csv', rows.map((x) => ({
      itemName: x.itemName,
      totalQuantitySold: x.totalQuantitySold,
      totalRevenue: x.totalRevenue,
      totalCost: x.totalCost,
      grossProfit: x.grossProfit,
      profitMargin: x.profitMargin,
    })));
  };

  const handlePrint = () => window.print();

  if (currentUser && currentUser.roleName === 'Salesperson') return null;

  return (
    <div className="report-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <ModernReportShell
        title="سودآوری کالاها"
        subtitle="نمایش سود ناخالص، هزینه و حاشیه سود به تفکیک کالا — مناسب تصمیم‌گیری خرید و قیمت‌گذاری."
        icon="fa-solid fa-sack-dollar"
        actions={
          <button
            onClick={() => navigate('/reports/analysis')}
            className="h-10 rounded-xl border border-slate-200/70 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          >
            <i className="fa-solid fa-arrow-right ml-2" />
            بازگشت
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ModernKpiCard label="درآمد کل" value={formatPrice(totals.revenue)} icon="fa-solid fa-coins" />
          <ModernKpiCard label="سود ناخالص" value={formatPrice(totals.profit)} icon="fa-solid fa-chart-line" />
          <ModernKpiCard label="حاشیه سود" value={formatPercent(totals.margin)} icon="fa-solid fa-percent" />
          <ModernKpiCard label="تعداد فروش" value={formatNumber(totals.qty)} icon="fa-solid fa-bag-shopping" hint={`${formatNumber(totals.items)} قلم`} />
        </div>

        <div className="mt-4">
          <ModernTableTools
            search={globalFilter}
            onSearch={setGlobalFilter}
            preview="جستجو در نام کالا..."
            right={
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <i className="fa-solid fa-filter" />
                {formatNumber(table.getFilteredRowModel().rows.length)} ردیف
              </div>
            }
          />
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-slate-950/40">
          {isLoading ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">در حال دریافت اطلاعات…</div>
          ) : reportData.length === 0 ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">داده‌ای برای نمایش وجود ندارد.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-700 dark:bg-white/5 dark:text-slate-200">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-slate-200/70 dark:border-white/10">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          colSpan={header.colSpan}
                          className="whitespace-nowrap px-4 py-3 text-right font-bold"
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {{
                                asc: ' ▲',
                                desc: ' ▼',
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {reportData.length > 0 ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              صفحه {formatNumber(table.getState().pagination.pageIndex + 1)} از {formatNumber(table.getPageCount())}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-10 rounded-xl border border-slate-200/70 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              >
                قبلی
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-10 rounded-xl border border-slate-200/70 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              >
                بعدی
              </button>
            </div>
          </div>
        ) : null}
      </ModernReportShell>
    </div>
  );
};

export default ProfitabilityReport;
