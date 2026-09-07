import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  closePeriodForValidation,
  ensureMigrationChecksums,
  expectClosedPeriodError,
  installAccountingGovernanceSchema,
  partnerAccountingBreakdown,
  sha256File,
} from '../../scripts/accounting-governance-v337-db-helpers.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kourosh-v337-fixture-'));
const dbPath = path.join(dir, 'fixture.db');
const migrationsDir = path.join(dir, 'migrations');
fs.mkdirSync(migrationsDir);
fs.writeFileSync(path.join(migrationsDir, '001-a.sql'), 'CREATE TABLE a(id INTEGER);\n');
fs.writeFileSync(path.join(migrationsDir, '002-b.sql'), 'ALTER TABLE a ADD COLUMN name TEXT;\n');

const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE partners(id INTEGER PRIMARY KEY, partnerName TEXT);
  CREATE TABLE partner_ledger(id INTEGER PRIMARY KEY, partnerId INTEGER, transactionDate TEXT, createdAt TEXT, updatedAt TEXT, description TEXT, debit REAL, credit REAL, referenceType TEXT, referenceId INTEGER, settlementBatchId TEXT);
  CREATE TABLE customer_ledger(id INTEGER PRIMARY KEY, customerId INTEGER, transactionDate TEXT, debit REAL, credit REAL);
  CREATE TABLE purchases(id INTEGER PRIMARY KEY, purchaseDate TEXT, totalCost REAL);
  CREATE TABLE purchase_items(id INTEGER PRIMARY KEY, purchaseId INTEGER, lineTotal REAL);
  CREATE TABLE sales_orders(id INTEGER PRIMARY KEY, transactionDate TEXT, grandTotal REAL, status TEXT);
  CREATE TABLE sales_order_items(id INTEGER PRIMARY KEY, orderId INTEGER, totalPrice REAL);
  CREATE TABLE sales_transactions(id INTEGER PRIMARY KEY, transactionDate TEXT, totalPrice REAL);
  CREATE TABLE installment_sales(id INTEGER PRIMARY KEY, saleDateISO TEXT, saleDate TEXT, dateCreated TEXT, actualSalePrice REAL, status TEXT);
  CREATE TABLE installment_sale_items(id INTEGER PRIMARY KEY, saleId INTEGER, totalPrice REAL);
  CREATE TABLE installment_payments(id INTEGER PRIMARY KEY, paymentDate TEXT, dueDate TEXT, amountDue REAL);
  CREATE TABLE installment_transactions(id INTEGER PRIMARY KEY, installment_payment_id INTEGER, amount_paid REAL, payment_date TEXT, notes TEXT);
  CREATE TABLE expenses(id INTEGER PRIMARY KEY, expenseDate TEXT, amount REAL);
  CREATE TABLE partner_settlement_transactions(id INTEGER PRIMARY KEY, settlementDate TEXT, amount REAL);
  CREATE TABLE sale_profit_snapshots(id INTEGER PRIMARY KEY, saleDate TEXT, createdAt TEXT, totalProfitAmount REAL);
  CREATE TABLE sale_profit_allocations(id INTEGER PRIMARY KEY, snapshotId INTEGER, storePartnerId INTEGER, allocationType TEXT, amount REAL, sourceStatus TEXT);
  CREATE TABLE store_partner_legacy_links(id INTEGER PRIMARY KEY, storePartnerId INTEGER, legacyPartnerId INTEGER);
  CREATE TABLE sales_returns(id INTEGER PRIMARY KEY, createdAt TEXT, refundAmount REAL);
  CREATE TABLE schema_migrations(id TEXT PRIMARY KEY, appliedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')));
`);
for (const id of ['001-a.sql', '002-b.sql']) db.prepare(`INSERT INTO schema_migrations(id) VALUES(?)`).run(id);
const migrationHealth = ensureMigrationChecksums(db, migrationsDir);
assert.equal(Number(migrationHealth.total), 2);
assert.equal(Number(migrationHealth.missing), 0);

installAccountingGovernanceSchema(db);
const guardCount = Number(db.prepare(`SELECT COUNT(*) count FROM sqlite_master WHERE type='trigger' AND name LIKE '%period_lock_%'`).get().count || 0);
assert.equal(guardCount, 48, 'all parent, child and profit allocation period guards must exist');

db.prepare(`INSERT INTO partners(id,partnerName) VALUES(2,'بهزاد هلیلی')`).run();
const ledgerRows = [
  [1, 2, '2026-03-01', 'خرید گوشی', 0, 690600000, 'phone_purchase', 1],
  [2, 2, '2026-03-02', 'پرداخت گوشی', 36600000, 0, 'phone_settlement_payment', 1],
  [3, 2, '2026-03-03', 'پرداخت قدیمی', 90100000, 0, null, null],
  [4, 2, '2026-03-04', 'حذف گوشی', 155000000, 0, 'phone_delete', 1],
  [5, 2, '2026-03-05', 'تسویه گروهی', 124800000, 0, 'partner_settlement_atomic_submit', 1],
];
for (const row of ledgerRows) {
  db.prepare(`INSERT INTO partner_ledger(id,partnerId,transactionDate,createdAt,updatedAt,description,debit,credit,referenceType,referenceId) VALUES(?,?,?,?||'T00:00:00Z',?||'T00:00:00Z',?,?,?,?,?)`).run(row[0],row[1],row[2],row[2],row[2],row[3],row[4],row[5],row[6],row[7]);
}
db.prepare(`INSERT INTO store_partner_legacy_links(id,storePartnerId,legacyPartnerId) VALUES(1,2,2)`).run();
db.prepare(`INSERT INTO sale_profit_snapshots(id,saleDate,createdAt,totalProfitAmount) VALUES(1,'2026-03-07','2026-03-07T00:00:00Z',300000000)`).run();
db.prepare(`INSERT INTO sale_profit_allocations(id,snapshotId,storePartnerId,allocationType,amount,sourceStatus) VALUES(1,1,2,'shared_profit',192417423,'active')`).run();
db.prepare(`INSERT INTO sale_profit_allocations(id,snapshotId,storePartnerId,allocationType,amount,sourceStatus) VALUES(2,1,2,'owner_gain',4000000,'active')`).run();

db.prepare(`INSERT INTO sales_orders(id,transactionDate,grandTotal,status) VALUES(1,'2026-03-10',1000000,'active')`).run();
db.prepare(`INSERT INTO sales_order_items(id,orderId,totalPrice) VALUES(1,1,1000000)`).run();
db.prepare(`INSERT INTO installment_sales(id,saleDateISO,saleDate,dateCreated,actualSalePrice,status) VALUES(1,'2026-03-11','2026-03-11','2026-03-11T00:00:00Z',2000000,'active')`).run();
db.prepare(`INSERT INTO installment_sale_items(id,saleId,totalPrice) VALUES(1,1,2000000)`).run();
db.prepare(`INSERT INTO installment_payments(id,paymentDate,dueDate,amountDue) VALUES(1,'2026-03-12','2026-03-12',500000)`).run();
db.prepare(`INSERT INTO installment_transactions(id,installment_payment_id,amount_paid,payment_date,notes) VALUES(1,1,500000,'2026-03-12','paid')`).run();

const breakdown = partnerAccountingBreakdown(db, 2);
assert.equal(breakdown.canonicalBalance, 284100000);
assert.equal(breakdown.supplierReceivable, 284100000);
assert.equal(breakdown.profitShareAccrued, 196417423);
assert.equal(breakdown.entries.length, 5);
assert.equal(breakdown.profitAllocations.length, 2);

const closed = closePeriodForValidation(db, '2026-03-01', '2026-03-31');
assert.match(closed.sha256, /^[a-f0-9]{64}$/);
assert.equal(closed.version, 1);
expectClosedPeriodError(() => db.prepare(`UPDATE sales_orders SET grandTotal=grandTotal+1 WHERE id=1`).run(), 'sales_orders');
expectClosedPeriodError(() => db.prepare(`UPDATE sales_order_items SET totalPrice=totalPrice+1 WHERE id=1`).run(), 'sales_order_items');
expectClosedPeriodError(() => db.prepare(`UPDATE installment_sale_items SET totalPrice=totalPrice+1 WHERE id=1`).run(), 'installment_sale_items');
expectClosedPeriodError(() => db.prepare(`UPDATE installment_transactions SET amount_paid=amount_paid+1 WHERE id=1`).run(), 'installment_transactions');
expectClosedPeriodError(() => db.prepare(`DELETE FROM sale_profit_allocations WHERE id=1`).run(), 'sale_profit_allocations');

assert.throws(() => db.prepare(`UPDATE accounting_period_snapshots SET payloadJson='tamper' WHERE id=?`).run(closed.snapshotId), /append-only/);
assert.throws(() => db.prepare(`DELETE FROM accounting_period_snapshots WHERE id=?`).run(closed.snapshotId), /append-only/);
assert.equal(partnerAccountingBreakdown(db, 2).canonicalBalance, 284100000, 'closed-period validation must not alter partner balance');

db.close();
const backupPath = path.join(dir, 'fixture-backup.db');
fs.copyFileSync(dbPath, backupPath);
const checksum = sha256File(backupPath);
fs.writeFileSync(`${backupPath}.sha256`, `${checksum}  ${path.basename(backupPath)}\n`);
const sidecar = fs.readFileSync(`${backupPath}.sha256`, 'utf8').trim().split(/\s+/)[0];
assert.equal(sidecar, sha256File(backupPath), 'backup SHA256 sidecar must verify against backup bytes');

console.log(JSON.stringify({
  ok: true,
  guardCount,
  migrationChecksums: Number(migrationHealth.total),
  behzadSupplierReceivable: breakdown.supplierReceivable,
  behzadProfitAllocationTotal: breakdown.profitShareAccrued,
  snapshotSha256: closed.sha256,
  backupSha256: checksum,
}, null, 2));
