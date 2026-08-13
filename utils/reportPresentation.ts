import {
  formatCurrencyText,
  getCurrencyUnitLabel,
  normalizeCurrencyUnit,
  readStoredCurrencyUnit,
  type CurrencyUnit,
} from './currency';
import { formatExactNumberText } from './exactNumber';

export const REPORT_MONEY_RESOLUTION_TOMAN = 1;

const finiteNumber = (value: unknown): number => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const roundReportMoney = (
  value: unknown,
  resolution = REPORT_MONEY_RESOLUTION_TOMAN,
): number => {
  const numeric = finiteNumber(value);
  const safeResolution = Math.max(1, Math.abs(finiteNumber(resolution)) || 1);
  return Math.sign(numeric) * Math.round(Math.abs(numeric) / safeResolution) * safeResolution;
};

/**
 * Manager/report surfaces preserve the exact stored Toman amount. No display-level
 * thousand rounding is allowed because every report must reconcile with its source document.
 */
export const formatReportMoneyText = (
  value: unknown,
  unit: CurrencyUnit = readStoredCurrencyUnit(),
): string => {
  const normalizedUnit = normalizeCurrencyUnit(unit);
  const label = getCurrencyUnitLabel(normalizedUnit);
  const formatted = formatCurrencyText(roundReportMoney(value), normalizedUnit);
  const numericPart = formatted.replace(new RegExp(`\\s*${label}$`), '').trim();
  return `\u2068${numericPart}\u2069 ${label}`;
};

export const formatReportMoneyPreview = (
  value: unknown,
  unit: CurrencyUnit = readStoredCurrencyUnit(),
): string => {
  const label = getCurrencyUnitLabel(unit);
  return formatReportMoneyText(value, unit).replace(new RegExp(`\\s*${label}$`), '');
};

export const clampReportPercent = (value: unknown): number =>
  Math.max(0, Math.min(100, finiteNumber(value)));

export const formatReportPercentText = (
  value: unknown,
  maximumFractionDigits = 2,
  clamp = true,
): string => {
  const numeric = clamp ? clampReportPercent(value) : finiteNumber(value);
  const formatted = numeric.toLocaleString('fa-IR', {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(0, maximumFractionDigits),
  });
  return `\u2068${formatted}٪\u2069`;
};

export const formatReportRatioText = (
  value: unknown,
  maximumFractionDigits = 2,
): string => {
  const numeric = finiteNumber(value);
  const formatted = numeric.toLocaleString('fa-IR', {
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(0, maximumFractionDigits),
  });
  return `\u2068${formatted}\u2069`;
};

export const formatReportDaysText = (
  value: unknown,
  maximumFractionDigits = 1,
): string => `${formatReportRatioText(value, maximumFractionDigits)} روز`;

export const formatReportCountText = (value: unknown): string =>
  formatExactNumberText(Math.trunc(finiteNumber(value)));
