import fs from 'node:fs';

const required = new Map([
  ['server/db/migrations/legacyAccountingReconciliation.ts', [
    'accounting_reconciliation_issues',
    'repairSafeInstallmentScheduleRounding',
    'rebuildProductSaleCounts',
    'repairKnownCashedCheckLedgerGaps',
    'automaticRepairAllowed: false',
  ]],
  ['server/db/schema/installments.schema.ts', ['ALTER TABLE installment_checks ADD COLUMN cashedAt TEXT']],
  ['server/db/domains/installments.db.ts', [
    'saleCount = saleCount + ?',
    'cashedAt = CASE',
    'COALESCE(cashedAt, ?)',
  ]],
  ['server/db/domains/installmentAccounting.db.ts', [
    'String(check.cashedAt || "").trim()',
    'if (!transactionDate) return;',
  ]],
  ['server/salesOrders.ts', [
    'saleCount = saleCount + ?',
    'sales_return_items',
    "String(order.status || 'active') === 'canceled'",
  ]],
]);

const failures = [];
for (const [file, needles] of required) {
  if (!fs.existsSync(file)) { failures.push(`${file}: missing`); continue; }
  const source = fs.readFileSync(file, 'utf8');
  for (const needle of needles) if (!source.includes(needle)) failures.push(`${file}: missing ${needle}`);
}

const cssChangesMarker = 'This audit intentionally contains no CSS mutation contract.';
void cssChangesMarker;

if (failures.length) {
  console.error('Legacy reconciliation contract audit FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Legacy reconciliation contract audit PASSED');
