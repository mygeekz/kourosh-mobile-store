import assert from 'node:assert/strict';
import { buildFinancialAudit } from '../reportFinancialAudit';

const audit = buildFinancialAudit({
  invoiceRows: [{ id: 1, subtotal: 1000000, discount: 100000, tax: 0, grandTotal: 900000 }],
  itemRows: [
    { id: 10, orderId: 1, itemType: 'inventory', itemId: 7, quantity: 1, unitPrice: 1000000, totalPrice: 1000000, buyPrice: 0, productPurchasePrice: 0 },
    { id: 11, orderId: 1, itemType: 'phone', itemId: 2, quantity: 1, unitPrice: 5000000, totalPrice: 5000000, buyPrice: 0, phonePurchasePrice: 4000000, phoneCurrentPurchasePrice: 0 },
  ],
  installmentRows: [{ id: 3, actualSalePrice: 12000000, downPayment: 2000000, numberOfInstallments: 5, installmentAmount: 1800000, paidAmount: 11000000, overdueUnpaidAmount: 500000 }],
  inventoryRows: [{ id: 5, stock_quantity: -1, purchasePrice: 10000 }, { id: 6, stock_quantity: 3, purchasePrice: 0 }],
  phoneRows: [{ id: 2, status: 'فروخته شده', purchasePrice: 4000000, currentPurchasePrice: 0 }],
  partnerLedgerRows: [{ id: 8, debit: 1000, credit: 500 }],
});

assert.ok(audit.counts.total >= 6, 'audit should catch sales/profit/payment/inventory/partner issues');
assert.ok(audit.issues.some((i) => i.id === 'invoice-lines-1'), 'must detect undistributed invoice discount line mismatch');
assert.ok(audit.issues.some((i) => i.id === 'missing-cost-1-10'), 'must detect missing product COGS');
assert.ok(audit.issues.some((i) => i.id === 'phone-current-price-1-11'), 'must detect missing current phone purchase price');
assert.ok(audit.issues.some((i) => i.id === 'negative-stock-5'), 'must detect negative stock');
assert.ok(audit.issues.some((i) => i.id === 'partner-ledger-double-sided-8'), 'must detect double-sided partner ledger row');
assert.ok(audit.score < 100, 'score should decrease when issues exist');

console.log('reports audit guards passed');
