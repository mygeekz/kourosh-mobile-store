import moment from 'jalali-moment';

const normalizeDateDigits = (value: unknown) => String(value ?? '')
  .replace(/[۰-۹]/g, (d) => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)] || d)
  .replace(/[٠-٩]/g, (d) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)] || d)
  .replace(/٬/g, ',')
  .trim();

const isMomentLike = (value: any) => Boolean(value && typeof value === 'object' && typeof value.isValid === 'function' && typeof value.format === 'function');

const getMoment = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;

  if (isMomentLike(value)) return value;

  if (value instanceof Date) return moment(value);

  const raw = normalizeDateDigits(value);
  if (!raw) return null;

  const knownFormats = [
    moment.ISO_8601,
    'YYYY-MM-DDTHH:mm:ss.SSSZ',
    'YYYY-MM-DDTHH:mm:ssZ',
    'YYYY-MM-DD HH:mm:ss',
    'YYYY-MM-DD HH:mm',
    'YYYY-MM-DD',
    'YYYY/MM/DD HH:mm:ss',
    'YYYY/MM/DD HH:mm',
    'YYYY/MM/DD',
    'jYYYY/jMM/jDD HH:mm:ss',
    'jYYYY/jMM/jDD HH:mm',
    'jYYYY/jMM/jDD',
    'jYYYY-jMM-jDD HH:mm:ss',
    'jYYYY-jMM-jDD HH:mm',
    'jYYYY-jMM-jDD',
    'jYYYY/jM/jD',
    'jYYYY-jM-jD',
  ];

  const strictMoment = moment(raw, knownFormats, true);
  if (strictMoment && typeof strictMoment.isValid === 'function' && strictMoment.isValid()) return strictMoment;

  const looseMoment = moment(raw);
  if (looseMoment && typeof looseMoment.isValid === 'function' && looseMoment.isValid()) return looseMoment;

  return null;
};

export const formatShamsiDate = (value?: unknown, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = getMoment(value);
  if (!parsed) return String(value || fallback);
  try {
    return parsed.locale('fa').format('jYYYY/jMM/jDD');
  } catch {
    return String(value || fallback);
  }
};

export const formatShamsiDateTime = (value?: unknown, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = getMoment(value);
  if (!parsed) return String(value || fallback);
  try {
    return parsed.locale('fa').format('jYYYY/jMM/jDD HH:mm');
  } catch {
    return String(value || fallback);
  }
};

export const formatShamsiMonth = (value?: unknown, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = getMoment(value);
  if (!parsed) return String(value || fallback);
  try {
    return parsed.locale('fa').format('jYYYY/jMM');
  } catch {
    return String(value || fallback);
  }
};

export const toShamsiInputValue = (date: Date | null | undefined) => date ? formatShamsiDate(date, '') : '';

export default formatShamsiDate;
