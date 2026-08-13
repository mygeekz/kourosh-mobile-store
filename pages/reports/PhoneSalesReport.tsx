import { ActionLink, AppSearchField, Button, DataTableShell, EmptyState, PanelCard, SelectField, Surface, SurfaceHeader } from '@/components/ui';
// pages/reports/PhoneSalesReportPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { reportNavigationAnchor, useReportDrilldownNavigation } from '../../hooks/useReportDrilldownNavigation';
import moment from 'jalali-moment';

import { PhoneSaleProfitReportItem, NotificationMessage } from '../../types';
import Notification from '../../components/Notification';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import ReportControlDock, {
  ReportControlDateSection,
  ReportControlFooter,
  ReportControlSearch,
  ReportControlStatus,
} from '../../components/reports/ReportControlDock';
import ReportFilterField from '../../components/reports/ReportFilterField';
import { formatIsoToShamsi } from '../../utils/dateUtils';
import { apiFetch } from '../../utils/apiFetch';
import { formatReportMoneyText, formatReportPercentText } from '../../utils/reportPresentation';
import { formatExactNumberText } from '../../utils/exactNumber';

const toShamsiStr = (d: Date) => moment(d).locale('en').format('jYYYY/jMM/jDD');
const money = (v: number) => formatReportMoneyText(v ?? 0);
const faNum = (v: number) => formatExactNumberText(v || 0);

const statTone = (v: number): 'success' | 'danger' | 'neutral' => (v > 0 ? 'success' : v < 0 ? 'danger' : 'neutral');
const profitTextClass = (v: number) => (v > 0
  ? 'text-emerald-700 dark:text-emerald-300'
  : v < 0
    ? 'text-rose-700 dark:text-rose-300'
    : 'text-slate-950 dark:text-slate-50');

const PhoneSalesReportPage: React.FC = () => {
  const [reportData, setReportData] = useState<PhoneSaleProfitReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [startDate, setStartDate] = useState<Date | null>(moment().startOf('jMonth').toDate());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const suppressPageResetRef = React.useRef(false);

  const fetchPhoneSales = async () => {
    if (!startDate || !endDate) {
      setNotification({ type: 'warning', text: 'لطفاً تاریخ شروع و پایان را انتخاب کنید.' });
      return;
    }

    const fromDate = toShamsiStr(startDate);
    const toDate = toShamsiStr(endDate);

    try {
      setIsLoading(true);
      setNotification(null);
      const res = await apiFetch(`/api/reports/phone-sales?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'خطا در دریافت گزارش فروش نقدی موبایل');
      }
      setReportData(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setReportData([]);
      setNotification({ type: 'error', text: e.message || 'خطا در دریافت گزارش فروش نقدی موبایل' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchPhoneSales();
    }, 220);
    return () => window.clearTimeout(timer);
    // Restored report dates must reload the matching range; the short debounce coalesces paired date restores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  useEffect(() => {
    if (suppressPageResetRef.current) {
      suppressPageResetRef.current = false;
      return;
    }
    setPageIndex(0);
  }, [searchQuery, pageSize]);

  const reportUiState = useMemo(() => ({
    startDate: startDate?.toISOString() || '',
    endDate: endDate?.toISOString() || '',
    searchQuery,
    pageSize,
    pageIndex: Number(pageIndex || 0),
  }), [endDate, pageIndex, pageSize, searchQuery, startDate]);

  const restoreReportUiState = React.useCallback((state: Record<string, unknown>) => {
    suppressPageResetRef.current = true;
    if (state.startDate) setStartDate(new Date(String(state.startDate)));
    if (state.endDate) setEndDate(new Date(String(state.endDate)));
    setSearchQuery(String(state.searchQuery || ''));
    setPageSize([10, 20, 50].includes(Number(state.pageSize)) ? Number(state.pageSize) : 10);
    setPageIndex(Math.max(0, Number(state.pageIndex || 0)));
  }, []);

  const { onDrilldownClick } = useReportDrilldownNavigation({
    reportKey: 'phone-sales',
    uiState: reportUiState,
    restoreUiState: restoreReportUiState,
  });

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reportData;
    return reportData.filter((row) => {
      const haystack = [
        row.phoneModel,
        row.imei,
        row.customerFullName || 'مهمان',
        String(row.transactionId),
        formatIsoToShamsi(row.transactionDate),
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [reportData, searchQuery]);

  const totalRevenue = filteredRows.reduce((sum, row) => sum + (row.totalPrice ?? 0), 0);
  const totalProfit = filteredRows.reduce((sum, row) => sum + (row.profit ?? 0), 0);
  const count = filteredRows.length;
  const avgProfit = count ? totalProfit / count : 0;
  const margin = totalRevenue ? (totalProfit / totalRevenue) * 100 : 0;

  const topModels = useMemo(() => {
    const map = new Map<string, { model: string; revenue: number; profit: number; count: number }>();
    for (const row of filteredRows) {
      const model = (row.phoneModel || 'نامشخص').trim();
      const cur = map.get(model) || { model, revenue: 0, profit: 0, count: 0 };
      cur.revenue += row.totalPrice ?? 0;
      cur.profit += row.profit ?? 0;
      cur.count += 1;
      map.set(model, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  }, [filteredRows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageRows = filteredRows.slice(safePageIndex * pageSize, safePageIndex * pageSize + pageSize);
  const visibleStart = filteredRows.length ? safePageIndex * pageSize + 1 : 0;
  const visibleEnd = Math.min(filteredRows.length, (safePageIndex + 1) * pageSize);

  const summaryCards: Array<{ label: string; value: string; hint: string; icon: string; tone: 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger' }> = [
    { label: 'تعداد فروش نقدی', value: `${faNum(count)} ردیف`, hint: 'فروش گوشی ثبت‌شده در بازه', icon: 'fa-mobile-screen-button', tone: 'info' },
    { label: 'جمع فروش نقدی', value: money(totalRevenue), hint: 'ارزش فروش نقدی موبایل', icon: 'fa-sack-dollar', tone: 'info' },
    { label: 'سود نقدی', value: money(totalProfit), hint: `حاشیه سود: ${formatReportPercentText(margin, 1)}`, icon: 'fa-chart-line', tone: statTone(totalProfit) },
    { label: 'میانگین سود هر فروش', value: money(avgProfit), hint: 'میانگین سود به ازای هر دستگاه', icon: 'fa-percent', tone: statTone(avgProfit) },
  ];

  return (
    <div className="report-page flex flex-col gap-4" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <ReportControlDock
        ariaLabel="کنترل گزارش فروش نقدی گوشی"
        presentation="approved"
        title="کنترل گزارش"
        subtitle="بازه زمانی، جستجو و به‌روزرسانی فروش نقدی گوشی"
        icon={<i className="fa-solid fa-sliders" aria-hidden="true" />}
        footer={(
          <ReportControlFooter
            ariaLabel="عملیات و وضعیت فروش نقدی گوشی"
            statuses={(
              <>
                <ReportControlStatus tone="neutral" icon={<i className="fa-solid fa-money-bill-wave" aria-hidden="true" />}>
                  <span>فروش نقدی گوشی</span>
                </ReportControlStatus>
                <ReportControlStatus tone="info" icon={<i className="fa-regular fa-calendar" aria-hidden="true" />}>
                  <span className="whitespace-nowrap">بازه فعال:</span>
                  <bdi dir="ltr" className="font-black">{startDate ? toShamsiStr(startDate) : '—'}</bdi>
                  <span aria-hidden="true" className="font-black text-[var(--ds-text-muted)]">|</span>
                  <bdi dir="ltr" className="font-black">{endDate ? toShamsiStr(endDate) : '—'}</bdi>
                </ReportControlStatus>
                <ReportControlStatus tone="neutral" icon={<i className="fa-solid fa-list-ol" aria-hidden="true" />}>
                  <span>{faNum(filteredRows.length)} ردیف نتیجه</span>
                </ReportControlStatus>
              </>
            )}
            actions={(
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => void fetchPhoneSales()}
                disabled={isLoading || !startDate || !endDate}
                loading={isLoading}
                loadingText="در حال دریافت…"
                leftIcon={<i className="fa-solid fa-rotate" aria-hidden="true" />}
                className="report-control-approved__primary-button"
              >
                محاسبه / به‌روزرسانی
              </Button>
            )}
          />
        )}
      >
        <ReportControlDateSection
          presets={(
            <ReportDatePresetChips
              fromDate={startDate}
              toDate={endDate}
              includeLast30
              compact
              className="report-control-approved__presets"
              onChange={({ from, to }) => { setStartDate(from); setEndDate(to); }}
            />
          )}
          fromField={(
            <ReportFilterField label="از تاریخ" icon={<i className="fa-regular fa-calendar" />} className="report-control-approved__field" minWidthClassName="min-w-0">
              <ShamsiDatePicker selectedDate={startDate} onDateChange={setStartDate} size="standard" />
            </ReportFilterField>
          )}
          toField={(
            <ReportFilterField label="تا تاریخ" icon={<i className="fa-regular fa-calendar-check" />} className="report-control-approved__field" minWidthClassName="min-w-0">
              <ShamsiDatePicker selectedDate={endDate} onDateChange={(date) => setEndDate(date && startDate && date < startDate ? startDate : date)} size="standard" />
            </ReportFilterField>
          )}
        />

        <ReportControlSearch>
          <ReportFilterField label="جستجو" icon={<i className="fa-solid fa-magnifying-glass" />} className="report-control-approved__field" minWidthClassName="min-w-0">
            <AppSearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="مدل گوشی، IMEI، مشتری یا شماره سند…"
              ariaLabel="جستجو در گزارش فروش نقدی گوشی"
              size="md"
              clearable
            />
          </ReportFilterField>
        </ReportControlSearch>
      </ReportControlDock>

      <section className="space-y-3" aria-label="خلاصه فروش نقدی موبایل">
        <SurfaceHeader
          kind="section"
          density="compact"
          title="خلاصه فروش نقدی موبایل"
          subtitle="شاخص‌های اصلی فروش نقدی گوشی، سود و میانگین عملکرد در بازه انتخابی."
          icon={<i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />}
          titleAs="h2"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <PanelCard
              key={card.label}
              title={card.label}
              icon={<i className={`fa-solid ${card.icon}`} aria-hidden="true" />}
              tone={card.tone}
              density="compact"
              headerDivider={false}
              bodyClassName="pt-0"
            >
              <div className={`break-words text-base font-black leading-7 sm:text-lg ${card.tone === 'success' ? 'text-emerald-700 dark:text-emerald-300' : card.tone === 'danger' ? 'text-rose-700 dark:text-rose-300' : card.tone === 'info' ? 'text-sky-700 dark:text-sky-300' : 'text-slate-950 dark:text-slate-50'}`}>{card.value}</div>
              <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{card.hint}</div>
            </PanelCard>
          ))}
        </div>
      </section>

      {topModels.length > 0 ? (
        <section className="space-y-3" aria-label="مدل‌های پرفروش نقدی">
          <SurfaceHeader
            kind="section"
            density="compact"
            title="مدل‌های پرفروش نقدی"
            subtitle="مدل‌هایی که بیشترین فروش نقدی را در بازه انتخابی داشته‌اند."
            icon={<i className="fa-solid fa-ranking-star" aria-hidden="true" />}
            titleAs="h2"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {topModels.map((model, index) => (
              <Surface key={model.model} surface="glass" variant="subtle" scheme="adaptive" className="rounded-[20px]" contentClassName="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 text-right">
                    <strong className="block truncate text-sm font-black text-slate-950 dark:text-slate-50" title={model.model}>{model.model}</strong>
                    <span className="mt-1 block text-xs font-bold text-slate-500 dark:text-slate-400">{faNum(model.count)} فروش</span>
                  </div>
                  <span className="inline-flex min-h-7 shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">#{faNum(index + 1)}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-right text-xs">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/70">
                    <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">فروش</span>
                    <strong className="mt-1 block font-black text-slate-950 dark:text-slate-50">{money(model.revenue)}</strong>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/70">
                    <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">سود</span>
                    <strong className={`mt-1 block font-black ${profitTextClass(model.profit)}`}>{money(model.profit)}</strong>
                  </div>
                </div>
              </Surface>
            ))}
          </div>
        </section>
      ) : null}

      <DataTableShell
        headerLayout="compact"
        kicker="جدول داده"
        title="جزئیات فروش نقدی موبایل"
        titleIcon={<i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />}
        meta={(
          <>
            <i className="fa-solid fa-list-ol" aria-hidden="true" />
            <span>نمایش {faNum(visibleStart)} تا {faNum(visibleEnd)} از {faNum(filteredRows.length)} ردیف</span>
          </>
        )}
        actions={(
          <div className="w-full min-w-[9rem] sm:w-[9rem] lg:w-[9.5rem]">
            <SelectField
              controlOnly
              size="sm"
              ariaLabel="تعداد ردیف در صفحه"
              value={String(pageSize)}
              onValueChange={(value) => setPageSize(Number(value))}
              options={[
                { value: '10', label: '۱۰ ردیف' },
                { value: '20', label: '۲۰ ردیف' },
                { value: '50', label: '۵۰ ردیف' },
              ]}
            />
          </div>
        )}
        footer={filteredRows.length > 0 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 sm:text-right">
              صفحه {faNum(safePageIndex + 1)} از {faNum(pageCount)}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Button type="button" variant="secondary" size="sm" disabled={safePageIndex <= 0} onClick={() => setPageIndex(0)} leftIcon={<i className="fa-solid fa-angles-right" aria-hidden="true" />}>اول</Button>
              <Button type="button" variant="secondary" size="sm" disabled={safePageIndex <= 0} onClick={() => setPageIndex((value) => Math.max(0, value - 1))} leftIcon={<i className="fa-solid fa-chevron-right" aria-hidden="true" />}>قبلی</Button>
              <Button type="button" variant="secondary" size="sm" disabled={safePageIndex >= pageCount - 1} onClick={() => setPageIndex((value) => Math.min(pageCount - 1, value + 1))} rightIcon={<i className="fa-solid fa-chevron-left" aria-hidden="true" />}>بعدی</Button>
              <Button type="button" variant="secondary" size="sm" disabled={safePageIndex >= pageCount - 1} onClick={() => setPageIndex(pageCount - 1)} rightIcon={<i className="fa-solid fa-angles-left" aria-hidden="true" />}>آخر</Button>
            </div>
          </div>
        ) : undefined}
        aria-label="جدول جزئیات فروش نقدی موبایل"
      >
        {isLoading ? (
          <div className="flex min-h-52 items-center justify-center gap-3 px-4 py-12 text-sm font-bold text-slate-500 dark:text-slate-400" role="status">
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
            در حال دریافت داده‌ها…
          </div>
        ) : pageRows.length === 0 ? (
          <EmptyState
            title="فروش نقدی موبایل در این بازه ثبت نشده است"
            description="بازه تاریخ یا عبارت جستجو را تغییر دهید و گزارش را دوباره محاسبه کنید."
          />
        ) : (
          <>
            <div className="hidden xl:block">
              <table className="report-table ux-data-table" data-ui-table="true" data-ui-table-layout="managed" data-ui-bidi-scope="rtl-table">
                <thead>
                  <tr>
                    <th>تاریخ و سند</th>
                    <th>گوشی</th>
                    <th>مشتری</th>
                    <th>مبلغ فروش</th>
                    <th>سود</th>
                    <th>اقدام</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={`${row.transactionId}-${row.imei}`} data-navigation-anchor={reportNavigationAnchor('phone-sales', `${row.transactionId}-${row.imei}`)}>
                      <td>
                        <strong>{formatIsoToShamsi(row.transactionDate)}</strong>
                        <small>شناسه سند: {faNum(row.transactionId)}</small>
                      </td>
                      <td>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <i className="fa-solid fa-mobile-screen-button shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                          <div className="min-w-0">
                            <strong>{row.phoneModel || 'مدل نامشخص'}</strong>
                            <small dir="ltr">IMEI: {row.imei || '—'}</small>
                          </div>
                        </div>
                      </td>
                      <td><strong>{row.customerFullName || 'مهمان'}</strong></td>
                      <td>
                        <strong>{money(row.totalPrice)}</strong>
                        <small>قیمت خرید: {money(row.purchasePrice)}</small>
                      </td>
                      <td><strong className={`font-black ${profitTextClass(row.profit)}`}>{money(row.profit)}</strong></td>
                      <td>
                        <ActionLink
                          to={`/invoices/${row.transactionId}`}
                          onClick={(event) => onDrilldownClick(event, `/invoices/${row.transactionId}`, { contextLabel: `${row.customerFullName || 'مهمان'} • ${row.phoneModel || 'گوشی'}`, targetEntity: { kind: 'sales_order', id: row.transactionId, entityName: row.phoneModel || undefined, identifier: row.imei || undefined, amountText: money(row.totalPrice), preview: { eyebrow: 'فروش نقدی گوشی', items: [{ label: 'مشتری', value: row.customerFullName || 'مهمان', iconClass: 'fa-regular fa-user' }, { label: 'تاریخ فروش', value: formatIsoToShamsi(row.transactionDate), iconClass: 'fa-regular fa-calendar' }, { label: 'قیمت خرید', value: money(row.purchasePrice), iconClass: 'fa-solid fa-tag' }, { label: 'سود', value: money(row.profit), iconClass: 'fa-solid fa-chart-line', tone: Number(row.profit || 0) >= 0 ? 'success' : 'danger' }] } } })}
                          variant="secondary"
                          size="xs"
                          autoIcon={false}
                          leftIcon={<i className="fa-solid fa-file-invoice" aria-hidden="true" />}
                          title="مشاهده سند فروش"
                        >
                          سند فروش
                        </ActionLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-3 sm:p-4 xl:hidden" aria-label="کارت‌های فروش نقدی موبایل">
              {pageRows.map((row) => (
                <Surface key={`${row.transactionId}-${row.imei}`} data-navigation-anchor={reportNavigationAnchor('phone-sales', `${row.transactionId}-${row.imei}`)} surface="glass" variant="subtle" scheme="adaptive" className="rounded-[20px]" contentClassName="p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 text-right">
                      <div className="truncate text-sm font-black text-slate-950 dark:text-white" title={row.phoneModel || 'مدل نامشخص'}>{row.phoneModel || 'مدل نامشخص'}</div>
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <span>{formatIsoToShamsi(row.transactionDate)}</span>
                        <span>سند #{faNum(row.transactionId)}</span>
                        <span dir="ltr">IMEI: {row.imei || '—'}</span>
                      </div>
                    </div>
                    <i className="fa-solid fa-mobile-screen-button shrink-0 text-slate-500" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-xs font-bold text-slate-600 dark:text-slate-300">{row.customerFullName || 'مهمان'}</div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-right text-xs">
                    <div><span className="block text-slate-500 dark:text-slate-400">مبلغ فروش</span><strong className="mt-1 block">{money(row.totalPrice)}</strong></div>
                    <div><span className="block text-slate-500 dark:text-slate-400">قیمت خرید</span><strong className="mt-1 block">{money(row.purchasePrice)}</strong></div>
                    <div><span className="block text-slate-500 dark:text-slate-400">سود</span><strong className={`mt-1 block font-black ${profitTextClass(row.profit)}`}>{money(row.profit)}</strong></div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <ActionLink
                      to={`/invoices/${row.transactionId}`}
                          onClick={(event) => onDrilldownClick(event, `/invoices/${row.transactionId}`, { contextLabel: `${row.customerFullName || 'مهمان'} • ${row.phoneModel || 'گوشی'}`, targetEntity: { kind: 'sales_order', id: row.transactionId, entityName: row.phoneModel || undefined, identifier: row.imei || undefined, amountText: money(row.totalPrice), preview: { eyebrow: 'فروش نقدی گوشی', items: [{ label: 'مشتری', value: row.customerFullName || 'مهمان', iconClass: 'fa-regular fa-user' }, { label: 'تاریخ فروش', value: formatIsoToShamsi(row.transactionDate), iconClass: 'fa-regular fa-calendar' }, { label: 'قیمت خرید', value: money(row.purchasePrice), iconClass: 'fa-solid fa-tag' }, { label: 'سود', value: money(row.profit), iconClass: 'fa-solid fa-chart-line', tone: Number(row.profit || 0) >= 0 ? 'success' : 'danger' }] } } })}
                      variant="secondary"
                      size="xs"
                      autoIcon={false}
                      leftIcon={<i className="fa-solid fa-file-invoice" aria-hidden="true" />}
                      title="مشاهده سند فروش"
                    >
                      سند فروش
                    </ActionLink>
                  </div>
                </Surface>
              ))}
            </div>
          </>
        )}
      </DataTableShell>
    </div>
  );
};

export default PhoneSalesReportPage;
