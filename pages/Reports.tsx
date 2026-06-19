import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AppSearchField from '../components/ui/AppSearchField';

type CategoryId = 'financial' | 'sales' | 'customers' | 'inventory' | 'analysis';
type ReportScope = 'overview' | 'drilldown' | 'control' | 'operational';

type CategoryMeta = {
  id: CategoryId;
  title: string;
  description: string;
};

// Lightweight inline icons (no external deps)
const I = {
  Chart: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 19H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 16V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 16V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Trend: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path
        d="M4 16l6-6 4 4 6-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 6v6h-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Users: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path d="M16 11a4 4 0 10-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 20c1.5-4 14.5-4 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Box: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path d="M3 7l9-4 9 4-9 4-9-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 7v10l9 4 9-4V7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 11v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Wallet: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path d="M3 7h18v10H3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M17 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Calendar: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 8h16v13H4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  Doc: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path d="M7 3h7l3 3v15H7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 11h6M9 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Layers: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path
        d="M12 3l9 6-9 6-9-6 9-6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M3 15l9 6 9-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Sparkle: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path
        d="M12 2l1.2 4.5L18 8l-4.8 1.5L12 14l-1.2-4.5L6 8l4.8-1.5L12 2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M20 12l.8 3L24 16l-3.2 1-.8 3-.8-3L16 16l3.2-1 .8-3z" stroke="currentColor" strokeWidth="0" />
    </svg>
  ),
  Search: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path d="M10.5 18a7.5 7.5 0 117.5-7.5A7.5 7.5 0 0110.5 18z" stroke="currentColor" strokeWidth="2" />
      <path d="M16.3 16.3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  ChevronLeft: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const CATEGORIES: CategoryMeta[] = [
  { id: 'financial', title: 'مالی', description: 'نمای کلی مالی، نقدینگی، بدهکار/بستانکار' },
  { id: 'sales', title: 'فروش', description: 'فروش روزانه، موبایل، غیرگوشی، مقایسه دوره‌ای و عملکرد شرکا' },
  { id: 'customers', title: 'وصول و مشتریان', description: 'پیگیری مطالبات، ریسک وصول، مشتریان برتر و تحلیل رفتار مشتری' },
  { id: 'inventory', title: 'سلامت موجودی', description: 'گردش موجودی، خواب سرمایه و عملکرد تأمین‌کننده' },
  { id: 'analysis', title: 'تحلیل مدیریتی', description: 'تحلیل‌های ترکیبی، دستیار هوشمند و پیشنهاد خرید' },
];

const CATEGORY_ICON_MAP: Record<CategoryId, React.ElementType> = {
  financial: I.Chart,
  sales: I.Trend,
  customers: I.Users,
  inventory: I.Box,
  analysis: I.Sparkle,
};

const REPORT_ICON_MAP: Record<string, React.ElementType> = {
  'financial-overview': I.Chart,
  'realized-profit': I.Trend,
  'financial-audit': I.Chart,
  cashflow: I.Wallet,
  debtors: I.Users,
  creditors: I.Users,
  'inventory-turnover': I.Box,
  rfm: I.Users,
  'sales-report': I.Trend,
  'compare-sales': I.Layers,
  'product-sales-no-mobile': I.Doc,
  'installments-checks-calendar': I.Calendar,

  // current routes in this project
  'installments-calendar': I.Calendar,
  'sales-summary': I.Trend,
  'product-sales': I.Doc,
  'partners-performance': I.Users,
  'periodic-comparison': I.Layers,
  'mobile-sales-analytics': I.Trend,
  'smart-insights': I.Sparkle,
  'phone-sales': I.Trend,
  'phone-installment-sales': I.Trend,
  'top-customers': I.Users,
  'aging-receivables': I.Users,
  cohort: I.Users,
  followups: I.Users,
  'collection-center': I.Users,
  'dead-stock': I.Box,
  abc: I.Box,
  'top-suppliers': I.Users,
  'analysis-hub': I.Sparkle,
  'product-profit-real': I.Trend,
  analytics: I.Chart,
};


type ReportCard = {
  id: string;
  title: string;
  description: string;
  to: string;
  category: CategoryId;
  tags?: string[];
  highlight?: boolean;
  priority?: 'critical' | 'daily' | 'analysis';
  scope?: ReportScope;
  parentId?: string;
};

// IMPORTANT: only include routes that exist in App.tsx
const REPORTS: ReportCard[] = [
  { id: 'financial-overview', title: 'نمای کلی مالی', description: 'نمای مادر مالی؛ شاخص‌های اصلی، مانده‌ها، نقدینگی و خلاصه سود تحقق‌یافته', to: '/reports/financial-overview', category: 'financial', tags: ['شاخص‌ها', 'نقدینگی', 'خلاصه'], highlight: true, scope: 'overview' },
  { id: 'manager-credit-approvals', title: 'فروش‌های تأییدشده توسط مدیر', description: 'کنترل فروش‌های اعتباری که از سقف اعتبار پیشنهادی عبور کرده و با تأیید مدیر ثبت شده‌اند', to: '/reports/manager-credit-approvals', category: 'financial', tags: ['اعتبار', 'تأیید مدیر', 'کنترل'], highlight: true, priority: 'critical', scope: 'control' },
  { id: 'sales-risk-decisions', title: 'لاگ تصمیم‌های ریسک فروش', description: 'ردیابی تغییر روش پرداخت مشتریان پرریسک؛ تغییر به نقدی، بازگشت به اعتباری و تصمیم‌های اپراتور', to: '/reports/sales-risk-decisions', category: 'financial', tags: ['ریسک فروش', 'لاگ', 'اعتبار'], highlight: true, priority: 'critical', scope: 'control' },
  { id: 'financial-audit', title: 'ممیزی اختلاف گزارش‌ها', description: 'کنترل اختلاف فروش، پرداخت، سود و موجودی؛ مسیر جدا برای ممیزی و کاهش ریسک عملیاتی', to: '/reports/financial-audit', category: 'financial', tags: ['ممیزی', 'کنترل'], highlight: true, priority: 'critical', scope: 'control' },
  { id: 'realized-profit', title: 'سود تحقق‌یافته', description: 'جزئیات سود وصول‌شده؛ نمای تکمیلی گزارش مالی با تفکیک نقدی، اعتباری و اقساطی', to: '/reports/realized-profit', category: 'financial', tags: ['جزئیات', 'وصول', 'سود'], highlight: true, priority: 'analysis', scope: 'drilldown', parentId: 'financial-overview' },
  { id: 'cashflow', title: 'جریان نقدی', description: 'ورودی/خروجی نقدی واقعی و تصویر عملیاتی جریان پول', to: '/reports/cashflow', category: 'financial', tags: ['پیش‌بینی'], scope: 'operational' },
  { id: 'debtors', title: 'بدهکاران', description: 'لیست بدهکاران مشتری بر اساس مانده واقعی دفتر حساب و سررسید', to: '/reports/debtors', category: 'financial', tags: ['وصول'], scope: 'operational' },
  { id: 'creditors', title: 'بستانکاران', description: 'بستانکاران تأمین‌کننده/همکار بر اساس مانده واقعی دفتر حساب و تسویه', to: '/reports/creditors', category: 'financial', tags: ['پرداخت'], scope: 'operational' },
  { id: 'installments-calendar', title: 'تقویم اقساط و چک‌ها', description: 'نمایش سررسیدهای اقساط و چک‌ها در بازه انتخابی به‌صورت عملیاتی', to: '/reports/installments-calendar', category: 'financial', tags: ['اقساط', 'چک'], scope: 'operational' },

  { id: 'sales-summary', title: 'گزارش فروش و سود', description: 'روند فروش، پرفروش‌ها و سود ناخالص؛ سود تحقق‌یافته در گزارش مالی جداگانه دیده می‌شود', to: '/reports/sales-summary', category: 'sales', tags: ['روزانه', 'سود ناخالص'], highlight: true, scope: 'overview' },
  { id: 'product-sales', title: 'فروش غیرگوشی', description: 'جمع و جزئیات فروش لوازم و خدمات', to: '/reports/product-sales', category: 'sales', tags: ['خروجی'] },
  { id: 'partners-performance', title: 'مرکز گزارش عملکرد شرکا', description: 'تحلیل سود، خرید و فروش، ارزش موجودی و وضعیت تسویه هر شریک در یک نمای حرفه‌ای', to: '/reports/partners-performance', category: 'sales', tags: ['شرکا', 'مالکیت', 'تسویه', 'موجودی'], highlight: true },
  { id: 'periodic-comparison', title: 'مقایسه‌ای فروش', description: 'مقایسه دوره انتخابی با دوره قبل/سال قبل', to: '/reports/periodic-comparison', category: 'sales', tags: ['رشد'] },
  { id: 'mobile-sales-analytics', title: 'تحلیل گوشی نقد و اقساط', description: 'مقایسه نقد/اقساط، ریسک وصول، سود واقعی و اصل پول شرکا', to: '/reports/mobile-sales-analytics', category: 'sales', tags: ['گوشی', 'اقساط', 'ریسک'], highlight: true },
  { id: 'smart-insights', title: 'دستیار هوشمند مدیریت', description: 'تحلیل‌های خودکار، یادگیری از روند فروشگاه و پیشنهادهای عملیاتی برای مدیر', to: '/reports/smart-insights', category: 'analysis', tags: ['هوشمند', 'پیشنهاد', 'تحلیل'], highlight: true },
  { id: 'phone-sales', title: 'فروش موبایل (نقدی)', description: 'سود هر فروش موبایل، IMEI، مشتری و تاریخ', to: '/reports/phone-sales', category: 'sales', tags: ['IMEI'] },
  { id: 'phone-installment-sales', title: 'فروش اقساطی موبایل', description: 'سود فروش‌های اقساطی موبایل در بازه', to: '/reports/phone-installment-sales', category: 'sales', tags: ['اقساط'] },

  { id: 'top-customers', title: 'مشتریان برتر', description: 'رتبه‌بندی مشتریان پرفروش در بازه انتخابی', to: '/reports/top-customers', category: 'customers', tags: ['برتر'] },
  { id: 'aging-receivables', title: 'سن بدهی و ریسک وصول', description: 'اولویت‌بندی بدهی مشتریان بر اساس مدت‌زمان عقب‌افتادگی', to: '/reports/aging-receivables', category: 'customers', tags: ['ریسک'] },
  { id: 'rfm', title: 'RFM', description: 'تحلیل وفاداری مشتریان', to: '/reports/rfm', category: 'customers', tags: ['تحلیل'], highlight: true },
  { id: 'cohort', title: 'تحلیل بازگشت مشتری', description: 'تحلیل بازگشت مشتریان در گروه‌های زمانی', to: '/reports/cohort', category: 'customers', tags: ['بازگشت'] },
  { id: 'followups', title: 'پیگیری‌ها', description: 'لیست پیگیری‌ها و وضعیت انجام', to: '/reports/followups', category: 'customers', tags: ['CRM'] },
  { id: 'collection-center', title: 'مرکز پیگیری وصول', description: 'اولویت‌های فوری وصول با اقدام سریع و تاریخچه سند', to: '/reports/collection-center', category: 'customers', tags: ['وصول', 'CRM'], highlight: true },

  { id: 'inventory-turnover', title: 'گردش موجودی', description: 'گردش موجودی و میانگین روزهای ماندگاری کالا', to: '/reports/inventory-turnover', category: 'inventory', tags: ['شاخص‌ها'], highlight: true },
  { id: 'dead-stock', title: 'کالاهای راکد', description: 'کالاهای بدون حرکت و خواب سرمایه', to: '/reports/dead-stock', category: 'inventory', tags: ['ریسک'] },
  { id: 'abc', title: 'تحلیل ABC موجودی', description: 'طبقه‌بندی کالاها بر اساس ارزش و گردش فروش', to: '/reports/abc', category: 'inventory', tags: ['ABC'] },
  { id: 'top-suppliers', title: 'تامین‌کنندگان برتر', description: 'رتبه‌بندی تأمین‌کنندگان بر اساس گردش و ارزش خرید', to: '/reports/top-suppliers', category: 'inventory', tags: ['برتر'] },

  { id: 'analysis-hub', title: 'تحلیل پیشرفته', description: 'تحلیل سودآوری، موجودی و پیشنهاد خرید', to: '/reports/analysis', category: 'analysis', tags: ['پیشرفته'] },
  { id: 'product-profit-real', title: 'سود واقعی هر محصول', description: 'سود/زیان واقعی (FIFO) و سهم از درآمد', to: '/reports/product-profit-real', category: 'analysis', tags: ['بهای تمام‌شده'] },
  { id: 'analytics', title: 'تحلیل مدیریتی', description: 'روندها، مقایسه ماه‌ها و تحلیل محصولات', to: '/reports/analytics', category: 'analysis', tags: ['نمودار'] },
];

type ReportHealth = {
  tone: 'good' | 'review' | 'warn';
  label: string;
  title: string;
};

function getReportHealth(report: ReportCard): ReportHealth {
  if (report.priority === 'critical' || report.id.includes('audit') || report.id.includes('aging') || report.id.includes('dead-stock')) {
    return { tone: 'warn', label: 'هشدار', title: 'این گزارش برای کنترل ریسک و اختلاف نیازمند بررسی دقیق‌تر است.' };
  }
  if (report.highlight || report.category === 'financial' || report.category === 'analysis') {
    return { tone: 'review', label: 'بررسی', title: 'گزارش کلیدی است و بهتر است قبل از تصمیم مدیریتی مرور شود.' };
  }
  return { tone: 'good', label: 'سالم', title: 'گزارش در وضعیت عادی و آماده استفاده است.' };
}

function ReportHealthBadge({ health }: { health: ReportHealth }) {
  return (
    <span className={`reports-health-badge reports-health-badge--${health.tone}`} title={health.title}>
      <span className="reports-health-badge__dot" />
      {health.label}
    </span>
  );
}

const REPORT_SCOPE_META: Record<ReportScope, { label: string; title: string }> = {
  overview: { label: 'نمای مادر', title: 'این گزارش برای تصمیم سریع و جمع‌بندی مدیریتی استفاده می‌شود.' },
  drilldown: { label: 'جزئیات', title: 'این گزارش مکمل نمای مادر است و برای تحلیل عمیق‌تر ساخته شده است.' },
  control: { label: 'کنترل', title: 'این گزارش برای ممیزی، کنترل اختلاف و کاهش ریسک استفاده می‌شود.' },
  operational: { label: 'عملیاتی', title: 'این گزارش برای پیگیری روزانه و اقدام عملیاتی استفاده می‌شود.' },
};

function ReportScopeBadge({ scope }: { scope?: ReportScope }) {
  if (!scope) return null;
  const meta = REPORT_SCOPE_META[scope];
  return (
    <span className={`reports-scope-badge reports-scope-badge--${scope}`} title={meta.title}>
      {meta.label}
    </span>
  );
}

const Reports: React.FC = () => {
  const [activeCat, setActiveCat] = useState<CategoryId>('financial');
  const [q, setQ] = useState('');
  const reportsSearchInputRef = useRef<HTMLInputElement | null>(null);

  // Stage 89: keep reports search as one visual surface.
  // Some global input/focus styles create a second inner blue box; this resets the actual DOM input.
  useLayoutEffect(() => {
    const input = reportsSearchInputRef.current;
    if (!input) return;

    const importantStyles: Array<[string, string]> = [
      ['all', 'unset'],
      ['box-sizing', 'border-box'],
      ['display', 'block'],
      ['min-width', '0'],
      ['width', '100%'],
      ['height', '38px'],
      ['line-height', '38px'],
      ['background', 'transparent'],
      ['background-color', 'transparent'],
      ['border', '0'],
      ['border-radius', '0'],
      ['outline', '0'],
      ['box-shadow', 'none'],
      ['appearance', 'none'],
      ['-webkit-appearance', 'none'],
      ['color', 'inherit'],
      ['font', 'inherit'],
      ['font-size', '.82rem'],
      ['font-weight', '700'],
      ['direction', 'rtl'],
      ['text-align', 'right'],
      ['padding', '0 .35rem'],
      ['white-space', 'nowrap'],
      ['overflow', 'hidden'],
      ['text-overflow', 'ellipsis'],
      ['--tw-ring-offset-width', '0px'],
      ['--tw-ring-offset-color', 'transparent'],
      ['--tw-ring-color', 'transparent'],
      ['--tw-ring-shadow', '0 0 #0000'],
      ['--tw-shadow', '0 0 #0000'],
      ['--tw-shadow-colored', '0 0 #0000'],
    ];

    const apply = () => {
      importantStyles.forEach(([key, value]) => input.style.setProperty(key, value, 'important'));
    };

    apply();
    const events: Array<keyof HTMLElementEventMap> = ['focus', 'blur', 'input', 'change', 'keydown', 'keyup', 'mousedown', 'mouseup'];
    events.forEach((eventName) => input.addEventListener(eventName, apply));
    return () => events.forEach((eventName) => input.removeEventListener(eventName, apply));
  }, []);


  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return REPORTS.filter((r) => {
      if (r.category !== activeCat) return false;
      if (!query) return true;
      return (
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        (r.tags || []).some((t) => t.toLowerCase().includes(query))
      );
    });
  }, [activeCat, q]);


  const categoryStats = useMemo(() => CATEGORIES.map((category) => ({
    ...category,
    count: REPORTS.filter((report) => report.category === category.id).length,
    featuredCount: REPORTS.filter((report) => report.category === category.id && report.highlight).length,
  })), []);


  const activeCategory = CATEGORIES.find((category) => category.id === activeCat) || CATEGORIES[0];


  const featuredByRole = useMemo(() => ({
    daily: REPORTS.filter((report) => ['financial-overview', 'sales-summary', 'collection-center', 'inventory-turnover'].includes(report.id)),
    control: REPORTS.filter((report) => report.scope === 'control' || ['aging-receivables', 'dead-stock'].includes(report.id)),
    executive: REPORTS.filter((report) => ['smart-insights', 'analysis-hub', 'product-profit-real', 'mobile-sales-analytics'].includes(report.id)),
  }), []);

  return (
    <div className="reports-hub reports-redesign-v1 reports-command-center-v2 space-y-4">
      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_18px_46px_-38px_rgba(15,23,42,0.34)] dark:border-slate-800 dark:bg-slate-900/80">
          <div className="text-sm font-black text-slate-950 dark:text-white">شروع روزانه</div>
          <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">گزارش‌های ضروری برای شروع شیفت و کنترل وضعیت روز.</div>
          <div className="mt-3 space-y-2">
            {featuredByRole.daily.map((report) => (
              <Link key={report.id} to={report.to} className="flex min-h-[42px] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 transition hover:border-primary/30 hover:bg-white hover:text-primary dark:border-slate-800 dark:bg-slate-950/35 dark:text-slate-200 dark:hover:border-primary/40 dark:hover:bg-slate-900">
                <span className="truncate">{report.title}</span>
                <I.ChevronLeft className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_18px_46px_-38px_rgba(15,23,42,0.34)] dark:border-slate-800 dark:bg-slate-900/80">
          <div className="text-sm font-black text-slate-950 dark:text-white">کنترل ریسک</div>
          <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">گزارش‌های کنترلی برای اختلاف، بدهی و خواب سرمایه.</div>
          <div className="mt-3 space-y-2">
            {featuredByRole.control.map((report) => (
              <Link key={report.id} to={report.to} className="flex min-h-[42px] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 transition hover:border-amber-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/35 dark:text-slate-200 dark:hover:border-amber-400/50 dark:hover:bg-slate-900">
                <span className="truncate">{report.title}</span>
                <ReportHealthBadge health={getReportHealth(report)} />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_18px_46px_-38px_rgba(15,23,42,0.34)] dark:border-slate-800 dark:bg-slate-900/80">
          <div className="text-sm font-black text-slate-950 dark:text-white">تحلیل مدیریتی</div>
          <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">گزارش‌های تخصصی برای تحلیل سود، موجودی و تصمیم‌های مدیریتی.</div>
          <div className="mt-3 space-y-2">
            {featuredByRole.executive.map((report) => (
              <Link key={report.id} to={report.to} className="flex min-h-[42px] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 transition hover:border-primary/30 hover:bg-white hover:text-primary dark:border-slate-800 dark:bg-slate-950/35 dark:text-slate-200 dark:hover:border-primary/40 dark:hover:bg-slate-900">
                <span className="truncate">{report.title}</span>
                <I.ChevronLeft className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="reports-category-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {categoryStats.map((category) => {
          const Icon = CATEGORY_ICON_MAP[category.id] || I.Chart;
          const active = activeCat === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCat(category.id)}
              className={`reports-category-card group flex h-full min-h-[132px] flex-col rounded-[22px] border p-3 text-right transition hover:-translate-y-0.5 ${active ? 'reports-category-card--active' : 'reports-category-card--idle'}`}
            >
              <div className="reports-category-card-v433__head">
                <div className="reports-category-card-v433__identity">
                  <span className={`reports-category-card-v433__icon ${active ? 'reports-category-card-v433__icon--active' : 'reports-category-card-v433__icon--idle'}`}>
                    <Icon className="h-4 w-4" />
                  </span>

                  <div className="reports-category-card-v433__content">
                    <div className="reports-category-card-v433__title">{category.title}</div>
                    <div className="reports-category-card-v433__submeta">{category.featuredCount.toLocaleString('fa-IR')} گزارش کلیدی</div>
                  </div>
                </div>

                <div className="reports-category-card-v433__count" aria-label={`${category.count.toLocaleString('fa-IR')} گزارش`}>
                  <span className="reports-category-card-v433__count-value">{category.count.toLocaleString('fa-IR')}</span>
                  <span className="reports-category-card-v433__count-label">گزارش</span>
                </div>
              </div>

              <p className="reports-category-card-v433__description">{category.description}</p>
            </button>
          );
        })}
      </section>

      <section className="reports-hub-toolbar rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_18px_46px_-38px_rgba(15,23,42,0.34)] dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-base font-black text-slate-950 dark:text-white">کتابخانه گزارش‌های {activeCategory.title}</div>
            <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{activeCategory.description}</div>
          </div>
          <AppSearchField
            value={q}
            onChange={setQ}
            placeholder="جستجو در عنوان، توضیح یا برچسب گزارش…"
            ariaLabel="جستجوی گزارش‌ها"
            size="md"
            className="w-full lg:w-[380px]"
          />
        </div>
      </section>

      <section className="reports-card-grid grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((report) => {
          const Icon = REPORT_ICON_MAP[report.id] || I.Doc;
          const category = CATEGORIES.find((item) => item.id === report.category);
          const health = getReportHealth(report);
          return (
            <Link
              key={report.id}
              to={report.to}
              className={`reports-hub-card reports-hub-card--${report.highlight ? 'featured' : 'standard'} reports-hub-card--${health.tone} group rounded-[24px] border p-4 transition hover:-translate-y-0.5 ${report.highlight ? 'border-primary/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_22px_54px_-42px_rgba(79,70,229,0.55)] dark:border-primary/25 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.82),rgba(15,23,42,0.92))]' : 'border-slate-200 bg-white shadow-[0_14px_34px_-30px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-slate-900/75'}`}
            >
              <div className="flex items-start gap-3">
                <span className={`reports-hub-card__icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 transition ${report.highlight ? 'bg-primary/10 text-primary ring-primary/20 group-hover:bg-primary group-hover:text-white' : 'bg-slate-100 text-slate-600 ring-slate-200 group-hover:bg-primary/10 group-hover:text-primary dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 flex items-center gap-2">
                      <span className="truncate text-sm font-black text-slate-950 dark:text-white">{report.title}</span>
                      <ReportHealthBadge health={health} />
                    </span>
                    <I.ChevronLeft className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100" />
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs leading-6 text-slate-500 dark:text-slate-400">{report.description}</span>
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">{category?.title}</span>
                <ReportScopeBadge scope={report.scope} />
                {report.highlight ? <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">کلیدی</span> : null}
                {(report.tags || []).slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-300">{tag}</span>
                ))}
              </div>
            </Link>
          );
        })}
      </section>

      {!filtered.length ? (
        <div className="rounded-[26px] border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900/70">
          <div className="text-base font-black text-slate-900 dark:text-white">گزارشی پیدا نشد</div>
          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">عبارت جستجو را کوتاه‌تر کن یا دسته دیگری را انتخاب کن.</div>
        </div>
      ) : null}
    </div>
  );
};

export default Reports;
