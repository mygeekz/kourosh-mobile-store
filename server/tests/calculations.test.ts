// Simple checks for calculation helpers and validators
// Run this file with `node` to execute the assertions. In CI or manual checking
// this provides confidence that our unified calculation functions behave as
// expected. There is no external check runner, so we use Node's built-in
// assertions.

import assert from 'assert';
import { calculateSalesSummary, calculateInstallmentTotals } from '../calculations';

// Check sales summary calculation
(() => {
  const lines = [
    { quantity: 2, unitPrice: 10000, discountPerItem: 500 },
    { quantity: 1, unitPrice: 5000, discountPerItem: 0 },
  ];
  const result = calculateSalesSummary(lines, 200, 9);
  // subtotal: 2*10000 + 1*5000 = 25000
  assert.strictEqual(result.subtotal, 25000, 'Subtotal should be correct');
  // items discount: 500 + 0 = 500
  assert.strictEqual(result.itemsDiscount, 500, 'Items discount should be correct');
  // total discount = itemsDiscount + global discount = 500 + 200 = 700
  assert.strictEqual(result.taxableAmount, 25000 - 700, 'Taxable amount should be subtotal minus discounts');
  // taxAmount = 24300 * 9% = 2187
  assert.strictEqual(Math.round(result.taxAmount), Math.round(24300 * 0.09), 'Tax amount should be computed correctly');
  // grand total = taxable + tax
  assert.strictEqual(Math.round(result.grandTotal), Math.round(result.taxableAmount + result.taxAmount), 'Grand total should match taxable plus tax');
})();

// Check installment totals calculation
(() => {
  const { totalPrice, debt } = calculateInstallmentTotals(30000, 5000, 5, 5000);
  // totalPrice = downPayment + installments*amount = 5000 + 5*5000 = 30000
  assert.strictEqual(totalPrice, 30000, 'Total price should equal down payment plus installments');
  // debt = totalPrice - downPayment = 25000
  assert.strictEqual(debt, 25000, 'Debt should be total minus down payment');
})();

console.log('All calculation checks passed.');