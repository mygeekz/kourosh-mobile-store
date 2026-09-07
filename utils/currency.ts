import { formatExactNumberText } from './exactNumber';

export type CurrencyUnit = 'toman' | 'rial';

export const CURRENCY_UNIT_STORAGE_KEY = 'kourosh.currency-unit.v1';

export const normalizeCurrencyUnit = (value: unknown): CurrencyUnit =>
  String(value || '').trim().toLowerCase() === 'rial' ? 'rial' : 'toman';

export const getCurrencyUnitLabel = (unit?: unknown): 'تومان' | 'ریال' =>
  normalizeCurrencyUnit(unit) === 'rial' ? 'ریال' : 'تومان';

export const convertAmountForDisplay = (amount: unknown, unit?: unknown): number => {
  const numeric = Number(amount || 0);
  if (!Number.isFinite(numeric)) return 0;
  return normalizeCurrencyUnit(unit) === 'rial' ? numeric * 10 : numeric;
};

export const formatCurrencyText = (amount: unknown, unit?: unknown): string => {
  const normalized = normalizeCurrencyUnit(unit);
  const displayAmount = convertAmountForDisplay(amount, normalized);
  return `${formatExactNumberText(displayAmount)} ${getCurrencyUnitLabel(normalized)}`;
};

export const readStoredCurrencyUnit = (): CurrencyUnit => {
  if (typeof window === 'undefined') return 'toman';
  try {
    return normalizeCurrencyUnit(window.localStorage.getItem(CURRENCY_UNIT_STORAGE_KEY));
  } catch {
    return 'toman';
  }
};

export const writeStoredCurrencyUnit = (unit: unknown) => {
  if (typeof window === 'undefined') return normalizeCurrencyUnit(unit);
  const normalized = normalizeCurrencyUnit(unit);
  try {
    window.localStorage.setItem(CURRENCY_UNIT_STORAGE_KEY, normalized);
  } catch {
    // ignore storage failures
  }
  try {
    window.dispatchEvent(new CustomEvent('kourosh:currency-unit-updated', { detail: normalized }));
  } catch {
    // ignore event failures
  }
  return normalized;
};
