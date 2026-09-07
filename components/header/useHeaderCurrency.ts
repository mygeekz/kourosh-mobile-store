import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  getCurrencyUnitLabel,
  readStoredCurrencyUnit,
  writeStoredCurrencyUnit,
  type CurrencyUnit,
} from '../../utils/currency';
import { formatReportMoneyPreview, formatReportMoneyText } from '../../utils/reportPresentation';


type UseHeaderCurrencyResult = {
  headerCurrencyUnit: CurrencyUnit;
  setHeaderCurrencyUnit: Dispatch<SetStateAction<CurrencyUnit>>;
  headerCurrencyLabel: ReturnType<typeof getCurrencyUnitLabel>;
  formatMoney: (value: number | undefined | null) => string;
  formatMoneyPreview: (value: number | undefined | null) => string;
};

export const useHeaderCurrency = (): UseHeaderCurrencyResult => {
  const [headerCurrencyUnit, setHeaderCurrencyUnit] = useState<CurrencyUnit>(() => readStoredCurrencyUnit());

  useEffect(() => {
    writeStoredCurrencyUnit(headerCurrencyUnit);
  }, [headerCurrencyUnit]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const sync = (event: Event) => {
      const detail = (event as CustomEvent<CurrencyUnit>).detail;
      setHeaderCurrencyUnit(readStoredCurrencyUnit() || detail || 'toman');
    };

    window.addEventListener('kourosh:currency-unit-updated', sync as EventListener);
    return () => window.removeEventListener('kourosh:currency-unit-updated', sync as EventListener);
  }, []);

  const headerCurrencyLabel = useMemo(() => getCurrencyUnitLabel(headerCurrencyUnit), [headerCurrencyUnit]);

  const formatMoney = useCallback(
    (value: number | undefined | null) => formatReportMoneyText(value || 0, headerCurrencyUnit),
    [headerCurrencyUnit],
  );

  const formatMoneyPreview = useCallback(
    (value: number | undefined | null) => formatReportMoneyPreview(value || 0, headerCurrencyUnit),
    [headerCurrencyUnit],
  );

  return {
    headerCurrencyUnit,
    setHeaderCurrencyUnit,
    headerCurrencyLabel,
    formatMoney,
    formatMoneyPreview,
  };
};
