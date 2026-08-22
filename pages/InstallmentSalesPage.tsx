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
import { Button, EmptyState, ManagementDirectoryOverview, ManagementDirectoryPagination, ManagementDirectoryToolbar, PageKit, Skeleton, TableActionGroup } from '@/components/ui';
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

const getCollectionRiskTextClass = (level: CollectionRiskLevel) => {
  if (level === 'high') return 'text-rose-700 dark:text-rose-300';
  if (level === 'followup') return 'text-amber-700 dark:text-amber-300';
  if (level === 'due-soon') return 'text-sky-700 dark:text-sky-300';
  if (level === 'settled') return 'text-emerald-700 dark:text-emerald-300';
  return 'text-slate-600 dark:text-slate-300';
};

const CollectionRiskStatus: React.FC<{ sale: InstallmentSale }> = ({ sale }) => {
  const risk = getCollectionRisk(sale);
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 text-[10px] font-black leading-5 ${getCollectionRiskTextClass(risk.level)}`} title={risk.detail}>
      <i className={`fa-solid ${risk.icon} shrink-0`} aria-hidden="true" />
      <span>{risk.label}</span>
    </span>
  );
};

const StatusIndicator: React.FC<{ status: OverallInstallmentStatus }> = ({ status }) => {
  if (status === 'تکمیل شده') {
    return <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300"><i className="fa-solid fa-circle-check" aria-hidden="true" />تکمیل شده</span>;
  }
  if (status === 'معوق') {
    return <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-rose-700 dark:text-rose-300"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />معوق</span>;
  }
  if (status === 'فسخ شده') {
    return <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-file-circle-xmark" aria-hidden="true" />فسخ شده</span>;
  }
  return <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-sky-700 dark:text-sky-300"><i className="fa-solid fa-hourglass-half" aria-hidden="true" />در حال پرداخت</span>;
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

  const openInstallmentContractPrint = (saleId?: number) => {
    const id = Number(saleId || 0);
    if (!Number.isInteger(id) || id <= 0) {
      setNotification({ type: 'error', text: 'شناسه قرارداد برای چاپ معتبر نیست.' });
      return;
    }
    const base = `${window.location.origin}${window.location.pathname}`;
    const printUrl = `${base}#/print/installment-contract/${id}?mode=print`;
    const popup = window.open(printUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      setNotification({
        type: 'warning',
        text: 'مرورگر بازشدن تب چاپ را مسدود کرد. اجازه Pop-up را برای این برنامه فعال و دوباره «چاپ قرارداد» را انتخاب کنید.',
      });
    }
  };

  const openCancellation = (sale: InstallmentSale) => {
    setCancellationSale(sale);
  };

  return (
    <PageKit
      title="فروش اقساطی"
      subtitle="مدیریت قراردادها، سررسیدها، وصول‌ها و وضعیت پرونده‌های اقساطی"
      icon={<i className="fa-solid fa-calendar-check" aria-hidden="true" />}
      loadingTone="warning"
      isLoading={isLoading}
    >
      <div className="mx-auto grid max-w-7xl min-w-0 gap-4 px-3 text-right sm:px-4" dir="rtl" data-ui-management-page="installments">
        <ManagementDirectoryOverview
          eyebrow="مرکز کنترل اقساط"
          title="نمای کلی فروش اقساطی"
          subtitle="قراردادهای اقساطی، وضعیت وصول، پرونده‌های معوق و سررسیدهای نزدیک را در یک نمای هماهنگ مدیریت کنید."
          resultLabel={`${pagination.total.toLocaleString('fa-IR')} نتیجه فعال`}
          navigation={(
            <div className="inline-flex w-full max-w-[17rem] shrink-0 items-center gap-1 rounded-[18px] border border-slate-200/90 bg-slate-50/80 p-1 dark:border-slate-700/90 dark:bg-slate-900/75" aria-label="نمای فروش اقساطی">
              <Button
                type="button"
                variant={tab === 'main' ? 'neutral' : 'ghost'}
                size="sm"
                autoIcon={false}
                className="min-w-0 flex-1"
                onClick={() => setTab('main')}
                leftIcon={<i className="fa-solid fa-file-invoice-dollar" aria-hidden="true" />}
              >
                لیست اقساط
              </Button>
              <Button
                type="button"
                variant={tab === 'telegram' ? 'neutral' : 'ghost'}
                size="sm"
                autoIcon={false}
                className="min-w-0 flex-1"
                onClick={() => setTab('telegram')}
                leftIcon={<i className="fa-brands fa-telegram" aria-hidden="true" />}
              >
                تلگرام
              </Button>
            </div>
          )}
          actions={(
            <>
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
            </>
          )}
          quickStats={[
            {
              key: 'amount',
              label: 'مبلغ قراردادهای فعال',
              value: formatPrice(summary.totalAmountAll),
              meta: `مانده قابل وصول: ${formatPrice(summary.totalRemainingAll)}`,
              icon: 'fa-sack-dollar',
              tone: 'accent',
            },
            {
              key: 'open',
              label: 'پرونده‌های باز',
              value: `${(summary.activeAll + summary.overdueAll).toLocaleString('fa-IR')} پرونده`,
              meta: `${summary.overdueAll.toLocaleString('fa-IR')} پرونده معوق نیازمند پیگیری`,
              icon: 'fa-calendar-days',
              tone: summary.overdueAll > 0 ? 'warning' : 'info',
            },
          ]}
          metrics={[
            { key: 'all', label: 'کل قراردادها', value: summary.totalCount.toLocaleString('fa-IR'), meta: `${summary.canceledAll.toLocaleString('fa-IR')} فسخ‌شده`, icon: 'fa-layer-group', tone: 'accent' },
            { key: 'outstanding', label: 'مانده قابل وصول', value: formatPrice(summary.totalRemainingAll), meta: `وصول‌شده: ${formatPrice(summary.totalCollectedAll)}`, icon: 'fa-wallet', tone: 'info' },
            { key: 'overdue', label: 'معوق', value: summary.overdueAll.toLocaleString('fa-IR'), meta: 'نیازمند پیگیری', icon: 'fa-triangle-exclamation', tone: summary.overdueAll > 0 ? 'danger' : 'success' },
            { key: 'settled', label: 'تسویه‌شده', value: summary.doneAll.toLocaleString('fa-IR'), meta: 'پرونده بسته مالی', icon: 'fa-circle-check', tone: 'success' },
            { key: 'due-soon', label: 'سررسید نزدیک', value: summary.nextDueSoon.toLocaleString('fa-IR'), meta: `${summary.highRiskAll.toLocaleString('fa-IR')} پرونده با ریسک بالا`, icon: 'fa-bell', tone: summary.nextDueSoon > 0 ? 'warning' : 'neutral' },
          ]}
          metricsLabel="خلاصه فروش اقساطی"
        />

        <Notification message={notification} onClose={() => setNotification(null)} />

        <ManagementDirectoryToolbar
          ariaLabel="فیلتر فروش اقساطی"
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="نام مشتری، کالا، سریال یا شماره قرارداد..."
          searchAriaLabel="جستجوی فروش اقساطی"
          filters={[
            {
              key: 'status',
              value: statusFilter,
              ariaLabel: 'فیلتر وضعیت قرارداد',
              onValueChange: (value) => { setPage(1); setStatusFilter(value as '' | OverallInstallmentStatus); },
              options: [
                { value: '', label: 'همه وضعیت‌ها' },
                { value: 'در حال پرداخت', label: 'در حال پرداخت' },
                { value: 'معوق', label: 'معوق' },
                { value: 'تکمیل شده', label: 'تسویه‌شده' },
                { value: 'فسخ شده', label: 'فسخ‌شده' },
              ],
            },
            {
              key: 'risk',
              value: riskFilter,
              ariaLabel: 'فیلتر ریسک وصول',
              onValueChange: (value) => { setPage(1); setRiskFilter(value as '' | Exclude<CollectionRiskLevel, 'settled' | 'inactive'>); },
              options: [
                { value: '', label: 'همه ریسک‌ها' },
                { value: 'high', label: 'ریسک بالا' },
                { value: 'followup', label: 'نیازمند پیگیری' },
                { value: 'due-soon', label: 'سررسید نزدیک' },
                { value: 'normal', label: 'عادی' },
              ],
            },
            {
              key: 'sort',
              value: sortOrder,
              ariaLabel: 'مرتب‌سازی فهرست اقساط',
              onValueChange: (value) => { setPage(1); setSortOrder(value as InstallmentDirectorySort); },
              options: [
                { value: 'latest', label: 'جدیدترین' },
                { value: 'remaining_desc', label: 'بیشترین مانده' },
                { value: 'due_asc', label: 'نزدیک‌ترین سررسید' },
                { value: 'risk_desc', label: 'ریسک بیشتر' },
                { value: 'last_collection_desc', label: 'آخرین دریافت' },
              ],
            },
          ]}
          columns={3}
          resetDisabled={!(searchTerm || statusFilter || riskFilter || sortOrder !== 'latest')}
          onReset={() => { setPage(1); setSearchTerm(''); setDebouncedSearch(''); setStatusFilter(''); setRiskFilter(''); setSortOrder('latest'); }}
          notice={riskFilter ? {
            icon: 'fa-circle-info',
            text: <>فیلتر ریسک فعال است؛ {summary.highRiskAll.toLocaleString('fa-IR')} پرونده با ریسک بالا در کل فهرست ثبت شده است.</>,
          } : null}
        />

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
          <section
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
            dir="rtl"
            data-ui-installments-directory="true"
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

            <div className="min-w-0 max-w-full">
            {isLoading ? (
              <div className="w-full overflow-x-auto overscroll-x-contain" role="region" aria-label="در حال بارگذاری فهرست فروش اقساطی" tabIndex={0}>
                <table className="w-full min-w-[62rem] table-fixed border-collapse text-xs" dir="rtl" data-ui-table="true" data-ui-bidi-scope="rtl-table" data-ui-table-layout="managed" data-ui-table-density="compact">
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[22%]" />
                    <col className="w-[16%]" />
                    <col className="w-[20%]" />
                    <col className="w-[14%]" />
                  </colgroup>
                  <caption className="sr-only">در حال بارگذاری فهرست فروش اقساطی، وضعیت وصول، سررسید، ریسک و عملیات قرارداد</caption>
                  <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                    <tr className="border-b border-slate-200 text-right dark:border-slate-800">
                      <th scope="col" className="bg-slate-50 px-3 py-2 text-right font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">قرارداد و مشتری</th>
                      <th scope="col" className="bg-slate-50 px-3 py-2 text-right font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">وصول و مانده</th>
                      <th scope="col" className="bg-slate-50 px-3 py-2 text-right font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">آخرین دریافت</th>
                      <th scope="col" className="bg-slate-50 px-3 py-2 text-right font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">سررسید و ریسک</th>
                      <th scope="col" className="sticky end-0 z-20 bg-slate-50 px-2 py-2 text-center font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2.5"><Skeleton tone="warning" className="h-10 w-64 max-w-full" rounded="lg" /></td>
                        <td className="px-3 py-2.5"><Skeleton tone="warning" className="h-10 w-44 max-w-full" rounded="lg" /></td>
                        <td className="px-3 py-2.5"><Skeleton tone="warning" className="h-9 w-36 max-w-full" rounded="lg" /></td>
                        <td className="px-3 py-2.5"><Skeleton tone="warning" className="h-9 w-40 max-w-full" rounded="lg" /></td>
                        <td className="px-3 py-2.5"><Skeleton tone="warning" className="h-8 w-28 max-w-full" rounded="xl" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : filteredSales.length === 0 ? (
          <div className="p-3">
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
            <div className="w-full overflow-x-auto overscroll-x-contain" role="region" aria-label="جدول فهرست فروش اقساطی" tabIndex={0}>
              <table className="w-full min-w-[62rem] table-fixed border-collapse text-xs" dir="rtl" data-ui-table="true" data-ui-bidi-scope="rtl-table" data-ui-table-layout="managed" data-ui-table-density="compact">
                <caption className="sr-only">فهرست فروش اقساطی، وضعیت وصول، آخرین دریافت، سررسید، ریسک و عملیات قرارداد</caption>
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[22%]" />
                  <col className="w-[16%]" />
                  <col className="w-[20%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                  <tr className="border-b border-slate-200 text-right dark:border-slate-800">
                    <th scope="col" className="bg-slate-50 px-3 py-2 text-right font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">قرارداد و مشتری</th>
                    <th scope="col" className="bg-slate-50 px-3 py-2 text-right font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">وصول و مانده</th>
                    <th scope="col" className="bg-slate-50 px-3 py-2 text-right font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">آخرین دریافت</th>
                    <th scope="col" className="bg-slate-50 px-3 py-2 text-right font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">سررسید و ریسک</th>
                    <th scope="col" className="sticky end-0 z-20 bg-slate-50 px-2 py-2 text-center font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-700 dark:divide-slate-800 dark:bg-slate-950 dark:text-slate-200">
                  {filteredSales.map((sale) => {
                    const risk = getCollectionRisk(sale);
                    const totalAmount = Math.max(0, Number(sale.totalInstallmentPrice ?? sale.actualSalePrice ?? 0));
                    const remainingAmount = Math.max(0, Number(sale.remainingAmount || 0));
                    const collectedAmount = Math.max(0, Number(sale.collectedAmount ?? Math.max(0, totalAmount - remainingAmount)));
                    const collectionPercent = totalAmount > 0 ? Math.min(100, Math.max(0, (collectedAmount / totalAmount) * 100)) : 0;
                    const rowRail = risk.level === 'high'
                      ? 'border-s-4 border-s-rose-500'
                      : risk.level === 'followup'
                        ? 'border-s-4 border-s-amber-400'
                        : risk.level === 'due-soon'
                          ? 'border-s-4 border-s-sky-500'
                          : risk.level === 'settled'
                            ? 'border-s-4 border-s-emerald-500'
                            : 'border-s-4 border-s-slate-400';
                    return (
                    <tr key={sale.id} className="bg-white transition-colors hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900">
                      <td className={`px-3 py-2.5 align-top ${rowRail}`}>
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
                      <td className="px-3 py-2.5 align-top">
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
                      <td className="px-3 py-2.5 align-top">
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
                      <td className="px-3 py-2.5 align-top">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusIndicator status={sale.overallStatus} />
                            <CollectionRiskStatus sale={sale} />
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
                      <td className="sticky end-0 z-10 bg-inherit px-2 py-2.5 text-center align-middle">
                        <TableActionGroup
                          ariaLabel={`عملیات قرارداد ${sale.id?.toLocaleString('fa-IR') ?? ''}`}
                          collapseBelow="lg"
                          density="compact"
                          className="w-full justify-center"
                          actions={[
                            {
                              key: 'view',
                              kind: 'link',
                              to: `/installment-sales/${sale.id}`,
                              label: 'مشاهده قرارداد',
                              icon: <i className="fa-solid fa-eye" aria-hidden="true" />,
                              variant: 'secondary',
                            },
                            {
                              key: 'print-contract',
                              kind: 'button',
                              label: 'چاپ قرارداد',
                              icon: <i className="fa-solid fa-print" aria-hidden="true" />,
                              variant: 'primary',
                              onClick: () => openInstallmentContractPrint(sale.id),
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
            </div>
          </div>
        )}

        {!isLoading && pagination.total > 0 ? (
          <ManagementDirectoryPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pageSize}
            pageSizeOptions={[20, 30, 50, 100]}
            total={pagination.total}
            pageStart={((pagination.page - 1) * pagination.pageSize) + 1}
            pageEnd={Math.min(pagination.page * pagination.pageSize, pagination.total)}
            ariaLabel="صفحه‌بندی فروش اقساطی"
            pageSizeAriaLabel="تعداد قرارداد در هر صفحه"
            onPageChange={setPage}
            onPageSizeChange={(value) => { setPage(1); setPageSize(value); }}
          />
        ) : null}

            </div>
          </section>
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
