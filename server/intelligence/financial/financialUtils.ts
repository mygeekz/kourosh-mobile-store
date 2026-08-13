import { formatExactNumberText } from "../../../utils/exactNumber";
import moment from "jalali-moment";
import { fromShamsiStringToISO } from "../../database";
import type { FinancialBrainQuery } from "./financialTypes";

export const FINANCIAL_REPORT_CURRENCY_CONTRACT = {
  currencyBase: "TOMAN",
  displayCurrency: "تومان",
  moneyDivisor: 1,
} as const;

export const financialBrainNum = (value: any): number =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

export const formatFinancialBrainMoneyText = (value: any): string => {
  const n = Number(value || 0);
  const toman = Number.isFinite(n)
    ? n / FINANCIAL_REPORT_CURRENCY_CONTRACT.moneyDivisor
    : 0;
  return `${formatExactNumberText(toman)} ${FINANCIAL_REPORT_CURRENCY_CONTRACT.displayCurrency}`;
};

export const resolveFinancialBrainDateRange = (query: FinancialBrainQuery) => {
  const nowJ = moment().locale("fa");
  const fromJ = String(
    query.fromDate ||
      query.from ||
      nowJ.clone().startOf("jMonth").format("jYYYY/jMM/jDD"),
  );
  const toJ = String(
    query.toDate ||
      query.to ||
      nowJ.clone().format("jYYYY/jMM/jDD"),
  );
  const fromISO =
    fromShamsiStringToISO(fromJ) ||
    moment(fromJ, ["YYYY-MM-DD", "YYYY/MM/DD"], true).format("YYYY-MM-DD");
  const toISO =
    fromShamsiStringToISO(toJ) ||
    moment(toJ, ["YYYY-MM-DD", "YYYY/MM/DD"], true).format("YYYY-MM-DD");
  const isValid =
    Boolean(fromISO) &&
    Boolean(toISO) &&
    moment(fromISO, "YYYY-MM-DD", true).isValid() &&
    moment(toISO, "YYYY-MM-DD", true).isValid();

  return {
    fromJ,
    toJ,
    fromISO,
    toISO,
    start: fromISO <= toISO ? fromISO : toISO,
    end: fromISO <= toISO ? toISO : fromISO,
    isValid,
  };
};
