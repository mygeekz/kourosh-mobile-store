import { formatExactNumberText, formatExactPercentText } from '../../../utils/exactNumber';
export const nf = { format: (value: unknown) => formatExactNumberText(value) };
export const pct = { format: (value: unknown) => formatExactPercentText(Number(value || 0) * 100) };

export const formatMetric = (value: unknown, basis?: string | null) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  if (String(basis || '').includes('inverse')) return formatExactNumberText(numeric);
  if (numeric >= 0 && numeric <= 1) return pct.format(numeric);
  return formatExactNumberText(numeric);
};

export const formatValue = (value: unknown) => {
  if (typeof value === 'boolean') return value ? 'فعال' : 'غیرفعال';
  if (typeof value === 'number') return formatExactNumberText(value);
  const text = String(value ?? '').trim();
  return text || '—';
};

export const labelStatus = (value?: string | null) => {
  const text = String(value || '').trim();
  if (!text) return '—';
  if (text.includes('empty')) return 'در انتظار متادیتا';
  if (text.includes('safe')) return 'ایمن';
  if (text.includes('available')) return 'موجود';
  if (text.includes('ready')) return 'آماده بررسی';
  if (text.includes('warning')) return 'نیازمند بررسی';
  if (text.includes('rejected') || text.includes('block')) return 'مسدود';
  if (text === 'pass') return 'ایمن';
  return text;
};
