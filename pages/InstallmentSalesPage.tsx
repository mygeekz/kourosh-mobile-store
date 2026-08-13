import { apiFetch } from "../utils/apiFetch";
// src/pages/InstallmentSalesPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import moment from 'jalali-moment';
import { useNavigate } from 'react-router-dom';
import { InstallmentSale, NotificationMessage, OverallInstallmentStatus } from '../types';
import Notification from '../components/Notification';
import { formatIsoToShamsi } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../utils/apiUtils';
import ExportMenu from '../components/ExportMenu';
import { exportToExcel, exportToPdfTable } from '../utils/exporters';
import { printArea } from '../utils/printArea';
import { AppSearchField, Button, DataTableShell, EmptyState, IconGlyph, PageKit, PanelCard, SelectField, Skeleton, Surface, TableActionGroup } from '@/components/ui';
import InstallmentCancellationModal from '../components/InstallmentCancellationModal';
import TelegramTopicPanel from '../components/TelegramTopicPanel';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';

type CollectionRiskLevel = 'high' | 'followup' | 'due-soon' | 'normal' | 'settled' | 'inactive';

type CollectionRisk = {
  level: CollectionRiskLevel;
  label: string;
  detail: string;
  icon: string;
};

type InstallmentDirectorySort = 'latest' | 'remaining_desc' | 'due_asc' | 'risk_desc' | 'last_collection_desc';

type InstallmentDirectorySummary = {
  totalCount: number;
  totalAmountAll: number;
  totalRemainingAll: number;
  totalCollectedAll: number;
  overdueAll: number;
  activeAll: number;
  doneAll: number;
  canceledAll: number;
  nextDueSoon: number;
  highRiskAll: number;
};

type InstallmentDirectoryPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

const EMPTY_DIRECTORY_SUMMARY: InstallmentDirectorySummary = {
  totalCount: 0,
  totalAmountAll: 0,
  totalRemainingAll: 0,
  totalCollectedAll: 0,
  overdueAll: 0,
  activeAll: 0,
  doneAll: 0,
  canceledAll: 0,
  nextDueSoon: 0,
  highRiskAll: 0,
};

const parseInstallmentDirectoryDate = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = raw.replace(/\./g, '/');
  const year = Number(normalized.match(/^(\d{4})/)?.[1] || 0);
  const parsed = year > 0 && year < 1700
    ? moment(normalized, ['jYYYY/jMM/jDD HH:mm:ss', 'jYYYY/jMM/jDD HH:mm', 'jYYYY/jMM/jDD'], true)
    : moment(normalized, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD', 'YYYY/MM/DD HH:mm:ss', 'YYYY/MM/DD'], true);
  return parsed.isValid() ? parsed : null;
};

const getDaysToDue = (value?: string | null): number | null => {
  const parsed = parseInstallmentDirectoryDate(value);
  if (!parsed) return null;
  return parsed.clone().startOf('day').diff(moment().startOf('day'), 'days');
};

const getCollectionSourceLabel = (source?: string | null) => {
  if (source === 'down_payment') return 'پیش‌پرداخت';
  if (source === 'check_recovery') return 'دریافت نقدی چک';
  if (source === 'check_cashed') return 'وصول چک';
  return 'پرداخت قسط';
};

const getDueRelativeLabel = (date?: string | null) => {
  const days = getDaysToDue(date);
  if (days == null) return 'زمان‌بندی نامشخص';
  if (days === 0) return 'امروز';
  if (days > 0) return `${days.toLocaleString('fa-IR')} روز دیگر`;
  return `${Math.abs(days).toLocaleString('fa-IR')} روز گذشته`;
};

const getCollectionRisk = (sale: InstallmentSale): CollectionRisk => {
  if (sale.overallStatus === 'فسخ شده') {
    return { level: 'inactive', label: 'غیرفعال', detail: 'قرارداد فسخ شده است', icon: 'fa-ban' };
  }
  if (sale.overallStatus === 'تکمیل شده' || Number(sale.remainingAmount || 0) <= 0.00001) {
    return { level: 'settled', label: 'بدون ریسک جاری', detail: 'مانده قرارداد تسویه شده است', icon: 'fa-circle-check' };
  }

  const overdueCount = Math.max(0, Number(sale.overdueInstallmentsCount || 0));
  const daysToDue = getDaysToDue(sale.nextDueDate);
  const overdueDays = daysToDue != null && daysToDue < 0 ? Math.abs(daysToDue) : 0;

  if (sale.hasBouncedCheck) {
    return { level: 'high', label: 'ریسک بالا', detail: 'چک برگشتی ثبت شده', icon: 'fa-triangle-exclamation' };
  }
  if (overdueDays >= 30 || overdueCount >= 2) {
    return {
      level: 'high',
      label: 'ریسک بالا',
      detail: overdueCount >= 2 ? `${overdueCount.toLocaleString('fa-IR')} سررسید معوق` : `${overdueDays.toLocaleString('fa-IR')} روز تأخیر`,
      icon: 'fa-triangle-exclamation',
    };
  }
  if (sale.overallStatus === 'معوق' || overdueCount > 0 || overdueDays > 0) {
    return {
      level: 'followup',
      label: 'نیازمند پیگیری',
      detail: overdueDays > 0 ? `${overdueDays.toLocaleString('fa-IR')} روز از سررسید گذشته` : 'مانده معوق ثبت شده',
      icon: 'fa-clock-rotate-left',
    };
  }
  if (daysToDue != null && daysToDue >= 0 && daysToDue <= 7) {
    return {
      level: 'due-soon',
      label: 'سررسید نزدیک',
      detail: daysToDue === 0 ? 'سررسید امروز' : `${daysToDue.toLocaleString('fa-IR')} روز تا سررسید`,
      icon: 'fa-bell',
    };
  }
  return { level: 'normal', label: 'عادی', detail: 'نشانه فوری برای پیگیری دیده نمی‌شود', icon: 'fa-shield' };
};

const CollectionRiskPill: React.FC<{ sale: InstallmentSale }> = ({ sale }) => {
  const risk = getCollectionRisk(sale);
  const tone = risk.level === 'high'
    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200'
    : risk.level === 'followup'
      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200'
      : risk.level === 'due-soon'
        ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-200'
        : risk.level === 'settled'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200'
          : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold whitespace-nowrap ${tone}`} title={risk.detail}>
      <i className={`fa-solid ${risk.icon}`} aria-hidden="true" />
      {risk.label}
    </span>
  );
};

const StatusPill: React.FC<{ status: OverallInstallmentStatus }> = ({ status }) => {
  const base =
    'inline-flex items-center gap-1 rounded-full px-1.5 py-1 text-[10px] font-semibold whitespace-nowrap xl:px-2 xl:text-[11px]';
  if (status === 'تکمیل شده') {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300`}>
        <i className="fa-solid fa-check-circle" /> تکمیل شده
      </span>
    );
  }
  if (status === 'معوق') {
    return (
      <span className={`${base} bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300`}>
        <i className="fa-solid fa-triangle-exclamation" /> معوق
      </span>
    );
  }
  if (status === 'فسخ شده') {
    return (
      <span className={`${base} bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200`}>
        <i className="fa-solid fa-file-circle-xmark" /> فسخ شده
      </span>
    );
  }
  return (
    <span className={`${base} bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300`}>
      <i className="fa-solid fa-hourglass-half" /> در حال پرداخت
    </span>
  );
};

const InstallmentSalesPage: React.FC = () => {
  const { token, currentUser } = useAuth();
  const [installmentSales, setInstallmentSales] = useState<InstallmentSale[]>([]);
  const [directorySummary, setDirectorySummary] = useState<InstallmentDirectorySummary | null>(null);
  const [pagination, setPagination] = useState<InstallmentDirectoryPagination>({ page: 1, pageSize: 30, total: 0, totalPages: 1, hasMore: false });
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [cancellationSale, setCancellationSale] = useState<InstallmentSale | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | OverallInstallmentStatus>('');
  const [riskFilter, setRiskFilter] = useState<'' | Exclude<CollectionRiskLevel, 'settled' | 'inactive'>>('');
  const [sortOrder, setSortOrder] = useState<InstallmentDirectorySort>('latest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [tab, setTab] = useState<'main' | 'telegram'>('main');
  const requestSerialRef = useRef(0);
  const summaryLoadedRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(searchTerm.trim());
    }, 320);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const buildDirectoryQuery = useCallback((targetPage: number, targetPageSize: number, includeSummary: boolean) => {
    const qs = new URLSearchParams({
      view: 'directory',
      page: String(targetPage),
      pageSize: String(targetPageSize),
      sort: sortOrder,
    });
    if (debouncedSearch) qs.set('search', debouncedSearch);
    if (statusFilter) qs.set('status', statusFilter);
    if (riskFilter) qs.set('risk', riskFilter);
    if (includeSummary) qs.set('includeSummary', '1');
    return qs;
  }, [debouncedSearch, statusFilter, riskFilter, sortOrder]);

  const fetchInstallmentSales = useCallback(async (options?: { includeSummary?: boolean; silent?: boolean }) => {
    if (!token) return;
    const serial = ++requestSerialRef.current;
    if (!options?.silent) setIsLoading(true);
    setNotification(null);
    try {
      const qs = buildDirectoryQuery(page, pageSize, Boolean(options?.includeSummary));
      const response = await apiFetch(`/api/installment-sales?${qs.toString()}`, { headers: getAuthHeaders(token) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت لیست فروش‌های اقساطی');
      if (serial !== requestSerialRef.current) return;
      const payload = result.data || {};
      setInstallmentSales(Array.isArray(payload.items) ? payload.items : []);
      if (payload.pagination) {
        setPagination(payload.pagination);
        if (Number(payload.pagination.page || 1) > Number(payload.pagination.totalPages || 1)) {
          setPage(Math.max(1, Number(payload.pagination.totalPages || 1)));
        }
      }
      if (payload.summary) setDirectorySummary(payload.summary);
    } catch (error: any) {
      if (serial !== requestSerialRef.current) return;
      setNotification({ type: 'error', text: error.message });
    } finally {
      if (serial === requestSerialRef.current && !options?.silent) setIsLoading(false);
    }
  }, [token, page, pageSize, buildDirectoryQuery]);

  useEffect(() => {
    if (!token) return;
    const includeSummary = !summaryLoadedRef.current;
    if (includeSummary) summaryLoadedRef.current = true;
    void fetchInstallmentSales({ includeSummary });
  }, [token, fetchInstallmentSales]);

  const filteredSales = installmentSales;
  const summary = directorySummary || EMPTY_DIRECTORY_SUMMARY;

  const exportFilenameBase = `installments-${new Date().toISOString().slice(0, 10)}`;

  const buildExportRows = (sales: InstallmentSale[]) => sales.map((s) => ({
    id: s.id,
    customer: s.customerFullName ?? '—',
    items: s.itemsSummary ?? s.phoneModel ?? '—',
    total: s.totalInstallmentPrice ?? s.actualSalePrice ?? '',
    collected: s.collectedAmount ?? '',
    remaining: s.remainingAmount ?? '',
    status: s.overallStatus ?? '',
    nextDue: s.nextDueDate ? formatIsoToShamsi(s.nextDueDate) : '',
    nextAmount: s.nextDueAmount ?? s.installmentAmount ?? '',
    lastCollectionDate: s.lastCollectionDate ? formatIsoToShamsi(s.lastCollectionDate) : '',
    lastCollectionAmount: s.lastCollectionAmount ?? '',
    risk: getCollectionRisk(s).label,
  }));

  const fetchAllFilteredSalesForExport = async (): Promise<InstallmentSale[]> => {
    if (!token || pagination.total <= 0) return [];
    const exportPageSize = 100;
    const totalPages = Math.max(1, Math.ceil(pagination.total / exportPageSize));
    const allRows: InstallmentSale[] = [];
    for (let exportPage = 1; exportPage <= totalPages; exportPage += 1) {
      const qs = buildDirectoryQuery(exportPage, exportPageSize, false);
      const response = await apiFetch(`/api/installment-sales?${qs.toString()}`, { headers: getAuthHeaders(token) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در آماده‌سازی خروجی فروش‌های اقساطی');
      const rows = Array.isArray(result.data?.items) ? result.data.items : [];
      allRows.push(...rows);
      if (!result.data?.pagination?.hasMore) break;
    }
    return allRows;
  };

  const doExportExcel = async () => {
    try {
      const exportRows = buildExportRows(await fetchAllFilteredSalesForExport());
      exportToExcel(
        `${exportFilenameBase}.xlsx`,
        exportRows,
        [
          { header: 'شناسه', key: 'id' },
          { header: 'مشتری', key: 'customer' },
          { header: 'اقلام', key: 'items' },
          { header: 'مبلغ کل', key: 'total' },
          { header: 'وصول‌شده', key: 'collected' },
          { header: 'مانده', key: 'remaining' },
          { header: 'وضعیت کلی', key: 'status' },
          { header: 'ریسک وصول', key: 'risk' },
          { header: 'آخرین دریافت', key: 'lastCollectionDate' },
          { header: 'مبلغ آخرین دریافت', key: 'lastCollectionAmount' },
          { header: 'قسط بعدی', key: 'nextDue' },
          { header: 'مبلغ قسط بعدی', key: 'nextAmount' },
        ],
        'Installments',
      );
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message || 'خطا در خروجی Excel' });
    }
  };

  const doExportPdf = async () => {
    try {
      const exportRows = buildExportRows(await fetchAllFilteredSalesForExport());
      exportToPdfTable({
        filename: `${exportFilenameBase}.pdf`,
        title: 'فروش‌های اقساطی',
        head: ['شناسه', 'مشتری', 'مانده', 'آخرین دریافت', 'سررسید بعدی', 'ریسک'],
        body: exportRows.map((x) => [
          Number(x.id ?? 0).toLocaleString('fa-IR'),
          x.customer,
          x.remaining !== '' ? Number(x.remaining).toLocaleString('fa-IR') : '—',
          x.lastCollectionDate || '—',
          x.nextDue || '—',
          x.risk,
        ]),
      });
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message || 'خطا در خروجی PDF' });
    }
  };
const formatPrice = (price: number | undefined | null) =>
    price == null ? '-' : formatCurrencyText(price, readStoredCurrencyUnit());

  const openCancellation = (sale: InstallmentSale) => {
    setCancellationSale(sale);
  };

  const visiblePageNumbers = (() => {
    const totalPages = Math.max(1, pagination.totalPages);
    const windowSize = Math.min(5, totalPages);
    const start = Math.min(Math.max(1, pagination.page - 2), Math.max(1, totalPages - windowSize + 1));
    return Array.from({ length: windowSize }, (_, index) => start + index);
  })();

  return (
    <PageKit
      className="installment-sales-page"
      title="فروش اقساطی"
      subtitle="مدیریت قراردادها، سررسیدها، وصول‌ها و وضعیت پرونده‌های اقساطی"
      icon={<i className="fa-solid fa-calendar-check" aria-hidden="true" />}
      loadingTone="warning"
    >
      <div className="mx-auto w-full max-w-7xl space-y-3 px-3 text-right sm:px-4" dir="rtl" data-ui-installment-directory="true">
        <Surface
          surface="glass"
          variant="panel"
          scheme="adaptive"
          wrapContent={false}
          className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-950/90"
        >
          <div className="flex flex-col gap-4 p-3 sm:p-4 lg:p-5">
            <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-3 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2" aria-label="نمای فروش اقساطی">
                <Button
                  type="button"
                  variant={tab === 'main' ? 'neutral' : 'secondary'}
                  size="sm"
                  onClick={() => setTab('main')}
                  leftIcon={<i className="fa-solid fa-file-invoice-dollar" aria-hidden="true" />}
                >
                  لیست اقساط
                </Button>
                <Button
                  type="button"
                  variant={tab === 'telegram' ? 'neutral' : 'secondary'}
                  size="sm"
                  onClick={() => setTab('telegram')}
                  leftIcon={<i className="fa-brands fa-telegram" aria-hidden="true" />}
                >
                  ارسال‌های تلگرام
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => navigate('/installment-sales/new')}
                  variant="primary"
                  size="sm"
                  leftIcon={<i className="fa-solid fa-plus" aria-hidden="true" />}
                >
                  ثبت فروش اقساطی
                </Button>
                <ExportMenu
                  label="خروجی"
                  items={[
                    { key: 'excel', label: 'Excel (XLSX)', icon: 'fa-file-excel', onClick: () => { void doExportExcel(); }, disabled: pagination.total === 0 },
                    { key: 'pdf', label: 'PDF (جدول)', icon: 'fa-file-pdf', onClick: () => { void doExportPdf(); }, disabled: pagination.total === 0 },
                  ]}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={filteredSales.length === 0}
                  onClick={() => printArea('#installments-print-area', { title: 'فروش‌های اقساطی' })}
                  leftIcon={<i className="fa-solid fa-print" aria-hidden="true" />}
                >
                  چاپ صفحه
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={isLoading}
                  loadingText="در حال بروزرسانی…"
                  onClick={() => { summaryLoadedRef.current = true; void fetchInstallmentSales({ includeSummary: true }); }}
                  leftIcon={<i className="fa-solid fa-rotate" aria-hidden="true" />}
                >
                  بروزرسانی
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-center">
              <div className="space-y-2 lg:col-span-2">
                <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  مرکز کنترل اقساط
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl dark:text-white">نمای کلی فروش اقساطی</h2>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
                    {pagination.total.toLocaleString('fa-IR')} نتیجه
                  </span>
                </div>
                <p className="max-w-3xl text-xs leading-6 text-slate-500 sm:text-sm dark:text-slate-400">
                  قراردادهای اقساطی، وضعیت وصول، پرونده‌های معوق و سررسیدهای نزدیک را در یک نمای هماهنگ مدیریت کنید.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                  <IconGlyph size="md" tone="accent"><i className="fa-solid fa-sack-dollar" aria-hidden="true" /></IconGlyph>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">مبلغ قراردادهای فعال</div>
                    <div className="truncate text-base font-black text-slate-950 dark:text-white">{formatPrice(summary.totalAmountAll)}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">مانده قابل وصول: {formatPrice(summary.totalRemainingAll)}</div>
                  </div>
                </div>
                <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                  <IconGlyph size="md" tone={summary.overdueAll > 0 ? 'warning' : 'info'}><i className="fa-solid fa-calendar-days" aria-hidden="true" /></IconGlyph>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">پرونده‌های باز</div>
                    <div className="text-base font-black text-slate-950 dark:text-white">{(summary.activeAll + summary.overdueAll).toLocaleString('fa-IR')} پرونده</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{summary.overdueAll.toLocaleString('fa-IR')} پرونده معوق نیازمند پیگیری</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Surface>

        <Notification message={notification} onClose={() => setNotification(null)} />

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="خلاصه فروش اقساطی">
          <article data-ui-installment-kpi="all" className="flex min-h-24 items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">کل قراردادها</div>
              <strong className="mt-1 block text-2xl font-black text-slate-950 dark:text-white">{summary.totalCount.toLocaleString('fa-IR')}</strong>
              <small className="mt-1 block text-[10px] text-slate-500 dark:text-slate-400">{summary.canceledAll.toLocaleString('fa-IR')} فسخ‌شده</small>
            </div>
            <IconGlyph size="md" tone="accent"><i className="fa-solid fa-layer-group" aria-hidden="true" /></IconGlyph>
          </article>
          <article data-ui-installment-kpi="outstanding" className="flex min-h-24 items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">مانده قابل وصول</div>
              <strong className="mt-1 block whitespace-nowrap text-base font-black text-slate-950 sm:text-lg dark:text-white">{formatPrice(summary.totalRemainingAll)}</strong>
              <small className="mt-1 block text-[10px] text-slate-500 dark:text-slate-400">وصول‌شده: {formatPrice(summary.totalCollectedAll)}</small>
            </div>
            <IconGlyph size="md" tone="info"><i className="fa-solid fa-wallet" aria-hidden="true" /></IconGlyph>
          </article>
          <article data-ui-installment-kpi="overdue" className="flex min-h-24 items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">معوق</div>
              <strong className="mt-1 block text-2xl font-black text-slate-950 dark:text-white">{summary.overdueAll.toLocaleString('fa-IR')}</strong>
              <small className="mt-1 block text-[10px] text-slate-500 dark:text-slate-400">نیازمند پیگیری</small>
            </div>
            <IconGlyph size="md" tone={summary.overdueAll > 0 ? 'danger' : 'success'}><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /></IconGlyph>
          </article>
          <article data-ui-installment-kpi="settled" className="flex min-h-24 items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">تسویه‌شده</div>
              <strong className="mt-1 block text-2xl font-black text-slate-950 dark:text-white">{summary.doneAll.toLocaleString('fa-IR')}</strong>
              <small className="mt-1 block text-[10px] text-slate-500 dark:text-slate-400">پرونده بسته مالی</small>
            </div>
            <IconGlyph size="md" tone="success"><i className="fa-solid fa-circle-check" aria-hidden="true" /></IconGlyph>
          </article>
          <article data-ui-installment-kpi="due-soon" className="flex min-h-24 items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">سررسید نزدیک</div>
              <strong className="mt-1 block text-2xl font-black text-slate-950 dark:text-white">{summary.nextDueSoon.toLocaleString('fa-IR')}</strong>
              <small className="mt-1 block text-[10px] text-slate-500 dark:text-slate-400">{summary.highRiskAll.toLocaleString('fa-IR')} پرونده با ریسک بالا</small>
            </div>
            <IconGlyph size="md" tone={summary.nextDueSoon > 0 ? 'warning' : 'neutral'}><i className="fa-solid fa-bell" aria-hidden="true" /></IconGlyph>
          </article>
        </section>

        <Surface
          surface="glass"
          variant="panel"
          scheme="adaptive"
          wrapContent={false}
          className="rounded-2xl border border-slate-200/80 bg-white/95 p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 sm:p-3"
        >
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-12 lg:items-center">
            <div className="md:col-span-2 lg:col-span-4">
              <AppSearchField
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="جستجو در مشتری، اقلام، سریال یا شناسه قرارداد..."
                ariaLabel="جستجوی فروش اقساطی"
                size="md"
                clearable
              />
            </div>
            <div className="lg:col-span-2">
              <SelectField
                value={statusFilter}
                onValueChange={(value) => { setPage(1); setStatusFilter(value as '' | OverallInstallmentStatus); }}
                ariaLabel="فیلتر وضعیت قرارداد"
                size="sm"
                iconClassName="fa-solid fa-filter"
                options={[
                  { value: '', label: 'همه وضعیت‌ها' },
                  { value: 'در حال پرداخت', label: `در حال پرداخت (${summary.activeAll.toLocaleString('fa-IR')})` },
                  { value: 'معوق', label: `معوق (${summary.overdueAll.toLocaleString('fa-IR')})` },
                  { value: 'تکمیل شده', label: `تسویه‌شده (${summary.doneAll.toLocaleString('fa-IR')})` },
                  { value: 'فسخ شده', label: `فسخ‌شده (${summary.canceledAll.toLocaleString('fa-IR')})` },
                ]}
              />
            </div>
            <div className="lg:col-span-2">
              <SelectField
                value={riskFilter}
                onValueChange={(value) => { setPage(1); setRiskFilter(value as '' | Exclude<CollectionRiskLevel, 'settled' | 'inactive'>); }}
                ariaLabel="فیلتر ریسک وصول"
                size="sm"
                iconClassName="fa-solid fa-shield-halved"
                options={[
                  { value: '', label: 'همه ریسک‌ها' },
                  { value: 'high', label: `ریسک بالا (${summary.highRiskAll.toLocaleString('fa-IR')})` },
                  { value: 'followup', label: 'نیازمند پیگیری' },
                  { value: 'due-soon', label: 'سررسید نزدیک' },
                  { value: 'normal', label: 'عادی' },
                ]}
              />
            </div>
            <div className="lg:col-span-2">
              <SelectField
                value={sortOrder}
                onValueChange={(value) => { setPage(1); setSortOrder(value as InstallmentDirectorySort); }}
                ariaLabel="مرتب‌سازی فهرست اقساط"
                size="sm"
                iconClassName="fa-solid fa-arrow-down-wide-short"
                options={[
                  { value: 'latest', label: 'جدیدترین قرارداد' },
                  { value: 'remaining_desc', label: 'بیشترین مانده' },
                  { value: 'due_asc', label: 'نزدیک‌ترین سررسید' },
                  { value: 'risk_desc', label: 'بالاترین ریسک وصول' },
                  { value: 'last_collection_desc', label: 'آخرین دریافت' },
                ]}
              />
            </div>
            <div className="flex lg:col-span-2 lg:justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full lg:w-auto"
                disabled={!(searchTerm || statusFilter || riskFilter || sortOrder !== 'latest')}
                onClick={() => { setPage(1); setSearchTerm(''); setDebouncedSearch(''); setStatusFilter(''); setRiskFilter(''); setSortOrder('latest'); }}
                leftIcon={<i className="fa-solid fa-filter-circle-xmark" aria-hidden="true" />}
              >
                پاکسازی
              </Button>
            </div>
          </div>
        </Surface>

        {tab === 'telegram' ? (
          <TelegramTopicPanel
            topic="installments"
            title="ارسال‌های تلگرام (اقساط)"
            allowedTypes={[
              { key: 'INSTALLMENT_DUE_7', label: 'یادآوری ۷ روز مانده' },
              { key: 'INSTALLMENT_DUE_3', label: 'یادآوری ۳ روز مانده' },
              { key: 'INSTALLMENT_DUE_TODAY', label: 'سررسید امروز' },
              { key: 'INSTALLMENT_REMINDER', label: 'یادآوری دستی/عمومی' },
              { key: 'INSTALLMENT_COMPLETED', label: 'تسویه کامل اقساط' },
            ]}
          />
        ) : (
          <Surface
            surface="glass"
            variant="panel"
            scheme="adaptive"
            wrapContent={false}
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-950/90"
          >
            <header className="flex flex-col gap-2 border-b border-slate-200/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-black text-slate-950 dark:text-white">فهرست فروش اقساطی</h3>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  نمایش {pagination.total === 0 ? '۰' : `${(((pagination.page - 1) * pagination.pageSize) + 1).toLocaleString('fa-IR')} تا ${Math.min(pagination.page * pagination.pageSize, pagination.total).toLocaleString('fa-IR')}`} از {pagination.total.toLocaleString('fa-IR')} قرارداد
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <i className="fa-solid fa-circle-info" aria-hidden="true" /> مانده و سررسید از دفتر مالی محاسبه می‌شوند؛ ریسک فقط شاخص عملیاتی پیگیری وصول است.
              </span>
            </header>

            <div className="installment-sales-responsive min-w-0 max-w-full p-2 sm:p-3" data-ui-installment-sales-list="true">
            {isLoading ? (
              <DataTableShell data-ui-installment-view="table">
                <table className="w-full min-w-[980px] table-fixed text-xs" dir="rtl">
                  <colgroup>
                    <col className="w-[29%]" />
                    <col className="w-[23%]" />
                    <col className="w-[17%]" />
                    <col className="w-[19%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    <tr className="border-b border-slate-200 text-right dark:border-slate-800">
                      {['قرارداد و مشتری','وصول و مانده','آخرین دریافت','سررسید و ریسک','عملیات'].map((h) => (
                        <th key={h} className="px-3 py-3 text-[11px] font-black">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-3 py-3"><Skeleton tone="warning" className="h-11 w-64 max-w-full" rounded="lg" /></td>
                        <td className="px-3 py-3"><Skeleton tone="warning" className="h-11 w-44 max-w-full" rounded="lg" /></td>
                        <td className="px-3 py-3"><Skeleton tone="warning" className="h-10 w-36 max-w-full" rounded="lg" /></td>
                        <td className="px-3 py-3"><Skeleton tone="warning" className="h-10 w-40 max-w-full" rounded="lg" /></td>
                        <td className="px-3 py-3"><Skeleton tone="warning" className="h-9 w-28 max-w-full" rounded="xl" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTableShell>
            ) : filteredSales.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="موردی پیدا نشد"
              description={(searchTerm || statusFilter || riskFilter || sortOrder !== 'latest') ? 'برای نمایش نتایج، معیار جستجو یا فیلترها را بازبینی کنید.' : 'هنوز قراردادی ثبت اطلاعات نشده است؛ از دکمه ثبت اطلاعات جدید برای شروع استفاده کنید.'}
              actionLabel={(searchTerm || statusFilter || riskFilter || sortOrder !== 'latest') ? 'پاک کردن فیلترها' : undefined}
              onAction={(searchTerm || statusFilter || riskFilter || sortOrder !== 'latest') ? () => { setPage(1); setSearchTerm(''); setDebouncedSearch(''); setStatusFilter(''); setRiskFilter(''); setSortOrder('latest'); } : undefined}
              icon={<i className="fa-solid fa-calendar-check" aria-hidden="true" />}
            />
          </div>
        ) : (
          <div id="installments-print-area">
            {/* Wide workspace: balance, last collection, next due and risk are visible without opening the contract. */}
            <DataTableShell data-ui-installment-view="table">
              <table className="w-full min-w-[980px] table-fixed text-[11px] xl:text-xs" dir="rtl">
                <colgroup>
                  <col className="w-[29%]" />
                  <col className="w-[23%]" />
                  <col className="w-[17%]" />
                  <col className="w-[19%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  <tr className="border-b border-slate-200 text-right dark:border-slate-800">
                    <th className="px-3 py-3 text-[11px] font-black">قرارداد و مشتری</th>
                    <th className="px-3 py-3 text-[11px] font-black">وصول و مانده</th>
                    <th className="px-3 py-3 text-[11px] font-black">آخرین دریافت</th>
                    <th className="px-3 py-3 text-[11px] font-black">سررسید و ریسک</th>
                    <th className="px-2 py-3 text-center text-[11px] font-black">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-700 dark:divide-slate-800 dark:bg-slate-950 dark:text-slate-200">
                  {filteredSales.map((sale) => {
                    const risk = getCollectionRisk(sale);
                    const totalAmount = Math.max(0, Number(sale.totalInstallmentPrice ?? sale.actualSalePrice ?? 0));
                    const remainingAmount = Math.max(0, Number(sale.remainingAmount || 0));
                    const collectedAmount = Math.max(0, Number(sale.collectedAmount ?? Math.max(0, totalAmount - remainingAmount)));
                    const collectionPercent = totalAmount > 0 ? Math.min(100, Math.max(0, (collectedAmount / totalAmount) * 100)) : 0;
                    const rowTone = risk.level === 'high'
                      ? 'bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/10 dark:hover:bg-rose-950/20'
                      : risk.level === 'followup'
                        ? 'bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-950/10 dark:hover:bg-amber-950/20'
                        : sale.overallStatus === 'فسخ شده'
                          ? 'bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-900/40 dark:hover:bg-slate-900/70'
                          : 'bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900';
                    return (
                    <tr key={sale.id} className={`group transition-colors ${rowTone}`}>
                      <td className="px-3 py-3 align-top">
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <strong className="text-sm font-black text-slate-950 dark:text-white">{sale.customerFullName || 'مشتری بدون نام'}</strong>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">قرارداد #{sale.id ? sale.id.toLocaleString('fa-IR') : '—'}</span>
                          </div>
                          <div className="truncate text-[11px] font-medium text-slate-600 dark:text-slate-300" title={sale.itemsSummary || sale.phoneModel || '—'}>
                            <i className="fa-solid fa-box-open ml-1 text-slate-400" aria-hidden="true" />
                            {sale.itemsSummary || sale.phoneModel || 'بدون شرح اقلام'}
                          </div>
                          {sale.phoneImei ? (
                            <div className="truncate font-mono text-[10px] text-slate-400" dir="ltr">IMEI {sale.phoneImei}</div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="space-y-1.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">مانده</span>
                            <strong className={`whitespace-nowrap text-sm font-black ${remainingAmount > 0 ? 'text-slate-950 dark:text-white' : 'text-emerald-700 dark:text-emerald-300'}`}>{formatPrice(remainingAmount)}</strong>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                            <span>وصول‌شده</span>
                            <span className="whitespace-nowrap font-bold text-slate-700 dark:text-slate-200">{formatPrice(collectedAmount)}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-label={`درصد وصول ${Math.round(collectionPercent).toLocaleString('fa-IR')} درصد`}>
                            <div className="h-full rounded-full bg-current text-emerald-500 transition-[width]" style={{ width: `${collectionPercent}%` }} />
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                            <span>کل قرارداد</span>
                            <span className="whitespace-nowrap">{formatPrice(totalAmount)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        {sale.lastCollectionDate && Number(sale.lastCollectionAmount || 0) > 0 ? (
                          <div className="space-y-1.5">
                            <strong className="block whitespace-nowrap text-sm font-black text-slate-950 dark:text-white">{formatPrice(sale.lastCollectionAmount)}</strong>
                            <div className="whitespace-nowrap text-[10px] font-semibold text-slate-500 dark:text-slate-400">{formatIsoToShamsi(sale.lastCollectionDate)}</div>
                            <div className="text-[10px] text-slate-400">{getCollectionSourceLabel(sale.lastCollectionSource)}</div>
                          </div>
                        ) : (
                          <div className="space-y-1 text-[10px] text-slate-400">
                            <i className="fa-regular fa-circle-dot" aria-hidden="true" />
                            <span className="mr-1">دریافتی بعد از ثبت قرارداد ندارد</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusPill status={sale.overallStatus} />
                            <CollectionRiskPill sale={sale} />
                          </div>
                          {sale.overallStatus === 'در حال پرداخت' || sale.overallStatus === 'معوق' ? (
                            sale.nextDueDate ? (
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                  <i className="fa-regular fa-calendar" aria-hidden="true" />
                                  <span>{formatIsoToShamsi(sale.nextDueDate)}</span>
                                  <span className="font-bold text-slate-700 dark:text-slate-200">• {getDueRelativeLabel(sale.nextDueDate)}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">مانده سررسید: <strong className="whitespace-nowrap text-slate-700 dark:text-slate-200">{formatPrice(sale.nextDueAmount ?? sale.installmentAmount)}</strong></div>
                                {Number(sale.overdueAmount || 0) > 0 ? (
                                  <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-300">معوق: {formatPrice(sale.overdueAmount)}</div>
                                ) : null}
                              </div>
                            ) : <div className="text-[10px] text-slate-400">سررسید باز ثبت نشده است</div>
                          ) : (
                            <div className="text-[10px] text-slate-400">{sale.overallStatus === 'تکمیل شده' ? 'پرونده مالی بسته شده' : 'قرارداد از چرخه وصول خارج است'}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top text-center">
                        <TableActionGroup
                          ariaLabel={`عملیات قرارداد ${sale.id?.toLocaleString('fa-IR') ?? ''}`}
                          collapseBelow="xl"
                          actions={[
                            {
                              key: 'view',
                              kind: 'link',
                              to: `/installment-sales/${sale.id}`,
                              label: 'مشاهده قرارداد',
                              icon: <i className="fa-solid fa-eye" aria-hidden="true" />,
                              variant: 'secondary',
                            },
                            ...((sale.overallStatus === 'در حال پرداخت' || sale.overallStatus === 'معوق') ? [{
                              key: 'pay-next',
                              kind: 'link' as const,
                              to: `/installment-sales/${sale.id}?pay=next`,
                              label: 'ثبت دریافت',
                              icon: <i className="fa-solid fa-hand-holding-dollar" aria-hidden="true" />,
                              variant: 'success' as const,
                            }] : []),
                            ...(currentUser?.roleName === 'Admin' && sale.overallStatus !== 'فسخ شده' ? [{
                              key: 'cancel',
                              kind: 'button' as const,
                              label: 'فسخ قرارداد',
                              icon: <i className="fa-solid fa-file-circle-xmark" aria-hidden="true" />,
                              variant: 'danger' as const,
                              onClick: () => openCancellation(sale),
                            }] : []),
                          ]}
                        />
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </DataTableShell>

            <div data-ui-installment-view="cards">
              {filteredSales.map((sale) => {
                const risk = getCollectionRisk(sale);
                const totalAmount = Math.max(0, Number(sale.totalInstallmentPrice ?? sale.actualSalePrice ?? 0));
                const remainingAmount = Math.max(0, Number(sale.remainingAmount || 0));
                const collectedAmount = Math.max(0, Number(sale.collectedAmount ?? Math.max(0, totalAmount - remainingAmount)));
                return (
                <PanelCard
                  key={`card-${sale.id}`}
                  title={sale.customerFullName || `قرارداد ${sale.id?.toLocaleString('fa-IR') ?? ''}`}
                  subtitle={sale.itemsSummary || sale.phoneModel || 'فروش اقساطی'}
                  icon={<i className="fa-solid fa-file-invoice-dollar" aria-hidden="true" />}
                  tone={risk.level === 'high' ? 'danger' : sale.overallStatus === 'فسخ شده' ? 'neutral' : sale.overallStatus === 'تکمیل شده' ? 'success' : 'info'}
                  density="compact"
                  actions={<StatusPill status={sale.overallStatus} />}
                >
                  <div className="space-y-3 border-b border-slate-200/70 pb-3 text-xs dark:border-slate-800/80">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CollectionRiskPill sale={sale} />
                      <span className="text-[10px] font-bold text-slate-400">قرارداد #{sale.id?.toLocaleString('fa-IR') ?? '—'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-500 dark:text-slate-400">مانده</div>
                        <div className="mt-1 whitespace-nowrap font-black text-slate-950 dark:text-slate-50">{formatPrice(remainingAmount)}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-500 dark:text-slate-400">وصول‌شده</div>
                        <div className="mt-1 whitespace-nowrap font-black text-slate-950 dark:text-slate-50">{formatPrice(collectedAmount)}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-500 dark:text-slate-400">آخرین دریافت</div>
                        <div className="mt-1 whitespace-nowrap font-black text-slate-950 dark:text-slate-50">{sale.lastCollectionDate ? formatPrice(sale.lastCollectionAmount || 0) : '—'}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">{sale.lastCollectionDate ? `${formatIsoToShamsi(sale.lastCollectionDate)} • ${getCollectionSourceLabel(sale.lastCollectionSource)}` : 'دریافتی ثبت نشده'}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-500 dark:text-slate-400">نزدیک‌ترین سررسید</div>
                        <div className="mt-1 whitespace-nowrap font-black text-slate-950 dark:text-slate-50">
                          {sale.overallStatus === 'فسخ شده' ? 'فسخ شده' : sale.overallStatus === 'تکمیل شده' ? 'تسویه کامل' : sale.nextDueDate ? formatIsoToShamsi(sale.nextDueDate) : '—'}
                        </div>
                        {sale.nextDueDate && (sale.overallStatus === 'در حال پرداخت' || sale.overallStatus === 'معوق') ? (
                          <div className="mt-0.5 text-[10px] text-slate-400">{getDueRelativeLabel(sale.nextDueDate)} • {formatPrice(sale.nextDueAmount ?? sale.installmentAmount)}</div>
                        ) : null}
                      </div>
                      {sale.phoneImei ? (
                        <div className="col-span-2 min-w-0 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400" dir="ltr">IMEI {sale.phoneImei}</div>
                      ) : null}
                    </div>
                  </div>
                  <div className="installment-card-actions mt-3">
                    <Button type="button" variant="secondary" size="xs" onClick={() => navigate(`/installment-sales/${sale.id}`)} leftIcon={<i className="fa-solid fa-eye" aria-hidden="true" />}>مشاهده</Button>
                    {(sale.overallStatus === 'در حال پرداخت' || sale.overallStatus === 'معوق') ? (
                      <Button type="button" variant="success" size="xs" onClick={() => navigate(`/installment-sales/${sale.id}?pay=next`)} leftIcon={<i className="fa-solid fa-hand-holding-dollar" aria-hidden="true" />}>ثبت دریافت</Button>
                    ) : null}
                    {currentUser?.roleName === 'Admin' && sale.overallStatus !== 'فسخ شده' ? (
                      <Button type="button" variant="danger" size="xs" onClick={() => openCancellation(sale)} leftIcon={<i className="fa-solid fa-file-circle-xmark" aria-hidden="true" />}>فسخ</Button>
                    ) : null}
                  </div>
                </PanelCard>
                );
              })}
            </div>

          </div>
        )}

        {!isLoading && pagination.total > 0 ? (
          <div className="mt-3 flex flex-col gap-3 border-t border-slate-200/80 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800" data-ui-installment-pagination="true">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="xs"
                disabled={pagination.page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                leftIcon={<i className="fa-solid fa-chevron-right" aria-hidden="true" />}
              >
                قبلی
              </Button>
              <div className="flex flex-wrap items-center gap-1" aria-label="صفحه‌بندی فروش اقساطی">
                {visiblePageNumbers.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    type="button"
                    variant={pageNumber === pagination.page ? 'neutral' : 'secondary'}
                    size="xs"
                    onClick={() => setPage(pageNumber)}
                    aria-label={`صفحه ${pageNumber.toLocaleString('fa-IR')}`}
                  >
                    {pageNumber.toLocaleString('fa-IR')}
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                disabled={!pagination.hasMore}
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                leftIcon={<i className="fa-solid fa-chevron-left" aria-hidden="true" />}
              >
                بعدی
              </Button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="whitespace-nowrap text-[11px] font-medium text-slate-500 dark:text-slate-400">
                صفحه {pagination.page.toLocaleString('fa-IR')} از {pagination.totalPages.toLocaleString('fa-IR')}
              </span>
              <div className="min-w-[150px]">
                <SelectField
                  value={String(pageSize)}
                  onValueChange={(value) => { setPage(1); setPageSize(Number(value) || 30); }}
                  ariaLabel="تعداد قرارداد در هر صفحه"
                  size="sm"
                  iconClassName="fa-solid fa-list-ol"
                  options={[
                    { value: '20', label: '۲۰ مورد در صفحه' },
                    { value: '30', label: '۳۰ مورد در صفحه' },
                    { value: '50', label: '۵۰ مورد در صفحه' },
                    { value: '100', label: '۱۰۰ مورد در صفحه' },
                  ]}
                />
              </div>
            </div>
          </div>
        ) : null}

            </div>
          </Surface>
        )}
      </div>

      <InstallmentCancellationModal
        isOpen={Boolean(cancellationSale)}
        sale={cancellationSale}
        onClose={() => setCancellationSale(null)}
        onCanceled={(message) => {
          setNotification({ type: 'success', text: message });
          summaryLoadedRef.current = true;
          void fetchInstallmentSales({ includeSummary: true });
        }}
      />
    </PageKit>
  );
};

export default InstallmentSalesPage;
