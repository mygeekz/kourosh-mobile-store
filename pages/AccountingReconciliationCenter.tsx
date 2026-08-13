import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '../components/Button';
import Notification from '../components/Notification';
import { AppModal } from '../components/modals';
import {
  AppSearchField,
  DataTableShell,
  EmptyState,
  PageShell,
  PanelCard,
  SelectField,
  Skeleton,
  TableActionGroup,
} from '../components/ui';
import { apiFetch } from '../utils/apiFetch';
import { formatCurrencyText } from '../utils/currency';
import { formatExactNumberText } from '../utils/exactNumber';
import type { NotificationMessage } from '../types';

type ReconciliationStatus = 'needs_review' | 'resolved';
type ReconciliationSeverity = 'warning' | 'high';

type ReconciliationIssue = {
  issueKey: string;
  issueType: string;
  entityType: string;
  entityId: number | null;
  saleId: number | null;
  severity: ReconciliationSeverity;
  title: string;
  details: Record<string, unknown>;
  status: ReconciliationStatus;
  automaticRepairAllowed: boolean;
  firstDetectedAt: string | null;
  lastDetectedAt: string | null;
  resolvedAt: string | null;
  source: 'live' | 'history';
  customerId: number | null;
  customerName: string | null;
  saleType: string | null;
  saleDate: string | null;
  exposureAmount: number;
};

type ReconciliationMeta = {
  pagination: { limit: number; offset: number; total: number };
  summary: {
    active: number;
    high: number;
    resolved: number;
    unknownCashDate: number;
    exposureAmount: number;
    liveDetected: number;
    lastPersistedDetectionAt: string | null;
  };
  options: { issueTypes: Array<{ value: string; count: number }> };
  generatedAt: string;
  readOnly: boolean;
};

const PAGE_SIZE = 25;
const EMPTY_META: ReconciliationMeta = {
  pagination: { limit: PAGE_SIZE, offset: 0, total: 0 },
  summary: {
    active: 0,
    high: 0,
    resolved: 0,
    unknownCashDate: 0,
    exposureAmount: 0,
    liveDetected: 0,
    lastPersistedDetectionAt: null,
  },
  options: { issueTypes: [] },
  generatedAt: '',
  readOnly: true,
};

const ISSUE_META: Record<string, { label: string; explanation: string; evidence: string }> = {
  cashed_check_unknown_cash_date: {
    label: 'چک نقدشده بدون تاریخ وصول',
    explanation: 'وضعیت چک «نقد شد» است، اما تاریخ واقعی وصول در داده قدیمی ثبت نشده است. سیستم عمداً تاریخ امروز یا سررسید را جای آن حدس نمی‌زند.',
    evidence: 'برای اصلاح، تاریخ واقعی وصول باید از روی سند بانکی یا چک فیزیکی مشخص شود.',
  },
  cashed_check_missing_ledger: {
    label: 'وصول چک بدون سند دفتر مشتری',
    explanation: 'تاریخ وصول چک موجود است اما Credit متناظر در دفتر مشتری پیدا نشده است.',
    evidence: 'این مورد از نظر داده قابل ترمیم قطعی است، ولی این مرکز Read-only است و هیچ Repair اجرا نمی‌کند.',
  },
  check_contract_total_mismatch: {
    label: 'مغایرت جمع چک و قرارداد',
    explanation: 'جمع مبلغ چک‌های ثبت‌شده با مانده قرارداد پس از پیش‌پرداخت برابر نیست.',
    evidence: 'قبل از اصلاح باید قرارداد، پیش‌پرداخت و اصل چک‌ها با سند واقعی تطبیق داده شوند.',
  },
  duplicate_check_number_across_sales: {
    label: 'شماره چک تکراری بین قراردادها',
    explanation: 'یک شماره چک در بیش از یک فروش اقساطی استفاده شده است و سیستم نمی‌تواند تشخیص دهد کدام ثبت صحیح است.',
    evidence: 'شماره روی چک فیزیکی و قراردادهای مرتبط باید بررسی شود.',
  },
  installment_start_before_sale_date: {
    label: 'شروع اقساط قبل از تاریخ فروش',
    explanation: 'تاریخ شروع برنامه اقساط قبل از تاریخ واقعی فروش ثبت شده است.',
    evidence: 'تاریخ صحیح اولین سررسید باید از روی قرارداد واقعی مشخص شود.',
  },
  installment_schedule_total_mismatch: {
    label: 'مغایرت جمع برنامه اقساط',
    explanation: 'جمع ردیف‌های برنامه اقساط با بدهی واقعی قرارداد برابر نیست.',
    evidence: 'اگر Repair امن ممکن نباشد، مبلغ یا سابقه پرداخت قسط باید قبل از هر تغییر بررسی شود.',
  },
  canceled_sale_missing_reversal_snapshot: {
    label: 'فسخ بدون Snapshot حسابداری',
    explanation: 'قرارداد فسخ‌شده است اما رکورد مستقل اثرات فسخ پیدا نشد؛ این حالت می‌تواند حاصل داده قدیمی یا عملیات ناقص باشد.',
    evidence: 'سابقه Audit و وضعیت قرارداد باید بررسی شود؛ سیستم هیچ Reversal حدسی ایجاد نمی‌کند.',
  },
  canceled_sale_financial_review_required: {
    label: 'فسخ با تسویه مالی باز',
    explanation: 'فسخ عمداً بدون حدس‌زدن مبلغ یا تاریخ انجام شده و تسویه مالی قرارداد هنوز نیازمند تصمیم انسانی است.',
    evidence: 'قرارداد فسخ شده است؛ فقط نتیجه تسویه باید با سند واقعی تکمیل شود.',
  },
  canceled_sale_physical_items_not_returned: {
    label: 'اقلام قرارداد فسخ‌شده عودت نشده‌اند',
    explanation: 'فسخ ثبت شده اما بازگشت فیزیکی کالا/گوشی تأیید نشده است؛ بنابراین موجودی عمداً تغییر نکرده است.',
    evidence: 'در صورت برگشت واقعی کالا، رسید یا تحویل فیزیکی باید بررسی شود.',
  },
  canceled_sale_unused_checks_not_returned: {
    label: 'چک استفاده‌نشده قرارداد فسخ‌شده عودت نشده',
    explanation: 'قرارداد فسخ شده اما یک یا چند چک وصول‌نشده هنوز به‌عنوان عودت‌شده به مشتری ثبت نشده‌اند.',
    evidence: 'تحویل اصل چک باید تأیید شود؛ تا آن زمان سیستم وضعیت چک را حدس نمی‌زند.',
  },
  canceled_sale_physical_return_unresolved: {
    label: 'بازگشت فیزیکی قرارداد نیازمند بررسی',
    explanation: 'بازگشت کالا/گوشی تأیید شده اما حداقل یک قلم به دلیل نبود رکورد یا وضعیت ناسازگار، به‌صورت قطعی قابل بازگردانی خودکار نبوده است.',
    evidence: 'وضعیت فعلی قلم و رسید تحویل باید بررسی شود؛ سیستم برای تکمیل موجودی یا وضعیت گوشی هیچ فرضی نمی‌سازد.',
  },

  canceled_sale_receipt_ledger_gap: {
    label: 'مغایرت وصول و Ledger پس از فسخ',
    explanation: 'مبلغ وصول‌شده شناخته‌شده قرارداد با Creditهای قابل ردیابی دفتر مشتری برابر نیست.',
    evidence: 'منبع وصول یا تاریخ تاریخی باید از سند واقعی مشخص شود؛ Reversal فسخ این اختلاف را پنهان نمی‌کند.',
  },
};

const DETAIL_LABELS: Record<string, string> = {
  checkNumber: 'شماره چک',
  amount: 'مبلغ چک',
  dueDate: 'تاریخ سررسید',
  cashedAt: 'تاریخ واقعی وصول',
  customerId: 'شناسه مشتری',
  automaticRepairAllowed: 'اجازه ترمیم خودکار',
  contractDebt: 'بدهی قرارداد',
  checksTotal: 'جمع چک‌ها',
  delta: 'اختلاف',
  checkIds: 'شناسه چک‌ها',
  saleIds: 'شناسه قراردادها',
  saleDate: 'تاریخ فروش',
  unresolvedPhysicalRows: 'تعداد اقلام فیزیکی حل‌نشده',
  unresolvedPhysicalItems: 'جزئیات اقلام فیزیکی حل‌نشده',

  expectedRefundDue: 'مبلغ قابل استرداد',
  settlementStatus: 'وضعیت تسویه فسخ',
  physicalQuantity: 'تعداد اقلام فیزیکی',
  pendingCheckCount: 'چک‌های استفاده‌نشده',
  collectedAfterDownPayment: 'وصول پس از پیش‌پرداخت',
  ledgerReceiptCredits: 'Credit وصول در دفتر مشتری',
  installmentsStartDate: 'شروع اقساط',
  scheduledTotal: 'جمع برنامه اقساط',
};

const MONEY_DETAIL_KEYS = new Set(['amount', 'contractDebt', 'checksTotal', 'delta', 'scheduledTotal']);

const formatServerDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const statusLabel = (status: ReconciliationStatus) => status === 'resolved' ? 'رفع شده' : 'نیازمند بررسی';
const severityLabel = (severity: ReconciliationSeverity) => severity === 'high' ? 'اهمیت بالا' : 'هشدار';

const formatDetailValue = (key: string, value: unknown): React.ReactNode => {
  if (value == null || value === '') return 'ثبت نشده';
  if (key === 'automaticRepairAllowed') return Boolean(value) ? 'بله' : 'خیر';
  if (MONEY_DETAIL_KEYS.has(key)) return formatCurrencyText(value);
  if (Array.isArray(value)) return value.map((item) => formatExactNumberText(item)).join('، ');
  if (typeof value === 'number') return formatExactNumberText(value);
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const issueLabel = (issueType: string) => ISSUE_META[issueType]?.label || issueType;

const AccountingReconciliationCenter: React.FC = () => {
  const [rows, setRows] = useState<ReconciliationIssue[]>([]);
  const [meta, setMeta] = useState<ReconciliationMeta>(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | ReconciliationStatus>('needs_review');
  const [severity, setSeverity] = useState<'ALL' | ReconciliationSeverity>('ALL');
  const [issueType, setIssueType] = useState('ALL');
  const [selectedIssue, setSelectedIssue] = useState<ReconciliationIssue | null>(null);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, status, severity, issueType]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
        q: debouncedSearch,
        status,
        severity,
        issueType,
      });
      const response = await apiFetch(`/api/accounting-reconciliation?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.message || 'دریافت مرکز تطبیق حسابداری ناموفق بود.');
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setMeta(payload.meta || EMPTY_META);
    } catch (error: any) {
      setRows([]);
      setNotification({ type: 'error', text: error?.message || 'خطا در دریافت مغایرت‌های حسابداری.' });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, issueType, page, severity, status]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(meta.pagination.total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rangeStart = meta.pagination.total ? meta.pagination.offset + 1 : 0;
  const rangeEnd = Math.min(meta.pagination.offset + rows.length, meta.pagination.total);
  const hasFilters = Boolean(debouncedSearch || status !== 'needs_review' || severity !== 'ALL' || issueType !== 'ALL');

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatus('needs_review');
    setSeverity('ALL');
    setIssueType('ALL');
    setPage(1);
  };

  const metricCards = useMemo(() => [
    {
      title: 'نیازمند بررسی',
      value: formatExactNumberText(meta.summary.active),
      hint: 'مغایرت‌های زنده که هنوز مدرک قطعی برای اصلاح ندارند',
      tone: meta.summary.active > 0 ? 'warning' as const : 'success' as const,
      icon: 'fa-triangle-exclamation',
    },
    {
      title: 'اهمیت بالا',
      value: formatExactNumberText(meta.summary.high),
      hint: 'مواردی که می‌توانند روی تاریخچه یا مانده مالی اثر بگذارند',
      tone: meta.summary.high > 0 ? 'danger' as const : 'success' as const,
      icon: 'fa-shield-halved',
    },
    {
      title: 'تاریخ وصول نامشخص',
      value: formatExactNumberText(meta.summary.unknownCashDate),
      hint: 'چک‌های Legacy که تاریخ واقعی وصول آن‌ها قابل اثبات نیست',
      tone: meta.summary.unknownCashDate > 0 ? 'warning' as const : 'success' as const,
      icon: 'fa-calendar-xmark',
    },
    {
      title: 'مبلغ درگیر قابل‌اندازه‌گیری',
      value: formatCurrencyText(meta.summary.exposureAmount),
      hint: 'جمع نمایشی Flagهای مبلغ‌دار است؛ مانده حساب یا بدهی جدید نیست',
      tone: meta.summary.exposureAmount > 0 ? 'warning' as const : 'neutral' as const,
      icon: 'fa-scale-balanced',
    },
  ], [meta.summary]);

  const issueDetails = selectedIssue ? Object.entries(selectedIssue.details || {}) : [];
  const selectedMeta = selectedIssue ? ISSUE_META[selectedIssue.issueType] : undefined;

  return (
    <PageShell
      title="مرکز تطبیق حسابداری"
      description="پایش Read-only مغایرت‌های تاریخی اقساط و چک‌ها؛ هیچ مبلغ، تاریخ یا سند مالی از این صفحه تغییر نمی‌کند."
      icon={<i className="fa-solid fa-scale-balanced" aria-hidden="true" />}
      actions={(
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-emerald-200 px-3 text-xs font-black text-emerald-700 dark:border-emerald-900/70 dark:text-emerald-300">
            <i className="fa-solid fa-lock" aria-hidden="true" />
            فقط خواندنی
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void load()}
            loading={loading}
            leftIcon={<i className="fa-solid fa-rotate" />}
          >
            بروزرسانی تطبیق
          </Button>
        </div>
      )}
      headerContent={(
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.5fr)_minmax(170px,0.7fr)_minmax(170px,0.7fr)_minmax(220px,0.9fr)_auto]">
          <AppSearchField
            value={search}
            onChange={setSearch}
            placeholder="جستجو در قرارداد، مشتری، چک یا نوع مغایرت"
            ariaLabel="جستجو در مغایرت‌های حسابداری"
            clearable
          />
          <SelectField
            value={status}
            onValueChange={(value) => setStatus(value as 'ALL' | ReconciliationStatus)}
            ariaLabel="وضعیت بررسی"
            options={[
              { value: 'needs_review', label: 'نیازمند بررسی' },
              { value: 'resolved', label: 'رفع‌شده‌ها' },
              { value: 'ALL', label: 'همه وضعیت‌ها' },
            ]}
          />
          <SelectField
            value={severity}
            onValueChange={(value) => setSeverity(value as 'ALL' | ReconciliationSeverity)}
            ariaLabel="اهمیت مغایرت"
            options={[
              { value: 'ALL', label: 'همه اهمیت‌ها' },
              { value: 'high', label: 'اهمیت بالا' },
              { value: 'warning', label: 'هشدار' },
            ]}
          />
          <SelectField value={issueType} onValueChange={setIssueType} ariaLabel="نوع مغایرت">
            <option value="ALL">همه انواع مغایرت</option>
            {meta.options.issueTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {issueLabel(option.value)} ({formatExactNumberText(option.count)})
              </option>
            ))}
          </SelectField>
          <Button size="sm" variant="secondary" onClick={clearFilters} disabled={!hasFilters} leftIcon={<i className="fa-solid fa-filter-circle-xmark" />}>
            پاکسازی
          </Button>
        </div>
      )}
    >
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="mx-auto grid max-w-7xl gap-3 px-3 sm:grid-cols-2 sm:px-4 xl:grid-cols-4">
        {metricCards.map((card) => (
          <PanelCard
            key={card.title}
            variant="metric"
            density="compact"
            title={card.title}
            metricValue={card.value}
            metricHint={card.hint}
            tone={card.tone}
            icon={<i className={`fa-solid ${card.icon}`} aria-hidden="true" />}
          />
        ))}
      </div>

      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <PanelCard
          density="compact"
          tone="info"
          title="قرارداد این مرکز"
          subtitle="تشخیص زنده است، اما Repair و ویرایش از این صفحه عمداً وجود ندارد."
          icon={<i className="fa-solid fa-shield" aria-hidden="true" />}
        >
          <div className="grid gap-3 text-sm leading-7 text-slate-600 dark:text-slate-300 md:grid-cols-3">
            <div className="flex items-start gap-2">
              <i className="fa-solid fa-database mt-1.5 text-slate-400" aria-hidden="true" />
              <span>هر بار بارگذاری، داده‌های فعلی DB دوباره Read-only تطبیق داده می‌شوند.</span>
            </div>
            <div className="flex items-start gap-2">
              <i className="fa-solid fa-ban mt-1.5 text-slate-400" aria-hidden="true" />
              <span>تاریخ یا مبلغ نامطمئن هرگز از روی حدس، سررسید یا زمان فعلی ساخته نمی‌شود.</span>
            </div>
            <div className="flex items-start gap-2">
              <i className="fa-solid fa-clock-rotate-left mt-1.5 text-slate-400" aria-hidden="true" />
              <span>تاریخچه موارد رفع‌شده نیز برای Audit باقی می‌ماند و قابل مشاهده است.</span>
            </div>
          </div>
        </PanelCard>
      </div>

      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <DataTableShell
          title="مغایرت‌های حسابداری"
          subtitle={`نمایش ${formatExactNumberText(rangeStart)} تا ${formatExactNumberText(rangeEnd)} از ${formatExactNumberText(meta.pagination.total)} مورد`}
          kicker="Accounting reconciliation"
          kickerIcon={<i className="fa-solid fa-scale-balanced" aria-hidden="true" />}
          meta={(
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              تحلیل زنده: {formatServerDateTime(meta.generatedAt)}
            </span>
          )}
        >
          {loading ? (
            <div className="space-y-3 p-4 sm:p-5">
              {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16" rounded="lg" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-4 sm:p-6">
              <EmptyState
                icon={hasFilters ? 'fa-solid fa-magnifying-glass' : 'fa-solid fa-circle-check'}
                title={hasFilters ? 'موردی مطابق فیلترها پیدا نشد' : 'مغایرت فعالی پیدا نشد'}
                description={hasFilters ? 'فیلترها را تغییر بده یا پاکسازی کن.' : 'در بررسی زنده فعلی، مورد نیازمند بررسی انسانی وجود ندارد.'}
              />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="report-table ux-data-table" data-ui-table="true">
                  <thead>
                    <tr>
                      <th>وضعیت</th>
                      <th>مغایرت</th>
                      <th>قرارداد / مشتری</th>
                      <th>مبلغ درگیر</th>
                      <th>آخرین تشخیص</th>
                      <th>جزئیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.issueKey}>
                        <td>
                          <div className="flex flex-col items-start gap-1.5">
                            <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-black ${item.status === 'resolved' ? 'border-emerald-200 text-emerald-700 dark:border-emerald-900/70 dark:text-emerald-300' : 'border-amber-200 text-amber-700 dark:border-amber-900/70 dark:text-amber-300'}`}>
                              <i className={`fa-solid ${item.status === 'resolved' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} aria-hidden="true" />
                              {statusLabel(item.status)}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{severityLabel(item.severity)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="max-w-md">
                            <div className="font-black text-slate-900 dark:text-slate-100">{issueLabel(item.issueType)}</div>
                            <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{item.title}</div>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-1 text-sm">
                            {item.saleId ? <Link className="font-black text-slate-900 hover:underline dark:text-slate-100" to={`/installment-sales/${item.saleId}`}>قرارداد #{formatExactNumberText(item.saleId)}</Link> : <span className="font-bold text-slate-500">بدون قرارداد مستقیم</span>}
                            {item.customerId ? <div><Link className="text-xs font-bold text-slate-500 hover:underline dark:text-slate-400" to={`/customers/${item.customerId}`}>{item.customerName || `مشتری #${formatExactNumberText(item.customerId)}`}</Link></div> : null}
                          </div>
                        </td>
                        <td>
                          <span className="font-black tabular-nums text-slate-800 dark:text-slate-100">{item.exposureAmount > 0 ? formatCurrencyText(item.exposureAmount) : '—'}</span>
                        </td>
                        <td className="text-xs font-bold text-slate-500 dark:text-slate-400">{formatServerDateTime(item.lastDetectedAt || item.firstDetectedAt || meta.generatedAt)}</td>
                        <td>
                          <TableActionGroup
                            ariaLabel={`جزئیات ${item.title}`}
                            collapseBelow="sm"
                            actions={[{
                              key: 'view',
                              kind: 'button',
                              label: 'مشاهده',
                              tooltip: 'مشاهده شواهد و جزئیات مغایرت',
                              icon: <i className="fa-regular fa-eye" />,
                              variant: 'secondary',
                              onClick: () => setSelectedIssue(item),
                            }]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-3 md:hidden">
                {rows.map((item) => (
                  <PanelCard
                    key={item.issueKey}
                    density="compact"
                    tone={item.status === 'resolved' ? 'success' : 'warning'}
                    title={issueLabel(item.issueType)}
                    subtitle={item.title}
                    icon={<i className={`fa-solid ${item.status === 'resolved' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} aria-hidden="true" />}
                    actions={(
                      <Button size="xs" variant="secondary" onClick={() => setSelectedIssue(item)} leftIcon={<i className="fa-regular fa-eye" />}>
                        جزئیات
                      </Button>
                    )}
                  >
                    <div className="grid gap-2 text-xs sm:grid-cols-2">
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 px-3 py-2 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400">وضعیت</span>
                        <strong>{statusLabel(item.status)}</strong>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 px-3 py-2 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400">قرارداد</span>
                        {item.saleId ? <Link className="font-black hover:underline" to={`/installment-sales/${item.saleId}`}>#{formatExactNumberText(item.saleId)}</Link> : <strong>—</strong>}
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 px-3 py-2 dark:border-slate-800 sm:col-span-2">
                        <span className="text-slate-500 dark:text-slate-400">مبلغ درگیر</span>
                        <strong>{item.exposureAmount > 0 ? formatCurrencyText(item.exposureAmount) : '—'}</strong>
                      </div>
                    </div>
                  </PanelCard>
                ))}
              </div>
            </>
          )}
        </DataTableShell>

        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">صفحه {formatExactNumberText(safePage)} از {formatExactNumberText(totalPages)}</span>
          <div className="flex items-center gap-2">
            <Button size="xs" variant="secondary" disabled={safePage <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>قبلی</Button>
            <Button size="xs" variant="secondary" disabled={safePage >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>بعدی</Button>
          </div>
        </div>
      </div>

      {selectedIssue ? (
        <AppModal
          isOpen
          title="جزئیات تطبیق حسابداری"
          onClose={() => setSelectedIssue(null)}
          layout="horizontal"
          variant="operational"
          size="full"
          tone={selectedIssue.status === 'resolved' ? 'success' : 'warning'}
          iconClass="fa-solid fa-scale-balanced"
          ariaDescription="نمای Read-only شواهد ثبت‌شده برای مغایرت حسابداری"
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="space-y-4">
              <PanelCard
                density="compact"
                tone={selectedIssue.status === 'resolved' ? 'success' : 'warning'}
                title={issueLabel(selectedIssue.issueType)}
                subtitle={selectedIssue.title}
                icon={<i className={`fa-solid ${selectedIssue.status === 'resolved' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} aria-hidden="true" />}
              >
                <div className="space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  <p>{selectedMeta?.explanation || 'این مورد در تطبیق حسابداری شناسایی شده و نیازمند بررسی شواهد ثبت‌شده است.'}</p>
                  <div className="rounded-2xl border border-slate-200/80 px-3 py-3 dark:border-slate-800">
                    <div className="text-xs font-black text-slate-500 dark:text-slate-400">مدرک لازم برای تصمیم</div>
                    <div className="mt-1 font-bold text-slate-800 dark:text-slate-100">{selectedMeta?.evidence || 'سند منبع باید قبل از هر اصلاح مالی بررسی شود.'}</div>
                  </div>
                </div>
              </PanelCard>

              <PanelCard density="compact" title="شواهد داده‌ای" subtitle="مقادیر دقیق ذخیره‌شده یا محاسبه‌شده توسط Contract تطبیق" icon={<i className="fa-solid fa-list-check" aria-hidden="true" />}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {issueDetails.map(([key, value]) => (
                    <div key={key} className="rounded-2xl border border-slate-200/80 px-3 py-3 dark:border-slate-800">
                      <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{DETAIL_LABELS[key] || key}</div>
                      <div className="mt-1 break-words text-sm font-black text-slate-900 dark:text-slate-100">{formatDetailValue(key, value)}</div>
                    </div>
                  ))}
                </div>
              </PanelCard>
            </div>

            <div className="space-y-4">
              <PanelCard density="compact" title="مرجع بررسی" subtitle="مسیرهای مرتبط بدون امکان ویرایش از این Modal" icon={<i className="fa-solid fa-link" aria-hidden="true" />}>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-2 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">وضعیت</span>
                    <strong>{statusLabel(selectedIssue.status)}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-2 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">اهمیت</span>
                    <strong>{severityLabel(selectedIssue.severity)}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-2 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Repair خودکار</span>
                    <strong>{selectedIssue.automaticRepairAllowed ? 'از نظر داده ممکن' : 'ممنوع بدون سند'}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-2 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">آخرین تشخیص</span>
                    <strong>{formatServerDateTime(selectedIssue.lastDetectedAt || selectedIssue.firstDetectedAt || meta.generatedAt)}</strong>
                  </div>
                  {selectedIssue.saleId ? (
                    <Link className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-slate-200/80 px-3 font-black text-slate-800 hover:border-slate-300 dark:border-slate-800 dark:text-slate-100" to={`/installment-sales/${selectedIssue.saleId}`}>
                      <span>بازکردن قرارداد #{formatExactNumberText(selectedIssue.saleId)}</span>
                      <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                    </Link>
                  ) : null}
                  {selectedIssue.customerId ? (
                    <Link className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-slate-200/80 px-3 font-black text-slate-800 hover:border-slate-300 dark:border-slate-800 dark:text-slate-100" to={`/customers/${selectedIssue.customerId}`}>
                      <span>{selectedIssue.customerName || `مشتری #${formatExactNumberText(selectedIssue.customerId)}`}</span>
                      <i className="fa-solid fa-user" aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              </PanelCard>

              <PanelCard density="compact" tone="info" title="قفل ایمنی" icon={<i className="fa-solid fa-lock" aria-hidden="true" />}>
                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                  این مرکز فقط برای مشاهده و تصمیم‌گیری ساخته شده است. هیچ دکمه‌ای برای تغییر مبلغ قرارداد، تاریخ وصول، شماره چک، Ledger یا برنامه اقساط در این صفحه وجود ندارد.
                </p>
              </PanelCard>
            </div>
          </div>
        </AppModal>
      ) : null}
    </PageShell>
  );
};

export default AccountingReconciliationCenter;
