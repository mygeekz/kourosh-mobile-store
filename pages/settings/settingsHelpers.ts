import moment from 'jalali-moment';

const LOCAL_DOMAIN_SUFFIX_WHITELIST = new Set(['localhost', 'home.arpa', 'internal', 'lan']);

export const normalizeLocalHostname = (value: unknown) => {
  const raw = String(value || '').trim().toLowerCase();
  return raw
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const normalizeLocalSuffix = (value: unknown) => {
  const raw = String(value || '').trim().toLowerCase().replace(/^\.+/, '').replace(/\.+$/, '');
  if (!raw) return 'localhost';
  return LOCAL_DOMAIN_SUFFIX_WHITELIST.has(raw) ? raw : 'localhost';
};

export const buildLocalDomain = (hostname: unknown, suffix: unknown) => {
  const host = normalizeLocalHostname(hostname);
  const suf = normalizeLocalSuffix(suffix);
  return host ? `${host}.${suf}` : '';
};

export const toLatinDigits = (value: unknown) => String(value || '')
  .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export const parsePricingDecisionDateFilter = (value: string, endOfDay = false) => {
  const raw = toLatinDigits(value).trim().replace(/[.\-]/g, '/');
  if (!raw) return endOfDay ? Number.POSITIVE_INFINITY : 0;
  const normalized = raw.split('/').map((part) => part.padStart(2, '0')).join('/');
  const jalali = moment.from(normalized, 'fa', 'YYYY/MM/DD');
  const gregorian = moment(normalized, 'YYYY/MM/DD', true);
  const parsed = jalali.isValid() ? jalali : gregorian;
  if (!parsed.isValid()) return endOfDay ? Number.POSITIVE_INFINITY : 0;
  return (endOfDay ? parsed.endOf('day') : parsed.startOf('day')).valueOf();
};

export const normalizePricingDateInput = (value: string) => toLatinDigits(value)
  .replace(/[^0-9/.-]/g, '')
  .replace(/[.\-]/g, '/')
  .slice(0, 10);

export const formatPricingDatePreview = (value: string, fallback: string) => {
  const raw = normalizePricingDateInput(value);
  if (!raw) return fallback;
  const parsed = moment.from(raw, 'fa', 'YYYY/MM/DD');
  return parsed.isValid() ? parsed.locale('fa').format('YYYY/MM/DD') : fallback;
};

// افزودن مورد جدید تب جدید برای تنظیمات تلگرام
export type TabKey = 'account' | 'business' | 'modules' | 'local' | 'pricing' | 'smart' | 'sms' | 'telegram' | 'reminders' | 'style' | 'users' | 'data';
export type PartnerShareStatus = { state: 'loading' | 'ready' | 'warning' | 'empty' | 'error'; totalShare: number; partnerCount: number; label: string; hint: string };
export type PartnerShareProfileItemLike = { sharePercent?: number | string | null };
export type PartnerShareProfileLike = {
  isDefault?: number | string | boolean | null;
  items?: PartnerShareProfileItemLike[] | null;
};
export const formatSettingsPercentFa = (value: number | string) => `${Number(value || 0).toLocaleString('fa-IR')}٪`;
export const canManageStoreOwnershipByRole = (roleName?: string | null) => {
  const normalized = String(roleName || '').trim().toLowerCase();
  return ['admin', 'administrator'].includes(normalized);
};
export const ROLE_LABELS_FA: Record<string, string> = {
  admin: 'مدیر کل',
  administrator: 'مدیر کل',
  manager: 'مدیر',
  salesperson: 'فروشنده',
  seller: 'فروشنده',
  marketer: 'بازاریاب',
  accountant: 'حسابدار',
  support: 'پشتیبان',
  operator: 'اپراتور',
  partner: 'شریک',
  customer: 'مشتری',
};
export const getRoleLabelFa = (roleName?: string | null) => {
  const raw = String(roleName || '').trim();
  if (!raw) return '—';
  return ROLE_LABELS_FA[raw.toLowerCase()] || raw;
};
export const buildPartnerShareStatus = (profiles: PartnerShareProfileLike[]): PartnerShareStatus => {
  const list = Array.isArray(profiles) ? profiles : [];
  const defaultProfile = list.find((item) => Number(item?.isDefault) === 1) || list[0] || null;
  const items: PartnerShareProfileItemLike[] = Array.isArray(defaultProfile?.items) ? defaultProfile.items : [];
  const totalShare = Number(items.reduce((sum: number, item) => sum + (Number(item?.sharePercent) || 0), 0).toFixed(2));
  const partnerCount = items.filter((item) => Number(item?.sharePercent) > 0).length;
  if (!defaultProfile || items.length === 0) {
    return { state: 'empty', totalShare: 0, partnerCount: 0, label: 'تنظیم نشده', hint: 'پروفایل پیش‌فرض تسهیم سود هنوز آیتم فعال ندارد.' };
  }
  if (Math.abs(totalShare - 100) <= 0.01) {
    return { state: 'ready', totalShare, partnerCount, label: '۱۰۰٪ سالم', hint: `جمع سهم ${partnerCount.toLocaleString('fa-IR')} شریک دقیقاً ۱۰۰٪ است.` };
  }
  return {
    state: 'warning',
    totalShare,
    partnerCount,
    label: `${formatSettingsPercentFa(totalShare)} / ۱۰۰٪`,
    hint: totalShare > 100 ? 'جمع سهم شرکا بیشتر از ۱۰۰٪ است و باید اصلاح شود.' : 'جمع سهم شرکا کمتر از ۱۰۰٪ است و باید اصلاح شود.',
  };
};

const CLOCK_VIEW_MODE_KEY = 'kourosh.dashboard.clock.viewMode';
export type ClockViewMode = 'auto' | 'minimal' | 'manager' | 'cinematic';
export const CLOCK_VIEW_MODE_OPTIONS: Array<{ key: ClockViewMode; label: string; hint: string; icon: string }> = [
  { key: 'auto', label: 'خودکار', hint: 'سیستم بر اساس ساعت، فروش امروز و وضعیت پیگیری‌ها بهترین نما را انتخاب می‌کند.', icon: 'fa-solid fa-wand-magic-sparkles' },
  { key: 'minimal', label: 'ساده', hint: 'نمای سبک و خلوت؛ فقط زمان، تاریخ و وضعیت اصلی فروشگاه.', icon: 'fa-regular fa-clock' },
  { key: 'manager', label: 'مدیریتی', hint: 'نمای عملیاتی برای فروشگاه فعال؛ زمان، فروش، سررسیدها و اکشن‌های سریع.', icon: 'fa-solid fa-chart-line' },
  { key: 'cinematic', label: 'پیشرفته', hint: 'نمای پرجزئیات‌تر و لوکس برای داشبوردهای بزرگ‌تر.', icon: 'fa-solid fa-star' },
];
export const loadClockViewMode = (): ClockViewMode => {
  if (typeof window === 'undefined') return 'auto';
  const raw = window.localStorage.getItem(CLOCK_VIEW_MODE_KEY);
  return raw === 'minimal' || raw === 'manager' || raw === 'cinematic' || raw === 'auto' ? raw : 'auto';
};
export const saveClockViewMode = (mode: ClockViewMode) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CLOCK_VIEW_MODE_KEY, mode);
  window.dispatchEvent(new StorageEvent('storage', { key: CLOCK_VIEW_MODE_KEY, newValue: mode }));
};

