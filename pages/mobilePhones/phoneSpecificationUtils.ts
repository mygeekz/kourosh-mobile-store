const normalizeDigits = (value: unknown): string => String(value ?? '')
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .trim();

export const isFactoryNewPhoneCondition = (value: unknown): boolean => {
  const normalized = String(value ?? '').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').trim();
  return /(?:^|\s)(?:نو|آکبند|پلمپ)(?:\s|$)/.test(normalized) && !/در حد نو/.test(normalized);
};

export const normalizePhoneStorageLabel = (value: unknown): string => {
  const raw = normalizeDigits(value).toLowerCase().replace(/\s+/g, '');
  if (!raw) return '';
  const amount = Number.parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return normalizeDigits(value);
  const capacityGb = /tb|ترابایت/.test(raw) ? Math.round(amount * 1024) : Math.round(amount);
  return capacityGb === 1024 ? '1 TB' : `${capacityGb} GB`;
};

export const normalizePhoneRamLabel = (value: unknown): string => {
  const raw = normalizeDigits(value);
  if (!raw) return '';
  const amount = Number.parseFloat(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(amount) && amount > 0 ? `${amount} GB` : raw;
};

export const normalizePhoneBatteryForCondition = (condition: unknown, batteryHealth: number | null): number | null =>
  isFactoryNewPhoneCondition(condition) ? 100 : batteryHealth;
