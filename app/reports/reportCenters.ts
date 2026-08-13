export type ReportCenterId =
  | 'manager-finance'
  | 'sales-profit'
  | 'mobile-sales'
  | 'collection-credit'
  | 'inventory-health'
  | 'customers'
  | 'partners-suppliers'
  | 'control-intelligence';

export type ReportCenterTab = {
  path: string;
  title: string;
  shortTitle: string;
  description: string;
  aliases?: string[];
  adminManagerOnly?: boolean;
};

export type ReportCenter = {
  id: ReportCenterId;
  title: string;
  description: string;
  managerQuestion: string;
  icon: string;
  path: string;
  tabs: ReportCenterTab[];
};

export const REPORT_CENTERS: ReportCenter[] = [
  {
    id: 'manager-finance',
    title: 'نمای مالی مدیر',
    description: 'سود تحقق‌یافته، جریان پول و چهار سود اصلی فروشگاه در یک مرکز.',
    managerQuestion: 'الان فروشگاه واقعاً چقدر سود و جریان نقدی دارد؟',
    icon: 'fa-chart-pie',
    path: '/reports/financial-overview',
    tabs: [
      { path: '/reports/financial-overview', title: 'نمای مالی و سود چهارگانه', shortTitle: 'نمای مالی', description: 'نمای مادر مالی با سود لوازم، گوشی نقدی، گوشی اقساطی و فروش اعتباری.' },
      { path: '/reports/realized-profit', title: 'جزئیات سود تحقق‌یافته', shortTitle: 'سود تحقق‌یافته', description: 'شناسایی سود بر اساس وصول واقعی و بهای تمام‌شده نسبتی.' },
      { path: '/reports/cashflow', title: 'جریان نقدی', shortTitle: 'جریان نقدی', description: 'ورودی و خروجی واقعی پول در بازه.' },
    ],
  },
  {
    id: 'sales-profit',
    title: 'فروش و سود',
    description: 'خلاصه فروش، لوازم و خدمات، مقایسه دوره‌ای و سود واقعی کالا.',
    managerQuestion: 'چه چیزی فروخته شده و کدام فروش واقعاً سودآور بوده است؟',
    icon: 'fa-chart-line',
    path: '/reports/all-sales-ledger',
    tabs: [
      { path: '/reports/all-sales-ledger', title: 'دفتر جامع فروش و سود', shortTitle: 'دفتر جامع فروش', description: 'تمام فروش‌های نقدی، اعتباری و اقساطی با بهای خرید، مبلغ فروش و تفکیک سود وصول‌شده و وصول‌نشده.' },
      { path: '/reports/sales-summary', aliases: ['/reports/sales'], title: 'خلاصه فروش و سود', shortTitle: 'خلاصه فروش', description: 'روند فروش، پرفروش‌ها و سود ناخالص.' },
      { path: '/reports/product-sales', title: 'فروش لوازم و خدمات', shortTitle: 'لوازم و خدمات', description: 'جمع و جزئیات فروش غیرگوشی.' },
      { path: '/reports/periodic-comparison', title: 'مقایسه دوره‌ای فروش', shortTitle: 'مقایسه دوره‌ای', description: 'مقایسه دوره انتخابی با دوره قبل یا سال قبل.' },
      { path: '/reports/product-profit-real', title: 'سود واقعی هر محصول', shortTitle: 'سود هر محصول', description: 'سود و زیان FIFO و سهم هر محصول از درآمد.' },
      { path: '/reports/analysis/profitability', title: 'تحلیل سودآوری', shortTitle: 'تحلیل سودآوری', description: 'تحلیل سهم سود و عملکرد کالاها در بازه.' },
    ],
  },
  {
    id: 'mobile-sales',
    title: 'فروش موبایل',
    description: 'تحلیل یکپارچه گوشی‌های نقدی و اقساطی، سود، وصول و اصل پول شرکا.',
    managerQuestion: 'فروش گوشی نقدی و اقساطی چه سود و ریسکی ساخته است؟',
    icon: 'fa-mobile-screen-button',
    path: '/reports/mobile-sales-analytics',
    tabs: [
      { path: '/reports/mobile-sales-analytics', title: 'تحلیل نقد و اقساط', shortTitle: 'تحلیل یکپارچه', description: 'مقایسه روش‌های فروش، ریسک وصول و اصل پول شرکا.' },
      { path: '/reports/phone-sales', title: 'فروش نقدی گوشی', shortTitle: 'گوشی نقدی', description: 'سود هر فروش نقدی، IMEI، مشتری و تاریخ.' },
      { path: '/reports/phone-installment-sales', title: 'فروش اقساطی گوشی', shortTitle: 'گوشی اقساطی', description: 'جزئیات و سود فروش‌های اقساطی موبایل.' },
    ],
  },
  {
    id: 'collection-credit',
    title: 'وصول و اعتبار',
    description: 'مطالبات، اقساط، پیگیری و تصمیم‌های اعتباری در یک جریان عملیاتی.',
    managerQuestion: 'امروز کدام بدهی، قسط یا تصمیم اعتباری نیاز به اقدام دارد؟',
    icon: 'fa-hand-holding-dollar',
    path: '/reports/collection-center',
    tabs: [
      { path: '/reports/collection-center', aliases: ['/reports/collection-followup'], title: 'مرکز عملیات وصول', shortTitle: 'مرکز وصول', description: 'اولویت‌های فوری وصول، اقدام سریع و تاریخچه سند.' },
      { path: '/reports/debtors', title: 'بدهکاران', shortTitle: 'بدهکاران', description: 'مانده واقعی دفتر حساب مشتریان.' },
      { path: '/reports/aging-receivables', title: 'سن بدهی و ریسک وصول', shortTitle: 'سن بدهی', description: 'اولویت‌بندی مطالبات بر اساس زمان عقب‌افتادگی.' },
      { path: '/reports/installments-calendar', title: 'تقویم اقساط و چک‌ها', shortTitle: 'تقویم اقساط', description: 'سررسید اقساط و چک‌ها در بازه.' },
      { path: '/reports/followups', title: 'پیگیری‌ها', shortTitle: 'پیگیری‌ها', description: 'فهرست اقدام‌ها و وضعیت انجام پیگیری.' },
      { path: '/reports/manager-credit-approvals', title: 'تأییدهای اعتباری مدیر', shortTitle: 'تأیید مدیر', description: 'فروش‌های خارج از سقف پیشنهادی که با تأیید مدیر ثبت شده‌اند.' },
      { path: '/reports/sales-risk-decisions', title: 'تصمیم‌های ریسک فروش', shortTitle: 'تصمیم‌های ریسک', description: 'تاریخچه تغییر روش پرداخت و تصمیم اپراتور.' },
    ],
  },
  {
    id: 'inventory-health',
    title: 'سلامت موجودی',
    description: 'گردش، کالای راکد، ABC و پیشنهاد خرید در یک زنجیره تصمیم.',
    managerQuestion: 'کدام کالا سریع می‌چرخد، کدام خوابیده و چه چیزی باید تهیه شود؟',
    icon: 'fa-boxes-stacked',
    path: '/reports/inventory-turnover',
    tabs: [
      { path: '/reports/inventory-turnover', title: 'گردش موجودی', shortTitle: 'گردش موجودی', description: 'سرعت گردش و میانگین روزهای ماندگاری کالا.' },
      { path: '/reports/dead-stock', title: 'کالاهای راکد', shortTitle: 'کالای راکد', description: 'کالاهای بدون حرکت و سرمایه خوابیده.' },
      { path: '/reports/abc', title: 'تحلیل ABC', shortTitle: 'ABC', description: 'طبقه‌بندی کالا بر اساس ارزش و گردش فروش.' },
      { path: '/reports/analysis/inventory', title: 'تحلیل وضعیت انبار', shortTitle: 'تحلیل انبار', description: 'تحلیل ترکیبی موجودی و عملکرد کالا.' },
      { path: '/reports/analysis/suggestions', title: 'پیشنهاد خرید', shortTitle: 'پیشنهاد خرید', description: 'پیشنهاد خرید بر اساس روند فروش و موجودی.' },
    ],
  },
  {
    id: 'customers',
    title: 'مشتریان',
    description: 'مشتریان برتر، وفاداری و بازگشت مشتری بدون گزارش‌های پراکنده.',
    managerQuestion: 'بهترین مشتریان چه کسانی‌اند و کدام گروه احتمال بازگشت دارد؟',
    icon: 'fa-users',
    path: '/reports/top-customers',
    tabs: [
      { path: '/reports/top-customers', title: 'مشتریان برتر', shortTitle: 'مشتریان برتر', description: 'رتبه‌بندی مشتریان بر اساس فروش در بازه.' },
      { path: '/reports/rfm', title: 'تحلیل وفاداری RFM', shortTitle: 'وفاداری RFM', description: 'بخش‌بندی مشتریان بر اساس تازگی، تکرار و ارزش خرید.' },
      { path: '/reports/cohort', title: 'تحلیل بازگشت مشتری', shortTitle: 'بازگشت مشتری', description: 'رفتار بازگشت گروه‌های زمانی مشتریان.' },
    ],
  },
  {
    id: 'partners-suppliers',
    title: 'شرکا و تأمین‌کنندگان',
    description: 'عملکرد شرکا، مانده بستانکاران و رتبه تأمین‌کنندگان.',
    managerQuestion: 'سهم، تسویه و عملکرد شرکا و تأمین‌کنندگان چگونه است؟',
    icon: 'fa-handshake',
    path: '/reports/partners-performance',
    tabs: [
      { path: '/reports/partners-performance', title: 'عملکرد و تسویه شرکا', shortTitle: 'عملکرد شرکا', description: 'سود، خرید، فروش، ارزش موجودی و تسویه هر شریک.' },
      { path: '/reports/creditors', title: 'بستانکاران', shortTitle: 'بستانکاران', description: 'مانده واقعی دفتر حساب تأمین‌کننده و همکار.' },
      { path: '/reports/top-suppliers', title: 'تأمین‌کنندگان برتر', shortTitle: 'تأمین‌کنندگان', description: 'رتبه‌بندی بر اساس گردش و ارزش خرید.' },
    ],
  },
  {
    id: 'control-intelligence',
    title: 'کنترل و هوش',
    description: 'ممیزی اختلاف، بینش‌های مدیریتی و پایش فنیِ محدود به مدیر.',
    managerQuestion: 'کجا اختلاف، ریسک یا فرصت قابل اقدام وجود دارد؟',
    icon: 'fa-shield-halved',
    path: '/reports/financial-audit',
    tabs: [
      { path: '/reports/financial-audit', title: 'ممیزی اختلاف گزارش‌ها', shortTitle: 'ممیزی اختلاف', description: 'کنترل اختلاف فروش، پرداخت، سود و موجودی.' },
      { path: '/reports/smart-insights', title: 'دستیار هوشمند مدیریت', shortTitle: 'بینش‌های هوشمند', description: 'بینش‌های فقط‌خواندنی و پیشنهادهای قابل اقدام.' },
      { path: '/reports/ml-operator-overview', title: 'پایش فنی داده‌های هوشمند', shortTitle: 'پایش فنی', description: 'کنترل فراداده، بسته‌ها و اسنپ‌شات‌های داخلی.', adminManagerOnly: true },
    ],
  },
];

export const getVisibleCenterTabs = (center: ReportCenter, roleName?: string | null): ReportCenterTab[] =>
  center.tabs.filter((tab) => !tab.adminManagerOnly || roleName === 'Admin' || roleName === 'Manager');

export const findReportCenter = (pathname: string): ReportCenter | undefined =>
  REPORT_CENTERS.find((center) =>
    center.tabs.some((tab) => tab.path === pathname || tab.aliases?.includes(pathname)),
  );

export const isReportTabActive = (tab: ReportCenterTab, pathname: string): boolean =>
  tab.path === pathname || Boolean(tab.aliases?.includes(pathname));
