import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import moment from 'jalali-moment';
import { useSearchParams } from 'react-router-dom';

import {
  AppSearchField,
  Button,
  DataTableShell,
  EmptyState,
  SelectField,
  Surface,
  TableActionGroup,
  type TableActionItem,
} from '@/components/ui';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ModernReportShell from '../../components/reports/ModernReportShell';
import PremiumStatCard from '../../components/reports/PremiumStatCard';
import ReportControlDock, {
  ReportControlComparison,
  ReportControlDateSection,
  ReportControlFilters,
  ReportControlFooter,
  ReportControlSearch,
  ReportControlStatus,
} from '../../components/reports/ReportControlDock';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import ReportFilterField from '../../components/reports/ReportFilterField';
import ToggleSwitch from '../../components/ToggleSwitch';
import { useReportsExports } from '../../contexts/ReportsExportsContext';
import { apiFetch } from '../../utils/apiFetch';
import { formatExactNumberText, formatReadablePercentText } from '../../utils/exactNumber';
import { exportToExcel } from '../../utils/exporters';
import { formatShamsiDate, toShamsiInputValue } from '../../utils/shamsiDate';

type PaymentType = 'cash' | 'credit' | 'installment';
type ItemGroup = 'phone' | 'accessories' | 'service' | 'mixed';
type CollectionStatus = 'collected' | 'partial' | 'uncollected';
type FilterValue<T extends string> = 'all' | T;

type SalesLedgerItem = {
  rowId: string;
  itemType: string;
  productName: string;
  quantity: number;
  purchaseTotal: number;
  saleTotal: number;
  totalProfit: number;
  collectedAmount: number;
  realizedProfit: number;
  unrealizedProfit: number;
};

type SalesLedgerRow = {
  docKey: string;
  sourceType: 'invoice' | 'installment' | 'legacy';
  orderId: number;
  transactionDate: string;
  customerName: string | null;
  paymentType: PaymentType;
  itemGroup: ItemGroup;
  itemsSummary: string;
  itemsCount: number;
  purchaseTotal: number;
  saleTotal: number;
  totalProfit: number;
  collectedAmount: number;
  outstandingAmount: number;
  collectionRate: number;
  realizedProfit: number;
  unrealizedProfit: number;
  collectionStatus: CollectionStatus;
  missingCostItems: number;
  detailHref: string | null;
  items: SalesLedgerItem[];
};

type SalesLedgerSummary = {
  documentsCount: number;
  totalPurchase: number;
  totalSales: number;
  totalProfit: number;
  collectedSales: number;
  outstandingSales: number;
  realizedProfit: number;
  unrealizedProfit: number;
  byPaymentType: Record<PaymentType, Omit<SalesLedgerSummary, 'byPaymentType'>>;
};

type SalesLedgerData = {
  range: { from: string; to: string; fromISO: string; toISO: string };
  currencyBase: string;
  displayCurrency: string;
  moneyDivisor: number;
  summary: SalesLedgerSummary;
  rows: SalesLedgerRow[];
  dataQuality: {
    missingCostDocuments: number;
    unlinkedCreditReceipts: number;
  };
  audit: {
    salesScope: string;
    collectionScope: string;
    profitRecognition: string;
    sourceTables: string[];
    generatedAt: string;
  };
};

const paymentMeta: Record<PaymentType, { label: string; icon: string }> = {
  cash: { label: 'نقدی', icon: 'fa-money-bill-wave' },
  credit: { label: 'اعتباری', icon: 'fa-file-signature' },
  installment: { label: 'اقساطی', icon: 'fa-calendar-check' },
};

const itemGroupLabel: Record<ItemGroup, string> = {
  phone: 'گوشی',
  accessories: 'لوازم',
  service: 'خدمات',
  mixed: 'ترکیبی',
};

const collectionMeta: Record<CollectionStatus, { label: string; className: string; icon: string }> = {
  collected: { label: 'وصول کامل', className: 'text-emerald-700 dark:text-emerald-300', icon: 'fa-circle-check' },
  partial: { label: 'وصول بخشی', className: 'text-amber-700 dark:text-amber-300', icon: 'fa-circle-half-stroke' },
  uncollected: { label: 'وصول‌نشده', className: 'text-amber-700 dark:text-amber-300', icon: 'fa-clock' },
};

const emptySummary = (): SalesLedgerSummary => ({
  documentsCount: 0,
  totalPurchase: 0,
  totalSales: 0,
  totalProfit: 0,
  collectedSales: 0,
  outstandingSales: 0,
  realizedProfit: 0,
  unrealizedProfit: 0,
  byPaymentType: {
    cash: {
      documentsCount: 0,
      totalPurchase: 0,
      totalSales: 0,
      totalProfit: 0,
      collectedSales: 0,
      outstandingSales: 0,
      realizedProfit: 0,
      unrealizedProfit: 0,
    },
    credit: {
      documentsCount: 0,
      totalPurchase: 0,
      totalSales: 0,
      totalProfit: 0,
      collectedSales: 0,
      outstandingSales: 0,
      realizedProfit: 0,
      unrealizedProfit: 0,
    },
    installment: {
      documentsCount: 0,
      totalPurchase: 0,
      totalSales: 0,
      totalProfit: 0,
      collectedSales: 0,
      outstandingSales: 0,
      realizedProfit: 0,
      unrealizedProfit: 0,
    },
  },
});

const summarizeRows = (rows: SalesLedgerRow[]): SalesLedgerSummary => {
  const summary = emptySummary();
  for (const row of rows) {
    const bucket = summary.byPaymentType[row.paymentType];
    const values = {
      totalPurchase: Number(row.purchaseTotal || 0),
      totalSales: Number(row.saleTotal || 0),
      totalProfit: Number(row.totalProfit || 0),
      collectedSales: Number(row.collectedAmount || 0),
      outstandingSales: Number(row.outstandingAmount || 0),
      realizedProfit: Number(row.realizedProfit || 0),
      unrealizedProfit: Number(row.unrealizedProfit || 0),
    };
    summary.documentsCount += 1;
    bucket.documentsCount += 1;
    (Object.keys(values) as Array<keyof typeof values>).forEach((key) => {
      summary[key] += values[key];
      bucket[key] += values[key];
    });
  }
  return summary;
};

const normalizeSearchText = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ')
    .trim();

const parseJalaliParam = (value: string | null, fallback: () => Date): Date => {
  const normalized = String(value || '').trim();
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(normalized)) return fallback();
  const parsed = moment(normalized, 'jYYYY/jMM/jDD', true);
  return parsed.isValid() ? parsed.toDate() : fallback();
};

const formatMoney = (value: unknown, divisor = 1, currency = 'تومان'): string => {
  const numeric = Number(value || 0);
  const displayValue = Number.isFinite(numeric) ? numeric / Math.max(1, divisor || 1) : 0;
  return `\u2068${formatExactNumberText(displayValue)}\u2069 ${currency}`;
};

const formatSaleDate = (value: string): string => formatShamsiDate(value) || '—';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const COMPARISON_PREFERENCE_STORAGE_KEY = 'reports.allSalesLedger.comparePreviousPeriod';

const readComparisonPreference = (params: URLSearchParams): boolean => {
  const queryPreference = params.get('compare');
  if (queryPreference === '0') return false;
  if (queryPreference === '1') return true;
  if (typeof window === 'undefined') return true;

  try {
    const storedPreference = window.localStorage.getItem(COMPARISON_PREFERENCE_STORAGE_KEY);
    if (storedPreference === '0') return false;
    if (storedPreference === '1') return true;
  } catch {
    // Storage can be unavailable in private or hardened browser sessions.
  }

  return true;
};

type ComparisonRange = { from: string; to: string };

type ShareDeltaPresentation = {
  label: string;
  className: string;
  icon: string;
};

const buildPreviousComparisonRange = (fromDate: Date, toDate: Date): ComparisonRange | null => {
  const rangeStart = moment(fromDate).locale('fa').startOf('day');
  const rangeEnd = moment(toDate).locale('fa').startOf('day');
  if (!rangeStart.isValid() || !rangeEnd.isValid() || rangeEnd.isBefore(rangeStart, 'day')) return null;

  const inclusiveDays = Math.max(1, rangeEnd.diff(rangeStart, 'days') + 1);
  const previousEnd = rangeStart.clone().subtract(1, 'day');
  const previousStart = previousEnd.clone().subtract(inclusiveDays - 1, 'days');
  return {
    from: previousStart.format('jYYYY/jMM/jDD'),
    to: previousEnd.format('jYYYY/jMM/jDD'),
  };
};

const formatPercentagePointValue = (value: number): string =>
  `${formatExactNumberText(Math.abs(Number(value.toFixed(1))), { useGrouping: false })} واحد درصد`;

const getShareDeltaPresentation = (currentShare: number, previousShare: number): ShareDeltaPresentation => {
  const delta = Number((currentShare - previousShare).toFixed(1));
  if (Math.abs(delta) < 0.05) {
    return {
      label: 'بدون تغییر نسبت به دوره قبل',
      className: 'text-slate-500 dark:text-slate-400',
      icon: 'fa-minus',
    };
  }
  if (delta > 0) {
    return {
      label: `افزایش ${formatPercentagePointValue(delta)}`,
      className: 'text-sky-700 dark:text-sky-300',
      icon: 'fa-arrow-trend-up',
    };
  }
  return {
    label: `کاهش ${formatPercentagePointValue(delta)}`,
    className: 'text-violet-700 dark:text-violet-300',
    icon: 'fa-arrow-trend-down',
  };
};

const fetchSalesLedgerData = async (from: string, to: string): Promise<SalesLedgerData> => {
  const query = new URLSearchParams({ from, to });
  const response = await apiFetch(`/api/reports/all-sales-ledger?${query.toString()}`);
  const json = await response.json();
  if (!response.ok || !json?.success) {
    throw new Error(json?.message || 'دریافت دفتر جامع فروش ناموفق بود.');
  }
  return json.data as SalesLedgerData;
};

export default function AllSalesLedgerReport() {
  const { registerReportExports } = useReportsExports();
  const [searchParams, setSearchParams] = useSearchParams();
  const exportRef = useRef<() => void>(() => {});
  const loadSequenceRef = useRef(0);

  const [fromDate, setFromDate] = useState<Date>(() =>
    parseJalaliParam(searchParams.get('from'), () => moment().locale('fa').startOf('jMonth').toDate()),
  );
  const [toDate, setToDate] = useState<Date>(() =>
    parseJalaliParam(searchParams.get('to'), () => new Date()),
  );
  const [data, setData] = useState<SalesLedgerData | null>(null);
  const [comparisonData, setComparisonData] = useState<SalesLedgerData | null>(null);
  const [comparisonEnabled, setComparisonEnabled] = useState(() => readComparisonPreference(searchParams));
  const [comparisonError, setComparisonError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<FilterValue<PaymentType>>('all');
  const [itemFilter, setItemFilter] = useState<FilterValue<ItemGroup>>('all');
  const [collectionFilter, setCollectionFilter] = useState<FilterValue<CollectionStatus>>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);

  const from = useMemo(() => toShamsiInputValue(fromDate), [fromDate]);
  const to = useMemo(() => toShamsiInputValue(toDate), [toDate]);
  const comparisonRange = useMemo(
    () => buildPreviousComparisonRange(fromDate, toDate),
    [fromDate, toDate],
  );

  const comparisonLoadSequenceRef = useRef(0);

  const loadCurrent = useCallback(async () => {
    const requestId = ++loadSequenceRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const currentResult = await fetchSalesLedgerData(from, to);
      if (requestId !== loadSequenceRef.current) return;
      setData(currentResult);
    } catch (caught: any) {
      if (requestId !== loadSequenceRef.current) return;
      setData(null);
      setError(caught?.message || 'دریافت دفتر جامع فروش ناموفق بود.');
    } finally {
      if (requestId === loadSequenceRef.current) setIsLoading(false);
    }
  }, [from, to]);

  const loadComparison = useCallback(async () => {
    const requestId = ++comparisonLoadSequenceRef.current;
    if (!comparisonEnabled || !comparisonRange) {
      setComparisonData(null);
      setComparisonError(false);
      setIsComparisonLoading(false);
      return;
    }

    setIsComparisonLoading(true);
    setComparisonData(null);
    setComparisonError(false);
    try {
      const result = await fetchSalesLedgerData(comparisonRange.from, comparisonRange.to);
      if (requestId !== comparisonLoadSequenceRef.current) return;
      setComparisonData(result);
    } catch {
      if (requestId !== comparisonLoadSequenceRef.current) return;
      setComparisonData(null);
      setComparisonError(true);
    } finally {
      if (requestId === comparisonLoadSequenceRef.current) setIsComparisonLoading(false);
    }
  }, [comparisonEnabled, comparisonRange]);

  const load = useCallback(() => {
    void loadCurrent();
    void loadComparison();
  }, [loadComparison, loadCurrent]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadCurrent(), 220);
    return () => window.clearTimeout(timeout);
  }, [loadCurrent]);

  useEffect(() => {
    if (!comparisonEnabled) {
      comparisonLoadSequenceRef.current += 1;
      setComparisonData(null);
      setComparisonError(false);
      setIsComparisonLoading(false);
      return;
    }
    const timeout = window.setTimeout(() => void loadComparison(), 260);
    return () => window.clearTimeout(timeout);
  }, [comparisonEnabled, loadComparison]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        COMPARISON_PREFERENCE_STORAGE_KEY,
        comparisonEnabled ? '1' : '0',
      );
    } catch {
      // Keep the in-memory preference when local storage is unavailable.
    }
  }, [comparisonEnabled]);

  useEffect(() => {
    const nextParams: Record<string, string> = { from, to };
    if (!comparisonEnabled) nextParams.compare = '0';
    setSearchParams(nextParams, { replace: true });
  }, [comparisonEnabled, from, setSearchParams, to]);

  const normalizedSearch = useMemo(() => normalizeSearchText(search), [search]);
  const filterLedgerRows = useCallback((rows: SalesLedgerRow[]): SalesLedgerRow[] => rows.filter((row) => {
    if (paymentFilter !== 'all' && row.paymentType !== paymentFilter) return false;
    if (itemFilter !== 'all' && row.itemGroup !== itemFilter) return false;
    if (collectionFilter !== 'all' && row.collectionStatus !== collectionFilter) return false;
    if (!normalizedSearch) return true;
    const haystack = normalizeSearchText([
      row.orderId,
      row.docKey,
      row.itemsSummary,
      row.customerName,
      paymentMeta[row.paymentType].label,
      itemGroupLabel[row.itemGroup],
      collectionMeta[row.collectionStatus].label,
      ...row.items.map((item) => item.productName),
    ].join(' '));
    return haystack.includes(normalizedSearch);
  }), [collectionFilter, itemFilter, normalizedSearch, paymentFilter]);

  const filteredRows = useMemo(
    () => filterLedgerRows(data?.rows || []),
    [data?.rows, filterLedgerRows],
  );
  const comparisonFilteredRows = useMemo(
    () => filterLedgerRows(comparisonData?.rows || []),
    [comparisonData?.rows, filterLedgerRows],
  );

  useEffect(() => {
    setPage(1);
  }, [search, paymentFilter, itemFilter, collectionFilter, pageSize, from, to]);

  const filteredSummary = useMemo(() => summarizeRows(filteredRows), [filteredRows]);
  const comparisonSummary = useMemo(
    () => summarizeRows(comparisonFilteredRows),
    [comparisonFilteredRows],
  );
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = useMemo(
    () => filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredRows, pageSize, safePage],
  );
  const visibleStart = filteredRows.length ? (safePage - 1) * pageSize + 1 : 0;
  const visibleEnd = Math.min(filteredRows.length, safePage * pageSize);
  const divisor = data?.moneyDivisor || 1;
  const currency = data?.displayCurrency || 'تومان';
  const money = useCallback((value: unknown) => formatMoney(value, divisor, currency), [currency, divisor]);

  const exportExcel = useCallback(() => {
    const rows = filteredRows.map((row) => ({
      'تاریخ فروش': formatSaleDate(row.transactionDate),
      'شماره سند': row.orderId,
      'شرح فروش': row.itemsSummary,
      مشتری: row.customerName || 'مشتری نقدی/نامشخص',
      'گروه فروش': itemGroupLabel[row.itemGroup],
      'نوع سند': row.sourceType === 'installment' ? 'قرارداد اقساط' : row.sourceType === 'legacy' ? 'فروش مستقیم قدیمی' : 'فاکتور فروش',
      'نوع فروش': paymentMeta[row.paymentType].label,
      'بهای خرید': row.purchaseTotal,
      'مبلغ فروش': row.saleTotal,
      'سود کل': row.totalProfit,
      'مبلغ وصول‌شده': row.collectedAmount,
      'مانده وصول': row.outstandingAmount,
      'سود وصول‌شده': row.realizedProfit,
      'سود وصول‌نشده': row.unrealizedProfit,
      'درصد وصول': row.collectionRate,
      'وضعیت وصول': collectionMeta[row.collectionStatus].label,
    }));
    exportToExcel(
      `all-sales-ledger-${from.replaceAll('/', '-')}-${to.replaceAll('/', '-')}.xlsx`,
      rows,
      [
        { header: 'تاریخ فروش', key: 'تاریخ فروش' },
        { header: 'شماره سند', key: 'شماره سند' },
        { header: 'شرح فروش', key: 'شرح فروش' },
        { header: 'مشتری', key: 'مشتری' },
        { header: 'گروه فروش', key: 'گروه فروش' },
        { header: 'نوع سند', key: 'نوع سند' },
        { header: 'نوع فروش', key: 'نوع فروش' },
        { header: 'بهای خرید', key: 'بهای خرید' },
        { header: 'مبلغ فروش', key: 'مبلغ فروش' },
        { header: 'سود کل', key: 'سود کل' },
        { header: 'مبلغ وصول‌شده', key: 'مبلغ وصول‌شده' },
        { header: 'مانده وصول', key: 'مانده وصول' },
        { header: 'سود وصول‌شده', key: 'سود وصول‌شده' },
        { header: 'سود وصول‌نشده', key: 'سود وصول‌نشده' },
        { header: 'درصد وصول', key: 'درصد وصول' },
        { header: 'وضعیت وصول', key: 'وضعیت وصول' },
      ],
      'AllSalesLedger',
    );
  }, [filteredRows, from, to]);

  exportRef.current = exportExcel;
  useEffect(() => {
    registerReportExports({ excel: () => exportRef.current() });
    return () => registerReportExports({});
  }, [registerReportExports]);

  const renderActions = (row: SalesLedgerRow) => {
    if (!row.detailHref) {
      return <span className="text-xs font-bold text-slate-400 dark:text-slate-500">بدون سند جزئیات</span>;
    }
    const actionLabel = row.sourceType === 'installment' ? 'مشاهده فروش اقساطی' : 'مشاهده فاکتور';
    const actions: TableActionItem[] = [{
      key: 'view',
      kind: 'link',
      to: row.detailHref,
      label: actionLabel,
      tooltip: actionLabel,
      icon: <i className="fa-solid fa-eye" />,
      variant: 'secondary',
    }];
    return <TableActionGroup actions={actions} collapseBelow="sm" align="center" />;
  };

  const renderCollectionStatus = (row: SalesLedgerRow) => {
    const meta = collectionMeta[row.collectionStatus];
    return (
      <div className="min-w-0 text-right">
        <span className={`inline-flex items-center gap-1.5 text-xs font-black ${meta.className}`}>
          <i className={`fa-solid ${meta.icon}`} aria-hidden="true" />
          {meta.label}
        </span>
        <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          {formatReadablePercentText(row.collectionRate, 2)} از مبلغ فروش
        </div>
      </div>
    );
  };

  return (
    <ModernReportShell
      title="دفتر جامع فروش و سود"
      subtitle="تمام فاکتورها و فروش‌های نقدی، اعتباری و اقساطی لوازم، خدمات و گوشی با تفکیک سود وصول‌شده و وصول‌نشده"
      icon="fa-solid fa-file-invoice-dollar"
    >
      <div className="space-y-4">
        <ReportControlDock
          ariaLabel="کنترل‌های دفتر جامع فروش"
          layout="approved"
          presentation="approved"
          title="کنترل گزارش"
          subtitle="فیلترها، بازه زمانی و عملیات گزارش"
          icon={<i className="fa-solid fa-sliders" aria-hidden="true" />}
          footer={(
            <ReportControlFooter
              ariaLabel="عملیات و وضعیت دفتر جامع فروش"
              statuses={(
                <>
                  <ReportControlStatus
                    tone={comparisonEnabled ? 'success' : 'neutral'}
                    icon={<i className={`fa-solid ${comparisonEnabled ? 'fa-arrow-trend-up' : 'fa-pause'}`} aria-hidden="true" />}
                  >
                    <span>{comparisonEnabled ? 'مقایسه فعال' : 'مقایسه غیرفعال'}</span>
                  </ReportControlStatus>
                  <ReportControlStatus tone="info" icon={<i className="fa-regular fa-calendar" aria-hidden="true" />}>
                    <span className="whitespace-nowrap">بازه فعال:</span>
                    <bdi dir="ltr" className="font-black">{from}</bdi>
                    <span aria-hidden="true" className="font-black text-[var(--ds-text-muted)]">|</span>
                    <bdi dir="ltr" className="font-black">{to}</bdi>
                  </ReportControlStatus>
                </>
              )}
              actions={(
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={exportExcel}
                    disabled={isLoading || filteredRows.length === 0}
                    leftIcon={<i className="fa-solid fa-file-excel" />}
                    className="report-control-approved__export-button"
                  >
                    خروجی اکسل
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={load}
                    disabled={isLoading || isComparisonLoading}
                    loading={isLoading || isComparisonLoading}
                    loadingText="در حال به‌روزرسانی…"
                    leftIcon={<i className="fa-solid fa-rotate" />}
                    className="report-control-approved__primary-button"
                  >
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
                <ShamsiDatePicker
                  selectedDate={fromDate}
                  onDateChange={(date) => date && setFromDate(date)}
                  size="standard"
                />
              </ReportFilterField>
            )}
            toField={(
              <ReportFilterField
                label="تا تاریخ"
                icon={<i className="fa-regular fa-calendar-check" />}
                className="report-control-approved__field"
                minWidthClassName="min-w-0"
              >
                <ShamsiDatePicker
                  selectedDate={toDate}
                  onDateChange={(date) => date && setToDate(date)}
                  size="standard"
                />
              </ReportFilterField>
            )}
          />

          <ReportControlComparison
            title="مقایسه با دوره قبل"
            description={comparisonEnabled
              ? 'فعال‌سازی مقایسه مبلغ و تعداد با دوره هم‌طول قبلی.'
              : 'مقایسه غیرفعال است و فقط بازه جاری محاسبه می‌شود.'}
            control={(
              <ToggleSwitch
                checked={comparisonEnabled}
                onCheckedChange={setComparisonEnabled}
                ariaLabel="مقایسه گزارش با دوره قبل"
                size="md"
              />
            )}
            baseline={(
              <ReportFilterField
                label="مبنای مقایسه"
                icon={<i className="fa-solid fa-code-compare" />}
                className="report-control-approved__field"
                minWidthClassName="min-w-0"
              >
                <SelectField
                  controlOnly
                  size="md"
                  icon={false}
                  defaultValue="previous"
                  options={[{ value: 'previous', label: 'دوره قبلی هم‌طول' }]}
                  ariaLabel="مبنای مقایسه گزارش"
                />
              </ReportFilterField>
            )}
          />

          <ReportControlFilters>
            <ReportFilterField
              label="نوع فروش"
              icon={<i className="fa-solid fa-wallet" />}
              className="report-control-approved__field"
              minWidthClassName="min-w-0"
            >
              <SelectField
                controlOnly
                size="md"
                icon={false}
                value={paymentFilter}
                onValueChange={(value) => setPaymentFilter(value as FilterValue<PaymentType>)}
                options={[
                  { value: 'all', label: 'همه روش‌ها' },
                  { value: 'cash', label: 'نقدی' },
                  { value: 'credit', label: 'اعتباری' },
                  { value: 'installment', label: 'اقساطی' },
                ]}
              />
            </ReportFilterField>

            <ReportFilterField
              label="گروه فروش"
              icon={<i className="fa-solid fa-layer-group" />}
              className="report-control-approved__field"
              minWidthClassName="min-w-0"
            >
              <SelectField
                controlOnly
                size="md"
                icon={false}
                value={itemFilter}
                onValueChange={(value) => setItemFilter(value as FilterValue<ItemGroup>)}
                options={[
                  { value: 'all', label: 'همه گروه‌ها' },
                  { value: 'phone', label: 'گوشی' },
                  { value: 'accessories', label: 'لوازم' },
                  { value: 'service', label: 'خدمات' },
                  { value: 'mixed', label: 'ترکیبی' },
                ]}
              />
            </ReportFilterField>

            <ReportFilterField
              label="وضعیت وصول"
              icon={<i className="fa-solid fa-hand-holding-dollar" />}
              className="report-control-approved__field"
              minWidthClassName="min-w-0"
            >
              <SelectField
                controlOnly
                size="md"
                icon={false}
                value={collectionFilter}
                onValueChange={(value) => setCollectionFilter(value as FilterValue<CollectionStatus>)}
                options={[
                  { value: 'all', label: 'همه وضعیت‌ها' },
                  { value: 'collected', label: 'وصول کامل' },
                  { value: 'partial', label: 'وصول بخشی' },
                  { value: 'uncollected', label: 'وصول‌نشده' },
                ]}
              />
            </ReportFilterField>
          </ReportControlFilters>

          <ReportControlSearch>
            <ReportFilterField
              label="جستجو"
              icon={<i className="fa-solid fa-magnifying-glass" />}
              className="report-control-approved__field"
              minWidthClassName="min-w-0"
            >
              <AppSearchField
                value={search}
                onChange={setSearch}
                size="md"
                clearable
                placeholder="شماره سند، مشتری، کالا یا مدل گوشی…"
                ariaLabel="جستجو در دفتر جامع فروش"
              />
            </ReportFilterField>
          </ReportControlSearch>
        </ReportControlDock>

      {error ? (
        <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-[22px]" contentClassName="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <div className="flex min-w-0 items-start gap-3 text-right text-rose-700 dark:text-rose-300">
              <i className="fa-solid fa-circle-exclamation mt-1 shrink-0" />
              <span className="text-sm font-bold leading-7">{error}</span>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => void load()}>تلاش دوباره</Button>
          </div>
        </Surface>
      ) : null}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" aria-label="خلاصه مالی دفتر جامع فروش">
        <PremiumStatCard label="بهای خرید فروش‌ها" value={money(filteredSummary.totalPurchase)} hint="بهای تمام‌شده اقلام فروخته‌شده" icon={<i className="fa-solid fa-cart-shopping" />} />
        <PremiumStatCard label="جمع فروش" value={money(filteredSummary.totalSales)} hint={`${formatExactNumberText(filteredSummary.documentsCount)} سند فروش`} icon={<i className="fa-solid fa-receipt" />} tone="info" />
        <PremiumStatCard label="سود کل" value={money(filteredSummary.totalProfit)} hint="فروش منهای بهای خرید" icon={<i className="fa-solid fa-chart-line" />} tone={filteredSummary.totalProfit < 0 ? 'bad' : 'neutral'} />
        <PremiumStatCard label="سود وصول‌شده" value={money(filteredSummary.realizedProfit)} hint="سود قطعی پس از پوشش کامل بهای خرید" icon={<i className="fa-solid fa-circle-check" />} tone={filteredSummary.realizedProfit < 0 ? 'bad' : 'good'} />
        <PremiumStatCard label="سود وصول‌نشده" value={money(filteredSummary.unrealizedProfit)} hint="سود باقی‌مانده در مطالبات" icon={<i className="fa-solid fa-clock" />} tone={filteredSummary.unrealizedProfit < 0 ? 'bad' : 'warn'} />
        <PremiumStatCard label="مانده وصول فروش" value={money(filteredSummary.outstandingSales)} hint={`وصول‌شده: ${money(filteredSummary.collectedSales)}`} icon={<i className="fa-solid fa-hand-holding-dollar" />} tone="warn" />
      </section>

      <section className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-3" aria-label="تفکیک روش فروش">
        {comparisonEnabled ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-slate-500 dark:text-slate-400 lg:col-span-3">
            <i className={`fa-solid ${isComparisonLoading ? 'fa-spinner fa-spin' : 'fa-code-compare'} shrink-0`} aria-hidden="true" />
            <span>{isComparisonLoading ? 'در حال دریافت دوره مقایسه:' : 'مقایسه سهم‌ها با دوره هم‌طول قبلی:'}</span>
            {comparisonRange ? (
              <bdi dir="ltr" className="font-black text-slate-700 dark:text-slate-200">
                {comparisonRange.from} تا {comparisonRange.to}
              </bdi>
            ) : (
              <span>بازه مقایسه نامعتبر است</span>
            )}
          </div>
        ) : null}
        {(Object.keys(paymentMeta) as PaymentType[]).map((paymentType) => {
          const bucket = filteredSummary.byPaymentType[paymentType];
          const comparisonBucket = comparisonSummary.byPaymentType[paymentType];
          const meta = paymentMeta[paymentType];
          const salesShare = filteredSummary.totalSales > 0
            ? (bucket.totalSales / filteredSummary.totalSales) * 100
            : 0;
          const documentsShare = filteredSummary.documentsCount > 0
            ? (bucket.documentsCount / filteredSummary.documentsCount) * 100
            : 0;
          const previousSalesShare = comparisonSummary.totalSales > 0
            ? (comparisonBucket.totalSales / comparisonSummary.totalSales) * 100
            : 0;
          const previousDocumentsShare = comparisonSummary.documentsCount > 0
            ? (comparisonBucket.documentsCount / comparisonSummary.documentsCount) * 100
            : 0;
          const salesDelta = comparisonEnabled && comparisonData && comparisonSummary.totalSales > 0
            ? getShareDeltaPresentation(salesShare, previousSalesShare)
            : null;
          const documentsDelta = comparisonEnabled && comparisonData && comparisonSummary.documentsCount > 0
            ? getShareDeltaPresentation(documentsShare, previousDocumentsShare)
            : null;
          const totalProfitClass = bucket.totalProfit < 0
            ? 'text-rose-700 dark:text-rose-300'
            : 'text-slate-900 dark:text-slate-100';
          const realizedProfitClass = bucket.realizedProfit < 0
            ? 'text-rose-700 dark:text-rose-300'
            : 'text-emerald-700 dark:text-emerald-300';
          const unrealizedProfitClass = bucket.unrealizedProfit < 0
            ? 'text-rose-700 dark:text-rose-300'
            : 'text-amber-700 dark:text-amber-300';

          const metrics = [
            { label: 'فروش', value: money(bucket.totalSales), className: 'text-slate-900 dark:text-slate-100' },
            { label: 'سود کل', value: money(bucket.totalProfit), className: totalProfitClass },
            { label: 'سود وصول‌شده', value: money(bucket.realizedProfit), className: realizedProfitClass },
            { label: 'سود وصول‌نشده', value: money(bucket.unrealizedProfit), className: unrealizedProfitClass },
          ];

          return (
            <Surface
              key={paymentType}
              surface="glass"
              variant="subtle"
              scheme="adaptive"
              className="h-full rounded-[22px]"
              contentClassName="h-full p-4"
            >
              <div className="flex h-full min-w-0 flex-col">
                <div className="flex min-h-20 items-start justify-between gap-3">
                  <div className="min-w-0 text-right">
                    <div className="text-sm font-black text-slate-950 dark:text-white">فروش {meta.label}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                      {formatExactNumberText(bucket.documentsCount)} سند
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span>سهم مبلغ: {formatReadablePercentText(salesShare, 1)}</span>
                      {comparisonEnabled && salesDelta ? (
                        <span
                          className={`inline-flex items-center gap-1 ${salesDelta.className}`}
                          title={`دوره قبل: ${formatReadablePercentText(previousSalesShare, 1)}`}
                        >
                          <i className={`fa-solid ${salesDelta.icon}`} aria-hidden="true" />
                          {salesDelta.label}
                        </span>
                      ) : comparisonEnabled ? (
                        <span className="text-slate-400 dark:text-slate-500">
                          {isComparisonLoading ? 'در حال مقایسه…' : comparisonError ? 'مقایسه در دسترس نیست' : 'دوره قبل بدون فروش'}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span>سهم اسناد: {formatReadablePercentText(documentsShare, 1)}</span>
                      {comparisonEnabled && documentsDelta ? (
                        <span
                          className={`inline-flex items-center gap-1 ${documentsDelta.className}`}
                          title={`دوره قبل: ${formatReadablePercentText(previousDocumentsShare, 1)}`}
                        >
                          <i className={`fa-solid ${documentsDelta.icon}`} aria-hidden="true" />
                          {documentsDelta.label}
                        </span>
                      ) : comparisonEnabled ? (
                        <span className="text-slate-400 dark:text-slate-500">
                          {isComparisonLoading ? 'در حال مقایسه…' : comparisonError ? 'مقایسه در دسترس نیست' : 'دوره قبل بدون سند'}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <i className={`fa-solid ${meta.icon} mt-0.5 shrink-0 text-slate-500 dark:text-slate-300`} aria-hidden="true" />
                </div>

                <dl className="mt-3 grid flex-1 grid-rows-4 text-xs">
                  {metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-[var(--ds-border-subtle)] py-2 first:border-t-0"
                    >
                      <dt className={`min-w-0 text-right font-bold ${metric.className}`}>{metric.label}</dt>
                      <dd className={`whitespace-nowrap text-left font-black leading-5 tabular-nums ${metric.className}`}>
                        {metric.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Surface>
          );
        })}
      </section>

      {data && (data.dataQuality.missingCostDocuments > 0 || data.dataQuality.unlinkedCreditReceipts > 0) ? (
        <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-[22px]" contentClassName="p-4">
          <div className="flex items-start gap-3 text-right text-amber-800 dark:text-amber-300" role="status">
            <i className="fa-solid fa-triangle-exclamation mt-1 shrink-0" />
            <div className="min-w-0 text-xs font-bold leading-7">
              {data.dataQuality.missingCostDocuments > 0 ? (
                <p>{formatExactNumberText(data.dataQuality.missingCostDocuments)} سند دارای حداقل یک قلم بدون بهای خرید ثبت‌شده است؛ سود این اسناد باید بررسی شود.</p>
              ) : null}
              {data.dataQuality.unlinkedCreditReceipts > 0 ? (
                <p>تا پایان بازه، مبلغ {money(data.dataQuality.unlinkedCreditReceipts)} وصول اعتباری بدون ارجاع مستقیم به شماره فاکتور ثبت شده و در سود وصول‌شده سند خاصی منظور نشده است.</p>
              ) : null}
            </div>
          </div>
        </Surface>
      ) : null}

      <DataTableShell
        headerLayout="compact"
        title="ریز تمام فروش‌ها"
        meta={(
          <span className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap">
            <i className="fa-solid fa-list-ol shrink-0" aria-hidden="true" />
            <span>نمایش {formatExactNumberText(visibleStart)} تا {formatExactNumberText(visibleEnd)} از {formatExactNumberText(filteredRows.length)} سند</span>
          </span>
        )}
        actions={(
          <div className="w-full min-w-[9rem] sm:w-[9rem] lg:w-[9.5rem]">
            <SelectField
              controlOnly
              size="sm"
              ariaLabel="تعداد ردیف در صفحه"
              value={String(pageSize)}
              onValueChange={(value) => setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number])}
              options={PAGE_SIZE_OPTIONS.map((value) => ({ value: String(value), label: `${formatExactNumberText(value)} ردیف` }))}
            />
          </div>
        )}
        aria-label="جدول دفتر جامع فروش و سود"
      >
        {isLoading ? (
          <div className="flex min-h-52 items-center justify-center gap-3 text-sm font-bold text-slate-500 dark:text-slate-400">
            <i className="fa-solid fa-spinner fa-spin" />
            در حال دریافت فروش‌ها…
          </div>
        ) : paginatedRows.length === 0 ? (
          <EmptyState
            title="فروشی با این فیلترها پیدا نشد"
            description="بازه تاریخ یا فیلترهای نوع فروش، گروه کالا و وضعیت وصول را تغییر دهید."
          />
        ) : (
          <>
            <div className="hidden xl:block">
              <table className="report-table ux-data-table w-full table-fixed" data-ui-table="true" data-ui-table-layout="managed" data-ui-bidi-scope="rtl-table">
                <colgroup>
                  <col className="w-[9%]" />
                  <col className="w-[24%]" />
                  <col className="w-[10%]" />
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                  <col className="w-[17%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th>تاریخ</th>
                    <th>فروش / فاکتور</th>
                    <th>نوع فروش</th>
                    <th>بهای خرید</th>
                    <th>مبلغ فروش</th>
                    <th>سود کل</th>
                    <th>وصول و سود</th>
                    <th className="text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row) => (
                    <tr key={row.docKey}>
                      <td><span className="whitespace-nowrap text-xs font-black text-slate-700 dark:text-slate-200">{formatSaleDate(row.transactionDate)}</span></td>
                      <td>
                        <div className="min-w-0 text-right">
                          <div className="truncate text-sm font-black text-slate-950 dark:text-white" title={row.itemsSummary}>{row.itemsSummary}</div>
                          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            <span>سند #{formatExactNumberText(row.orderId)}</span>
                            <span>{itemGroupLabel[row.itemGroup]}</span>
                            <span className="truncate">{row.customerName || 'مشتری نقدی/نامشخص'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-right">
                          <div className="text-xs font-black text-slate-900 dark:text-slate-100">{paymentMeta[row.paymentType].label}</div>
                          <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">{row.sourceType === 'installment' ? 'قرارداد اقساط' : row.sourceType === 'legacy' ? 'فروش مستقیم قدیمی' : 'فاکتور فروش'}</div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-xs font-black">{money(row.purchaseTotal)}</td>
                      <td className="whitespace-nowrap text-xs font-black">{money(row.saleTotal)}</td>
                      <td className={`whitespace-nowrap text-xs font-black ${row.totalProfit < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-slate-100'}`}>{money(row.totalProfit)}</td>
                      <td>
                        <div className="min-w-0 space-y-1.5 text-right">
                          {renderCollectionStatus(row)}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            <span>مبلغ وصول: {money(row.collectedAmount)}</span>
                            <span>مانده: {money(row.outstandingAmount)}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-black">
                            <span className={row.realizedProfit < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}>سود وصول‌شده: {money(row.realizedProfit)}</span>
                            <span className={row.unrealizedProfit < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}>سود وصول‌نشده: {money(row.unrealizedProfit)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">{renderActions(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 xl:hidden" aria-label="کارت‌های فروش">
              {paginatedRows.map((row) => (
                <Surface key={row.docKey} surface="glass" variant="subtle" scheme="adaptive" className="rounded-[20px]" contentClassName="p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 text-right">
                      <div className="truncate text-sm font-black text-slate-950 dark:text-white" title={row.itemsSummary}>{row.itemsSummary}</div>
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <span>{formatSaleDate(row.transactionDate)}</span>
                        <span>سند #{formatExactNumberText(row.orderId)}</span>
                        <span>{paymentMeta[row.paymentType].label}</span>
                        <span>{itemGroupLabel[row.itemGroup]}</span>
                      </div>
                    </div>
                    {renderActions(row)}
                  </div>
                  <div className="mt-3 text-xs font-bold text-slate-600 dark:text-slate-300">{row.customerName || 'مشتری نقدی/نامشخص'}</div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-right text-xs sm:grid-cols-4">
                    <div><span className="block text-slate-500 dark:text-slate-400">بهای خرید</span><strong className="mt-1 block">{money(row.purchaseTotal)}</strong></div>
                    <div><span className="block text-slate-500 dark:text-slate-400">مبلغ فروش</span><strong className="mt-1 block">{money(row.saleTotal)}</strong></div>
                    <div><span className="block text-slate-500 dark:text-slate-400">سود کل</span><strong className={`mt-1 block ${row.totalProfit < 0 ? 'text-rose-700 dark:text-rose-300' : ''}`}>{money(row.totalProfit)}</strong></div>
                    <div><span className="block text-slate-500 dark:text-slate-400">مبلغ وصول</span><strong className="mt-1 block">{money(row.collectedAmount)}</strong></div>
                    <div><span className="block text-slate-500 dark:text-slate-400">مانده وصول</span><strong className="mt-1 block">{money(row.outstandingAmount)}</strong></div>
                    <div><span className={`block ${row.realizedProfit < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>سود وصول‌شده</span><strong className={`mt-1 block ${row.realizedProfit < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{money(row.realizedProfit)}</strong></div>
                    <div><span className={`block ${row.unrealizedProfit < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}`}>سود وصول‌نشده</span><strong className={`mt-1 block ${row.unrealizedProfit < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}`}>{money(row.unrealizedProfit)}</strong></div>
                    <div>{renderCollectionStatus(row)}</div>
                  </div>
                </Surface>
              ))}
            </div>
          </>
        )}
      </DataTableShell>

      {filteredRows.length > 0 ? (
        <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-[20px]" contentClassName="p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 sm:text-right">
              صفحه {formatExactNumberText(safePage)} از {formatExactNumberText(totalPages)}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Button type="button" variant="secondary" size="sm" disabled={safePage <= 1} onClick={() => setPage(1)} leftIcon={<i className="fa-solid fa-angles-right" />}>اول</Button>
              <Button type="button" variant="secondary" size="sm" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} leftIcon={<i className="fa-solid fa-chevron-right" />}>قبلی</Button>
              <Button type="button" variant="secondary" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} rightIcon={<i className="fa-solid fa-chevron-left" />}>بعدی</Button>
              <Button type="button" variant="secondary" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)} rightIcon={<i className="fa-solid fa-angles-left" />}>آخر</Button>
            </div>
          </div>
        </Surface>
      ) : null}

      <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-[20px]" contentClassName="p-4">
        <div className="flex items-start gap-3 text-right text-xs font-bold leading-7 text-slate-600 dark:text-slate-300">
          <i className="fa-solid fa-scale-balanced mt-1 shrink-0 text-slate-500" aria-hidden="true" />
          <p>
            بازه انتخابی بر اساس تاریخ واقعی فروش است. برای هر فروش اعتباری یا اقساطی، وصول‌ها از ابتدای سابقه تا پایان بازه جمع می‌شوند. مبلغ وصولی ابتدا بهای خرید ثبت‌شده را پوشش می‌دهد و فقط مازاد آن به‌عنوان سود وصول‌شده نمایش داده می‌شود؛ بنابراین هیچ سودی به‌صورت نسبتی یا عدد خردشده محاسبه نمی‌شود.
          </p>
        </div>
      </Surface>
      </div>
    </ModernReportShell>
  );
}
