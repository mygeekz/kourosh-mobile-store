import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(); const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const version=read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber=Number(version.replace(/^v/,''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 339,`KOUROSH_SOURCE_VERSION must be v339 or successor; found ${version}`);
const core=read('shared/accounting/accountingCore.ts');
const engine=read('server/accounting/accountingEngine.ts');
const calc=read('server/calculations.ts');
const inst=read('server/db/domains/installmentAccounting.db.ts');
const profit=read('server/db/domains/profitSnapshots.db.ts');
const governance=read('server/accounting/accountingGovernance.ts');
const partnerReads=read('server/repositories/partnerReads.repo.ts');
const customerLedger=read('server/repositories/customerLedgerReads.repo.ts');
const debtorReport=read('server/db/domains/reports/debtorCreditorReports.db.ts');
const partnerReport=read('server/db/domains/reports/partnerBusinessReports.db.ts');
const partnerSettlement=read('server/services/partnerSettlementAtomicSubmitService.ts');
const customerModal=read('pages/customerDetail/CustomerLedgerPaymentModal.tsx');
const partnerModal=read('pages/partnerDetail/PartnerLedgerPaymentModal.tsx');
const pkg=JSON.parse(read('package.json'));

for (const fn of ['accountingMovementDelta','calculateAccountingBalanceFromMovements','previewAccountingBalanceAfterMovement','calculateInstallmentContractAccountingState','calculateSalesAccountingSummary','calculateSaleProfitAccountingState','allocateAccountingAmountByShares']) {
  assert.ok(core.includes(`export const ${fn}`), `shared accounting core must own ${fn}`);
}
assert.match(engine,/accountingLedgerDeltaSql/,'server engine must own the canonical SQL movement expression');
assert.match(engine,/accountingLedgerBalanceSumSql/,'server engine must own the canonical SQL balance aggregate');
assert.match(calc,/return calculateSalesAccountingSummary\(/,'sales summary helper must delegate to accounting core');
assert.match(calc,/calculateInstallmentContractAccountingState/,'installment total helper must delegate to accounting core');
assert.match(calc,/calculateAccountingBalanceFromMovements\("partner"/,'partner snapshot helper must use canonical movement rules');
assert.match(inst,/calculateInstallmentContractAccountingState/,'installment receivable state must use the canonical contract formula');
assert.match(profit,/calculateSaleProfitAccountingState/,'profit snapshot persistence must use canonical profit math');
assert.match(profit,/allocateAccountingAmountByShares/,'capital/profit allocations must use canonical allocation math');
assert.match(governance,/accountingMovementDelta/,'accounting governance drilldown must use canonical ledger direction');
assert.match(governance,/accountingLedgerBalanceSumSql/,'historical governance totals must use canonical SQL balance expressions');
assert.match(partnerReads,/accountingLedgerDeltaSql/,'partner directory/read model must consume engine SQL expressions');
assert.match(customerLedger,/accountingLedgerBalanceSumSql/,'customer ledger summary must consume engine SQL expressions');
assert.match(debtorReport,/accountingLedgerDeltaSql/,'creditor report must consume canonical partner direction');
assert.match(partnerReport,/accountingLedgerDeltaSql/,'partner business report must consume canonical partner direction');
assert.match(partnerSettlement,/accountingMovementDelta/,'settlement running balance must consume canonical partner movement');
for (const [name,text] of [['customer modal',customerModal],['partner modal',partnerModal]]) {
  assert.match(text,/previewAccountingBalanceAfterMovement/, `${name} must consume shared preview math`);
  assert.doesNotMatch(text,/currentBalance\s*[+-]\s*enteredAmount|enteredAmount\s*[+-]\s*currentBalance/,`${name} must not invent a balance formula`);
}
assert.equal(pkg.scripts['test:accounting-core-v339'],'node --experimental-strip-types server/tests/accountingCoreV339.test.mjs');
assert.equal(pkg.scripts['audit:unified-accounting-engine-v339'],'node scripts/audit-unified-accounting-engine-v339.mjs');
if (versionNumber === 339) {
  assert.ok(String(pkg.scripts['audit:release']||'').endsWith('npm run audit:unified-accounting-engine-v339'),'v339 accounting-engine audit must be the final v339 release gate');
} else {
  assert.ok(String(pkg.scripts['audit:release']||'').includes('npm run audit:unified-accounting-engine-v339'),'successors must retain the v339 accounting-engine gate');
}
console.log('v339 unified accounting engine architecture audit passed.');
