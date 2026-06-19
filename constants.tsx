// constantsData.ts
import { NavItem, ChartTimeframe, PhoneStatus, RepairStatus } from './types';

/* -----------------------------------------------
   آیتم‌های منوی کنار
   (بدون تغییر نسبت به قبل تا با type فعلی سازگار بماند)
------------------------------------------------- */
export const SIDEBAR_ITEMS: NavItem[] = [
  // ✅ هسته اصلی
  { id: 'dashboard', name: 'پیشخوان مدیریتی', icon: 'fa-solid fa-chart-line', path: '/' },

  // ✅ فروش
  {
    id: 'sales',
    name: 'فروش',
    icon: 'fa-solid fa-cart-shopping',
    path: '/sales',
    children: [
      { id: 'sales-cash', name: 'فروش نقدی', icon: 'fa-solid fa-money-bill-wave', path: '/sales/cash', featureKey: 'cash_sales' },
      { id: 'installment-sales', name: 'فروش اقساطی', icon: 'fa-solid fa-file-invoice-dollar', path: '/installment-sales', featureKey: 'installments' },
      { id: 'invoices', name: 'فاکتورها', icon: 'fa-solid fa-file-invoice', path: '/invoices', featureKey: 'cash_sales' },
      { id: 'expenses', name: 'هزینه‌ها', icon: 'fa-solid fa-receipt', path: '/sales/expenses' },
    ],
  },

  // ✅ کالا و انبار
  {
    id: 'products-group',
    name: 'کالا و انبار',
    icon: 'fa-solid fa-boxes-stacked',
    path: '/products',
    children: [
      { id: 'products', name: 'کالاها', icon: 'fa-solid fa-cube', path: '/products', featureKey: 'products_inventory' },
      { id: 'mobile-phones', name: 'انبار گوشی', icon: 'fa-solid fa-mobile-screen-button', path: '/mobile-phones', featureKey: 'mobile_phones' },
    ],
  },

  // ✅ تعمیرات و خدمات
  {
    id: 'repairs-services',
    name: 'تعمیرات و خدمات',
    icon: 'fa-solid fa-screwdriver-wrench',
    path: '/repairs',
    roles: ['Admin', 'Manager', 'Technician'],
    children: [
      { id: 'repairs', name: 'تعمیرات', icon: 'fa-solid fa-screwdriver-wrench', path: '/repairs', roles: ['Admin', 'Manager', 'Technician'], featureKey: 'repairs_services' },
      { id: 'services', name: 'خدمات', icon: 'fa-solid fa-clipboard-check', path: '/services', roles: ['Admin', 'Manager', 'Technician'], featureKey: 'repairs_services' },
    ],
  },

  // ✅ اشخاص
  {
    id: 'people',
    name: 'اشخاص',
    icon: 'fa-solid fa-users',
    path: '/customers',
    children: [
      { id: 'customers', name: 'مشتریان', icon: 'fa-solid fa-user-group', path: '/customers', featureKey: 'people_crm' },
      { id: 'partners', name: 'همکاران', icon: 'fa-solid fa-building', path: '/partners', featureKey: 'people_crm' },
    ],
  },

  // ✅ گزارش‌ها — فقط مسیرهای پرتکرار در سایدبار؛ جزئیات داخل مرکز گزارش‌ها مدیریت می‌شود
  {
    id: 'reports',
    name: 'گزارش‌ها',
    icon: 'fa-solid fa-chart-pie',
    path: '/reports',
    children: [
      { id: 'reports-home', name: 'مرکز گزارش‌ها', icon: 'fa-solid fa-chart-column', path: '/reports' },
      { id: 'financial-overview', name: 'نمای کلی مالی', icon: 'fa-solid fa-sack-dollar', path: '/reports/financial-overview' },
      { id: 'sales-summary', name: 'فروش و سود', icon: 'fa-solid fa-chart-line', path: '/reports/sales-summary' },
      { id: 'collection-center', name: 'وصول و اقساط', icon: 'fa-solid fa-headset', path: '/reports/collection-center' },
    ],
  },

  // ✅ بیشتر — آیتم‌های مدیریتی/کم‌تکرار برای خلوت نگه‌داشتن سطح اصلی سایدبار
  {
    id: 'more',
    name: 'بیشتر',
    icon: 'fa-solid fa-ellipsis',
    children: [
      { id: 'notifications', name: 'اعلان‌ها', icon: 'fa-solid fa-bell', path: '/notifications', featureKey: 'notifications_outbox' },
      { id: 'outbox', name: 'مرکز پیام‌رسانی', icon: 'fa-solid fa-inbox', path: '/outbox', featureKey: 'notifications_outbox' },
      { id: 'settings-home', name: 'تنظیمات سیستم', icon: 'fa-solid fa-gear', path: '/settings', roles: ['Admin', 'Manager'] },
      { id: 'store-ownership', name: 'ساختار شرکا', icon: 'fa-solid fa-handshake', path: '/settings/store-ownership', roles: ['Admin'] },
      { id: 'audit-log', name: 'گزارش فعالیت‌ها', icon: 'fa-solid fa-clipboard-list', path: '/audit-log', roles: ['Admin','Manager'], featureKey: 'audit_log' },
    ],
  },
];

/* -----------------------------------------------
   تم‌های رنگی گرادیانی برای آیکون‌های سایدبار
   (از این‌ها در کامپوننت سایدبار استفاده کن)
------------------------------------------------- */
export type SidebarAccent = 'indigo' | 'purple' | 'emerald' | 'blue' | 'orange' | 'rose';

export const ACCENT_STYLES: Record<
  SidebarAccent,
  { gradient: string; dot: string; shadow: string }
> = {
  indigo:  { gradient: 'from-indigo-500 to-violet-500',  dot: 'bg-indigo-400',  shadow: 'shadow-indigo-500/30' },
  purple:  { gradient: 'from-fuchsia-500 to-purple-500', dot: 'bg-fuchsia-400', shadow: 'shadow-fuchsia-500/30' },
  emerald: { gradient: 'from-emerald-500 to-teal-500',   dot: 'bg-emerald-400', shadow: 'shadow-emerald-500/30' },
  blue:    { gradient: 'from-sky-500 to-blue-600',       dot: 'bg-sky-400',     shadow: 'shadow-sky-500/30' },
  orange:  { gradient: 'from-orange-500 to-amber-500',   dot: 'bg-amber-400',   shadow: 'shadow-amber-500/30' },
  rose:    { gradient: 'from-rose-500 to-pink-500',      dot: 'bg-rose-400',    shadow: 'shadow-rose-500/30' },
};

/** مپ کردن هر آیتم منو به یک تم رنگی */
export const SIDEBAR_ACCENTS: Record<string, SidebarAccent> = {
  'dashboard':         'indigo',
  'products':          'blue',
  'mobile-phones':     'emerald',
  'repairs':           'orange',
  'services':          'purple',
  'sales':             'rose',
  'installment-sales': 'indigo',
  'customers':         'blue',
  'partners':          'emerald',
  'reports':           'purple',
  'sales-summary':     'rose',
  'financial-overview':'emerald',
  'installments-calendar':'blue',
  'collection-center': 'rose',
  'mobile-sales-analytics': 'indigo',
  'smart-insights':    'purple',
  'smart-analysis':    'indigo',
  'invoices':          'orange',
  'expenses':          'rose',
  'notifications':     'rose',
  'outbox':            'blue',
  'more':              'indigo',
  'settings-home':     'rose',
  'store-ownership':   'emerald',
  'audit-log':         'orange',
  'settings':          'rose',
};

/* -----------------------------------------------
   کلاس‌های کمکی برای رنگی/انیمیشنی کردن آیکون
   (در JSX: این‌ها را به i.fa-* اضافه کن)
------------------------------------------------- */
export const ICON_GRADIENT_TEXT_CLASS =
  'bg-clip-text text-transparent bg-gradient-to-br';

export const ICON_HOVER_ANIM_CLASS =
  // scale / rotate فقط وقتی motion-safe فعال است
  'transition-transform duration-200 motion-safe:hover:scale-110 motion-safe:hover:rotate-[2deg]';

/* -----------------------------------------------
   سایر ثابت‌ها (بدون تغییر)
------------------------------------------------- */
export const CHART_TIMEFRAMES: ChartTimeframe[] = [
  { key: 'weekly', label: 'هفتگی' },
  { key: 'monthly', label: 'ماهانه' },
  { key: 'yearly', label: 'سالانه' },
];

export const PARTNER_TYPES = [
  { value: 'Supplier',          label: 'تامین‌کننده' },
  { value: 'Service Provider',  label: 'ارائه‌دهنده خدمات' },
  { value: 'Technician',        label: 'تعمیرکار' },
  { value: 'Other',             label: 'سایر' },
];

export const PHONE_RAM_OPTIONS = ['1 GB', '2 GB', '3 GB', '4 GB', '6 GB', '8 GB', '12 GB', '16 GB'];
export const PHONE_STORAGE_OPTIONS = ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB'];
export const PHONE_CONDITIONS = ['نو (آکبند)', 'در حد نو', 'کارکرده', 'معیوب'];
// وضعیت‌های مجاز برای گوشی‌ها. «مرجوعی اقساطی» نشان‌دهندهٔ بازگشت گوشی از فروش اقساطی است و پس از این تغییر،
// کاربر باید بتواند گوشی را مجدداً بفروشد. لذا این مقدار نیز در این آرایه لحاظ می‌شود.
export const PHONE_STATUSES: PhoneStatus[] = [
  'موجود در انبار',
  'فروخته شده',
  'مرجوعی',
  'فروخته شده (قسطی)',
  'مرجوعی اقساطی',
];
export const REPAIR_STATUSES: RepairStatus[] = [
  'پذیرش شده', 'در حال بررسی و ادامه', 'منتظر قطعه', 'در حال تعمیر', 'آماده تحویل', 'تحویل داده شده', 'تعمیر نشد', 'مرجوع شد',
];
