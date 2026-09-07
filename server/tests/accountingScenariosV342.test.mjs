import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  calculateAccountingBalanceFromMovements,
  calculateInstallmentContractAccountingState,
  calculateSaleProfitAccountingState,
} from '../../shared/accounting/accountingCore.ts';

const db = new DatabaseSync(':memory:');
db.exec(`
  PRAGMA foreign_keys=ON;
  CREATE TABLE ledger(id INTEGER PRIMARY KEY, kind TEXT NOT NULL, ownerId INTEGER NOT NULL, debit REAL NOT NULL DEFAULT 0, credit REAL NOT NULL DEFAULT 0, referenceType TEXT NOT NULL, referenceId INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'active');
  CREATE TABLE manual_docs(id INTEGER PRIMARY KEY, reason TEXT NOT NULL, amount REAL NOT NULL CHECK(amount > 0), direction TEXT NOT NULL CHECK(direction IN ('debit','credit')));
  CREATE TABLE checks(id INTEGER PRIMARY KEY, saleId INTEGER NOT NULL, amount REAL NOT NULL CHECK(amount > 0), status TEXT NOT NULL, cashedAt TEXT);
  CREATE TABLE sales(id INTEGER PRIMARY KEY, customerId INTEGER NOT NULL, saleType TEXT NOT NULL, salePrice REAL NOT NULL CHECK(salePrice > 0), downPayment REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active', supplierId INTEGER, ownerId INTEGER, purchasePriceSnapshot REAL NOT NULL, supplierSnapshot INTEGER, ownerSnapshot INTEGER);
  CREATE TABLE profit_snapshots(id INTEGER PRIMARY KEY, saleId INTEGER NOT NULL, purchasePrice REAL NOT NULL, supplierId INTEGER, ownerId INTEGER, totalProfit REAL NOT NULL, sourceStatus TEXT NOT NULL DEFAULT 'active');
  CREATE TABLE partner_settlements(id INTEGER PRIMARY KEY, partnerId INTEGER NOT NULL, amount REAL NOT NULL CHECK(amount > 0), status TEXT NOT NULL);
`);

const addLedger = (kind, ownerId, debit, credit, referenceType, referenceId) => {
  assert.ok(referenceType && Number(referenceId) > 0, 'every movement must have a source reference');
  assert.ok((debit > 0) !== (credit > 0), 'movement must be exactly one-sided');
  db.prepare(`INSERT INTO ledger(kind,ownerId,debit,credit,referenceType,referenceId) VALUES(?,?,?,?,?,?)`).run(kind, ownerId, debit, credit, referenceType, referenceId);
};
const customerBalance = (id) => calculateAccountingBalanceFromMovements('customer', db.prepare(`SELECT debit,credit FROM ledger WHERE kind='customer' AND ownerId=? AND status='active' ORDER BY id`).all(id));
const partnerBalance = (id) => calculateAccountingBalanceFromMovements('partner', db.prepare(`SELECT debit,credit FROM ledger WHERE kind='partner' AND ownerId=? AND status='active' ORDER BY id`).all(id));

// 1) Cash sale: sale is source-linked and fully collected -> no residual customer debt.
db.prepare(`INSERT INTO sales VALUES(1,1,'cash',1000000,1000000,'active',10,20,700000,10,20)`).run();
addLedger('customer', 1, 1000000, 0, 'sale', 1);
addLedger('customer', 1, 0, 1000000, 'sale_receipt', 1);
assert.equal(customerBalance(1), 0);

// 2) Installment sale + down payment: remaining is derived from the shared accounting core.
db.prepare(`INSERT INTO sales VALUES(2,2,'installment',5000000,1000000,'active',10,20,3000000,10,20)`).run();
const installment = calculateInstallmentContractAccountingState({ actualSalePrice: 5000000, downPayment: 1000000, collectedAfterDownPayment: 1500000 });
assert.deepEqual(installment, { contractDebt: 4000000, collectedAfterDownPayment: 1500000, remaining: 2500000, overpayment: 0 });
addLedger('customer', 2, 4000000, 0, 'installment_sale', 2);
addLedger('customer', 2, 0, 1500000, 'installment_receipt', 2);
assert.equal(customerBalance(2), 2500000);

// 3) Check collection: payment is attached to the check and reduces customer debt.
db.prepare(`INSERT INTO checks VALUES(1,2,1000000,'cashed','2026-09-01')`).run();
addLedger('customer', 2, 0, 1000000, 'check', 1);
assert.equal(customerBalance(2), 1500000);

// 4) Cash payment outside a check: it must first have an independent manual document.
db.prepare(`INSERT INTO manual_docs(id,reason,amount,direction) VALUES(1,'پرداخت نقدی مستقل مشتری',500000,'credit')`).run();
addLedger('customer', 2, 0, 500000, 'manual_accounting_document', 1);
assert.equal(customerBalance(2), 1000000);

// 5) Bounced check: reverse the original receipt, never mutate/delete it.
db.prepare(`UPDATE checks SET status='bounced' WHERE id=1`).run();
addLedger('customer', 2, 1000000, 0, 'check_bounce_reversal', 1);
assert.equal(customerBalance(2), 2000000);

// 6) Supplier change after sale: historical snapshot remains frozen.
const beforeSale2 = db.prepare(`SELECT supplierSnapshot,ownerSnapshot,purchasePriceSnapshot FROM sales WHERE id=2`).get();
db.prepare(`UPDATE sales SET supplierId=99, ownerId=77 WHERE id=2`).run();
const afterSale2 = db.prepare(`SELECT supplierSnapshot,ownerSnapshot,purchasePriceSnapshot FROM sales WHERE id=2`).get();
assert.deepEqual(afterSale2, beforeSale2);

// 7) Sale cancellation: preserve sale, append financial reversals.
db.prepare(`UPDATE sales SET status='canceled' WHERE id=1`).run();
addLedger('customer', 1, 0, 1000000, 'sale_cancel_reversal', 1);
addLedger('customer', 1, 1000000, 0, 'sale_receipt_cancel_reversal', 1);
assert.equal(db.prepare(`SELECT COUNT(*) c FROM sales WHERE id=1`).get().c, 1);
assert.equal(customerBalance(1), 0);

// 8) Purchase-price change today cannot change historical profit snapshot.
const profit = calculateSaleProfitAccountingState({ quantity: 1, saleAmount: 5000000, initialCostPerUnit: 3000000, marketCostPerUnit: 3500000, ownershipType: 'personal' });
db.prepare(`INSERT INTO profit_snapshots(id,saleId,purchasePrice,supplierId,ownerId,totalProfit) VALUES(1,2,3000000,10,20,?)`).run(profit.totalProfitAmount);
const frozenProfit = db.prepare(`SELECT * FROM profit_snapshots WHERE id=1`).get();
db.prepare(`UPDATE sales SET purchasePriceSnapshot=purchasePriceSnapshot WHERE id=2`).run(); // current catalog price is deliberately not part of the snapshot table
assert.deepEqual(db.prepare(`SELECT * FROM profit_snapshots WHERE id=1`).get(), frozenProfit);

// 9) Partner payment: source-linked debit reduces partner receivable.
addLedger('partner', 9, 0, 4000000, 'phone_purchase', 88);
addLedger('partner', 9, 1000000, 0, 'partner_payment', 91);
assert.equal(partnerBalance(9), 3000000);

// 10) Partial + full settlement: every settlement has its own source and final balance reaches zero.
db.prepare(`INSERT INTO partner_settlements VALUES(1,9,1200000,'partial')`).run();
addLedger('partner', 9, 1200000, 0, 'partner_settlement', 1);
assert.equal(partnerBalance(9), 1800000);
db.prepare(`INSERT INTO partner_settlements VALUES(2,9,1800000,'full')`).run();
addLedger('partner', 9, 1800000, 0, 'partner_settlement', 2);
assert.equal(partnerBalance(9), 0);

console.log(JSON.stringify({ ok: true, scenarios: 10, finalCustomer2Balance: customerBalance(2), finalPartner9Balance: partnerBalance(9) }, null, 2));
