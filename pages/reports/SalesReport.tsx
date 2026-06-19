// pages/reports/SalesReportPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import moment from 'jalali-moment';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';

import { SalesSummaryData, NotificationMessage, TopSellingItem } from '../../types';
import Notification from '../../components/Notification';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import { formatIsoToShamsi } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeaders } from '../../utils/apiUtils';
import ProGate from '../../components/ProGate';
import { useReportsExports } from '../../contexts/ReportsExportsContext';
import ExcelJS from 'exceljs';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

// جلوگیری از جابجایی یک روزه به خاطر timezone (به خصوص وقتی از ISO ذخیره تغییرات/بازیابی می‌کنیم)
const toMidday = (d: Date) => {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
};

const formatPrice = (n: number) =>
  formatCurrencyText(Math.round(Number(n || 0)), readStoredCurrencyUnit());

const columnHelper = createColumnHelper<TopSellingItem>();

const SalesReportPage: React.FC = () => {
  const { token } = useAuth();
  const { registerReportExports } = useReportsExports();
  const [reportData, setReportData] = useState<SalesSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [startDate, setStartDate] = useState<Date | null>(moment().subtract(30, 'days').toDate());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [globalFilter, setGlobalFilter] = useState('');

  const fetchSalesReport = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      if (startDate) qs.set('fromDate', moment(toMidday(startDate)).locale('en').format('jYYYY/jMM/jDD'));
      if (endDate) qs.set('toDate', moment(toMidday(endDate)).locale('en').format('jYYYY/jMM/jDD'));
      const res = await fetch(`/api/reports/sales-summary?${qs.toString()}`, { headers: getAuthHeaders(token) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت گزارش فروش و سود');
      setReportData(json.data);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message || 'خطا در عملیاتی نامشخص' });
    } finally {
      setIsLoading(false);
    }
  };

  // نکته مهم: ذخیره تغییرات ISO (UTC) برای تاریخ‌ها روی سیستم‌هایی با timezone متفاوت
  // ممکن است باعث جابجایی یک روزه در نمایش جلالی شود. برای جلوگیری، بازه را به فرمت جلالی ذخیره تغییرات می‌کنیم.
  useEffect(() => {
    if (!token) return;
    const t = window.setTimeout(() => {
      fetchSalesReport();
    }, 250);
    return () => window.clearTimeout(t);
    // وقتی تاریخ‌ها یا توکن تغییر کنند، گزارش را دوباره بگیر
  }, [token, startDate, endDate]);

  // ✅ خروجی Excel کامل: همه ردیف‌های فیلترشده (نه فقط ۱۰ ردیف صفحه فعلی)
  useEffect(() => {
    registerReportExports({
      excel: async () => {
        if (!reportData) return;

        const allRows = table.getFilteredRowModel().rows.map((r) => r.original);

        const wb = new ExcelJS.Workbook();
        wb.creator = 'Kourosh';
        wb.created = new Date();

        const ws = wb.addWorksheet('Report', {
          views: [{ rightToLeft: true, state: 'frozen', ySplit: 4 }],
          pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
        });

        const BASE_FONT = 'Vazir';
        const setFont = (cell: ExcelJS.Cell, patch: Partial<ExcelJS.Font> = {}) => {
          const prev = (cell.font || {}) as ExcelJS.Font;
          cell.font = { name: BASE_FONT, size: (prev as any).size ?? 11, ...(prev as any), ...(patch as any) } as any;
        };

        // عنوان
        ws.addRow(['گزارش فروش و سود']);
        ws.mergeCells(1, 1, 1, 4);
        const t = ws.getCell(1, 1);
        t.font = { name: BASE_FONT, bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
        t.alignment = { vertical: 'middle', horizontal: 'center' };
        t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
        ws.getRow(1).height = 26;

        const fromJ = startDate ? moment(toMidday(startDate)).locale('en').format('jYYYY/jMM/jDD') : '';
        const toJ = endDate ? moment(toMidday(endDate)).locale('en').format('jYYYY/jMM/jDD') : '';

        // از/تا
        ws.addRow(['از', fromJ, 'تا', toJ]);
        ws.getRow(2).eachCell((cell) => {
          setFont(cell, { bold: true });
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          };
        });

        // چند KPI خلاصه
        ws.addRow(['مجموع درآمد', reportData.totalRevenue, 'سود ناخالص', reportData.grossProfit]);
        ws.getRow(3).eachCell((cell) => {
          setFont(cell, { bold: true });
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        ws.addRow([]);

        // هدر جدول
        const header = ['نام کالا/محصول', 'نوع', 'تعداد فروخته شده', 'مجموع درآمد'];
        const hr = ws.addRow(header);
        hr.height = 20;
        hr.eachCell((cell) => {
          cell.font = { name: BASE_FONT, bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF94A3B8' } },
            left: { style: 'thin', color: { argb: 'FF94A3B8' } },
            bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
            right: { style: 'thin', color: { argb: 'FF94A3B8' } },
          };
        });

        // همه ردیف‌ها (تمام محصولات)
        for (let i = 0; i < allRows.length; i++) {
          const r = allRows[i];
          const row = ws.addRow([
            r.itemName,
            r.itemType === 'phone' ? 'گوشی موبایل' : 'کالای انبار',
            Number(r.quantitySold || 0),
            Number(r.totalRevenue || 0),
          ]);

          row.eachCell((cell, col) => {
            setFont(cell);
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };
            if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            cell.alignment = { vertical: 'middle', horizontal: col <= 2 ? 'right' : 'center', wrapText: true };
            if (col === 3 || col === 4) cell.numFmt = '#,##0';
          });
        }

        // عرض ستون‌ها
        ws.getColumn(1).width = 42;
        ws.getColumn(2).width = 16;
        ws.getColumn(3).width = 18;
        ws.getColumn(4).width = 18;

        const buf = await wb.xlsx.writeBuffer();
        const blob = new Blob([buf], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-summary-${fromJ || 'from'}-${toJ || 'to'}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      },
    });
    // ریجستر دوباره با تغییر دیتا/فیلترها
  }, [registerReportExports, reportData, startDate, endDate, globalFilter]);

  const ExecutiveMetricCard: React.FC<{
    label: string;
    value: string | number;
    hint?: string;
    icon: string;
    tone?: 'default' | 'success' | 'warning' | 'danger';
  }> = ({ label, value, hint, icon, tone = 'default' }) => (
    <div className={`sales-exec-metric sales-exec-metric--${tone}`}>
      <div className="sales-exec-metric__icon"><i className={icon} /></div>
      <div className="sales-exec-metric__body">
        <div className="sales-exec-metric__label">{label}</div>
        <div className="sales-exec-metric__value">{typeof value === 'number' ? formatPrice(value) : value}</div>
        {hint ? <div className="sales-exec-metric__hint">{hint}</div> : null}
      </div>
    </div>
  );

  const buildItemPath = (item: TopSellingItem) => {
    const q = encodeURIComponent(item.itemName || '');
    return item.itemType === 'phone' ? `/mobile-phones?search=${q}` : `/products?search=${q}`;
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('itemName', {
        header: 'کالا / محصول',
        cell: (info) => {
          const item = info.row.original;
          return (
            <Link to={buildItemPath(item)} className="sales-report-item-link" title="رفتن به پرونده کالا">
              {info.getValue()}
            </Link>
          );
        },
      }),
      columnHelper.accessor('itemType', {
        header: 'نوع',
        cell: (info) => (
          <span className="sales-report-type-pill">
            {info.getValue() === 'phone' ? 'گوشی موبایل' : 'کالای انبار'}
          </span>
        ),
      }),
      columnHelper.accessor('quantitySold', {
        header: 'تعداد فروش',
        cell: (info) => info.getValue().toLocaleString('fa-IR'),
      }),
      columnHelper.accessor('totalRevenue', {
        header: 'درآمد فروش',
        cell: (info) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100">{formatPrice(info.getValue())}</span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'عملیات',
        cell: ({ row }) => (
          <Link to={buildItemPath(row.original)} className="report-row-action report-row-action--compact">
            پرونده کالا
          </Link>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: reportData?.topSellingItems || [],
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } }, // صفحه‌بندی پیش‌فرض ۱۰تایی
  });

  const isDark = document.documentElement.classList.contains('dark');
  const axisColor = isDark ? '#9CA3AF' : '#6B7280';
  const gridColor = isDark ? '#334155' : '#e0e0e0';
  const tooltipBg = isDark ? '#0b1220' : '#ffffff';
  const tooltipBorder = isDark ? '#1f2937' : '#e0e0e0';
  const labelColor = isDark ? '#E5E7EB' : '#374151';

  const grossMarginPct = reportData?.totalRevenue
    ? Math.round((Number(reportData.grossProfit || 0) / Number(reportData.totalRevenue || 1)) * 1000) / 10
    : 0;
  const itemCount = reportData?.topSellingItems?.length || 0;
  const topItem = reportData?.topSellingItems?.[0];

  return (
    <ProGate featureName="گزارش فروش و سود">
      <div className="report-page sales-report-executive" dir="rtl">
        <Notification message={notification} onClose={() => setNotification(null)} />

        <div className="report-exec-filter-card">
          <div className="report-exec-filter-card__presets">
            <ReportDatePresetChips
              fromDate={startDate}
              toDate={endDate}
              includeLast30={false}
              onChange={({ from, to }) => { setStartDate(from); setEndDate(to); }}
            />
          </div>
          <div className="report-exec-filter-field">
            <label>از تاریخ</label>
            <ShamsiDatePicker selectedDate={startDate} onDateChange={setStartDate} inputClassName="report-filter-control report-exec-date-input" />
          </div>
          <div className="report-exec-filter-field">
            <label>تا تاریخ</label>
            <ShamsiDatePicker selectedDate={endDate} onDateChange={(d) => setEndDate(d && startDate && d < startDate ? startDate : d)} inputClassName="report-filter-control report-exec-date-input" />
          </div>
          <button onClick={fetchSalesReport} disabled={isLoading || !token} className="report-exec-refresh-button">
            {isLoading ? <i className="fas fa-spinner fa-spin" /> : <i className="fa-solid fa-rotate" />}
            <span>{isLoading ? 'در حال دریافت' : 'به‌روزرسانی'}</span>
          </button>
        </div>

        {isLoading && !reportData && (
          <div className="report-empty-state"><i className="fas fa-spinner fa-spin" /><p>در حال دریافت اطلاعات گزارش...</p></div>
        )}

        {!isLoading && !reportData && (
          <div className="report-empty-state"><i className="fas fa-info-circle" /><p>گزارشی برای نمایش وجود ندارد. بازه را انتخاب و به‌روزرسانی را بزنید.</p></div>
        )}

        {reportData && (
          <div className="space-y-4">
            <section className="report-exec-section">
              <div className="report-exec-section__head">
                <div><h3>خلاصه فروش</h3><p>شاخص‌های اصلی فروش و سود ناخالص در بازه انتخابی.</p></div>
                <div className="report-exec-section__actions">
                  <Link to="/reports/financial-overview" className="report-row-action report-row-action--compact">نمای مالی</Link>
                  <Link to="/reports/realized-profit" className="report-row-action report-row-action--compact">سود وصول‌شده</Link>
                </div>
              </div>
              <div className="sales-exec-metric-grid sales-exec-metric-grid--primary">
                <ExecutiveMetricCard label="جمع فروش" value={reportData.totalRevenue} hint={`${reportData.totalTransactions.toLocaleString('fa-IR')} تراکنش`} icon="fa-solid fa-sack-dollar" />
                <ExecutiveMetricCard label="سود ناخالص" value={reportData.grossProfit} hint="قبل از هزینه‌ها و وصول" icon="fa-solid fa-chart-line" tone={Number(reportData.grossProfit || 0) < 0 ? 'danger' : 'success'} />
                <ExecutiveMetricCard label="حاشیه سود ناخالص" value={`${grossMarginPct.toLocaleString('fa-IR')}٪`} hint="سود ناخالص نسبت به فروش" icon="fa-solid fa-percent" />
                <ExecutiveMetricCard label="میانگین ارزش فروش" value={reportData.averageSaleValue} hint="میانگین مبلغ هر تراکنش" icon="fa-solid fa-calculator" />
              </div>
            </section>

            <section className="report-exec-section">
              <div className="report-exec-section__head">
                <div><h3>کنترل عملیاتی فروش</h3><p>روند فروش و کالاهای پرفروش؛ برای سود وصول‌شده از گزارش تخصصی استفاده کن.</p></div>
                <div className="report-exec-section__actions">
                  <Link to="/reports/product-sales" className="report-row-action report-row-action--compact">فروش کالا و خدمات</Link>
                  <Link to="/reports/phone-sales" className="report-row-action report-row-action--compact">فروش موبایل نقدی</Link>
                </div>
              </div>
              <div className="sales-exec-metric-grid sales-exec-metric-grid--secondary">
                <ExecutiveMetricCard label="تعداد اقلام گزارش" value={itemCount.toLocaleString('fa-IR')} hint="کالاها و موبایل‌های فروخته‌شده" icon="fa-solid fa-boxes-stacked" />
                <ExecutiveMetricCard label="پرفروش‌ترین قلم" value={topItem?.itemName || '—'} hint={topItem ? formatPrice(topItem.totalRevenue) : 'داده‌ای ثبت نشده'} icon="fa-solid fa-crown" />
              </div>
            </section>

            {reportData.dailySales?.length ? (
              <section className="report-exec-section">
                <div className="report-exec-section__head"><div><h3>روند روزانه فروش</h3><p>برای تشخیص افت‌وخیز فروش در بازه انتخابی.</p></div></div>
                <div className="sales-exec-chart-card">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData.dailySales} margin={{ top: 5, right: 0, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(t) => formatIsoToShamsi(t)} tick={{ fontSize: 11, fill: axisColor }} axisLine={{ stroke: gridColor }} tickLine={{ stroke: gridColor }} angle={-30} textAnchor="end" height={50} interval={Math.max(0, Math.floor((reportData.dailySales.length || 1) / 10))} />
                      <YAxis orientation="right" tick={{ fontSize: 12, fill: axisColor }} axisLine={false} tickLine={false} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} />
                      <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderRadius: '12px', border: `1px solid ${tooltipBorder}`, direction: 'rtl' }} itemStyle={{ color: '#1D4ED8' }} labelStyle={{ color: labelColor, fontWeight: 'bold' }} formatter={(v: number) => [formatPrice(v), 'فروش روز']} labelFormatter={(l: string) => `تاریخ: ${formatIsoToShamsi(l)}`} />
                      <Legend wrapperStyle={{ fontSize: 13, direction: 'rtl', color: axisColor }} />
                      <Line type="monotone" dataKey="totalSales" stroke="#1D4ED8" strokeWidth={2.5} activeDot={{ r: 5 }} name="مجموع فروش روزانه" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            ) : null}

            {reportData.topSellingItems && (
              <section className="report-exec-section report-exec-table-section">
                <div className="report-exec-section__head">
                  <div><h3>اقلام پرفروش</h3><p>رتبه‌بندی کالا و موبایل بر اساس درآمد فروش.</p></div>
                  <div className="report-exec-table-search"><i className="fa-solid fa-magnifying-glass" /><input type="text" placeholder="جستجو در جدول..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} /></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="sales-exec-table">
                    <thead>{table.getHeaderGroups().map((hg) => (<tr key={hg.id}>{hg.headers.map((h) => (<th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>))}</tr>))}</thead>
                    <tbody>{table.getRowModel().rows.map((row) => (<tr key={row.id}>{row.getVisibleCells().map((cell) => (<td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>))}</tr>))}</tbody>
                  </table>
                </div>

                {table.getPageCount() > 1 && (
                  <div className="sales-exec-pagination">
                    <div className="flex items-center gap-2"><button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>«</button><button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>‹</button><button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>›</button><button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>»</button></div>
                    <div className="text-slate-500">صفحه <strong>{table.getState().pagination.pageIndex + 1}</strong> از <strong>{table.getPageCount()}</strong></div>
                    <select value={table.getState().pagination.pageSize} onChange={(e) => table.setPageSize(Number(e.target.value))}><option value="10">نمایش ۱۰</option><option value="20">نمایش ۲۰</option></select>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </ProGate>
  );
};

export default SalesReportPage;
