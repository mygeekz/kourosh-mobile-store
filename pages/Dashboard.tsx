// pages/Dashboard.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import moment from 'jalali-moment';
import { Link } from 'react-router-dom';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';

import type {
  SalesDataPoint,
  ChartTimeframe,
  DashboardAPIData,
  NotificationMessage,
  Product,
  PhoneEntry,
  InstallmentCalendarItem,
} from '../types';

import Notification from '../components/Notification';
import LiquidGlassPanel from '../components/LiquidGlassPanel';
import Skeleton from '../components/ui/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { apiFetch } from '../utils/apiFetch';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';

import AddWidgetModal from './dashboard/AddWidgetModal';
import WidgetShell from './dashboard/WidgetShell';
import { DEFAULT_DASHBOARD_LAYOUT, type DashboardLayoutV2 } from './dashboard/defaultLayouts';
import { ALL_WIDGETS, WIDGET_REGISTRY, type WidgetId, type SizePreset, PRESET_SIZE } from './dashboard/registry';
import type { ChartVariant, DashboardWidgetContext } from './dashboard/types';
import { UnifiedClockCard } from './dashboard/widgets/ClockWidget';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';

const ResponsiveGridLayout = WidthProvider(Responsive);


type ClockWidgetPrefs = {
  showAnalog: boolean;
  showQuote: boolean;
  showDateStrip: boolean;
  showOpsCards: boolean;
  showSmartPanel: boolean;
  showQuickActions: boolean;
  cinematicGlow: boolean;
  adaptiveTone: boolean;
  ambientRing: boolean;
};

type RiskyCustomerDashboardSummary = {
  totalRisky: number;
  lowScore: number;
  lateOrOverdue: number;
  returnedChecks: number;
  worstScore: number | null;
};

type DashboardFixedSectionId = 'spotlight' | 'executive';

type DashboardFixedSectionPrefs = {
  version: 1;
  order: DashboardFixedSectionId[];
  hidden: DashboardFixedSectionId[];
};

const DASHBOARD_FIXED_SECTIONS_KEY = 'kourosh.dashboard.fixed-sections.v1';

const DASHBOARD_FIXED_SECTION_DEFS: Record<DashboardFixedSectionId, {
  id: DashboardFixedSectionId;
  title: string;
  description: string;
  icon: string;
  locked?: boolean;
}> = {
  spotlight: {
    id: 'spotlight',
    title: 'شاخص‌های اصلی پیشخوان',
    description: 'ردیف کارت‌های حرفه‌ای درآمد، فروش، سود و موجودی؛ ظاهر اصلی این کارت‌ها حفظ می‌شود.',
    icon: 'fa-solid fa-gauge-high',
  },
  executive: {
    id: 'executive',
    title: 'نمای مدیریتی و اقدام فوری',
    description: 'بخش خلاصه مالی کلیدی و میانبرهای عملیاتی؛ بدون ورود به چیدمان کارت‌های ریز.',
    icon: 'fa-solid fa-chart-line',
  },
};

const DEFAULT_DASHBOARD_FIXED_SECTION_PREFS: DashboardFixedSectionPrefs = {
  version: 1,
  order: ['spotlight', 'executive'],
  hidden: [],
};

const normalizeDashboardFixedSectionPrefs = (raw: any): DashboardFixedSectionPrefs => {
  const validIds = Object.keys(DASHBOARD_FIXED_SECTION_DEFS) as DashboardFixedSectionId[];
  const orderInput = Array.isArray(raw?.order) ? raw.order : [];
  const hiddenInput = Array.isArray(raw?.hidden) ? raw.hidden : [];
  const order = [
    ...orderInput.filter((id: any): id is DashboardFixedSectionId => validIds.includes(id)),
    ...validIds.filter((id) => !orderInput.includes(id)),
  ];
  const hidden = hiddenInput.filter((id: any): id is DashboardFixedSectionId => validIds.includes(id));
  return { version: 1, order, hidden };
};

const loadDashboardFixedSectionPrefs = (): DashboardFixedSectionPrefs => {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_FIXED_SECTION_PREFS;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_FIXED_SECTIONS_KEY);
    if (!raw) return DEFAULT_DASHBOARD_FIXED_SECTION_PREFS;
    return normalizeDashboardFixedSectionPrefs(JSON.parse(raw));
  } catch {
    return DEFAULT_DASHBOARD_FIXED_SECTION_PREFS;
  }
};

// Cards below are already represented by the fixed executive dashboard sections.
// They remain in the registry for backward compatibility with saved layouts/API payloads,
// but are excluded from the managed grid so the default dashboard keeps the premium fixed-card UI.
const FIXED_SECTION_DUPLICATE_WIDGET_IDS = new Set<WidgetId>([
  'asset',
  'kpi_revenue_today',
  'kpi_sales_month',
  'kpi_cash_sales_month',
  'kpi_installment_sales_month',
  'kpi_repair_profit_month',
  'kpi_product_sales_month',
  'kpi_products_count',
  'kpi_customers_count',
  'clock_widget',
  'action_center',
]);

const isManagedDashboardWidget = (id: WidgetId) => !FIXED_SECTION_DUPLICATE_WIDGET_IDS.has(id);

const FIXED_DASHBOARD_OPERATIONAL_WIDGET_IDS: WidgetId[] = [
  'sales_chart',
  'installment_calendar',
  'recent_activities',
];

const FIXED_DASHBOARD_WIDGET_CLASSES: Partial<Record<WidgetId, string>> = {
  sales_chart: 'xl:col-span-12 h-[420px] lg:h-[460px]',
  installment_calendar: 'xl:col-span-6 h-[380px]',
  recent_activities: 'xl:col-span-6 h-[380px]',
};

const CLOCK_WIDGET_PREFS_KEY = "kourosh.dashboard.clock-widget.v1";
const DEFAULT_CLOCK_WIDGET_PREFS: ClockWidgetPrefs = {
  showAnalog: true,
  showQuote: true,
  showDateStrip: true,
  showOpsCards: true,
  showSmartPanel: true,
  showQuickActions: true,
  cinematicGlow: true,
  adaptiveTone: true,
  ambientRing: true,
};

const loadClockWidgetPrefs = (): ClockWidgetPrefs => {
  if (typeof window === 'undefined') return DEFAULT_CLOCK_WIDGET_PREFS;
  try {
    const raw = window.localStorage.getItem(CLOCK_WIDGET_PREFS_KEY);
    if (!raw) return DEFAULT_CLOCK_WIDGET_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CLOCK_WIDGET_PREFS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return DEFAULT_CLOCK_WIDGET_PREFS;
  }
};

// --------------------
// Format helpers
// --------------------
const formatPriceForStats = (value: number): string => {
  if (value === undefined || value === null) return formatCurrencyText(0, readStoredCurrencyUnit());
  return formatCurrencyText(value || 0, readStoredCurrencyUnit());
};
const formatNumberForStats = (value: number): string => {
  if (value === undefined || value === null) return '۰';
  return Number(value || 0).toLocaleString('fa-IR');
};
const formatPercentForStats = (value: number): string => {
  const normalized = Number.isFinite(Number(value)) ? Number(value) : 0;
  return normalized.toLocaleString('fa-IR', { maximumFractionDigits: 1 }) + '٪';
};


// --------------------
// Premium metric card
// --------------------

const DashboardSkeletonBar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={["animate-pulse rounded-2xl bg-slate-200/80 dark:bg-white/10", className].join(' ')} />
);

const MetricCard: React.FC<{
  titleFa: string;
  titleEn: string;
  value: string;
  icon: string;
  tone?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky' | 'purple';
  loading?: boolean;
  accentLevel?: 'none' | 'soft' | 'medium' | 'strong';
}> = ({ titleFa, titleEn, value, icon, tone = 'indigo', loading, accentLevel = 'none' }) => {
  const tones: Record<string, { ring: string; grad: string; badge: string }> = {
    indigo: {
      ring: 'ring-slate-200/80 dark:ring-slate-800/80',
      grad: '',
      badge: 'border border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
    },
    emerald: {
      ring: 'ring-slate-200/80 dark:ring-slate-800/80',
      grad: '',
      badge: 'border border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
    },
    rose: {
      ring: 'ring-slate-200/80 dark:ring-slate-800/80',
      grad: '',
      badge: 'border border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
    },
    amber: {
      ring: 'ring-slate-200/80 dark:ring-slate-800/80',
      grad: '',
      badge: 'border border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
    },
    sky: {
      ring: 'ring-slate-200/80 dark:ring-slate-800/80',
      grad: '',
      badge: 'border border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
    },
    purple: {
      ring: 'ring-slate-200/80 dark:ring-slate-800/80',
      grad: '',
      badge: 'border border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
    },
  };

  const t = tones[tone];
  const accentMap = {
    none: { shell: 'border-slate-200/80 dark:border-slate-800/80', panel: 'border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200' },
    soft: { shell: tone === 'emerald' ? 'border-emerald-200/80 dark:border-emerald-900/50' : tone === 'purple' ? 'border-violet-200/80 dark:border-violet-900/50' : tone === 'amber' ? 'border-amber-200/80 dark:border-amber-900/50' : 'border-sky-200/80 dark:border-sky-900/50', panel: tone === 'emerald' ? 'border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200' : tone === 'purple' ? 'border-violet-200/80 bg-violet-50 text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/25 dark:text-violet-200' : tone === 'amber' ? 'border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200' : 'border-sky-200/80 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200' },
    medium: { shell: tone === 'emerald' ? 'border-emerald-300/85 dark:border-emerald-800/60' : tone === 'purple' ? 'border-violet-300/85 dark:border-violet-800/60' : tone === 'amber' ? 'border-amber-300/85 dark:border-amber-800/60' : 'border-sky-300/85 dark:border-sky-800/60', panel: tone === 'emerald' ? 'border-emerald-300/85 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100' : tone === 'purple' ? 'border-violet-300/85 bg-violet-50 text-violet-900 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-100' : tone === 'amber' ? 'border-amber-300/85 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100' : 'border-sky-300/85 bg-sky-50 text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-100' },
    strong: { shell: tone === 'emerald' ? 'border-emerald-400/90 dark:border-emerald-700/70' : tone === 'purple' ? 'border-violet-400/90 dark:border-violet-700/70' : tone === 'amber' ? 'border-amber-400/90 dark:border-amber-700/70' : 'border-sky-400/90 dark:border-sky-700/70', panel: tone === 'emerald' ? 'border-emerald-400/90 bg-[linear-gradient(135deg,#ecfdf5_0%,#d1fae5_100%)] text-emerald-950 dark:border-emerald-700/70 dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.58),rgba(2,44,34,0.92))] dark:text-emerald-50' : tone === 'purple' ? 'border-violet-400/90 bg-[linear-gradient(135deg,#f5f3ff_0%,#ede9fe_100%)] text-violet-950 dark:border-violet-700/70 dark:bg-[linear-gradient(135deg,rgba(76,29,149,0.58),rgba(30,27,75,0.92))] dark:text-violet-50' : tone === 'amber' ? 'border-amber-400/90 bg-[linear-gradient(135deg,#fffbeb_0%,#fef3c7_100%)] text-amber-950 dark:border-amber-700/70 dark:bg-[linear-gradient(135deg,rgba(120,53,15,0.58),rgba(69,26,3,0.92))] dark:text-amber-50' : 'border-sky-400/90 bg-[linear-gradient(135deg,#f0f9ff_0%,#dbeafe_100%)] text-sky-950 dark:border-sky-700/70 dark:bg-[linear-gradient(135deg,rgba(12,74,110,0.58),rgba(8,47,73,0.92))] dark:text-sky-50' },
  } as const;
  const accent = accentMap[accentLevel];

  return (
    <div
      className={[
        'group relative overflow-hidden rounded-3xl p-3',
        'bg-white dark:bg-slate-950',
        'shadow-[0_1px_2px_rgba(15,23,42,0.05)]',
        'ring-1',
        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-30px_rgba(15,23,42,0.16)]',
        t.ring,
        accent.shell,
      ].join(' ')}
    >

      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-l from-sky-500/0 via-sky-400/40 to-indigo-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="text-right">
          <div className="text-[12px] font-extrabold text-gray-900 dark:text-gray-100">{titleFa}</div>
          <div className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">{titleEn}</div>
        </div>

        <div
          className={[
            'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
            'bg-gradient-to-br from-black/5 to-black/0 dark:from-white/10 dark:to-white/0',
            'ring-1',
            t.badge,
            accent.panel,
          ].join(' ')}
        >
          <i className={[icon, 'text-[16px]'].join(' ')} />
        </div>
      </div>

      <div className="relative mt-3">
        {loading ? (
          <div className="dashboard-card-manager-list space-y-2"><DashboardSkeletonBar className="h-7 w-36" /><DashboardSkeletonBar className="h-3 w-24" /></div>
        ) : (
          <div className="text-[18px] md:text-[20px] font-black text-gray-900 dark:text-gray-100 tracking-tight">{value}</div>
        )}
      </div>
    </div>
  );
};

// --- Helpers for chart normalization ---
const toEnglishDigits = (str: any): string => {
  const s = String(str ?? '');
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  const ar = '٠١٢٣٤٥٦٧٨٩';
  return s.replace(/[۰-۹]/g, (d) => String(fa.indexOf(d))).replace(/[٠-٩]/g, (d) => String(ar.indexOf(d)));
};

const extractNumeric = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === 'object') {
    const k = ['sales', 'value', 'amount', 'total', 'sum', 'revenue', 'count', 'price', 'num'].find((key) =>
      Object.prototype.hasOwnProperty.call(v, key),
    );
    if (k) return extractNumeric((v as any)[k]);
    return 0;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return v;

  const s0 = toEnglishDigits(v);
  const s1 = s0
    .replace(/[,،\s]/g, '')
    .replace(/تومان|ريال|ریال|IRR|IRT|tomans?|toman|rial/gi, '')
    .replace(/[^\d.-]/g, '');

  const n = Number(s1);
  return Number.isFinite(n) ? n : 0;
};

const faDateLabel = (raw: any, timeframe: ChartTimeframe['key']) => {
  const s = String(raw ?? '').trim();
  if (!s) return '—';

  const isoFormats = [moment.ISO_8601, 'YYYY-MM-DD', 'YYYY/MM/DD'].filter(Boolean) as any;
  const mIso: any = moment(s, isoFormats, true);
  const mJal: any = moment(s, 'jYYYY/jMM/jDD', true);

  const m = mIso?.isValid?.() ? mIso : mJal?.isValid?.() ? mJal : null;
  if (!m) return s;

  const fmt =
    timeframe === 'weekly'
      ? 'jMM/jDD'
      : timeframe === 'monthly'
      ? 'jMMM'
      : timeframe === 'yearly'
      ? 'jYYYY'
      : 'jMM/jDD';

  return m.locale('fa').format(fmt);
};

const parseToMoment = (raw: any) => {
  const s = String(raw ?? '').trim();
  if (!s) return null;

  const isoFormats = [moment.ISO_8601, 'YYYY-MM-DD', 'YYYY/MM/DD'].filter(Boolean) as any;
  const mIso: any = moment(s, isoFormats, true);
  if (mIso?.isValid?.()) return mIso;

  const mJal: any = moment(s, 'jYYYY/jMM/jDD', true);
  return mJal?.isValid?.() ? mJal : null;
};

const normalizeSalesChartData = (raw: any, timeframe: ChartTimeframe['key']): SalesDataPoint[] => {
  if (!raw) return [];
  if (raw.data && Array.isArray(raw.data)) raw = raw.data;

  if (!Array.isArray(raw) && typeof raw === 'object') {
    const arr = Object.entries(raw).map(([key, val]) => {
      const m = parseToMoment(key);
      const ts = m ? m.valueOf() : 0;
      return { _rawKey: key, _ts: ts, name: faDateLabel(key, timeframe), sales: extractNumeric(val) } as any;
    });

    const validCount = arr.filter((it) => it._ts).length;
    if (validCount >= Math.max(1, Math.floor(arr.length * 0.6))) arr.sort((a, b) => a._ts - b._ts);
    else arr.sort((a, b) => String(a._rawKey).localeCompare(String(b._rawKey)));

    return arr.map(({ name, sales }) => ({ name, sales }));
  }

  if (Array.isArray(raw)) {
    const normalized = raw
      .map((it: any) => {
        const key = it?.date ?? it?.day ?? it?.label ?? it?.name ?? it?.x ?? it?._rawKey ?? '';
        const val = it?.sales ?? it?.value ?? it?.amount ?? it?.total ?? it?.sum ?? it?.revenue ?? it?.y ?? it?.num ?? 0;
        const m = parseToMoment(key);
        const ts = m ? m.valueOf() : 0;
        return { _ts: ts, name: faDateLabel(key, timeframe), sales: extractNumeric(val) } as any;
      })
      .filter((x) => x.name);

    const validCount = normalized.filter((it) => it._ts).length;
    if (validCount >= Math.max(1, Math.floor(normalized.length * 0.6))) normalized.sort((a, b) => a._ts - b._ts);

    return normalized.map(({ name, sales }) => ({ name, sales }));
  }

  return [];
};

// --------------------
// Layout helpers
// --------------------
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

const ensureMandatory = (order: WidgetId[]) => {
  const mustHave = Object.values(WIDGET_REGISTRY)
    .filter((w) => w.canRemove === false && isManagedDashboardWidget(w.id))
    .map((w) => w.id);

  const set = new Set(order);
  const next = order.filter(isManagedDashboardWidget);
  for (const id of mustHave) if (!set.has(id)) next.push(id);
  return next;
};

const cyclePreset = (current: SizePreset): SizePreset => {
  const list: SizePreset[] = ['tile', 'wide', 'tall', 'hero'];
  const idx = Math.max(0, list.indexOf(current));
  return list[(idx + 1) % list.length];
};

// ساخت layout اولیه برای RGL از order + sizes (Packed به سبک masonry برای پر کردن gap ها)
const buildPackedLayout = (order: WidgetId[], sizes: Record<string, SizePreset>, cols: number): Layout[] => {
  const heights = Array.from({ length: cols }, () => 0); // ارتفاع هر ستون
  const out: Layout[] = [];

  const spanMax = (start: number, w: number) => {
    let m = 0;
    for (let i = start; i < start + w; i++) m = Math.max(m, heights[i] || 0);
    return m;
  };

  const place = (w: number, h: number) => {
    // بهترین نقطه = کمترین y ممکن؛ در تساوی، کمترین x
    let bestX = 0;
    let bestY = Number.POSITIVE_INFINITY;

    for (let x = 0; x <= cols - w; x++) {
      const y = spanMax(x, w);
      if (y < bestY || (y === bestY && x < bestX)) {
        bestY = y;
        bestX = x;
      }
    }

    // آپدیت ارتفاع ستون‌ها
    for (let i = bestX; i < bestX + w; i++) heights[i] = bestY + h;

    return { x: bestX, y: bestY };
  };

  for (const id of order) {
    const def = WIDGET_REGISTRY[id];
    if (!def) continue;

    const rawPreset = (sizes[id] || def.defaultPreset) as SizePreset;
    const ps = (PRESET_SIZE as Record<string, typeof PRESET_SIZE.tile>)[rawPreset] || PRESET_SIZE.tile;
    const constraints = (def.constraints && typeof def.constraints === 'object' ? def.constraints : {}) as NonNullable<typeof def.constraints>;

    const presetW = Number.isFinite(ps.w) ? ps.w : PRESET_SIZE.tile.w;
    const presetH = Number.isFinite(ps.h) ? ps.h : PRESET_SIZE.tile.h;
    const presetMinW = Number.isFinite(ps.minW) ? ps.minW : PRESET_SIZE.tile.minW;
    const presetMinH = Number.isFinite(ps.minH) ? ps.minH : PRESET_SIZE.tile.minH;
    const constraintMinH = Number.isFinite(constraints.minH as number) ? Number(constraints.minH) : 0;
    const constraintMaxH = Number.isFinite(constraints.maxH as number) ? Number(constraints.maxH) : undefined;

    const safeCols = Math.max(1, Number.isFinite(cols) ? cols : 1);
    const w = Math.max(1, Math.min(presetW, safeCols));
    const minHWanted = Math.max(presetMinH || 1, constraintMinH || 0);
    const maxHWanted = constraintMaxH !== undefined ? Math.max(constraintMaxH, minHWanted) : undefined;
    const h = Math.max(presetH, minHWanted);

    const pos = place(w, h);

    const item: Layout = {
      i: id,
      x: pos.x,
      y: pos.y,
      w,
      h,
      minW: presetMinW,
      minH: presetMinH,
      ...constraints,
      ...(maxHWanted ? { maxH: maxHWanted } : {}),
      ...(presetMinW > safeCols ? { minW: Math.max(1, safeCols) } : {}),
      ...(w > safeCols ? { w: safeCols } : {}),
    };

    out.push(item);
  }

  return out;
};


const sortOrderFromLayout = (layoutArr: Layout[]): WidgetId[] => {
  return layoutArr
    .slice()
    .sort((a, b) => (a.y - b.y) || (a.x - b.x) || String(a.i).localeCompare(String(b.i)))
    .map((l) => l.i as WidgetId);
};

const DASHBOARD_LAYOUT_ENDPOINT = '/api/dashboard/layout';
const DASHBOARD_LAYOUT_LS_PREFIX = 'dashboard:layouts:v2:';

const Dashboard: React.FC = () => {
  const { token, logout, isLoading: authProcessLoading, authReady, currentUser } = useAuth();
  const { theme } = useTheme();
  const confirmAction = useConfirm();
  const { flags: featureFlags, isEnabled: isFeatureEnabled } = useFeatureFlags();

  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [hoveredHeaderBadge, setHoveredHeaderBadge] = useState<'revenue' | 'due' | 'urgent' | null>(null);
  const [pinnedHeaderBadge, setPinnedHeaderBadge] = useState<'revenue' | 'due' | 'urgent' | null>(null);
  const headerBadgePreviewRefs = useRef<Partial<Record<'revenue' | 'due' | 'urgent', HTMLDivElement | null>>>({});
  const [headerBadgePreviewPlacement, setHeaderBadgePreviewPlacement] = useState<Record<'revenue' | 'due' | 'urgent', 'left' | 'right' | 'center'>>({
    revenue: 'left',
    due: 'left',
    urgent: 'left',
  });
  const headerBadgePanelRef = useRef<HTMLDivElement | null>(null);

  // Dashboard summary
  const [dashboardData, setDashboardData] = useState<DashboardAPIData | null>(null);
  const [productSalesLoading, setProductSalesLoading] = useState<boolean>(false);
  const [productSalesTotal, setProductSalesTotal] = useState<number>(0);
  const [managerFinancePulse, setManagerFinancePulse] = useState({
    realizedProfit: 0,
    realizedRevenue: 0,
    realizedCost: 0,
    unrecognizedProfit: 0,
    collectionRate: 0,
  });
  const [riskyCustomersLoading, setRiskyCustomersLoading] = useState(false);
  const [riskyCustomersSummary, setRiskyCustomersSummary] = useState<RiskyCustomerDashboardSummary>({
    totalRisky: 0,
    lowScore: 0,
    lateOrOverdue: 0,
    returnedChecks: 0,
    worstScore: null,
  });

  const [localIsLoading, setLocalIsLoading] = useState<boolean>(true);
  const [activeTimeframe, setActiveTimeframe] = useState<ChartTimeframe['key']>('weekly');
  const [chartStyle, setChartStyle] = useState<ChartVariant>('aurora');

  // Asset card
  const [assetLoading, setAssetLoading] = useState<boolean>(false);
  const [assetValue, setAssetValue] = useState<number>(0);
  const [assetBreakdown, setAssetBreakdown] = useState<{ productsValue: number; phonesValue: number; itemsCount: number }>({
    productsValue: 0,
    phonesValue: 0,
    itemsCount: 0,
  });

  // Upcoming due items
  const [dueLoading, setDueLoading] = useState(false);
  const [dueItems, setDueItems] = useState<InstallmentCalendarItem[]>([]);
  const [dueRange, setDueRange] = useState<{ from: string; to: string } | null>(null);

  const isDark = theme === 'dark';
  const showLoadingSkeletons = authProcessLoading || (!authReady && !token) || (localIsLoading && authReady && token);

  // --- Dashboard customization state ---
  const [editing, setEditing] = useState(false);
  const [layout, setLayout] = useState<DashboardLayoutV2>(DEFAULT_DASHBOARD_LAYOUT);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [customizePanelOpen, setCustomizePanelOpen] = useState(false);
  const [draggingWidgetId, setDraggingWidgetId] = useState<WidgetId | null>(null);
  const [widgetSearch, setWidgetSearch] = useState('');
  const [widgetCategoryFilter, setWidgetCategoryFilter] = useState<'all' | string>('all');
  const [liveNow, setLiveNow] = useState(() => Date.now());
  const [clockPrefs, setClockPrefs] = useState<ClockWidgetPrefs>(() => loadClockWidgetPrefs());
  const [fixedSectionPrefs, setFixedSectionPrefs] = useState<DashboardFixedSectionPrefs>(() => loadDashboardFixedSectionPrefs());

  const saveTimer = useRef<number | null>(null);
  const lastSavedHash = useRef<string>('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveStateTimer = useRef<number | null>(null);

  const layoutStorageKey = useMemo(() => {
    const uid = (currentUser as any)?.id ?? 'anon';
    return `${DASHBOARD_LAYOUT_LS_PREFIX}${uid}`;
  }, [currentUser]);

  

  // Existing financial-overview fetch: reuse it for product sales and manager finance pulse to avoid duplicate dashboard widgets.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        setProductSalesLoading(true);
        const nowJ = moment().locale('fa');
        const from = nowJ.clone().startOf('jMonth').format('jYYYY/jMM/jDD');
        const to = nowJ.clone().endOf('jMonth').format('jYYYY/jMM/jDD');

        const res = await apiFetch(`/api/reports/financial-overview?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
        const js = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && js?.success !== false) {
          const v = Number(js?.data?.sales?.productSalesTotal ?? 0);
          const profit = js?.data?.profit || {};
          setProductSalesTotal(Number.isFinite(v) ? v : 0);
          setManagerFinancePulse({
            realizedProfit: Number(profit?.realizedProfit ?? 0) || 0,
            realizedRevenue: Number(profit?.realizedRevenue ?? 0) || 0,
            realizedCost: Number(profit?.realizedCost ?? 0) || 0,
            unrecognizedProfit: Number(profit?.unrecognizedProfit ?? 0) || 0,
            collectionRate: Number(profit?.collectionRate ?? 0) || 0,
          });
        }
      } catch {
        // no access / network issue -> keep card at 0
      } finally {
        if (!cancelled) setProductSalesLoading(false);
      }
    })();
    return () => {
      cancelled = true
    };
  }, [token]);

  useEffect(() => {
    const timer = window.setInterval(() => setLiveNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === CLOCK_WIDGET_PREFS_KEY) setClockPrefs(loadClockWidgetPrefs());
      if (event.key === DASHBOARD_FIXED_SECTIONS_KEY) setFixedSectionPrefs(loadDashboardFixedSectionPrefs());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DASHBOARD_FIXED_SECTIONS_KEY, JSON.stringify(fixedSectionPrefs));
    } catch {
      // local preference only; ignore storage failures
    }
  }, [fixedSectionPrefs]);

  const liveMoment = useMemo(() => moment(liveNow).locale('fa'), [liveNow]);
  const dueAmountTotal = useMemo(() => dueItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [dueItems]);
  const todayIso = moment().format('YYYY-MM-DD');
  const todayRevenue = Number(dashboardData?.kpis?.revenueToday ?? 0);
  const todayJalali = moment().locale('fa').format('jYYYY/jMM/jDD');
  const dueTodayCount = dueItems.filter((item) => String(item.dueDate || '').slice(0, 10) === todayJalali).length;
  const openUrgentCount = dueItems.length;
  const hasRevenuePulse = todayRevenue > 0;
  const hasDueTodayPulse = dueTodayCount > 0;
  const hasUrgentPulse = openUrgentCount > 0;
  const managerPulseItems = [
    {
      key: 'today-revenue',
      label: 'فروش امروز',
      value: formatPriceForStats(todayRevenue),
      hint: 'نمای لحظه‌ای فروش',
      icon: 'fa-solid fa-bolt',
      tone: 'emerald',
    },
    {
      key: 'realized-profit',
      label: 'سود تحقق‌یافته ماه',
      value: formatPriceForStats(managerFinancePulse.realizedProfit),
      hint: `پایه وصول: ${formatPriceForStats(managerFinancePulse.realizedRevenue)}`,
      icon: 'fa-solid fa-sack-dollar',
      tone: 'sky',
    },
    {
      key: 'collection-rate',
      label: 'نرخ وصول ماه',
      value: formatPercentForStats(managerFinancePulse.collectionRate),
      hint: `مانده سود ثبت‌نشده: ${formatPriceForStats(managerFinancePulse.unrecognizedProfit)}`, 
      icon: 'fa-solid fa-chart-simple',
      tone: 'violet',
    },
  ];

  const liveClock = useMemo(() => {
    const hour = Number(liveMoment.format('HH'));
    const minute = Number(liveMoment.format('mm'));
    const second = Number(liveMoment.format('ss'));
    const hourMinute = liveMoment.format('HH:mm');
    const isNight = hour >= 19 || hour < 6;
    const dayPart = hour < 6 ? 'بامداد' : hour < 12 ? 'صبح' : hour < 17 ? 'بعدازظهر' : 'شب';
    const greeting = hour < 6 ? 'آغاز منظم برای یک روز پرفروش' : hour < 12 ? 'صبح بخیر؛ فروش امروز را منظم شروع کنید' : hour < 17 ? 'ظهر بخیر؛ روند فروش را حفظ کنید' : 'شب بخیر؛ جمع‌بندی امروز را کامل کنید';

    const totalMinutes = hour * 60 + minute;
    const openMinute = 9 * 60;
    const closeMinute = 22 * 60;
    const isStoreOpen = totalMinutes >= openMinute && totalMinutes < closeMinute;
    const minutesUntilClose = isStoreOpen ? Math.max(0, closeMinute - totalMinutes) : 0;
    const minutesUntilOpen = !isStoreOpen ? (totalMinutes < openMinute ? openMinute - totalMinutes : 24 * 60 - totalMinutes + openMinute) : 0;
    const formatDuration = (minutesValue: number) => {
      const hoursValue = Math.floor(minutesValue / 60);
      const remainingMinutes = minutesValue % 60;
      if (hoursValue <= 0) return `${remainingMinutes} دقیقه`;
      if (remainingMinutes === 0) return `${hoursValue} ساعت`;
      return `${hoursValue} ساعت و ${remainingMinutes} دقیقه`;
    };
    const effectiveStoreOpen = clockPrefs.adaptiveTone ? isStoreOpen : true;
    const storeStatus = effectiveStoreOpen ? 'فروشگاه فعال است' : 'فروشگاه خارج از ساعت کاری است';
    const storeStatusTone = effectiveStoreOpen ? 'live' : 'calm';
    const storeStatusDetail = effectiveStoreOpen ? `تا پایان شیفت ${formatDuration(minutesUntilClose)} باقی مانده` : `تا شروع شیفت ${formatDuration(minutesUntilOpen)} باقی مانده`;
    const shiftLabel = hour < 12 ? 'شیفت آغاز' : hour < 17 ? 'شیفت میانی' : hour < 22 ? 'شیفت پایانی' : 'حالت پس از شیفت';
    const shiftWindow = '09:00 تا 22:00';
    const minuteLabel = minute < 20 ? 'شروع ساعت' : minute < 40 ? 'میانه ساعت' : 'پایان ساعت';
    const storeTempo = effectiveStoreOpen
      ? (hour < 12 ? 'ریتم شروع روز' : hour < 17 ? 'پیک عملیات روز' : 'جمع‌بندی فروش')
      : (hour < openMinute / 60 ? 'آماده‌سازی قبل از شروع' : 'بستن حساب‌ها و جمع‌بندی');

    const revenueTier = todayRevenue >= 50000000 ? 'excellent' : todayRevenue >= 10000000 ? 'good' : todayRevenue > 0 ? 'warming' : 'cold';
    const dueTier = openUrgentCount >= 4 ? 'high' : openUrgentCount > 0 ? 'medium' : 'clear';
    const needsAttention = openUrgentCount > 0 && (todayRevenue <= 0 || revenueTier === 'warming');
    const performanceHeadline = !effectiveStoreOpen
      ? 'خارج از ساعت کاری؛ آماده‌سازی و جمع‌بندی در اولویت است'
      : revenueTier === 'excellent'
        ? 'فروش امروز در مدار ممتاز قرار دارد'
        : revenueTier === 'good'
          ? 'ریتم فروش امروز سالم و امیدوارکننده است'
          : revenueTier === 'warming'
            ? 'فروش امروز آغاز شده و نیاز به شتاب بیشتر دارد'
            : 'هنوز فروش امروز روشن نشده؛ شروع سریع پیشنهاد می‌شود';
    const performanceHint = dueTier === 'high'
      ? `هم‌زمان ${formatNumberForStats(openUrgentCount)} پیگیری باز وجود دارد؛ وصول مطالبات و پاسخ سریع در اولویت باشد.`
      : dueTier === 'medium'
        ? `${formatNumberForStats(openUrgentCount)} پیگیری باز ثبت شده است؛ مرور سریع آن‌ها ریسک تأخیر را کاهش می‌دهد.`
        : revenueTier === 'excellent'
          ? 'فضا برای حفظ شتاب فروش و ثبت اطلاعات دقیق عملیات امروز مناسب است.'
          : revenueTier === 'good'
            ? 'اکنون زمان مناسبی برای تثبیت فروش و نهایی‌کردن پیگیری‌های کوتاه است.'
            : 'یک پیگیری هدفمند یا پیشنهاد فروش می‌تواند جریان امروز را فعال‌تر کند.';
    const smartAlertTitle = needsAttention
      ? 'هشدار مدیریتی'
      : revenueTier === 'excellent'
        ? 'عملکرد ممتاز'
        : dueTier === 'clear'
          ? 'وضعیت کنترل‌شده'
          : 'پایش وضعیت روز';
    const smartAlertText = needsAttention
      ? 'پیشنهاد می‌شود ابتدا پیگیری‌های باز امروز نهایی شوند و سپس یک اقدام فروش هدفمند انجام شود.'
      : revenueTier === 'excellent'
        ? 'فروش امروز از سطح هدف اولیه عبور کرده است؛ اکنون دقت ثبت و کیفیت تحویل را حفظ کنید.'
        : dueTier === 'clear'
          ? 'در حال حاضر پیگیری فوری ثبت نشده است؛ عملیات فروش و ثبت دقیق اطلاعات را ادامه دهید.'
          : 'وضعیت کلی تحت کنترل است؛ روند پیگیری‌ها را منظم ادامه دهید.';
    const smartToneClasses = needsAttention
      ? 'border-amber-200/80 bg-amber-50/88 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100'
      : revenueTier === 'excellent'
        ? 'border-emerald-200/80 bg-emerald-50/88 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100'
        : 'border-sky-200/80 bg-sky-50/88 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100';
    const smartToneIcon = needsAttention ? 'fa-triangle-exclamation' : revenueTier === 'excellent' ? 'fa-bolt' : 'fa-wave-square';
    const performanceAccent = needsAttention
      ? 'from-amber-400/30 via-orange-300/10 to-transparent dark:from-amber-500/18 dark:via-orange-400/8'
      : revenueTier === 'excellent'
        ? 'from-emerald-400/30 via-cyan-300/10 to-transparent dark:from-emerald-500/18 dark:via-cyan-400/8'
        : 'from-sky-400/26 via-indigo-300/10 to-transparent dark:from-sky-500/18 dark:via-indigo-400/8';
    const statusAccent = effectiveStoreOpen ? performanceAccent : 'from-indigo-400/24 via-fuchsia-300/10 to-transparent dark:from-indigo-500/18 dark:via-fuchsia-400/8';
    const ringGlow = clockPrefs.cinematicGlow
      ? (effectiveStoreOpen
          ? (needsAttention
              ? 'shadow-[0_0_0_1px_rgba(245,158,11,0.18),0_18px_46px_rgba(245,158,11,0.18)]'
              : revenueTier === 'excellent'
                ? 'shadow-[0_0_0_1px_rgba(16,185,129,0.18),0_18px_46px_rgba(16,185,129,0.18)]'
                : 'shadow-[0_0_0_1px_rgba(14,165,233,0.16),0_18px_46px_rgba(14,165,233,0.18)]')
          : 'shadow-[0_0_0_1px_rgba(99,102,241,0.18),0_18px_46px_rgba(99,102,241,0.18)]')
      : 'shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_14px_34px_rgba(15,23,42,0.12)]';
    const secondProgress = (second / 60) * 100;
    const hourAngle = ((hour % 12) + minute / 60 + second / 3600) * 30;
    const minuteAngle = (minute + second / 60) * 6;
    const secondAngle = second * 6;
    const smartInsights = [
      {
        key: 'sales',
        icon: 'fa-sack-dollar',
        label: 'شاخص فروش',
        value: revenueTier === 'excellent' ? 'فوق‌العاده' : revenueTier === 'good' ? 'پایدار' : revenueTier === 'warming' ? 'در حال گرم‌شدن' : 'خاموش',
      },
      {
        key: 'followup',
        icon: 'fa-bell-concierge',
        label: 'پیگیری روز',
        value: dueTier === 'high' ? 'فشرده' : dueTier === 'medium' ? 'کنترل‌شده' : 'آزاد',
      },
      {
        key: 'focus',
        icon: 'fa-crosshairs',
        label: 'اولویت بعدی',
        value: needsAttention ? 'وصول و شروع فروش' : revenueTier === 'excellent' ? 'حفظ شتاب' : 'ثبت اطلاعات و تبدیل سریع',
      },
    ];
    const toneMode = !isStoreOpen ? 'after-hours' : needsAttention ? 'attention' : revenueTier === 'excellent' ? 'peak' : revenueTier === 'good' ? 'steady' : 'soft';
    const shellToneClasses = toneMode === 'attention'
      ? 'border-amber-200 bg-[linear-gradient(145deg,rgba(255,251,235,0.98),rgba(255,247,237,0.96),rgba(254,243,199,0.78))] ring-amber-100/90 dark:border-amber-500/20 dark:bg-[linear-gradient(145deg,rgba(27,16,2,0.98),rgba(41,24,7,0.98),rgba(69,26,3,0.82))] dark:ring-amber-500/10'
      : toneMode === 'peak'
        ? 'border-emerald-200 bg-[linear-gradient(145deg,rgba(236,253,245,0.98),rgba(240,253,250,0.96),rgba(224,242,254,0.84))] ring-emerald-100/90 dark:border-emerald-500/20 dark:bg-[linear-gradient(145deg,rgba(2,20,13,0.98),rgba(6,31,23,0.98),rgba(8,47,73,0.9))] dark:ring-emerald-500/10'
        : toneMode === 'steady'
          ? 'border-sky-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(239,246,255,0.96),rgba(224,242,254,0.88))] ring-sky-100/90 dark:border-sky-500/20 dark:bg-[linear-gradient(145deg,rgba(2,6,23,0.98),rgba(15,23,42,0.98),rgba(7,36,55,0.88))] dark:ring-sky-500/10'
          : toneMode === 'soft'
            ? 'border-indigo-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96),rgba(238,242,255,0.88))] ring-indigo-100/90 dark:border-indigo-500/20 dark:bg-[linear-gradient(145deg,rgba(2,6,23,0.98),rgba(17,24,39,0.98),rgba(30,27,75,0.86))] dark:ring-indigo-500/10'
            : 'border-slate-200 bg-[linear-gradient(145deg,rgba(248,250,252,0.98),rgba(241,245,249,0.96),rgba(224,231,255,0.84))] ring-slate-100/90 dark:border-slate-700/70 dark:bg-[linear-gradient(145deg,rgba(2,6,23,0.98),rgba(15,23,42,0.98),rgba(30,41,59,0.9))] dark:ring-slate-700/70';
    const heroEyebrowTone = toneMode === 'attention'
      ? 'border-amber-200 bg-amber-50/90 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200'
      : toneMode === 'peak'
        ? 'border-emerald-200 bg-emerald-50/90 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
        : toneMode === 'after-hours'
          ? 'border-indigo-200 bg-indigo-50/90 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200'
          : 'border-slate-200 bg-white/88 text-slate-600 dark:border-slate-700/80 dark:bg-slate-950/70 dark:text-slate-200';
    const accentHaloClass = toneMode === 'attention'
      ? 'bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.22),transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.24),transparent_72%)]'
      : toneMode === 'peak'
        ? 'bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.2),transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.24),transparent_72%)]'
        : toneMode === 'after-hours'
          ? 'bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.18),transparent_72%)] dark:bg-[radial-gradient(circle_at_center,rgba(129,140,248,0.2),transparent_72%)]'
          : 'bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.18),transparent_72%)] dark:bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.2),transparent_72%)]';
    const ambientRingStroke = toneMode === 'attention' ? 'rgba(245,158,11,0.34)' : toneMode === 'peak' ? 'rgba(16,185,129,0.34)' : toneMode === 'after-hours' ? 'rgba(129,140,248,0.3)' : 'rgba(56,189,248,0.28)';
    const ambientRingGlowClass = toneMode === 'attention'
      ? 'shadow-[0_0_0_10px_rgba(251,191,36,0.06),0_0_40px_rgba(245,158,11,0.14)] dark:shadow-[0_0_0_12px_rgba(245,158,11,0.08),0_0_46px_rgba(245,158,11,0.16)]'
      : toneMode === 'peak'
        ? 'shadow-[0_0_0_10px_rgba(16,185,129,0.06),0_0_40px_rgba(16,185,129,0.14)] dark:shadow-[0_0_0_12px_rgba(16,185,129,0.08),0_0_46px_rgba(16,185,129,0.16)]'
        : toneMode === 'after-hours'
          ? 'shadow-[0_0_0_10px_rgba(129,140,248,0.06),0_0_40px_rgba(99,102,241,0.12)] dark:shadow-[0_0_0_12px_rgba(129,140,248,0.08),0_0_46px_rgba(99,102,241,0.15)]'
          : 'shadow-[0_0_0_10px_rgba(56,189,248,0.05),0_0_40px_rgba(56,189,248,0.12)] dark:shadow-[0_0_0_12px_rgba(56,189,248,0.07),0_0_46px_rgba(56,189,248,0.15)]';
    const digitalTimeTone = toneMode === 'attention'
      ? 'text-amber-950 drop-shadow-[0_14px_34px_rgba(245,158,11,0.18)] dark:text-amber-50 dark:drop-shadow-[0_14px_34px_rgba(245,158,11,0.18)]'
      : toneMode === 'peak'
        ? 'text-emerald-950 drop-shadow-[0_14px_34px_rgba(16,185,129,0.16)] dark:text-emerald-50 dark:drop-shadow-[0_14px_34px_rgba(16,185,129,0.16)]'
        : toneMode === 'after-hours'
          ? 'text-slate-950 drop-shadow-[0_14px_34px_rgba(99,102,241,0.16)] dark:text-indigo-50 dark:drop-shadow-[0_14px_34px_rgba(99,102,241,0.16)]'
          : 'text-slate-950 drop-shadow-[0_14px_34px_rgba(56,189,248,0.14)] dark:text-white dark:drop-shadow-[0_14px_34px_rgba(56,189,248,0.14)]';
    const secondsToneClasses = toneMode === 'attention'
      ? 'border-amber-200 bg-amber-50/92 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200'
      : toneMode === 'peak'
        ? 'border-emerald-200 bg-emerald-50/92 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
        : toneMode === 'after-hours'
          ? 'border-indigo-200 bg-indigo-50/92 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200'
          : 'border-slate-200 bg-white/92 text-slate-700 dark:border-slate-700/80 dark:bg-slate-950/72 dark:text-slate-200';
    const analogShellToneClasses = toneMode === 'attention'
      ? 'border-amber-200/80 bg-[radial-gradient(circle_at_30%_30%,rgba(255,251,235,0.98),rgba(255,247,237,0.76),rgba(254,243,199,0.42))] ring-amber-100/80 dark:border-amber-500/20 dark:bg-[radial-gradient(circle_at_30%_30%,rgba(41,24,7,0.98),rgba(27,16,2,0.96),rgba(69,26,3,0.82))] dark:ring-amber-500/10'
      : toneMode === 'peak'
        ? 'border-emerald-200/80 bg-[radial-gradient(circle_at_30%_30%,rgba(236,253,245,0.98),rgba(240,253,250,0.76),rgba(186,230,253,0.42))] ring-emerald-100/80 dark:border-emerald-500/20 dark:bg-[radial-gradient(circle_at_30%_30%,rgba(6,31,23,0.98),rgba(2,20,13,0.96),rgba(8,47,73,0.82))] dark:ring-emerald-500/10'
        : toneMode === 'after-hours'
          ? 'border-indigo-200/80 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.98),rgba(238,242,255,0.76),rgba(224,231,255,0.46))] ring-indigo-100/80 dark:border-indigo-500/20 dark:bg-[radial-gradient(circle_at_30%_30%,rgba(30,41,59,0.98),rgba(15,23,42,0.96),rgba(30,27,75,0.84))] dark:ring-indigo-500/10'
          : 'border-slate-200/80 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.98),rgba(224,242,254,0.74),rgba(191,219,254,0.55))] ring-slate-200/70 dark:border-slate-700/80 dark:bg-[radial-gradient(circle_at_30%_30%,rgba(30,41,59,0.98),rgba(15,23,42,0.96),rgba(8,47,73,0.9))] dark:ring-slate-700/70';
    return {
      time: liveMoment.format('HH:mm:ss'),
      hourMinute,
      minute: String(minute).padStart(2, '0'),
      minuteLabel,
      second: String(second).padStart(2, '0'),
      date: liveMoment.format('jYYYY/jMM/jDD'),
      gregorianDate: liveMoment.format('YYYY/MM/DD'),
      weekday: liveMoment.format('dddd'),
      monthLabel: liveMoment.format('jD jMMMM'),
      dayPart,
      greeting,
      isNight,
      isStoreOpen: effectiveStoreOpen,
      storeStatus,
      storeStatusTone,
      storeStatusDetail,
      shiftLabel,
      shiftWindow,
      storeTempo,
      performanceHeadline,
      performanceHint,
      smartAlertTitle,
      smartAlertText,
      smartToneClasses,
      smartToneIcon,
      smartInsights,
      toneMode,
      shellToneClasses,
      heroEyebrowTone,
      accentHaloClass,
      ambientRingStroke: clockPrefs.ambientRing ? ambientRingStroke : 'transparent',
      ambientRingGlowClass: clockPrefs.ambientRing ? ambientRingGlowClass : '',
      digitalTimeTone,
      secondsToneClasses,
      analogShellToneClasses,
      statusAccent,
      ringGlow,
      secondProgress,
      analog: {
        hourAngle,
        minuteAngle,
        secondAngle,
      },
    };
  }, [clockPrefs.adaptiveTone, clockPrefs.ambientRing, clockPrefs.cinematicGlow, dueTodayCount, liveMoment, openUrgentCount, todayRevenue]);

const ctx: DashboardWidgetContext = useMemo(
    () => ({
      token,
      authReady,
      isDark,
      showLoadingSkeletons,
      dashboardData,
      activeTimeframe,
      setActiveTimeframe,
      chartStyle,
      setChartStyle,
      assetLoading,
      assetValue,
      assetBreakdown,
      dueLoading,
      dueItems,
      dueRange,
      productSalesLoading,
      productSalesTotal,
      formatPrice: formatPriceForStats,
      formatNumber: formatNumberForStats,
    }),
    [
      token,
      authReady,
      isDark,
      showLoadingSkeletons,
      dashboardData,
      activeTimeframe,
      chartStyle,
      assetLoading,
      assetValue,
      assetBreakdown,
      dueLoading,
      dueItems,
      dueRange,
      productSalesLoading,
      productSalesTotal,
    ],
  );

  const isWidgetFeatureEnabled = React.useCallback((id: WidgetId) => {
    const featureKey = WIDGET_REGISTRY[id]?.featureKey;
    return !featureKey || isFeatureEnabled(featureKey);
  }, [isFeatureEnabled]);

  const enabledWidgets = useMemo(
    () => ALL_WIDGETS.filter((widget) => isManagedDashboardWidget(widget.id) && (!widget.featureKey || featureFlags[widget.featureKey] !== false)),
    [featureFlags],
  );

  // Widgets currently on dashboard؛ ویجت‌های ماژول خاموش حتی mount نمی‌شوند.
  const usedWidgetIds = useMemo(
    () => layout.order.filter((id) => Boolean(WIDGET_REGISTRY[id]) && isManagedDashboardWidget(id) && isWidgetFeatureEnabled(id)),
    [layout.order, isWidgetFeatureEnabled],
  );

  const fixedOperationalWidgetIds = useMemo(
    () => FIXED_DASHBOARD_OPERATIONAL_WIDGET_IDS.filter((id) => Boolean(WIDGET_REGISTRY[id]) && isWidgetFeatureEnabled(id)),
    [isWidgetFeatureEnabled],
  );

  const availableToAdd = useMemo(() => {
    const used = new Set(usedWidgetIds);
    return enabledWidgets.filter((w) => !used.has(w.id));
  }, [usedWidgetIds, enabledWidgets]);

  const hiddenWidgets = useMemo(() => {
    const used = new Set(usedWidgetIds);
    return enabledWidgets.filter((w) => !used.has(w.id));
  }, [usedWidgetIds, enabledWidgets]);

  const visibleWidgets = useMemo(() => {
    return usedWidgetIds.map((id) => WIDGET_REGISTRY[id]).filter(Boolean);
  }, [usedWidgetIds]);

  const widgetCategories = useMemo(() => {
    const cats = Array.from(new Set(enabledWidgets.map((widget) => widget.category).filter(Boolean)));
    return cats.sort((a, b) => String(a).localeCompare(String(b), 'fa'));
  }, [enabledWidgets]);

  const normalizeWidgetSearch = (value: string) => value.trim().toLowerCase();

  const widgetMatchesFilters = (widget: (typeof ALL_WIDGETS)[number]) => {
    const matchesCategory = widgetCategoryFilter === 'all' || widget.category === widgetCategoryFilter;
    const search = normalizeWidgetSearch(widgetSearch);
    if (!matchesCategory) return false;
    if (!search) return true;
    return [widget.title, widget.category, widget.id]
      .filter(Boolean)
      .some((part) => String(part).toLowerCase().includes(search));
  };

  const filteredVisibleWidgets = useMemo(() => visibleWidgets.filter(widgetMatchesFilters), [visibleWidgets, widgetSearch, widgetCategoryFilter]);
  const filteredHiddenWidgets = useMemo(() => hiddenWidgets.filter(widgetMatchesFilters), [hiddenWidgets, widgetSearch, widgetCategoryFilter]);

  const selectedCategoryWidgets = useMemo(() => {
    if (widgetCategoryFilter === 'all') return [] as (typeof ALL_WIDGETS)[number][];
    return enabledWidgets.filter((widget) => widget.category === widgetCategoryFilter);
  }, [widgetCategoryFilter]);

  const removableFilteredVisibleWidgets = useMemo(
    () => filteredVisibleWidgets.filter((widget) => widget.canRemove !== false),
    [filteredVisibleWidgets],
  );

  const scheduleSave = (nextLayout: DashboardLayoutV2) => {
    // local cache
    try {
      localStorage.setItem(layoutStorageKey, JSON.stringify(nextLayout));
    } catch {
      // ignore
    }

    if (!token) return;

    const payload = JSON.stringify(nextLayout);
    if (payload === lastSavedHash.current) return;

    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaveState('saving');
      try {
        const res = await apiFetch(DASHBOARD_LAYOUT_ENDPOINT, {
          method: 'PUT',
          body: JSON.stringify({ layouts: nextLayout }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'خطا در ذخیره تغییرات چیدمان داشبورد');

        lastSavedHash.current = payload;
        setSaveState('saved');
        if (saveStateTimer.current) window.clearTimeout(saveStateTimer.current);
        saveStateTimer.current = window.setTimeout(() => setSaveState('idle'), 1400);
      } catch (e: any) {
        setSaveState('error');
        setNotification({ type: 'warning', text: e?.message || 'ذخیره تغییرات چیدمان داشبورد با خطا در عملیات مواجه شد.' });
      }
    }, 650);
  };

  const normalizeLayoutV2 = (raw: any): DashboardLayoutV2 => {
    const def = DEFAULT_DASHBOARD_LAYOUT;

    if (raw && typeof raw === 'object' && raw.version === 2) {
      const order = Array.isArray(raw.order) ? raw.order.map(String) : [];
      const cleaned = order.filter((id) => Boolean(WIDGET_REGISTRY[id as WidgetId]) && isManagedDashboardWidget(id as WidgetId)) as WidgetId[];
      const unique = uniq(cleaned);
      const withMust = ensureMandatory(unique);

      const sizesRaw = raw.sizes && typeof raw.sizes === 'object' ? raw.sizes : {};
      const sizes: Record<string, SizePreset> = { ...def.sizes };
      for (const id of withMust) {
        const s = sizesRaw[id];
        const preset = (['tile', 'wide', 'tall', 'hero'] as const).includes(s) ? (s as SizePreset) : undefined;
        sizes[id] = preset || sizes[id] || WIDGET_REGISTRY[id].defaultPreset;
      }
      return { version: 2, order: withMust.length ? withMust : def.order, sizes };
    }

    return def;
  };

  const loadLayout = async () => {
    if (!token) return;

    // local fast path
    try {
      const cached = localStorage.getItem(layoutStorageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const normalized = normalizeLayoutV2(parsed);
        setLayout(normalized);
        lastSavedHash.current = JSON.stringify(normalized);
      }
    } catch {
      // ignore
    }

    try {
      const res = await apiFetch(DASHBOARD_LAYOUT_ENDPOINT);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'خطا در دریافت چیدمان داشبورد');

      const loaded = json?.data?.layouts ?? json?.data ?? null;
      if (loaded) {
        const normalized = normalizeLayoutV2(loaded);
        setLayout(normalized);
        lastSavedHash.current = JSON.stringify(normalized);
        try {
          localStorage.setItem(layoutStorageKey, JSON.stringify(normalized));
        } catch {}
      } else {
        setLayout(DEFAULT_DASHBOARD_LAYOUT);
        lastSavedHash.current = JSON.stringify(DEFAULT_DASHBOARD_LAYOUT);
        try {
          localStorage.setItem(layoutStorageKey, JSON.stringify(DEFAULT_DASHBOARD_LAYOUT));
        } catch {}
      }
    } catch (e: any) {
      setLayout(DEFAULT_DASHBOARD_LAYOUT);
      setNotification({ type: 'warning', text: e?.message || 'چیدمان داشبورد بارگذاری نشد (از حالت پیش‌فرض استفاده شد).' });
    } finally {
      setLayoutLoaded(true);
    }
  };

  const resetLayout = () => {
    setLayout(DEFAULT_DASHBOARD_LAYOUT);
    scheduleSave(DEFAULT_DASHBOARD_LAYOUT);
  };


  const visibleFixedSections = useMemo(
    () => fixedSectionPrefs.order.filter((id) => !fixedSectionPrefs.hidden.includes(id)),
    [fixedSectionPrefs],
  );

  const setFixedSectionVisibility = (id: DashboardFixedSectionId, visible: boolean) => {
    setFixedSectionPrefs((prev) => {
      const hiddenSet = new Set(prev.hidden);
      if (visible) hiddenSet.delete(id);
      else hiddenSet.add(id);
      return normalizeDashboardFixedSectionPrefs({ ...prev, hidden: Array.from(hiddenSet) });
    });
  };

  const moveFixedSection = (id: DashboardFixedSectionId, direction: 'up' | 'down') => {
    setFixedSectionPrefs((prev) => {
      const order = [...prev.order];
      const index = order.indexOf(id);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= order.length) return prev;
      [order[index], order[target]] = [order[target], order[index]];
      return normalizeDashboardFixedSectionPrefs({ ...prev, order });
    });
  };

  const resetFixedSections = () => {
    setFixedSectionPrefs(DEFAULT_DASHBOARD_FIXED_SECTION_PREFS);
  };

  const confirmAndResetLayout = async () => {
    const confirmed = await confirmAction({
      title: 'بازنشانی کامل چیدمان داشبورد',
      description: 'چیدمان، اندازه و ترتیب همه کارت‌ها به حالت پیش‌فرض برمی‌گردد و تغییرات ذخیره می‌شود.',
      confirmText: 'بازنشانی داشبورد',
      cancelText: 'انصراف',
      tone: 'danger',
      iconClass: 'fa-solid fa-rotate-left',
      summaryItems: [
        { label: 'کارت‌های تحت‌تأثیر', value: formatNumberForStats(enabledWidgets.length) },
        { label: 'دامنه عملیات', value: 'کل داشبورد' },
        { label: 'عملیات', value: 'بازنشانی کامل چیدمان' },
      ],
    });
    if (!confirmed) return;
    resetLayout();
  };

  const toggleEditing = () => {
    setEditing((prev) => {
      const next = !prev;
      if (!next) setCustomizePanelOpen(false);
      if (prev && !next) scheduleSave(layout);
      return next;
    });
  };

  const addWidget = (id: WidgetId) => {
    const def = WIDGET_REGISTRY[id];
    if (!def) return;

    setLayout((prev) => {
      if (prev.order.includes(id)) return prev;
      const next: DashboardLayoutV2 = {
        version: 2,
        order: ensureMandatory([...prev.order, id]),
        sizes: { ...prev.sizes, [id]: prev.sizes[id] || def.defaultPreset },
      };
      scheduleSave(next);
      return next;
    });

    setAddModalOpen(false);
  };

  const removeWidget = (id: WidgetId) => {
    const def = WIDGET_REGISTRY[id];
    if (def && def.canRemove === false) return;

    setLayout((prev) => {
      const next: DashboardLayoutV2 = {
        version: 2,
        order: ensureMandatory(prev.order.filter((x) => x !== id)),
        sizes: { ...prev.sizes },
      };
      scheduleSave(next);
      return next;
    });
  };

  const toggleSize = (id: WidgetId) => {
    setLayout((prev) => {
      const current = prev.sizes[id] || WIDGET_REGISTRY[id]?.defaultPreset || 'tile';
      const nextSize = cyclePreset(current);
      const next: DashboardLayoutV2 = {
        version: 2,
        order: prev.order,
        sizes: { ...prev.sizes, [id]: nextSize },
      };
      scheduleSave(next);
      return next;
    });
  };

  const setWidgetVisibility = (id: WidgetId, visible: boolean) => {
    if (visible) {
      addWidget(id);
      return;
    }
    removeWidget(id);
  };

  const setWidgetSize = (id: WidgetId, size: SizePreset) => {
    setLayout((prev) => {
      const next: DashboardLayoutV2 = {
        version: 2,
        order: prev.order,
        sizes: { ...prev.sizes, [id]: size },
      };
      scheduleSave(next);
      return next;
    });
  };

  const setManyWidgetVisibility = (ids: WidgetId[], visible: boolean) => {
    const uniqueIds = uniq(ids.filter((id) => Boolean(WIDGET_REGISTRY[id])) as WidgetId[]);
    if (!uniqueIds.length) return;

    setLayout((prev) => {
      const currentSet = new Set(prev.order);
      let nextOrder = [...prev.order];
      const nextSizes = { ...prev.sizes } as DashboardLayoutV2['sizes'];

      if (visible) {
        for (const id of uniqueIds) {
          if (currentSet.has(id)) continue;
          nextOrder.push(id);
          currentSet.add(id);
          if (!nextSizes[id]) nextSizes[id] = WIDGET_REGISTRY[id].defaultPreset;
        }
      } else {
        const removableIds = new Set(uniqueIds.filter((id) => WIDGET_REGISTRY[id]?.canRemove !== false));
        nextOrder = nextOrder.filter((id) => !removableIds.has(id));
      }

      const next: DashboardLayoutV2 = {
        version: 2,
        order: ensureMandatory(nextOrder),
        sizes: nextSizes,
      };
      scheduleSave(next);
      return next;
    });
  };

  const applyVisibilityToCategory = (category: string, visible: boolean) => {
    const ids = enabledWidgets.filter((widget) => widget.category === category).map((widget) => widget.id);
    setManyWidgetVisibility(ids, visible);
  };

  const resetCategoryLayout = (category: string) => {
    const categoryWidgets = enabledWidgets.filter((widget) => widget.category === category);
    if (!categoryWidgets.length) return;

    setLayout((prev) => {
      const categoryIds = categoryWidgets.map((widget) => widget.id);
      const categoryIdSet = new Set(categoryIds);
      const defaultCategoryOrder = DEFAULT_DASHBOARD_LAYOUT.order.filter((id) => categoryIdSet.has(id));
      const existingWithoutCategory = prev.order.filter((id) => !categoryIdSet.has(id));
      const insertionIndex = existingWithoutCategory.length;
      const nextOrder = ensureMandatory([
        ...existingWithoutCategory.slice(0, insertionIndex),
        ...defaultCategoryOrder,
        ...existingWithoutCategory.slice(insertionIndex),
      ]);

      const nextSizes = { ...prev.sizes } as DashboardLayoutV2['sizes'];
      for (const widget of categoryWidgets) {
        nextSizes[widget.id] = DEFAULT_DASHBOARD_LAYOUT.sizes[widget.id] || widget.defaultPreset;
      }

      const next: DashboardLayoutV2 = {
        version: 2,
        order: nextOrder,
        sizes: nextSizes,
      };
      scheduleSave(next);
      return next;
    });
  };

  const confirmBulkVisibilityChange = async (options: {
    ids: WidgetId[];
    visible: boolean;
    title: string;
    description: string;
    categoryLabel?: string;
    scopeLabel?: string;
  }) => {
    const ids = uniq(options.ids.filter((id) => Boolean(WIDGET_REGISTRY[id]) && isWidgetFeatureEnabled(id)) as WidgetId[]);
    if (!ids.length) return;
    const removableIds = ids.filter((id) => WIDGET_REGISTRY[id]?.canRemove !== false);
    const fixedIds = ids.filter((id) => WIDGET_REGISTRY[id]?.canRemove === false);
    const confirmed = await confirmAction({
      title: options.title,
      description: options.description,
      confirmText: options.visible ? 'اعمال نمایش' : 'اعمال مخفی‌سازی',
      cancelText: 'انصراف',
      tone: options.visible ? 'info' : 'danger',
      iconClass: options.visible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash',
      summaryItems: [
        { label: 'کارت‌های تحت‌تأثیر', value: formatNumberForStats(ids.length) },
        { label: 'دامنه عملیات', value: options.scopeLabel || (options.categoryLabel ? `دسته ${options.categoryLabel}` : 'فیلتر فعلی') },
        ...(options.categoryLabel ? [{ label: 'دسته انتخابی', value: options.categoryLabel }] : []),
        { label: options.visible ? 'کارت‌های قابل‌نمایش' : 'کارت‌های قابل‌مخفی‌سازی', value: formatNumberForStats(removableIds.length) },
        ...(fixedIds.length ? [{ label: 'کارت‌های ثابت', value: formatNumberForStats(fixedIds.length) }] : []),
      ],
    });
    if (!confirmed) return;
    setManyWidgetVisibility(ids, options.visible);
  };

  const confirmCategoryVisibilityChange = async (category: string, visible: boolean) => {
    const widgets = enabledWidgets.filter((widget) => widget.category === category);
    const ids = widgets.map((widget) => widget.id);
    if (!ids.length) return;
    await confirmBulkVisibilityChange({
      ids,
      visible,
      title: visible ? `نمایش همه کارت‌های ${category}` : `مخفی‌کردن کارت‌های ${category}`,
      description: visible
        ? `همه کارت‌های دسته ${category} دوباره در داشبورد نمایش داده می‌شوند و چیدمان فعلی حفظ خواهد شد.`
        : `همه کارت‌های قابل‌حذف در دسته ${category} از داشبورد مخفی می‌شوند. کارت‌های ثابت بدون تغییر می‌مانند.`,
      categoryLabel: category,
      scopeLabel: `همه کارت‌های دسته ${category}`,
    });
  };

  const confirmResetCategoryLayout = async (category: string) => {
    const widgets = enabledWidgets.filter((widget) => widget.category === category);
    if (!widgets.length) return;
    const confirmed = await confirmAction({
      title: `بازنشانی چیدمان دسته ${category}`,
      description: `ترتیب و اندازه کارت‌های دسته ${category} به حالت پیش‌فرض برمی‌گردد و تغییرات ذخیره می‌شود.`,
      confirmText: 'بازنشانی دسته',
      cancelText: 'انصراف',
      tone: 'warning',
      iconClass: 'fa-solid fa-rotate-left',
      summaryItems: [
        { label: 'دسته انتخابی', value: category },
        { label: 'کارت‌های تحت‌تأثیر', value: formatNumberForStats(widgets.length) },
        { label: 'عملیات', value: 'بازنشانی ترتیب و اندازه' },
      ],
    });
    if (!confirmed) return;
    resetCategoryLayout(category);
  };

  const moveWidgetWithinActiveList = (draggedId: WidgetId, targetId: WidgetId) => {
    if (!draggedId || !targetId || draggedId === targetId) return;
    setLayout((prev) => {
      const currentOrder = [...prev.order];
      const fromIndex = currentOrder.indexOf(draggedId);
      const toIndex = currentOrder.indexOf(targetId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return prev;

      currentOrder.splice(fromIndex, 1);
      currentOrder.splice(toIndex, 0, draggedId);

      const next: DashboardLayoutV2 = {
        version: 2,
        order: ensureMandatory(currentOrder),
        sizes: { ...prev.sizes },
      };
      scheduleSave(next);
      return next;
    });
  };

  const nudgeWidget = (id: WidgetId, direction: 'up' | 'down') => {
    setLayout((prev) => {
      const currentOrder = [...prev.order];
      const fromIndex = currentOrder.indexOf(id);
      if (fromIndex === -1) return prev;
      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= currentOrder.length) return prev;

      const swapId = currentOrder[toIndex] as WidgetId;
      currentOrder[fromIndex] = swapId;
      currentOrder[toIndex] = id;

      const next: DashboardLayoutV2 = {
        version: 2,
        order: ensureMandatory(currentOrder),
        sizes: { ...prev.sizes },
      };
      scheduleSave(next);
      return next;
    });
  };

  // --------------------
  // Data fetchers
  // --------------------
  const fetchDashboardData = async (period: ChartTimeframe['key']) => {
    if (!token) return;
    setLocalIsLoading(true);
    try {
      const res = await apiFetch(`/api/dashboard/summary?period=${period}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت خلاصه داشبورد');

      const normalizedChart = normalizeSalesChartData(json.data?.salesChartData, period);

      setDashboardData({
        kpis: json.data?.kpis,
        recentActivities: json.data?.recentActivities,
        salesChartData: normalizedChart,
      });
    } catch (error: any) {
      let displayMessage = 'در دریافت اطلاعات داشبورد خطای پیش‌بینی‌نشده رخ داد.';
      if (error.message) {
        if (error.message.includes('۴۰۳') || error.message.includes('توکن') || error.message.toLowerCase().includes('unauthorized')) {
          displayMessage = 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.';
          logout();
        } else if (error.message.toLowerCase().includes('failed to fetch')) {
          displayMessage = 'خطا در ارتباط با سرور. اتصال اینترنت خود را بررسی و ادامه کنید.';
        } else {
          displayMessage = error.message;
        }
      }
      setNotification({ type: 'error', text: displayMessage });
      setDashboardData(null);
    } finally {
      setLocalIsLoading(false);
    }
  };

  const fetchAssets = async () => {
    if (!token) return;
    setAssetLoading(true);
    try {
      const requests: Promise<Response>[] = [apiFetch('/api/products')];
      if (isFeatureEnabled('mobile_phones')) requests.push(apiFetch('/api/phones'));
      const [prodRes, phoneRes] = await Promise.all(requests);
      const prodJson = await prodRes.json();
      const phoneJson = phoneRes ? await phoneRes.json() : { success: true, data: [] };

      if (!prodRes.ok || !prodJson.success) throw new Error(prodJson.message || 'خطا در دریافت محصولات');
      if (phoneRes && (!phoneRes.ok || !phoneJson.success)) throw new Error(phoneJson.message || 'خطا در دریافت گوشی‌ها');

      const products: Product[] = prodJson.data || [];
      const phones: PhoneEntry[] = isFeatureEnabled('mobile_phones') ? (phoneJson.data || []) : [];

      const productsValue = products.reduce((sum, p) => sum + ((p.purchasePrice ?? 0) * (p.stock_quantity ?? 0)), 0);
      const productsCount = products.reduce((sum, p) => sum + (p.stock_quantity ?? 0), 0);

      const phonesInStock = phones.filter((ph) => ph.status === 'موجود در انبار');
      const phonesValue = phonesInStock.reduce((sum, ph) => sum + (Number(ph.purchasePrice ?? ph.salePrice) || 0), 0);
      const phonesCount = phonesInStock.length;

      const total = productsValue + phonesValue;
      setAssetValue(total);
      setAssetBreakdown({
        productsValue,
        phonesValue,
        itemsCount: productsCount + phonesCount,
      });
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در محاسبه دارایی.' });
      setAssetValue(0);
      setAssetBreakdown({ productsValue: 0, phonesValue: 0, itemsCount: 0 });
    } finally {
      setAssetLoading(false);
    }
  };

  const fetchUpcomingDue = async () => {
    if (!token || !isFeatureEnabled('installments')) {
      setDueItems([]);
      setDueRange(null);
      return;
    }
    setDueLoading(true);
    try {
      const fromJ = moment().locale('fa').format('jYYYY/jMM/jDD');
      const toJ = moment().locale('fa').add(14, 'day').format('jYYYY/jMM/jDD');
      setDueRange({ from: fromJ, to: toJ });

      const res = await apiFetch(`/api/reports/installments-calendar?from=${encodeURIComponent(fromJ)}&to=${encodeURIComponent(toJ)}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت تقویم اقساط');

      const items: InstallmentCalendarItem[] = json.data?.items || [];

      const filtered = items.filter((it) => {
        const st = String(it.status || '').toLowerCase();
        return !['paid', 'cashed'].includes(st);
      });

      setDueItems(filtered);
    } catch (e: any) {
      setDueItems([]);
      setNotification({ type: 'warning', text: e?.message || 'خطا در دریافت اقساط/چک‌های سررسید' });
    } finally {
      setDueLoading(false);
    }
  };


  const fetchRiskyCustomersSummary = async () => {
    if (!token) return;
    setRiskyCustomersLoading(true);
    try {
      const res = await apiFetch('/api/customers/trust-profiles');
      const json = await res.json();
      if (!res.ok || !json?.success || !Array.isArray(json?.data)) throw new Error(json?.message || 'خطا در دریافت وضعیت ریسک مشتریان');

      const profiles = json.data as Array<any>;
      const risky = profiles.filter((profile) => {
        const score = Number(profile?.score || 0);
        const lateOrOverdue = Number(profile?.latePaymentCount || 0) + Number(profile?.overdueUnpaidCount || 0);
        const returnedChecks = Number(profile?.returnedCheckCount || 0);
        return score < 50 || lateOrOverdue > 0 || returnedChecks > 0;
      });

      setRiskyCustomersSummary({
        totalRisky: risky.length,
        lowScore: risky.filter((profile) => Number(profile?.score || 0) < 50).length,
        lateOrOverdue: risky.filter((profile) => Number(profile?.latePaymentCount || 0) + Number(profile?.overdueUnpaidCount || 0) > 0).length,
        returnedChecks: risky.filter((profile) => Number(profile?.returnedCheckCount || 0) > 0).length,
        worstScore: risky.length ? Math.min(...risky.map((profile) => Number(profile?.score || 0))) : null,
      });
    } catch {
      setRiskyCustomersSummary({ totalRisky: 0, lowScore: 0, lateOrOverdue: 0, returnedChecks: 0, worstScore: null });
    } finally {
      setRiskyCustomersLoading(false);
    }
  };


  useEffect(() => {
    if (!isFeatureEnabled('installments')) {
      setDueItems([]);
      setDueRange(null);
      setDueLoading(false);
    }
    if (!isFeatureEnabled('mobile_phones')) {
      setAssetBreakdown((prev) => ({ ...prev, phonesValue: 0 }));
    }
  }, [featureFlags, isFeatureEnabled]);

  useEffect(() => {
    if (authReady && token) {
      // اولویت با خلاصهٔ داشبورد + لود چیدمان است تا صفحه سریع‌تر آماده شود.
      fetchDashboardData(activeTimeframe);
      if (!layoutLoaded) loadLayout();

      // کارهای غیرضروری را عقب می‌اندازیم تا لود اولیه سبک‌تر شود.
      const runDeferred = () => {
        const activeWidgetSet = new Set(usedWidgetIds);
        if (activeWidgetSet.has('asset')) fetchAssets();
        if (activeWidgetSet.has('installment_calendar') && isFeatureEnabled('installments')) fetchUpcomingDue();
        fetchRiskyCustomersSummary();
      };

      const w: any = window as any;
      if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(runDeferred, { timeout: 1200 });
      } else {
        window.setTimeout(runDeferred, 500);
      }
    } else if (authReady && !token) {
      setLocalIsLoading(false);
      setDashboardData(null);
      setAssetValue(0);
      setAssetBreakdown({ productsValue: 0, phonesValue: 0, itemsCount: 0 });
      setDueItems([]);
      setDueRange(null);
      setRiskyCustomersSummary({ totalRisky: 0, lowScore: 0, lateOrOverdue: 0, returnedChecks: 0, worstScore: null });
      setLayout(DEFAULT_DASHBOARD_LAYOUT);
      try {
        localStorage.removeItem(layoutStorageKey);
      } catch {}
      setLayoutLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimeframe, token, authReady, featureFlags, usedWidgetIds]);

  // --------------------
  // RGL layouts per breakpoint
  // --------------------
  const colsByBp = useMemo(() => ({ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }), []);

  const layouts = useMemo(() => {
    const order = ensureMandatory(layout.order.filter((id) => Boolean(WIDGET_REGISTRY[id]) && isManagedDashboardWidget(id) && isWidgetFeatureEnabled(id)));
    const sizes = layout.sizes || {};
    return {
      lg: buildPackedLayout(order, sizes, colsByBp.lg),
      md: buildPackedLayout(order, sizes, colsByBp.md),
      sm: buildPackedLayout(order, sizes, colsByBp.sm),
      xs: buildPackedLayout(order, sizes, colsByBp.xs),
      xxs: buildPackedLayout(order, sizes, colsByBp.xxs),
    };
  }, [layout.order, layout.sizes, colsByBp]);

  const getDashboardAccentLevel = (key: 'today' | 'month' | 'repair' | 'inventory' | 'due'): 'none' | 'soft' | 'medium' | 'strong' => {
    if (key === 'today') {
      if (todayRevenue >= 20000000) return 'strong';
      if (todayRevenue >= 5000000) return 'medium';
      return todayRevenue > 0 ? 'soft' : 'none';
    }
    if (key === 'due') {
      if ((productSalesTotal ?? 0) >= 20000000) return 'strong';
      if ((productSalesTotal ?? 0) >= 5000000) return 'medium';
      return (productSalesTotal ?? 0) > 0 ? 'soft' : 'none';
    }
    if (key === 'repair') {
      if ((dashboardData?.kpis?.repairProfitMonth ?? 0) >= 10000000) return 'strong';
      if ((dashboardData?.kpis?.repairProfitMonth ?? 0) >= 3000000) return 'medium';
      return (dashboardData?.kpis?.repairProfitMonth ?? 0) > 0 ? 'soft' : 'none';
    }
    if (key === 'inventory') {
      if ((assetValue ?? 0) >= 300000000) return 'strong';
      if ((assetValue ?? 0) >= 100000000) return 'medium';
      return (assetValue ?? 0) > 0 ? 'soft' : 'none';
    }
    if ((dashboardData?.kpis?.totalSalesMonth ?? 0) >= 200000000) return 'strong';
    if ((dashboardData?.kpis?.totalSalesMonth ?? 0) >= 50000000) return 'medium';
    return (dashboardData?.kpis?.totalSalesMonth ?? 0) > 0 ? 'soft' : 'none';
  };

  const dashboardSpotlight = useMemo(
    () => [
      {
        key: 'today',
        titleFa: 'درآمد امروز',
        titleEn: 'Today revenue',
        value: formatPriceForStats(dashboardData?.kpis?.revenueToday ?? 0),
        icon: 'fa-solid fa-bolt',
        tone: 'emerald' as const,
        caption: 'جریان نقدی امروز',
        accentLevel: getDashboardAccentLevel('today'),
      },
      {
        key: 'month',
        titleFa: 'فروش این ماه',
        titleEn: 'Monthly sales',
        value: formatPriceForStats(dashboardData?.kpis?.totalSalesMonth ?? 0),
        icon: 'fa-solid fa-chart-column',
        tone: 'indigo' as const,
        caption: 'فروش تجمعی ماه جاری',
        accentLevel: getDashboardAccentLevel('month'),
      },
      {
        key: 'repair',
        titleFa: 'سود تعمیرات',
        titleEn: 'Repair profit',
        value: formatPriceForStats(dashboardData?.kpis?.repairProfitMonth ?? 0),
        icon: 'fa-solid fa-screwdriver-wrench',
        tone: 'amber' as const,
        caption: `درآمد: ${formatPriceForStats(dashboardData?.kpis?.repairRevenueMonth ?? 0)} • هزینه: ${formatPriceForStats(dashboardData?.kpis?.repairCostsMonth ?? 0)}`,
        accentLevel: getDashboardAccentLevel('repair'),
      },
      {
        key: 'inventory',
        titleFa: 'ارزش موجودی',
        titleEn: 'Inventory value',
        value: formatPriceForStats(assetValue ?? 0),
        icon: 'fa-solid fa-warehouse',
        tone: 'amber' as const,
        caption: 'دارایی قابل فروش فعلی',
        accentLevel: getDashboardAccentLevel('inventory'),
      },
      {
        key: 'due',
        titleFa: 'فروش لوازم جانبی',
        titleEn: 'Accessory sales',
        value: formatPriceForStats(productSalesTotal ?? 0),
        icon: 'fa-solid fa-headphones',
        tone: 'purple' as const,
        caption: productSalesLoading ? 'در حال محاسبه فروش غیرگوشی ماه جاری' : 'فروش غیرگوشی این ماه',
        accentLevel: getDashboardAccentLevel('due'),
      },
    ],
    [dashboardData, assetValue, dueItems.length, dueAmountTotal, productSalesLoading, productSalesTotal, todayRevenue],
  );

  // فقط هنگام پایان درگ order را آپدیت کن (نه وسط حرکت، برای نرمی بیشتر)
const onDragStop = (currentLayout: Layout[]) => {
  const nextOrder = ensureMandatory(sortOrderFromLayout(currentLayout));
  setLayout((prev) => {
    const next: DashboardLayoutV2 = { ...prev, order: nextOrder };
    if (editing) scheduleSave(next);
    return next;
  });
};

  const getSignalStrength = (value: number, mediumThreshold: number, strongThreshold: number) => {
    if (value >= strongThreshold) return 'strong';
    if (value >= mediumThreshold) return 'medium';
    if (value > 0) return 'soft';
    return 'none';
  };

  const getSignalTone = (
    strength: 'none' | 'soft' | 'medium' | 'strong',
    tone: 'sky' | 'rose' | 'amber',
  ) => {
    if (strength === 'none') return null;

    const dotMap = {
      sky: {
        soft: 'bg-sky-500/80',
        medium: 'bg-sky-500',
        strong: 'bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.45)]',
      },
      rose: {
        soft: 'bg-rose-500/80',
        medium: 'bg-rose-500',
        strong: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]',
      },
      amber: {
        soft: 'bg-amber-500/80',
        medium: 'bg-amber-500',
        strong: 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]',
      },
    } as const;

    const pingMap = {
      sky: {
        soft: 'h-3 w-3 bg-sky-400/20 dark:bg-sky-300/15',
        medium: 'h-3.5 w-3.5 bg-sky-400/30 dark:bg-sky-300/20',
        strong: 'h-4 w-4 bg-sky-400/40 dark:bg-sky-300/30',
      },
      rose: {
        soft: 'h-3 w-3 bg-rose-400/20 dark:bg-rose-300/15',
        medium: 'h-3.5 w-3.5 bg-rose-400/30 dark:bg-rose-300/20',
        strong: 'h-4 w-4 bg-rose-400/40 dark:bg-rose-300/30',
      },
      amber: {
        soft: 'h-3 w-3 bg-amber-400/20 dark:bg-amber-300/15',
        medium: 'h-3.5 w-3.5 bg-amber-400/30 dark:bg-amber-300/20',
        strong: 'h-4 w-4 bg-amber-400/40 dark:bg-amber-300/30',
      },
    } as const;

    const pulseMap = {
      soft: 'animate-pulse',
      medium: 'animate-ping',
      strong: 'animate-ping',
    } as const;

    return {
      dotClass: dotMap[tone][strength],
      pingClass: `${pingMap[tone][strength]} ${pulseMap[strength]}`,
    };
  };

  const revenueSignalStrength = getSignalStrength(todayRevenue, 5_000_000, 20_000_000);
  const dueSignalStrength = getSignalStrength(dueTodayCount, 1, 3);
  const urgentSignalStrength = getSignalStrength(openUrgentCount, 1, 5);

  const revenuePreviewRows = useMemo(() => [
    {
      key: 'today',
      icon: 'fa-solid fa-coins',
      label: 'فروش امروز',
      value: formatPriceForStats(todayRevenue),
      tone: 'text-sky-600 dark:text-sky-300',
      actions: [{
        key: 'view-sales-report',
        label: 'گزارش فروش',
        to: '/reports',
        icon: 'fa-solid fa-chart-column',
      }],
    },
    {
      key: 'month',
      icon: 'fa-solid fa-chart-line',
      label: 'فروش این ماه',
      value: formatPriceForStats(Number(dashboardData?.kpis?.totalSalesMonth ?? 0)),
      tone: 'text-indigo-600 dark:text-indigo-300',
      actions: [{
        key: 'new-cash-sale',
        label: 'ثبت اطلاعات فروش',
        to: '/sales/cash',
        icon: 'fa-solid fa-cash-register',
      }],
    },
    {
      key: 'activities',
      icon: 'fa-solid fa-bolt',
      label: 'فعالیت اخیر',
      value: dashboardData?.recentActivities?.[0]?.details || 'فعالیت جدیدی ثبت نشده',
      tone: 'text-emerald-600 dark:text-emerald-300',
      actions: [{
        key: 'open-notifications',
        label: 'اعلان‌ها',
        to: '/notifications',
        icon: 'fa-solid fa-bell',
      }],
    },
  ], [dashboardData?.kpis?.totalSalesMonth, dashboardData?.recentActivities, todayRevenue]);

  const duePreviewRows = useMemo(() => {
    const topDueItems = dueItems
      .slice()
      .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
      .slice(0, 3);

    if (!topDueItems.length) {
      return [{
        key: 'empty-due',
        icon: 'fa-solid fa-circle-check',
        label: 'امروز',
        value: 'مورد سررسید فعالی دیده نشد',
        tone: 'text-emerald-600 dark:text-emerald-300',
      }];
    }

    return topDueItems.map((item, index) => ({
      key: `due-${index}-${item.id ?? item.customerFullName ?? 'item'}`,
      icon: 'fa-solid fa-hourglass-half',
      label: item.customerFullName || 'مشتری نامشخص',
      value: `${String(item.dueDate || '').slice(0, 10)} • ${formatPriceForStats(Number(item.amount) || 0)}`,
      tone: 'text-rose-600 dark:text-rose-300',
      actions: [
        {
          key: `due-pay-${item.id}`,
          label: 'ثبت اطلاعات پرداخت',
          to: `/installment-sales/${item.saleId}?pay=next`,
          icon: 'fa-solid fa-wallet',
        },
        {
          key: `due-customer-${item.customerId}`,
          label: 'پرونده مشتری',
          to: `/customers/${item.customerId}`,
          icon: 'fa-solid fa-user',
        },
      ],
    }));
  }, [dueItems]);

  const urgentPreviewRows = useMemo(() => {
    const sourceItems = dueItems.slice(0, 3);
    if (!sourceItems.length) {
      return [{
        key: 'empty-urgent',
        icon: 'fa-solid fa-bell-slash',
        label: 'اعلان فوری',
        value: 'مورد بازی برای پیگیری وجود ندارد',
        tone: 'text-slate-500 dark:text-slate-400',
      }];
    }

    return sourceItems.map((item, index) => ({
      key: `urgent-${index}-${item.id ?? item.customerFullName ?? 'item'}`,
      icon: 'fa-solid fa-bell',
      label: item.customerFullName || 'مورد باز',
      value: `${formatPriceForStats(Number(item.amount) || 0)} • ${String(item.dueDate || '').slice(0, 10)}`,
      tone: 'text-amber-600 dark:text-amber-300',
      actions: [
        {
          key: `urgent-sale-${item.saleId}`,
          label: 'جزئیات قسط',
          to: `/installment-sales/${item.saleId}`,
          icon: 'fa-solid fa-file-invoice-dollar',
        },
        {
          key: `urgent-customer-${item.customerId}`,
          label: 'پرونده مشتری',
          to: `/customers/${item.customerId}`,
          icon: 'fa-solid fa-address-card',
        },
      ],
    }));
  }, [dueItems]);


  const getHeaderBadgePreviewPlacementClass = (badge: 'revenue' | 'due' | 'urgent') => {
    const placement = headerBadgePreviewPlacement[badge] || 'left';
    if (placement === 'right') return 'right-0 origin-top-right';
    if (placement === 'center') return 'left-1/2 -translate-x-1/2 origin-top';
    return 'left-0 origin-top-left';
  };

  useEffect(() => {
    const openBadgeKeys = (['revenue', 'due', 'urgent'] as const).filter((badge) => hoveredHeaderBadge === badge || pinnedHeaderBadge === badge);
    if (!openBadgeKeys.length) return;

    const updatePlacement = () => {
      setHeaderBadgePreviewPlacement((prev) => {
        let changed = false;
        const next = { ...prev };

        for (const badge of openBadgeKeys) {
          const panel = headerBadgePreviewRefs.current[badge];
          if (!panel) continue;
          const rect = panel.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const overflowLeft = rect.left < 12;
          const overflowRight = rect.right > viewportWidth - 12;
          let placement: 'left' | 'right' | 'center' = prev[badge] || 'left';

          if (overflowLeft && !overflowRight) placement = 'right';
          else if (overflowRight && !overflowLeft) placement = 'left';
          else if (overflowLeft && overflowRight) placement = 'center';

          if (next[badge] !== placement) {
            next[badge] = placement;
            changed = true
          }
        }

        return changed ? next : prev;
      });
    };

    const raf = window.requestAnimationFrame(updatePlacement);
    window.addEventListener('resize', updatePlacement);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePlacement);
    };
  }, [hoveredHeaderBadge, pinnedHeaderBadge]);

  const isHeaderBadgePreviewOpen = (badge: 'revenue' | 'due' | 'urgent') => hoveredHeaderBadge === badge || pinnedHeaderBadge === badge;


  const revenueSignal = getSignalTone(revenueSignalStrength, 'sky');
  const dueSignal = getSignalTone(dueSignalStrength, 'rose');
  const urgentSignal = getSignalTone(urgentSignalStrength, 'amber');

  const getBadgeSignalClasses = (
    tone: 'sky' | 'rose' | 'amber',
    strength: 'none' | 'soft' | 'medium' | 'strong',
  ) => {
    const surfaceMap = {
      sky: {
        none: 'border-slate-200/80 bg-slate-50/90 text-slate-700 ring-slate-200/70 hover:border-sky-200 hover:bg-white hover:text-sky-700 hover:shadow-[0_14px_32px_-24px_rgba(14,165,233,0.45)] dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:ring-slate-800 dark:hover:border-sky-400/30 dark:hover:bg-slate-900',
        soft: 'border-sky-200/80 bg-sky-50/80 text-sky-700 ring-sky-100/80 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 hover:shadow-[0_16px_34px_-24px_rgba(14,165,233,0.32)] dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-200 dark:ring-sky-900/40 dark:hover:border-sky-400/30 dark:hover:bg-sky-950/30',
        medium: 'border-sky-300/90 bg-sky-50 text-sky-800 ring-sky-200/80 hover:border-sky-400 hover:bg-sky-100/80 hover:text-sky-900 hover:shadow-[0_18px_38px_-24px_rgba(14,165,233,0.4)] dark:border-sky-800/70 dark:bg-sky-950/35 dark:text-sky-100 dark:ring-sky-900/50 dark:hover:border-sky-400/40 dark:hover:bg-sky-950/45',
        strong: 'border-sky-400/90 bg-gradient-to-l from-sky-100/95 to-cyan-50/95 text-sky-900 ring-sky-200/90 hover:border-sky-500 hover:from-sky-100 hover:to-cyan-100 hover:text-sky-950 hover:shadow-[0_22px_44px_-26px_rgba(14,165,233,0.52)] dark:border-sky-700/80 dark:bg-gradient-to-l dark:from-sky-950/55 dark:to-cyan-950/35 dark:text-sky-50 dark:ring-sky-900/60 dark:hover:border-sky-400/45 dark:hover:from-sky-950/65 dark:hover:to-cyan-950/45',
      },
      rose: {
        none: 'border-slate-200/80 bg-slate-50/90 text-slate-700 ring-slate-200/70 hover:border-rose-200 hover:bg-white hover:text-rose-700 hover:shadow-[0_14px_32px_-24px_rgba(244,63,94,0.38)] dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:ring-slate-800 dark:hover:border-rose-400/30 dark:hover:bg-slate-900',
        soft: 'border-rose-200/80 bg-rose-50/80 text-rose-700 ring-rose-100/80 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 hover:shadow-[0_16px_34px_-24px_rgba(244,63,94,0.28)] dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200 dark:ring-rose-900/40 dark:hover:border-rose-400/30 dark:hover:bg-rose-950/30',
        medium: 'border-rose-300/90 bg-rose-50 text-rose-800 ring-rose-200/80 hover:border-rose-400 hover:bg-rose-100/80 hover:text-rose-900 hover:shadow-[0_18px_38px_-24px_rgba(244,63,94,0.35)] dark:border-rose-800/70 dark:bg-rose-950/35 dark:text-rose-100 dark:ring-rose-900/50 dark:hover:border-rose-400/40 dark:hover:bg-rose-950/45',
        strong: 'border-rose-400/90 bg-gradient-to-l from-rose-100/95 to-pink-50/95 text-rose-900 ring-rose-200/90 hover:border-rose-500 hover:from-rose-100 hover:to-pink-100 hover:text-rose-950 hover:shadow-[0_22px_44px_-26px_rgba(244,63,94,0.46)] dark:border-rose-700/80 dark:bg-gradient-to-l dark:from-rose-950/55 dark:to-pink-950/35 dark:text-rose-50 dark:ring-rose-900/60 dark:hover:border-rose-400/45 dark:hover:from-rose-950/65 dark:hover:to-pink-950/45',
      },
      amber: {
        none: 'border-slate-200/80 bg-slate-50/90 text-slate-700 ring-slate-200/70 hover:border-amber-200 hover:bg-white hover:text-amber-700 hover:shadow-[0_14px_32px_-24px_rgba(245,158,11,0.38)] dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:ring-slate-800 dark:hover:border-amber-400/30 dark:hover:bg-slate-900',
        soft: 'border-amber-200/80 bg-amber-50/80 text-amber-700 ring-amber-100/80 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 hover:shadow-[0_16px_34px_-24px_rgba(245,158,11,0.26)] dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200 dark:ring-amber-900/40 dark:hover:border-amber-400/30 dark:hover:bg-amber-950/30',
        medium: 'border-amber-300/90 bg-amber-50 text-amber-800 ring-amber-200/80 hover:border-amber-400 hover:bg-amber-100/80 hover:text-amber-900 hover:shadow-[0_18px_38px_-24px_rgba(245,158,11,0.34)] dark:border-amber-800/70 dark:bg-amber-950/35 dark:text-amber-100 dark:ring-amber-900/50 dark:hover:border-amber-400/40 dark:hover:bg-amber-950/45',
        strong: 'border-amber-400/90 bg-gradient-to-l from-amber-100/95 to-orange-50/95 text-amber-900 ring-amber-200/90 hover:border-amber-500 hover:from-amber-100 hover:to-orange-100 hover:text-amber-950 hover:shadow-[0_22px_44px_-26px_rgba(245,158,11,0.44)] dark:border-amber-700/80 dark:bg-gradient-to-l dark:from-amber-950/55 dark:to-orange-950/35 dark:text-amber-50 dark:ring-amber-900/60 dark:hover:border-amber-400/45 dark:hover:from-amber-950/65 dark:hover:to-orange-950/45',
      },
    } as const;

    const iconMap = {
      sky: {
        none: 'border-sky-200/70 bg-white text-sky-600 dark:border-sky-900/50 dark:bg-slate-950 dark:text-sky-300',
        soft: 'border-sky-300/80 bg-sky-100/90 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/45 dark:text-sky-200',
        medium: 'border-sky-400/80 bg-sky-200/90 text-sky-800 dark:border-sky-700/70 dark:bg-sky-950/65 dark:text-sky-100',
        strong: 'border-sky-500/80 bg-sky-500/12 text-sky-900 shadow-[0_0_0_1px_rgba(14,165,233,0.16)] dark:border-sky-500/60 dark:bg-sky-500/18 dark:text-sky-50',
      },
      rose: {
        none: 'border-rose-200/70 bg-white text-rose-600 dark:border-rose-900/50 dark:bg-slate-950 dark:text-rose-300',
        soft: 'border-rose-300/80 bg-rose-100/90 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/45 dark:text-rose-200',
        medium: 'border-rose-400/80 bg-rose-200/90 text-rose-800 dark:border-rose-700/70 dark:bg-rose-950/65 dark:text-rose-100',
        strong: 'border-rose-500/80 bg-rose-500/12 text-rose-900 shadow-[0_0_0_1px_rgba(244,63,94,0.14)] dark:border-rose-500/60 dark:bg-rose-500/18 dark:text-rose-50',
      },
      amber: {
        none: 'border-amber-200/70 bg-white text-amber-600 dark:border-amber-900/50 dark:bg-slate-950 dark:text-amber-300',
        soft: 'border-amber-300/80 bg-amber-100/90 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/45 dark:text-amber-200',
        medium: 'border-amber-400/80 bg-amber-200/90 text-amber-800 dark:border-amber-700/70 dark:bg-amber-950/65 dark:text-amber-100',
        strong: 'border-amber-500/80 bg-amber-500/12 text-amber-900 shadow-[0_0_0_1px_rgba(245,158,11,0.14)] dark:border-amber-500/60 dark:bg-amber-500/18 dark:text-amber-50',
      },
    } as const;

    const labelMap = {
      sky: {
        none: 'text-slate-500 group-hover:text-sky-600 dark:text-slate-400 dark:group-hover:text-sky-300',
        soft: 'text-sky-700/80 group-hover:text-sky-800 dark:text-sky-300/90 dark:group-hover:text-sky-200',
        medium: 'text-sky-800 group-hover:text-sky-900 dark:text-sky-200 dark:group-hover:text-sky-50',
        strong: 'text-sky-900 group-hover:text-sky-950 dark:text-sky-100 dark:group-hover:text-white',
      },
      rose: {
        none: 'text-slate-500 group-hover:text-rose-600 dark:text-slate-400 dark:group-hover:text-rose-300',
        soft: 'text-rose-700/80 group-hover:text-rose-800 dark:text-rose-300/90 dark:group-hover:text-rose-200',
        medium: 'text-rose-800 group-hover:text-rose-900 dark:text-rose-200 dark:group-hover:text-rose-50',
        strong: 'text-rose-900 group-hover:text-rose-950 dark:text-rose-100 dark:group-hover:text-white',
      },
      amber: {
        none: 'text-slate-500 group-hover:text-amber-600 dark:text-slate-400 dark:group-hover:text-amber-300',
        soft: 'text-amber-700/80 group-hover:text-amber-800 dark:text-amber-300/90 dark:group-hover:text-amber-200',
        medium: 'text-amber-800 group-hover:text-amber-900 dark:text-amber-200 dark:group-hover:text-amber-50',
        strong: 'text-amber-900 group-hover:text-amber-950 dark:text-amber-100 dark:group-hover:text-white',
      },
    } as const;

    const valueMap = {
      sky: {
        none: 'text-slate-900 dark:text-white',
        soft: 'text-sky-800 dark:text-sky-100',
        medium: 'text-sky-900 dark:text-sky-50',
        strong: 'text-sky-950 dark:text-white',
      },
      rose: {
        none: 'text-slate-900 dark:text-white',
        soft: 'text-rose-800 dark:text-rose-100',
        medium: 'text-rose-900 dark:text-rose-50',
        strong: 'text-rose-950 dark:text-white',
      },
      amber: {
        none: 'text-slate-900 dark:text-white',
        soft: 'text-amber-800 dark:text-amber-100',
        medium: 'text-amber-900 dark:text-amber-50',
        strong: 'text-amber-950 dark:text-white',
      },
    } as const;

    return {
      surface: surfaceMap[tone][strength],
      icon: iconMap[tone][strength],
      label: labelMap[tone][strength],
      value: valueMap[tone][strength],
    };
  };

  const revenueBadgeClasses = getBadgeSignalClasses('sky', revenueSignalStrength);
  const dueBadgeClasses = getBadgeSignalClasses('rose', dueSignalStrength);
  const urgentBadgeClasses = getBadgeSignalClasses('amber', urgentSignalStrength);

  const dayQuotes = [
    'امروز بهترین روز برای منظم‌تر کردن فروش و وصول‌هاست.',
    'دقت در جزئیات، سودآوری پایدار می‌سازد.',
    'هر پرداخت ثبت اطلاعات‌شده، یک قدم به نقدینگی سالم‌تر است.',
    'انبار منظم و پیگیری دقیق، پایه مدیریت حرفه‌ای است.',
    'فروش خوب وقتی ارزشمند است که وصولش هم کامل باشد.',
    'امروز را با اولویت‌های مهم‌تر شروع کنید.',
    'تصمیم‌های دقیق روزانه، نتیجه‌های بهتر ماهانه می‌سازند.',
  ] as const;
  const quoteOfDay = dayQuotes[new Date().getDay() % dayQuotes.length];

  return (
    <div className="dashboard-page dashboard-solid-mode dashboard-redesign-v1 dashboard-executive-foundation p-3 md:p-6 space-y-5 rtl-dashboard" data-ui-dashboard-page="home" data-dashboard-editing={editing ? 'true' : 'false'}>
      {notification && <Notification message={notification} onClose={() => setNotification(null)} />}

      <div data-ui-dashboard-surface="hero" className="dashboard-hero-panel dashboard-hero-panel--solid relative z-20 isolate overflow-hidden rounded-[30px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_46px_-36px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/80 dark:border-slate-800 dark:bg-slate-950 dark:ring-slate-800/80 md:px-5 md:py-5">
        <div className="dashboard-hero-decor pointer-events-none absolute inset-x-0 top-0 hidden h-px" />
        <div className="dashboard-hero-decor pointer-events-none absolute -left-20 top-3 hidden h-40 w-40" />
        <div className="dashboard-hero-decor pointer-events-none absolute -right-16 bottom-0 hidden h-40 w-40" />
        <div className="relative">
          <UnifiedClockCard ctx={ctx} container={{ width: 1280, height: 560 }} showModeSwitcher />
        </div>
        <div className="hidden" data-ui-dashboard-actions="hero">
          {editing ? (
            <button
              type="button"
              onClick={() => {
                setCustomizePanelOpen(false);
                setEditing(false);
                setAddModalOpen(false);
              }}
              data-ui-dashboard-command="finish-edit" className="app-command-button inline-flex h-9 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 text-[11px] font-black text-emerald-700 shadow-[0_12px_28px_-24px_rgba(16,185,129,0.42)] transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:border-emerald-400/40 dark:hover:bg-emerald-500/15"
            >
              <i className="fa-solid fa-check text-[11px]" />
              پایان ویرایش
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setCustomizePanelOpen((prev) => !prev);
            }}
            data-ui-dashboard-command="manage-cards" className="app-command-button inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-[11px] font-black text-slate-800 shadow-[0_16px_34px_-26px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-900"
          >
            <i className="fa-solid fa-sliders text-[11px]" />
            {customizePanelOpen ? 'بستن مدیریت کارت‌ها' : 'مدیریت کارت‌ها'}
          </button>
        </div>
      </div>

      {editing && customizePanelOpen && (
        <div data-ui-dashboard-manager="true" className="dashboard-card-manager-panel dashboard-card-manager-surface relative isolate overflow-hidden rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_16px_42px_-34px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/80 dark:border-slate-800 dark:bg-slate-950 dark:ring-slate-800/80">
          <div className="dashboard-card-manager-decor pointer-events-none absolute inset-x-0 top-0 hidden h-px" />
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                  <i className="fa-solid fa-sliders" />
                </div>
                <div>
                  <div className="text-[14px] font-black text-slate-900 dark:text-slate-100">مدیریت چیدمان داشبورد</div>
                  <div className="mt-1 text-[11px] leading-5.5 text-slate-500 dark:text-slate-400">نمایش، اندازه و ترتیب کارت‌ها برای همین کاربر از این بخش مدیریت و ذخیره می‌شود.</div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-start justify-end gap-2 self-start">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-center dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">فعال</div>
                  <div className="mt-1 text-[15px] font-extrabold text-slate-900 dark:text-white">{formatNumberForStats(visibleWidgets.length)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-center dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">مخفی</div>
                  <div className="mt-1 text-[15px] font-extrabold text-slate-900 dark:text-white">{formatNumberForStats(hiddenWidgets.length)}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomizePanelOpen(false);
                  setEditing(false);
                  setAddModalOpen(false);
                }}
                data-ui-dashboard-command="finish-edit" className="app-command-button inline-flex h-9 items-center gap-2 rounded-full border border-emerald-200 bg-white px-3.5 text-[11px] font-black text-emerald-700 shadow-[0_12px_28px_-24px_rgba(16,185,129,0.34)] transition hover:-translate-y-0.5 hover:bg-emerald-50 dark:border-emerald-500/25 dark:bg-slate-950 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
              >
                <i className="fa-solid fa-check text-[11px]" />
                پایان ویرایش
              </button>
            </div>
          </div>

          <div data-ui-dashboard-manager-section="filters" className="dashboard-card-manager-section dashboard-card-manager-filters mt-4 rounded-[24px] border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="text-right">
                <div className="text-[12px] font-black text-slate-900 dark:text-slate-100">جستجو و فیلتر کارت‌ها</div>
                <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">برای یافتن سریع کارت‌ها بر اساس نام یا دسته‌بندی استفاده کنید.</div>
              </div>
              <div className="flex flex-col gap-3 xl:min-w-[420px]">
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400 dark:text-slate-500">
                    <i className="fa-solid fa-magnifying-glass text-[12px]" />
                  </span>
                  <input
                    value={widgetSearch}
                    onChange={(event) => setWidgetSearch(event.target.value)}
                    placeholder="جستجو در نام کارت یا دسته‌بندی"
                    data-ui-field="true" data-ui-control="true" data-ui-control-kind="dashboard-search" className="app-form-control w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-10 pl-4 text-right text-[12px] font-bold text-slate-700 outline-none transition placeholder:text-slate-400    dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500  "
                  />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWidgetSearch('');
                      setWidgetCategoryFilter('all');
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-100"
                  >
                    پاک کردن فیلترها
                  </button>
                  <button
                    type="button"
                    onClick={() => setWidgetCategoryFilter('all')}
                    className={[
                      'rounded-full border px-3 py-1.5 text-[10px] font-bold transition',
                      widgetCategoryFilter === 'all'
                        ? 'border-sky-600 bg-sky-600 text-white dark:border-sky-500 dark:bg-sky-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-sky-300/30 dark:hover:text-sky-200',
                    ].join(' ')}
                  >
                    همه دسته‌ها
                  </button>
                  {widgetCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setWidgetCategoryFilter(category)}
                      className={[
                        'rounded-full border px-3 py-1.5 text-[10px] font-bold transition',
                        widgetCategoryFilter === category
                          ? 'border-violet-600 bg-violet-600 text-white dark:border-violet-500 dark:bg-violet-500'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-violet-300/30 dark:hover:text-violet-200',
                      ].join(' ')}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>


          <div data-ui-dashboard-manager-section="fixed-sections" className="dashboard-card-manager-section mt-4 rounded-[24px] border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={resetFixedSections}
                  className="inline-flex h-8 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
                >
                  <i className="fa-solid fa-rotate-left" />
                  بازنشانی سکشن‌ها
                </button>
              </div>
              <div className="text-right">
                <div className="text-[12px] font-black text-slate-900 dark:text-slate-100">مدیریت سکشن‌های ثابت پیشخوان</div>
                <div className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-slate-400">نمای حرفه‌ای این بخش‌ها حفظ می‌شود؛ فقط نمایش و ترتیب سکشن‌ها مدیریت می‌شود.</div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {fixedSectionPrefs.order.map((sectionId, index) => {
                const section = DASHBOARD_FIXED_SECTION_DEFS[sectionId];
                const isVisible = !fixedSectionPrefs.hidden.includes(sectionId);
                return (
                  <div key={sectionId} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveFixedSection(sectionId, 'up')}
                        disabled={index === 0}
                        className={["inline-flex h-8 w-8 items-center justify-center rounded-full border text-[10px] transition", index === 0 ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:text-white"].join(' ')}
                        aria-label="انتقال به بالا"
                      >
                        <i className="fa-solid fa-chevron-up" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFixedSection(sectionId, 'down')}
                        disabled={index === fixedSectionPrefs.order.length - 1}
                        className={["inline-flex h-8 w-8 items-center justify-center rounded-full border text-[10px] transition", index === fixedSectionPrefs.order.length - 1 ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:text-white"].join(' ')}
                        aria-label="انتقال به پایین"
                      >
                        <i className="fa-solid fa-chevron-down" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFixedSectionVisibility(sectionId, !isVisible)}
                        className={["inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[10px] font-black transition", isVisible ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-slate-200 bg-slate-100 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"].join(' ')}
                      >
                        <i className={isVisible ? "fa-solid fa-eye" : "fa-solid fa-eye-slash"} />
                        {isVisible ? 'نمایش فعال' : 'مخفی'}
                      </button>
                    </div>
                    <div className="flex min-w-0 items-center gap-3 text-right">
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-black text-slate-900 dark:text-slate-100">{section.title}</div>
                        <div className="mt-1 line-clamp-1 text-[10px] text-slate-500 dark:text-slate-400">{section.description}</div>
                      </div>
                      <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                        <i className={section.icon} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
            <div data-ui-dashboard-manager-section="active" className="dashboard-card-manager-section dashboard-card-manager-active rounded-[24px] border border-slate-200/80 bg-slate-50 p-3 shadow-[0_16px_36px_-34px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {widgetCategoryFilter !== 'all' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => confirmCategoryVisibilityChange(widgetCategoryFilter, false)}
                        disabled={removableFilteredVisibleWidgets.length === 0}
                        className={[
                          'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[10px] font-bold transition',
                          removableFilteredVisibleWidgets.length > 0
                            ? 'border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900/40 dark:bg-slate-950 dark:text-rose-300 dark:hover:bg-rose-950/30'
                            : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600',
                        ].join(' ')}
                      >
                        <i className="fa-solid fa-eye-slash" />
                        مخفی‌کردن دسته
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmResetCategoryLayout(widgetCategoryFilter)}
                        disabled={selectedCategoryWidgets.length === 0}
                        className={[
                          'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[10px] font-bold transition',
                          selectedCategoryWidgets.length > 0
                            ? 'border-amber-200 bg-white text-amber-700 hover:border-amber-300 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-slate-950 dark:text-amber-300 dark:hover:bg-amber-950/30'
                            : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600',
                        ].join(' ')}
                      >
                        <i className="fa-solid fa-rotate-left" />
                        بازنشانی دسته
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => confirmBulkVisibilityChange({
                      ids: removableFilteredVisibleWidgets.map((widget) => widget.id),
                      visible: false,
                      title: 'مخفی‌کردن کارت‌های فعالِ فیلترشده',
                      description: `تمام ${formatNumberForStats(removableFilteredVisibleWidgets.length)} کارت فعالِ فیلترشده از داشبورد مخفی می‌شوند. کارت‌های ثابت دست‌نخورده می‌مانند.`,
                    })}
                    disabled={removableFilteredVisibleWidgets.length === 0}
                    className={[
                      'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[10px] font-bold transition',
                      removableFilteredVisibleWidgets.length > 0
                        ? 'border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900/40 dark:bg-slate-950 dark:text-rose-300 dark:hover:bg-rose-950/30'
                        : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600',
                    ].join(' ')}
                  >
                    <i className="fa-solid fa-layer-group" />
                    مخفی‌کردن کارت‌های فعال
                  </button>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                      {formatNumberForStats(filteredVisibleWidgets.length)} کارت
                    </span>
                    <div className="text-[12px] font-black text-slate-900 dark:text-slate-100">کارت‌های فعال</div>
                  </div>
                  <div className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-slate-400">نمایش، ترتیب و اندازه کارت‌های پیشخوان را مدیریت کنید.</div>
                </div>
              </div>
              <div className="dashboard-card-manager-list space-y-2">
                {filteredVisibleWidgets.length === 0 ? (
                  <div className="flex min-h-[150px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 text-center dark:border-slate-700 dark:bg-slate-950">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                      <i className="fa-solid fa-filter-circle-xmark" />
                    </div>
                    <div className="mt-3 text-[12px] font-black text-slate-900 dark:text-slate-100">کارت فعالی با این فیلتر پیدا نشد</div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">عبارت جستجو را تغییر دهید یا دسته‌بندی دیگری انتخاب کنید.</div>
                  </div>
                ) : filteredVisibleWidgets.map((widget) => {
                  const currentSize = (layout.sizes[widget.id] || widget.defaultPreset) as SizePreset;
                  const widgetIndex = visibleWidgets.findIndex((entry) => entry.id === widget.id);
                  const canMoveUp = widgetIndex > 0;
                  const canMoveDown = widgetIndex < visibleWidgets.length - 1;
                  const isDragging = draggingWidgetId === widget.id;
                  return (
                    <div
                      key={widget.id}
                      draggable
                      onDragStart={() => setDraggingWidgetId(widget.id)}
                      onDragEnd={() => setDraggingWidgetId(null)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (draggingWidgetId && draggingWidgetId !== widget.id) {
                          event.dataTransfer.dropEffect = 'move';
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggingWidgetId && draggingWidgetId !== widget.id) {
                          moveWidgetWithinActiveList(draggingWidgetId, widget.id);
                        }
                        setDraggingWidgetId(null);
                      }}
                      className={[
                        'dashboard-card-manager-item rounded-2xl border bg-white px-3 py-2.5 transition-all dark:bg-slate-950',
                        isDragging
                          ? 'border-sky-300 shadow-[0_14px_40px_-32px_rgba(14,165,233,0.55)] ring-2 ring-sky-200/70 dark:border-sky-500/50 dark:ring-sky-500/20'
                          : 'border-slate-200/80 shadow-[0_10px_26px_-24px_rgba(15,23,42,0.18)] dark:border-slate-800',
                      ].join(' ')}
                    >
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center justify-end gap-3 text-right">
                          <div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                                #{formatNumberForStats(widgetIndex + 1)}
                              </span>
                              <div className="text-[12px] font-black text-slate-900 dark:text-slate-100">{widget.title}</div>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{widget.category}</div>
                          </div>
                          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                            <i className={widget.icon} />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <div className="inline-flex overflow-hidden rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-900" aria-label="انتخاب اندازه کارت">
                            {(['tile','wide','tall','hero'] as SizePreset[]).map((sizeOption) => (
                              <button
                                key={sizeOption}
                                type="button"
                                onClick={() => setWidgetSize(widget.id, sizeOption)}
                                className={[
                                  'h-7 rounded-full px-2.5 text-[10px] font-bold transition',
                                  currentSize === sizeOption
                                    ? 'bg-violet-600 text-white shadow-[0_10px_22px_-18px_rgba(124,58,237,0.6)] dark:bg-violet-500'
                                    : 'text-slate-600 hover:bg-white hover:text-violet-700 dark:text-slate-300 dark:hover:bg-slate-950 dark:hover:text-violet-200',
                                ].join(' ')}
                              >
                                {sizeOption === 'tile' ? 'کوچک' : sizeOption === 'wide' ? 'متوسط' : sizeOption === 'tall' ? 'بلند' : 'بزرگ'}
                              </button>
                            ))}
                          </div>
                          <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 dark:border-slate-800 dark:bg-slate-900">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={true}
                              onChange={() => setWidgetVisibility(widget.id, false)}
                              disabled={widget.canRemove === false}
                            />
                            <span className={[
                              'relative h-5 w-9 rounded-full transition',
                              widget.canRemove === false
                                ? 'bg-slate-300 dark:bg-slate-700'
                                : 'bg-emerald-500/90',
                            ].join(' ')}>
                              <span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_8px_18px_-14px_rgba(15,23,42,0.6)]" />
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{widget.canRemove === false ? 'ثابت' : 'نمایش'}</span>
                          </label>
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => nudgeWidget(widget.id, 'up')}
                              disabled={!canMoveUp}
                              className={[
                                'inline-flex h-8 w-8 items-center justify-center rounded-xl border transition',
                                canMoveUp
                                  ? 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-sky-300/30 dark:hover:text-sky-200'
                                  : 'cursor-not-allowed border-slate-200/70 bg-slate-100 text-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-600',
                              ].join(' ')}
                              title="انتقال به بالا"
                            >
                              <i className="fa-solid fa-chevron-up text-[11px]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => nudgeWidget(widget.id, 'down')}
                              disabled={!canMoveDown}
                              className={[
                                'inline-flex h-8 w-8 items-center justify-center rounded-xl border transition',
                                canMoveDown
                                  ? 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-sky-300/30 dark:hover:text-sky-200'
                                  : 'cursor-not-allowed border-slate-200/70 bg-slate-100 text-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-600',
                              ].join(' ')}
                              title="انتقال به پایین"
                            >
                              <i className="fa-solid fa-chevron-down text-[11px]" />
                            </button>
                          </div>
                          <button
                            type="button"
                            title="برای جابه‌جایی بکشید"
                            className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-500 transition hover:border-sky-200 hover:text-sky-700 active:cursor-grabbing dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-300/30 dark:hover:text-sky-200"
                          >
                            <i className="fa-solid fa-grip-vertical text-[12px]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div data-ui-dashboard-manager-section="hidden" className="dashboard-card-manager-section dashboard-card-manager-hidden h-fit self-start rounded-[24px] border border-slate-200/80 bg-slate-50 p-3 shadow-[0_16px_36px_-34px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-900 xl:sticky xl:top-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  {formatNumberForStats(filteredHiddenWidgets.length)} کارت
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-black text-slate-900 dark:text-slate-100">کارت‌های مخفی</div>
                  <div className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-slate-400">کارت‌های مورد نیاز را به پیشخوان برگردانید.</div>
                </div>
              </div>
              <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                {widgetCategoryFilter !== 'all' ? (
                  <button
                    type="button"
                    onClick={() => confirmCategoryVisibilityChange(widgetCategoryFilter, true)}
                    disabled={selectedCategoryWidgets.length === 0}
                    className={[
                      'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[10px] font-bold transition',
                      selectedCategoryWidgets.length > 0
                        ? 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-slate-950 dark:text-emerald-300 dark:hover:bg-emerald-950/30'
                        : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600',
                    ].join(' ')}
                  >
                    <i className="fa-solid fa-layer-group" />
                    فعال‌کردن دسته
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => confirmBulkVisibilityChange({
                    ids: filteredHiddenWidgets.map((widget) => widget.id),
                    visible: true,
                    title: 'نمایش کارت‌های مخفیِ فیلترشده',
                    description: `تمام ${formatNumberForStats(filteredHiddenWidgets.length)} کارت مخفیِ فیلترشده دوباره به داشبورد اضافه می‌شوند.`,
                    categoryLabel: widgetCategoryFilter !== 'all' ? widgetCategoryFilter : undefined,
                    scopeLabel: widgetCategoryFilter !== 'all' ? `فیلتر دسته ${widgetCategoryFilter}` : 'کارت‌های مخفیِ فیلترشده',
                  })}
                  disabled={filteredHiddenWidgets.length === 0}
                  className={[
                    'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[10px] font-bold transition',
                    filteredHiddenWidgets.length > 0
                      ? 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-slate-950 dark:text-emerald-300 dark:hover:bg-emerald-950/30'
                      : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600',
                  ].join(' ')}
                >
                  <i className="fa-solid fa-wand-magic-sparkles" />
                  بازگردانی کارت‌های مخفی
                </button>
              </div>
              {filteredHiddenWidgets.length === 0 ? (
                <div className="flex min-h-[150px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 text-center dark:border-slate-700 dark:bg-slate-950">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                    <i className="fa-solid fa-table-cells-large" />
                  </div>
                  <div className="mt-3 text-[12px] font-black text-slate-900 dark:text-slate-100">کارت مخفی مطابق این فیلتر پیدا نشد</div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">عبارت جستجو یا دسته‌بندی را تغییر دهید.</div>
                </div>
              ) : (
                <div className="dashboard-card-manager-list max-h-[520px] space-y-2 overflow-y-auto pr-1">
                  {filteredHiddenWidgets.map((widget) => (
                    <div key={widget.id} className="dashboard-card-manager-item flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
                      <button
                        type="button"
                        onClick={() => setWidgetVisibility(widget.id, true)}
                        className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        <i className="fa-solid fa-plus" />
                        نمایش
                      </button>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="min-w-0 text-right">
                          <div className="truncate text-[12px] font-black text-slate-900 dark:text-slate-100">{widget.title}</div>
                          <div className="mt-1 truncate text-[10px] text-slate-500 dark:text-slate-400">{widget.category}</div>
                        </div>
                        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                          <i className={widget.icon} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      <Link
        to="/customers?risk=risky"
        className="block rounded-[26px] border border-amber-200/90 bg-white p-4 text-right shadow-[0_18px_46px_-38px_rgba(15,23,42,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-38px_rgba(15,23,42,0.28)] dark:border-amber-900/55 dark:bg-slate-950"
        data-ui-dashboard-risky-customers="true"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <i className="fa-solid fa-triangle-exclamation" />
            </span>
            <div>
              <div className="text-[12px] font-black text-amber-700 dark:text-amber-200">کنترل فوری اعتبار مشتریان</div>
              <div className="mt-1 text-[18px] font-black text-slate-950 dark:text-slate-50">
                {riskyCustomersLoading ? 'در حال بررسی مشتریان پرریسک...' : `${riskyCustomersSummary.totalRisky.toLocaleString('fa-IR')} مشتری پرریسک`}
              </div>
              <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">
                مشتری‌هایی با امتیاز اعتماد پایین، دیرکرد/معوق یا چک برگشتی را مستقیم در لیست مشتریان ببینید.
              </p>
            </div>
          </div>

          <div className="grid min-w-full gap-2 sm:grid-cols-4 md:min-w-[520px]">
            {[
              { label: 'اعتماد زیر ۵۰', value: riskyCustomersSummary.lowScore, icon: 'fa-solid fa-gauge-simple-low' },
              { label: 'دیرکرد/معوق', value: riskyCustomersSummary.lateOrOverdue, icon: 'fa-solid fa-clock-rotate-left' },
              { label: 'چک برگشتی', value: riskyCustomersSummary.returnedChecks, icon: 'fa-solid fa-file-circle-exclamation' },
              { label: 'کمترین امتیاز', value: riskyCustomersSummary.worstScore ?? 0, icon: 'fa-solid fa-arrow-trend-down', suffix: riskyCustomersSummary.worstScore == null ? '—' : ' از ۱۰۰' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <span>{item.label}</span>
                  <i className={item.icon} />
                </div>
                <div className="mt-1 text-[14px] font-black text-slate-900 dark:text-slate-50">
                  {item.suffix === '—' ? '—' : `${Number(item.value || 0).toLocaleString('fa-IR')}${item.suffix || ''}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Link>

      {visibleFixedSections.map((sectionId) => (
        <React.Fragment key={sectionId}>
          {sectionId === 'spotlight' ? (
      <div data-ui-dashboard-spotlight="true" className="dashboard-spotlight-grid grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {dashboardSpotlight.map((item) => (
          <div
            key={item.key}
className={[
            'dashboard-spotlight-card group rounded-[24px] border bg-white p-3 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-34px_rgba(15,23,42,0.22)] dark:bg-slate-950',
            item.accentLevel === 'strong'
              ? (item.tone === 'emerald' ? 'border-emerald-300/90 dark:border-emerald-700/70' : item.tone === 'purple' ? 'border-violet-300/90 dark:border-violet-700/70' : item.tone === 'amber' ? 'border-amber-300/90 dark:border-amber-700/70' : 'border-sky-300/90 dark:border-sky-700/70')
              : item.accentLevel === 'medium'
              ? (item.tone === 'emerald' ? 'border-emerald-200/90 dark:border-emerald-800/60' : item.tone === 'purple' ? 'border-violet-200/90 dark:border-violet-800/60' : item.tone === 'amber' ? 'border-amber-200/90 dark:border-amber-800/60' : 'border-sky-200/90 dark:border-sky-800/60')
              : 'border-slate-200/80 dark:border-slate-800',
          ].join(' ')}
          >
            <MetricCard
              titleFa={item.titleFa}
              titleEn={item.titleEn}
              value={item.value}
              icon={item.icon}
              tone={item.tone}
              loading={showLoadingSkeletons}
              accentLevel={item.accentLevel}
            />
            <div className={[
              'mt-3 flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-[11px]',
              item.accentLevel === 'strong'
                ? (item.tone === 'emerald' ? 'border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-100' : item.tone === 'purple' ? 'border-violet-200/80 bg-violet-50 text-violet-800 dark:border-violet-800/60 dark:bg-violet-950/30 dark:text-violet-100' : item.tone === 'amber' ? 'border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100' : 'border-sky-200/80 bg-sky-50 text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-100')
                : 'border-slate-200/70 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
            ].join(' ')}>
              <span className="truncate">{item.caption}</span>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800">
                <i className={item.icon + ' text-[12px]'} />
              </span>
            </div>
          </div>
        ))}
      </div>


          ) : null}

          {sectionId === 'executive' ? (
      <div data-ui-dashboard-executive="true" className="dashboard-executive-grid grid grid-cols-1 gap-3 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="dashboard-executive-panel dashboard-executive-panel--finance group rounded-[24px] border border-slate-200/80 bg-white p-3 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-36px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-3">
            <div className="text-right">
              <div className="text-[13px] font-extrabold text-slate-900 dark:text-slate-100">نمای مدیریتی سریع</div>
              <div className="mt-1 text-[11px] leading-5.5 text-slate-500 dark:text-slate-400">خلاصه فروش، وصول و سود برای تصمیم‌گیری سریع مدیریتی</div>
            </div>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
              <i className="fa-solid fa-chart-line" />
            </div>
          </div>
          <div className="mt-4 rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/55">
            <div className="mb-2 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-[11px] font-black text-slate-600 dark:text-slate-300">شاخص‌های مالی کلیدی</span>
                <div className="mt-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">این کارت خلاصه مدیریتی را نشان می‌دهد؛ جزئیات و تحلیل کامل در بخش گزارش‌ها قرار دارد.</div>
              </div>
              <Link to="/reports/financial-overview" className="unified-action-button unified-action-button--neutral inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[10px] font-black text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:text-white">
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                نمای کلی مالی
              </Link>
            </div>
            <div className="mb-2 dashboard-kpi-surface-note text-[10px] font-black text-slate-500 dark:text-slate-400">
              <i className="fa-solid fa-layer-group" /> راهنما: هدر برای هشدارهای فوری، داشبورد برای تصمیم مدیریتی و گزارش‌ها برای تحلیل کامل استفاده می‌شود.
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {managerPulseItems.map((item) => (
                <div key={item.key} className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">{item.label}</div>
                      <div className="mt-1 truncate text-[15px] font-black text-slate-900 dark:text-white">{showLoadingSkeletons || productSalesLoading ? <Skeleton tone="info" className="h-5 w-24" rounded="lg" /> : item.value}</div>
                    </div>
                    <span className={[
                      'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800',
                      item.tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-300' : item.tone === 'sky' ? 'text-sky-600 dark:text-sky-300' : 'text-violet-600 dark:text-violet-300',
                    ].join(' ')}><i className={item.icon + ' text-[13px]'} /></span>
                  </div>
                  <div className="mt-1 truncate text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">{showLoadingSkeletons || productSalesLoading ? <Skeleton tone="info" className="h-3 w-28" rounded="lg" /> : item.hint}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">فروش نقدی گوشی</div>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-sky-600 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-sky-300 dark:ring-slate-800"><i className="fa-solid fa-mobile-screen-button text-[13px]" /></span>
              </div>
              <div className="mt-2 text-[15px] font-extrabold text-slate-900 dark:text-white">{showLoadingSkeletons ? <Skeleton tone="info" className="h-5 w-28" rounded="lg" /> : formatPriceForStats(dashboardData?.kpis?.phoneSalesRevenueMonth ?? 0)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">فروش اقساطی ماه</div>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-violet-600 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-violet-300 dark:ring-slate-800"><i className="fa-solid fa-file-invoice-dollar text-[13px]" /></span>
              </div>
              <div className="mt-2 text-[15px] font-extrabold text-slate-900 dark:text-white">{showLoadingSkeletons ? <Skeleton tone="warning" className="h-5 w-28" rounded="lg" /> : formatPriceForStats(dashboardData?.kpis?.installmentSalesRevenueMonth ?? 0)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">سود تعمیرات ماه</div>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-amber-600 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-amber-300 dark:ring-slate-800"><i className="fa-solid fa-screwdriver-wrench text-[13px]" /></span>
              </div>
              <div className="mt-2 text-[15px] font-extrabold text-slate-900 dark:text-white">{showLoadingSkeletons ? <Skeleton tone="violet" className="h-5 w-28" rounded="lg" /> : formatPriceForStats(dashboardData?.kpis?.repairProfitMonth ?? 0)}</div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{showLoadingSkeletons ? <div className="flex items-center gap-2"><Skeleton tone="violet" className="h-3 w-20" rounded="lg" /><Skeleton tone="violet" className="h-3 w-20" rounded="lg" /></div> : <>درآمد: {formatPriceForStats(dashboardData?.kpis?.repairRevenueMonth ?? 0)} • هزینه: {formatPriceForStats(dashboardData?.kpis?.repairCostsMonth ?? 0)}</>}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">مشتری و کالای فعال</div>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-emerald-600 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-emerald-300 dark:ring-slate-800"><i className="fa-solid fa-users-viewfinder text-[13px]" /></span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[15px] font-extrabold text-slate-900 dark:text-white">
                <span>{showLoadingSkeletons ? <Skeleton tone="info" className="h-5 w-10" rounded="lg" /> : formatNumberForStats(dashboardData?.kpis?.totalCustomersCount ?? 0)}</span>
                <span className="text-xs font-semibold text-slate-400">مشتری</span>
                <span className="text-slate-300">/</span>
                <span>{showLoadingSkeletons ? <Skeleton tone="success" className="h-5 w-10" rounded="lg" /> : formatNumberForStats(dashboardData?.kpis?.activeProductsCount ?? 0)}</span>
                <span className="text-xs font-semibold text-slate-400">کالا</span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">اقدام فوری سررسید</div>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-rose-600 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-rose-300 dark:ring-slate-800"><i className="fa-solid fa-bell-concierge text-[13px]" /></span>
              </div>
              <div className="mt-2 text-[15px] font-extrabold text-slate-900 dark:text-white">{showLoadingSkeletons ? <Skeleton tone="warning" className="h-5 w-12" rounded="lg" /> : formatNumberForStats(dueItems.length)}</div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{showLoadingSkeletons ? <Skeleton tone="warning" className="h-3 w-24" rounded="lg" /> : <>{formatPriceForStats(dueAmountTotal)} مانده وصول</>}</div>
            </div>
          </div>
        </div>

        <div className="dashboard-executive-panel dashboard-executive-panel--actions group rounded-[24px] border border-slate-200/80 bg-white p-3 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-36px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-3">
            <div className="text-right">
              <div className="text-[13px] font-extrabold text-slate-900 dark:text-slate-100">اقدام فوری</div>
              <div className="mt-1 text-[11px] leading-5.5 text-slate-500 dark:text-slate-400">میانبرهای شروع عملیات؛ شاخص‌ها و هشدارهای لحظه‌ای در هدر نمایش داده می‌شوند.</div>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"><i className="fa-solid fa-layer-group text-[10px]" /> Dashboard: شروع کار روزانه</div>
            </div>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
              <i className="fa-solid fa-bolt" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2.5">
            {[{to:'/sales/cash',icon:'fa-solid fa-cash-register',label:'ثبت اطلاعات فروش نقدی'},{to:'/installment-sales/new',icon:'fa-solid fa-file-invoice-dollar',label:'ثبت فروش اقساطی'},{to:'/repairs/new',icon:'fa-solid fa-screwdriver-wrench',label:'پذیرش تعمیر جدید'}].map((action) => (
              <Link key={action.to} to={action.to} className="dashboard-quick-action-link group/action flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-800 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-950">
                <span className="flex min-w-0 flex-col items-start gap-1"><span>{action.label}</span><span className="text-[10px] font-black text-slate-400 dark:text-slate-500">اقدام عملیاتی</span></span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-600 ring-1 ring-slate-200 transition-transform duration-300 group-hover/action:scale-105 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
                  <i className={action.icon} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>


          ) : null}
        </React.Fragment>
      ))}

      <div className="dashboard-fixed-operational-widgets grid grid-cols-1 gap-4 xl:grid-cols-12" data-ui-dashboard-fixed-operational-widgets="true">
        {fixedOperationalWidgetIds.map((id) => {
          const def = WIDGET_REGISTRY[id];
          if (!def) return null;
          const Component = def.Component;
          const preset = (DEFAULT_DASHBOARD_LAYOUT.sizes[id] || def.defaultPreset) as SizePreset;
          return (
            <div
              key={id}
              className={['min-w-0', FIXED_DASHBOARD_WIDGET_CLASSES[id] || 'xl:col-span-6 min-h-[360px]'].join(' ')}
              data-ui-dashboard-fixed-widget={id}
            >
              <WidgetShell title={def.title} icon={def.icon} editable={false} sizePreset={preset}>
                {(container) => <Component ctx={ctx} container={container} />}
              </WidgetShell>
            </div>
          );
        })}
      </div>

      {false && (
      <div className="hidden" data-ui-dashboard-grid-shell="disabled-legacy-manager">
        <ResponsiveGridLayout
          className="layout dashboard-widget-grid"
          data-ui-dashboard-grid="true"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={colsByBp}
          rowHeight={84}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          compactType="vertical"
          preventCollision={false}
          isDraggable={editing}
          isResizable={false} // تغییر اندازه فقط با دکمه خود کارت (پایدارتر)
          draggableHandle=".dash-drag-handle"
          draggableCancel="[data-rgl-no-drag]"
          useCSSTransforms={true}
          onDragStop={onDragStop}
        >
          {usedWidgetIds.map((id) => {
            const def = WIDGET_REGISTRY[id];
            if (!def) return null;

            const Component = def.Component;
            const canRemove = def.canRemove !== false;
            const preset = (layout.sizes[id] || def.defaultPreset) as SizePreset;

            return (
              <div key={id} className="h-full min-w-0" data-ui-dashboard-widget-item={id} data-dashboard-widget-preset={preset}>
                <WidgetShell
                  title={def.title}
                  icon={def.icon}
                  editable={editing}
                  onRemove={canRemove ? () => removeWidget(id) : undefined}
                  onResizeToggle={editing ? () => toggleSize(id) : undefined}
                  sizePreset={preset}
                >
                  {(container) => <Component ctx={ctx} container={container} />}
                </WidgetShell>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      </div>
      )}

      {false && (
      <AddWidgetModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        available={availableToAdd}
        onAdd={addWidget}
      />
      )}
    </div>
  );
};

export default Dashboard;
