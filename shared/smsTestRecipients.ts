export const SMS_TEST_RECIPIENT_ALLOWLIST_SETTING_KEY = 'sms_test_recipient_allowlist_json';
export const SMS_TEST_RECIPIENT_MAX_ITEMS = 10;

export type SmsTestRecipient = {
  phone: string;
  label: string;
  enabled: boolean;
};

const normalizeDigits = (value: string): string => String(value || '')
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

export const normalizeSmsTestRecipientPhone = (input: string): string => {
  let digits = normalizeDigits(String(input || '')).replace(/\D/g, '');
  if (digits.startsWith('0098')) digits = digits.slice(4);
  else if (digits.startsWith('98')) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith('9')) digits = `0${digits}`;
  return digits;
};

export const isValidSmsTestRecipientPhone = (input: string): boolean => /^09\d{9}$/.test(normalizeSmsTestRecipientPhone(input));

const sanitizeLabel = (value: unknown, phone: string): string => {
  const label = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  return label || `شماره تست ${phone.slice(-4)}`;
};

export const sanitizeSmsTestRecipients = (value: unknown): SmsTestRecipient[] => {
  const source = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const output: SmsTestRecipient[] = [];
  for (const item of source) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const phone = normalizeSmsTestRecipientPhone(String(row.phone || ''));
    if (!/^09\d{9}$/.test(phone) || seen.has(phone)) continue;
    seen.add(phone);
    output.push({
      phone,
      label: sanitizeLabel(row.label, phone),
      enabled: row.enabled !== false,
    });
    if (output.length >= SMS_TEST_RECIPIENT_MAX_ITEMS) break;
  }
  return output;
};

export const parseSmsTestRecipientAllowlist = (raw: unknown): SmsTestRecipient[] => {
  const text = String(raw || '').trim();
  if (!text) return [];
  try {
    return sanitizeSmsTestRecipients(JSON.parse(text));
  } catch {
    // Compatibility with an early/manual newline or comma-separated list.
    const legacy = text
      .split(/[\n,;]+/)
      .map((phone) => ({ phone: phone.trim(), label: '', enabled: true }));
    return sanitizeSmsTestRecipients(legacy);
  }
};

export const serializeSmsTestRecipientAllowlist = (items: SmsTestRecipient[]): string =>
  JSON.stringify(sanitizeSmsTestRecipients(items));

export const getEnabledSmsTestRecipients = (raw: unknown): SmsTestRecipient[] =>
  parseSmsTestRecipientAllowlist(raw).filter((item) => item.enabled);

export const isSmsTestRecipientAllowed = (raw: unknown, phoneInput: string): boolean => {
  const phone = normalizeSmsTestRecipientPhone(phoneInput);
  return getEnabledSmsTestRecipients(raw).some((item) => item.phone === phone);
};

export type SmsTestRecipientAuthorization =
  | { ok: true; recipient: string; matched: SmsTestRecipient }
  | { ok: false; status: 400 | 403 | 409; code: 'SMS_TEST_RECIPIENT_INVALID' | 'SMS_TEST_RECIPIENT_NOT_ALLOWED' | 'SMS_TEST_ALLOWLIST_EMPTY'; message: string };

export const authorizeSmsTestRecipient = (rawAllowlist: unknown, rawRecipient: unknown): SmsTestRecipientAuthorization => {
  const recipient = normalizeSmsTestRecipientPhone(String(rawRecipient || ''));
  if (!/^09\d{9}$/.test(recipient)) {
    return { ok: false, status: 400, code: 'SMS_TEST_RECIPIENT_INVALID', message: 'شماره گیرنده تست نامعتبر است.' };
  }
  const allowlist = getEnabledSmsTestRecipients(rawAllowlist);
  if (!allowlist.length) {
    return { ok: false, status: 409, code: 'SMS_TEST_ALLOWLIST_EMPTY', message: 'هنوز هیچ شماره فعالی در فهرست مجاز ارسال تست پیامک ثبت نشده است. ابتدا از تنظیمات پیامک یک شماره مجاز اضافه و ذخیره کنید.' };
  }
  const matched = allowlist.find((item) => item.phone === recipient);
  if (!matched) {
    return { ok: false, status: 403, code: 'SMS_TEST_RECIPIENT_NOT_ALLOWED', message: 'ارسال تست فقط به شماره‌های فعالِ فهرست مجاز امکان‌پذیر است.' };
  }
  return { ok: true, recipient, matched };
};
