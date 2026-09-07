export type PartnerRiskLevel = 'good' | 'attention' | 'warning' | 'critical' | 'unknown';

export type PartnerRiskStatus = {
  level: PartnerRiskLevel;
  label: string;
  icon: string;
  badgeClass: string;
  surfaceClass: string;
  textClass: string;
  progressClass: string;
  strokeClass: string;
};

const statusMap: Record<PartnerRiskLevel, PartnerRiskStatus> = {
  good: { level: 'good', label: 'کم‌ریسک', icon: 'fa-solid fa-shield-circle-check', badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300', surfaceClass: 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20', textClass: 'text-emerald-700 dark:text-emerald-300', progressClass: 'bg-emerald-500', strokeClass: 'stroke-emerald-500' },
  attention: { level: 'attention', label: 'نیازمند توجه', icon: 'fa-solid fa-circle-exclamation', badgeClass: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300', surfaceClass: 'border-orange-200 bg-orange-50/50 dark:border-orange-900/60 dark:bg-orange-950/20', textClass: 'text-orange-700 dark:text-orange-300', progressClass: 'bg-orange-500', strokeClass: 'stroke-orange-500' },
  warning: { level: 'warning', label: 'نیازمند پیگیری', icon: 'fa-solid fa-triangle-exclamation', badgeClass: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300', surfaceClass: 'border-orange-200 bg-orange-50/50 dark:border-orange-900/60 dark:bg-orange-950/20', textClass: 'text-orange-700 dark:text-orange-300', progressClass: 'bg-orange-500', strokeClass: 'stroke-orange-500' },
  critical: { level: 'critical', label: 'بحرانی', icon: 'fa-solid fa-triangle-exclamation', badgeClass: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300', surfaceClass: 'border-rose-200 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20', textClass: 'text-rose-700 dark:text-rose-300', progressClass: 'bg-rose-500', strokeClass: 'stroke-rose-500' },
  unknown: { level: 'unknown', label: 'نامشخص', icon: 'fa-solid fa-circle-question', badgeClass: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300', surfaceClass: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60', textClass: 'text-slate-700 dark:text-slate-300', progressClass: 'bg-slate-400', strokeClass: 'stroke-slate-400' },
};

export const resolvePartnerRiskStatus = (score: unknown): PartnerRiskStatus => {
  const value = Number(score);
  if (!Number.isFinite(value) || value < 1 || value > 10) return statusMap.unknown;
  if (value >= 9) return statusMap.critical;
  if (value >= 6) return statusMap.warning;
  if (value >= 3) return statusMap.attention;
  return statusMap.good;
};
