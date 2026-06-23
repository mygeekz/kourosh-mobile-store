import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import moment from 'jalali-moment';
import PageKit from '../../components/ui/PageKit';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import Notification from '../../components/Notification';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/apiFetch';
import { exportToExcel } from '../../utils/exporters';
import type { NotificationMessage } from '../../types';


import { useReportsExports } from '../../contexts/ReportsExportsContext';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

type Row = {
  sourceType?: 'invoice' | 'installment';
  paymentType?: 'cash' | 'credit' | 'installment';
  itemType?: 'inventory' | 'service';
  orderId: number;
  transactionDate: string;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPerItem: number;
  orderDiscount?: number;
  invoiceDiscountBase?: number;
  lineTotalBeforeGlobalDiscount?: number;
  globalDiscountShare?: number;
  totalDiscountAmount?: number;
  originalLineTotal?: number;
  lineTotal: number;
  lineCost?: number;
  receivedAmount?: number;
  collectionRate?: number;
  fullProfit?: number;
  realizedProfit?: number;
  unrecognizedProfit?: number;
};

type Summary = {
  cashSales: number;
  creditSales: number;
  installmentSales: number;
  cashReceived: number;
  creditReceived: number;
  installmentReceived: number;
  contractualTotal: number;
  receivedTotal: number;
  totalProfit: number;
  realizedProfit: number;
  unrecognizedProfit: number;
  rowsCount: number;
  unlinkedCreditReceipts?: number;
};

type FilteredSummary = {
  lineTotal: number;
  receivedAmount: number;
  totalProfit: number;
  realizedProfit: number;
  unrecognizedProfit: number;
  totalDiscountAmount: number;
  itemDiscountAmount: number;
  invoiceDiscountShare: number;
};

type AuditCounts = {
  all: number;
  discounted: number;
  itemDiscounted: number;
  invoiceDiscounted: number;
};

type PaginationState = {
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  startRow: number;
  endRow: number;
};

type TopProduct = {
  itemType: 'inventory' | 'service';
  productId: number;
  productName: string;
  qty: number;
  amount: number;
};

type CalculationHealthIssue = {
  id: string;
  severity: 'healthy' | 'warning' | 'error';
  type: string;
  sourceType: 'invoice' | 'installment';
  orderId: number;
  paymentType?: 'cash' | 'credit' | 'installment';
  title: string;
  description: string;
  expectedAmount?: number;
  actualAmount?: number;
  difference?: number;
  rowsCount?: number;
  itemDiscountTotal?: number;
  invoiceDiscountShareTotal?: number;
  finalLinesTotal?: number;
  invoiceDiscountBase?: number;
  orderDiscount?: number;
  rowIssues?: Array<{
    productId: number;
    productName: string;
    reason: string;
    expectedAmount?: number;
    actualAmount?: number;
    difference?: number;
  }>;
};

type CalculationHealth = {
  status: 'healthy' | 'warning' | 'error';
  checkedDocs: number;
  checkedRows: number;
  skippedPartialDocs: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  roundingCount: number;
  totalAbsoluteDifference: number;
  issues: CalculationHealthIssue[];
};

type CollectionRiskLevel = 'low' | 'followup' | 'urgent' | 'critical';

type CollectionRiskItem = {
  id: string;
  level: CollectionRiskLevel;
  label: string;
  score: number;
  sourceType: 'invoice' | 'installment';
  paymentType?: 'cash' | 'credit' | 'installment';
  orderId: number;
  customerId?: number;
  customerName: string;
  customerPhone?: string;
  transactionDate?: string;
  dueDate?: string | null;
  ageDays: number;
  dueInDays?: number | null;
  overdueDays: number;
  overdueCount: number;
  overdueAmount: number;
  contractualTotal: number;
  receivedAmount: number;
  outstandingAmount: number;
  fullProfit: number;
  realizedProfit: number;
  unrecognizedProfit: number;
  collectionRate: number;
  customerBalance: number;
  discountRate: number;
  reasons: string[];
};

type CollectionRiskSummary = {
  status: CollectionRiskLevel;
  totalDocs: number;
  counts: Record<CollectionRiskLevel, number>;
  totalOutstanding: number;
  totalUnrecognizedProfit: number;
  highestScore: number;
  items: CollectionRiskItem[];
};

const emptyCollectionRisk = (): CollectionRiskSummary => ({
  status: 'low',
  totalDocs: 0,
  counts: { low: 0, followup: 0, urgent: 0, critical: 0 },
  totalOutstanding: 0,
  totalUnrecognizedProfit: 0,
  highestScore: 0,
  items: [],
});

const toShamsiStr = (d: Date) => moment(d).locale('en').format('jYYYY/jMM/jDD');
const money = (n: number) => formatCurrencyText(n ?? 0, readStoredCurrencyUnit());
const numberFa = (n: number, options?: Intl.NumberFormatOptions) => (Number(n) || 0).toLocaleString('fa-IR', options);
const percentFa = (n: number) => `${numberFa(n, { maximumFractionDigits: 2 })}٪`;
const formatTransactionDate = (value?: string | null) => {
  if (!value) return '—';
  const raw = String(value).trim();
  if (/^\d{4}\/\d{2}\/\d{2}/.test(raw)) return raw;
  return formatIsoToShamsiDateTime(raw, 'jYYYY/jMM/jDD HH:mm');
};

const getRowDiscountAudit = (r: Row) => {
  const itemDiscount = Math.max(0, Number(r.discountPerItem || 0));
  const invoiceShare = Math.max(0, Number(r.globalDiscountShare || 0));
  const totalDiscount = Math.max(0, Number(r.totalDiscountAmount ?? (itemDiscount + invoiceShare)));
  const hasItemDiscount = itemDiscount > 0;
  const hasInvoiceDiscount = invoiceShare > 0;
  return {
    itemDiscount,
    invoiceShare,
    totalDiscount,
    hasItemDiscount,
    hasInvoiceDiscount,
    hasAnyDiscount: hasItemDiscount || hasInvoiceDiscount || totalDiscount > 0,
  };
};

const getRowDiscountReason = (r: Row) => {
  const audit = getRowDiscountAudit(r);
  const reasons: string[] = [];
  if (audit.hasItemDiscount) reasons.push(`تخفیف آیتم: ${money(audit.itemDiscount)}`);
  if (audit.hasInvoiceDiscount) reasons.push(`سهم تخفیف فاکتور: ${money(audit.invoiceShare)}`);
  return reasons.length ? reasons.join(' + ') : 'بدون تخفیف ثبت‌شده';
};

const getRowDiscountTypeMeta = (r: Row) => {
  const audit = getRowDiscountAudit(r);
  if (audit.hasItemDiscount && audit.hasInvoiceDiscount) {
    return {
      label: 'آیتم + فاکتور',
      caption: 'هم تخفیف مستقیم آیتم دارد، هم سهم تخفیف کلی فاکتور',
      icon: 'fa-layer-group',
      className: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/35 dark:text-violet-200',
    };
  }
  if (audit.hasItemDiscount) {
    return {
      label: 'تخفیف آیتم',
      caption: 'تخفیف مستقیماً روی همین قلم ثبت شده است',
      icon: 'fa-tag',
      className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200',
    };
  }
  if (audit.hasInvoiceDiscount) {
    return {
      label: 'تخفیف فاکتور',
      caption: 'از تخفیف کلی فاکتور به این قلم سهم رسیده است',
      icon: 'fa-file-invoice-dollar',
      className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200',
    };
  }
  return {
    label: audit.hasAnyDiscount ? 'تخفیف ثبت‌شده' : 'بدون تخفیف',
    caption: audit.hasAnyDiscount ? 'کل تخفیف ثبت شده، اما نوع آن از داده‌ها قابل تفکیک نیست' : 'برای این ردیف تخفیف آیتم یا فاکتور ثبت نشده است',
    icon: audit.hasAnyDiscount ? 'fa-percent' : 'fa-minus',
    className: audit.hasAnyDiscount
      ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
      : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400',
  };
};

const getRowDiscountTypeLabel = (r: Row) => getRowDiscountTypeMeta(r).label;


type DiscountAuditMode = 'all' | 'item' | 'invoice';
type ProfitViewMode = 'total' | 'received';

const DISCOUNT_AUDIT_MODES: Array<{
  value: DiscountAuditMode;
  label: string;
  caption: string;
  icon: string;
}> = [
  { value: 'all', label: 'همه', caption: 'نمایش همه ردیف‌های فروش غیرگوشی', icon: 'fa-layer-group' },
  { value: 'item', label: 'تخفیف آیتم', caption: 'فقط ردیف‌هایی که روی خود قلم تخفیف مستقیم دارند', icon: 'fa-tag' },
  { value: 'invoice', label: 'تخفیف فاکتور', caption: 'فقط ردیف‌هایی که از تخفیف کلی فاکتور سهم گرفته‌اند', icon: 'fa-file-invoice-dollar' },
];

const DETAILS_PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

const PROFIT_VIEW_MODES: Array<{
  value: ProfitViewMode;
  label: string;
  caption: string;
  icon: string;
}> = [
  { value: 'total', label: 'سود کل', caption: 'سود کامل ردیف بر اساس مبلغ نهایی فروش، بدون وابستگی به وصول', icon: 'fa-chart-line' },
  { value: 'received', label: 'سود وصول‌شده', caption: 'سود قابل شناسایی متناسب با پول دریافت‌شده', icon: 'fa-hand-holding-dollar' },
];

const getAuditModeTitle = (mode: DiscountAuditMode) => {
  if (mode === 'item') return 'فقط تخفیف آیتم';
  if (mode === 'invoice') return 'فقط تخفیف فاکتور';
  return 'همه ردیف‌ها';
};

const getAuditModeDescription = (mode: DiscountAuditMode) => {
  if (mode === 'item') return 'فقط ردیف‌هایی دیده می‌شوند که روی خود آیتم تخفیف مستقیم ثبت شده است.';
  if (mode === 'invoice') return 'فقط ردیف‌هایی دیده می‌شوند که سهمی از تخفیف کلی فاکتور دریافت کرده‌اند.';
  return 'همه ردیف‌های فروش غیرگوشی نمایش داده می‌شوند و ردیف‌های تخفیف‌دار همچنان قابل بررسی هستند.';
};

const getAuditModeEmptyDescription = (mode: DiscountAuditMode) => {
  if (mode === 'item') return 'در این بازه یا جستجوی فعلی، ردیفی با تخفیف مستقیم آیتم پیدا نشد.';
  if (mode === 'invoice') return 'در این بازه یا جستجوی فعلی، ردیفی با سهم تخفیف کلی فاکتور پیدا نشد.';
  return 'بازه زمانی را تغییر بده یا جستجو را پاک کن و دوباره تلاش کن.';
};

const getAuditModeFileSuffix = (mode: DiscountAuditMode) => {
  if (mode === 'item') return '-audit-item-discounts';
  if (mode === 'invoice') return '-audit-invoice-discounts';
  return '';
};

const getCalculationHealthMeta = (status: CalculationHealth['status']) => {
  if (status === 'error') {
    return {
      label: 'نیاز به بررسی فوری',
      icon: 'fa-triangle-exclamation',
      className: 'border-rose-200 bg-rose-50/90 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-100',
      badgeClassName: 'border-rose-200 bg-white text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200',
    };
  }
  if (status === 'warning') {
    return {
      label: 'اختلاف قابل بررسی',
      icon: 'fa-circle-exclamation',
      className: 'border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100',
      badgeClassName: 'border-amber-200 bg-white text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200',
    };
  }
  return {
    label: 'همه محاسبات سالم است',
    icon: 'fa-shield-check',
    className: 'border-emerald-200 bg-emerald-50/90 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-100',
    badgeClassName: 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200',
  };
};

const getCalculationIssueMeta = (severity?: CalculationHealthIssue['severity']) => {
  if (severity === 'error') {
    return {
      label: 'خطای جدی',
      icon: 'fa-triangle-exclamation',
      className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200',
    };
  }
  return {
    label: 'اختلاف رُندی / قابل بررسی',
    icon: 'fa-circle-exclamation',
    className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200',
  };
};

const getRowProfitBreakdown = (r: Row | null) => {
  if (!r) {
    return {
      lineTotal: 0,
      lineCost: 0,
      fullProfit: 0,
      receivedAmount: 0,
      collectionRate: 0,
      realizedProfit: 0,
      unrecognizedProfit: 0,
    };
  }
  const lineTotal = Number(r.lineTotal || 0);
  const lineCost = Number(r.lineCost || 0);
  const fullProfit = Number(r.fullProfit ?? (lineTotal - lineCost));
  const receivedAmount = Number(r.receivedAmount || 0);
  const collectionRate = lineTotal > 0 ? Math.min(100, Math.max(0, (receivedAmount / lineTotal) * 100)) : Number(r.collectionRate || 0);
  const realizedProfit = Number(r.realizedProfit ?? (fullProfit * (collectionRate / 100)));
  const unrecognizedProfit = Number(r.unrecognizedProfit ?? (fullProfit - realizedProfit));
  return { lineTotal, lineCost, fullProfit, receivedAmount, collectionRate, realizedProfit, unrecognizedProfit };
};

const getProfitViewTitle = (mode: ProfitViewMode) => mode === 'received' ? 'سود وصول‌شده' : 'سود کل';
const getProfitViewDescription = (mode: ProfitViewMode) => mode === 'received'
  ? 'در این نما سود بر اساس نسبت پول وصول‌شده شناسایی می‌شود؛ برای اعتباری و اقساطی عدد قابل اتکاتری است.'
  : 'در این نما سود کامل فروش ثبت‌شده نمایش داده می‌شود؛ بدون اینکه وصول یا عدم وصول پول روی سود اثر بگذارد.';

const getCollectionRiskMeta = (level: CollectionRiskLevel) => {
  if (level === 'critical') {
    return {
      label: 'بحرانی',
      icon: 'fa-triangle-exclamation',
      className: 'border-rose-200 bg-rose-50/90 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-100',
      badgeClassName: 'border-rose-200 bg-white text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200',
      dotClassName: 'bg-rose-500',
    };
  }
  if (level === 'urgent') {
    return {
      label: 'فوری',
      icon: 'fa-bell',
      className: 'border-orange-200 bg-orange-50/90 text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/25 dark:text-orange-100',
      badgeClassName: 'border-orange-200 bg-white text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/50 dark:text-orange-200',
      dotClassName: 'bg-orange-500',
    };
  }
  if (level === 'followup') {
    return {
      label: 'نیازمند پیگیری',
      icon: 'fa-phone-volume',
      className: 'border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100',
      badgeClassName: 'border-amber-200 bg-white text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200',
      dotClassName: 'bg-amber-500',
    };
  }
  return {
    label: 'کم‌ریسک',
    icon: 'fa-shield-check',
    className: 'border-sky-200 bg-sky-50/90 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/25 dark:text-sky-100',
    badgeClassName: 'border-sky-200 bg-white text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-200',
    dotClassName: 'bg-sky-500',
  };
};

const getCollectionRiskSummaryText = (risk: CollectionRiskSummary) => {
  const parts = [
    risk.counts.critical ? risk.counts.critical.toLocaleString('fa-IR') + ' بحرانی' : '',
    risk.counts.urgent ? risk.counts.urgent.toLocaleString('fa-IR') + ' فوری' : '',
    risk.counts.followup ? risk.counts.followup.toLocaleString('fa-IR') + ' نیازمند پیگیری' : '',
    risk.counts.low ? risk.counts.low.toLocaleString('fa-IR') + ' کم‌ریسک' : '',
  ].filter(Boolean);
  return parts.length ? parts.join('، ') : 'فاکتور باز برای پیگیری وصول در فیلتر فعلی دیده نشد';
};

export default function ProductSalesReport() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { registerReportExports } = useReportsExports();

  const monthStart = useMemo(() => moment().locale('fa').startOf('jMonth').toDate(), []);
  const monthEnd = useMemo(() => moment().locale('fa').endOf('jMonth').toDate(), []);

  const [fromDate, setFromDate] = useState<Date | null>(monthStart);
  const [toDate, setToDate] = useState<Date | null>(monthEnd);

  const [query, setQuery] = useState('');
  const [auditMode, setAuditMode] = useState<DiscountAuditMode>('all');
  const auditOnly = auditMode !== 'all';
  const [profitView, setProfitView] = useState<ProfitViewMode>('received');
  const [detailsPage, setDetailsPage] = useState(1);
  const [detailsPageSize, setDetailsPageSize] = useState<number>(50);

  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary>({ cashSales: 0, creditSales: 0, installmentSales: 0, cashReceived: 0, creditReceived: 0, installmentReceived: 0, contractualTotal: 0, receivedTotal: 0, totalProfit: 0, realizedProfit: 0, unrecognizedProfit: 0, rowsCount: 0, unlinkedCreditReceipts: 0 });

  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [calculationRow, setCalculationRow] = useState<Row | null>(null);
  const [healthDrawerOpen, setHealthDrawerOpen] = useState(false);
  const [riskDrawerOpen, setRiskDrawerOpen] = useState(false);
  const exportExcelRef = useRef<() => void | Promise<void>>(() => {});

  const [filteredSummary, setFilteredSummary] = useState<FilteredSummary>({
    lineTotal: 0,
    receivedAmount: 0,
    totalProfit: 0,
    realizedProfit: 0,
    unrecognizedProfit: 0,
    totalDiscountAmount: 0,
    itemDiscountAmount: 0,
    invoiceDiscountShare: 0,
  });
  const [auditCounts, setAuditCounts] = useState<AuditCounts>({
    all: 0,
    discounted: 0,
    itemDiscounted: 0,
    invoiceDiscounted: 0,
  });
  const [serverTopProducts, setServerTopProducts] = useState<TopProduct[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 50,
    totalRows: 0,
    totalPages: 1,
    startRow: 0,
    endRow: 0,
  });

  const [calculationHealth, setCalculationHealth] = useState<CalculationHealth>({
    status: 'healthy',
    checkedDocs: 0,
    checkedRows: 0,
    skippedPartialDocs: 0,
    issueCount: 0,
    errorCount: 0,
    warningCount: 0,
    roundingCount: 0,
    totalAbsoluteDifference: 0,
    issues: [],
  });

  const [collectionRisk, setCollectionRisk] = useState<CollectionRiskSummary>(() => emptyCollectionRisk());

  const discountedRowsCount = auditCounts.discounted;
  const itemDiscountedRowsCount = auditCounts.itemDiscounted;
  const invoiceDiscountedRowsCount = auditCounts.invoiceDiscounted;
  const selectedAuditRowsCount = auditMode === 'item' ? itemDiscountedRowsCount : auditMode === 'invoice' ? invoiceDiscountedRowsCount : auditCounts.all;

  // از این مرحله به بعد فیلتر جستجو/نوع تخفیف و صفحه‌بندی سمت API انجام می‌شود؛
  // بنابراین rows فقط ردیف‌های صفحه فعلی است و filteredRows نمای همان صفحه است.
  const filteredRows = rows;
  const detailsTotalPages = Math.max(1, Number(pagination.totalPages || 1));
  const safeDetailsPage = Math.min(Math.max(1, Number(pagination.page || detailsPage || 1)), detailsTotalPages);
  const paginatedRows = rows;
  const detailStartRow = Number(pagination.startRow || (rows.length ? ((safeDetailsPage - 1) * detailsPageSize + 1) : 0));
  const detailEndRow = Number(pagination.endRow || (rows.length ? ((safeDetailsPage - 1) * detailsPageSize + rows.length) : 0));
  const totalFilteredRows = Number(pagination.totalRows || selectedAuditRowsCount || 0);

  useEffect(() => {
    setDetailsPage(1);
  }, [query, auditMode, fromDate, toDate, detailsPageSize]);

  const topProducts = serverTopProducts;

  const filteredTotal = Number(filteredSummary.lineTotal || 0);
  const filteredReceived = Number(filteredSummary.receivedAmount || 0);
  const filteredTotalProfit = Number(filteredSummary.totalProfit || 0);
  const filteredProfit = Number(filteredSummary.realizedProfit || 0);
  const filteredUnrecognizedProfit = Number(filteredSummary.unrecognizedProfit || 0);
  const activeFilteredProfit = profitView === 'received' ? filteredProfit : filteredTotalProfit;
  const activeSummaryProfit = profitView === 'received' ? Number(summary.realizedProfit || 0) : Number(summary.totalProfit || 0);
  const filteredDiscountTotal = Number(filteredSummary.totalDiscountAmount || 0);
  const filteredInvoiceDiscountTotal = Number(filteredSummary.invoiceDiscountShare || 0);
  const filteredItemDiscountTotal = Number(filteredSummary.itemDiscountAmount || 0);
  const filteredOutstanding = Math.max(0, filteredTotal - filteredReceived);
  const filteredCollectionRate = filteredTotal > 0 ? (filteredReceived / filteredTotal) * 100 : 0;
  const cashCollectionRate = useMemo(() => (summary.cashSales > 0 ? (summary.cashReceived / summary.cashSales) * 100 : 0), [summary.cashSales, summary.cashReceived]);
  const creditCollectionRate = useMemo(() => (summary.creditSales > 0 ? (summary.creditReceived / summary.creditSales) * 100 : 0), [summary.creditSales, summary.creditReceived]);
  const installmentCollectionRate = useMemo(() => (summary.installmentSales > 0 ? (summary.installmentReceived / summary.installmentSales) * 100 : 0), [summary.installmentSales, summary.installmentReceived]);
  const collectionRiskMeta = getCollectionRiskMeta(collectionRisk.status);
  const highRiskCount = Number(collectionRisk.counts.critical || 0) + Number(collectionRisk.counts.urgent || 0);

  const from = fromDate ? toShamsiStr(fromDate) : undefined;
  const to = toDate ? toShamsiStr(toDate) : undefined;

  const calcRowBreakdown = (r: Row | null) => {
    if (!r) return null;
    const quantity = Number(r.quantity || 0);
    const unitPrice = Number(r.unitPrice || 0);
    const gross = Math.max(0, quantity * unitPrice);
    const itemDiscount = Math.max(0, Math.min(Number(r.discountPerItem || 0), gross));
    const beforeGlobal = Math.max(0, Number(r.originalLineTotal ?? (gross - itemDiscount)));
    const invoiceShare = Math.max(0, Number(r.globalDiscountShare || 0));
    const invoiceDiscountBase = Math.max(0, Number(r.invoiceDiscountBase || 0));
    const orderDiscount = Math.max(0, Number(r.orderDiscount || 0));
    const totalDiscount = Math.max(0, Number(r.totalDiscountAmount ?? (itemDiscount + invoiceShare)));
    const shareRate = invoiceDiscountBase > 0 ? (beforeGlobal / invoiceDiscountBase) * 100 : 0;
    const effectiveDiscountRate = gross > 0 ? (totalDiscount / gross) * 100 : 0;
    const afterDiscount = Math.max(0, Number(r.lineTotal || 0));
    const received = Math.max(0, Number(r.receivedAmount || 0));
    const collectionRate = afterDiscount > 0 ? Math.min(100, (received / afterDiscount) * 100) : Number(r.collectionRate || 0);
    const profit = getRowProfitBreakdown(r);
    return { quantity, unitPrice, gross, itemDiscount, beforeGlobal, invoiceShare, invoiceDiscountBase, orderDiscount, shareRate, effectiveDiscountRate, totalDiscount, afterDiscount, received, ...profit, collectionRate };
  };

  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);

    try {
      const params = new URLSearchParams({
        from: from || '',
        to: to || '',
        page: String(detailsPage),
        pageSize: String(detailsPageSize),
        auditMode,
      });
      const q = query.trim();
      if (q) params.set('q', q);

      const res = await apiFetch(`/api/reports/product-sales/details?${params.toString()}`);
      const js = await res.json();
      if (!res.ok || js?.success === false) {
        throw new Error(js?.message || 'خطا در دریافت گزارش');
      }

      const data = js?.data || {};
      const list = (data.rows || []) as Row[];
      setRows(list);

      const nextSummary = (data.summary || {}) as Partial<Summary>;
      setSummary({
        cashSales: Number(nextSummary.cashSales || 0),
        creditSales: Number(nextSummary.creditSales || 0),
        installmentSales: Number(nextSummary.installmentSales || 0),
        cashReceived: Number(nextSummary.cashReceived || 0),
        creditReceived: Number(nextSummary.creditReceived || 0),
        installmentReceived: Number(nextSummary.installmentReceived || 0),
        contractualTotal: Number(nextSummary.contractualTotal || 0),
        receivedTotal: Number(nextSummary.receivedTotal || 0),
        totalProfit: Number(nextSummary.totalProfit || 0),
        realizedProfit: Number(nextSummary.realizedProfit || 0),
        unrecognizedProfit: Number(nextSummary.unrecognizedProfit || 0),
        rowsCount: Number(nextSummary.rowsCount || 0),
        unlinkedCreditReceipts: Number(nextSummary.unlinkedCreditReceipts || 0),
      });

      const nextFilteredSummary = (data.filteredSummary || {}) as Partial<FilteredSummary>;
      setFilteredSummary({
        lineTotal: Number(nextFilteredSummary.lineTotal || 0),
        receivedAmount: Number(nextFilteredSummary.receivedAmount || 0),
        totalProfit: Number(nextFilteredSummary.totalProfit || 0),
        realizedProfit: Number(nextFilteredSummary.realizedProfit || 0),
        unrecognizedProfit: Number(nextFilteredSummary.unrecognizedProfit || 0),
        totalDiscountAmount: Number(nextFilteredSummary.totalDiscountAmount || 0),
        itemDiscountAmount: Number(nextFilteredSummary.itemDiscountAmount || 0),
        invoiceDiscountShare: Number(nextFilteredSummary.invoiceDiscountShare || 0),
      });

      const nextAuditCounts = (data.auditCounts || {}) as Partial<AuditCounts>;
      setAuditCounts({
        all: Number(nextAuditCounts.all || 0),
        discounted: Number(nextAuditCounts.discounted || 0),
        itemDiscounted: Number(nextAuditCounts.itemDiscounted || 0),
        invoiceDiscounted: Number(nextAuditCounts.invoiceDiscounted || 0),
      });

      const nextHealth = (data.calculationHealth || {}) as Partial<CalculationHealth>;
      const nextHealthStatus = nextHealth.status === 'error' || nextHealth.status === 'warning' ? nextHealth.status : 'healthy';
      setCalculationHealth({
        status: nextHealthStatus,
        checkedDocs: Number(nextHealth.checkedDocs || 0),
        checkedRows: Number(nextHealth.checkedRows || 0),
        skippedPartialDocs: Number(nextHealth.skippedPartialDocs || 0),
        issueCount: Number(nextHealth.issueCount || 0),
        errorCount: Number(nextHealth.errorCount || 0),
        warningCount: Number(nextHealth.warningCount || 0),
        roundingCount: Number(nextHealth.roundingCount || 0),
        totalAbsoluteDifference: Number(nextHealth.totalAbsoluteDifference || 0),
        issues: Array.isArray(nextHealth.issues) ? nextHealth.issues as CalculationHealthIssue[] : [],
      });

      const nextRisk = (data.collectionRisk || {}) as Partial<CollectionRiskSummary>;
      const riskCounts = (nextRisk.counts || {}) as Partial<Record<CollectionRiskLevel, number>>;
      const riskStatus: CollectionRiskLevel = nextRisk.status === 'critical' || nextRisk.status === 'urgent' || nextRisk.status === 'followup' ? nextRisk.status : 'low';
      setCollectionRisk({
        status: riskStatus,
        totalDocs: Number(nextRisk.totalDocs || 0),
        counts: {
          low: Number(riskCounts.low || 0),
          followup: Number(riskCounts.followup || 0),
          urgent: Number(riskCounts.urgent || 0),
          critical: Number(riskCounts.critical || 0),
        },
        totalOutstanding: Number(nextRisk.totalOutstanding || 0),
        totalUnrecognizedProfit: Number(nextRisk.totalUnrecognizedProfit || 0),
        highestScore: Number(nextRisk.highestScore || 0),
        items: Array.isArray(nextRisk.items) ? nextRisk.items as CollectionRiskItem[] : [],
      });

      const nextPagination = (data.pagination || {}) as Partial<PaginationState>;
      const normalizedPage = Number(nextPagination.page || detailsPage || 1);
      setPagination({
        page: normalizedPage,
        pageSize: Number(nextPagination.pageSize || detailsPageSize),
        totalRows: Number(nextPagination.totalRows || 0),
        totalPages: Math.max(1, Number(nextPagination.totalPages || 1)),
        startRow: Number(nextPagination.startRow || 0),
        endRow: Number(nextPagination.endRow || 0),
      });
      setDetailsPage((current) => (current === normalizedPage ? current : normalizedPage));

      setServerTopProducts(Array.isArray(data.topProducts) ? data.topProducts : []);
      setTotal(Number(nextFilteredSummary.lineTotal || 0));
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا در عملیات', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    const t = window.setTimeout(() => { fetchData(); }, 250);
    return () => window.clearTimeout(t);
  }, [token, fromDate, toDate, query, auditMode, detailsPage, detailsPageSize]);

  const exportExcel = async () => {
    if (!token) return;

    let exportRows = rows;
    try {
      const params = new URLSearchParams({
        from: from || '',
        to: to || '',
        auditMode,
        all: '1',
      });
      const q = query.trim();
      if (q) params.set('q', q);

      const res = await apiFetch(`/api/reports/product-sales/details?${params.toString()}`);
      const js = await res.json();
      if (!res.ok || js?.success === false) {
        throw new Error(js?.message || 'خطا در آماده‌سازی خروجی Excel');
      }
      exportRows = ((js?.data?.rows || []) as Row[]);
      const riskItems = ((js?.data?.collectionRisk?.items || []) as CollectionRiskItem[]);
      (exportExcel as any).__riskMap = new Map(riskItems.map((item) => [`${item.sourceType}:${item.orderId}`, item]));
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا در آماده‌سازی خروجی Excel', type: 'error' });
      return;
    }

    const riskMap: Map<string, CollectionRiskItem> = (exportExcel as any).__riskMap || new Map(collectionRisk.items.map((item) => [`${item.sourceType}:${item.orderId}`, item]));
    const out = exportRows.map((r) => {
      const profit = getRowProfitBreakdown(r);
      const rowRisk = riskMap.get(`${r.sourceType || 'invoice'}:${r.orderId}`);
      return {
      date: formatTransactionDate(r.transactionDate),
      sourceType: r.sourceType === 'installment' ? 'اقساطی' : 'فاکتور',
      paymentType: r.paymentType === 'installment' ? 'اقساطی' : r.paymentType === 'credit' ? 'اعتباری' : 'نقدی',
      itemType: r.itemType === 'service' ? 'خدمت' : 'لوازم',
      orderId: r.orderId,
      productId: r.productId,
      productName: r.productName,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      discountPerItem: r.discountPerItem,
      orderDiscount: r.orderDiscount || 0,
      invoiceDiscountBase: r.invoiceDiscountBase || 0,
      globalDiscountShare: r.globalDiscountShare || 0,
      totalDiscountAmount: r.totalDiscountAmount ?? r.discountPerItem ?? 0,
      auditReason: getRowDiscountReason(r),
      discountType: getRowDiscountTypeLabel(r),
      lineTotal: r.lineTotal,
      receivedAmount: r.receivedAmount || 0,
      collectionRate: profit.collectionRate,
      fullProfit: profit.fullProfit,
      realizedProfit: profit.realizedProfit,
      unrecognizedProfit: profit.unrecognizedProfit,
      activeProfitView: getProfitViewTitle(profitView),
      activeProfit: profitView === 'received' ? profit.realizedProfit : profit.fullProfit,
      collectionRiskLevel: rowRisk?.label || 'بدون ریسک وصول',
      collectionRiskScore: rowRisk?.score || 0,
      collectionRiskReasons: rowRisk?.reasons?.join(' | ') || '',
    };
    });

    exportToExcel(
      `product-sales${getAuditModeFileSuffix(auditMode)}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      out,
      [
        { header: 'تاریخ', key: 'date' },
        { header: 'نوع سند', key: 'sourceType' },
        { header: 'نوع پرداخت', key: 'paymentType' },
        { header: 'نوع قلم', key: 'itemType' },
        { header: 'شناسه سند', key: 'orderId' },
        { header: 'شناسه قلم', key: 'productId' },
        { header: 'نام قلم', key: 'productName' },
        { header: 'تعداد', key: 'quantity' },
        { header: 'قیمت واحد', key: 'unitPrice' },
        { header: 'تخفیف آیتم', key: 'discountPerItem' },
        { header: 'تخفیف کل فاکتور', key: 'orderDiscount' },
        { header: 'مبنای تقسیم تخفیف فاکتور', key: 'invoiceDiscountBase' },
        { header: 'سهم تخفیف فاکتور', key: 'globalDiscountShare' },
        { header: 'کل تخفیف ردیف', key: 'totalDiscountAmount' },
        { header: 'دلیل نمایش در فیلتر حسابرسی', key: 'auditReason' },
        { header: 'نوع تخفیف', key: 'discountType' },
        { header: 'جمع سطر پس از تخفیف', key: 'lineTotal' },
        { header: 'وصول‌شده', key: 'receivedAmount' },
        { header: 'درصد وصول', key: 'collectionRate' },
        { header: 'سود کل', key: 'fullProfit' },
        { header: 'سود وصول‌شده', key: 'realizedProfit' },
        { header: 'سود وصول‌نشده', key: 'unrecognizedProfit' },
        { header: 'نمای سود فعال', key: 'activeProfitView' },
        { header: 'سود در نمای فعال', key: 'activeProfit' },
        { header: 'سطح ریسک وصول', key: 'collectionRiskLevel' },
        { header: 'امتیاز ریسک وصول', key: 'collectionRiskScore' },
        { header: 'دلایل ریسک وصول', key: 'collectionRiskReasons' },
      ],
    );
  };

  // اتصال دکمه Excel بالای ReportsLayout به خروجی دقیق همین صفحه
  exportExcelRef.current = exportExcel;
  useEffect(() => {
    registerReportExports({ excel: () => exportExcelRef.current() });
    return () => registerReportExports({});
  }, [registerReportExports]);

  return (
  <div dir="rtl">
    <Notification message={notification} onClose={() => setNotification(null)} />

    <PageKit
      title="فروش کالا و خدمات"
      subtitle="خلاصه فروش، وصول و سود کالاهای انبار و خدمات؛ برای کنترل درآمد عملیاتی بدون فروش موبایل."
      icon={<i className="fa-solid fa-boxes-stacked" />}
      className="report-merged-page product-sales-executive-page"
      isLoading={isLoading}
      isEmpty={!isLoading && totalFilteredRows === 0}
      emptyTitle="داده‌ای برای نمایش نیست"
      emptyDescription={getAuditModeEmptyDescription(auditMode)}
      emptyActionLabel="بازخوانی"
      onEmptyAction={fetchData}
    >
      <section className="product-sales-control-panel" aria-label="فیلترهای فروش کالا و خدمات">
        <div className="product-sales-control-panel__row product-sales-control-panel__row--dates">
          <ReportDatePresetChips
            fromDate={fromDate}
            toDate={toDate}
            onChange={({ from, to }) => { setFromDate(from); setToDate(to); }}
            className="product-sales-date-presets"
            compact
          />
          <div className="product-sales-date-box" dir="rtl">
            <span className="product-sales-date-box__label">از تاریخ</span>
            <ShamsiDatePicker
              selectedDate={fromDate}
              onChange={setFromDate}
              preview="از تاریخ"
              inputClassName="product-sales-date-input"
            />
          </div>
          <div className="product-sales-date-box" dir="rtl">
            <span className="product-sales-date-box__label">تا تاریخ</span>
            <ShamsiDatePicker
              selectedDate={toDate}
              onChange={setToDate}
              preview="تا تاریخ"
              inputClassName="product-sales-date-input"
            />
          </div>
          <button
            onClick={fetchData}
            className="product-sales-refresh-button"
            disabled={isLoading}
            type="button"
          >
            <i className={`fa-solid fa-rotate ${isLoading ? 'fa-spin' : ''}`} />
            به‌روزرسانی
          </button>
        </div>

        <div className="product-sales-control-panel__row product-sales-control-panel__row--modes">
          <div className="product-sales-segment" aria-label="فیلتر حسابرسی تخفیف">
            <span className="product-sales-segment__label">حسابرسی تخفیف</span>
            {DISCOUNT_AUDIT_MODES.map((mode) => {
              const active = auditMode === mode.value;
              const count = mode.value === 'item' ? itemDiscountedRowsCount : mode.value === 'invoice' ? invoiceDiscountedRowsCount : auditCounts.all;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setAuditMode(mode.value)}
                  aria-pressed={active}
                  title={mode.caption}
                  className={active ? 'is-active' : ''}
                >
                  <i className={`fa-solid ${mode.icon}`} />
                  <span>{mode.label}</span>
                  <small>{count.toLocaleString('fa-IR')}</small>
                </button>
              );
            })}
          </div>

          <div className="product-sales-segment product-sales-segment--profit" aria-label="نمای سود">
            <span className="product-sales-segment__label">نمای سود</span>
            {PROFIT_VIEW_MODES.map((mode) => {
              const active = profitView === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setProfitView(mode.value)}
                  aria-pressed={active}
                  title={mode.caption}
                  className={active ? 'is-active' : ''}
                >
                  <i className={`fa-solid ${mode.icon}`} />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Executive KPI Row */}
      <section className="product-sales-metrics-section" aria-label="خلاصه فروش کالا و خدمات">
        <div className="product-sales-section-head">
          <div>
            <h3>خلاصه درآمد عملیاتی</h3>
            <p>شاخص‌های اصلی فروش، وصول و سود کالاهای انبار و خدمات در بازه انتخابی.</p>
          </div>
        </div>

        <div className="product-sales-metrics-grid product-sales-metrics-grid--primary">
          <article className="product-sales-metric-card">
            <span className="product-sales-metric-card__icon is-green"><i className="fa-solid fa-money-bill-trend-up" /></span>
            <div className="product-sales-metric-card__body">
              <span className="product-sales-metric-card__label">فروش نقدی</span>
              <strong>{money(summary.cashSales)}</strong>
              <small>وصول‌شده: {money(summary.cashReceived)}</small>
              <em>درصد وصول: {cashCollectionRate.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪</em>
            </div>
          </article>

          <article className="product-sales-metric-card">
            <span className="product-sales-metric-card__icon is-orange"><i className="fa-solid fa-file-invoice-dollar" /></span>
            <div className="product-sales-metric-card__body">
              <span className="product-sales-metric-card__label">فروش اعتباری</span>
              <strong>{money(summary.creditSales)}</strong>
              <small>وصول‌شده در بازه: {money(summary.creditReceived)}</small>
              <em>درصد وصول: {creditCollectionRate.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪</em>
            </div>
          </article>

          <article className="product-sales-metric-card">
            <span className="product-sales-metric-card__icon is-blue"><i className="fa-solid fa-calendar-check" /></span>
            <div className="product-sales-metric-card__body">
              <span className="product-sales-metric-card__label">فروش اقساطی</span>
              <strong>{money(summary.installmentSales)}</strong>
              <small>وصول‌شده در بازه: {money(summary.installmentReceived)}</small>
              <em>درصد وصول: {installmentCollectionRate.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪</em>
            </div>
          </article>

          <article className="product-sales-metric-card">
            <span className="product-sales-metric-card__icon is-violet"><i className="fa-solid fa-chart-line" /></span>
            <div className="product-sales-metric-card__body">
              <span className="product-sales-metric-card__label">{getProfitViewTitle(profitView)}</span>
              <strong>{money(activeSummaryProfit)}</strong>
              <small>{profitView === 'received' ? 'بر پایه مبالغ وصول‌شده' : 'سود کامل فروش ثبت‌شده'}</small>
              {profitView === 'received' && <em>سود وصول‌نشده: {money(summary.unrecognizedProfit)}</em>}
            </div>
          </article>
        </div>
      </section>

      <section className="product-sales-metrics-section" aria-label="کنترل فروش فیلترشده">
        <div className="product-sales-section-head">
          <div>
            <h3>کنترل فروش فیلترشده</h3>
            <p>نتیجه فیلتر، جستجو و حالت حسابرسی فعلی؛ بدون تکرار جزئیات داخل جدول.</p>
          </div>
        </div>

        <div className="product-sales-metrics-grid product-sales-metrics-grid--secondary">
          <article className="product-sales-metric-card is-compact">
            <span className="product-sales-metric-card__icon is-blue"><i className="fa-solid fa-receipt" /></span>
            <div className="product-sales-metric-card__body">
              <span className="product-sales-metric-card__label">فروش قراردادی</span>
              <strong>{money(filteredTotal)}</strong>
              <small>{totalFilteredRows.toLocaleString('fa-IR')} ردیف</small>
            </div>
          </article>

          <article className="product-sales-metric-card is-compact">
            <span className="product-sales-metric-card__icon is-green"><i className="fa-solid fa-circle-check" /></span>
            <div className="product-sales-metric-card__body">
              <span className="product-sales-metric-card__label">وصول واقعی</span>
              <strong>{money(filteredReceived)}</strong>
              <small>درصد وصول: {filteredCollectionRate.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪</small>
            </div>
          </article>

          <article className="product-sales-metric-card is-compact">
            <span className="product-sales-metric-card__icon is-violet"><i className="fa-solid fa-sack-dollar" /></span>
            <div className="product-sales-metric-card__body">
              <span className="product-sales-metric-card__label">{getProfitViewTitle(profitView)} فیلتر</span>
              <strong>{money(activeFilteredProfit)}</strong>
              <small>وصول‌نشده: {money(filteredUnrecognizedProfit)}</small>
            </div>
          </article>

          <article className="product-sales-metric-card is-compact">
            <span className="product-sales-metric-card__icon is-slate"><i className="fa-solid fa-calendar-days" /></span>
            <div className="product-sales-metric-card__body">
              <span className="product-sales-metric-card__label">بازه انتخابی</span>
              <strong className="product-sales-date-value">{fromDate ? toShamsiStr(fromDate) : '—'} تا {toDate ? toShamsiStr(toDate) : '—'}</strong>
              <small>{totalFilteredRows.toLocaleString('fa-IR')} ردیف</small>
            </div>
          </article>
        </div>
      </section>


      {/* Top products */}
      <div className="mt-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5">
        <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="font-extrabold text-gray-900 dark:text-gray-100">پرفروش‌ترین لوازم و خدمات</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">بر اساس وصول واقعی</div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {topProducts.map((p, idx) => (
            <div key={`${p.itemType}-${p.productId}`} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3">
              <div className="flex items-start gap-2">
                <div className="h-9 w-9 rounded-xl bg-slate-900 text-white grid place-items-center font-extrabold">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-gray-900 dark:text-gray-100 truncate">{p.productName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {p.itemType === 'service' ? 'خدمت' : 'لوازم'} • کد: {Number(p.productId || 0).toLocaleString('fa-IR')} • تعداد: {Number(p.qty || 0).toLocaleString('fa-IR')}
                  </div>
                </div>
              </div>
              <div className="mt-2 font-extrabold text-gray-900 dark:text-gray-100">{money(p.amount)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      {totalFilteredRows > 0 && (
        <div className="mt-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 overflow-hidden">
          <div className="border-b border-black/10 px-4 py-3 dark:border-white/10">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="product-sales-table-title"><i className="fa-solid fa-receipt" aria-hidden="true" /><span>جزئیات فروش</span></div>
                  {auditOnly && (
                    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">{getAuditModeTitle(auditMode)}</span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                  <span>{totalFilteredRows.toLocaleString('fa-IR')} ردیف فیلترشده</span>
                  <span className="hidden text-slate-300 dark:text-slate-700 sm:inline">•</span>
                  <span>نمایش {detailStartRow.toLocaleString('fa-IR')} تا {detailEndRow.toLocaleString('fa-IR')}</span>
                  <span className="hidden text-slate-300 dark:text-slate-700 sm:inline">•</span>
                  <span>کل تخفیف: {money(filteredDiscountTotal)}</span>
                </div>
              </div>

              <div className="product-sales-table-tools">
                <div className="product-sales-table-search">
                  <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                  <div
                    className="product-sales-table-search__editable"
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    dir="rtl"
                    data-placeholder="جستجوی جدول بر اساس قلم، سند یا پرداخت…"
                    aria-label="جستجوی جدول فروش کالا و خدمات"
                    onInput={(e) => setQuery(e.currentTarget.textContent || '')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                  >{query}</div>
                </div>
                <label className="product-sales-page-size-control" aria-label="تعداد ردیف در صفحه">
                  <span className="product-sales-page-size-control__label">تعداد در صفحه</span>
                  <span className="product-sales-page-size-control__value">
                    <select
                      value={detailsPageSize}
                      onChange={(e) => setDetailsPageSize(Number(e.target.value))}
                      aria-label="انتخاب تعداد ردیف در صفحه"
                    >
                      {DETAILS_PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>{size.toLocaleString('fa-IR')}</option>
                      ))}
                    </select>
                  </span>
                </label>

              </div>
            </div>
          </div>
          <div className="overflow-auto">
            <table className="product-sales-compact-table">
              <colgroup>
                <col className="product-sales-col-date" />
                <col className="product-sales-col-item" />
                <col className="product-sales-col-doc" />
                <col className="product-sales-col-money" />
                <col className="product-sales-col-profit" />
                <col className="product-sales-col-action" />
              </colgroup>
              <thead>
                <tr>
                  <th>ردیف فروش</th>
                  <th>قلم</th>
                  <th>سند و پرداخت</th>
                  <th>مبلغ و وصول</th>
                  <th>سود و تخفیف</th>
                  <th>اقدام</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((r, i) => {
                  const discountAudit = getRowDiscountAudit(r);
                  const discountType = getRowDiscountTypeMeta(r);
                  const profit = getRowProfitBreakdown(r);
                  const activeRowProfit = profitView === 'received' ? profit.realizedProfit : profit.fullProfit;
                  const paymentLabel = r.paymentType === 'installment' ? 'اقساطی' : r.paymentType === 'credit' ? 'اعتباری' : 'نقدی';
                  const sourceLabel = r.sourceType === 'installment' ? 'اقساطی' : 'فاکتور';
                  return (
                    <tr key={`${r.sourceType || 'invoice'}-${r.itemType || 'inventory'}-${r.orderId}-${r.productId}-${detailStartRow + i}`} className={auditOnly && discountAudit.hasAnyDiscount ? 'is-audit-row' : ''}>
                      <td>
                        <div className="product-sales-table-main">
                          <strong>{formatTransactionDate(r.transactionDate)}</strong>
                          <span>شناسه سند: {Number(r.orderId || 0).toLocaleString('fa-IR')}</span>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => r.itemType !== 'service' ? navigate(`/products?search=${encodeURIComponent(r.productName)}`) : undefined}
                          className="product-sales-item-link"
                          disabled={r.itemType === 'service'}
                          title={r.itemType === 'service' ? 'خدمت ثبت‌شده' : 'نمایش این کالا در صفحه کالاها'}
                        >
                          <span className="product-sales-item-link__icon"><i className={`fa-solid ${r.itemType === 'service' ? 'fa-screwdriver-wrench' : 'fa-box'}`} /></span>
                          <span>
                            <strong>{r.productName}</strong>
                            <small>{r.itemType === 'service' ? 'خدمت' : 'لوازم'} • کد {Number(r.productId || 0).toLocaleString('fa-IR')} • تعداد {Number(r.quantity || 0).toLocaleString('fa-IR')}</small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <div className="product-sales-table-tags">
                          <span>{sourceLabel}</span>
                          <span>{paymentLabel}</span>
                        </div>
                      </td>
                      <td>
                        <div className="product-sales-table-money">
                          <strong>{money(Number(r.lineTotal || 0))}</strong>
                          <span>وصول‌شده: {money(Number(r.receivedAmount || 0))}</span>
                          <small>قیمت واحد: {money(Number(r.unitPrice || 0))}</small>
                        </div>
                      </td>
                      <td>
                        <div className="product-sales-table-money">
                          <strong>{money(activeRowProfit)}</strong>
                          <span>تخفیف: {money(discountAudit.totalDiscount)}</span>
                          <small>{discountType.label}</small>
                        </div>
                      </td>
                      <td>
                        <div className="product-sales-row-actions">
                          <button
                            type="button"
                            onClick={() => navigate(r.sourceType === 'installment' ? `/installment-sales/${r.orderId}` : `/invoices/${r.orderId}`)}
                            className="report-direct-action"
                            title="باز کردن سند فروش"
                          >
                            <i className="fa-solid fa-file-invoice" />
                            <span>سند فروش</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalculationRow(r)}
                            className="report-direct-action report-direct-action--muted"
                            title="جزئیات محاسبه سود و تخفیف"
                          >
                            <i className="fa-solid fa-calculator" />
                            <span>محاسبه</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {detailsTotalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-black/10 px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                نمایش {detailStartRow.toLocaleString('fa-IR')} تا {detailEndRow.toLocaleString('fa-IR')} از {totalFilteredRows.toLocaleString('fa-IR')} ردیف
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDetailsPage(1)}
                  disabled={safeDetailsPage <= 1}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  اول
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsPage((page) => Math.max(1, page - 1))}
                  disabled={safeDetailsPage <= 1}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  قبلی
                </button>
                <span className="grid h-9 min-w-[7rem] place-items-center rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {safeDetailsPage.toLocaleString('fa-IR')} / {detailsTotalPages.toLocaleString('fa-IR')}
                </span>
                <button
                  type="button"
                  onClick={() => setDetailsPage((page) => Math.min(detailsTotalPages, page + 1))}
                  disabled={safeDetailsPage >= detailsTotalPages}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  بعدی
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsPage(detailsTotalPages)}
                  disabled={safeDetailsPage >= detailsTotalPages}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  آخر
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </PageKit>

    {riskDrawerOpen && createPortal((
      <div className="fixed inset-0 z-[246] flex items-stretch justify-end bg-slate-950/55 backdrop-blur-[2px]" role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="بستن اولویت پیگیری وصول"
          className="absolute inset-0 cursor-default"
          onClick={() => setRiskDrawerOpen(false)}
        />
        <aside className="relative z-10 flex h-full w-full max-w-[680px] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 bg-gradient-to-l from-slate-50 via-white to-white px-5 py-5 dark:border-slate-800 dark:from-slate-900/60 dark:via-slate-950 dark:to-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-black text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                  <i className="fa-solid fa-phone-volume" />
                  ابزار تصمیم‌گیری وصول
                </div>
                <h3 className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">جزئیات اولویت پیگیری وصول</h3>
                <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">
                  این Drawer نشان می‌دهد چرا هر سند در سطح کم‌ریسک، نیازمند پیگیری، فوری یا بحرانی قرار گرفته است.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRiskDrawerOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 dark:border-rose-900/60 dark:bg-rose-950/25">
                <div className="text-[10px] font-black text-rose-600 dark:text-rose-200">بحرانی</div>
                <div className="mt-1 text-base font-black text-rose-700 dark:text-rose-100">{collectionRisk.counts.critical.toLocaleString('fa-IR')}</div>
              </div>
              <div className="rounded-2xl border border-orange-200 bg-orange-50 px-3 py-3 dark:border-orange-900/60 dark:bg-orange-950/25">
                <div className="text-[10px] font-black text-orange-600 dark:text-orange-200">فوری</div>
                <div className="mt-1 text-base font-black text-orange-700 dark:text-orange-100">{collectionRisk.counts.urgent.toLocaleString('fa-IR')}</div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900/60 dark:bg-amber-950/25">
                <div className="text-[10px] font-black text-amber-600 dark:text-amber-200">نیازمند پیگیری</div>
                <div className="mt-1 text-base font-black text-amber-700 dark:text-amber-100">{collectionRisk.counts.followup.toLocaleString('fa-IR')}</div>
              </div>
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 dark:border-sky-900/60 dark:bg-sky-950/25">
                <div className="text-[10px] font-black text-sky-600 dark:text-sky-200">کم‌ریسک</div>
                <div className="mt-1 text-base font-black text-sky-700 dark:text-sky-100">{collectionRisk.counts.low.toLocaleString('fa-IR')}</div>
              </div>
            </div>

            {collectionRisk.items.length === 0 ? (
              <div className="mt-4 rounded-[26px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-100">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 dark:bg-slate-950/45">
                    <i className="fa-solid fa-check-double" />
                  </span>
                  <div>
                    <div className="text-sm font-black">سند باز برای پیگیری پیدا نشد</div>
                    <div className="mt-1 text-xs leading-6 opacity-80">در فیلتر فعلی، فاکتور اعتباری/اقساطی با مانده قابل پیگیری دیده نمی‌شود.</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {collectionRisk.items.map((item) => {
                  const meta = getCollectionRiskMeta(item.level);
                  return (
                    <div key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
                      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${meta.badgeClassName}`}>
                              <i className={`fa-solid ${meta.icon} text-[10px]`} />
                              {meta.label}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                              {item.sourceType === 'installment' ? 'اقساطی' : 'فاکتور'} #{item.orderId.toLocaleString('fa-IR')}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                              امتیاز {item.score.toLocaleString('fa-IR')} / ۱۰۰
                            </span>
                          </div>
                          <div className="mt-3 text-sm font-black text-slate-950 dark:text-slate-50">{item.customerName}</div>
                          <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                            {item.paymentType === 'installment' ? 'فروش اقساطی' : 'فروش اعتباری'} • تاریخ فروش: {formatTransactionDate(item.transactionDate)} {item.dueDate ? `• نزدیک‌ترین سررسید: ${item.dueDate}` : ''}
                          </p>
                        </div>
                        <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left dark:border-slate-800 dark:bg-slate-950/70">
                          <div className="text-[10px] font-black text-slate-500 dark:text-slate-400">مانده وصول</div>
                          <div className="mt-1 text-sm font-black text-slate-950 dark:text-slate-50">{money(item.outstandingAmount)}</div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 sm:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950/60">
                          <div className="text-[10px] text-slate-400">مبلغ سند</div>
                          <div className="mt-1 font-black">{money(item.contractualTotal)}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950/60">
                          <div className="text-[10px] text-slate-400">وصول‌شده</div>
                          <div className="mt-1 font-black">{money(item.receivedAmount)}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950/60">
                          <div className="text-[10px] text-slate-400">درصد وصول</div>
                          <div className="mt-1 font-black">{percentFa(item.collectionRate)}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950/60">
                          <div className="text-[10px] text-slate-400">سود وصول‌نشده</div>
                          <div className="mt-1 font-black">{money(item.unrecognizedProfit)}</div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/55">
                        <div className="mb-2 text-[11px] font-black text-slate-500 dark:text-slate-400">چرا این اولویت؟</div>
                        <ul className="space-y-1.5 text-xs font-bold leading-6 text-slate-700 dark:text-slate-200">
                          {item.reasons.map((reason, idx) => (
                            <li key={`${item.id}-reason-${idx}`} className="flex gap-2">
                              <i className="fa-solid fa-circle-info mt-1 text-[10px] text-slate-400" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    ), document.body)}

    {healthDrawerOpen && createPortal((
      <div className="fixed inset-0 z-[245] flex items-stretch justify-end bg-slate-950/55 backdrop-blur-[2px]" role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="بستن کنترل سلامت"
          className="absolute inset-0 cursor-default"
          onClick={() => setHealthDrawerOpen(false)}
        />
        <aside className="relative z-10 flex h-full w-full max-w-[620px] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 bg-gradient-to-l from-slate-50 via-white to-white px-5 py-5 dark:border-slate-800 dark:from-slate-900/60 dark:via-slate-950 dark:to-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-black text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                  <i className="fa-solid fa-shield-halved" />
                  کنترل داخلی گزارش
                </div>
                <h3 className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">جزئیات سلامت محاسبات</h3>
                <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">
                  این لیست اختلاف جمع فاکتور، پخش تخفیف کلی، فرمول ردیف‌ها و اختلاف‌های رُندی را جدا می‌کند.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHealthDrawerOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="text-[10px] font-black text-slate-500 dark:text-slate-400">سند</div>
                <div className="mt-1 text-base font-black text-slate-950 dark:text-slate-50">{calculationHealth.checkedDocs.toLocaleString('fa-IR')}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="text-[10px] font-black text-slate-500 dark:text-slate-400">ردیف</div>
                <div className="mt-1 text-base font-black text-slate-950 dark:text-slate-50">{calculationHealth.checkedRows.toLocaleString('fa-IR')}</div>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 dark:border-rose-900/60 dark:bg-rose-950/25">
                <div className="text-[10px] font-black text-rose-600 dark:text-rose-200">جدی</div>
                <div className="mt-1 text-base font-black text-rose-700 dark:text-rose-100">{calculationHealth.errorCount.toLocaleString('fa-IR')}</div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900/60 dark:bg-amber-950/25">
                <div className="text-[10px] font-black text-amber-600 dark:text-amber-200">قابل بررسی</div>
                <div className="mt-1 text-base font-black text-amber-700 dark:text-amber-100">{calculationHealth.warningCount.toLocaleString('fa-IR')}</div>
              </div>
            </div>

            {calculationHealth.issues.length === 0 ? (
              <div className="mt-4 rounded-[26px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-100">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 dark:bg-slate-950/45">
                    <i className="fa-solid fa-check-double" />
                  </span>
                  <div>
                    <div className="text-sm font-black">مغایرتی پیدا نشد</div>
                    <div className="mt-1 text-xs leading-6 opacity-80">جمع ردیف‌ها، تخفیف‌ها و مبالغ نهایی در بازه فعلی سالم هستند.</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {calculationHealth.issues.map((issue) => {
                  const issueMeta = getCalculationIssueMeta(issue.severity);
                  return (
                    <div key={issue.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
                      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${issueMeta.className}`}>
                              <i className={`fa-solid ${issueMeta.icon} text-[10px]`} />
                              {issueMeta.label}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                              {issue.sourceType === 'installment' ? 'اقساطی' : 'فاکتور'} #{issue.orderId.toLocaleString('fa-IR')}
                            </span>
                          </div>
                          <div className="mt-3 text-sm font-black text-slate-950 dark:text-slate-50">{issue.title}</div>
                          <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{issue.description}</p>
                        </div>
                        <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left dark:border-slate-800 dark:bg-slate-950/70">
                          <div className="text-[10px] font-black text-slate-500 dark:text-slate-400">اختلاف</div>
                          <div className="mt-1 text-sm font-black text-slate-950 dark:text-slate-50">{money(Math.abs(Number(issue.difference || 0)))}</div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 sm:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950/60">
                          <div className="text-[10px] text-slate-400">مورد انتظار</div>
                          <div className="mt-1 font-black">{money(Number(issue.expectedAmount || 0))}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950/60">
                          <div className="text-[10px] text-slate-400">مقدار فعلی</div>
                          <div className="mt-1 font-black">{money(Number(issue.actualAmount || 0))}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950/60">
                          <div className="text-[10px] text-slate-400">سهم تخفیف فاکتور</div>
                          <div className="mt-1 font-black">{money(Number(issue.invoiceDiscountShareTotal || 0))}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950/60">
                          <div className="text-[10px] text-slate-400">تعداد ردیف</div>
                          <div className="mt-1 font-black">{Number(issue.rowsCount || 0).toLocaleString('fa-IR')}</div>
                        </div>
                      </div>

                      {Array.isArray(issue.rowIssues) && issue.rowIssues.length > 0 && (
                        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/55">
                          <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">ردیف‌های درگیر</div>
                          <div className="mt-2 space-y-2">
                            {issue.rowIssues.map((rowIssue, idx) => (
                              <div key={`${issue.id}-${idx}`} className="rounded-xl bg-white px-3 py-2 text-xs dark:bg-slate-900/70">
                                <div className="font-black text-slate-800 dark:text-slate-100">{rowIssue.productName}</div>
                                <div className="mt-1 leading-5 text-slate-500 dark:text-slate-400">{rowIssue.reason} — اختلاف: {money(Math.abs(Number(rowIssue.difference || 0)))}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    ), document.body)}

    {calculationRow && createPortal((
      <div className="fixed inset-0 z-[240] flex items-stretch justify-end bg-slate-950/50 backdrop-blur-[2px]" role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="بستن جزئیات"
          className="absolute inset-0 cursor-default"
          onClick={() => setCalculationRow(null)}
        />
        <aside className="relative z-10 flex h-full w-full max-w-[540px] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 bg-gradient-to-l from-indigo-50 via-white to-white px-5 py-5 dark:border-slate-800 dark:from-indigo-950/25 dark:via-slate-950 dark:to-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-[11px] font-black text-indigo-700 dark:border-indigo-900/60 dark:bg-slate-900/80 dark:text-indigo-200">
                  <i className="fa-solid fa-receipt" />
                  تحلیل ردیف فاکتور
                </div>
                <h3 className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">جزئیات محاسبه تخفیف و سود</h3>
                <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">
                  سهم تخفیف کلی فاکتور بر اساس وزن مبلغی همین ردیف بین اقلام تقسیم شده است.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCalculationRow(null)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          </div>

          {(() => {
            const b = calcRowBreakdown(calculationRow);
            if (!b) return null;
            const drawerDiscountType = getRowDiscountTypeMeta(calculationRow!);
            const drawerDiscountAudit = getRowDiscountAudit(calculationRow!);
            const calcCards = [
              { label: 'مبلغ ناخالص ردیف', value: money(b.gross), icon: 'fa-layer-group' },
              { label: 'تخفیف خود آیتم', value: money(b.itemDiscount), icon: 'fa-tag' },
              { label: 'مبلغ بعد از تخفیف آیتم', value: money(b.beforeGlobal), icon: 'fa-equals' },
              { label: 'سهم از تخفیف کلی فاکتور', value: money(b.invoiceShare), icon: 'fa-scissors' },
              { label: 'کل تخفیف این ردیف', value: money(b.totalDiscount), icon: 'fa-percent' },
              { label: 'جمع نهایی ردیف', value: money(b.afterDiscount), icon: 'fa-check-double' },
            ];
            return (
              <div className="flex-1 overflow-auto p-5">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <div className="text-xs font-black text-slate-500 dark:text-slate-400">قلم انتخاب‌شده</div>
                  <div className="mt-2 text-base font-black text-slate-900 dark:text-slate-100">{calculationRow!.productName}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black shadow-sm ${drawerDiscountType.className}`}>
                      <i className={`fa-solid ${drawerDiscountType.icon} text-[10px]`} />
                      {drawerDiscountType.label}
                    </span>
                    <span className="text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">
                      {drawerDiscountType.caption}
                    </span>
                  </div>
                  {drawerDiscountAudit.hasAnyDiscount && (
                    <div className="mt-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
                      {getRowDiscountReason(calculationRow!)}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-950">سند #{Number(calculationRow!.orderId || 0).toLocaleString('fa-IR')}</span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-950">{calculationRow!.itemType === 'service' ? 'خدمت' : 'لوازم'}</span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-950">تعداد {Number(b.quantity || 0).toLocaleString('fa-IR')}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  {calcCards.map((card) => (
                    <div key={card.label} className="flex items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                          <i className={'fa-solid ' + card.icon} />
                        </span>
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{card.label}</span>
                      </div>
                      <strong className="whitespace-nowrap text-sm font-black text-slate-950 dark:text-slate-50">{card.value}</strong>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-[26px] border border-indigo-200 bg-indigo-50/80 p-4 text-indigo-950 shadow-sm dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-indigo-100">
                  <div className="flex min-w-0 flex-1 flex-row-reverse items-start gap-3 text-right">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/85 dark:bg-slate-950/60">
                      <i className="fa-solid fa-square-root-variable" />
                    </span>
                    <div className="min-w-0 flex-1 text-right">
                      <div className="text-sm font-black">فرمول عددی همین ردیف</div>
                      <p className="mt-1 text-xs leading-6 opacity-80">
                        این بخش دقیقاً نشان می‌دهد تخفیف آیتم و سهم تخفیف کلی فاکتور چطور روی همین قلم اعمال شده است.
                      </p>

                      <div className="mt-3 space-y-2">
                        <div className="rounded-2xl border border-white/70 bg-white/75 px-3 py-2 text-xs leading-6 dark:border-white/10 dark:bg-slate-950/45">
                          <div className="font-black text-indigo-700 dark:text-indigo-200">۱) مبلغ ناخالص ردیف</div>
                          <div className="mt-1 font-mono text-[12px] text-slate-700 dark:text-slate-200">
                            {numberFa(b.quantity)} × {money(b.unitPrice)} = {money(b.gross)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/70 bg-white/75 px-3 py-2 text-xs leading-6 dark:border-white/10 dark:bg-slate-950/45">
                          <div className="font-black text-indigo-700 dark:text-indigo-200">۲) بعد از تخفیف خود آیتم</div>
                          <div className="mt-1 font-mono text-[12px] text-slate-700 dark:text-slate-200">
                            {money(b.gross)} − {money(b.itemDiscount)} = {money(b.beforeGlobal)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/70 bg-white/75 px-3 py-2 text-xs leading-6 dark:border-white/10 dark:bg-slate-950/45">
                          <div className="font-black text-indigo-700 dark:text-indigo-200">۳) سهم این ردیف از تخفیف کلی فاکتور</div>
                          {b.orderDiscount > 0 && b.invoiceDiscountBase > 0 ? (
                            <div className="mt-1 font-mono text-[12px] text-slate-700 dark:text-slate-200">
                              {money(b.beforeGlobal)} ÷ {money(b.invoiceDiscountBase)} = {percentFa(b.shareRate)} از فاکتور<br />
                              {money(b.orderDiscount)} × {percentFa(b.shareRate)} = {money(b.invoiceShare)}
                            </div>
                          ) : (
                            <div className="mt-1 font-mono text-[12px] text-slate-700 dark:text-slate-200">
                              برای این سند تخفیف کلی فاکتور ثبت نشده؛ سهم فاکتور = {money(0)}
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-white/70 bg-white/75 px-3 py-2 text-xs leading-6 dark:border-white/10 dark:bg-slate-950/45">
                          <div className="font-black text-indigo-700 dark:text-indigo-200">۴) مبلغ نهایی ردیف</div>
                          <div className="mt-1 font-mono text-[12px] text-slate-700 dark:text-slate-200">
                            {money(b.beforeGlobal)} − {money(b.invoiceShare)} = {money(b.afterDiscount)}
                          </div>
                          <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            کل تخفیف این ردیف: {money(b.itemDiscount)} + {money(b.invoiceShare)} = {money(b.totalDiscount)} / نرخ موثر تخفیف: {percentFa(b.effectiveDiscountRate)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">وصول‌شده برای این ردیف</span>
                    <strong className="text-sm font-black text-slate-950 dark:text-slate-50">{money(b.received)}</strong>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: b.collectionRate + '%' }} />
                  </div>
                  <div className="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">درصد وصول: {b.collectionRate.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪</div>
                </div>

                <div className="mt-4 rounded-[26px] border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-100">
                  <div className="flex min-w-0 flex-1 flex-row-reverse items-start gap-3 text-right">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/85 dark:bg-slate-950/60">
                      <i className="fa-solid fa-hand-holding-dollar" />
                    </span>
                    <div className="min-w-0 flex-1 text-right">
                      <div className="text-sm font-black">تطبیق سود همین ردیف</div>
                      <p className="mt-1 text-xs leading-6 opacity-80">
                        سود کل ردیف با نسبت وصول ضرب می‌شود تا سود قابل شناسایی حسابداری به‌دست بیاید.
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/70 bg-white/75 px-3 py-2 text-xs dark:border-white/10 dark:bg-slate-950/45">
                          <div className="font-black opacity-70">بهای تمام‌شده</div>
                          <div className="mt-1 font-black">{money(b.lineCost)}</div>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/75 px-3 py-2 text-xs dark:border-white/10 dark:bg-slate-950/45">
                          <div className="font-black opacity-70">سود کل</div>
                          <div className="mt-1 font-black">{money(b.fullProfit)}</div>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/75 px-3 py-2 text-xs dark:border-white/10 dark:bg-slate-950/45">
                          <div className="font-black opacity-70">سود وصول‌شده</div>
                          <div className="mt-1 font-black">{money(b.realizedProfit)}</div>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/75 px-3 py-2 text-xs dark:border-white/10 dark:bg-slate-950/45">
                          <div className="font-black opacity-70">سود وصول‌نشده</div>
                          <div className="mt-1 font-black">{money(b.unrecognizedProfit)}</div>
                        </div>
                      </div>
                      <div className="mt-3 rounded-2xl border border-white/70 bg-white/75 px-3 py-2 text-xs leading-6 dark:border-white/10 dark:bg-slate-950/45">
                        <div className="font-black text-emerald-700 dark:text-emerald-200">فرمول سود وصول‌شده</div>
                        <div className="mt-1 font-mono text-[12px] text-slate-700 dark:text-slate-200">
                          {money(b.fullProfit)} × {percentFa(b.collectionRate)} = {money(b.realizedProfit)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </aside>
      </div>
    ), document.body)}
  </div>
);
}
