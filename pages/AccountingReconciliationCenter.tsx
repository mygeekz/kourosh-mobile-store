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
  TextField,
  TableActionGroup,
  Table,
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
    safeRepairable: number;
    resolved: number;
    unknownCashDate: number;
    exposureAmount: number;
    liveDetected: number;
    lastPersistedDetectionAt: string | null;
    auditTrailEvents: number;
    auditTrailLatestAt: string | null;
    ledgerDrift: number;
    missingReference: number;
    humanReview: number;
  };
  options: { issueTypes: Array<{ value: string; count: number }> };
  generatedAt: string;
  readOnly: boolean;
  capabilities?: { safeRepair?: boolean; humanReviewRequiredForAmbiguousHistory?: boolean };
  governanceHealth?: {
    openReconciliationIssues: number;
    closedPeriods: number;
    latestPeriodClosedAt: string | null;
    historicalSnapshots: number;
    latestSnapshotAt: string | null;
    migrationRegistryEntries: number;
    migrationsMissingChecksum: number;
    accountingAuditEvents: number;
    latestAccountingAuditAt: string | null;
    periodLockTriggerCount: number;
    periodLockActive: boolean;
    totalPeriodLocks?: number;
    reopenedPeriodEvents?: number;
    latestPeriodReopenedAt?: string | null;
    activeClosedPeriods?: Array<{ id: number; periodStart: string; periodEnd: string; closeReason?: string | null; closedAt?: string | null; snapshotId?: number | null; effectiveState?: string }>;
    migrationAffectedRows?: number;
    migrationsWithSafetyBackup?: number;
    latestMigration?: { id?: string; result?: string; affectedRows?: number; appliedAt?: string; backupFileName?: string; backupSha256?: string } | null;
  };
};

const PAGE_SIZE = 25;
const EMPTY_META: ReconciliationMeta = {
  pagination: { limit: PAGE_SIZE, offset: 0, total: 0 },
  summary: {
    active: 0,
    high: 0,
    safeRepairable: 0,
    resolved: 0,
    unknownCashDate: 0,
    exposureAmount: 0,
    liveDetected: 0,
    lastPersistedDetectionAt: null,
    auditTrailEvents: 0,
    auditTrailLatestAt: null,
    ledgerDrift: 0,
    missingReference: 0,
    humanReview: 0,
  },
  options: { issueTypes: [] },
  generatedAt: '',
  readOnly: false,
  capabilities: { safeRepair: true, humanReviewRequiredForAmbiguousHistory: true },
  governanceHealth: {
    openReconciliationIssues: 0,
    closedPeriods: 0,
    latestPeriodClosedAt: null,
    historicalSnapshots: 0,
    latestSnapshotAt: null,
    migrationRegistryEntries: 0,
    migrationsMissingChecksum: 0,
    accountingAuditEvents: 0,
    latestAccountingAuditAt: null,
    periodLockTriggerCount: 0,
    periodLockActive: false,
    totalPeriodLocks: 0,
    reopenedPeriodEvents: 0,
    latestPeriodReopenedAt: null,
    activeClosedPeriods: [],
    migrationAffectedRows: 0,
    migrationsWithSafetyBackup: 0,
    latestMigration: null,
  },
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
    evidence: 'اگر تاریخ وصول قطعی موجود باشد، این مورد در گروه Repair امن قرار می‌گیرد و بدون ساختن تاریخ جدید از همان مدرک ثبت‌شده بازسازی می‌شود.',
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
    label: 'فسخ بدون سابقه حسابداری',
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

  ledger_missing_reference: {
    label: 'سند بدون مرجع مالی',
    explanation: 'این ردیف دفتر به هیچ سند منبع با شناسه قطعی متصل نیست. داده‌های Legacy در این وضعیت به‌صورت خودکار حدس زده یا جابه‌جا نمی‌شوند.',
    evidence: 'منبع واقعی باید از روی رسید، قرارداد، فروش، قسط، چک یا تسویه مشخص و سپس با سند اصلاحی ثبت شود.',
  },
  ledger_orphan_manual_reference: {
    label: 'مرجع سند مستقل گمشده',
    explanation: 'Ledger ادعا می‌کند به یک سند مستقل حسابداری متصل است اما سند Immutable متناظر پیدا نمی‌شود.',
    evidence: 'Audit Trail و بکاپ باید بررسی شود؛ ساخت مرجع حدسی مجاز نیست.',
  },
  sale_missing_primary_ledger: {
    label: 'فروش بدون سند مالی اصلی',
    explanation: 'فروش ثبت شده اما سند Charge اصلی آن با Reference ID قطعی در دفتر مشتری وجود ندارد.',
    evidence: 'سند فروش و دفتر مشتری باید با هم تطبیق داده شوند؛ Repair خودکار بدون بررسی Source انجام نمی‌شود.',
  },
  supplier_owner_mismatch: {
    label: 'اختلاف تأمین‌کننده و مالک',
    explanation: 'مالک فعلی کالا با مالک شخصی‌ای که از Supplier نگاشت می‌شود یکسان نیست. این اختلاف ممکن است عمدی باشد، اما نباید پنهان بماند.',
    evidence: 'مالکیت واقعی خرید باید بررسی شود؛ سیستم برای مالکیت Manual تصمیم خودکار نمی‌گیرد.',
  },
  customer_zero_with_open_installments: {
    label: 'مشتری صفر ولی اقساط باز',
    explanation: 'مانده دفتر مشتری صفر است اما محاسبه Receivable قراردادهای اقساطی هنوز مبلغ باز نشان می‌دهد.',
    evidence: 'پرداخت‌ها، چک‌ها، پیش‌پرداخت و Ledger باید با قرارداد واقعی تطبیق داده شوند.',
  },
  installments_settled_customer_debt: {
    label: 'اقساط صفر ولی مشتری بدهکار',
    explanation: 'پرونده‌های اقساطی این مشتری تسویه شده‌اند اما دفتر مشتری هنوز بدهی مثبت دارد.',
    evidence: 'ممکن است بدهی از منبع دیگری باشد؛ بنابراین سیستم فقط هشدار می‌دهد و مبلغ را خودکار صفر نمی‌کند.',
  },
  partner_ledger_cache_drift: {
    label: 'اختلاف مانده دفتر همکار',
    explanation: 'مانده ذخیره‌شده روی یک ردیف با جمع واقعی گردش بدهکار/بستانکار تا همان نقطه برابر نیست.',
    evidence: 'این مقدار Cache است و با بازسازی از روی گردش قطعی قابل اصلاح امن است.',
  },
  customer_ledger_cache_drift: {
    label: 'اختلاف مانده دفتر مشتری',
    explanation: 'مانده ذخیره‌شده روی یک ردیف با جمع واقعی گردش دفتر مشتری هم‌خوان نیست.',
    evidence: 'Repair فقط ستون مانده مشتق‌شده را از روی اسناد اصلی بازسازی می‌کند.',
  },
  profit_snapshot_missing_allocation: {
    label: 'سود بدون تخصیص سهم',
    explanation: 'سود فروش Snapshot شده اما هیچ تخصیص فعال برای سهم مالک/شرکا وجود ندارد.',
    evidence: 'مالکیت و قواعد سهم همان فروش باید از منبع ثبت‌شده دوباره Snapshot شوند.',
  },
  profit_snapshot_cost_drift: {
    label: 'اختلاف مبنای بهای سود',
    explanation: 'بهای اولیه یا بهای بازار Snapshot سود با سند فروش و کالای منبع ناسازگار است.',
    evidence: 'Repair فقط از قیمت خرید ثبت‌شده در سند و کالای منبع استفاده می‌کند؛ عدد جدید حدس زده نمی‌شود.',
  },
  ledger_date_outlier: {
    label: 'تاریخ غیرعادی دفتر',
    explanation: 'تاریخ سند نامعتبر یا به‌طور غیرعادی در آینده است و می‌تواند گزارش دوره‌ای را جابه‌جا کند.',
    evidence: 'تاریخ صحیح باید از سند واقعی مشخص شود و به‌صورت خودکار جایگزین نمی‌شود.',
  },
  future_profit_snapshot: {
    label: 'سود با تاریخ آینده',
    explanation: 'Snapshot سود تاریخ آینده دارد و تا رسیدن تاریخ آن از گزارش عملکرد جاری کنار گذاشته می‌شود.',
    evidence: 'در صورت اشتباه بودن تاریخ، سند فروش منبع باید بررسی شود.',
  },
  invalid_ledger_movement: {
    label: 'ساختار نامعتبر سند دفتر',
    explanation: 'یک ردیف دفتر قانون بدهکار/بستانکار را نقض کرده است. تنها استثنا سند سیستمیِ صفرخالص با بدهکار و بستانکار دقیقاً برابر و مرجع معتبر است.',
    evidence: 'این مورد به‌صورت خودکار تغییر نمی‌کند؛ سند منبع باید تعیین کند کدام سمت صحیح است.',
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
  manualReceiptTotal: 'دریافت نقدی متصل به قرارداد',
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
  partnerId: 'شناسه همکار',
  accountId: 'شناسه حساب',
  storedBalance: 'مانده ذخیره‌شده',
  expectedBalance: 'مانده واقعی از گردش',
  sourceKind: 'نوع سند منبع',
  sourceId: 'شناسه سند منبع',
  itemType: 'نوع قلم',
  itemId: 'شناسه قلم',
  itemDescription: 'شرح قلم',
  totalProfitAmount: 'سود کل',
  snapshotInitialCost: 'بهای اولیه Snapshot',
  sourceInitialCost: 'بهای اولیه منبع',
  snapshotMarketCost: 'بهای بازار Snapshot',
  documentBuyPrice: 'قیمت خرید سند',
  transactionDate: 'تاریخ حسابداری',
  createdAt: 'زمان ایجاد',
  description: 'شرح سند',
  debit: 'بدهکار',
  credit: 'بستانکار',
  referenceType: 'نوع مرجع',
  referenceId: 'شناسه مرجع',
  expectedReferenceType: 'نوع مرجع مورد انتظار',
  supplierId: 'شناسه تأمین‌کننده',
  supplierName: 'تأمین‌کننده',
  ownershipProfileId: 'پروفایل مالک فعلی',
  ownershipTitle: 'مالک فعلی',
  expectedOwnershipProfileId: 'پروفایل مالک مورد انتظار',
  expectedOwnershipTitle: 'مالک متناظر با تأمین‌کننده',
  installmentSaleCount: 'تعداد پرونده اقساط',
  openInstallmentSaleCount: 'پرونده اقساط باز',
  installmentRemaining: 'مانده واقعی اقساط',
  customerLedgerBalance: 'مانده دفتر مشتری',
  requiresHumanSourceAssignment: 'نیازمند تعیین منبع انسانی',
};

const MONEY_DETAIL_KEYS = new Set([
  'amount', 'contractDebt', 'checksTotal', 'manualReceiptTotal', 'delta', 'scheduledTotal',
  'storedBalance', 'expectedBalance', 'totalProfitAmount', 'snapshotInitialCost',
  'sourceInitialCost', 'snapshotMarketCost', 'documentBuyPrice', 'debit', 'credit',
  'installmentRemaining', 'customerLedgerBalance',
]);

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
  if (key === 'automaticRepairAllowed' || key === 'requiresHumanSourceAssignment') return Boolean(value) ? 'بله' : 'خیر';
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
  const [repairing, setRepairing] = useState(false);
  const [preparingRepair, setPreparingRepair] = useState(false);
  const [repairConfirmationToken, setRepairConfirmationToken] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [periodCloseReason, setPeriodCloseReason] = useState('');
  const [preparingPeriodClose, setPreparingPeriodClose] = useState(false);
  const [closingPeriod, setClosingPeriod] = useState(false);
  const [periodCloseToken, setPeriodCloseToken] = useState<string | null>(null);
  const [reopenLockId, setReopenLockId] = useState<number | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenToken, setReopenToken] = useState<string | null>(null);
  const [preparingReopen, setPreparingReopen] = useState(false);
  const [reopeningPeriod, setReopeningPeriod] = useState(false);
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

  const prepareSafeRepair = useCallback(async () => {
    if (preparingRepair || repairing) return;
    setPreparingRepair(true);
    try {
      const response = await apiFetch('/api/accounting-reconciliation/prepare-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'safe_repair' }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success || !payload?.data?.token) throw new Error(payload?.message || 'مرحله اول تأیید Repair ناموفق بود.');
      setRepairConfirmationToken(String(payload.data.token));
      setNotification({ type: 'warning', text: 'مرحله اول تأیید شد. اجرای نهایی Repair با درخواست دوم انجام می‌شود و قبل از آن بکاپ SHA256‌دار ساخته خواهد شد.' });
    } catch (error: any) {
      setRepairConfirmationToken(null);
      setNotification({ type: 'error', text: error?.message || 'خطا در آماده‌سازی تأیید Repair.' });
    } finally {
      setPreparingRepair(false);
    }
  }, [preparingRepair, repairing]);

  const runSafeRepair = useCallback(async () => {
    if (repairing || !repairConfirmationToken) return;
    setRepairing(true);
    try {
      const response = await apiFetch('/api/accounting-reconciliation/repair-safe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'safe-only', confirmationToken: repairConfirmationToken }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.message || 'اجرای اصلاح امن ناموفق بود.');
      const fixed = Number(payload?.data?.rebuiltPartnerLedgerCaches || 0)
        + Number(payload?.data?.rebuiltCustomerLedgerCaches || 0)
        + Number(payload?.data?.autoOwnershipPhonesUpdated || 0)
        + Number(payload?.data?.autoOwnershipProductsUpdated || 0)
        + Number(payload?.data?.repairedKnownCashedCheckLedgers || 0)
        + Number(payload?.data?.linkedManualInstallmentReceipts || 0);
      const backupName = String(payload?.meta?.safetyBackup?.fileName || '');
      const checksumOk = Boolean(payload?.meta?.safetyBackup?.checksumVerified);
      setNotification({
        type: 'success',
        text: `اصلاح امن اجرا شد. ${formatExactNumberText(fixed)} عملیات بازسازی/همگام‌سازی بررسی شد؛ بکاپ قبل از Repair ${backupName || 'ثبت شد'}${checksumOk ? ' و SHA256 آن تأیید شد' : ''}.`,
      });
      setRepairConfirmationToken(null);
      setPage(1);
      await load();
    } catch (error: any) {
      setRepairConfirmationToken(null);
      setNotification({ type: 'error', text: error?.message || 'خطا در اجرای اصلاح امن حسابداری.' });
    } finally {
      setRepairing(false);
    }
  }, [load, repairConfirmationToken, repairing]);

  const preparePeriodClose = useCallback(async () => {
    if (preparingPeriodClose || closingPeriod) return;
    if (!periodStart || !periodEnd) {
      setNotification({ type: 'error', text: 'برای بستن دوره، تاریخ شروع و پایان را وارد کنید.' });
      return;
    }
    setPreparingPeriodClose(true);
    try {
      const response = await apiFetch('/api/accounting-reconciliation/prepare-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close_period', periodStart, periodEnd, reason: periodCloseReason }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success || !payload?.data?.token) throw new Error(payload?.message || 'مرحله اول تأیید بستن دوره ناموفق بود.');
      setPeriodCloseToken(String(payload.data.token));
      setNotification({ type: 'warning', text: 'مرحله اول بستن دوره ثبت شد. درخواست دوم دوره را در سطح SQLite قفل و Snapshot تاریخی نسخه‌بندی‌شده ایجاد می‌کند.' });
    } catch (error: any) {
      setPeriodCloseToken(null);
      setNotification({ type: 'error', text: error?.message || 'خطا در آماده‌سازی بستن دوره حسابداری.' });
    } finally {
      setPreparingPeriodClose(false);
    }
  }, [closingPeriod, periodCloseReason, periodEnd, periodStart, preparingPeriodClose]);

  const closePeriod = useCallback(async () => {
    if (closingPeriod || !periodCloseToken) return;
    setClosingPeriod(true);
    try {
      const response = await apiFetch('/api/accounting-reconciliation/close-period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart,
          periodEnd,
          reason: periodCloseReason,
          confirmationToken: periodCloseToken,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.message || 'بستن دوره حسابداری ناموفق بود.');
      const version = Number(payload?.data?.snapshot?.version || 0);
      const sha = String(payload?.data?.snapshot?.sha256 || '');
      setPeriodCloseToken(null);
      setNotification({
        type: 'success',
        text: `دوره بسته شد و Snapshot نسخه ${formatExactNumberText(version)} ثبت شد${sha ? `؛ SHA256: ${sha.slice(0, 12)}…` : ''}.`,
      });
      await load();
    } catch (error: any) {
      setPeriodCloseToken(null);
      setNotification({ type: 'error', text: error?.message || 'خطا در بستن دوره حسابداری.' });
    } finally {
      setClosingPeriod(false);
    }
  }, [closingPeriod, load, periodCloseReason, periodCloseToken, periodEnd, periodStart]);

  const preparePeriodReopen = useCallback(async (lockId: number) => {
    if (preparingReopen || reopeningPeriod) return;
    const reason = reopenReason.trim();
    if (!Number.isInteger(lockId) || lockId <= 0) return;
    if (reason.length < 5) {
      setNotification({ type: 'error', text: 'برای بازگشایی دوره، دلیل حداقل پنج حرفی وارد کنید.' });
      return;
    }
    setPreparingReopen(true);
    try {
      const response = await apiFetch('/api/accounting-reconciliation/prepare-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen_period', lockId, reason }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success || !payload?.data?.token) throw new Error(payload?.message || 'مرحله اول بازگشایی دوره ناموفق بود.');
      setReopenLockId(lockId);
      setReopenToken(String(payload.data.token));
      setNotification({ type: 'warning', text: 'مرحله اول بازگشایی تأیید شد. درخواست دوم یک Snapshot جدید ثبت و دوره را با Event غیرقابل‌حذف باز می‌کند.' });
    } catch (error: any) {
      setReopenToken(null);
      setNotification({ type: 'error', text: error?.message || 'خطا در آماده‌سازی بازگشایی دوره.' });
    } finally {
      setPreparingReopen(false);
    }
  }, [preparingReopen, reopenReason, reopeningPeriod]);

  const executePeriodReopen = useCallback(async () => {
    if (!reopenToken || !reopenLockId || reopeningPeriod) return;
    const reason = reopenReason.trim();
    setReopeningPeriod(true);
    try {
      const response = await apiFetch('/api/accounting-reconciliation/reopen-period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockId: reopenLockId, reason, confirmationToken: reopenToken }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.message || 'بازگشایی دوره ناموفق بود.');
      const version = Number(payload?.data?.snapshot?.version || 0);
      setNotification({ type: 'success', text: `دوره بازگشایی شد؛ Snapshot پیش از بازگشایی با نسخه ${formatExactNumberText(version)} ثبت شد و سابقه قفل قبلی محفوظ ماند.` });
      setReopenToken(null);
      setReopenLockId(null);
      setReopenReason('');
      await load();
    } catch (error: any) {
      setReopenToken(null);
      setNotification({ type: 'error', text: error?.message || 'خطا در بازگشایی دوره حسابداری.' });
    } finally {
      setReopeningPeriod(false);
    }
  }, [load, reopenLockId, reopenReason, reopenToken, reopeningPeriod]);

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
      title: 'قابل اصلاح امن',
      value: formatExactNumberText(meta.summary.safeRepairable),
      hint: 'موارد مشتق‌شده‌ای که بدون حدس مبلغ یا تاریخ قابل بازسازی هستند',
      tone: meta.summary.safeRepairable > 0 ? 'info' as const : 'success' as const,
      icon: 'fa-wand-magic-sparkles',
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
      description="کنترل سلامت مالی، تفکیک موارد قابل ترمیم امن از موارد نیازمند سند، و اجرای Repair بدون حدس‌زدن مبلغ یا تاریخ."
      icon={<i className="fa-solid fa-scale-balanced" aria-hidden="true" />}
      actions={(
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-emerald-200 px-3 text-xs font-black text-emerald-700 dark:border-emerald-900/70 dark:text-emerald-300">
            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
            Repair فقط برای موارد قطعی
          </span>
          {!repairConfirmationToken ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => void prepareSafeRepair()}
              loading={preparingRepair}
              disabled={!meta.capabilities?.safeRepair || meta.summary.safeRepairable <= 0}
              leftIcon={<i className="fa-solid fa-shield" />}
            >
              آماده‌سازی Repair ({formatExactNumberText(meta.summary.safeRepairable)})
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={() => void runSafeRepair()}
              loading={repairing}
              leftIcon={<i className="fa-solid fa-check-double" />}
            >
              تأیید نهایی و اجرای Repair
            </Button>
          )}
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
          tone={meta.summary.active === 0 && meta.summary.ledgerDrift === 0 && meta.summary.missingReference === 0 && Boolean(meta.governanceHealth?.periodLockActive) && !Number(meta.governanceHealth?.migrationsMissingChecksum || 0) ? 'success' : 'warning'}
          title={`وضعیت حسابداری: ${meta.summary.active === 0 && meta.summary.ledgerDrift === 0 && meta.summary.missingReference === 0 && Boolean(meta.governanceHealth?.periodLockActive) && !Number(meta.governanceHealth?.migrationsMissingChecksum || 0) ? 'سالم' : 'نیازمند بررسی'}`}
          subtitle="شاخص سریع روزانه؛ هر عدد مستقیماً از مرکز تطبیق و Guardهای دیتابیس محاسبه می‌شود."
          icon={<i className="fa-solid fa-heart-pulse" aria-hidden="true" />}
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 px-3 py-3 dark:border-slate-800">
              <div className="text-xs font-black text-slate-500 dark:text-slate-400">اختلاف دفتر</div>
              <div className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{formatExactNumberText(meta.summary.ledgerDrift)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 px-3 py-3 dark:border-slate-800">
              <div className="text-xs font-black text-slate-500 dark:text-slate-400">سند/مرجع ناقص</div>
              <div className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{formatExactNumberText(meta.summary.missingReference)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 px-3 py-3 dark:border-slate-800">
              <div className="text-xs font-black text-slate-500 dark:text-slate-400">نیازمند بررسی انسانی</div>
              <div className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{formatExactNumberText(meta.summary.humanReview)}</div>
            </div>
          </div>
        </PanelCard>
      </div>

      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <PanelCard
          density="compact"
          tone={meta.governanceHealth?.periodLockActive && !meta.governanceHealth?.migrationsMissingChecksum ? 'success' : 'warning'}
          title="سلامت حاکمیت حسابداری"
          subtitle="کنترل قفل SQLite، Snapshot تاریخی، Migration checksum و Audit Trail"
          icon={<i className="fa-solid fa-shield-halved" aria-hidden="true" />}
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200/80 px-3 py-3 dark:border-slate-800">
              <div className="text-xs font-black text-slate-500 dark:text-slate-400">قفل دوره در SQLite</div>
              <div className="mt-1 font-black text-slate-900 dark:text-slate-100">{meta.governanceHealth?.periodLockActive ? 'فعال' : 'نیازمند بررسی'}</div>
              <div className="mt-1 text-xs text-slate-500">{formatExactNumberText(meta.governanceHealth?.periodLockTriggerCount || 0)} Trigger</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 px-3 py-3 dark:border-slate-800">
              <div className="text-xs font-black text-slate-500 dark:text-slate-400">دوره‌های بسته</div>
              <div className="mt-1 font-black text-slate-900 dark:text-slate-100">{formatExactNumberText(meta.governanceHealth?.closedPeriods || 0)}</div>
              <div className="mt-1 text-xs text-slate-500">آخرین: {formatServerDateTime(meta.governanceHealth?.latestPeriodClosedAt)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 px-3 py-3 dark:border-slate-800">
              <div className="text-xs font-black text-slate-500 dark:text-slate-400">Snapshot تاریخی</div>
              <div className="mt-1 font-black text-slate-900 dark:text-slate-100">{formatExactNumberText(meta.governanceHealth?.historicalSnapshots || 0)}</div>
              <div className="mt-1 text-xs text-slate-500">نسخه‌دار + SHA256</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 px-3 py-3 dark:border-slate-800">
              <div className="text-xs font-black text-slate-500 dark:text-slate-400">Migration Registry</div>
              <div className="mt-1 font-black text-slate-900 dark:text-slate-100">{formatExactNumberText(meta.governanceHealth?.migrationRegistryEntries || 0)} رکورد</div>
              <div className="mt-1 text-xs text-slate-500">بدون checksum: {formatExactNumberText(meta.governanceHealth?.migrationsMissingChecksum || 0)} · با بکاپ ایمنی: {formatExactNumberText(meta.governanceHealth?.migrationsWithSafetyBackup || 0)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 px-3 py-3 dark:border-slate-800">
              <div className="text-xs font-black text-slate-500 dark:text-slate-400">بازگشایی دوره</div>
              <div className="mt-1 font-black text-slate-900 dark:text-slate-100">{formatExactNumberText(meta.governanceHealth?.reopenedPeriodEvents || 0)} رویداد</div>
              <div className="mt-1 text-xs text-slate-500">آخرین: {formatServerDateTime(meta.governanceHealth?.latestPeriodReopenedAt || null)}</div>
            </div>
          </div>
        </PanelCard>
      </div>

      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <PanelCard
          density="compact"
          title="بستن دوره حسابداری"
          subtitle="مرحله اول فقط Challenge می‌سازد؛ مرحله دوم دوره را در SQLite قفل و Snapshot تاریخی ثبت می‌کند."
          icon={<i className="fa-solid fa-calendar-check" aria-hidden="true" />}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <TextField label="شروع دوره" type="date" value={periodStart} onChange={(event) => { setPeriodStart(event.target.value); setPeriodCloseToken(null); }} />
            <TextField label="پایان دوره" type="date" value={periodEnd} onChange={(event) => { setPeriodEnd(event.target.value); setPeriodCloseToken(null); }} />
            <TextField label="دلیل بستن دوره" value={periodCloseReason} onChange={(event) => setPeriodCloseReason(event.target.value)} placeholder="مثلاً پایان ماه و تأیید حسابداری" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!periodCloseToken ? (
              <Button size="sm" variant="secondary" onClick={() => void preparePeriodClose()} loading={preparingPeriodClose} leftIcon={<i className="fa-solid fa-lock" />}>
                مرحله اول تأیید بستن دوره
              </Button>
            ) : (
              <Button size="sm" variant="primary" onClick={() => void closePeriod()} loading={closingPeriod} leftIcon={<i className="fa-solid fa-check-double" />}>
                تأیید نهایی و بستن دوره
              </Button>
            )}
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">دوره بسته‌شده از UI/API قابل دورزدن نیست.</span>
          </div>
        </PanelCard>
      </div>

      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <PanelCard
          density="compact"
          tone="warning"
          title="بازگشایی کنترل‌شده دوره"
          subtitle="فقط مدیر سیستم؛ سابقه قفل قبلی حذف نمی‌شود و قبل از بازگشایی Snapshot جدید ثبت می‌شود."
          icon={<i className="fa-solid fa-lock-open" aria-hidden="true" />}
        >
          {Array.isArray(meta.governanceHealth?.activeClosedPeriods) && meta.governanceHealth!.activeClosedPeriods!.length > 0 ? (
            <div className="space-y-2">
              {meta.governanceHealth!.activeClosedPeriods!.map((period) => (
                <div key={period.id} className="rounded-2xl border border-slate-200/80 p-3 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-slate-100">{period.periodStart} تا {period.periodEnd}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">{period.closeReason || 'بدون توضیح'} · بسته‌شده: {formatServerDateTime(period.closedAt || null)}</div>
                    </div>
                    <Button size="xs" variant="secondary" onClick={() => { setReopenLockId(period.id); setReopenToken(null); }} leftIcon={<i className="fa-solid fa-key" />}>انتخاب برای بازگشایی</Button>
                  </div>
                </div>
              ))}
              {reopenLockId ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <TextField label={`دلیل بازگشایی دوره #${reopenLockId}`} value={reopenReason} onChange={(event) => { setReopenReason(event.target.value); setReopenToken(null); }} placeholder="مثلاً اصلاح سند مستند پس از تأیید مدیریت" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!reopenToken ? (
                      <Button size="sm" variant="secondary" onClick={() => void preparePeriodReopen(reopenLockId)} loading={preparingReopen} leftIcon={<i className="fa-solid fa-shield-halved" />}>مرحله اول بازگشایی</Button>
                    ) : (
                      <Button size="sm" variant="danger" onClick={() => void executePeriodReopen()} loading={reopeningPeriod} leftIcon={<i className="fa-solid fa-check-double" />}>تأیید نهایی بازگشایی</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { setReopenLockId(null); setReopenReason(''); setReopenToken(null); }}>انصراف</Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm font-bold text-slate-500">دوره بسته فعالی برای بازگشایی وجود ندارد.</div>
          )}
        </PanelCard>
      </div>

      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <PanelCard
          density="compact"
          tone="info"
          title="قرارداد ایمنی این مرکز"
          subtitle="Repair فقط روی داده مشتق‌شده و قابل اثبات اجرا می‌شود؛ تاریخ و مبلغ مبهم همچنان نیازمند سند انسانی هستند."
          icon={<i className="fa-solid fa-shield" aria-hidden="true" />}
        >
          <div className="grid gap-3 text-sm leading-7 text-slate-600 dark:text-slate-300 md:grid-cols-3">
            <div className="flex items-start gap-2">
              <i className="fa-solid fa-database mt-1.5 text-slate-400" aria-hidden="true" />
              <span>مانده‌های Cache، مالکیت خودکار و Snapshotهای قابل بازسازی از منبع حقیقت دوباره محاسبه می‌شوند.</span>
            </div>
            <div className="flex items-start gap-2">
              <i className="fa-solid fa-ban mt-1.5 text-slate-400" aria-hidden="true" />
              <span>تاریخ یا مبلغ نامطمئن هرگز از روی حدس، سررسید یا زمان فعلی ساخته نمی‌شود.</span>
            </div>
            <div className="flex items-start gap-2">
              <i className="fa-solid fa-clock-rotate-left mt-1.5 text-slate-400" aria-hidden="true" />
              <span>اجرای Repair و اصلاحات مالی در Audit Trail غیرقابل‌ویرایش ثبت می‌شوند.</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200/70 pt-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>رویدادهای Audit غیرقابل‌ویرایش: {formatExactNumberText(meta.summary.auditTrailEvents)}</span>
            <span>آخرین ثبت: {formatServerDateTime(meta.summary.auditTrailLatestAt)}</span>
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
                <Table layout="managed" density="comfortable" className="report-table ux-data-table">
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
                </Table>
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
          ariaDescription="نمای شواهد ثبت‌شده برای مغایرت حسابداری"
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
                  Repair امن فقط Cache و داده‌های مشتق‌شده قابل اثبات را بازسازی می‌کند. مبلغ قرارداد، تاریخ وصول، شماره چک یا تاریخ تاریخی نامطمئن از این صفحه ساخته یا حدس زده نمی‌شود.
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
