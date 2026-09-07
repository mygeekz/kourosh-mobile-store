import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const fail = (message) => {
  console.error(`[installment-accounting-date-contract] FAIL: ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`[installment-accounting-date-contract] PASS: ${message}`);

const date = read("server/db/date.ts");
const accounting = read("server/db/domains/installmentAccounting.db.ts");
const schema = read("server/db/schema/installments.schema.ts");
const installments = read("server/db/domains/installments.db.ts");
const validators = read("server/validators.ts");
const legacy = read("server/db/migrations/legacyAccountingReconciliation.ts");

const checks = [
  [date.includes("export const normalizeInstallmentAccountingDate"), "central accounting-date normalizer exists in server/db/date.ts"],
  [date.includes('moment(clean, "jYYYY/jMM/jDD", true)'), "Jalali parsing uses one canonical strict format"],
  [!date.includes('moment(clean, ["jYYYY/jMM/jDD"'), "date utility avoids jalali-moment array-format parsing"],
  [date.includes("normalizeGregorianDatePrefix"), "Gregorian/ISO/SQLite date prefix normalization is centralized"],
  [accounting.includes('import { normalizeInstallmentAccountingDate } from "../date"'), "runtime installment accounting consumes central normalizer"],
  [accounting.includes('export { normalizeInstallmentAccountingDate } from "../date"'), "existing domain export remains backward compatible"],
  [!accounting.includes('moment(receiptIsoDate, ["YYYY-MM-DD"'), "receipt validation avoids array-format parsing"],
  [schema.includes('import { normalizeInstallmentAccountingDate } from "../date"'), "schema backfill consumes central normalizer"],
  [!schema.includes('await import("jalali-moment")'), "schema no longer maintains its own Jalali parser"],
  [schema.includes("normalizeInstallmentAccountingDate(\n        row?.saleDate,\n        row?.dateCreated"), "backfill uses saleDate then dateCreated fallback"],
  [!schema.includes("row?.saleDate || row?.dateCreated || row?.installmentsStartDate"), "backfill never guesses sale date from installmentsStartDate"],
  [installments.includes('import { fromShamsiStringToISO } from "../date"'), "installment creation uses shared Jalali converter"],
  [!installments.includes('moment(raw, ["jYYYY/jMM/jDD"'), "installment creation avoids array-format parsing"],
  [validators.includes("fromShamsiStringToISO"), "API installment validator uses shared Jalali converter"],
  [!validators.includes("moment(raw, ['jYYYY/jMM/jDD'"), "API installment validator avoids array-format parsing"],
  [legacy.includes('import { fromShamsiStringToISO } from "../date"'), "legacy reconciliation uses shared Jalali converter"],
  [!legacy.includes('moment(String(row.saleDate), ["jYYYY/jMM/jDD"'), "legacy reconciliation avoids array-format parsing"],
];

for (const [ok, label] of checks) {
  if (ok) pass(label);
  else fail(label);
}

if (!process.exitCode) {
  console.log(`[installment-accounting-date-contract] ${checks.length}/${checks.length} checks passed.`);
}
