import type { Request, Response, NextFunction } from 'express';

type SettingsLoader = () => Promise<Record<string, any>>;

type CommercialModuleRule = {
  key: string;
  settingKey: string;
  title: string;
  apiPrefixes: string[];
};

const truthyFeatureValue = (value: unknown, fallback = true) => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['0', 'false', 'off', 'no', 'disabled', 'غیرفعال'].includes(normalized)) return false;
  if (['1', 'true', 'on', 'yes', 'enabled', 'فعال'].includes(normalized)) return true;
  return fallback;
};

export const COMMERCIAL_MODULE_RULES: CommercialModuleRule[] = [
  { key: 'cash_sales', settingKey: 'feature_cash_sales_enabled', title: 'فروش نقدی', apiPrefixes: ['/api/sales', '/api/sales-orders', '/api/invoice-data'] },
  { key: 'installments', settingKey: 'feature_installments_enabled', title: 'فروش اقساطی و وصول', apiPrefixes: ['/api/installment-sales', '/api/reports/collection-center', '/api/reports/installments-calendar'] },
  { key: 'products_inventory', settingKey: 'feature_products_inventory_enabled', title: 'کالا و موجودی', apiPrefixes: ['/api/products', '/api/categories', '/api/sellable-items', '/api/inventory/adjustments'] },
  { key: 'mobile_phones', settingKey: 'feature_mobile_phones_enabled', title: 'انبار تخصصی گوشی', apiPrefixes: ['/api/phones', '/api/phone-models', '/api/phone-colors', '/api/barcode/phone', '/api/reports/mobile-sales-analytics', '/api/reports/phone-sales', '/api/reports/phone-installment-sales'] },
  { key: 'purchases_stock_counts', settingKey: 'feature_purchases_stock_counts_enabled', title: 'خرید و انبارگردانی', apiPrefixes: ['/api/purchases', '/api/stock-counts', '/api/labels/data', '/api/barcode/product'] },
  { key: 'people_crm', settingKey: 'feature_people_crm_enabled', title: 'مشتریان و همکاران', apiPrefixes: ['/api/customers', '/api/partners'] },
  { key: 'repairs_services', settingKey: 'feature_repairs_services_enabled', title: 'تعمیرات و خدمات', apiPrefixes: ['/api/repairs', '/api/services'] },
  { key: 'notifications_outbox', settingKey: 'feature_notifications_outbox_enabled', title: 'اعلان‌ها و صف ارسال', apiPrefixes: ['/api/notifications', '/api/reminders'] },
  { key: 'sms', settingKey: 'feature_sms_enabled', title: 'پیامک', apiPrefixes: ['/api/sms', '/api/messages/send'] },
  { key: 'telegram', settingKey: 'feature_telegram_enabled', title: 'تلگرام', apiPrefixes: ['/api/telegram'] },
  { key: 'advanced_reports', settingKey: 'feature_advanced_reports_enabled', title: 'گزارش‌های پیشرفته', apiPrefixes: ['/api/reports/rfm', '/api/reports/cohort', '/api/reports/inventory-turnover', '/api/reports/dead-stock', '/api/reports/abc', '/api/reports/aging-receivables', '/api/reports/cashflow', '/api/reports/analytics-dashboard', '/api/reports/financial-overview', '/api/reports/sales-profit', '/api/reports/realized-profit', '/api/reports/product-profit-real', '/api/reports/product-margins', '/api/exports'] },
  { key: 'smart_insights', settingKey: 'feature_smart_insights_enabled', title: 'مغز هوشمند فروشگاه', apiPrefixes: ['/api/reports/smart-insights', '/api/analysis'] },
  { key: 'ai_pricing', settingKey: 'feature_ai_pricing_enabled', title: 'هوش قیمت‌گذاری', apiPrefixes: ['/api/ai/pricing'] },
  { key: 'audit_log', settingKey: 'feature_audit_log_enabled', title: 'گزارش فعالیت‌ها', apiPrefixes: ['/api/audit-log'] },
  { key: 'local_domain_pwa', settingKey: 'feature_local_domain_pwa_enabled', title: 'دامنه محلی و PWA', apiPrefixes: ['/api/settings/local-domain'] },
];

const PUBLIC_EXACT_PATHS = new Set([
  '/api/login',
  '/api/auth/login',
  '/api/auth/register',
  '/api/logout',
  '/api/me',
  '/api/module-flags',
  '/api/settings',
  '/api/settings/upload-logo',
  '/health',
]);
const PUBLIC_PREFIXES = ['/uploads', '/public'];

const matchesPrefix = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + '/') || path.startsWith(prefix + '?');

export const createCommercialModuleGuard = (loadSettings: SettingsLoader) => {
  let cache: { at: number; settings: Record<string, any> } | null = null;
  const cacheTtlMs = 1000;

  const getSettings = async () => {
    const now = Date.now();
    if (cache && now - cache.at < cacheTtlMs) return cache.settings;
    const settings = await loadSettings();
    cache = { at: now, settings: settings || {} };
    return cache.settings;
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const path = req.path || '';
      if (!path.startsWith('/api')) return next();
      if (PUBLIC_EXACT_PATHS.has(path) || PUBLIC_PREFIXES.some((prefix) => matchesPrefix(path, prefix))) return next();

      const rule = COMMERCIAL_MODULE_RULES.find((item) => item.apiPrefixes.some((prefix) => matchesPrefix(path, prefix)));
      if (!rule) return next();

      const settings = await getSettings();
      const enabled = truthyFeatureValue(settings[rule.settingKey], true);
      if (enabled) return next();

      return res.status(409).json({
        success: false,
        code: 'MODULE_DISABLED',
        moduleKey: rule.key,
        settingKey: rule.settingKey,
        message: `ماژول «${rule.title}» از تنظیمات ماژول‌های تجاری خاموش است. برای استفاده، آن را از تنظیمات فعال کنید.`,
        actionPath: '/settings?tab=modules',
        actionLabel: 'فعال‌سازی از ماژول‌های تجاری',
      });
    } catch (error) {
      return next(error);
    }
  };
};
