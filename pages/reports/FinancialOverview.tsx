import { formatExactNumberText, formatReadablePercentText } from '../../utils/exactNumber';
import { ActionLink, Button, IconGlyph, PanelCard, SelectField } from '@/components/ui';
import { apiFetch } from "../../utils/apiFetch";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { reportNavigationAnchor, useReportDrilldownNavigation } from '../../hooks/useReportDrilldownNavigation';
import moment from 'jalali-moment';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import ReportFilterField from '../../components/reports/ReportFilterField';
import ReportControlDock, {
  ReportControlDateSection,
  ReportControlFooter,
  ReportControlStatus,
} from '../../components/reports/ReportControlDock';
import Notification from '../../components/Notification';
import { Dialog as Modal } from '@/components/ui';
import PriceInput from '../../components/PriceInput';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useReportsExports } from '../../contexts/ReportsExportsContext';
import { getAuthHeaders } from '../../utils/apiUtils';
import { exportToExcel } from '../../utils/exporters';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';
import { FinancialOverviewData, NotificationMessage } from '../../types';
import { formatReportMoneyText, formatReportPercentText } from '../../utils/reportPresentation';
import ProfitCollectionRateBadge, { ProfitCollectionRateDetails } from '../../components/ProfitCollectionRateBadge';
import FinancialStatusBadge from '../../components/FinancialStatusBadge';
import {
  buildManagerProfitDetailsHref,
  getCollectedInstallmentProfit,
  getInstallmentUncollectedProfit,
  getManagerProfitCollectionRate,
  getUncollectedManagerProfit,
  normalizeManagerProfitBuckets,
  type ManagerProfitBucket,
  type ManagerProfitBuckets,
} from '../../utils/managerProfit';

type FinancialOverviewExtras = FinancialOverviewData & {
  profit: FinancialOverviewData['profit'] & {
    realizedProfit?: number;
    realizedRevenue?: number;
    realizedCost?: number;
    unrecognizedProfit?: number;
    collectionRate?: number;
    managementBuckets?: {
      accessories: ManagerProfitBucket;
      cashPhone: ManagerProfitBucket;
      installmentPhone: ManagerProfitBucket;
      credit: ManagerProfitBucket;
    };
    recognitionAudit?: Record<string, unknown> | null;
  };
  workingCapital: FinancialOverviewData['workingCapital'] & {
    audit?: { receivablesSource?: string; payablesSource?: string; debtorsCount?: number; creditorsCount?: number; generatedAt?: string } | null;
  };
  expensesSummary?: {
    total: number;
    byCategory: { category: string; total: number }[];
  };
  totalExpenses?: number;
  realProfit?: number;
};

const money = (n: number | undefined | null) => formatReportMoneyText(n ?? 0);
const percent = (n: number | undefined | null) => formatReportPercentText(n ?? 0);
const toShamsiStr = (d: Date) => moment(d).locale('en').format('jYYYY/jMM/jDD');
const formatDateFa = (value?: string | null, withTime = false) => {
  if (!value) return '—';
  const raw = String(value).trim();
  if (/^\d{4}\/\d{2}\/\d{2}/.test(raw)) return raw;
  return withTime
    ? formatIsoToShamsiDateTime(raw, 'jYYYY/jMM/jDD HH:mm')
    : formatIsoToShamsiDateTime(raw, 'jYYYY/jMM/jDD');
};

const normalizeFinancialData = (raw: any): FinancialOverviewExtras => ({
  range: {
    from: raw?.range?.from ?? '',
    to: raw?.range?.to ?? '',
    fromISO: raw?.range?.fromISO ?? '',
    toISO: raw?.range?.toISO ?? '',
  },
  sales: {
    ordersCount: Number(raw?.sales?.ordersCount ?? 0),
    subtotal: Number(raw?.sales?.subtotal ?? 0),
    discounts: Number(raw?.sales?.discounts ?? 0),
    netSalesBeforeTax: Number(raw?.sales?.netSalesBeforeTax ?? 0),
    taxAmount: Number(raw?.sales?.taxAmount ?? 0),
    totalSales: Number(raw?.sales?.totalSales ?? 0),
    refundsTotal: Number(raw?.sales?.refundsTotal ?? 0),
    productSalesTotal: Number(raw?.sales?.productSalesTotal ?? 0),
  },
  profit: {
    grossProfit: Number(raw?.profit?.grossProfit ?? 0),
    cogs: Number(raw?.profit?.cogs ?? 0),
    realizedProfit: Number(raw?.profit?.realizedProfit ?? 0),
    realizedRevenue: Number(raw?.profit?.realizedRevenue ?? 0),
    realizedCost: Number(raw?.profit?.realizedCost ?? 0),
    unrecognizedProfit: Number(raw?.profit?.unrecognizedProfit ?? 0),
    collectionRate: Number(raw?.profit?.collectionRate ?? 0),
    managementBuckets: normalizeManagerProfitBuckets(raw?.profit?.managementBuckets),
    recognitionAudit: raw?.profit?.recognitionAudit ?? null,
  },
  repairs: {
    count: Number(raw?.repairs?.count ?? 0),
    revenue: Number(raw?.repairs?.revenue ?? 0),
    partsCost: Number(raw?.repairs?.partsCost ?? 0),
    laborFee: Number(raw?.repairs?.laborFee ?? 0),
    costs: Number(raw?.repairs?.costs ?? 0),
    profit: Number(raw?.repairs?.profit ?? 0),
  },
  purchases: { total: Number(raw?.purchases?.total ?? 0) },
  workingCapital: {
    receivables: Number(raw?.workingCapital?.receivables ?? 0),
    payables: Number(raw?.workingCapital?.payables ?? 0),
    audit: raw?.workingCapital?.audit ?? null,
  },
  inventory: { inventoryValue: Number(raw?.inventory?.inventoryValue ?? 0) },
  top: {
    debtors: Array.isArray(raw?.top?.debtors) ? raw.top.debtors : [],
    creditors: Array.isArray(raw?.top?.creditors) ? raw.top.creditors : [],
  },
  expensesSummary: raw?.expensesSummary
    ? {
        total: Number(raw?.expensesSummary?.total ?? 0),
        byCategory: Array.isArray(raw?.expensesSummary?.byCategory) ? raw.expensesSummary.byCategory : [],
      }
    : undefined,
  totalExpenses: raw?.totalExpenses != null ? Number(raw.totalExpenses) : undefined,
  realProfit: raw?.realProfit != null ? Number(raw.realProfit) : undefined,
});

const iconClass = (name: string) => `fa-solid ${name}`;

const iconButtonClass =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary/25 hover:bg-primary/5 hover:text-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-primary/10';

const pillButtonClass =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border px-3.5 py-2.5 text-sm font-semibold transition';

export type FinancialScheduleDialogProps = {
  open: boolean;
  onClose: () => void;
  scheduleType: 'daily' | 'weekly' | 'monthly';
  setScheduleType: React.Dispatch<React.SetStateAction<'daily' | 'weekly' | 'monthly'>>;
  scheduleTime: string;
  setScheduleTime: React.Dispatch<React.SetStateAction<string>>;
  scheduleWeekdays: number[];
  setScheduleWeekdays: React.Dispatch<React.SetStateAction<number[]>>;
  scheduleMonthDay: number;
  setScheduleMonthDay: React.Dispatch<React.SetStateAction<number>>;
  scheduleSummaryFa: string;
  cronExpression: string;
  scheduleCreating: boolean;
  onCreate: () => void | Promise<void>;
};

export const FinancialScheduleDialog: React.FC<FinancialScheduleDialogProps> = ({
  open,
  onClose,
  scheduleType,
  setScheduleType,
  scheduleTime,
  setScheduleTime,
  scheduleWeekdays,
  setScheduleWeekdays,
  scheduleMonthDay,
  setScheduleMonthDay,
  scheduleSummaryFa,
  cronExpression,
  scheduleCreating,
  onCreate,
}) => {
  if (!open) return null;

  return (
    <Modal title="زمان‌بندی ارسال گزارش به تلگرام" onClose={onClose} widthClass="max-w-2xl">
      <div className="space-y-4 text-sm">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          زمان‌بندی را انتخاب کنید. cron به‌صورت خودکار ساخته می‌شود.
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">تکرار</label>
            <div className="relative">
              <i className={`${iconClass('fa-repeat')} ux-input-affix-icon ux-input-affix-icon--left`} />
              <SelectField
                controlOnly
                unstyled
                showChevron={false}
                value={scheduleType}
                onChange={(event) => setScheduleType(event.target.value as 'daily' | 'weekly' | 'monthly')}
                className="ux-input-affix-target--left ux-input-affix-target--wide w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 pr-3 outline-none dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="daily">روزانه</option>
                <option value="weekly">هفتگی</option>
                <option value="monthly">ماهانه</option>
              </SelectField>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">ساعت</label>
            <div className="relative">
              <i className={`${iconClass('fa-clock')} ux-input-affix-icon ux-input-affix-icon--left`} />
              <input
                type="time"
                value={scheduleTime}
                onChange={(event) => setScheduleTime(event.target.value)}
                className="ux-input-affix-target--left ux-input-affix-target--wide w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 pr-3 text-center font-mono outline-none dark:border-slate-700 dark:bg-slate-950"
                dir="ltr"
              />
            </div>
          </div>

          {scheduleType === 'weekly' ? (
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">روزهای هفته</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
                {[
                  { v: 6, t: 'شنبه' },
                  { v: 0, t: 'یکشنبه' },
                  { v: 1, t: 'دوشنبه' },
                  { v: 2, t: 'سه‌شنبه' },
                  { v: 3, t: 'چهارشنبه' },
                  { v: 4, t: 'پنجشنبه' },
                  { v: 5, t: 'جمعه' },
                ].map((day) => {
                  const active = scheduleWeekdays.includes(day.v);
                  return (
                    <button
                      type="button"
                      key={day.v}
                      onClick={() => setScheduleWeekdays((previous) => previous.includes(day.v) ? previous.filter((value) => value !== day.v) : [...previous, day.v])}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                        active
                          ? 'border-primary bg-primary text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-primary/25 hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
                      }`}
                    >
                      <i className={iconClass(active ? 'fa-check' : 'fa-calendar-day')} />
                      {day.t}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {scheduleType === 'monthly' ? (
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">روز ماه</label>
              <PriceInput
                name="scheduleMonthDay"
                value={String(scheduleMonthDay)}
                onChange={(event) => setScheduleMonthDay(Math.max(1, Math.min(31, Number(event.target.value || 1))))}
                className="w-full text-left"
                topLabel="روز"
                suffix="ماه"
                preview="مثلاً ۱۵"
              />
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
          <div className="font-bold">خلاصه: {scheduleSummaryFa}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            cronExpr: <span className="font-mono">{cronExpression}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" className={iconButtonClass} onClick={onClose}>
            <i className={iconClass('fa-xmark')} />
            انصراف
          </button>
          <button
            type="button"
            onClick={() => void onCreate()}
            disabled={scheduleCreating}
            className={`${pillButtonClass} border-primary/20 bg-primary text-white shadow-sm hover:brightness-110 disabled:opacity-50`}
          >
            <i className={iconClass(scheduleCreating ? 'fa-spinner fa-spin' : 'fa-paper-plane')} />
            ثبت اطلاعات زمان‌بندی
          </button>
        </div>
      </div>
    </Modal>
  );
};

const categoryName = (c: string) =>
  c === 'rent' ? 'اجاره' : c === 'salary' ? 'حقوق' : c === 'inventory' ? 'خرید کالا' : 'هزینه‌های جانبی';


const ExpensePie = ({ rows, total }: { rows: { category: string; total: number }[]; total: number }) => {
  const radius = 38;
  const cx = 48;
  const cy = 48;
  let startAngle = -Math.PI / 2;
  const sortedRows = [...(rows || [])].filter((r) => Number(r.total || 0) > 0).sort((a, b) => Number(b.total || 0) - Number(a.total || 0));

  const palette = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#64748b'];
  const arcs = sortedRows.map((r, i) => {
    const value = Number(r.total || 0);
    const frac = total > 0 ? value / total : 0;
    const endAngle = startAngle + frac * Math.PI * 2;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
    startAngle = endAngle;
    return { d, color: palette[i % palette.length], value };
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[140px_1fr] lg:items-start">
      <div className="mx-auto flex shrink-0 flex-col items-center">
        <svg width="104" height="104" viewBox="0 0 104 104" className="drop-shadow-sm">
          <circle cx={cx} cy={cy} r={radius} fill="#e5e7eb" className="dark:fill-slate-800" />
          {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} opacity={0.96} />)}
          <circle cx={cx} cy={cy} r="22" fill="white" className="dark:fill-slate-950" />
          <text x={cx} y={cy - 2} textAnchor="middle" className="fill-slate-900 dark:fill-slate-100" fontSize="9" fontWeight="700">هزینه‌ها</text>
          <text x={cx} y={cy + 11} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300" fontSize="8">{money(total)}</text>
        </svg>
        <div className="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">تفکیک بر اساس دسته هزینه</div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sortedRows.length ? sortedRows.map((r, idx) => {
          const value = Number(r.total || 0);
          const pct = total > 0 ? (value / total) * 100 : 0;
          const color = palette[idx % palette.length];
          return (
            <div key={r.category} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: color }} />
                  <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{categoryName(r.category)}</span>
                </div>
                <div className="shrink-0 text-left">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100">{money(value)}</div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{formatReadablePercentText(pct, 2)}</div>
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                <div className="h-full rounded-full" style={{ width: `${Math.max(4, pct)}%`, background: color }} />
              </div>
            </div>
          );
        }) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:col-span-2">
            هزینه‌ای در این بازه ثبت نشده است.
          </div>
        )}
      </div>
    </div>
  );
};

const FinancialOverviewPage: React.FC = () => {
  const confirmAction = useConfirm();
  const { registerReportExports } = useReportsExports();
  const exportExcelRef = useRef<() => void>(() => {});
  const { token } = useAuth();

  const [fromDate, setFromDate] = useState<Date | null>(() => {
    const m = moment();
    const j = moment(`${m.locale('fa').format('jYYYY/jMM')}/01`, 'jYYYY/jMM/jDD');
    return j.toDate();
  });
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [data, setData] = useState<FinancialOverviewExtras | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleCreating, setScheduleCreating] = useState(false);
  const [scheduleType, setScheduleType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleWeekdays, setScheduleWeekdays] = useState<number[]>([6]);
  const [scheduleMonthDay, setScheduleMonthDay] = useState(1);
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillKpi, setDrillKpi] = useState<'totalSales' | 'productSalesTotal' | 'grossProfit'>('totalSales');
  const [drillRows, setDrillRows] = useState<any[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  const reportUiState = useMemo(() => ({
    fromDate: fromDate?.toISOString() || '',
    toDate: toDate?.toISOString() || '',
    drillOpen,
    drillKpi,
  }), [drillKpi, drillOpen, fromDate, toDate]);

  const restoreReportUiState = useCallback((state: Record<string, unknown>) => {
    if (state.fromDate) setFromDate(new Date(String(state.fromDate)));
    if (state.toDate) setToDate(new Date(String(state.toDate)));
    const restoredKpi = String(state.drillKpi || 'totalSales');
    setDrillKpi((['totalSales', 'productSalesTotal', 'grossProfit'].includes(restoredKpi) ? restoredKpi : 'totalSales') as 'totalSales' | 'productSalesTotal' | 'grossProfit');
    setDrillOpen(Boolean(state.drillOpen));
  }, []);

  const { onDrilldownClick } = useReportDrilldownNavigation({
    reportKey: 'financial-overview',
    uiState: reportUiState,
    restoreUiState: restoreReportUiState,
  });

  const currentRange = useMemo(() => ({
    from: fromDate ? toShamsiStr(fromDate) : '',
    to: toDate ? toShamsiStr(toDate) : '',
  }), [fromDate, toDate]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const buildCronFromUi = useCallback(() => {
    const [hh, mm] = String(scheduleTime || '09:00').split(':');
    const hour = Math.max(0, Math.min(23, Number(hh || 9)));
    const minute = Math.max(0, Math.min(59, Number(mm || 0)));

    if (scheduleType === 'daily') return `${minute} ${hour} * * *`;
    if (scheduleType === 'weekly') {
      const days = (scheduleWeekdays || []).length ? scheduleWeekdays : [6];
      const dow = Array.from(new Set(days)).sort().join(',');
      return `${minute} ${hour} * * ${dow}`;
    }
    const day = Math.max(1, Math.min(31, Number(scheduleMonthDay || 1)));
    return `${minute} ${hour} ${day} * *`;
  }, [scheduleMonthDay, scheduleTime, scheduleType, scheduleWeekdays]);

  const scheduleSummaryFa = useMemo(() => {
    const time = scheduleTime || '09:00';
    if (scheduleType === 'daily') return `روزانه ساعت ${time}`;
    if (scheduleType === 'weekly') {
      const map: Record<number, string> = { 0: 'یکشنبه', 1: 'دوشنبه', 2: 'سه‌شنبه', 3: 'چهارشنبه', 4: 'پنجشنبه', 5: 'جمعه', 6: 'شنبه' };
      const days = (scheduleWeekdays || []).length ? scheduleWeekdays : [6];
      return `هفتگی (${days.map((d) => map[d]).join('، ')}) ساعت ${time}`;
    }
    return `ماهانه (روز ${scheduleMonthDay}) ساعت ${time}`;
  }, [scheduleMonthDay, scheduleTime, scheduleType, scheduleWeekdays]);

  const fetchData = useCallback(
    async (override?: { from?: string; to?: string }) => {
      if (!token) return;

      const from = override?.from ?? currentRange.from;
      const to = override?.to ?? currentRange.to;

      setIsLoading(true);
      setIsRefreshing(true);
      setData(null);
      setNotification(null);
      try {
        const qs = new URLSearchParams();
        if (from) qs.set('from', from);
        if (to) qs.set('to', to);

        const res = await apiFetch(`/api/reports/financial-overview?${qs.toString()}`, { headers: getAuthHeaders(token) });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش');
        setData(normalizeFinancialData(json.data));
      } catch (e: any) {
        setData(null);
        setNotification({ type: 'error', text: e?.message || 'خطا در دریافت گزارش' });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentRange.from, currentRange.to, token]
  );

  const refreshOverview = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!token) return;
    const t = window.setTimeout(() => {
      void refreshOverview();
    }, 250);
    return () => window.clearTimeout(t);
  }, [refreshOverview, token]);

  const openDrilldown = useCallback(
    async (kpi: 'totalSales' | 'productSalesTotal' | 'grossProfit') => {
      try {
        if (!token) return;
        setDrillKpi(kpi);
        setDrillOpen(true);
        setDrillLoading(true);
        const from = currentRange.from;
        const to = currentRange.to;
        const url = `/api/reports/financial-overview/drilldown?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&kpi=${encodeURIComponent(kpi)}`;
        const resp = await apiFetch(url, { headers: getAuthHeaders(token) });
        const j = await resp.json();
        if (j?.success) setDrillRows(Array.isArray(j.data) ? j.data : []);
        else setDrillRows([]);
      } finally {
        setDrillLoading(false);
      }
    },
    [currentRange.from, currentRange.to, token]
  );

  const createSchedule = useCallback(async () => {
    try {
      if (!token) return;
      setScheduleCreating(true);
      const resp = await apiFetch(`/api/reports/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({
          reportKey: 'financial-overview',
          cronExpr: buildCronFromUi(),
          payloadJson: {
            scheduleType,
            scheduleTime,
            scheduleWeekdays,
            scheduleMonthDay,
            range: { from: currentRange.from || null, to: currentRange.to || null },
          },
          channel: 'telegram',
        }),
      });
      const j = await resp.json();
      if (j?.success) {
        setNotification({ type: 'success', text: 'زمان‌بندی ذخیره تغییرات شد.' });
        setScheduleOpen(false);
      } else {
        setNotification({ type: 'error', text: j?.message || 'خطا در زمان‌بندی' });
      }
    } finally {
      setScheduleCreating(false);
    }
  }, [buildCronFromUi, currentRange.from, currentRange.to, scheduleMonthDay, scheduleTime, scheduleType, scheduleWeekdays, token]);

  const exportExcel = useCallback(() => {
    if (!data) return;
    const rows: any[] = [];
    rows.push({ بخش: 'بازه', عنوان: 'از', مقدار: data.range.from || data.range.fromISO || '' });
    rows.push({ بخش: 'بازه', عنوان: 'تا', مقدار: data.range.to || data.range.toISO || '' });
    rows.push({});
    rows.push({ بخش: 'فروش', عنوان: 'تعداد سفارش', مقدار: data.sales.ordersCount });
    rows.push({ بخش: 'فروش', عنوان: 'جمع فروش (با مالیات)', مقدار: data.sales.totalSales });
    rows.push({ بخش: 'فروش', عنوان: 'خالص فروش قبل از مالیات', مقدار: data.sales.netSalesBeforeTax });
    rows.push({ بخش: 'فروش', عنوان: 'تخفیف‌ها', مقدار: data.sales.discounts });
    rows.push({ بخش: 'فروش', عنوان: 'مالیات', مقدار: data.sales.taxAmount });
    rows.push({ بخش: 'فروش', عنوان: 'مرجوعی‌ها', مقدار: data.sales.refundsTotal });
    rows.push({});
    rows.push({ بخش: 'سود', عنوان: 'بهای تمام‌شده', مقدار: data.profit.cogs });
    rows.push({ بخش: 'سود', عنوان: 'سود ناخالص', مقدار: data.profit.grossProfit });
    rows.push({ بخش: 'سود وصول‌شده', عنوان: 'سود تحقق‌یافته', مقدار: data.profit.realizedProfit ?? 0 });
    rows.push({ بخش: 'سود وصول‌شده', عنوان: 'درآمد تحقق‌یافته', مقدار: data.profit.realizedRevenue ?? 0 });
    rows.push({ بخش: 'سود وصول‌شده', عنوان: 'بهای تمام‌شده تحقق‌یافته', مقدار: data.profit.realizedCost ?? 0 });
    rows.push({ بخش: 'سود وصول‌شده', عنوان: 'سود در انتظار وصول', مقدار: data.profit.unrecognizedProfit ?? 0 });
    rows.push({ بخش: 'سود وصول‌شده', عنوان: 'درصد وصول فروش', مقدار: data.profit.collectionRate ?? 0 });
    rows.push({});
    rows.push({ بخش: 'گردش', عنوان: 'خریدها', مقدار: data.purchases.total });
    rows.push({ بخش: 'گردش', عنوان: 'موجودی انبار (ارزش خرید)', مقدار: data.inventory.inventoryValue });
    rows.push({ بخش: 'گردش', عنوان: 'مطالبات مشتریان', مقدار: data.workingCapital.receivables });
    rows.push({ بخش: 'گردش', عنوان: 'بدهی به تامین‌کنندگان', مقدار: data.workingCapital.payables });
    rows.push({});
    rows.push({ بخش: 'Top', عنوان: 'بدهکاران', مقدار: '' });
    (data.top.debtors || []).slice(0, 20).forEach((d: any) => {
      rows.push({ بخش: 'بدهکار', عنوان: d.fullName || d.name, مقدار: d.balance });
    });
    rows.push({});
    rows.push({ بخش: 'Top', عنوان: 'بستانکاران', مقدار: '' });
    (data.top.creditors || []).slice(0, 20).forEach((c: any) => {
      rows.push({ بخش: 'بستانکار', عنوان: c.name, مقدار: c.balance });
    });

    exportToExcel(
      `financial-overview-${new Date().toISOString().slice(0, 10)}.xlsx`,
      rows,
      [
        { header: 'بخش', key: 'بخش' },
        { header: 'عنوان', key: 'عنوان' },
        { header: 'مقدار', key: 'مقدار' },
      ],
      'Overview'
    );
  }, [data]);

  exportExcelRef.current = exportExcel;
  useEffect(() => {
    registerReportExports({ excel: () => exportExcelRef.current() });
    return () => registerReportExports({});
  }, [registerReportExports]);

  const totals = useMemo(() => {
    const expenses = data?.expensesSummary?.total ?? data?.totalExpenses ?? 0;
    const sales = data?.sales.totalSales ?? 0;
    const gross = data?.profit.grossProfit ?? 0;
    const real = data?.realProfit ?? gross - expenses;
    const repairProfit = data?.repairs.profit ?? 0;
    const realizedProfit = data?.profit.realizedProfit ?? 0;
    const realizedRevenue = data?.profit.realizedRevenue ?? 0;
    const realizedCost = data?.profit.realizedCost ?? 0;
    const unrecognizedProfit = data?.profit.unrecognizedProfit ?? 0;
    const collectionRate = data?.profit.collectionRate ?? 0;
    return { expenses, sales, gross, real, repairProfit, realizedProfit, realizedRevenue, realizedCost, unrecognizedProfit, collectionRate };
  }, [data]);

  const debtors = data?.top.debtors ?? [];
  const creditors = data?.top.creditors ?? [];
  const expenseRows = data?.expensesSummary?.byCategory ?? [];

  const salesMarginPct = data?.sales.totalSales ? (data.profit.grossProfit / Math.max(1, data.sales.totalSales)) * 100 : 0;
  const expenseRatioPct = data?.sales.totalSales ? (totals.expenses / Math.max(1, data.sales.totalSales)) * 100 : 0;
  const salesTone = (data?.sales.totalSales ?? 0) > 0 ? 'success' : 'neutral';
  const grossProfitTone = salesMarginPct < 10 ? 'danger' : salesMarginPct < 20 ? 'warning' : 'success';
  const purchasesTone = (data?.purchases.total ?? 0) > 0 ? 'neutral' : 'info';
  const expensesTone = expenseRatioPct > 45 ? 'danger' : expenseRatioPct > 25 ? 'warning' : 'neutral';
  const realProfitTone = totals.real < 0 ? 'danger' : totals.real < Math.max(1, totals.gross) * 0.12 ? 'warning' : 'success';
  const inventoryTone = (data?.inventory.inventoryValue ?? 0) > 0 ? 'info' : 'neutral';
  const collectionTone = totals.collectionRate >= 75 ? 'success' : totals.collectionRate >= 45 ? 'warning' : 'danger';
  const rawManagerProfitBuckets = data?.profit.managementBuckets;
  const managerProfitBuckets: ManagerProfitBuckets = normalizeManagerProfitBuckets(rawManagerProfitBuckets);
  const managerProfitTotal = Object.values(managerProfitBuckets).reduce(
    (sum, bucket) => sum + Number(bucket.fullProfit || 0),
    0,
  );
  const managerInstallmentCollectedProfit = getCollectedInstallmentProfit(managerProfitBuckets.installmentPhone);
  const managerRealizedProfitTotal =
    Number(managerProfitBuckets.accessories.realizedProfit || 0) +
    Number(managerProfitBuckets.cashPhone.realizedProfit || 0) +
    managerInstallmentCollectedProfit +
    Number(managerProfitBuckets.credit.realizedProfit || 0);
  const managerUncollectedProfitTotal = Math.max(0, managerProfitTotal - managerRealizedProfitTotal);
  const managerProfitCollectionRate = managerProfitTotal > 0
    ? Math.min(100, Math.max(0, (managerRealizedProfitTotal / managerProfitTotal) * 100))
    : 0;

  return (
    <div className="report-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="space-y-5">
          <ReportControlDock
            ariaLabel="کنترل گزارش نمای مالی مدیر"
            presentation="approved"
            title="کنترل گزارش"
            subtitle="انتخاب بازه زمانی و به‌روزرسانی نمای مالی مدیر"
            icon={<i className="fa-solid fa-sliders" aria-hidden="true" />}
            footer={(
              <ReportControlFooter
                ariaLabel="عملیات و وضعیت نمای مالی مدیر"
                statuses={(
                  <>
                    <ReportControlStatus tone="neutral" icon={<i className="fa-solid fa-chart-pie" aria-hidden="true" />}>
                      <span>نمای مالی تجمیعی</span>
                    </ReportControlStatus>
                    <ReportControlStatus tone="info" icon={<i className="fa-regular fa-calendar" aria-hidden="true" />}>
                      <span className="whitespace-nowrap">بازه فعال:</span>
                      <bdi dir="ltr" className="font-black">{currentRange.from}</bdi>
                      <span aria-hidden="true" className="font-black text-[var(--ds-text-muted)]">|</span>
                      <bdi dir="ltr" className="font-black">{currentRange.to}</bdi>
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
                      disabled={isLoading || !data}
                      leftIcon={<i className="fa-solid fa-file-excel" aria-hidden="true" />}
                    >
                      خروجی اکسل
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={() => void refreshOverview()}
                      disabled={isLoading || isRefreshing}
                      loading={isLoading || isRefreshing}
                      loadingText="در حال به‌روزرسانی…"
                      leftIcon={<i className="fa-solid fa-rotate" aria-hidden="true" />}
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
                  onChange={({ from, to }) => {
                    setFromDate(from);
                    setToDate(to);
                  }}
                />
              )}
              fromField={(
                <ReportFilterField label="از تاریخ" icon={<i className="fa-regular fa-calendar" />} minWidthClassName="min-w-0">
                  <ShamsiDatePicker
                    selectedDate={fromDate}
                    onDateChange={(date) => date && setFromDate(date)}
                    size="standard"
                  />
                </ReportFilterField>
              )}
              toField={(
                <ReportFilterField label="تا تاریخ" icon={<i className="fa-regular fa-calendar-check" />} minWidthClassName="min-w-0">
                  <ShamsiDatePicker
                    selectedDate={toDate}
                    onDateChange={(date) => date && setToDate(date)}
                    size="standard"
                  />
                </ReportFilterField>
              )}
            />
          </ReportControlDock>

          {!data ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              <IconGlyph tone="neutral" className="mx-auto mb-3 h-14 w-14" aria-hidden="true"><i className={iconClass(isLoading ? 'fa-spinner fa-spin' : 'fa-chart-pie')} /></IconGlyph>
              <div className="text-base font-bold text-slate-700 dark:text-slate-200">{isLoading ? 'در حال دریافت گزارش...' : 'گزارش برای نمایش آماده نیست.'}</div>
              <div className="mt-1 text-sm leading-7">بازه را تغییر بده تا گزارش همان لحظه به‌روزرسانی شود.</div>
            </div>
          ) : (
            <>

              <PanelCard
                title="خلاصه مدیریتی"
                subtitle="چهار شاخص اصلی برای ارزیابی سریع فروش، سود و وصول در بازه انتخابی."
                icon={<i className={iconClass('fa-chart-pie')} />}
                actions={(
                  <div className="flex flex-wrap items-center gap-2">
                    <ActionLink to="/reports/product-sales" onClick={(event) => onDrilldownClick(event, '/reports/product-sales', { contextLabel: 'جزئیات فروش • بازه ' + currentRange.from + ' تا ' + currentRange.to })} variant="secondary" size="sm" leftIcon={<i className={iconClass('fa-chart-line')} />}>جزئیات فروش</ActionLink>
                    <ActionLink to="/reports/financial-audit" onClick={(event) => onDrilldownClick(event, '/reports/financial-audit', { contextLabel: 'کنترل اختلاف • بازه ' + currentRange.from + ' تا ' + currentRange.to })} variant="secondary" size="sm" leftIcon={<i className={iconClass('fa-shield-check')} />}>کنترل اختلاف</ActionLink>
                  </div>
                )}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <PanelCard variant="metric" title="جمع فروش" metricValue={money(data.sales.totalSales)} metricHint={`${formatExactNumberText(data.sales.ordersCount)} سفارش ثبت‌شده`} tone={salesTone} icon={<i className={iconClass('fa-sack-dollar')} />} />
                  <PanelCard variant="metric" title="سود ناخالص" metricValue={money(data.profit.grossProfit)} metricHint={`بهای تمام‌شده: ${money(data.profit.cogs)} • حاشیه ${formatReadablePercentText(salesMarginPct, 2)}`} tone={grossProfitTone} icon={<i className={iconClass('fa-chart-line')} />} />
                  <PanelCard variant="metric" title="سود عملیاتی" metricValue={money(totals.real)} metricHint="سود ناخالص پس از کسر هزینه‌ها" tone={realProfitTone} icon={<i className={iconClass('fa-bullseye')} />} />
                  <PanelCard variant="metric" title="درصد وصول فروش" metricValue={percent(totals.collectionRate)} metricHint="نسبت وصول واقعی به فروش قراردادی" tone={collectionTone} icon={<i className={iconClass('fa-gauge-high')} />} />
                </div>
              </PanelCard>

              <PanelCard
                title="سرمایه در گردش"
                subtitle="مانده‌های عملیاتی که روی نقدینگی روز فروشگاه اثر مستقیم دارند."
                icon={<i className={iconClass('fa-wallet')} />}
                actions={(
                  <div className="flex flex-wrap items-center gap-2">
                    <ActionLink to="/reports/aging-receivables" onClick={(event) => onDrilldownClick(event, '/reports/aging-receivables', { contextLabel: 'ریسک وصول • بازه ' + currentRange.from + ' تا ' + currentRange.to })} variant="secondary" size="sm" leftIcon={<i className={iconClass('fa-user-clock')} />}>ریسک وصول</ActionLink>
                    <ActionLink to="/reports/cashflow" onClick={(event) => onDrilldownClick(event, '/reports/cashflow', { contextLabel: 'جریان نقدی • بازه ' + currentRange.from + ' تا ' + currentRange.to })} variant="secondary" size="sm" leftIcon={<i className={iconClass('fa-wallet')} />}>جریان نقدی</ActionLink>
                  </div>
                )}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <PanelCard variant="metric" title="مطالبات مشتریان" metricValue={money(data.workingCapital.receivables)} metricHint={`${formatExactNumberText(Number(data.workingCapital.audit?.debtorsCount ?? debtors.length))} مشتری بدهکار`} tone={(data.workingCapital.receivables ?? 0) > 0 ? 'warning' : 'success'} icon={<i className={iconClass('fa-user-clock')} />} />
                  <PanelCard variant="metric" title="بدهی به همکاران" metricValue={money(data.workingCapital.payables)} metricHint={`${formatExactNumberText(Number(data.workingCapital.audit?.creditorsCount ?? creditors.length))} حساب بستانکار`} tone={(data.workingCapital.payables ?? 0) > 0 ? 'neutral' : 'success'} icon={<i className={iconClass('fa-file-invoice-dollar')} />} />
                  <PanelCard variant="metric" title="ارزش موجودی" metricValue={money(data.inventory.inventoryValue)} metricHint="ارزش خرید کالاهای قابل فروش" tone={inventoryTone} icon={<i className={iconClass('fa-boxes-stacked')} />} />
                  <PanelCard variant="metric" title="خریدها" metricValue={money(data.purchases.total)} metricHint={`مرجوعی‌ها: ${money(data.sales.refundsTotal)}`} tone={purchasesTone} icon={<i className={iconClass('fa-cart-shopping')} />} />
                </div>
              </PanelCard>

              <div data-manager-profit-section="true">
                <PanelCard
                  title="سود فروشگاه به تفکیک منبع"
                subtitle="همه اعداد این بخش فقط از قراردادهای ثبت‌شده در بازه انتخابی می‌آیند و مبالغ بدون گردکردن نمایش داده می‌شوند."
                icon={<i className={iconClass('fa-circle-check')} />}
                actions={<ActionLink to="/reports/realized-profit" onClick={(event) => onDrilldownClick(event, '/reports/realized-profit', { contextLabel: 'جزئیات سود وصول‌شده • بازه ' + currentRange.from + ' تا ' + currentRange.to })} variant="secondary" size="sm" leftIcon={<i className={iconClass('fa-circle-check')} />}>جزئیات سود وصول‌شده</ActionLink>}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4" data-manager-profit-primary="true">
                  <PanelCard variant="metric"
                    title="سود لوازم"
                    metricValue={money(managerProfitBuckets.accessories.realizedProfit)}
                    metricBadge={<FinancialStatusBadge label="سود وصول‌شده" tone="success" size="xs" />}
                    metricHint={<ProfitCollectionRateDetails rate={getManagerProfitCollectionRate(managerProfitBuckets.accessories)} uncollectedProfit={money(getUncollectedManagerProfit(managerProfitBuckets.accessories))} realizedRevenue={money(managerProfitBuckets.accessories.realizedRevenue)} detailsHref={buildManagerProfitDetailsHref('accessories', currentRange.from, currentRange.to)} detailsLabel="مشاهده قراردادها و سود وصول‌نشده لوازم" />}
                    tone="success"
                    icon={<i className={iconClass('fa-headphones')} />}
                  />
                  <PanelCard variant="metric"
                    title="سود نقدی گوشی"
                    metricValue={money(managerProfitBuckets.cashPhone.realizedProfit)}
                    metricBadge={<FinancialStatusBadge label="سود وصول‌شده" tone="success" size="xs" />}
                    metricHint={<ProfitCollectionRateDetails rate={getManagerProfitCollectionRate(managerProfitBuckets.cashPhone)} uncollectedProfit={money(getUncollectedManagerProfit(managerProfitBuckets.cashPhone))} realizedRevenue={money(managerProfitBuckets.cashPhone.realizedRevenue)} detailsHref={buildManagerProfitDetailsHref('cashPhone', currentRange.from, currentRange.to)} detailsLabel="مشاهده قراردادها و سود وصول‌نشده فروش نقدی گوشی" />}
                    tone="success"
                    icon={<i className={iconClass('fa-mobile-screen-button')} />}
                  />
                  <PanelCard variant="metric"
                    title="سود اقساطی گوشی"
                    metricValue={money(managerInstallmentCollectedProfit)}
                    metricBadge={<FinancialStatusBadge label="سود وصول‌شده" tone="success" size="xs" />}
                    metricHint={<ProfitCollectionRateDetails rate={getManagerProfitCollectionRate(managerProfitBuckets.installmentPhone, managerInstallmentCollectedProfit)} uncollectedProfit={money(getInstallmentUncollectedProfit(managerProfitBuckets.installmentPhone))} realizedRevenue={money(managerProfitBuckets.installmentPhone.realizedRevenue)} detailsHref={buildManagerProfitDetailsHref('installmentPhone', currentRange.from, currentRange.to)} detailsLabel="مشاهده قراردادها و سود وصول‌نشده فروش اقساطی گوشی" />}
                    tone="info"
                    icon={<i className={iconClass('fa-calendar-check')} />}
                  />
                  <PanelCard variant="metric"
                    title="سود فروش اعتباری"
                    metricValue={money(managerProfitBuckets.credit.realizedProfit)}
                    metricBadge={<FinancialStatusBadge label="سود وصول‌شده" tone="success" size="xs" />}
                    metricHint={<ProfitCollectionRateDetails rate={getManagerProfitCollectionRate(managerProfitBuckets.credit)} uncollectedProfit={money(getUncollectedManagerProfit(managerProfitBuckets.credit))} realizedRevenue={money(managerProfitBuckets.credit.realizedRevenue)} detailsHref={buildManagerProfitDetailsHref('credit', currentRange.from, currentRange.to)} detailsLabel="مشاهده قراردادها و سود وصول‌نشده فروش اعتباری" />}
                    tone="warning"
                    icon={<i className={iconClass('fa-handshake')} />}
                  />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4" data-manager-profit-summary="true">
                  <PanelCard variant="metric" title="جمع سود کل قراردادهای چهارگانه" metricValue={money(managerProfitTotal)} tone="neutral" icon={<i className={iconClass('fa-circle-check')} />} />
                  <PanelCard variant="metric" title="جمع سود وصول‌شده چهارگانه" metricValue={money(managerRealizedProfitTotal)} tone="success" icon={<i className={iconClass('fa-money-bill-transfer')} />} />
                  <PanelCard variant="metric" title="سود در انتظار وصول" metricValue={money(managerUncollectedProfitTotal)} tone="warning" icon={<i className={iconClass('fa-hourglass-half')} />} />
                  <PanelCard variant="metric"
                    title="نرخ وصول سود چهارگانه"
                    metricValue={<ProfitCollectionRateBadge rate={managerProfitCollectionRate} label={null} to={buildManagerProfitDetailsHref('all', currentRange.from, currentRange.to)} detailsLabel="مشاهده همه قراردادها و سود وصول‌نشده چهارگانه" />}
                    tone={managerProfitCollectionRate >= 75 ? 'success' : managerProfitCollectionRate >= 45 ? 'warning' : 'danger'}
                    icon={<i className={iconClass('fa-gauge-high')} />}
                  />
                </div>
                </PanelCard>
              </div>

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
                <PanelCard
                  title="هزینه‌ها و سود عملیاتی"
                  subtitle="اثر هزینه‌ها روی سود نهایی بازه انتخابی."
                  icon={<i className={iconClass('fa-receipt')} />}
                  actions={<FinancialStatusBadge label={`نسبت هزینه به فروش: ${formatReadablePercentText(expenseRatioPct, 2)}`} tone={expenseRatioPct > 45 ? 'danger' : expenseRatioPct > 25 ? 'warning' : 'neutral'} size="sm" />}
                >
                  <div className="grid gap-3 md:grid-cols-3">
                    <PanelCard variant="metric" title="فروش" metricValue={money(totals.sales)} icon={<i className={iconClass('fa-hand-holding-dollar')} />} tone="info" />
                    <PanelCard variant="metric" title="سود ناخالص" metricValue={money(totals.gross)} icon={<i className={iconClass('fa-chart-simple')} />} tone={grossProfitTone} />
                    <PanelCard variant="metric" title="هزینه‌ها" metricValue={money(totals.expenses)} icon={<i className={iconClass('fa-receipt')} />} tone={expensesTone} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => void openDrilldown('totalSales')} leftIcon={<i className={iconClass('fa-list-ul')} />}>جزئیات جمع فروش</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => void openDrilldown('grossProfit')} leftIcon={<i className={iconClass('fa-layer-group')} />}>جزئیات سود ناخالص</Button>
                  </div>
                </PanelCard>

                <PanelCard title="تفکیک هزینه‌ها" subtitle="نمای دسته‌بندی هزینه‌های ثبت‌شده." icon={<i className={iconClass('fa-chart-pie')} />}>
                  {expenseRows.length > 0 ? (
                    <ExpensePie rows={expenseRows} total={Number(data.expensesSummary?.total ?? 0)} />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[var(--ds-border-subtle)] p-6 text-center text-sm text-[var(--ds-text-muted)]">
                      هزینه‌ای در این بازه ثبت نشده است.
                    </div>
                  )}
                </PanelCard>
              </section>

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <PanelCard
                  title="بدهکاران شاخص"
                  subtitle="مشتریانی که بیشترین اثر را روی مطالبات دارند."
                  icon={<i className={iconClass('fa-user-clock')} />}
                  actions={<ActionLink to="/reports/aging-receivables" onClick={(event) => onDrilldownClick(event, '/reports/aging-receivables', { contextLabel: 'ریسک وصول • بازه ' + currentRange.from + ' تا ' + currentRange.to })} variant="secondary" size="sm" leftIcon={<i className={iconClass('fa-arrow-up-right-from-square')} />}>تحلیل ریسک وصول</ActionLink>}
                >
                  {debtors.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--ds-border-subtle)] p-5 text-center text-sm text-[var(--ds-text-muted)]">موردی برای نمایش وجود ندارد.</div>
                  ) : (
                    <div className="grid gap-2">
                      {debtors.slice(0, 6).map((d: any, i: number) => {
                        const name = String(d.fullName || d.name || '—').trim();
                        const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').slice(0, 2) || '؟';
                        return (
                          <ActionLink
                            key={d.id ?? i}
                            data-navigation-anchor={reportNavigationAnchor('financial-overview-debtor', d.id ?? i)}
                            to={`/customers/${d.id ?? ''}#customer-ledger-section`}
                            onClick={(event) => onDrilldownClick(event, `/customers/${d.id ?? ''}#customer-ledger-section`, { contextLabel: `${name} • بدهی ${money(d.balance)}`, anchorId: reportNavigationAnchor('financial-overview-debtor', d.id ?? i) })}
                            unstyled
                            autoIcon={false}
                            className="w-full justify-between gap-3 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-card-muted)] px-3 py-3 text-[var(--ds-text-primary)] transition hover:border-[var(--ds-border-strong)]"
                          >
                            <span className="inline-flex min-w-0 items-center gap-3">
                              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--ds-border-subtle)] text-xs font-black">{initials}</span>
                              <span className="truncate text-sm font-black">{name}</span>
                            </span>
                            <strong className="shrink-0 text-sm font-black tabular-nums">{money(d.balance)}</strong>
                          </ActionLink>
                        );
                      })}
                    </div>
                  )}
                </PanelCard>

                <PanelCard title="بستانکاران شاخص" subtitle="حساب‌هایی که بیشترین تعهد پرداخت را ایجاد کرده‌اند." icon={<i className={iconClass('fa-file-invoice-dollar')} />}>
                  {creditors.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--ds-border-subtle)] p-5 text-center text-sm text-[var(--ds-text-muted)]">موردی برای نمایش وجود ندارد.</div>
                  ) : (
                    <div className="grid gap-2">
                      {creditors.slice(0, 6).map((c: any, i: number) => {
                        const name = String(c.partnerName || c.fullName || c.name || '—').trim();
                        const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').slice(0, 2) || '؟';
                        return (
                          <ActionLink
                            key={c.id ?? i}
                            data-navigation-anchor={reportNavigationAnchor('financial-overview-creditor', c.id ?? i)}
                            to={`/people/${c.id ?? ''}`}
                            onClick={(event) => onDrilldownClick(event, `/people/${c.id ?? ''}`, { contextLabel: `${name} • بستانکاری ${money(c.balance)}`, anchorId: reportNavigationAnchor('financial-overview-creditor', c.id ?? i) })}
                            unstyled
                            autoIcon={false}
                            className="w-full justify-between gap-3 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-card-muted)] px-3 py-3 text-[var(--ds-text-primary)] transition hover:border-[var(--ds-border-strong)]"
                          >
                            <span className="inline-flex min-w-0 items-center gap-3">
                              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--ds-border-subtle)] text-xs font-black">{initials}</span>
                              <span className="truncate text-sm font-black">{name}</span>
                            </span>
                            <strong className="shrink-0 text-sm font-black tabular-nums">{money(c.balance)}</strong>
                          </ActionLink>
                        );
                      })}
                    </div>
                  )}
                </PanelCard>
              </section>
            </>
          )}

          {drillOpen ? (
            <Modal
              title={drillKpi === 'totalSales' ? 'جزئیات جمع فروش' : drillKpi === 'productSalesTotal' ? 'جزئیات فروش غیرگوشی' : 'جزئیات سود ناخالص'}
              onClose={() => setDrillOpen(false)}
              widthClass="max-w-4xl"
            >
              {drillLoading ? (
                <div className="p-6 text-sm text-slate-600 dark:text-slate-300">در حال دریافت اطلاعات…</div>
              ) : drillRows.length === 0 ? (
                <div className="p-6 text-sm text-slate-600 dark:text-slate-300">موردی یافت نشد.</div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-slate-950">
                      <tr className="text-right text-slate-600 dark:text-slate-300">
                        <th className="px-3 py-2">فاکتور</th>
                        <th className="px-3 py-2">تاریخ</th>
                        <th className="px-3 py-2">مشتری</th>
                        <th className="px-3 py-2">مبلغ</th>
                        {drillKpi === 'grossProfit' ? <th className="px-3 py-2">سود</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {drillRows.map((r, i) => (
                        <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2">{r.orderId ?? '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatDateFa(r.date, true)}</td>
                          <td className="px-3 py-2">
                            {r.customerName || '—'}
                            {r.customerPhone ? <div className="text-xs text-slate-500">{r.customerPhone}</div> : null}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{money(r.amount)}</td>
                          {drillKpi === 'grossProfit' ? <td className="px-3 py-2 whitespace-nowrap">{money(r.profit)}</td> : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Modal>
          ) : null}

          <FinancialScheduleDialog
            open={scheduleOpen}
            onClose={() => setScheduleOpen(false)}
            scheduleType={scheduleType}
            setScheduleType={setScheduleType}
            scheduleTime={scheduleTime}
            setScheduleTime={setScheduleTime}
            scheduleWeekdays={scheduleWeekdays}
            setScheduleWeekdays={setScheduleWeekdays}
            scheduleMonthDay={scheduleMonthDay}
            setScheduleMonthDay={setScheduleMonthDay}
            scheduleSummaryFa={scheduleSummaryFa}
            cronExpression={buildCronFromUi()}
            scheduleCreating={scheduleCreating}
            onCreate={createSchedule}
          />
      </div>
    </div>
  );
};

export default FinancialOverviewPage;
