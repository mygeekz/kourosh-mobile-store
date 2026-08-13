export const APP_TIME_ZONE = 'Asia/Tehran';

const faDateTimeFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const faDateFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const faLongDateFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const faWeekdayFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: APP_TIME_ZONE,
  weekday: 'long',
});

const enDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const tehranPartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const normalizeServerDateInput = (value: string): string => {
  const raw = value.trim();
  if (!raw) return raw;

  // SQLite قدیمی در بعضی دیتابیس‌ها زمان UTC را بدون Z ذخیره کرده است؛
  // مثل: 2026-05-19 17:14:22 یا 2026-05-19T17:14:22.
  // اگر بدون timezone به Date داده شود، مرورگر آن را ساعت محلی فرض می‌کند و لاگ‌ها ۳:۳۰ عقب می‌افتند.
  const looksLikeSqliteUtcDateTime = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?$/.test(raw);
  const hasExplicitTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  if (looksLikeSqliteUtcDateTime && !hasExplicitTimeZone) {
    return `${raw.replace(' ', 'T')}Z`;
  }

  return raw;
};

const toDate = (value?: string | number | Date | null): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  const normalized = typeof value === 'string' ? normalizeServerDateInput(value) : value;
  const d = normalized instanceof Date ? normalized : new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatIranDateTime = (value?: string | number | Date | null, fallback = '—') => {
  const d = toDate(value);
  if (!d) return fallback;
  return faDateTimeFormatter.format(d).replace('،', '').replace(',', '');
};

export const formatIranDate = (value?: string | number | Date | null, fallback = '—') => {
  const d = toDate(value);
  if (!d) return fallback;
  return faDateFormatter.format(d);
};

export const formatIranLongDate = (value?: string | number | Date | null, fallback = '—') => {
  const d = toDate(value);
  if (!d) return fallback;
  return faLongDateFormatter.format(d);
};

export const formatIranWeekday = (value?: string | number | Date | null, fallback = '—') => {
  const d = toDate(value);
  if (!d) return fallback;
  return faWeekdayFormatter.format(d);
};

export const formatIranGregorianShortDate = (value?: string | number | Date | null, fallback = '—') => {
  const d = toDate(value);
  if (!d) return fallback;
  return enDateFormatter.format(d);
};

export const getIranDateTimeParts = (value?: string | number | Date | null) => {
  const d = toDate(value) || new Date();
  const parts = Object.fromEntries(tehranPartsFormatter.formatToParts(d).map((part) => [part.type, part.value]));
  const hourRaw = String(parts.hour || '00');
  const hour = Number(hourRaw === '24' ? '00' : hourRaw);
  return {
    year: Number(parts.year || 0),
    month: Number(parts.month || 0),
    day: Number(parts.day || 0),
    hour,
    minute: Number(parts.minute || 0),
    second: Number(parts.second || 0),
  };
};

export const toIranTimeZoneLabel = () => 'Asia/Tehran (+03:30)';
