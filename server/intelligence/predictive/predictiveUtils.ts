import moment from "jalali-moment";
import { fromShamsiStringToISO } from "../../database";
import type { PredictiveQuery } from "./predictiveTypes";

export const predictiveNum = (v: any): number =>
  Number.isFinite(Number(v)) ? Number(v) : 0;

export const roundOneDecimal = (value: number): number => predictiveNum(value);

export const resolvePredictiveDateRange = (query: PredictiveQuery) => {
  const nowJ = moment().locale("fa");
  const fromJ = String(
    query.fromDate ||
      query.from ||
      nowJ.clone().startOf("jMonth").format("jYYYY/jMM/jDD"),
  );
  const toJ = String(
    query.toDate || query.to || nowJ.clone().format("jYYYY/jMM/jDD"),
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
    isValid,
  };
};
