export type ExactNumberFormatOptions = {
  useGrouping?: boolean;
  persianDigits?: boolean;
  groupSeparator?: string;
  decimalSeparator?: string;
  invalidText?: string;
};

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

const normalizeInputDigits = (value: string): string =>
  value
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[٬,\s\u200c]/g, '')
    .replace(/٫/g, '.');

const expandExponential = (value: string): string => {
  const match = value.match(/^([+-]?)(\d+)(?:\.(\d*))?[eE]([+-]?\d+)$/);
  if (!match) return value;

  const sign = match[1] === '-' ? '-' : '';
  const integer = match[2];
  const fraction = match[3] || '';
  const exponent = Number(match[4]);
  const digits = `${integer}${fraction}`;
  const decimalIndex = integer.length + exponent;

  if (decimalIndex <= 0) {
    return `${sign}0.${'0'.repeat(Math.abs(decimalIndex))}${digits}`;
  }
  if (decimalIndex >= digits.length) {
    return `${sign}${digits}${'0'.repeat(decimalIndex - digits.length)}`;
  }
  return `${sign}${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
};

export const toExactDecimalString = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return '0';

  if (typeof value === 'bigint') return value.toString();

  let raw: string;
  if (typeof value === 'string') {
    raw = normalizeInputDigits(value.trim());
    if (!raw) return '0';
  } else {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    raw = String(Object.is(numeric, -0) ? 0 : numeric);
  }

  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw)) {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return null;
    raw = String(Object.is(numeric, -0) ? 0 : numeric);
  }

  const expanded = expandExponential(raw);
  const sign = expanded.startsWith('-') ? '-' : '';
  const unsigned = expanded.replace(/^[+-]/, '');
  const [integerPartRaw = '0', fractionPartRaw = ''] = unsigned.split('.');
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/, '') || '0';
  const fractionPart = fractionPartRaw.replace(/0+$/, '');
  return `${sign}${integerPart}${fractionPart ? `.${fractionPart}` : ''}`;
};

const translateDigits = (value: string, persianDigits: boolean): string => {
  if (!persianDigits) return value;
  return value.replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
};

/**
 * PERCENT_FORMAT_CONTRACT: this formatter is only for exact counts, identifiers,
 * quantities and monetary numeric parts. Never append %, ٪ or «درصد» to its output.
 * Percentages must use formatReadablePercentText, formatExactPercentText, or the
 * report-specific formatReportPercentText formatter.
 */
export const formatExactNumberText = (
  value: unknown,
  options: ExactNumberFormatOptions = {},
): string => {
  const {
    useGrouping = true,
    persianDigits = true,
    groupSeparator = persianDigits ? '٬' : ',',
    decimalSeparator = persianDigits ? '٫' : '.',
    invalidText = persianDigits ? '۰' : '0',
  } = options;

  const exact = toExactDecimalString(value);
  if (exact === null) return invalidText;

  const sign = exact.startsWith('-') ? '-' : '';
  const unsigned = exact.replace(/^-/, '');
  const [integerPart = '0', fractionPart = ''] = unsigned.split('.');
  const groupedInteger = useGrouping
    ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator)
    : integerPart;
  const formatted = `${sign}${groupedInteger}${fractionPart ? `${decimalSeparator}${fractionPart}` : ''}`;
  return translateDigits(formatted, persianDigits);
};

export const formatExactPercentText = (value: unknown): string => {
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;
  return `\u2068${safeValue.toLocaleString('fa-IR', {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}٪\u2069`;
};

export const formatReadablePercentText = (
  value: unknown,
  maximumFractionDigits = 2,
): string => {
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;
  return `\u2068${safeValue.toLocaleString('fa-IR', {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(0, maximumFractionDigits),
  })}٪\u2069`;
};
