import type { InsightSeverity, SeverityMetaMap, SmartInsightTypeLabels } from './types/smartInsightContracts';

export const smartInsightSeverityMeta: SeverityMetaMap = {
  critical: { label: 'فوری', dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-500/25', border: 'border-rose-200/80 dark:border-rose-500/30', soft: 'bg-rose-50/70 dark:bg-rose-500/10', icon: 'fa-triangle-exclamation' },
  high: { label: 'مهم', dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-200 dark:border-orange-500/25', border: 'border-orange-200/80 dark:border-orange-500/30', soft: 'bg-orange-50/70 dark:bg-orange-500/10', icon: 'fa-bolt' },
  medium: { label: 'قابل بررسی', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/25', border: 'border-amber-200/80 dark:border-amber-500/30', soft: 'bg-amber-50/70 dark:bg-amber-500/10', icon: 'fa-circle-info' },
  low: { label: 'پیشنهاد', dot: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:border-sky-500/25', border: 'border-sky-200/80 dark:border-sky-500/30', soft: 'bg-sky-50/70 dark:bg-sky-500/10', icon: 'fa-lightbulb' },
  positive: { label: 'مثبت', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/25', border: 'border-emerald-200/80 dark:border-emerald-500/30', soft: 'bg-emerald-50/70 dark:bg-emerald-500/10', icon: 'fa-check-circle' },
};

export const smartInsightTypeLabels: SmartInsightTypeLabels = {
  all: 'همه Insightها',
  sales_drop: 'افت فروش',
  sales_growth: 'رشد فروش',
  stock_reorder: 'پیشنهاد خرید',
  discount_anomaly: 'تخفیف غیرعادی',
  customer_risk: 'ریسک مشتری',
  customer_intelligence: 'شخصیت مشتری',
  auto_pricing: 'قیمت‌گذاری هوشمند',
  ai_sales_agent: 'دستیار فروش فعال',
  real_profit: 'سود واقعی',
  hidden_loss: 'ضرر پنهان',
  hidden_profit: 'فرصت سود',
  invoice_audit: 'کنترل فاکتور',
  collection_risk: 'وصول',
  profit_quality: 'کیفیت سود',
  daily_summary: 'خلاصه روز',
};

export const defaultSmartInsightSeverity: InsightSeverity = 'medium';
