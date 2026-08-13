// pages/reports/ProfitabilityReport.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';
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
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/apiFetch';
import { formatExactNumberText } from '../../utils/exactNumber';
import { formatReportMoneyText, formatReportPercentText } from '../../utils/reportPresentation';

import ModernReportShell from '../../components/reports/ModernReportShell';
import PremiumStatCard from '../../components/reports/PremiumStatCard';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import ReportControlDock, {
  ReportControlDateSection,
  ReportControlFooter,
  ReportControlSearch,
  ReportControlStatus,
} from '../../components/reports/ReportControlDock';
import ReportFilterField from '../../components/reports/ReportFilterField';
import { AppSearchField, Button, DataTableShell, EmptyState, SelectField, Surface } from '@/components/ui';

const columnHelper = createColumnHelper<ProfitabilityAnalysisItem>();

const formatPrice = (v: number) => formatReportMoneyText(v ?? 0);
const formatNumber = (v: number) => formatExactNumberText(v ?? 0);
const formatPercent = (v: number) => formatReportPercentText(v ?? 0, 2, false);

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
  const [fromDate, setFromDate] = useState<Date | null>(() => moment().startOf('jMonth').startOf('day').toDate());
  const [toDate, setToDate] = useState<Date | null>(() => new Date());

  const from = useMemo(
    () => fromDate ? moment(fromDate).locale('en').format('jYYYY/jMM/jDD') : '',
    [fromDate],
  );
  const to = useMemo(
    () => toDate ? moment(toDate).locale('en').format('jYYYY/jMM/jDD') : '',
    [toDate],
  );

  const fetchReport = useCallback(async () => {
    if (!fromDate || !toDate) {
      setNotification({ type: 'warning', text: 'لطفاً تاریخ شروع و پایان گزارش سودآوری را انتخاب کنید.' });
      return;
    }
    if (fromDate.getTime() > toDate.getTime()) {
      setNotification({ type: 'warning', text: 'تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.' });
      return;
    }

    setIsLoading(true);
    try {
      const qs = new URLSearchParams({ fromDate: from, toDate: to });
      const res = await apiFetch(`/api/analysis/profitability?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت گزارش سودآوری');
      setReportData(json.data || []);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message || 'خطا در عملیاتی نامشخص' });
    } finally {
      setIsLoading(false);
    }
  }, [from, fromDate, to, toDate]);

  useEffect(() => {
    if (currentUser && currentUser.roleName === 'Salesperson') {
      setNotification({ type: 'error', text: 'شما اجازه دسترسی به این صفحه را ندارید.' });
      navigate('/reports/analysis');
      return;
    }
    void fetchReport();
  }, [currentUser, fetchReport, navigate]);

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
    downloadCsv(`profitability_report_${from.replace(/\//g, '-')}_${to.replace(/\//g, '-')}.csv`, rows.map((x) => ({
      itemName: x.itemName,
      totalQuantitySold: x.totalQuantitySold,
      totalRevenue: x.totalRevenue,
      totalCost: x.totalCost,
      grossProfit: x.grossProfit,
      profitMargin: x.profitMargin,
    })));
  };

  if (currentUser && currentUser.roleName === 'Salesperson') return null;

  return (
    <div className="report-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <ModernReportShell
        title="سودآوری کالاها"
        subtitle="نمایش سود ناخالص، هزینه و حاشیه سود به تفکیک کالا — مناسب تصمیم‌گیری خرید و قیمت‌گذاری."
        icon="fa-solid fa-sack-dollar"
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => navigate('/reports/analysis')}
            leftIcon={<i className="fa-solid fa-arrow-right" />}
          >
            بازگشت
          </Button>
        }
      >
        <div className="space-y-4">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="خلاصه سودآوری در بازه انتخابی">
            <PremiumStatCard label="درآمد در بازه انتخابی" value={formatPrice(totals.revenue)} hint="جمع مبلغ فروش کالاها در این بازه" icon={<i className="fa-solid fa-coins" />} tone="info" />
            <PremiumStatCard label="سود ناخالص در بازه انتخابی" value={formatPrice(totals.profit)} hint={`بهای تمام‌شده بازه: ${formatPrice(totals.cost)}`} icon={<i className="fa-solid fa-chart-line" />} tone={totals.profit < 0 ? 'bad' : 'good'} />
            <PremiumStatCard label="حاشیه سود در بازه انتخابی" value={formatPercent(totals.margin)} hint="نسبت سود ناخالص به درآمد همین بازه" icon={<i className="fa-solid fa-percent" />} tone={totals.margin < 0 ? 'bad' : 'neutral'} />
            <PremiumStatCard label="تعداد فروش در بازه انتخابی" value={formatNumber(totals.qty)} hint={`${formatNumber(totals.items)} قلم کالا در این بازه`} icon={<i className="fa-solid fa-bag-shopping" />} />
          </section>

          <ReportControlDock
            ariaLabel="کنترل‌های گزارش سودآوری"
            presentation="approved"
            title="کنترل گزارش"
            subtitle="بازه زمانی، جستجو و خروجی تحلیل سودآوری کالاها"
            icon={<i className="fa-solid fa-sliders" aria-hidden="true" />}
            footer={(
              <ReportControlFooter
                ariaLabel="عملیات و وضعیت گزارش سودآوری"
                statuses={(
                  <>
                    <ReportControlStatus tone="info" icon={<i className="fa-regular fa-calendar" aria-hidden="true" />}>
                      <span className="whitespace-nowrap">بازه فعال:</span>
                      <bdi dir="ltr" className="font-black">{from || '—'}</bdi>
                      <span aria-hidden="true" className="font-black text-[var(--ds-text-muted)]">|</span>
                      <bdi dir="ltr" className="font-black">{to || '—'}</bdi>
                    </ReportControlStatus>
                    <ReportControlStatus tone="neutral" icon={<i className="fa-solid fa-list-ol" aria-hidden="true" />}>
                      <span>{formatNumber(table.getFilteredRowModel().rows.length)} ردیف نتیجه</span>
                    </ReportControlStatus>
                  </>
                )}
                actions={(
                  <>
                    <Button type="button" variant="secondary" size="md" onClick={handleExport} disabled={isLoading || table.getFilteredRowModel().rows.length === 0} leftIcon={<i className="fa-solid fa-file-csv" />} className="report-control-approved__export-button">
                      خروجی CSV
                    </Button>
                    <Button type="button" variant="primary" size="md" onClick={() => void fetchReport()} disabled={isLoading || !fromDate || !toDate} loading={isLoading} loadingText="در حال به‌روزرسانی…" leftIcon={<i className="fa-solid fa-rotate" />} className="report-control-approved__primary-button">
                      محاسبه / به‌روزرسانی
                    </Button>
                  </>
                )}
              />
            )}
          >
            <ReportControlDateSection
              presets={(
                <ReportDatePresetChips
                  fromDate={fromDate}
                  toDate={toDate}
                  compact
                  includeLast30
                  className="report-control-approved__presets"
                  onChange={({ from: nextFrom, to: nextTo }) => {
                    setFromDate(nextFrom);
                    setToDate(nextTo);
                  }}
                />
              )}
              fromField={(
                <ReportFilterField
                  label="از تاریخ"
                  icon={<i className="fa-regular fa-calendar" />}
                  className="report-control-approved__field"
                  minWidthClassName="min-w-0"
                >
                  <ShamsiDatePicker selectedDate={fromDate} onDateChange={setFromDate} size="standard" />
                </ReportFilterField>
              )}
              toField={(
                <ReportFilterField
                  label="تا تاریخ"
                  icon={<i className="fa-regular fa-calendar-check" />}
                  className="report-control-approved__field"
                  minWidthClassName="min-w-0"
                >
                  <ShamsiDatePicker selectedDate={toDate} onDateChange={setToDate} size="standard" />
                </ReportFilterField>
              )}
            />

            <ReportControlSearch>
              <ReportFilterField
                label="جستجو و فیلتر"
                icon={<i className="fa-solid fa-magnifying-glass" />}
                className="report-control-approved__field"
                minWidthClassName="min-w-0"
              >
                <AppSearchField
                  value={globalFilter}
                  onChange={setGlobalFilter}
                  placeholder="جستجو در نام کالا…"
                  ariaLabel="جستجو در گزارش سودآوری کالاها"
                  size="md"
                  clearable
                />
              </ReportFilterField>
            </ReportControlSearch>
          </ReportControlDock>

          <DataTableShell
            headerLayout="compact"
            title="سودآوری به تفکیک کالا"
            titleIcon={<i className="fa-solid fa-sack-dollar" aria-hidden="true" />}
            meta={(
              <div className="ux-table-shell__meta-pill">
                <i className="fa-solid fa-list-ol" aria-hidden="true" />
                <span>صفحه {formatNumber(table.getState().pagination.pageIndex + 1)} از {formatNumber(Math.max(1, table.getPageCount()))}</span>
              </div>
            )}
            actions={(
              <div className="w-full min-w-[9rem] sm:w-[9rem] lg:w-[9.5rem]">
                <SelectField
                  controlOnly
                  size="sm"
                  value={String(table.getState().pagination.pageSize)}
                  onValueChange={(value) => table.setPageSize(Number(value))}
                  ariaLabel="تعداد ردیف در صفحه"
                  options={[
                    { value: '10', label: '۱۰ ردیف' },
                    { value: '20', label: '۲۰ ردیف' },
                    { value: '50', label: '۵۰ ردیف' },
                  ]}
                />
              </div>
            )}
            aria-label="جدول سودآوری کالاها"
          >
            {isLoading ? (
              <div className="flex min-h-52 items-center justify-center gap-3 text-sm font-bold text-slate-500 dark:text-slate-400">
                <i className="fa-solid fa-spinner fa-spin" />
                در حال دریافت اطلاعات…
              </div>
            ) : reportData.length === 0 ? (
              <EmptyState title="داده‌ای برای نمایش وجود ندارد" description="پس از ثبت فروش و بهای خرید، تحلیل سودآوری کالاها در این بخش نمایش داده می‌شود." />
            ) : table.getRowModel().rows.length === 0 ? (
              <EmptyState title="کالایی با این جستجو پیدا نشد" description="عبارت جستجو را تغییر دهید یا فیلتر را پاک کنید." />
            ) : (
              <>
                <div className="hidden lg:block">
                  <table className="report-table ux-data-table w-full table-fixed" data-ui-table="true" data-ui-table-layout="managed" data-ui-bidi-scope="rtl-table">
                    <colgroup>
                      <col className="w-[24%]" />
                      <col className="w-[10%]" />
                      <col className="w-[17%]" />
                      <col className="w-[17%]" />
                      <col className="w-[17%]" />
                      <col className="w-[15%]" />
                    </colgroup>
                    <thead>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th key={header.id} colSpan={header.colSpan}>
                              {header.isPlaceholder ? null : (
                                <button
                                  type="button"
                                  data-skip-global-button="true"
                                  className="flex w-full min-w-0 items-center justify-start gap-1 bg-transparent p-0 text-right font-black"
                                  onClick={header.column.getToggleSortingHandler()}
                                  disabled={!header.column.getCanSort()}
                                >
                                  <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                                  {header.column.getIsSorted() === 'asc' ? <i className="fa-solid fa-caret-up shrink-0" /> : null}
                                  {header.column.getIsSorted() === 'desc' ? <i className="fa-solid fa-caret-down shrink-0" /> : null}
                                </button>
                              )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map((row) => (
                        <tr key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id}>
                              <div className="min-w-0 truncate" title={String(cell.getValue() ?? '')}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 p-3 lg:hidden">
                  {table.getRowModel().rows.map((row) => {
                    const item = row.original;
                    return (
                      <Surface key={row.id} surface="glass" variant="subtle" scheme="adaptive" className="rounded-[20px]" contentClassName="p-4">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-slate-950 dark:text-white" title={item.itemName}>{item.itemName}</div>
                          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                            <div><dt className="font-bold text-slate-500 dark:text-slate-400">تعداد فروش</dt><dd className="mt-1 font-black text-slate-900 dark:text-slate-100">{formatNumber(item.totalQuantitySold)}</dd></div>
                            <div><dt className="font-bold text-slate-500 dark:text-slate-400">حاشیه سود</dt><dd className="mt-1 font-black text-slate-900 dark:text-slate-100">{formatPercent(item.profitMargin)}</dd></div>
                            <div><dt className="font-bold text-slate-500 dark:text-slate-400">درآمد کل</dt><dd className="mt-1 font-black text-slate-900 dark:text-slate-100">{formatPrice(item.totalRevenue)}</dd></div>
                            <div><dt className="font-bold text-slate-500 dark:text-slate-400">بهای تمام‌شده</dt><dd className="mt-1 font-black text-slate-900 dark:text-slate-100">{formatPrice(item.totalCost)}</dd></div>
                            <div className="col-span-2"><dt className="font-bold text-slate-500 dark:text-slate-400">سود ناخالص</dt><dd className={`mt-1 font-black ${item.grossProfit < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{formatPrice(item.grossProfit)}</dd></div>
                          </dl>
                        </div>
                      </Surface>
                    );
                  })}
                </div>
              </>
            )}
          </DataTableShell>

          {reportData.length > 0 ? (
            <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-[20px]" contentClassName="p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  صفحه {formatNumber(table.getState().pagination.pageIndex + 1)} از {formatNumber(Math.max(1, table.getPageCount()))}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                  <Button type="button" variant="secondary" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} leftIcon={<i className="fa-solid fa-chevron-right" />}>قبلی</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} rightIcon={<i className="fa-solid fa-chevron-left" />}>بعدی</Button>
                </div>
              </div>
            </Surface>
          ) : null}
        </div>
      </ModernReportShell>
    </div>
  );
};

export default ProfitabilityReport;
