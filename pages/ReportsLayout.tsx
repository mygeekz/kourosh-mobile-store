import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import TelegramTopicPanel from '../components/TelegramTopicPanel';
import ReportSchedulePanel from '../components/ReportSchedulePanel';
import { exportReportToXlsx } from '../utils/reportXlsx';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../utils/apiUtils';
import { ReportsExportsProvider } from '../contexts/ReportsExportsContext';
import Button from '../components/Button';
import ReportsDecisionEngine from '../components/reports/ReportsDecisionEngine';
import ReportsAutoActionEngine from '../components/reports/ReportsAutoActionEngine';

type ModalKind = null | 'telegram' | 'schedule' | 'views' | 'send' | 'command' | 'workspace';

type ExportHandlers = {
  excel?: () => void | Promise<void>;
};

// Action buttons: force readable colors regardless of inherited styles.
const BTN =
  "report-action-btn unified-action-button unified-action-button--neutral inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900";
const BTN_GHOST =
  "report-action-btn unified-action-button unified-action-button--neutral inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-transparent bg-transparent px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 active:scale-[0.99] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white";
const BTN_PRIMARY =
  "report-action-btn unified-action-button unified-action-button--primary inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-3.5 text-xs font-extrabold text-white transition hover:bg-slate-800 active:scale-[0.99] dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white";

const PILL_GROUP =
  "inline-flex w-full flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-white px-1.5 py-1.5 md:w-auto dark:border-slate-800 dark:bg-slate-950";

function PremiumModal({
  open,
  title,
  subtitle,
  icon,
  onClose,
  primaryLabel = "ذخیره تغییرات",
  onPrimary,
  children,
  maxWidthClass = "max-w-5xl",
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose: () => void;
  primaryLabel?: string;
  onPrimary?: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
}) {
  if (!open) return null;

  // مهم: چون بعضی از کانتینرها در اپ transform دارند (Framer Motion/Layouts)،
  // position:fixed ممکن است نسبت به همان کانتینر محاسبه شود و پنجره جابجا باز شود.
  // برای اینکه همیشه وسط viewport باشد، مودال را به document.body پورتال می‌کنیم.
  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-6" dir="rtl" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.985 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className={[
          "w-full",
          maxWidthClass,
          "relative z-10",
          "rounded-2xl overflow-hidden",
          // NOTE: از رنگ‌های صریح استفاده می‌کنیم تا پنجره "مات/طوسی" نشود.
          "bg-white text-gray-900 border border-gray-200 shadow-2xl",
          "dark:bg-slate-900 dark:text-gray-100 dark:border-slate-800",
        ].join(" ")}
      >
        {/* Accent bar */}
        <div className="h-1 bg-slate-900 dark:bg-slate-100" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm grid place-items-center dark:bg-slate-900 dark:ring-slate-800">
                  {icon ?? <span className="text-lg">⚙️</span>}
                </div>
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 truncate">
                    {title}
                  </div>
                  {subtitle ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {subtitle}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-xl hover:bg-gray-100 grid place-items-center text-gray-700 transition dark:hover:bg-white/10 dark:text-gray-200"
              aria-label="بستن"
              title="بستن"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-auto">
          <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 min-w-0 overflow-x-auto dark:border-slate-800 dark:bg-slate-900/40">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 bg-white sticky bottom-0 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 justify-end">
              <Button type="button" variant="secondary" size="md" onClick={onClose}>
                انصراف
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => (onPrimary ? onPrimary() : onClose())}
              >
                {primaryLabel}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

type ReportMeta = {
  path: string; // absolute
  title: string;
  description: string;
};

// Keep this list in-sync with App.tsx report routes.
const REPORT_META: ReportMeta[] = [
  { path: '/reports', title: 'مرکز گزارش‌ها', description: 'نقشه گزارش‌های رسمی و تحلیل‌ها' },
  { path: '/reports/sales-summary', title: 'گزارش فروش و سود', description: 'روند فروش، پرفروش‌ها و سود ناخالص در بازه' },
  { path: '/reports/sales', title: 'گزارش فروش و سود', description: 'مسیر سریع گزارش فروش و سود' },
  { path: '/reports/product-sales', title: 'فروش غیرگوشی', description: 'جمع و جزئیات فروش لوازم و خدمات با خروجی' },
  { path: '/reports/followups', title: 'پیگیری‌ها', description: 'لیست پیگیری‌ها و وضعیت انجام' },
  { path: '/reports/collection-center', title: 'مرکز پیگیری وصول', description: 'اولویت‌های روزانه وصول، اقدام سریع و تاریخچه پیگیری' },
  { path: '/reports/collection-followup', title: 'مرکز پیگیری وصول', description: 'مسیر سریع مرکز پیگیری وصول' },
  { path: '/reports/debtors', title: 'گزارش بدهکاران', description: 'لیست بدهکاران مشتری با مرتب‌سازی و جستجو' },
  { path: '/reports/creditors', title: 'گزارش بستانکاران', description: 'لیست بستانکاران تامین‌کننده/همکار' },
  { path: '/reports/top-customers', title: 'مشتریان برتر', description: 'رتبه‌بندی مشتریان پرفروش در بازه انتخابی' },
  { path: '/reports/top-suppliers', title: 'تامین‌کنندگان برتر', description: 'رتبه‌بندی تأمین‌کنندگان بر اساس گردش و ارزش خرید' },
  { path: '/reports/mobile-sales-analytics', title: 'تحلیل گوشی نقد و اقساط', description: 'مرکز سود، ریسک وصول، قیمت خرید روز و اصل پول شرکا' },
  { path: '/reports/smart-insights', title: 'دستیار هوشمند مدیریت', description: 'بینش‌های قابل اقدام، وضعیت یادگیری، تشخیص ریسک و پیشنهادهای هوشمند' },
  { path: '/reports/phone-sales', title: 'فروش موبایل (نقدی)', description: 'سود هر فروش موبایل، IMEI، مشتری و تاریخ' },
  { path: '/reports/phone-installment-sales', title: 'فروش اقساطی موبایل', description: 'سود فروش‌های اقساطی موبایل در بازه' },
  { path: '/reports/periodic-comparison', title: 'مقایسه‌ای فروش', description: 'مقایسه دوره انتخابی با دوره قبل/سال قبل' },
  { path: '/reports/financial-overview', title: 'نمای کلی مالی', description: 'شاخص‌های مالی، مانده‌ها و گردش نقدی' },
  { path: '/reports/financial-audit', title: 'ممیزی اختلاف گزارش‌ها', description: 'کنترل اختلاف فروش، پرداخت، سود و موجودی' },
  { path: '/reports/realized-profit', title: 'سود تحقق‌یافته', description: 'سود شناسایی‌شده بر اساس وصول واقعی و COGS نسبتی' },
  { path: '/reports/analytics', title: 'داشبورد تحلیلی', description: 'روندها، مقایسه ماه‌ها و تحلیل محصولات' },
  { path: '/reports/product-profit-real', title: 'سود واقعی هر محصول', description: 'سود/زیان واقعی (FIFO) و سهم از درآمد' },
  { path: '/reports/installments-calendar', title: 'تقویم اقساط و چک‌ها', description: 'نمایش سررسیدها در بازه انتخابی' },
  { path: '/reports/rfm', title: 'RFM', description: 'تحلیل وفاداری مشتریان' },
  { path: '/reports/cohort', title: 'تحلیل بازگشت مشتری', description: 'تحلیل بازگشت مشتریان در گروه‌های زمانی' },
  { path: '/reports/inventory-turnover', title: 'گردش موجودی', description: 'گردش موجودی و میانگین روزهای ماندگاری کالا' },
  { path: '/reports/dead-stock', title: 'کالاهای راکد', description: 'کالاهای بدون حرکت و خواب سرمایه' },
  { path: '/reports/abc', title: 'تحلیل ABC موجودی', description: 'طبقه‌بندی کالاها بر اساس ارزش و گردش فروش' },
  { path: '/reports/aging-receivables', title: 'سن بدهی و ریسک وصول', description: 'اولویت‌بندی بدهی مشتریان بر اساس مدت‌زمان عقب‌افتادگی' },
  { path: '/reports/cashflow', title: 'جریان نقدی', description: 'ورودی و خروجی نقدی واقعی فروشگاه' },
  { path: '/reports/analysis', title: 'تحلیل پیشرفته', description: 'سودآوری، سلامت موجودی و پیشنهاد خرید' },
  { path: '/reports/analysis/profitability', title: 'تحلیل سودآوری', description: 'سودآوری و سهم سود در بازه' },
  { path: '/reports/analysis/inventory', title: 'تحلیل موجودی', description: 'تحلیل موجودی و گردش کالا' },
  { path: '/reports/analysis/suggestions', title: 'پیشنهاد خرید هوشمند', description: 'پیشنهاد خرید بر اساس روند فروش' },
];

function pickMeta(pathname: string): ReportMeta {
  const exact = REPORT_META.find((m) => m.path === pathname);
  if (exact) return exact;
  const pref = REPORT_META
    .filter((m) => pathname.startsWith(m.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return (
    pref || {
      path: pathname,
      title: 'گزارش',
      description: 'جزئیات گزارش',
    }
  );
}

type ReportHealthState = {
  tone: 'good' | 'review' | 'warn';
  label: string;
  title: string;
};

function getReportHealthState(item: Pick<ReportMeta, 'path' | 'title'>): ReportHealthState {
  const path = item.path.toLowerCase();
  if (path.includes('audit') || path.includes('aging') || path.includes('dead-stock') || path.includes('collection')) {
    return { tone: 'warn', label: 'هشدار', title: 'این گزارش برای کنترل ریسک یا اختلاف نیازمند بررسی دقیق‌تر است.' };
  }
  if (path.includes('financial') || path.includes('analytics') || path.includes('profit') || path.includes('smart') || path.includes('analysis')) {
    return { tone: 'review', label: 'بررسی', title: 'گزارش کلیدی است و بهتر است قبل از تصمیم مدیریتی مرور شود.' };
  }
  return { tone: 'good', label: 'سالم', title: 'گزارش در وضعیت عادی و آماده استفاده است.' };
}

function ReportHealthMiniBadge({ item }: { item: Pick<ReportMeta, 'path' | 'title'> }) {
  const health = getReportHealthState(item);
  return (
    <span className={`reports-health-badge reports-health-badge--${health.tone}`} title={health.title}>
      <span className="reports-health-badge__dot" />
      {health.label}
    </span>
  );
}


type ReportCommandItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  group: 'گزارش‌ها' | 'اقدام‌ها' | 'نمایش';
  action: () => void | Promise<void>;
};


function ReportsWorkspacePanel({
  favorites,
  recent,
  savedViews,
  viewsLoading,
  currentPath,
  onClose,
  onOpenView,
  onDeleteView,
  onToggleFavorite,
}: {
  favorites: ReportMeta[];
  recent: ReportMeta[];
  savedViews: any[];
  viewsLoading: boolean;
  currentPath: string;
  onClose: () => void;
  onOpenView: (row: any) => void;
  onDeleteView: (id: number) => void | Promise<void>;
  onToggleFavorite: (path: string) => void;
}) {
  void savedViews;
  void viewsLoading;
  void onOpenView;
  void onDeleteView;
  const renderReportLink = (item: ReportMeta, kind: 'favorite' | 'recent') => (
    <div key={`${kind}:${item.path}`} className="reports-workspace-row">
      <Link to={item.path} onClick={onClose} className={item.path === currentPath ? 'is-active' : ''}>
        <span className="reports-workspace-row__title">
          <span>{item.title}</span>
          <ReportHealthMiniBadge item={item} />
        </span>
        <span className="reports-workspace-row__subtitle">{item.description}</span>
      </Link>
      {kind === 'favorite' ? (
        <button type="button" onClick={() => onToggleFavorite(item.path)} title="حذف از منتخب‌ها">
          <i className="fa-solid fa-star" />
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="reports-workspace-panel" dir="rtl">
      <div className="reports-workspace-panel__head">
        <div>
          <div className="reports-workspace-panel__title">فضای کاری گزارش‌ها</div>
          <div className="reports-workspace-panel__subtitle">گزارش‌های منتخب و بازدیدهای اخیر در یک نمای مدیریتی</div>
        </div>
        <button type="button" onClick={onClose} aria-label="بستن">
          ✕
        </button>
      </div>

      <div className="reports-workspace-panel__grid">
        <section>
          <div className="reports-workspace-section-title">
            <i className="fa-solid fa-star" />
            منتخب‌ها
          </div>
          <div className="reports-workspace-stack">
            {favorites.length ? favorites.map((item) => renderReportLink(item, 'favorite')) : (
              <div className="reports-workspace-empty">هنوز گزارشی pin نشده است.</div>
            )}
          </div>
        </section>

        <section>
          <div className="reports-workspace-section-title">
            <i className="fa-solid fa-clock-rotate-left" />
            اخیر
          </div>
          <div className="reports-workspace-stack">
            {recent.length ? recent.map((item) => renderReportLink(item, 'recent')) : (
              <div className="reports-workspace-empty">هنوز گزارشی باز نشده است.</div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}


function ReportsCommandPalette({
  open,
  items,
  onClose,
}: {
  open: boolean;
  items: ReportCommandItem[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 18);
    return items
      .filter((item) =>
        [item.title, item.subtitle, item.group]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      )
      .slice(0, 24);
  }, [items, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const runItem = async (item?: ReportCommandItem) => {
    if (!item) return;
    await item.action();
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <div className="reports-command fixed inset-0 z-[260] flex items-start justify-center px-3 pt-[10vh]" dir="rtl" role="dialog" aria-modal="true" aria-label="جستجوی سریع گزارش‌ها">
      <button type="button" className="reports-command__backdrop" onClick={onClose} aria-label="بستن جستجوی سریع" />
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.14, ease: 'easeOut' }}
        className="reports-command__panel"
      >
        <div className="reports-command__search">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((idx) => Math.min(idx + 1, Math.max(0, filtered.length - 1)));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((idx) => Math.max(0, idx - 1));
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                runItem(filtered[activeIndex]);
              }
            }}
            placeholder="جستجو در گزارش‌ها و اکشن‌ها…"
          />
          <span>⌘K</span>
        </div>

        <div className="reports-command__list" role="listbox">
          {filtered.length ? filtered.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={idx === activeIndex}
              className={idx === activeIndex ? 'is-active' : ''}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => runItem(item)}
            >
              <span className="reports-command__icon"><i className={`fa-solid ${item.icon}`} /></span>
              <span className="min-w-0 flex-1 text-right">
                <span className="reports-command__title">{item.title}</span>
                {item.subtitle ? <span className="reports-command__subtitle">{item.subtitle}</span> : null}
              </span>
              <span className="reports-command__group">{item.group}</span>
            </button>
          )) : (
            <div className="reports-command__empty">
              <div className="font-black">نتیجه‌ای پیدا نشد</div>
              <div>عبارت را کوتاه‌تر کن یا نام گزارش را جستجو کن.</div>
            </div>
          )}
        </div>

        <div className="reports-command__footer">
          <span>Enter اجرا</span>
          <span>↑↓ انتخاب</span>
          <span>Esc بستن</span>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}



function ReportsCentralActionBar({
  onOpenSchedule,
  onOpenTelegram,
  onSendNow,
  onExportExcel,
}: {
  onOpenSchedule: () => void;
  onOpenTelegram: () => void;
  onSendNow: () => void;
  onExportExcel: () => void | Promise<void>;
}) {
  const secondaryActions = [
    { key: 'schedule', label: 'زمان‌بندی', iconClass: 'fa-solid fa-clock', className: BTN, onClick: onOpenSchedule },
    { key: 'telegram', label: 'تلگرام', iconClass: 'fa-brands fa-telegram', className: BTN, onClick: onOpenTelegram },
    { key: 'excel', label: 'اکسل', iconClass: 'fa-solid fa-file-excel', className: BTN, onClick: onExportExcel },
  ];

  return (
    <div className="reports-central-action-bar reports-central-action-bar--stage3" data-report-actions="centralized">
      <div className="reports-central-action-bar__meta">
        <span className="reports-central-action-bar__eyebrow">عملیات گزارش</span>
        <span className="reports-central-action-bar__title">ارسال، زمان‌بندی و خروجی</span>
      </div>
      <div className="reports-central-action-bar__group" role="toolbar" aria-label="اکشن‌های مرکزی گزارش">
        {secondaryActions.map((action) => (
          <button key={action.key} type="button" onClick={action.onClick} className={action.className} data-report-action={action.key}>
            <i className={action.iconClass} />
            <span>{action.label}</span>
          </button>
        ))}
        <button type="button" onClick={onSendNow} className={`${BTN_PRIMARY} reports-central-action-bar__primary`} data-report-action="send">
          <i className="fa-solid fa-paper-plane" />
          <span>ارسال فوری</span>
        </button>
      </div>
    </div>
  );
}

const ReportsLayout: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [modal, setModal] = useState<ModalKind>(null);
  const [savedViews, setSavedViews] = useState<any[]>([]);
  const [viewsLoading, setViewsLoading] = useState(false);
  // خروجی PDF و چاپ حذف شد؛ فقط اکسل
  const [viewName, setViewName] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState<string>('');
  const [exportHandlers, setExportHandlers] = useState<ExportHandlers>({});
  const registerReportExports = useCallback((h: ExportHandlers) => setExportHandlers(h || {}), []);
  const reportKey = pathname.split('/').slice(2).join('/') || 'reports';
  const meta = useMemo(() => pickMeta(pathname), [pathname]);
  const isHub = pathname === '/reports' || pathname === '/reports/';

  const [reportViewMode, setReportViewMode] = useState<'executive' | 'analyst'>(() => {
    try {
      return localStorage.getItem('reports:viewMode') === 'analyst' ? 'analyst' : 'executive';
    } catch {
      return 'executive';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('reports:viewMode', reportViewMode);
    } catch {
      // ignore storage failures
    }
  }, [reportViewMode]);

  const [favoriteReports, setFavoriteReports] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('reports:favorites');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('reports:favorites', JSON.stringify(favoriteReports.slice(0, 12)));
    } catch {
      // ignore storage failures
    }
  }, [favoriteReports]);

  const toggleFavoriteReport = useCallback((path: string) => {
    setFavoriteReports((current) => {
      if (current.includes(path)) return current.filter((item) => item !== path);
      return [path, ...current].slice(0, 12);
    });
  }, []);

  const [recentReports, setRecentReports] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('reports:recent');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (isHub) return;
    if (!REPORT_META.some((item) => item.path === pathname)) return;
    setRecentReports((current) => [pathname, ...current.filter((item) => item !== pathname)].slice(0, 12));
  }, [isHub, pathname]);

  useEffect(() => {
    try {
      localStorage.setItem('reports:recent', JSON.stringify(recentReports.slice(0, 12)));
    } catch {
      // ignore storage failures
    }
  }, [recentReports]);


  useEffect(() => {
    setExportHandlers({});
  }, [reportKey]);
  const hideOuterHeader = false;

  const favoriteItems = useMemo(() => {
    const picked = favoriteReports
      .map((path) => REPORT_META.find((item) => item.path === path))
      .filter(Boolean) as ReportMeta[];
    return picked.slice(0, 5);
  }, [favoriteReports]);

  const recentItems = useMemo(() => {
    const picked = recentReports
      .filter((path) => path !== pathname)
      .map((path) => REPORT_META.find((item) => item.path === path))
      .filter(Boolean) as ReportMeta[];
    return picked.slice(0, 5);
  }, [pathname, recentReports]);

  const currentReportCanBePinned = !isHub && REPORT_META.some((item) => item.path === pathname);
  const currentReportPinned = favoriteReports.includes(pathname);
  const hideReportInsightBars = pathname === '/reports/product-sales';

  // خروجی PDF/چاپ کلاً حذف شد.

  const doExportXlsx = async () => {
    if (exportHandlers.excel) {
      await exportHandlers.excel();
      return;
    }
    const el = document.getElementById('report-print-root');
    if (!el) return;
    await exportReportToXlsx({ title: meta.title, element: el });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = !!target?.closest('input, textarea, select, [contenteditable="true"]');
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (!isTyping) setModal('command');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const commandItems = useMemo<ReportCommandItem[]>(() => {
    const reportItems: ReportCommandItem[] = REPORT_META
      .filter((item) => item.path !== '/reports')
      .map((item) => ({
        id: `report:${item.path}`,
        title: item.title,
        subtitle: `${getReportHealthState(item).label} • ${item.description}`,
        icon: item.path === pathname ? 'fa-circle-check' : 'fa-chart-simple',
        group: 'گزارش‌ها',
        action: () => navigate(item.path),
      }));

    const actionItems: ReportCommandItem[] = [
      {
        id: 'action:excel',
        title: 'دریافت اکسل همین گزارش',
        subtitle: 'خروجی عددی برای بررسی حسابداری',
        icon: 'fa-file-excel',
        group: 'اقدام‌ها',
        action: doExportXlsx,
      },
      {
        id: 'action:send',
        title: 'ارسال فوری گزارش',
        subtitle: 'ارسال به مقصدهای تلگرام تنظیم‌شده',
        icon: 'fa-paper-plane',
        group: 'اقدام‌ها',
        action: () => setModal('send'),
      },
      {
        id: 'action:schedule',
        title: 'زمان‌بندی ارسال',
        subtitle: 'استفاده از پنل زمان‌بندی موجود',
        icon: 'fa-clock',
        group: 'اقدام‌ها',
        action: () => setModal('schedule'),
      },
      {
        id: 'action:workspace',
        title: 'فضای کاری گزارش‌ها',
        subtitle: 'منتخب‌ها و اخیر در یک پنل',
        icon: 'fa-table-cells-large',
        group: 'اقدام‌ها',
        action: () => setModal('workspace'),
      },
      {
        id: 'action:telegram-settings',
        title: 'تنظیمات تلگرام گزارش',
        subtitle: 'قالب پیام، مقصدها و وضعیت ارسال',
        icon: 'fa-paper-plane',
        group: 'اقدام‌ها',
        action: () => setModal('telegram'),
      },
      {
        id: 'view:executive',
        title: 'حالت مدیریتی',
        subtitle: 'نمای خلاصه مدیریتی و کم‌حجم',
        icon: 'fa-layer-group',
        group: 'نمایش',
        action: () => setReportViewMode('executive'),
      },
      {
        id: 'view:analyst',
        title: 'حالت تحلیلی',
        subtitle: 'نمای جزئی‌تر برای تحلیل و کنترل',
        icon: 'fa-table-list',
        group: 'نمایش',
        action: () => setReportViewMode('analyst'),
      },
      ...(currentReportCanBePinned ? [{
        id: 'favorite:toggle-current',
        title: currentReportPinned ? 'حذف گزارش فعلی از منتخب‌ها' : 'ثبت کردن گزارش فعلی',
        subtitle: currentReportPinned ? 'این گزارش از نوار منتخب‌ها حذف می‌شود' : 'این گزارش به نوار دسترسی سریع اضافه می‌شود',
        icon: currentReportPinned ? 'fa-star-half-stroke' : 'fa-star',
        group: 'اقدام‌ها' as const,
        action: () => toggleFavoriteReport(pathname),
      }] : []),
    ];

    const recentCommandItems: ReportCommandItem[] = recentItems.map((item) => ({
      id: `recent:${item.path}`,
      title: item.title,
      subtitle: 'آخرین گزارش‌های بازشده',
      icon: 'fa-clock-rotate-left',
      group: 'گزارش‌ها',
      action: () => navigate(item.path),
    }));

    return [...actionItems, ...recentCommandItems, ...reportItems];
  }, [doExportXlsx, navigate, pathname, currentReportCanBePinned, currentReportPinned, toggleFavoriteReport, recentItems]);

  const parseRangeFromUrl = () => {
    const search = window.location.search || '';
    const sp = new URLSearchParams(search);
    const fromJ = sp.get('fromDate') || sp.get('from') || sp.get('fromJ') || '';
    const toJ = sp.get('toDate') || sp.get('to') || sp.get('toJ') || '';
    return { fromJ, toJ, search };
  };

  const loadViews = async () => {
    setViewsLoading(true);
    try {
      const res = await fetch(`/api/reports/saved-filters?reportKey=${encodeURIComponent(reportKey)}`, {
        headers: { ...(getAuthHeaders(token) as any) },
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'خطا در دریافت نماهای ذخیره‌شده');
      const rows = Array.isArray(json.data) ? json.data : [];
      const mapped = rows.map((r: any) => {
        let parsed: any = {};
        try {
          parsed = r?.filtersJson ? JSON.parse(String(r.filtersJson)) : (r?.filters || {});
        } catch {
          parsed = {};
        }
        return { ...r, filtersObj: parsed };
      });
      setSavedViews(mapped);
    } catch {
      setSavedViews([]);
    } finally {
      setViewsLoading(false);
    }
  };

  useEffect(() => {
    if (!isHub) loadViews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportKey]);

  const saveView = async () => {
    const name = String(viewName || '').trim();
    if (!name) return;
    const { search } = parseRangeFromUrl();
    try {
      const res = await fetch('/api/reports/saved-filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(getAuthHeaders(token) as any) },
        body: JSON.stringify({ reportKey, name, filters: { search } }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'خطا در ذخیره نمای گزارش');
      setViewName('');
      await loadViews();
    } catch {
      // silent
    }
  };

  void saveView;

  const applyView = (row: any) => {
    const search = String(row?.filtersObj?.search || row?.filters?.search || '');
    navigate(`${pathname}${search || ''}`);
    setModal(null);
  };

  const deleteView = async (id: number) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/reports/saved-filters/${id}`, {
        method: 'DELETE',
        headers: { ...(getAuthHeaders(token) as any) },
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'خطا در حذف نمای گزارش');
      await loadViews();
    } catch {
      // silent
    }
  };

  const sendToTelegramNow = async () => {
    setSendLoading(true);
    setSendResult('');
    try {
      const { fromJ, toJ } = parseRangeFromUrl();
      const payloadJson = { range: { fromJ: fromJ || undefined, toJ: toJ || undefined } };
      const res = await fetch('/api/reports/send-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(getAuthHeaders(token) as any) },
        body: JSON.stringify({ reportKey, payloadJson }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'خطا در ارسال گزارش');
      setSendResult(`ارسال انجام شد: ${json.data?.sent ?? 0} از ${json.data?.total ?? 0}`);
    } catch (e: any) {
      setSendResult(e?.message || 'خطا در ارسال گزارش');
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="reports-layout-executive reports-redesign-v1 space-y-4" data-report-view-mode={reportViewMode} data-ui-report-layout="true" data-ui-report-page="true">
      {!hideOuterHeader ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="reports-executive-header print:hidden"
          data-ui-report-header="outer"
        >
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between" data-ui-report-header-main="true">
            <div className="min-w-0 flex-1 text-right" data-ui-report-title-cluster="true">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="reports-header-kicker">{isHub ? 'مرکز گزارش‌ها' : 'نمای مدیریتی'}</span>
                <h1 className="truncate text-base font-black text-slate-950 dark:text-slate-100 sm:text-lg">{meta.title}</h1>
                {!isHub ? (
                  <Link
                    to="/reports"
                    className="reports-header-back-link"
                  >
                    <i className="fa-solid fa-arrow-right" />
                    بازگشت
                  </Link>
                ) : null}
              </div>
              <p className="mt-1 max-w-3xl truncate text-xs leading-6 text-slate-500 dark:text-slate-400">{meta.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2" data-ui-report-header-actions="true">
              <button type="button" className="reports-workspace-trigger" onClick={() => setModal('workspace')} title="فضای کاری گزارش‌ها">
                <i className="fa-solid fa-table-cells-large" />
                <span>فضای کاری</span>
              </button>
              <button type="button" className="reports-command-trigger" onClick={() => setModal('command')} title="جستجوی سریع گزارش‌ها (Ctrl/Cmd + K)">
                <i className="fa-solid fa-command" />
                <span>جستجو</span>
                <kbd>⌘K</kbd>
              </button>
              <div className="reports-view-mode-toggle" role="group" aria-label="حالت نمایش گزارش">
                <button
                  type="button"
                  aria-pressed={reportViewMode === 'executive'}
                  onClick={() => setReportViewMode('executive')}
                  className={reportViewMode === 'executive' ? 'is-active' : ''}
                >
                  مدیریتی
                </button>
                <button
                  type="button"
                  aria-pressed={reportViewMode === 'analyst'}
                  onClick={() => setReportViewMode('analyst')}
                  className={reportViewMode === 'analyst' ? 'is-active' : ''}
                >
                  تحلیلی
                </button>
              </div>
              {currentReportCanBePinned ? (
                <button
                  type="button"
                  className={currentReportPinned ? 'reports-favorite-pin is-active' : 'reports-favorite-pin'}
                  onClick={() => toggleFavoriteReport(pathname)}
                  title={currentReportPinned ? 'حذف از منتخب‌ها' : 'افزودن به منتخب‌ها'}
                  aria-pressed={currentReportPinned}
                >
                  <i className="fa-solid fa-star" />
                  <span>{currentReportPinned ? 'منتخب' : 'پین'}</span>
                </button>
              ) : null}
            </div>
          </div>

          {favoriteItems.length ? (
            <div className="reports-favorites-bar" aria-label="گزارش‌های پین‌شده" data-ui-report-shortcuts="favorites">
              <span className="reports-favorites-bar__label">
                <i className="fa-solid fa-star" />
                منتخب‌ها
              </span>
              {favoriteItems.map((item) => (
                <Link key={item.path} to={item.path} className={item.path === pathname ? 'is-active' : ''}>
                  {item.title}
                </Link>
              ))}
            </div>
          ) : null}

          {recentItems.length ? (
            <div className="reports-recent-bar" aria-label="آخرین گزارش‌های بازشده" data-ui-report-shortcuts="recent">
              <span className="reports-recent-bar__label">
                <i className="fa-solid fa-clock-rotate-left" />
                اخیر
              </span>
              {recentItems.map((item) => (
                <Link key={item.path} to={item.path}>
                  {item.title}
                </Link>
              ))}
            </div>
          ) : null}

          {!isHub ? (
            <ReportsCentralActionBar
                            onOpenSchedule={() => setModal('schedule')}
              onOpenTelegram={() => setModal('telegram')}
              onSendNow={() => setModal('send')}
              onExportExcel={doExportXlsx}
            />
          ) : null}
        </motion.div>
      ) : null}

      {!hideReportInsightBars ? <ReportsDecisionEngine /> : null}
      {!hideReportInsightBars ? (
        <ReportsAutoActionEngine
          reportKey={reportKey}
          reportTitle={meta.title}
          isHub={isHub}
          onSendNow={sendToTelegramNow}
          onOpenSchedule={() => setModal('schedule')}
          onExportExcel={doExportXlsx}
        />
      ) : null}

      {/* Single-column report content */}
      <div className="report-page" id="report-print-root" data-ui-report-body="true">
        <ReportsExportsProvider value={{ registerReportExports }}>
          <Outlet context={{ registerReportExports }} />
        </ReportsExportsProvider>
      </div>

      {modal === 'workspace' ? createPortal((
        <div className="reports-workspace reports-workspace--drawer fixed inset-0 z-[360]" dir="rtl" role="dialog" aria-modal="true" aria-label="فضای کاری گزارش‌ها">
          <button type="button" className="reports-workspace__backdrop" onClick={() => setModal(null)} aria-label="بستن فضای کاری" />
          <motion.aside
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="reports-workspace__drawer"
          >
            <ReportsWorkspacePanel
              favorites={favoriteItems}
              recent={recentItems}
              savedViews={savedViews}
              viewsLoading={viewsLoading}
              currentPath={pathname}
              onClose={() => setModal(null)}
              onOpenView={applyView}
              onDeleteView={deleteView}
              onToggleFavorite={toggleFavoriteReport}
            />
          </motion.aside>
        </div>
      ), document.body) : null}

      <ReportsCommandPalette
        open={modal === 'command'}
        items={commandItems}
        onClose={() => setModal(null)}
      />

      {/* Modals */}
      {!isHub ? (
        <>
          <PremiumModal
            open={modal === 'telegram'}
            title={`تنظیمات تلگرام | ${meta.title}`}
            subtitle="قالب پیام، مقصدها، وضعیت ارسال و تنظیمات مرتبط"
            icon={<span className="text-lg">✈️</span>}
            onClose={() => setModal(null)}
            primaryLabel="ذخیره تغییرات"
          >
            <TelegramTopicPanel
              topic="reports"
              title={`ارسال‌های تلگرام | ${meta.title}`}
              allowedTypes={[{ key: reportKey, label: meta.title }]}
            />
          </PremiumModal>
          <PremiumModal
            open={modal === 'schedule'}
            title={`زمان‌بندی ارسال | ${meta.title}`}
            subtitle="تعریف برنامه ارسال خودکار و مدیریت اجرای ارسال‌ها"
            icon={<span className="text-lg">⏱️</span>}
            onClose={() => setModal(null)}
            primaryLabel="ذخیره تغییرات"
            maxWidthClass="max-w-4xl"
          >
            <ReportSchedulePanel reportKey={reportKey} reportTitle={meta.title} />
          </PremiumModal>


          <PremiumModal
            open={modal === 'send'}
            title={`ارسال به تلگرام | ${meta.title}`}
            subtitle="همین الان این گزارش را به مقصدهای تلگرام ارسال کن (بر اساس بازه انتخابی همین صفحه)"
            icon={<span className="text-lg">✈️</span>}
            onClose={() => setModal(null)}
            primaryLabel={sendLoading ? 'در حال ارسال…' : 'ارسال'}
            onPrimary={sendToTelegramNow}
            maxWidthClass="max-w-3xl"
          >
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/40 p-3">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">نکته</div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  اگر Chat IDها یا توکن تنظیم نشده باشد، ارسال انجام نمی‌شود. تنظیمات را از دکمه «تنظیمات تلگرام» تکمیل کن.
                </div>
              </div>
              {sendResult ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3 text-sm text-slate-800 dark:text-slate-200">
                  {sendResult}
                </div>
              ) : null}
            </div>
          </PremiumModal>
        </>
      ) : null}
    </div>
  );
};

export default ReportsLayout;
