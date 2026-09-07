import { useMemo } from 'react';
import { formatReportMoneyText } from '../../../utils/reportPresentation';
import { formatExactPercentText } from '../../../utils/exactNumber';
import { formatShamsiDate } from '../../../utils/shamsiDate';
import type {
  LocalizedNumberParser,
  MoneyFormatter,
  NumberFormatter,
  PercentFormatter,
  PricingMoneyFormatter,
  ShamsiFormatter,
  SmartInsightPayload,
} from '../types/smartInsightContracts';

type CurrencyContract = {
  base: string;
  displayCurrency: string;
  divisor: number;
};

type SmartInsightFormatters = {
  currencyContract: CurrencyContract;
  num: NumberFormatter;
  money: MoneyFormatter;
  pricingMoneyToman: PricingMoneyFormatter;
  percent: PercentFormatter;
  shamsi: ShamsiFormatter;
  parseLocalizedNumber: LocalizedNumberParser;
};

const normalizeDigits = (value: unknown) => String(value ?? '')
  .replace(/[۰-۹]/g, (digit) => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)])
  .replace(/[٠-٩]/g, (digit) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(digit)])
  .replace(/٬/g, '')
  .replace(/,/g, '')
  .replace(/٫/g, '.');

const parseLocalizedNumber: LocalizedNumberParser = (value: unknown) => {
  const normalized = normalizeDigits(value);
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) || 0 : 0;
};

const num: NumberFormatter = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

const smartInsightCurrencyContract = (payload?: SmartInsightPayload | null): CurrencyContract => {
  const base = String(payload?.currencyBase || 'TOMAN').toUpperCase();
  const displayCurrency = String(payload?.displayCurrency || 'تومان');
  const divisor = Number.isFinite(Number(payload?.moneyDivisor))
    ? Math.max(1, Number(payload?.moneyDivisor))
    : 1;
  return { base, displayCurrency, divisor };
};

export default function useSmartInsightFormatters(payload: SmartInsightPayload): SmartInsightFormatters {
  return useMemo(() => {
    const currencyContract = smartInsightCurrencyContract(payload);
    const money: MoneyFormatter = (value: unknown) => formatReportMoneyText(
      num(value) / currencyContract.divisor,
      'toman',
    );
    const percent: PercentFormatter = (value: unknown) => formatExactPercentText(num(value));

    return {
      currencyContract,
      num,
      money,
      pricingMoneyToman: money,
      percent,
      shamsi: formatShamsiDate,
      parseLocalizedNumber,
    };
  }, [payload]);
}
