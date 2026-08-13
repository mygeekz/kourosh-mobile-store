import { formatExactNumberText } from '../../utils/exactNumber';
import { formatReportMoneyText, formatReportPercentText } from '../../utils/reportPresentation';
import { useEffect, useMemo, useRef, useState } from 'react';
import moment from 'jalali-moment';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import ReportControlDock, {
  ReportControlDateSection,
  ReportControlFooter,
  ReportControlSearch,
  ReportControlStatus,
} from '../../components/reports/ReportControlDock';
import ReportFilterField from '../../components/reports/ReportFilterField';
import Notification from '../../components/Notification';
import { useReportsExports } from '../../contexts/ReportsExportsContext';
import { exportToExcel } from '../../utils/exporters';
import { apiFetch } from '../../utils/apiFetch';
import type { NotificationMessage } from '../../types';
import KpiDefinitionNote from '../../components/reports/KpiDefinitionNote';
import ModernReportShell from '../../components/reports/ModernReportShell';
import PremiumStatCard from '../../components/reports/PremiumStatCard';
import FinancialStatusBadge from '../../components/FinancialStatusBadge';
import FinancialProgressBar from '../../components/FinancialProgressBar';
import FilterChipsBar from '../../components/FilterChipsBar';
import { AppSearchField, Button, DataTableShell, DialogShell, EmptyState, SelectField, Surface, SurfaceHeader } from '@/components/ui';
import Skeleton from '../../components/ui/Skeleton';
import { formatShamsiDate, toShamsiInputValue } from '../../utils/shamsiDate';

type TabKey = 'overview' | 'cash' | 'installment' | 'risk' | 'real' | 'partners';

const riskStatusTone = (level?: string): 'danger' | 'warning' | 'success' | 'info' => {
  if (level === 'critical' || level === 'high') return 'danger';
  if (level === 'followup') return 'warning';
  if (level === 'low') return 'success';
  return 'info';
};

type CashRow = {
  id: string;
  saleId: number;
  saleDate?: string;
  saleTypeLabel: string;
  customerName?: string;
  customerPhone?: string;
  phoneModel?: string;
  imei?: string;
  purchasePrice: number;
  referencePrice: number | null;
  currentPurchasePrice?: number;
  salePrice: number;
  grossLineTotal: number;
  itemDiscount: number;
  invoiceDiscountShare: number;
  profit: number;
  realProfit: number | null;
  replacementDelta: number | null;
  referencePriceAvailable?: boolean;
  referencePriceSource?: string | null;
  receivedAmount: number;
  outstandingAmount: number;
};

type InstallmentRow = {
  id: string;
  saleId: number;
  saleDate?: string;
  saleTypeLabel: string;
  customerName?: string;
  customerPhone?: string;
  phoneModel?: string;
  imei?: string;
  purchasePrice: number;
  referencePrice: number | null;
  currentPurchasePrice?: number;
  contractTotal: number;
  downPayment: number;
  paidInstallments: number;
  receivedAmount: number;
  outstandingAmount: number;
  collectionRate: number;
  downPaymentRate: number;
  fullProfit: number;
  realizedProfit: number;
  unrecognizedProfit: number;
  realProfit: number | null;
  replacementDelta: number | null;
  referencePriceAvailable?: boolean;
  referencePriceSource?: string | null;
  overdueAmount: number;
  overdueCount: number;
  overdueChecks: number;
  overdueDays: number;
  dueInDays: number | null;
  nextDueDate?: string | null;
  nextDueAmount: number;
  numberOfInstallments: number;
  customerBalance: number;
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'followup' | 'low' | string;
  riskLabel: string;
  riskTone: string;
  riskReasons: string[];

};

type PartnerCapitalPhone = {
  phoneId: number;
  phoneModel?: string;
  imei?: string;
  phoneStatus?: string;
  sharePercent: number;
  purchasePrice: number;
  currentPurchasePrice: number;
  partnerCapitalAtCurrentPrice: number;
  saleKind: 'cash' | 'installment' | 'sold' | 'remaining' | string;
};

type PartnerCapitalRow = {
  storePartnerId: number;
  partnerName: string;
  colorTag?: string | null;
  partnerSource?: string;
  totalPhonesHad: number;
  cashSoldCount: number;
  installmentSoldCount: number;
  remainingCount: number;
  soldCount: number;
  initialPurchaseCapital: number;
  soldCapitalAtCurrentPrice: number;
  cashSoldCapitalAtCurrentPrice: number;
  installmentSoldCapitalAtCurrentPrice: number;
  inventoryCapitalAtCurrentPrice: number;
  replacementDeltaCapital: number;
  paidSettlementAmount: number;
  receivedSettlementAmount: number;
  netSettledAmount: number;
  remainingCapitalBalance: number;
  phones?: PartnerCapitalPhone[];
};

type PartnerCapitalSummary = {
  partnersCount: number;
  totalPhonesHad: number;
  totalCashSoldCount: number;
  totalInstallmentSoldCount: number;
  totalRemainingCount: number;
  totalSoldCapitalAtCurrentPrice: number;
  totalInventoryCapitalAtCurrentPrice: number;
  totalPaidToPartners: number;
  totalReceivedFromPartners: number;
  totalRemainingCapitalBalance: number;
};

type Summary = {
  totalPhones: number;
  cashCount: number;
  installmentCount: number;
  totalSales: number;
  cashSales: number;
  installmentSales: number;
  cashProfit: number;
  cashRealProfit: number;
  installmentFullProfit: number;
  installmentRealizedProfit: number;
  installmentUnrecognizedProfit: number;
  installmentReceived: number;
  installmentOutstanding: number;
  installmentCollectionRate: number;
  highRiskCount: number;
  criticalRiskCount: number;
  averageDownPaymentRate: number;
  totalReplacementDelta: number;
  totalRealProfit: number;
  referencePricedCount: number;
  referenceCoverageRate: number;
};

type AnalyticsPayload = {
  from?: string;
  to?: string;
  summary: Summary;
  comparison?: any;
  cashRows: CashRow[];
  installmentRows: InstallmentRow[];
  realProfitRows: Array<(CashRow | InstallmentRow) & { saleType?: string; fullProfit?: number; riskLabel?: string }>;
  risk?: { highRiskCount: number; rows: InstallmentRow[] };
  partnerCapital?: { summary: PartnerCapitalSummary; rows: PartnerCapitalRow[] };
  generatedAt?: string;
  dataSource?: string;
  sourceTables?: string[];
  dataQuality?: {
    source?: string;
    includesMockData?: boolean;
    referencePricePolicy?: string;
    referencePricedCount?: number;
    referenceMissingCount?: number;
    riskPolicy?: string;
    partnerCapitalScope?: string;
  };
};

const emptySummary: Summary = {
  totalPhones: 0,
  cashCount: 0,
  installmentCount: 0,
  totalSales: 0,
  cashSales: 0,
  installmentSales: 0,
  cashProfit: 0,
  cashRealProfit: 0,
  installmentFullProfit: 0,
  installmentRealizedProfit: 0,
  installmentUnrecognizedProfit: 0,
  installmentReceived: 0,
  installmentOutstanding: 0,
  installmentCollectionRate: 0,
  highRiskCount: 0,
  criticalRiskCount: 0,
  averageDownPaymentRate: 0,
  totalReplacementDelta: 0,
  totalRealProfit: 0,
  referencePricedCount: 0,
  referenceCoverageRate: 0,
};


const emptyPartnerCapitalSummary: PartnerCapitalSummary = {
  partnersCount: 0,
  totalPhonesHad: 0,
  totalCashSoldCount: 0,
  totalInstallmentSoldCount: 0,
  totalRemainingCount: 0,
  totalSoldCapitalAtCurrentPrice: 0,
  totalInventoryCapitalAtCurrentPrice: 0,
  totalPaidToPartners: 0,
  totalReceivedFromPartners: 0,
  totalRemainingCapitalBalance: 0,
};

const money = (value?: number | null) => formatReportMoneyText(value || 0);
const percent = (value?: number | null) => formatReportPercentText(value || 0);
const toJ = (date: Date | null) => toShamsiInputValue(date);
const shamsi = formatShamsiDate;
const signedMoney = (value?: number | null) => {
  const n = Number(value || 0);
  const cls = n > 0 ? 'text-emerald-600 dark:text-emerald-300' : n < 0 ? 'text-rose-600 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300';
  return <span className={`font-black ${cls}`}>{money(n)}</span>;
};

const tabMeta: Record<TabKey, { label: string; icon: string }> = {
  overview: { label: 'نمای کلی', icon: 'fa-chart-pie' },
  cash: { label: 'نقدی', icon: 'fa-money-bill-wave' },
  installment: { label: 'اقساطی', icon: 'fa-file-invoice-dollar' },
  risk: { label: 'ریسک اقساط', icon: 'fa-triangle-exclamation' },
  real: { label: 'سود واقعی', icon: 'fa-scale-balanced' },
  partners: { label: 'سرمایه همکاران', icon: 'fa-people-group' },
};

const analyticsTabChips = (Object.keys(tabMeta) as TabKey[]).map((key) => ({
  key,
  label: tabMeta[key].label,
  icon: `fa-solid ${tabMeta[key].icon}`,
}));

const MissingReferencePrice = () => <FinancialStatusBadge label="ثبت نشده" tone="neutral" size="xs" />;


const MOBILE_ANALYTICS_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type MobileAnalyticsPaginationProps = {
  pageIndex: number;
  pageCount: number;
  onFirst: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLast: () => void;
};

function MobileAnalyticsPagination({
  pageIndex,
  pageCount,
  onFirst,
  onPrevious,
  onNext,
  onLast,
}: MobileAnalyticsPaginationProps) {
  const atFirst = pageIndex <= 0;
  const atLast = pageIndex >= pageCount - 1;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 sm:text-right">
        صفحه {formatExactNumberText(pageIndex + 1)} از {formatExactNumberText(pageCount)}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Button type="button" variant="secondary" size="sm" disabled={atFirst} onClick={onFirst} leftIcon={<i className="fa-solid fa-angles-right" aria-hidden="true" />}>اول</Button>
        <Button type="button" variant="secondary" size="sm" disabled={atFirst} onClick={onPrevious} leftIcon={<i className="fa-solid fa-chevron-right" aria-hidden="true" />}>قبلی</Button>
        <Button type="button" variant="secondary" size="sm" disabled={atLast} onClick={onNext} rightIcon={<i className="fa-solid fa-chevron-left" aria-hidden="true" />}>بعدی</Button>
        <Button type="button" variant="secondary" size="sm" disabled={atLast} onClick={onLast} rightIcon={<i className="fa-solid fa-angles-left" aria-hidden="true" />}>آخر</Button>
      </div>
    </div>
  );
}

function MobileAnalyticsPageSizeSelect({ value, onChange, ariaLabel }: { value: number; onChange: (value: number) => void; ariaLabel: string }) {
  return (
    <div className="w-full min-w-[9rem] sm:w-[9rem] lg:w-[9.5rem]">
      <SelectField
        controlOnly
        size="sm"
        ariaLabel={ariaLabel}
        value={String(value)}
        onValueChange={(nextValue) => onChange(Number(nextValue))}
        options={MOBILE_ANALYTICS_PAGE_SIZE_OPTIONS.map((option) => ({
          value: String(option),
          label: `${formatExactNumberText(option)} ردیف`,
        }))}
      />
    </div>
  );
}

export default function MobileSalesAnalytics() {
  const { registerReportExports } = useReportsExports();
  const exportRef = useRef<() => void>(() => undefined);
  const [fromDate, setFromDate] = useState<Date | null>(() => moment().subtract(30, 'day').toDate());
  const [toDate, setToDate] = useState<Date | null>(() => new Date());
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [data, setData] = useState<AnalyticsPayload>({ summary: emptySummary, cashRows: [], installmentRows: [], realProfitRows: [], risk: { highRiskCount: 0, rows: [] }, partnerCapital: { summary: emptyPartnerCapitalSummary, rows: [] } });
  const [selectedRisk, setSelectedRisk] = useState<InstallmentRow | null>(null);
  const [cashPageSize, setCashPageSize] = useState<number>(20);
  const [cashPageIndex, setCashPageIndex] = useState(0);
  const [installmentPageSize, setInstallmentPageSize] = useState<number>(20);
  const [installmentPageIndex, setInstallmentPageIndex] = useState(0);
  const [realPageSize, setRealPageSize] = useState<number>(20);
  const [realPageIndex, setRealPageIndex] = useState(0);
  const [partnerPageSize, setPartnerPageSize] = useState<number>(20);
  const [partnerPageIndex, setPartnerPageIndex] = useState(0);

  const fetchData = async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setLoadError(null);
    try {
      const qs = new URLSearchParams();
      if (toJ(fromDate)) qs.set('fromDate', toJ(fromDate));
      if (toJ(toDate)) qs.set('toDate', toJ(toDate));
      const res = await apiFetch(`/api/reports/mobile-sales-analytics?${qs.toString()}`);
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت مرکز تحلیل فروش گوشی');
      if (requestId !== requestSequence.current) return;
      setData({
        summary: { ...emptySummary, ...(js?.data?.summary || {}) },
        comparison: js?.data?.comparison || {},
        cashRows: Array.isArray(js?.data?.cashRows) ? js.data.cashRows : [],
        installmentRows: Array.isArray(js?.data?.installmentRows) ? js.data.installmentRows : [],
        realProfitRows: Array.isArray(js?.data?.realProfitRows) ? js.data.realProfitRows : [],
        risk: js?.data?.risk || { highRiskCount: 0, rows: [] },
        partnerCapital: js?.data?.partnerCapital || { summary: emptyPartnerCapitalSummary, rows: [] },
        from: js?.data?.from,
        to: js?.data?.to,
        generatedAt: js?.data?.generatedAt,
        dataSource: js?.data?.dataSource,
        sourceTables: Array.isArray(js?.data?.sourceTables) ? js.data.sourceTables : [],
        dataQuality: js?.data?.dataQuality || {},
      });
    } catch (e: any) {
      if (requestId !== requestSequence.current) return;
      const message = e?.message || 'خطا در دریافت اطلاعات';
      setLoadError(message);
      setData({ summary: emptySummary, cashRows: [], installmentRows: [], realProfitRows: [], risk: { highRiskCount: 0, rows: [] }, partnerCapital: { summary: emptyPartnerCapitalSummary, rows: [] } });
      setNotification({ type: 'error', text: message });
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => { void fetchData(); }, 280);
    return () => window.clearTimeout(t);
  }, [fromDate, toDate]);

  const q = query.trim().toLowerCase();
  const cashRows = useMemo(() => data.cashRows.filter((r) => !q || [r.customerName, r.customerPhone, r.phoneModel, r.imei, r.saleId].some((v) => String(v || '').toLowerCase().includes(q))).slice(0, 250), [data.cashRows, q]);
  const installmentRows = useMemo(() => data.installmentRows.filter((r) => !q || [r.customerName, r.customerPhone, r.phoneModel, r.imei, r.saleId, r.riskLabel, r.riskReasons?.join(' ')].some((v) => String(v || '').toLowerCase().includes(q))).slice(0, 250), [data.installmentRows, q]);
  const riskRows = useMemo(() => (data.risk?.rows || data.installmentRows).filter((r) => !q || [r.customerName, r.customerPhone, r.phoneModel, r.imei, r.riskLabel, r.riskReasons?.join(' ')].some((v) => String(v || '').toLowerCase().includes(q))).slice(0, 100), [data.risk?.rows, data.installmentRows, q]);
  const realRows = useMemo(() => data.realProfitRows.filter((r: any) => !q || [r.customerName, r.customerPhone, r.phoneModel, r.imei, r.saleId, r.riskLabel].some((v) => String(v || '').toLowerCase().includes(q))).slice(0, 120), [data.realProfitRows, q]);
  const partnerRows = useMemo(() => (data.partnerCapital?.rows || []).filter((r) => !q || [r.partnerName, r.partnerSource, r.phones?.map((p) => `${p.phoneModel} ${p.imei}`).join(' ')].some((v) => String(v || '').toLowerCase().includes(q))).slice(0, 120), [data.partnerCapital?.rows, q]);

  const cashPageCount = Math.max(1, Math.ceil(cashRows.length / cashPageSize));
  const cashSafePageIndex = Math.min(cashPageIndex, cashPageCount - 1);
  const cashPageRows = useMemo(
    () => cashRows.slice(cashSafePageIndex * cashPageSize, (cashSafePageIndex + 1) * cashPageSize),
    [cashRows, cashSafePageIndex, cashPageSize],
  );
  const cashVisibleStart = cashRows.length > 0 ? cashSafePageIndex * cashPageSize + 1 : 0;
  const cashVisibleEnd = Math.min(cashRows.length, (cashSafePageIndex + 1) * cashPageSize);

  const installmentPageCount = Math.max(1, Math.ceil(installmentRows.length / installmentPageSize));
  const installmentSafePageIndex = Math.min(installmentPageIndex, installmentPageCount - 1);
  const installmentPageRows = useMemo(
    () => installmentRows.slice(installmentSafePageIndex * installmentPageSize, (installmentSafePageIndex + 1) * installmentPageSize),
    [installmentRows, installmentSafePageIndex, installmentPageSize],
  );
  const installmentVisibleStart = installmentRows.length > 0 ? installmentSafePageIndex * installmentPageSize + 1 : 0;
  const installmentVisibleEnd = Math.min(installmentRows.length, (installmentSafePageIndex + 1) * installmentPageSize);

  const realPageCount = Math.max(1, Math.ceil(realRows.length / realPageSize));
  const realSafePageIndex = Math.min(realPageIndex, realPageCount - 1);
  const realPageRows = useMemo(
    () => realRows.slice(realSafePageIndex * realPageSize, (realSafePageIndex + 1) * realPageSize),
    [realRows, realSafePageIndex, realPageSize],
  );
  const realVisibleStart = realRows.length > 0 ? realSafePageIndex * realPageSize + 1 : 0;
  const realVisibleEnd = Math.min(realRows.length, (realSafePageIndex + 1) * realPageSize);

  const partnerPageCount = Math.max(1, Math.ceil(partnerRows.length / partnerPageSize));
  const partnerSafePageIndex = Math.min(partnerPageIndex, partnerPageCount - 1);
  const partnerPageRows = useMemo(
    () => partnerRows.slice(partnerSafePageIndex * partnerPageSize, (partnerSafePageIndex + 1) * partnerPageSize),
    [partnerRows, partnerSafePageIndex, partnerPageSize],
  );
  const partnerVisibleStart = partnerRows.length > 0 ? partnerSafePageIndex * partnerPageSize + 1 : 0;
  const partnerVisibleEnd = Math.min(partnerRows.length, (partnerSafePageIndex + 1) * partnerPageSize);

  useEffect(() => {
    setCashPageIndex(0);
    setInstallmentPageIndex(0);
    setRealPageIndex(0);
    setPartnerPageIndex(0);
  }, [q, fromDate, toDate]);

  const exportExcel = () => {
    const rows = [
      ...data.cashRows.map((r) => ({
        type: 'نقدی', saleId: r.saleId, date: shamsi(r.saleDate), customer: r.customerName || '', phone: r.customerPhone || '', model: r.phoneModel || '', imei: r.imei || '', sale: r.salePrice, purchase: r.purchasePrice, reference: r.referencePrice, profit: r.profit, realizedProfit: r.profit, unrecognizedProfit: 0, collectionRate: formatReportPercentText(100), outstanding: 0, risk: '', reasons: '', realProfit: r.realProfit,
      })),
      ...data.installmentRows.map((r) => ({
        type: 'اقساطی', saleId: r.saleId, date: shamsi(r.saleDate), customer: r.customerName || '', phone: r.customerPhone || '', model: r.phoneModel || '', imei: r.imei || '', sale: r.contractTotal, purchase: r.purchasePrice, reference: r.referencePrice, profit: r.fullProfit, realizedProfit: r.realizedProfit, unrecognizedProfit: r.unrecognizedProfit, collectionRate: percent(r.collectionRate), outstanding: r.outstandingAmount, risk: r.riskLabel, reasons: (r.riskReasons || []).join(' | '), realProfit: r.realProfit,
      })),
      ...(data.partnerCapital?.rows || []).map((r) => ({
        type: 'سهم شریک', saleId: '', date: '', customer: r.partnerName, phone: '', model: `کل گوشی: ${r.totalPhonesHad}`, imei: '', sale: r.soldCapitalAtCurrentPrice, purchase: r.initialPurchaseCapital, reference: r.soldCapitalAtCurrentPrice, profit: 0, realizedProfit: 0, unrecognizedProfit: 0, collectionRate: '', outstanding: r.remainingCapitalBalance, risk: r.remainingCapitalBalance > 0 ? 'طلبکار' : r.remainingCapitalBalance < 0 ? 'بدهکار' : 'تسویه', reasons: `نقدی: ${r.cashSoldCount} | اقساطی: ${r.installmentSoldCount} | مانده: ${r.remainingCount} | پرداختی: ${r.paidSettlementAmount} | دریافتی: ${r.receivedSettlementAmount}`, realProfit: r.replacementDeltaCapital,
      })),
    ];
    exportToExcel(`mobile-sales-analytics-V6-${moment().format('YYYYMMDD-HHmm')}`, rows, [
      { header: 'نوع فروش', key: 'type' },
      { header: 'شماره سند', key: 'saleId' },
      { header: 'تاریخ', key: 'date' },
      { header: 'مشتری', key: 'customer' },
      { header: 'موبایل', key: 'phone' },
      { header: 'مدل گوشی', key: 'model' },
      { header: 'IMEI', key: 'imei' },
      { header: 'مبلغ فروش/قرارداد', key: 'sale' },
      { header: 'قیمت خرید', key: 'purchase' },
      { header: 'قیمت خرید روز ثبت‌شده', key: 'reference' },
      { header: 'سود کل', key: 'profit' },
      { header: 'سود وصول‌شده', key: 'realizedProfit' },
      { header: 'سود وصول‌نشده', key: 'unrecognizedProfit' },
      { header: 'درصد وصول', key: 'collectionRate' },
      { header: 'مانده وصول', key: 'outstanding' },
      { header: 'ریسک', key: 'risk' },
      { header: 'دلایل ریسک', key: 'reasons' },
      { header: 'سود واقعی با قیمت خرید روز', key: 'realProfit' },
    ], 'تحلیل فروش گوشی');
  };

  exportRef.current = exportExcel;
  useEffect(() => { registerReportExports({ excel: () => exportRef.current() }); return () => registerReportExports({}); }, [registerReportExports]);

  const summary = data.summary || emptySummary;
  const partnerCapitalSummary = data.partnerCapital?.summary || emptyPartnerCapitalSummary;
  const installmentShare = summary.totalSales > 0 ? (summary.installmentSales / summary.totalSales) * 100 : 0;
  const generatedAtLabel = data.generatedAt
    ? new Date(data.generatedAt).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })
    : '—';
  const hasSalesData = summary.totalPhones > 0;
  const renderReferenceValue = (value: number | null | undefined) => value == null ? <MissingReferencePrice /> : money(value);

  return (
    <ModernReportShell
      title="تحلیل فروش گوشی"
      subtitle="فروش نقدی، قراردادهای اقساطی، وصول و بازگشت سرمایه بر پایه اسناد ثبت‌شده فروشگاه"
      icon={<i className="fa-solid fa-mobile-screen-button" />}
    >
    <div className="grid min-w-0 gap-3 sm:gap-4" dir="rtl" data-report-source="sqlite-business-records">
      {notification ? <Notification message={notification} onClose={() => setNotification(null)} /> : null}

      <Surface
        surface="glass"
        variant="bar"
        scheme="adaptive"
        className="rounded-2xl"
        contentClassName="p-4"
        aria-label="وضعیت منبع گزارش"
      >
        <SurfaceHeader
          title="داده زنده از اسناد ثبت‌شده"
          subtitle="فروش، اقساط و وصول مستقیماً از پایگاه داده خوانده می‌شوند؛ داده آزمایشی در این گزارش استفاده نمی‌شود."
          icon={<i className="fa-solid fa-database" aria-hidden="true" />}
          titleAs="h2"
          density="compact"
          actions={(
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5"><i className="fa-regular fa-clock" aria-hidden="true" /> آخرین دریافت: {generatedAtLabel}</span>
              <span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-shield-halved" aria-hidden="true" /> محاسبات قطعی بک‌اند</span>
            </div>
          )}
        />
      </Surface>

      <ReportControlDock
        ariaLabel="کنترل تحلیل یکپارچه فروش گوشی"
        presentation="approved"
        title="کنترل گزارش"
        subtitle="بازه زمانی، جستجو، خروجی و به‌روزرسانی تحلیل فروش گوشی"
        icon={<i className="fa-solid fa-sliders" aria-hidden="true" />}
        footer={(
          <ReportControlFooter
            ariaLabel="عملیات و وضعیت تحلیل فروش گوشی"
            statuses={(
              <>
                <ReportControlStatus tone="neutral" icon={<i className="fa-solid fa-chart-pie" aria-hidden="true" />}>
                  <span>تحلیل یکپارچه فروش گوشی</span>
                </ReportControlStatus>
                <ReportControlStatus tone="info" icon={<i className="fa-regular fa-calendar" aria-hidden="true" />}>
                  <span className="whitespace-nowrap">بازه فعال:</span>
                  <bdi dir="ltr" className="font-black">{toJ(fromDate) || '—'}</bdi>
                  <span aria-hidden="true" className="font-black text-[var(--ds-text-muted)]">|</span>
                  <bdi dir="ltr" className="font-black">{toJ(toDate) || '—'}</bdi>
                </ReportControlStatus>
                <ReportControlStatus tone="neutral" icon={<i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />}>
                  <span>{formatExactNumberText(Number(summary.totalPhones))} گوشی ثبت‌شده</span>
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
                  disabled={loading || summary.totalPhones <= 0}
                  leftIcon={<i className="fa-solid fa-file-excel" aria-hidden="true" />}
                  className="report-control-approved__export-button"
                >
                  خروجی اکسل
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => void fetchData()}
                  disabled={loading || !fromDate || !toDate}
                  loading={loading}
                  loadingText="در حال دریافت…"
                  leftIcon={<i className="fa-solid fa-rotate" aria-hidden="true" />}
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
              includeLast30
              compact
              className="report-control-approved__presets"
              onChange={({ from, to }) => { setFromDate(from); setToDate(to); }}
            />
          )}
          fromField={(
            <ReportFilterField label="از تاریخ" icon={<i className="fa-regular fa-calendar" />} className="report-control-approved__field" minWidthClassName="min-w-0">
              <ShamsiDatePicker selectedDate={fromDate} onDateChange={setFromDate} size="standard" />
            </ReportFilterField>
          )}
          toField={(
            <ReportFilterField label="تا تاریخ" icon={<i className="fa-regular fa-calendar-check" />} className="report-control-approved__field" minWidthClassName="min-w-0">
              <ShamsiDatePicker selectedDate={toDate} onDateChange={(date) => setToDate(date && fromDate && date < fromDate ? fromDate : date)} size="standard" />
            </ReportFilterField>
          )}
        />

        <ReportControlSearch>
          <ReportFilterField label="جستجو" icon={<i className="fa-solid fa-magnifying-glass" />} className="report-control-approved__field" minWidthClassName="min-w-0">
            <AppSearchField
              value={query}
              onChange={setQuery}
              placeholder="مدل، IMEI، مشتری یا شماره سند…"
              ariaLabel="جستجو در تحلیل فروش گوشی"
              size="md"
              clearable
            />
          </ReportFilterField>
        </ReportControlSearch>
      </ReportControlDock>

      <FilterChipsBar
        chips={analyticsTabChips}
        value={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        ariaLabel="بخش‌های تحلیل فروش گوشی"
        className="w-full"
      />

      {loading ? (
        <section className="grid gap-3" aria-label="در حال بارگذاری گزارش">
          <Skeleton className="h-28" rounded="xl" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28" rounded="xl" />)}
          </div>
        </section>
      ) : loadError ? (
        <EmptyState
          title="دریافت گزارش انجام نشد"
          description={`${loadError}؛ هیچ عدد قبلی یا جایگزین در صفحه نمایش داده نشده است.`}
          icon={<i className="fa-solid fa-triangle-exclamation" />}
          tone="warning"
          actionLabel="تلاش دوباره"
          onAction={() => void fetchData()}
        />
      ) : (
        <>
          <KpiDefinitionNote
            title="مبنای محاسبه گزارش"
            description="مبالغ فروش و وصول از اسناد ثبت‌شده خوانده می‌شوند. سود جایگزینی فقط برای گوشی‌هایی نمایش داده می‌شود که قیمت خرید روز آن‌ها واقعاً ثبت شده باشد."
            items={[
              { label: 'سود نقدی', role: 'recognized', description: 'فروش خالص منهای قیمت خرید ثبت‌شده همان گوشی.' },
              { label: 'سود وصول‌شده اقساط', role: 'collection', description: 'سهم سود قرارداد متناسب با مبالغ وصول‌شده.' },
              { label: 'مانده وصول', role: 'audit', description: 'بخش پرداخت‌نشده قراردادهای اقساطی ثبت‌شده.' },
              { label: 'سود جایگزینی', role: 'operational', description: 'فقط با قیمت خرید روز ثبت‌شده؛ بدون جایگزینی یا حدس.' },
            ]}
          />

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="شاخص‌های کلیدی فروش گوشی">
            <PremiumStatCard label="فروش ثبت‌شده" value={money(summary.totalSales)} hint={`${formatExactNumberText(Number(summary.totalPhones))} گوشی در بازه`} icon={<i className="fa-solid fa-receipt" />} />
            <PremiumStatCard label="سود نقدی" value={money(summary.cashProfit)} hint={`${formatExactNumberText(Number(summary.cashCount))} ردیف فروش نقدی`} icon={<i className="fa-solid fa-money-bill-wave" />} tone={summary.cashProfit < 0 ? 'bad' : 'good'} />
            <PremiumStatCard label="وصول اقساط" value={money(summary.installmentReceived)} hint={`${percent(summary.installmentCollectionRate)} از مبلغ قرارداد`} icon={<i className="fa-solid fa-hand-holding-dollar" />} tone="info" />
            <PremiumStatCard label="مانده وصول" value={money(summary.installmentOutstanding)} hint={`${formatExactNumberText(Number(summary.installmentCount))} ردیف اقساطی`} icon={<i className="fa-solid fa-hourglass-half" />} tone={summary.installmentOutstanding > 0 ? 'warn' : 'good'} />
            <PremiumStatCard label="نیازمند پیگیری" value={formatExactNumberText(Number(summary.highRiskCount))} hint="بر اساس سررسید و وصول ثبت‌شده" icon={<i className="fa-solid fa-list-check" />} tone={summary.highRiskCount > 0 ? 'bad' : 'good'} />
          </section>

          {!hasSalesData && activeTab !== 'partners' ? (
            <EmptyState
              title="در این بازه فروش گوشی ثبت نشده است"
              description="بازه زمانی را تغییر دهید. این صفحه فقط اسناد واقعی فروش و اقساط ثبت‌شده در سیستم را نمایش می‌دهد."
              icon={<i className="fa-regular fa-chart-bar" />}
              tone="info"
            />
          ) : null}

          {hasSalesData && activeTab === 'overview' ? (
            <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-3">
              <Surface surface="glass" variant="panel" scheme="adaptive" className="rounded-2xl xl:col-span-2" contentClassName="p-4">
                <SurfaceHeader
                  title="ترکیب فروش و وصول"
                  subtitle="مقایسه مستقیم فروش نقدی و قراردادهای اقساطی ثبت‌شده"
                  icon={<i className="fa-solid fa-chart-pie" aria-hidden="true" />}
                  status={<FinancialStatusBadge label={`${percent(installmentShare)} سهم اقساط`} tone="info" size="xs" />}
                  titleAs="h2"
                  density="compact"
                />
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-2xl" contentClassName="p-4">
                    <SurfaceHeader
                      title="فروش نقدی"
                      icon={<i className="fa-solid fa-money-bill-wave" aria-hidden="true" />}
                      tone="success"
                      titleAs="h3"
                      density="compact"
                    />
                    <dl className="mt-4 grid gap-3">
                      <div className="flex items-center justify-between gap-3 text-xs"><dt className="font-bold text-slate-500 dark:text-slate-400">مبلغ فروش</dt><dd className="m-0 font-black text-slate-950 dark:text-white">{money(summary.cashSales)}</dd></div>
                      <div className="flex items-center justify-between gap-3 text-xs"><dt className="font-bold text-slate-500 dark:text-slate-400">سود ثبت‌شده</dt><dd className="m-0 font-black text-slate-950 dark:text-white">{money(summary.cashProfit)}</dd></div>
                      <div className="flex items-center justify-between gap-3 text-xs"><dt className="font-bold text-slate-500 dark:text-slate-400">تعداد گوشی</dt><dd className="m-0 font-black text-slate-950 dark:text-white">{formatExactNumberText(Number(summary.cashCount))}</dd></div>
                    </dl>
                  </Surface>
                  <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-2xl" contentClassName="p-4">
                    <SurfaceHeader
                      title="فروش اقساطی"
                      icon={<i className="fa-solid fa-file-invoice-dollar" aria-hidden="true" />}
                      tone="info"
                      titleAs="h3"
                      density="compact"
                    />
                    <dl className="mt-4 grid gap-3">
                      <div className="flex items-center justify-between gap-3 text-xs"><dt className="font-bold text-slate-500 dark:text-slate-400">مبلغ قرارداد</dt><dd className="m-0 font-black text-slate-950 dark:text-white">{money(summary.installmentSales)}</dd></div>
                      <div className="flex items-center justify-between gap-3 text-xs"><dt className="font-bold text-slate-500 dark:text-slate-400">مبلغ وصول‌شده</dt><dd className="m-0 font-black text-slate-950 dark:text-white">{money(summary.installmentReceived)}</dd></div>
                      <div className="flex items-center justify-between gap-3 text-xs"><dt className="font-bold text-slate-500 dark:text-slate-400">مانده وصول</dt><dd className="m-0 font-black text-slate-950 dark:text-white">{money(summary.installmentOutstanding)}</dd></div>
                    </dl>
                  </Surface>
                </div>
              </Surface>

              <Surface surface="glass" variant="panel" scheme="adaptive" className="rounded-2xl" contentClassName="p-4">
                <SurfaceHeader
                  title="کیفیت داده و وصول"
                  subtitle="پوشش قیمت خرید روز و وضعیت وصول قراردادها"
                  icon={<i className="fa-solid fa-shield-halved" aria-hidden="true" />}
                  titleAs="h2"
                  density="compact"
                />
                <div className="mt-4 grid gap-4">
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-slate-500 dark:text-slate-400">درصد وصول اقساط</span>
                      <strong className="font-black text-slate-950 dark:text-white">{percent(summary.installmentCollectionRate)}</strong>
                    </div>
                    <FinancialProgressBar value={summary.installmentCollectionRate} showPercent={false} tone="brand" size="xs" ariaLabel="درصد وصول اقساط" />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-slate-500 dark:text-slate-400">پوشش قیمت خرید روز</span>
                      <strong className="font-black text-slate-950 dark:text-white">{percent(summary.referenceCoverageRate)}</strong>
                    </div>
                    <FinancialProgressBar value={summary.referenceCoverageRate} showPercent={false} tone="brand" size="xs" ariaLabel="پوشش قیمت خرید روز" />
                  </div>
                  <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-xl" contentClassName="flex items-start gap-2 p-3 text-xs font-bold leading-7 text-slate-500 dark:text-slate-400">
                    <i className="fa-solid fa-circle-info mt-1 shrink-0" aria-hidden="true" />
                    <span>سود جایگزینی برای {formatExactNumberText(Number(summary.referencePricedCount))} گوشی دارای قیمت خرید روز محاسبه شده است.</span>
                  </Surface>
                </div>
              </Surface>
            </div>
          ) : null}

          {hasSalesData && activeTab === 'cash' ? (
            <DataTableShell
              headerLayout="compact"
              kicker="جدول داده"
              title="فروش‌های نقدی"
              titleIcon={<i className="fa-solid fa-money-bill-wave" aria-hidden="true" />}
              meta={(
                <>
                  <i className="fa-solid fa-list-ol" aria-hidden="true" />
                  <span>نمایش {formatExactNumberText(cashVisibleStart)} تا {formatExactNumberText(cashVisibleEnd)} از {formatExactNumberText(cashRows.length)} ردیف</span>
                </>
              )}
              actions={(
                <MobileAnalyticsPageSizeSelect
                  value={cashPageSize}
                  ariaLabel="تعداد ردیف فروش نقدی در صفحه"
                  onChange={(value) => {
                    setCashPageSize(value);
                    setCashPageIndex(0);
                  }}
                />
              )}
              footer={cashRows.length > 0 ? (
                <MobileAnalyticsPagination
                  pageIndex={cashSafePageIndex}
                  pageCount={cashPageCount}
                  onFirst={() => setCashPageIndex(0)}
                  onPrevious={() => setCashPageIndex((value) => Math.max(0, value - 1))}
                  onNext={() => setCashPageIndex((value) => Math.min(cashPageCount - 1, value + 1))}
                  onLast={() => setCashPageIndex(cashPageCount - 1)}
                />
              ) : undefined}
              aria-label="جدول فروش‌های نقدی تحلیل یکپارچه فروش گوشی"
            >
              {cashPageRows.length === 0 ? (
                <EmptyState title="نتیجه‌ای مطابق جستجو پیدا نشد" description="بازه تاریخ یا عبارت جستجو را تغییر دهید." tone="info" />
              ) : (
                <>
                  <div className="hidden xl:block">
                    <table className="report-table ux-data-table w-full" data-ui-table="true" data-ui-table-layout="managed" data-ui-bidi-scope="rtl-table">
                      <thead>
                        <tr><th>گوشی</th><th>مشتری</th><th>فروش خالص</th><th>تخفیف</th><th>سود فروش</th><th>سود جایگزینی</th></tr>
                      </thead>
                      <tbody>
                        {cashPageRows.map((r) => (
                          <tr key={r.id}>
                            <td><strong className="block font-black text-slate-950 dark:text-white">{r.phoneModel || 'بدون مدل'}</strong><small dir="ltr" className="mt-1 block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{r.imei || '—'} • {shamsi(r.saleDate)}</small></td>
                            <td><strong className="block font-black text-slate-950 dark:text-white">{r.customerName || 'ثبت نشده'}</strong><small className="mt-1 block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{r.customerPhone || '—'}</small></td>
                            <td>{money(r.salePrice)}</td>
                            <td><small className="block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">ردیف: {money(r.itemDiscount)}</small><small className="mt-1 block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">فاکتور: {money(r.invoiceDiscountShare)}</small></td>
                            <td>{signedMoney(r.profit)}</td>
                            <td>{r.referencePriceAvailable ? signedMoney(r.realProfit) : <MissingReferencePrice />}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-3 p-3 sm:p-4 xl:hidden" aria-label="کارت‌های فروش نقدی تحلیل یکپارچه">
                    {cashPageRows.map((r) => (
                      <Surface key={r.id} surface="glass" variant="subtle" scheme="adaptive" className="rounded-[20px]" contentClassName="p-4">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 text-right">
                            <div className="truncate text-sm font-black text-slate-950 dark:text-white" title={r.phoneModel || 'بدون مدل'}>{r.phoneModel || 'بدون مدل'}</div>
                            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              <span>{shamsi(r.saleDate)}</span>
                              <span>سند #{formatExactNumberText(r.saleId)}</span>
                              <span dir="ltr">IMEI: {r.imei || '—'}</span>
                            </div>
                          </div>
                          <i className="fa-solid fa-money-bill-wave shrink-0 text-slate-500" aria-hidden="true" />
                        </div>
                        <div className="mt-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                          {r.customerName || 'ثبت نشده'}{r.customerPhone ? ` • ${r.customerPhone}` : ''}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-right text-xs">
                          <div><span className="block text-slate-500 dark:text-slate-400">فروش خالص</span><strong className="mt-1 block">{money(r.salePrice)}</strong></div>
                          <div><span className="block text-slate-500 dark:text-slate-400">تخفیف ردیف</span><strong className="mt-1 block">{money(r.itemDiscount)}</strong></div>
                          <div><span className="block text-slate-500 dark:text-slate-400">تخفیف فاکتور</span><strong className="mt-1 block">{money(r.invoiceDiscountShare)}</strong></div>
                          <div><span className="block text-slate-500 dark:text-slate-400">سود فروش</span><strong className="mt-1 block">{signedMoney(r.profit)}</strong></div>
                          <div className="col-span-2"><span className="block text-slate-500 dark:text-slate-400">سود جایگزینی</span><strong className="mt-1 block">{r.referencePriceAvailable ? signedMoney(r.realProfit) : <MissingReferencePrice />}</strong></div>
                        </div>
                      </Surface>
                    ))}
                  </div>
                </>
              )}
            </DataTableShell>
          ) : null}

          {hasSalesData && activeTab === 'installment' ? (
            <DataTableShell
              headerLayout="compact"
              kicker="جدول داده"
              title="فروش‌های اقساطی"
              titleIcon={<i className="fa-solid fa-file-contract" aria-hidden="true" />}
              meta={(
                <>
                  <i className="fa-solid fa-list-ol" aria-hidden="true" />
                  <span>نمایش {formatExactNumberText(installmentVisibleStart)} تا {formatExactNumberText(installmentVisibleEnd)} از {formatExactNumberText(installmentRows.length)} ردیف</span>
                </>
              )}
              actions={(
                <MobileAnalyticsPageSizeSelect
                  value={installmentPageSize}
                  ariaLabel="تعداد ردیف فروش اقساطی در صفحه"
                  onChange={(value) => {
                    setInstallmentPageSize(value);
                    setInstallmentPageIndex(0);
                  }}
                />
              )}
              footer={installmentRows.length > 0 ? (
                <MobileAnalyticsPagination
                  pageIndex={installmentSafePageIndex}
                  pageCount={installmentPageCount}
                  onFirst={() => setInstallmentPageIndex(0)}
                  onPrevious={() => setInstallmentPageIndex((value) => Math.max(0, value - 1))}
                  onNext={() => setInstallmentPageIndex((value) => Math.min(installmentPageCount - 1, value + 1))}
                  onLast={() => setInstallmentPageIndex(installmentPageCount - 1)}
                />
              ) : undefined}
              aria-label="جدول فروش‌های اقساطی تحلیل یکپارچه فروش گوشی"
            >
              {installmentPageRows.length === 0 ? (
                <EmptyState title="نتیجه‌ای مطابق جستجو پیدا نشد" description="بازه تاریخ یا عبارت جستجو را تغییر دهید." tone="info" />
              ) : (
                <>
                  <div className="hidden xl:block">
                    <table className="report-table ux-data-table w-full" data-ui-table="true" data-ui-table-layout="managed" data-ui-bidi-scope="rtl-table">
                      <thead>
                        <tr><th>گوشی</th><th>مشتری</th><th>قرارداد</th><th>وصول</th><th>سود</th><th>موعد بعدی</th></tr>
                      </thead>
                      <tbody>
                        {installmentPageRows.map((r) => (
                          <tr key={r.id}>
                            <td><strong className="block font-black text-slate-950 dark:text-white">{r.phoneModel || 'بدون مدل'}</strong><small dir="ltr" className="mt-1 block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{r.imei || '—'} • {shamsi(r.saleDate)}</small></td>
                            <td><strong className="block font-black text-slate-950 dark:text-white">{r.customerName || 'ثبت نشده'}</strong><small className="mt-1 block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{r.customerPhone || '—'}</small></td>
                            <td><strong className="block font-black text-slate-950 dark:text-white">{money(r.contractTotal)}</strong><small className="mt-1 block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">پیش‌پرداخت: {percent(r.downPaymentRate)}</small></td>
                            <td><strong className="block font-black text-slate-950 dark:text-white">{percent(r.collectionRate)}</strong><small className="mt-1 block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">مانده: {money(r.outstandingAmount)}</small></td>
                            <td><small className="block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">کل: {money(r.fullProfit)}</small><small className="mt-1 block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">وصول‌شده: {money(r.realizedProfit)}</small></td>
                            <td><strong className="block font-black text-slate-950 dark:text-white">{r.nextDueDate ? shamsi(r.nextDueDate) : 'بدون موعد باز'}</strong>{r.nextDueAmount > 0 ? <small className="mt-1 block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{money(r.nextDueAmount)}</small> : null}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-3 p-3 sm:p-4 xl:hidden" aria-label="کارت‌های فروش اقساطی تحلیل یکپارچه">
                    {installmentPageRows.map((r) => (
                      <Surface key={r.id} surface="glass" variant="subtle" scheme="adaptive" className="rounded-[20px]" contentClassName="p-4">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 text-right">
                            <div className="truncate text-sm font-black text-slate-950 dark:text-white" title={r.phoneModel || 'بدون مدل'}>{r.phoneModel || 'بدون مدل'}</div>
                            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              <span>{shamsi(r.saleDate)}</span>
                              <span>قرارداد #{formatExactNumberText(r.saleId)}</span>
                              <span dir="ltr">IMEI: {r.imei || '—'}</span>
                            </div>
                          </div>
                          <i className="fa-solid fa-file-contract shrink-0 text-slate-500" aria-hidden="true" />
                        </div>
                        <div className="mt-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                          {r.customerName || 'ثبت نشده'}{r.customerPhone ? ` • ${r.customerPhone}` : ''}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-right text-xs">
                          <div><span className="block text-slate-500 dark:text-slate-400">مبلغ قرارداد</span><strong className="mt-1 block">{money(r.contractTotal)}</strong></div>
                          <div><span className="block text-slate-500 dark:text-slate-400">پیش‌پرداخت</span><strong className="mt-1 block">{percent(r.downPaymentRate)}</strong></div>
                          <div><span className="block text-slate-500 dark:text-slate-400">وصول</span><strong className="mt-1 block">{percent(r.collectionRate)}</strong></div>
                          <div><span className="block text-slate-500 dark:text-slate-400">مانده وصول</span><strong className="mt-1 block">{money(r.outstandingAmount)}</strong></div>
                          <div><span className="block text-slate-500 dark:text-slate-400">سود کل</span><strong className="mt-1 block">{money(r.fullProfit)}</strong></div>
                          <div><span className="block text-slate-500 dark:text-slate-400">سود وصول‌شده</span><strong className="mt-1 block">{money(r.realizedProfit)}</strong></div>
                          <div className="col-span-2"><span className="block text-slate-500 dark:text-slate-400">موعد بعدی</span><strong className="mt-1 block">{r.nextDueDate ? shamsi(r.nextDueDate) : 'بدون موعد باز'}{r.nextDueAmount > 0 ? ` • ${money(r.nextDueAmount)}` : ''}</strong></div>
                        </div>
                      </Surface>
                    ))}
                  </div>
                </>
              )}
            </DataTableShell>
          ) : null}

          {hasSalesData && activeTab === 'risk' ? (
            <Surface
              surface="glass"
              variant="panel"
              scheme="adaptive"
              className="rounded-[24px]"
              contentClassName="p-4 sm:p-5"
              aria-label="صف پیگیری اقساط"
            >
              <SurfaceHeader
                title="صف پیگیری اقساط"
                subtitle="اولویت‌بندی قطعی بر اساس مانده، سررسید، چک و پرداخت‌های ثبت‌شده"
                icon={<i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />}
                status={(
                  <FinancialStatusBadge
                    label={`${formatExactNumberText(Number(summary.highRiskCount))} پرونده مهم`}
                    tone={Number(summary.highRiskCount) > 0 ? 'danger' : 'success'}
                    icon={Number(summary.highRiskCount) > 0 ? 'fa-solid fa-bell' : 'fa-solid fa-circle-check'}
                    size="sm"
                  />
                )}
                kind="section"
                density="comfortable"
                titleAs="h2"
                className="border-b border-[var(--ds-border-subtle)] pb-4"
              />

              <div className="mt-4 grid gap-3">
                {riskRows.length ? riskRows.map((r) => (
                  <Surface
                    key={r.id}
                    surface="glass"
                    variant="subtle"
                    scheme="adaptive"
                    className="rounded-[20px]"
                    contentClassName="p-4"
                    data-ui-card="true"
                    data-ui-card-kind="risk-followup"
                  >
                    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <FinancialStatusBadge
                            label={r.riskLabel || 'نیازمند بررسی'}
                            tone={riskStatusTone(r.riskLevel)}
                            size="xs"
                          />
                          <strong className="min-w-0 truncate text-sm font-black text-[var(--ds-text-primary)]" title={`${r.customerName || 'مشتری ثبت نشده'} — ${r.phoneModel || 'مدل ثبت نشده'}`}>
                            {r.customerName || 'مشتری ثبت نشده'} — {r.phoneModel || 'مدل ثبت نشده'}
                          </strong>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-[var(--ds-text-muted)]">
                          <span dir="ltr">IMEI: {r.imei || '—'}</span>
                          <span>سند #{formatExactNumberText(r.saleId)}</span>
                          <span>{shamsi(r.saleDate)}</span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedRisk(r)}
                        leftIcon={<i className="fa-solid fa-eye" aria-hidden="true" />}
                        className="w-full shrink-0 sm:w-auto"
                      >
                        مشاهده جزئیات
                      </Button>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--ds-border-subtle)] pt-4 lg:grid-cols-4">
                      {[
                        { label: 'مانده', value: money(r.outstandingAmount), icon: 'fa-wallet' },
                        { label: 'وصول', value: percent(r.collectionRate), icon: 'fa-percent' },
                        { label: 'دیرکرد', value: `${formatExactNumberText(Number(r.overdueCount))} قسط`, icon: 'fa-calendar-xmark' },
                        { label: 'امتیاز پیگیری', value: formatExactNumberText(Number(r.riskScore)), icon: 'fa-bullseye' },
                      ].map((metric) => (
                        <div key={metric.label} className="min-w-0">
                          <dt className="flex items-center gap-2 text-[11px] font-bold text-[var(--ds-text-muted)]">
                            <i className={`fa-solid ${metric.icon}`} aria-hidden="true" />
                            <span>{metric.label}</span>
                          </dt>
                          <dd className="mt-1 min-w-0 truncate text-sm font-black tabular-nums text-[var(--ds-text-primary)]" title={String(metric.value)}>{metric.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </Surface>
                )) : (
                  <EmptyState title="پرونده‌ای مطابق جستجو پیدا نشد" description="با فیلترهای فعلی پرونده‌ای برای پیگیری اقساط وجود ندارد." tone="success" />
                )}
              </div>
            </Surface>
          ) : null}

          {hasSalesData && activeTab === 'real' ? (
            <DataTableShell
              headerLayout="compact"
              kicker="جدول داده"
              title="سود جایگزینی با قیمت خرید روز"
              titleIcon={<i className="fa-solid fa-scale-balanced" aria-hidden="true" />}
              meta={(
                <>
                  <i className="fa-solid fa-list-ol" aria-hidden="true" />
                  <span>نمایش {formatExactNumberText(realVisibleStart)} تا {formatExactNumberText(realVisibleEnd)} از {formatExactNumberText(realRows.length)} ردیف</span>
                </>
              )}
              actions={(
                <MobileAnalyticsPageSizeSelect
                  value={realPageSize}
                  ariaLabel="تعداد ردیف سود واقعی در صفحه"
                  onChange={(value) => {
                    setRealPageSize(value);
                    setRealPageIndex(0);
                  }}
                />
              )}
              footer={realRows.length > 0 ? (
                <MobileAnalyticsPagination
                  pageIndex={realSafePageIndex}
                  pageCount={realPageCount}
                  onFirst={() => setRealPageIndex(0)}
                  onPrevious={() => setRealPageIndex((value) => Math.max(0, value - 1))}
                  onNext={() => setRealPageIndex((value) => Math.min(realPageCount - 1, value + 1))}
                  onLast={() => setRealPageIndex(realPageCount - 1)}
                />
              ) : undefined}
              aria-label="جدول سود جایگزینی تحلیل یکپارچه فروش گوشی"
            >
              {realPageRows.length === 0 ? (
                <EmptyState title="قیمت خرید روز برای فروش‌های این بازه ثبت نشده است" description="تا زمان ثبت قیمت خرید روز، سیستم سود جایگزینی را حدس نمی‌زند و عددی نمایش نمی‌دهد." tone="warning" />
              ) : (
                <>
                  <div className="hidden xl:block">
                    <table className="report-table ux-data-table w-full" data-ui-table="true" data-ui-table-layout="managed" data-ui-bidi-scope="rtl-table">
                      <thead>
                        <tr><th>گوشی</th><th>نوع فروش</th><th>فروش / قرارداد</th><th>خرید اولیه</th><th>خرید روز ثبت‌شده</th><th>تغییر بهای جایگزینی</th><th>سود جایگزینی</th></tr>
                      </thead>
                      <tbody>
                        {realPageRows.map((r: any) => (
                          <tr key={r.id}>
                            <td><strong className="block font-black text-slate-950 dark:text-white">{r.phoneModel || 'بدون مدل'}</strong><small dir="ltr" className="mt-1 block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{r.imei || '—'}</small></td>
                            <td><FinancialStatusBadge label={r.saleTypeLabel || (r.saleType === 'installment' ? 'اقساطی' : 'نقدی')} tone={r.saleType === 'installment' ? 'info' : 'success'} size="xs" /></td>
                            <td>{money(r.salePrice ?? r.contractTotal)}</td>
                            <td>{money(r.purchasePrice)}</td>
                            <td>{renderReferenceValue(r.referencePrice)}</td>
                            <td>{signedMoney(r.replacementDelta)}</td>
                            <td>{signedMoney(r.realProfit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-3 p-3 sm:p-4 xl:hidden" aria-label="کارت‌های سود جایگزینی تحلیل یکپارچه">
                    {realPageRows.map((r: any) => (
                      <Surface key={r.id} surface="glass" variant="subtle" scheme="adaptive" className="rounded-[20px]" contentClassName="p-4">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 text-right">
                            <div className="truncate text-sm font-black text-slate-950 dark:text-white" title={r.phoneModel || 'بدون مدل'}>{r.phoneModel || 'بدون مدل'}</div>
                            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              <span>{r.saleTypeLabel || (r.saleType === 'installment' ? 'اقساطی' : 'نقدی')}</span>
                              <span>سند #{formatExactNumberText(r.saleId)}</span>
                              <span dir="ltr">IMEI: {r.imei || '—'}</span>
                            </div>
                          </div>
                          <i className="fa-solid fa-scale-balanced shrink-0 text-slate-500" aria-hidden="true" />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-right text-xs">
                          <div><span className="block text-slate-500 dark:text-slate-400">فروش / قرارداد</span><strong className="mt-1 block">{money(r.salePrice ?? r.contractTotal)}</strong></div>
                          <div><span className="block text-slate-500 dark:text-slate-400">خرید اولیه</span><strong className="mt-1 block">{money(r.purchasePrice)}</strong></div>
                          <div><span className="block text-slate-500 dark:text-slate-400">خرید روز ثبت‌شده</span><strong className="mt-1 block">{renderReferenceValue(r.referencePrice)}</strong></div>
                          <div><span className="block text-slate-500 dark:text-slate-400">تغییر بهای جایگزینی</span><strong className="mt-1 block">{signedMoney(r.replacementDelta)}</strong></div>
                          <div className="col-span-2"><span className="block text-slate-500 dark:text-slate-400">سود جایگزینی</span><strong className="mt-1 block">{signedMoney(r.realProfit)}</strong></div>
                        </div>
                      </Surface>
                    ))}
                  </div>
                </>
              )}
            </DataTableShell>
          ) : null}

          {activeTab === 'partners' ? (
            <section className="grid min-w-0 gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <PremiumStatCard label="همکاران دارای سرمایه" value={formatExactNumberText(Number(partnerCapitalSummary.partnersCount))} hint="بر اساس مالکیت ثبت‌شده" icon={<i className="fa-solid fa-users" />} />
                <PremiumStatCard label="گوشی‌های همکاران" value={formatExactNumberText(Number(partnerCapitalSummary.totalPhonesHad))} hint="فروخته‌شده و موجود" icon={<i className="fa-solid fa-mobile-screen" />} tone="info" />
                <PremiumStatCard label="سرمایه موجود در انبار" value={money(partnerCapitalSummary.totalInventoryCapitalAtCurrentPrice)} hint={`${formatExactNumberText(Number(partnerCapitalSummary.totalRemainingCount))} گوشی مانده`} icon={<i className="fa-solid fa-boxes-stacked" />} />
                <PremiumStatCard label="اصل سرمایه فروخته‌شده" value={money(partnerCapitalSummary.totalSoldCapitalAtCurrentPrice)} hint="هر گوشی دقیقاً یک‌بار" icon={<i className="fa-solid fa-sack-dollar" />} />
                <PremiumStatCard label="مانده بازگشت سرمایه" value={money(partnerCapitalSummary.totalRemainingCapitalBalance)} hint="پس از پرداخت و دریافت" icon={<i className="fa-solid fa-scale-balanced" />} tone={partnerCapitalSummary.totalRemainingCapitalBalance > 0 ? 'warn' : 'neutral'} />
              </div>

              <DataTableShell
                headerLayout="compact"
                kicker="جدول داده"
                title="بازگشت سرمایه همکاران"
                titleIcon={<i className="fa-solid fa-people-group" aria-hidden="true" />}
                meta={(
                  <>
                    <i className="fa-solid fa-list-ol" aria-hidden="true" />
                    <span>نمایش {formatExactNumberText(partnerVisibleStart)} تا {formatExactNumberText(partnerVisibleEnd)} از {formatExactNumberText(partnerRows.length)} همکار</span>
                  </>
                )}
                actions={(
                  <MobileAnalyticsPageSizeSelect
                    value={partnerPageSize}
                    ariaLabel="تعداد همکاران در صفحه"
                    onChange={(value) => {
                      setPartnerPageSize(value);
                      setPartnerPageIndex(0);
                    }}
                  />
                )}
                footer={partnerRows.length > 0 ? (
                  <MobileAnalyticsPagination
                    pageIndex={partnerSafePageIndex}
                    pageCount={partnerPageCount}
                    onFirst={() => setPartnerPageIndex(0)}
                    onPrevious={() => setPartnerPageIndex((value) => Math.max(0, value - 1))}
                    onNext={() => setPartnerPageIndex((value) => Math.min(partnerPageCount - 1, value + 1))}
                    onLast={() => setPartnerPageIndex(partnerPageCount - 1)}
                  />
                ) : undefined}
                aria-label="جدول بازگشت سرمایه همکاران تحلیل یکپارچه فروش گوشی"
              >
                {partnerPageRows.length === 0 ? (
                  <EmptyState title="سرمایه‌ای برای همکاران ثبت نشده است" description="این بخش فقط از مالکیت گوشی و اسناد تسویه ثبت‌شده استفاده می‌کند." tone="info" />
                ) : (
                  <>
                    <div className="hidden xl:block">
                      <table className="report-table ux-data-table w-full" data-ui-table="true" data-ui-table-layout="managed" data-ui-bidi-scope="rtl-table">
                        <thead>
                          <tr><th>همکار</th><th>کل گوشی</th><th>نقدی</th><th>اقساطی</th><th>سایر سوابق فروش</th><th>مانده انبار</th><th>اصل سرمایه فروخته‌شده</th><th>پرداخت / دریافت</th><th>مانده سرمایه</th></tr>
                        </thead>
                        <tbody>
                          {partnerPageRows.map((r) => (
                            <tr key={r.storePartnerId}>
                              <td><strong className="block font-black text-slate-950 dark:text-white">{r.partnerName}</strong><small className="mt-1 block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{r.partnerSource === 'legacy_supplier' ? 'تأمین‌کننده ثبت‌شده' : 'شریک فروشگاه'}</small></td>
                              <td>{formatExactNumberText(Number(r.totalPhonesHad))}</td>
                              <td><strong className="block font-black text-slate-950 dark:text-white">{formatExactNumberText(Number(r.cashSoldCount))}</strong><small className="mt-1 block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{money(r.cashSoldCapitalAtCurrentPrice)}</small></td>
                              <td><strong className="block font-black text-slate-950 dark:text-white">{formatExactNumberText(Number(r.installmentSoldCount))}</strong><small className="mt-1 block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{money(r.installmentSoldCapitalAtCurrentPrice)}</small></td>
                              <td>{formatExactNumberText(Math.max(0, Number(r.soldCount) - Number(r.cashSoldCount) - Number(r.installmentSoldCount)))}</td>
                              <td><strong className="block font-black text-slate-950 dark:text-white">{formatExactNumberText(Number(r.remainingCount))}</strong><small className="mt-1 block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{money(r.inventoryCapitalAtCurrentPrice)}</small></td>
                              <td>{money(r.soldCapitalAtCurrentPrice)}</td>
                              <td><small className="block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">پرداخت: {money(r.paidSettlementAmount)}</small><small className="mt-1 block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">دریافت: {money(r.receivedSettlementAmount)}</small></td>
                              <td>{signedMoney(r.remainingCapitalBalance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:hidden" aria-label="کارت‌های سرمایه همکاران تحلیل یکپارچه">
                      {partnerPageRows.map((r) => (
                        <Surface key={r.storePartnerId} surface="glass" variant="subtle" scheme="adaptive" className="rounded-[20px]" contentClassName="p-4">
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 text-right">
                              <div className="truncate text-sm font-black text-slate-950 dark:text-white" title={r.partnerName}>{r.partnerName}</div>
                              <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">{r.partnerSource === 'legacy_supplier' ? 'تأمین‌کننده ثبت‌شده' : 'شریک فروشگاه'}</div>
                            </div>
                            <i className="fa-solid fa-people-group shrink-0 text-slate-500" aria-hidden="true" />
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-3 text-right text-xs">
                            <div><span className="block text-slate-500 dark:text-slate-400">کل گوشی</span><strong className="mt-1 block">{formatExactNumberText(Number(r.totalPhonesHad))}</strong></div>
                            <div><span className="block text-slate-500 dark:text-slate-400">مانده انبار</span><strong className="mt-1 block">{formatExactNumberText(Number(r.remainingCount))} • {money(r.inventoryCapitalAtCurrentPrice)}</strong></div>
                            <div><span className="block text-slate-500 dark:text-slate-400">فروش نقدی</span><strong className="mt-1 block">{formatExactNumberText(Number(r.cashSoldCount))} • {money(r.cashSoldCapitalAtCurrentPrice)}</strong></div>
                            <div><span className="block text-slate-500 dark:text-slate-400">فروش اقساطی</span><strong className="mt-1 block">{formatExactNumberText(Number(r.installmentSoldCount))} • {money(r.installmentSoldCapitalAtCurrentPrice)}</strong></div>
                            <div className="col-span-2"><span className="block text-slate-500 dark:text-slate-400">اصل سرمایه فروخته‌شده</span><strong className="mt-1 block">{money(r.soldCapitalAtCurrentPrice)}</strong></div>
                            <div><span className="block text-slate-500 dark:text-slate-400">پرداخت به همکار</span><strong className="mt-1 block">{money(r.paidSettlementAmount)}</strong></div>
                            <div><span className="block text-slate-500 dark:text-slate-400">دریافت از همکار</span><strong className="mt-1 block">{money(r.receivedSettlementAmount)}</strong></div>
                            <div className="col-span-2"><span className="block text-slate-500 dark:text-slate-400">مانده سرمایه</span><strong className="mt-1 block">{signedMoney(r.remainingCapitalBalance)}</strong></div>
                          </div>
                        </Surface>
                      ))}
                    </div>
                  </>
                )}
              </DataTableShell>
              <KpiDefinitionNote title="مبنای سرمایه همکاران" items={[
                'این تب مستقل از بازه زمانی فروش بالای صفحه است و کل سابقه مالکیت و تسویه ثبت‌شده را نشان می‌دهد.',
                'اصل سرمایه هر گوشی فقط یک‌بار و بر اساس مالکیت ثبت‌شده همان گوشی محاسبه می‌شود.',
              ]} />
            </section>
          ) : null}
        </>
      )}

      <DialogShell
        isOpen={Boolean(selectedRisk)}
        onClose={() => setSelectedRisk(null)}
        layer="drawer"
        surface="glass"
        surfaceVariant="panel"
        surfaceScheme="adaptive"
        ariaLabelledBy="msa-risk-title"
        backdropDataId="mobile-sales-risk"
        panelDataId="mobile-sales-risk-panel"
        overlayClassName="!items-stretch !justify-end !p-0 sm:!p-3"
        panelClassName="!h-dvh !max-h-dvh !w-full !overflow-y-auto !overscroll-contain sm:!h-auto sm:!max-h-[calc(100dvh-1.5rem)] sm:!max-w-xl sm:!rounded-[26px]"
      >
        {selectedRisk ? (
          <div className="min-w-0 p-4 sm:p-5">
            <SurfaceHeader
              title="جزئیات پیگیری فروش"
              subtitle={`${selectedRisk.customerName || 'مشتری ثبت نشده'} — ${selectedRisk.phoneModel || 'مدل ثبت نشده'}`}
              icon={<i className="fa-solid fa-file-circle-exclamation" aria-hidden="true" />}
              status={<FinancialStatusBadge label={selectedRisk.riskLabel || 'نیازمند بررسی'} tone={riskStatusTone(selectedRisk.riskLevel)} size="xs" />}
              actions={(
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="بستن جزئیات پیگیری"
                  tooltip="بستن"
                  onClick={() => setSelectedRisk(null)}
                  autoIcon={false}
                >
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </Button>
              )}
              kind="section"
              density="comfortable"
              titleAs="h3"
              className="border-b border-[var(--ds-border-subtle)] pb-4"
            />

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PremiumStatCard label="مانده وصول" value={money(selectedRisk.outstandingAmount)} icon={<i className="fa-solid fa-wallet" />} tone="bad" />
              <PremiumStatCard label="درصد وصول" value={percent(selectedRisk.collectionRate)} icon={<i className="fa-solid fa-percent" />} tone="info" />
              <PremiumStatCard label="سود وصول‌شده" value={money(selectedRisk.realizedProfit)} icon={<i className="fa-solid fa-circle-check" />} tone="good" />
              <PremiumStatCard label="سود وصول‌نشده" value={money(selectedRisk.unrecognizedProfit)} icon={<i className="fa-solid fa-hourglass-half" />} tone="warn" />
            </div>

            <Surface surface="glass" variant="subtle" scheme="adaptive" className="mt-4 rounded-[20px]" contentClassName="p-4">
              <div className="flex items-center gap-2 text-sm font-black text-[var(--ds-text-primary)]">
                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                <h4 className="m-0">دلایل اولویت پیگیری</h4>
              </div>
              {selectedRisk.riskReasons.length ? (
                <ul className="mt-3 grid gap-2 p-0 text-xs font-bold leading-7 text-[var(--ds-text-secondary)]">
                  {selectedRisk.riskReasons.map((reason, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <i className="fa-solid fa-circle mt-2 text-[5px] shrink-0" aria-hidden="true" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs font-bold text-[var(--ds-text-muted)]">دلیل تکمیلی برای این پرونده ثبت نشده است.</p>
              )}
            </Surface>

            <Surface surface="glass" variant="subtle" scheme="adaptive" className="mt-4 rounded-[20px]" contentClassName="p-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                {[
                  { label: 'شماره سند', value: formatExactNumberText(selectedRisk.saleId), icon: 'fa-receipt' },
                  { label: 'تاریخ فروش', value: shamsi(selectedRisk.saleDate), icon: 'fa-calendar-day' },
                  { label: 'پیش‌پرداخت', value: money(selectedRisk.downPayment), icon: 'fa-money-bill-wave' },
                  { label: 'اقساط عقب‌افتاده', value: formatExactNumberText(Number(selectedRisk.overdueCount)), icon: 'fa-calendar-xmark' },
                  { label: 'موعد بعدی', value: selectedRisk.nextDueDate ? shamsi(selectedRisk.nextDueDate) : '—', icon: 'fa-calendar-check' },
                  { label: 'مبلغ موعد بعدی', value: money(selectedRisk.nextDueAmount), icon: 'fa-hand-holding-dollar' },
                ].map((detail) => (
                  <div key={detail.label} className="min-w-0 border-b border-[var(--ds-border-subtle)] pb-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
                    <dt className="flex items-center gap-2 text-[11px] font-bold text-[var(--ds-text-muted)]">
                      <i className={`fa-solid ${detail.icon}`} aria-hidden="true" />
                      <span>{detail.label}</span>
                    </dt>
                    <dd className="mt-1 min-w-0 break-words text-sm font-black tabular-nums text-[var(--ds-text-primary)]">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </Surface>
          </div>
        ) : null}
      </DialogShell>
    </div>
    </ModernReportShell>
  );
}
