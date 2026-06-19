// pages/reports/InventoryAnalysisReport.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { InventoryVelocityAnalysis, NotificationMessage, VelocityItem } from '../../types';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/apiFetch';

import ModernReportShell from '../../components/reports/ModernReportShell';
import ModernKpiCard from '../../components/reports/ModernKpiCard';
import ModernTableTools from '../../components/reports/ModernTableTools';

const fmt = (num: number, digits: number = 2) =>
  (num ?? 0).toLocaleString('fa-IR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const columnHelper = createColumnHelper<VelocityItem>();

type TabKey = 'hot' | 'normal' | 'stale';

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

const InventoryAnalysisReport: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<InventoryVelocityAnalysis | null>(null);
  const [tab, setTab] = useState<TabKey>('hot');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [search, setSearch] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState<'all' | 'phone' | 'inventory'>('all');
  const didAutoTab = useRef(false);

  useEffect(() => {
    if (currentUser && currentUser.roleName === 'Salesperson') {
      setNotification({ type: 'error', text: 'شما اجازه دسترسی به این صفحه را ندارید.' });
      navigate('/reports/analysis');
      return;
    }

    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch('/api/analysis/inventory-velocity');
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت گزارش انبار');
        setData(json.data || null);
      } catch (e: any) {
        setNotification({ type: 'error', text: e.message || 'خطا در عملیاتی نامشخص' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [currentUser, navigate]);

  // اگر تب پیش‌فرض (داغ) خالی بود، یک‌بار به نزدیک‌ترین تب غیرخالی سوئیچ کن
  // تا کاربر با صفحه‌ی خالی روبه‌رو نشود.
  useEffect(() => {
    if (!data || didAutoTab.current) return;
    didAutoTab.current = true;
    const hot = data.hotItems?.length ?? 0;
    const normal = data.normalItems?.length ?? 0;
    const stale = data.staleItems?.length ?? 0;
    if (tab === 'hot' && hot === 0) {
      if (normal > 0) setTab('normal');
      else if (stale > 0) setTab('stale');
    }
  }, [data, tab]);

  const rows: VelocityItem[] = useMemo(() => {
    if (!data) return [];
    if (tab === 'hot') return data.hotItems || [];
    if (tab === 'stale') return data.staleItems || [];
    return data.normalItems || [];
  }, [data, tab]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => itemTypeFilter === 'all' ? true : row.itemType === itemTypeFilter);
  }, [rows, itemTypeFilter]);

  const totals = useMemo(() => {
    const hot = data?.hotItems?.length ?? 0;
    const normal = data?.normalItems?.length ?? 0;
    const stale = data?.staleItems?.length ?? 0;
    const all = (data?.hotItems ?? []).concat(data?.normalItems ?? [], data?.staleItems ?? []);
    const avg = all.length ? all.reduce((s, r) => s + (r.salesPerDay ?? 0), 0) / all.length : 0;
    const max = all.reduce((m, r) => Math.max(m, r.salesPerDay ?? 0), 0);
    return { hot, normal, stale, avg, max, allCount: all.length };
  }, [data]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('itemName', {
        header: 'کالا/محصول',
        cell: (info) => <span className="font-semibold text-slate-900 dark:text-slate-100">{info.getValue()}</span>,
      }),
      columnHelper.accessor('salesPerDay', {
        header: 'سرعت فروش (روزانه)',
        cell: (info) => fmt(info.getValue(), 2),
      }),
      columnHelper.accessor('classification', {
        header: 'وضعیت',
        cell: (info) => {
          const v = info.getValue();
          const cls =
            v === 'پرفروش (داغ)'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'
              : v === 'کم‌فروش (راکد)'
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200'
              : 'bg-slate-50 text-slate-700 dark:bg-white/5 dark:text-slate-200';
          return <span className={`rounded-full px-2 py-1 text-xs font-bold ${cls}`}>{v}</span>;
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue ?? '').trim();
      if (!q) return true;
      return String(row.original.itemName ?? '').includes(q);
    },
  });

  const handleExport = () => {
    const out = table.getFilteredRowModel().rows.map((r) => r.original);
    if (!out.length) return;
    downloadCsv('inventory_velocity.csv', out.map((x) => ({
      itemName: x.itemName,
      salesPerDay: x.salesPerDay,
      classification: x.classification,
      itemType: x.itemType,
    })));
  };

  const handlePrint = () => window.print();

  const TabBtn = ({ k, label, count, tone }: { k: TabKey; label: string; count: number; tone: string }) => (
    <button
      onClick={() => setTab(k)}
      className={[
        'h-10 rounded-xl px-3 text-sm font-extrabold transition',
        tab === k
          ? `bg-gradient-to-br ${tone} text-white shadow-md`
          : 'border border-slate-200/70 bg-white/70 text-slate-700 shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100',
      ].join(' ')}
    >
      {label} <span className={tab === k ? 'opacity-90' : 'text-slate-400 dark:text-slate-400'}>({(count ?? 0).toLocaleString('fa-IR')})</span>
    </button>
  );

  if (currentUser && currentUser.roleName === 'Salesperson') return null;

  return (
    <div className="report-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <ModernReportShell
        title="سلامت موجودی"
        subtitle="بر اساس سرعت فروش، کالاها را به داغ/عادی/راکد تقسیم می‌کنیم تا خرید و چیدمان انبار دقیق‌تر شود."
        icon="fa-solid fa-boxes-stacked"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExport}
              className="h-10 rounded-xl border border-slate-200/70 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            >
              <i className="fa-solid fa-download ml-2" />
              خروجی CSV
            </button>
            <button
              onClick={handlePrint}
              className="h-10 rounded-xl border border-slate-200/70 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            >
              <i className="fa-solid fa-print ml-2" />
              چاپ
            </button>
            <button
              onClick={() => navigate('/reports/analysis')}
              className="h-10 rounded-xl border border-slate-200/70 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            >
              <i className="fa-solid fa-arrow-right ml-2" />
              بازگشت
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ModernKpiCard label="کل کالاهای تحلیل‌شده" value={(totals.allCount ?? 0).toLocaleString('fa-IR')} icon="fa-solid fa-layer-group" />
          <ModernKpiCard label="میانگین سرعت فروش" value={fmt(totals.avg, 2)} icon="fa-solid fa-gauge-high" hint="واحد: عدد/روز" />
          <ModernKpiCard label="بیشترین سرعت فروش" value={fmt(totals.max, 2)} icon="fa-solid fa-fire" hint="واحد: عدد/روز" />
          <ModernKpiCard label="تمرکز خرید پیشنهادی" value={(tab === 'hot' ? 'داغ' : tab === 'stale' ? 'راکد' : 'عادی')} icon="fa-solid fa-bullseye" />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <TabBtn k="hot" label="پرفروش (داغ)" count={totals.hot} tone="from-emerald-500 to-teal-600" />
            <TabBtn k="normal" label="عادی" count={totals.normal} tone="from-slate-700 to-slate-900" />
            <TabBtn k="stale" label="کم‌فروش (راکد)" count={totals.stale} tone="from-rose-500 to-orange-500" />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            {table.getFilteredRowModel().rows.length.toLocaleString('fa-IR')} ردیف
          </div>
        </div>

        <div className="mt-3">
          <ModernTableTools
            search={search}
            onSearch={setSearch}
            preview="جستجو در نام کالا..."
            right={
              <select
                value={itemTypeFilter}
                onChange={(e) => setItemTypeFilter(e.target.value as any)}
                className="h-10 rounded-xl border border-slate-200/70 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              >
                <option value="all">همه نوع‌ها</option>
                <option value="phone">گوشی</option>
                <option value="inventory">کالا</option>
              </select>
            }
          />
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-slate-950/40">
          {isLoading ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">در حال دریافت اطلاعات…</div>
          ) : table.getFilteredRowModel().rows.length === 0 ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">داده‌ای برای نمایش وجود ندارد.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-700 dark:bg-white/5 dark:text-slate-200">
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-slate-200/70 dark:border-white/10">
                      {hg.headers.map((h) => (
                        <th key={h.id} className="whitespace-nowrap px-4 py-3 text-right font-bold">
                          {flexRender(h.column.columnDef.header, h.getContext())}
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

        {table.getFilteredRowModel().rows.length > 0 ? (
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              صفحه {(table.getState().pagination.pageIndex + 1).toLocaleString('fa-IR')} از {table.getPageCount().toLocaleString('fa-IR')}
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

export default InventoryAnalysisReport;
