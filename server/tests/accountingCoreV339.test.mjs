import assert from 'node:assert/strict';
import {
  accountingMovementDelta,
  calculateAccountingBalanceFromMovements,
  calculateInstallmentContractAccountingState,
  calculateSaleProfitAccountingState,
  calculateSalesAccountingSummary,
  previewAccountingBalanceAfterMovement,
  allocateAccountingAmountByShares,
} from '../../shared/accounting/accountingCore.ts';

assert.equal(accountingMovementDelta('partner', { credit: 1000, debit: 0 }), 1000);
assert.equal(accountingMovementDelta('partner', { credit: 0, debit: 250 }), -250);
assert.equal(accountingMovementDelta('customer', { debit: 1000, credit: 0 }), 1000);
assert.equal(accountingMovementDelta('customer', { debit: 0, credit: 250 }), -250);
assert.equal(calculateAccountingBalanceFromMovements('partner', [{ credit: 1000 }, { debit: 250 }]), 750);
assert.equal(previewAccountingBalanceAfterMovement('customer', 1000, { credit: 250 }), 750);
assert.equal(previewAccountingBalanceAfterMovement('partner', 1000, { debit: 250 }), 750);
assert.equal(previewAccountingBalanceAfterMovement('partner', 1000, {}), 1000);

const installment = calculateInstallmentContractAccountingState({ actualSalePrice: 10_000, downPayment: 2_000, collectedAfterDownPayment: 3_000 });
assert.deepEqual(installment, { contractDebt: 8000, collectedAfterDownPayment: 3000, remaining: 5000, overpayment: 0 });
assert.equal(calculateInstallmentContractAccountingState({ actualSalePrice: 10_000, downPayment: 2_000, collectedAfterDownPayment: 9_000 }).overpayment, 1000);
assert.equal(calculateInstallmentContractAccountingState({ actualSalePrice: 10_000, downPayment: 2_000, collectedAfterDownPayment: 3_000, canceled: true }).remaining, 0);

const sales = calculateSalesAccountingSummary([{ quantity: 2, unitPrice: 5000, discountPerItem: 500 }], 1000, 10);
assert.deepEqual(sales, { subtotal: 10000, itemsDiscount: 1000, taxableAmount: 8000, taxAmount: 800, grandTotal: 8800 });

const personalProfit = calculateSaleProfitAccountingState({ quantity: 1, saleAmount: 15000, initialCostPerUnit: 10000, marketCostPerUnit: 12000, ownershipType: 'personal' });
assert.deepEqual(personalProfit, { quantity:1, saleAmount:15000, initialCostPerUnit:10000, marketCostPerUnit:12000, initialCostAmount:10000, marketCostAmount:12000, ownerGainAmount:2000, sharedProfitAmount:3000, totalProfitAmount:5000 });
const storeProfit = calculateSaleProfitAccountingState({ quantity: 2, saleAmount: 30000, initialCostPerUnit: 10000, marketCostPerUnit: 12000, ownershipType: 'store' });
assert.equal(storeProfit.ownerGainAmount, 0);
assert.equal(storeProfit.sharedProfitAmount, 10000);
assert.equal(storeProfit.totalProfitAmount, 10000);

assert.deepEqual(allocateAccountingAmountByShares(1000, [{ storePartnerId:1, sharePercent:60 }, { storePartnerId:2, sharePercent:40 }]).map(x=>x.amount), [600,400]);
console.log('v339 unified accounting core math test passed.');
