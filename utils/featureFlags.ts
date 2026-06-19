export type FeatureCategory = 'core' | 'sales' | 'inventory' | 'crm' | 'services' | 'messaging' | 'reports' | 'ai' | 'system';

export type FeatureFlagScope = 'module' | 'feature';

export type FeatureFlagDefinition = {
  key: string;
  title: string;
  description: string;
  category: FeatureCategory;
  tier: 'core' | 'commercial' | 'advanced' | 'enterprise';
  defaultEnabled: boolean;
  optional: boolean;
  icon: string;
  scope?: FeatureFlagScope;
  parentKey?: string;
  groupTitle?: string;
  order?: number;
  routes?: string[];
  navIds?: string[];
  settingKey: string;
};

export const FEATURE_CATEGORIES: Record<FeatureCategory, { title: string; description: string; icon: string }> = {
  core: { title: 'هسته برنامه', description: 'بخش‌هایی که برای کارکرد پایه سیستم لازم هستند.', icon: 'fa-solid fa-layer-group' },
  sales: { title: 'فروش و فاکتور', description: 'ثبت فروش، فاکتور، اقساط و عملیات صندوق.', icon: 'fa-solid fa-cart-shopping' },
  inventory: { title: 'کالا و انبار', description: 'مدیریت کالا، موبایل، خرید، انبارگردانی و چاپ لیبل.', icon: 'fa-solid fa-boxes-stacked' },
  crm: { title: 'اشخاص و CRM', description: 'مشتریان، همکاران و پیگیری حساب‌ها.', icon: 'fa-solid fa-users' },
  services: { title: 'تعمیرات و خدمات', description: 'پذیرش تعمیرات، رسید تعمیر و خدمات قابل فروش.', icon: 'fa-solid fa-screwdriver-wrench' },
  messaging: { title: 'پیام‌رسانی', description: 'پیامک، تلگرام، صف ارسال و اعلان‌ها.', icon: 'fa-solid fa-paper-plane' },
  reports: { title: 'گزارش‌ها و تحلیل', description: 'گزارش‌های مالی، فروش، وصول، موجودی و تحلیل‌های مدیریتی.', icon: 'fa-solid fa-chart-pie' },
  ai: { title: 'هوشمندسازی و AI', description: 'هوش قیمت‌گذاری، پیشنهادها، یادگیری و مغز هوشمند فروشگاه.', icon: 'fa-solid fa-brain' },
  system: { title: 'سیستم و نگهداری', description: 'بکاپ، دامنه محلی، لاگ فعالیت و ابزارهای مدیریتی.', icon: 'fa-solid fa-shield-halved' },
};

export const FEATURE_FLAGS: FeatureFlagDefinition[] = [
  { key: 'cash_sales', title: 'فروش نقدی', description: 'ثبت فروش روزانه و صدور فاکتور نقدی؛ برای اکثر نسخه‌های تجاری هسته فروش است.', category: 'sales', tier: 'core', defaultEnabled: true, optional: false, icon: 'fa-solid fa-cash-register', routes: ['/sales', '/sales/cash', '/cart-sale', '/invoices'], navIds: ['sales', 'sales-cash', 'invoices'], settingKey: 'feature_cash_sales_enabled' },
  { key: 'dashboard_experience', title: 'داشبورد و تجربه روزانه', description: 'ویجت‌های نمای اول، خلاصه روز، ساعت و ابزارهای سریع داشبورد؛ مستقل از فروش نقدی کنترل می‌شود.', category: 'core', tier: 'commercial', defaultEnabled: true, optional: true, icon: 'fa-solid fa-gauge-high', settingKey: 'feature_dashboard_experience_enabled' },
  { key: 'installments', title: 'فروش اقساطی و چک', description: 'فروش اعتباری/اقساطی، سررسیدها، پرداخت‌های جزئی و گزارش وصول.', category: 'sales', tier: 'commercial', defaultEnabled: true, optional: true, icon: 'fa-solid fa-file-invoice-dollar', routes: ['/installment-sales', '/reports/installments-calendar', '/reports/collection-center'], navIds: ['installment-sales', 'installments-calendar', 'collection-center'], settingKey: 'feature_installments_enabled' },
  { key: 'products_inventory', title: 'کالا و موجودی', description: 'کاتالوگ کالا، قیمت خرید/فروش، موجودی و کنترل پایه انبار.', category: 'inventory', tier: 'core', defaultEnabled: true, optional: false, icon: 'fa-solid fa-cube', routes: ['/products'], navIds: ['products-group', 'products'], settingKey: 'feature_products_inventory_enabled' },
  { key: 'mobile_phones', title: 'انبار تخصصی گوشی', description: 'مدیریت IMEI، مدل، رنگ، وضعیت، خرید و فروش گوشی؛ برای فروشگاه آجیل/خشکبار می‌تواند خاموش باشد.', category: 'inventory', tier: 'advanced', defaultEnabled: true, optional: true, icon: 'fa-solid fa-mobile-screen-button', routes: ['/mobile-phones', '/reports/mobile-sales-analytics', '/reports/phone-sales', '/reports/phone-installment-sales'], navIds: ['mobile-phones', 'mobile-sales-analytics', 'report-phone-sales', 'report-phone-installment-sales'], settingKey: 'feature_mobile_phones_enabled' },
  { key: 'purchases_stock_counts', title: 'خرید و انبارگردانی', description: 'ثبت خرید، انبارگردانی، کنترل مغایرت و ابزارهای انبار.', category: 'inventory', tier: 'commercial', defaultEnabled: true, optional: true, icon: 'fa-solid fa-warehouse', routes: ['/purchases', '/stock-counts', '/tools/labelprint'], navIds: ['purchases', 'stock-counts', 'label-print'], settingKey: 'feature_purchases_stock_counts_enabled' },
  { key: 'people_crm', title: 'مشتریان و همکاران', description: 'پرونده مشتری، همکار/تأمین‌کننده و مانده حساب؛ برای نسخه تجاری معمولاً لازم است.', category: 'crm', tier: 'core', defaultEnabled: true, optional: false, icon: 'fa-solid fa-user-group', routes: ['/customers', '/partners'], navIds: ['people', 'customers', 'partners'], settingKey: 'feature_people_crm_enabled' },
  { key: 'repairs_services', title: 'تعمیرات و خدمات', description: 'ماژول تعمیرات موبایل، رسید پذیرش و خدمات؛ در نسخه مخصوص آجیل/خشکبار بهتر است آپشنال باشد.', category: 'services', tier: 'advanced', defaultEnabled: true, optional: true, icon: 'fa-solid fa-screwdriver-wrench', routes: ['/repairs', '/services'], navIds: ['repairs-services', 'repairs', 'services'], settingKey: 'feature_repairs_services_enabled' },
  { key: 'notifications_outbox', title: 'اعلان‌ها و صف ارسال', description: 'مرکز اعلان داخلی، صف پیام‌ها و خطاهای ارسال.', category: 'messaging', tier: 'commercial', defaultEnabled: true, optional: true, icon: 'fa-solid fa-bell', routes: ['/notifications', '/outbox'], navIds: ['messaging', 'notifications', 'outbox'], settingKey: 'feature_notifications_outbox_enabled' },
  { key: 'sms', title: 'پیامک', description: 'ارسال پیامک الگو محور و تست پترن؛ فقط وقتی ارائه‌دهنده پیامک فعال است روشن بماند.', category: 'messaging', tier: 'advanced', defaultEnabled: true, optional: true, icon: 'fa-solid fa-message', settingKey: 'feature_sms_enabled' },
  { key: 'telegram', title: 'تلگرام', description: 'بات تلگرام، قالب‌ها، اتصال مشتری و گزارش ارسال؛ برای نسخه سبک تجاری آپشنال است.', category: 'messaging', tier: 'advanced', defaultEnabled: true, optional: true, icon: 'fa-brands fa-telegram', settingKey: 'feature_telegram_enabled' },
  { key: 'advanced_reports', title: 'گزارش‌های پیشرفته', description: 'داشبوردهای مالی، فروش، سودآوری، RFM، cohort، cashflow و تحلیل موجودی.', category: 'reports', tier: 'advanced', defaultEnabled: true, optional: true, icon: 'fa-solid fa-chart-line', routes: ['/reports'], navIds: ['reports'], settingKey: 'feature_advanced_reports_enabled' },
  { key: 'ai_pricing', title: 'هوش قیمت‌گذاری', description: 'یادگیری از فروش‌های واقعی، لاگ تصمیمات قیمت و پیشنهاد قیمت فروش.', category: 'ai', tier: 'enterprise', defaultEnabled: true, optional: true, icon: 'fa-solid fa-tags', navIds: ['pricing'], settingKey: 'feature_ai_pricing_enabled' },
  { key: 'smart_insights', title: 'مغز هوشمند فروشگاه', description: 'تحلیل هوشمند، پیشنهاد خرید، هشدارهای مدیریتی و مرکز تصمیم‌گیری.', category: 'ai', tier: 'enterprise', defaultEnabled: true, optional: true, icon: 'fa-solid fa-brain', routes: ['/reports/smart-insights', '/reports/analysis'], navIds: ['smart-insights', 'smart-analysis', 'analysis-profitability', 'analysis-inventory', 'analysis-suggestions'], settingKey: 'feature_smart_insights_enabled' },
  { key: 'audit_log', title: 'گزارش فعالیت‌ها', description: 'ردیابی عملیات کاربران و تغییرات حساس برای کنترل مدیریتی.', category: 'system', tier: 'commercial', defaultEnabled: true, optional: true, icon: 'fa-solid fa-clipboard-list', routes: ['/audit-log'], navIds: ['audit-log'], settingKey: 'feature_audit_log_enabled' },
  { key: 'local_domain_pwa', title: 'دامنه محلی و PWA', description: 'تنظیم دامنه داخلی، گواهی محلی و نصب اپ روی دستگاه‌ها.', category: 'system', tier: 'advanced', defaultEnabled: true, optional: true, icon: 'fa-solid fa-network-wired', settingKey: 'feature_local_domain_pwa_enabled' },
];


export const MICRO_FEATURE_FLAGS: FeatureFlagDefinition[] = [
  { key: 'phone_ai_pricing_settings', title: 'تنظیمات هوش قیمت‌گذاری داخل ثبت گوشی', description: 'کارت تنظیم سیاست قیمت‌گذاری، سود هدف، ریسک، آستانه راکدی و رُند قیمت در فرم ثبت گوشی. با خاموش شدن، فرم سبک‌تر می‌شود و کاربر فقط قیمت دستی می‌زند.', category: 'ai', tier: 'enterprise', defaultEnabled: true, optional: true, icon: 'fa-solid fa-sliders', scope: 'feature', parentKey: 'ai_pricing', groupTitle: 'ثبت گوشی', order: 10, settingKey: 'feature_phone_ai_pricing_settings_enabled' },
  { key: 'phone_ai_price_signal', title: 'AI Price Signal در ثبت گوشی', description: 'محاسبه قیمت پیشنهادی، سیگنال ریسک قیمت، اعتماد مدل و دکمه اعمال قیمت پیشنهادی. اگر خاموش باشد محاسبات و کارت AI Price Signal در فرم mount نمی‌شود.', category: 'ai', tier: 'enterprise', defaultEnabled: true, optional: true, icon: 'fa-solid fa-signal', scope: 'feature', parentKey: 'ai_pricing', groupTitle: 'ثبت گوشی', order: 20, settingKey: 'feature_phone_ai_price_signal_enabled' },
  { key: 'phone_ai_strategy_advisor', title: 'AI Strategy Advisor ثبت گوشی', description: 'پیشنهاد خودکار استراتژی فروش سریع/متعادل/حداکثر سود بر اساس داده ورودی، یادگیری و رفتار قیمت‌گذاری.', category: 'ai', tier: 'enterprise', defaultEnabled: true, optional: true, icon: 'fa-solid fa-route', scope: 'feature', parentKey: 'ai_pricing', groupTitle: 'ثبت گوشی', order: 30, settingKey: 'feature_phone_ai_strategy_advisor_enabled' },
  { key: 'phone_pricing_behavior_learning', title: 'یادگیری رفتار قیمت‌گذاری گوشی', description: 'ذخیره تصمیم‌های قبول/اصلاح/دستی قیمت در local profile و استفاده از آن برای پیشنهادهای بعدی. خاموش شدن آن ثبت یادگیری جدید را متوقف می‌کند.', category: 'ai', tier: 'enterprise', defaultEnabled: true, optional: true, icon: 'fa-solid fa-brain', scope: 'feature', parentKey: 'ai_pricing', groupTitle: 'ثبت گوشی', order: 40, settingKey: 'feature_phone_pricing_behavior_learning_enabled' },
  { key: 'phone_smart_warnings', title: 'هشدارهای هوشمند ثبت گوشی', description: 'هشدارهای لحظه‌ای مثل قیمت فروش نامشخص، سود منفی، باتری پرریسک و کیفیت داده ورودی در فرم ثبت گوشی.', category: 'inventory', tier: 'advanced', defaultEnabled: true, optional: true, icon: 'fa-solid fa-triangle-exclamation', scope: 'feature', parentKey: 'mobile_phones', groupTitle: 'ثبت گوشی', order: 50, settingKey: 'feature_phone_smart_warnings_enabled' },
  { key: 'phone_inventory_drilldown', title: 'درایلدان عملیاتی انبار گوشی', description: 'کارت‌های اکشن و فیلترهای هوشمند مرور انبار گوشی برای رفتن مستقیم به راکدها، بی‌قیمت‌ها، کم‌باتری‌ها و ریسک سود.', category: 'inventory', tier: 'advanced', defaultEnabled: true, optional: true, icon: 'fa-solid fa-bullseye', scope: 'feature', parentKey: 'mobile_phones', groupTitle: 'مرور انبار گوشی', order: 60, settingKey: 'feature_phone_inventory_drilldown_enabled' },
  { key: 'dashboard_clock_widget', title: 'ساعت داشبورد', description: 'نمای ساعت، تاریخ شمسی و وضعیت لحظه‌ای داشبورد. با خاموش شدن، ویجت ساعت از داشبورد حذف می‌شود و mount اضافه ندارد.', category: 'core', tier: 'commercial', defaultEnabled: true, optional: true, icon: 'fa-solid fa-clock', scope: 'feature', parentKey: 'dashboard_experience', groupTitle: 'داشبورد', order: 70, settingKey: 'feature_dashboard_clock_widget_enabled' },
  { key: 'settings_ai_control_panel', title: 'کنترل‌پنل هوشمندسازی در تنظیمات', description: 'پنل آموزش، اثرگذاری، Auto Pause و سوییچ‌های AI/اتوماسیون در صفحه تنظیمات.', category: 'ai', tier: 'enterprise', defaultEnabled: true, optional: true, icon: 'fa-solid fa-microchip', scope: 'feature', parentKey: 'smart_insights', groupTitle: 'تنظیمات', order: 80, settingKey: 'feature_settings_ai_control_panel_enabled' },
];

export type CommercialPlanKey = 'lite' | 'standard' | 'pro' | 'enterprise';

export const COMMERCIAL_PLANS: Record<CommercialPlanKey, { title: string; description: string; icon: string; enable: string[]; disable: string[] }> = {
  lite: { title: 'Lite', description: 'نسخه سبک برای فروشگاه ساده؛ بدون موبایل، تعمیرات، پیام‌رسانی و AI سنگین.', icon: 'fa-solid fa-feather', enable: ['cash_sales', 'dashboard_experience', 'products_inventory', 'people_crm', 'dashboard_clock_widget'], disable: ['installments', 'mobile_phones', 'purchases_stock_counts', 'repairs_services', 'notifications_outbox', 'sms', 'telegram', 'advanced_reports', 'ai_pricing', 'smart_insights', 'audit_log', 'local_domain_pwa', 'phone_ai_pricing_settings', 'phone_ai_price_signal', 'phone_ai_strategy_advisor', 'phone_pricing_behavior_learning', 'phone_smart_warnings', 'phone_inventory_drilldown', 'settings_ai_control_panel'] },
  standard: { title: 'Standard', description: 'نسخه تجاری عمومی با فروش، موجودی، خرید، CRM و گزارش‌های لازم؛ AI ریزدانه خاموش می‌ماند.', icon: 'fa-solid fa-store', enable: ['cash_sales', 'dashboard_experience', 'installments', 'products_inventory', 'purchases_stock_counts', 'people_crm', 'advanced_reports', 'audit_log', 'dashboard_clock_widget'], disable: ['mobile_phones', 'repairs_services', 'notifications_outbox', 'sms', 'telegram', 'ai_pricing', 'smart_insights', 'local_domain_pwa', 'phone_ai_pricing_settings', 'phone_ai_price_signal', 'phone_ai_strategy_advisor', 'phone_pricing_behavior_learning', 'phone_smart_warnings', 'phone_inventory_drilldown', 'settings_ai_control_panel'] },
  pro: { title: 'Pro', description: 'نسخه کامل‌تر برای فروشگاه موبایل/چندبخشی؛ موبایل، اقساط، گزارش‌ها، پیام‌رسانی و فیچرهای کاربردی روشن.', icon: 'fa-solid fa-gem', enable: ['cash_sales', 'dashboard_experience', 'installments', 'products_inventory', 'mobile_phones', 'purchases_stock_counts', 'people_crm', 'repairs_services', 'notifications_outbox', 'sms', 'advanced_reports', 'audit_log', 'phone_smart_warnings', 'phone_inventory_drilldown', 'dashboard_clock_widget'], disable: ['telegram', 'ai_pricing', 'smart_insights', 'local_domain_pwa', 'phone_ai_pricing_settings', 'phone_ai_price_signal', 'phone_ai_strategy_advisor', 'phone_pricing_behavior_learning', 'settings_ai_control_panel'] },
  enterprise: { title: 'Enterprise', description: 'همه ماژول‌ها و همه فیچرهای ریزدانه، مخصوص نسخه پرمیوم و دموهای فروش قدرتمند.', icon: 'fa-solid fa-crown', enable: ['cash_sales', 'dashboard_experience', 'installments', 'products_inventory', 'mobile_phones', 'purchases_stock_counts', 'people_crm', 'repairs_services', 'notifications_outbox', 'sms', 'telegram', 'advanced_reports', 'ai_pricing', 'smart_insights', 'audit_log', 'local_domain_pwa', 'phone_ai_pricing_settings', 'phone_ai_price_signal', 'phone_ai_strategy_advisor', 'phone_pricing_behavior_learning', 'phone_smart_warnings', 'phone_inventory_drilldown', 'dashboard_clock_widget', 'settings_ai_control_panel'], disable: [] },
};

export const ALL_FEATURE_FLAGS = [...FEATURE_FLAGS.map((feature) => ({ ...feature, scope: 'module' as const })), ...MICRO_FEATURE_FLAGS];

export const getChildFeatureFlags = (parentKey: string) => MICRO_FEATURE_FLAGS
  .filter((feature) => feature.parentKey === parentKey)
  .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

export const FEATURE_DEFAULTS = Object.fromEntries(ALL_FEATURE_FLAGS.map((f) => [f.key, f.defaultEnabled])) as Record<string, boolean>;

export const getFeatureDefinition = (key: string) => ALL_FEATURE_FLAGS.find((item) => item.key === key);

export const isTruthyFeatureValue = (value: unknown, fallback = true) => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on', 'enabled', 'فعال'].includes(normalized);
};

export const buildFeatureFlagsFromSettings = (settings: Record<string, unknown> = {}) => {
  return Object.fromEntries(
    ALL_FEATURE_FLAGS.map((feature) => [feature.key, isTruthyFeatureValue(settings[feature.settingKey], feature.defaultEnabled)])
  ) as Record<string, boolean>;
};

export const isFeatureEnabledForPath = (flags: Record<string, boolean>, path: string) => {
  const matched = FEATURE_FLAGS.find((feature) => feature.routes?.some((route) => path === route || path.startsWith(route + '/')));
  if (!matched) return true;
  return flags[matched.key] !== false;
};

export const filterNavItemsByFeatures = <T extends { id: string; path?: string; children?: T[]; featureKey?: string }>(items: T[], flags: Record<string, boolean>): T[] => {
  const walk = (list: T[]): T[] => list
    .map((item) => {
      const directFeature = item.featureKey || FEATURE_FLAGS.find((feature) => feature.navIds?.includes(item.id))?.key;
      if (directFeature && flags[directFeature] === false) return null;
      if (item.path && !isFeatureEnabledForPath(flags, item.path)) return null;
      const children = item.children?.length ? walk(item.children) : undefined;
      const next = { ...item, children } as T;
      if ((!next.path || next.path.trim() === '') && (!next.children || next.children.length === 0)) return null;
      return next;
    })
    .filter(Boolean) as T[];
  return walk(items);
};
