export type FormValidationErrors = Record<string, string>;

export const FORM_VALIDATION_MESSAGES = {
  required: (label: string) => `${label} الزامی است.`,
  selectRequired: (label: string) => `${label} را انتخاب کنید.`,
  invalidNumber: (label: string) => `${label} باید عدد معتبر باشد.`,
  nonNegativeNumber: (label: string) => `${label} نمی‌تواند منفی باشد.`,
  positiveNumber: (label: string) => `${label} باید عددی مثبت باشد.`,
  positiveInteger: (label: string) => `${label} باید عدد صحیح مثبت باشد.`,
  exactDigits: (label: string, length: number) => `${label} باید دقیقاً ${length.toLocaleString('fa-IR')} رقم باشد.`,
  invalidPhone: 'شماره موبایل معتبر نیست.',
  invalidNationalCode: 'کد ملی معتبر نیست.',
  invalidEmail: 'ایمیل معتبر نیست.',
  minLength: (label: string, length: number) => `${label} باید حداقل ${length.toLocaleString('fa-IR')} کاراکتر باشد.`,
  maxLength: (label: string, length: number) => `${label} حداکثر می‌تواند ${length.toLocaleString('fa-IR')} کاراکتر باشد.`,
  mismatch: (label: string) => `${label} با مقدار اصلی یکسان نیست.`,
} as const;

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export const normalizeValidationDigits = (value: unknown) => String(value ?? '')
  .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));

export const normalizeValidationNumber = (value: unknown) => normalizeValidationDigits(value)
  .replace(/[,،\s]/g, '')
  .trim();

export const isBlankValue = (value: unknown) => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  return false;
};

export const requiredTextError = (value: unknown, label: string) => (
  isBlankValue(value) ? FORM_VALIDATION_MESSAGES.required(label) : undefined
);

export const requiredSelectionError = (value: unknown, label: string) => (
  value == null || value === '' || value === false
    ? FORM_VALIDATION_MESSAGES.selectRequired(label)
    : undefined
);

export const nonNegativeNumberError = (
  value: unknown,
  label: string,
  options: { optional?: boolean; integer?: boolean } = {},
) => {
  const raw = normalizeValidationNumber(value);
  if (!raw) return options.optional ? undefined : FORM_VALIDATION_MESSAGES.required(label);
  const numericValue = Number(raw);
  if (!Number.isFinite(numericValue)) return FORM_VALIDATION_MESSAGES.invalidNumber(label);
  if (numericValue < 0) return FORM_VALIDATION_MESSAGES.nonNegativeNumber(label);
  if (options.integer && !Number.isInteger(numericValue)) return `${label} باید عدد صحیح و غیرمنفی باشد.`;
  return undefined;
};

export const positiveNumberError = (
  value: unknown,
  label: string,
  options: { optional?: boolean; integer?: boolean } = {},
) => {
  const raw = normalizeValidationNumber(value);
  if (!raw) return options.optional ? undefined : FORM_VALIDATION_MESSAGES.required(label);
  const numericValue = Number(raw);
  if (!Number.isFinite(numericValue)) return FORM_VALIDATION_MESSAGES.invalidNumber(label);
  if (numericValue <= 0) return options.integer
    ? FORM_VALIDATION_MESSAGES.positiveInteger(label)
    : FORM_VALIDATION_MESSAGES.positiveNumber(label);
  if (options.integer && !Number.isInteger(numericValue)) return FORM_VALIDATION_MESSAGES.positiveInteger(label);
  return undefined;
};


export const textLengthError = (
  value: unknown,
  label: string,
  options: { optional?: boolean; min?: number; max?: number } = {},
) => {
  const { optional = false, min, max } = options;
  const raw = String(value ?? '');
  if (!raw.trim()) return optional ? undefined : FORM_VALIDATION_MESSAGES.required(label);
  const length = Array.from(raw).length;
  if (typeof min === 'number' && length < min) return FORM_VALIDATION_MESSAGES.minLength(label, min);
  if (typeof max === 'number' && length > max) return FORM_VALIDATION_MESSAGES.maxLength(label, max);
  return undefined;
};

export const matchingTextError = (
  value: unknown,
  expectedValue: unknown,
  label: string,
  options: { optional?: boolean; message?: string } = {},
) => {
  const { optional = false, message } = options;
  const raw = String(value ?? '');
  const expected = String(expectedValue ?? '');
  if (!raw && optional) return undefined;
  if (!raw) return FORM_VALIDATION_MESSAGES.required(label);
  return raw === expected ? undefined : (message || FORM_VALIDATION_MESSAGES.mismatch(label));
};

export const phoneNumberError = (
  value: unknown,
  options: { optional?: boolean; label?: string; minDigits?: number; maxDigits?: number } = {},
) => {
  const { optional = true, label = 'شماره تماس', minDigits = 10, maxDigits = 15 } = options;
  const raw = normalizeValidationDigits(value).replace(/[^0-9]/g, '');
  if (!raw) return optional ? undefined : FORM_VALIDATION_MESSAGES.required(label);
  if (raw.length < minDigits || raw.length > maxDigits) {
    return `${label} نامعتبر است (باید ${minDigits.toLocaleString('fa-IR')} تا ${maxDigits.toLocaleString('fa-IR')} رقم باشد).`;
  }
  return undefined;
};

export const emailAddressError = (
  value: unknown,
  options: { optional?: boolean; label?: string } = {},
) => {
  const { optional = true, label = 'ایمیل' } = options;
  const raw = String(value ?? '').trim();
  if (!raw) return optional ? undefined : FORM_VALIDATION_MESSAGES.required(label);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? undefined : `${label} نامعتبر است.`;
};

export const exactDigitsError = (
  value: unknown,
  label: string,
  length: number,
  options: { optional?: boolean } = {},
) => {
  const raw = normalizeValidationDigits(value).replace(/\D/g, '');
  if (!raw) return options.optional ? undefined : FORM_VALIDATION_MESSAGES.required(label);
  return raw.length === length ? undefined : FORM_VALIDATION_MESSAGES.exactDigits(label, length);
};


export const integerRangeError = (
  value: unknown,
  label: string,
  min: number,
  max: number,
  options: { optional?: boolean } = {},
) => {
  const raw = normalizeValidationNumber(value);
  if (!raw) return options.optional ? undefined : FORM_VALIDATION_MESSAGES.required(label);
  const numericValue = Number(raw);
  if (!Number.isInteger(numericValue) || numericValue < min || numericValue > max) {
    return `${label} باید عدد صحیح بین ${min.toLocaleString('fa-IR')} تا ${max.toLocaleString('fa-IR')} باشد.`;
  }
  return undefined;
};

export const urlAddressError = (
  value: unknown,
  options: { optional?: boolean; label?: string; protocols?: readonly string[] } = {},
) => {
  const { optional = true, label = 'نشانی', protocols = ['https:'] } = options;
  const raw = String(value ?? '').trim();
  if (!raw) return optional ? undefined : FORM_VALIDATION_MESSAGES.required(label);
  try {
    const parsed = new URL(raw);
    return protocols.includes(parsed.protocol) ? undefined : `${label} باید با ${protocols.map((item) => item.replace(':', '')).join(' یا ')} شروع شود.`;
  } catch {
    return `${label} معتبر نیست.`;
  }
};

export const compactValidationErrors = (errors: Record<string, string | undefined | null | false>): FormValidationErrors => (
  Object.fromEntries(
    Object.entries(errors).filter(([, message]) => Boolean(message)),
  ) as FormValidationErrors
);

export const hasValidationErrors = (errors: Record<string, unknown>) => (
  Object.values(errors || {}).some(Boolean)
);
