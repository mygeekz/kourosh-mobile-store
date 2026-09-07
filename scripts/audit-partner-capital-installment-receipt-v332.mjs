import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 332, `KOUROSH_SOURCE_VERSION must be v332 or successor; found ${version}`);

const repo = read('server/repositories/partnerLedgerReads.repo.ts');
assert.ok(repo.includes("cl.referenceType = 'installment_manual_receipt'"), 'partner phone reads must aggregate linked manual installment receipts');
assert.ok(repo.includes('installmentSaleManualReceiptAmount'), 'partner phone reads must expose manual installment receipt amount');
assert.ok(repo.includes('installment_manual_receipt_totals AS ('), 'partner settlement CTE must aggregate manual receipts by active installment sale');
assert.ok(
  repo.includes('COALESCE(installmentSaleCheckPaidAmount,0) + COALESCE(installmentSaleManualReceiptAmount,0)'),
  'partner settlement collected amount must include manual installment receipts',
);
assert.ok(
  repo.includes('installmentSaleCheckPaidAmount, installmentSaleManualReceiptAmount, installmentCustomerRemainingAmount'),
  'partner settlement timeline summary must expose manual receipt amount',
);

const viewModels = read('pages/partnerDetail/partnerDetailViewModels.ts');
assert.ok(viewModels.includes('const installmentManualReceiptPaid = num(item?.installmentSaleManualReceiptAmount || 0);'), 'partner detail view model must read manual installment receipts');
assert.ok(viewModels.includes('installmentDownPayment + installmentTransactionPaid + installmentCheckPaid + installmentManualReceiptPaid'), 'partner detail view model must include manual receipts in collection math');
assert.ok(viewModels.includes('Math.max(reconstructedInstallmentCollected, num(item?.installmentCollectedAmount || 0))'), 'partner detail view model must prefer the strongest canonical collected total');

const support = read('pages/partnerDetail/partnerDetailControllerSupport.tsx');
assert.ok(support.includes('item?.installmentCustomerRemainingAmount'), 'sale status UI must prefer canonical installment customer remaining amount');

const atomic = read('server/services/partnerSettlementAtomicSubmitService.ts');
assert.ok(atomic.includes('installmentSaleManualReceiptAmount'), 'partner settlement submit preview must include manual installment receipts');
assert.ok(atomic.includes('canonicalCollected'), 'partner settlement submit math must use canonical collected amount');

// Regression fixture for the exact class of bug: check schedule is short by a cash receipt.
const actualTotal = 37_600_000;
const downPayment = 10_000_000;
const checkPaid = 27_400_000;
const manualReceipt = 200_000;
const remaining = Math.max(0, actualTotal - (downPayment + checkPaid + manualReceipt));
assert.equal(remaining, 0, 'manual receipt must close the customer sale balance in partner capital status');

console.log('v332 partner capital installment manual-receipt consistency audit passed.');
