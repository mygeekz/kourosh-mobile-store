// فایل: utils/dateUtils.ts (کد کامل و نهایی)

import moment from 'jalali-moment';
import { formatIranDate, formatIranDateTime } from './iranDateTime';

/**
 * Converts an ISO or a Shamsi date string to a consistent Shamsi formatted date string.
 * This function is now robust and can handle both ISO ("2023-10-27") and Shamsi ("1402/08/05") inputs.
 * @param dateString The date string to convert.
 * @param format The desired Shamsi output format (default: 'YYYY/MM/DD').
 * @returns The formatted Shamsi date string or a preview if input is invalid.
 */
export const formatIsoToShamsi = (dateString?: string | null, format: string = 'jYYYY/jMM/jDD'): string => {
  if (!dateString) return 'نامشخص';

  const raw = String(dateString).trim();
  if (!raw) return 'نامشخص';

  const normalizedRaw = raw.replace(/\./g, '/');
  if (/T|Z|[+-]\d{2}:?\d{2}$/.test(normalizedRaw)) {
    const formatted = /HH:mm/i.test(format) ? formatIranDateTime(normalizedRaw, '') : formatIranDate(normalizedRaw, '');
    if (formatted) return formatted;
  }
  const numericPrefix = normalizedRaw.match(/^(\d{4})/);
  const year = numericPrefix ? Number(numericPrefix[1]) : null;
  const looksGregorian = Boolean(year && year > 1500 && (/[-/]/.test(normalizedRaw) || /T|Z/.test(normalizedRaw)));
  const parseWith = (input: string, inputFormats: string[], locale: 'en' | 'fa') => {
    for (const inputFormat of inputFormats) {
      const parsed = (moment as any).from
        ? (moment as any).from(input, locale, inputFormat, true)
        : moment(input, inputFormat as any, true);
      if (parsed && typeof parsed.isValid === 'function' && parsed.isValid()) return parsed;
    }
    return null;
  };

  const gregorianInput = normalizedRaw.replace(/\//g, '-');
  const gregorianCandidate = looksGregorian
    ? parseWith(gregorianInput, ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm', 'YYYY-MM-DD', moment.ISO_8601 as any], 'en')
    : null;
  if (gregorianCandidate) return gregorianCandidate.locale('fa').format(format);

  const jalaliCandidate = parseWith(normalizedRaw, ['jYYYY/jMM/jDD HH:mm:ss', 'jYYYY/jMM/jDD HH:mm', 'jYYYY/jMM/jDD'], 'fa')
    || parseWith(normalizedRaw, ['YYYY/MM/DD HH:mm:ss', 'YYYY/MM/DD', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD'], 'en');

  if (jalaliCandidate) return jalaliCandidate.locale('fa').format(format);

  const fallback = moment(normalizedRaw, moment.ISO_8601, true);
  return fallback.isValid() ? fallback.locale('fa').format(format) : 'تاریخ نامعتبر';
};

/**
 * Converts an ISO date string to a Shamsi formatted date-time string.
 * Midnight timestamps (00:00) are rendered as date-only to avoid noisy UI.
 * @param isoDateString The ISO date string (e.g., "2023-10-27T10:30:00.000Z").
 * @param format The desired Shamsi format string (default: 'YYYY/MM/DD HH:mm').
 * @returns The formatted Shamsi date-time string or a preview if input is invalid.
 */
export const formatIsoToShamsiDateTime = (isoDateString?: string | null, format: string = 'jYYYY/jMM/jDD HH:mm'): string => {
  if (!isoDateString) return 'نامشخص';

  const raw = String(isoDateString).trim();
  if (!raw) return 'نامشخص';

  if (/T|Z|[+-]\d{2}:?\d{2}$/.test(raw)) {
    const formatted = /HH:mm/i.test(format) ? formatIranDateTime(raw, '') : formatIranDate(raw, '');
    if (formatted) return formatted;
  }

  const candidates = [
    moment(raw, moment.ISO_8601, true),
    moment(raw, 'YYYY-MM-DD HH:mm:ss', true),
    moment(raw, 'YYYY-MM-DD', true),
    moment(raw, 'YYYY/MM/DD HH:mm:ss', true),
    moment(raw, 'YYYY/MM/DD', true),
    moment(raw, 'jYYYY/jMM/jDD HH:mm:ss', true),
    moment(raw, 'jYYYY/jMM/jDD HH:mm', true),
    moment(raw, 'jYYYY/jMM/jDD', true),
  ];

  const m = candidates.find((candidate) => candidate.isValid()) || moment.invalid();
  if (!m.isValid()) return 'تاریخ نامعتبر';

  const rendered = m.locale('fa').format(format);
  const timeIsMidnight = m.format('HH:mm') === '00:00';
  const formatIncludesTime = /HH:mm/i.test(format);

  if (timeIsMidnight && formatIncludesTime) {
    const dateOnly = rendered
      .replace(/\s*[-–—|/:،,]?\s*00:00\s*$/, '')
      .replace(/\s*00:00\s*$/, '')
      .trim();
    return dateOnly || m.locale('fa').format('jYYYY/jMM/jDD');
  }

  return rendered;
};
