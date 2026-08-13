import moment from "jalali-moment";

const DIGIT_MAP: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

const normalizeDateDigits = (input: unknown): string =>
  String(input ?? "")
    .trim()
    .replace(/[۰-۹٠-٩]/g, (digit) => DIGIT_MAP[digit] ?? digit)
    .replace(/[\u200c\u200d\u2060\ufeff]/g, "");

const sanitizeJalaliDate = (input: string): string => {
  const clean = normalizeDateDigits(input)
    .replace(/-/g, "/")
    .replace(/\bA\.?P\.?\b/gi, "")
    .replace(/\bAM\b|\bPM\b/gi, "")
    .replace(/[^0-9/]/g, "")
    .replace(/\/+$/g, "")
    .replace(/^\/+/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (c.length === 4 && Number(c) >= 1200)
      return `${c}/${a.padStart(2, "0")}/${b.padStart(2, "0")}`;
    if (a.length === 4)
      return `${a}/${b.padStart(2, "0")}/${c.padStart(2, "0")}`;
  }
  return clean.replace(/\s+/g, "");
};

const normalizeGregorianDatePrefix = (input: unknown): string | null => {
  if (input instanceof Date) {
    if (!Number.isFinite(input.getTime())) return null;
    return input.toISOString().slice(0, 10);
  }

  const raw = normalizeDateDigits(input);
  if (!raw) return null;

  // Supports YYYY-MM-DD, YYYY/MM/DD, ISO timestamps, and SQLite datetimes.
  const match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?=$|[T\s])/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Keep Jalali-looking years out of the Gregorian branch.
  if (year < 1700 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31)
    return null;

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const fromShamsiStringToISO = (
  shamsiDateString?: string | null,
): string | undefined => {
  if (
    !shamsiDateString ||
    typeof shamsiDateString !== "string" ||
    shamsiDateString.trim() === ""
  )
    return undefined;

  const clean = sanitizeJalaliDate(shamsiDateString);
  if (!clean) return undefined;

  // sanitizeJalaliDate always returns a canonical jYYYY/jMM/jDD shape when possible,
  // so a single strict format is enough. Avoid jalali-moment's array-format path,
  // which can return undefined when none of the candidates are valid.
  const parsed = moment(clean, "jYYYY/jMM/jDD", true);
  if (!parsed || typeof parsed.isValid !== "function" || !parsed.isValid())
    return undefined;

  const localized = parsed.locale("en");
  return localized && typeof localized.format === "function"
    ? localized.format("YYYY-MM-DD")
    : undefined;
};

/**
 * Canonical accounting-date normalizer for installment contracts.
 *
 * Accepted, without guessing:
 * - Jalali: jYYYY/jM/jD (Persian/Arabic digits are normalized)
 * - Gregorian: YYYY-MM-DD or YYYY/MM/DD
 * - ISO / SQLite datetime values whose leading date is Gregorian
 *
 * Returns only YYYY-MM-DD or null. Invalid values never throw.
 */
export const normalizeInstallmentAccountingDate = (
  saleDate: unknown,
  fallbackDate?: unknown,
): string | null => {
  for (const candidate of [saleDate, fallbackDate]) {
    if (candidate == null || String(candidate).trim() === "") continue;

    const gregorian = normalizeGregorianDatePrefix(candidate);
    if (gregorian) return gregorian;

    const jalali = fromShamsiStringToISO(normalizeDateDigits(candidate));
    if (jalali) return jalali;
  }

  return null;
};
