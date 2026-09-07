import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  closePeriodForValidation,
  ensureMigrationChecksums,
  expectClosedPeriodError,
  installAccountingGovernanceSchema,
  partnerAccountingBreakdown,
  sha256File,
} from './accounting-governance-v337-db-helpers.mjs';

const sourceDb = path.resolve(process.argv[2] || '');
const outputDir = path.resolve(process.argv[3] || path.join(process.cwd(), '.tmp-v337-real-db-validation'));
if (!sourceDb || !fs.existsSync(sourceDb)) throw new Error(`real DB copy not found: ${sourceDb}`);
fs.mkdirSync(outputDir, { recursive: true });
const validationDb = path.join(outputDir, 'kourosh-v337-real-db-validation.db');
fs.copyFileSync(sourceDb, validationDb);

const db = new DatabaseSync(validationDb);
const migrationsDir = path.join(process.cwd(), 'server', 'migrations');

const before = partnerAccountingBreakdown(db, 2);
assert.equal(before.canonicalBalance, 284100000, 'Behzad canonical ledger balance before v337 validation must be 284,100,000');
assert.equal(before.supplierReceivable, 284100000, 'Behzad supplier receivable before v337 validation must be 284,100,000');
assert.equal(before.profitShareAccrued, 196417423, 'Behzad separate active profit allocation total must remain separate');

const migrationHealth = ensureMigrationChecksums(db, migrationsDir);
assert.equal(Number(migrationHealth.missing || 0), 0, 'all applied migrations must have SHA256 after v337 migration registry upgrade');
installAccountingGovernanceSchema(db);
const guardCount = Number(db.prepare(`SELECT COUNT(*) count FROM sqlite_master WHERE type='trigger' AND name LIKE '%period_lock_%'`).get().count || 0);
assert.equal(guardCount, 48, 'real DB copy must receive all 48 period-lock triggers');

const salesSample = db.prepare(`
  SELECT so.id orderId, soi.id itemId, date(so.transactionDate) d
  FROM sales_orders so JOIN sales_order_items soi ON soi.orderId=so.id
  WHERE date(so.transactionDate) IS NOT NULL
  ORDER BY so.id LIMIT 1
`).get();
const installmentItemSample = db.prepare(`
  SELECT s.id saleId, i.id itemId, date(COALESCE(s.saleDateISO,s.saleDate,s.dateCreated)) d
  FROM installment_sales s JOIN installment_sale_items i ON i.saleId=s.id
  WHERE date(COALESCE(s.saleDateISO,s.saleDate,s.dateCreated)) IS NOT NULL
  ORDER BY s.id LIMIT 1
`).get();
const receiptSample = db.prepare(`
  SELECT id, date(payment_date) d FROM installment_transactions
  WHERE date(payment_date) IS NOT NULL ORDER BY id LIMIT 1
`).get();
const profitSample = db.prepare(`
  SELECT spa.id allocationId, spa.snapshotId, date(COALESCE(sps.saleDate,sps.createdAt)) d
  FROM sale_profit_allocations spa JOIN sale_profit_snapshots sps ON sps.id=spa.snapshotId
  WHERE spa.sourceStatus='active' AND date(COALESCE(sps.saleDate,sps.createdAt)) IS NOT NULL
  ORDER BY spa.id LIMIT 1
`).get();
for (const [label, sample] of Object.entries({ salesSample, installmentItemSample, receiptSample, profitSample })) {
  assert.ok(sample?.d, `${label} must exist in real DB copy`);
}
const dates = [salesSample.d, installmentItemSample.d, receiptSample.d, profitSample.d].map(String).sort();
const periodStart = dates[0];
const periodEnd = dates.at(-1);
const closed = closePeriodForValidation(db, periodStart, periodEnd);

expectClosedPeriodError(() => db.prepare(`UPDATE sales_orders SET grandTotal=grandTotal+1 WHERE id=?`).run(salesSample.orderId), 'real sales_orders');
expectClosedPeriodError(() => db.prepare(`UPDATE sales_order_items SET totalPrice=totalPrice+1 WHERE id=?`).run(salesSample.itemId), 'real sales_order_items');
expectClosedPeriodError(() => db.prepare(`UPDATE installment_sale_items SET totalPrice=totalPrice+1 WHERE id=?`).run(installmentItemSample.itemId), 'real installment_sale_items');
expectClosedPeriodError(() => db.prepare(`UPDATE installment_transactions SET amount_paid=amount_paid+1 WHERE id=?`).run(receiptSample.id), 'real installment_transactions');
expectClosedPeriodError(() => db.prepare(`UPDATE sale_profit_allocations SET amount=amount+1 WHERE id=?`).run(profitSample.allocationId), 'real sale_profit_allocations');
assert.throws(() => db.prepare(`UPDATE accounting_period_snapshots SET payloadJson='tampered' WHERE id=?`).run(closed.snapshotId), /append-only/);
assert.throws(() => db.prepare(`DELETE FROM accounting_period_snapshots WHERE id=?`).run(closed.snapshotId), /append-only/);

const after = partnerAccountingBreakdown(db, 2);
assert.equal(after.canonicalBalance, 284100000, 'Behzad canonical balance must remain unchanged after v337 migration and lock validation');
assert.equal(after.supplierReceivable, 284100000, 'Behzad supplier receivable must remain unchanged after v337 migration and lock validation');
assert.equal(after.profitShareAccrued, 196417423, 'profit allocation total must remain separate and unchanged');

const schemaMigrationColumns = db.prepare(`PRAGMA table_info(schema_migrations)`).all().map((row) => String(row.name));
assert.ok(schemaMigrationColumns.includes('sha256'), 'schema_migrations.sha256 must exist');
const migrations = db.prepare(`SELECT id, sha256 FROM schema_migrations ORDER BY id`).all();
assert.ok(migrations.length >= 3 && migrations.every((row) => /^[a-f0-9]{64}$/i.test(String(row.sha256 || ''))), 'all real migration rows must have valid SHA256');

const triggerNames = db.prepare(`SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE '%period_lock_%' ORDER BY name`).all().map((row) => row.name);
db.close();

const backupPath = path.join(outputDir, 'pre-repair-validation-backup.db');
fs.copyFileSync(validationDb, backupPath);
const backupSha256 = sha256File(backupPath);
const sidecarPath = `${backupPath}.sha256`;
fs.writeFileSync(sidecarPath, `${backupSha256}  ${path.basename(backupPath)}\n`, 'utf8');
assert.equal(fs.readFileSync(sidecarPath, 'utf8').trim().split(/\s+/)[0], sha256File(backupPath));

const evidence = {
  ok: true,
  sourceDb,
  validationDb,
  validationPeriod: { periodStart, periodEnd },
  migrations: {
    count: migrations.length,
    missingChecksum: 0,
    entries: migrations,
  },
  periodLockTriggerCount: guardCount,
  periodLockTriggers: triggerNames,
  snapshot: { id: closed.snapshotId, version: closed.version, sha256: closed.sha256 },
  backup: { file: backupPath, sha256: backupSha256, checksumSidecar: sidecarPath, checksumVerified: true },
  behzad: {
    partnerId: 2,
    supplierReceivableBefore: before.supplierReceivable,
    supplierReceivableAfter: after.supplierReceivable,
    canonicalBalanceBefore: before.canonicalBalance,
    canonicalBalanceAfter: after.canonicalBalance,
    totalIncreases: after.totalIncreases,
    totalPayments: after.totalPayments,
    ledgerEntryCount: after.entries.length,
    profitAllocationTotal: after.profitShareAccrued,
    profitAllocationCount: after.profitAllocations.length,
    referenceBreakdown: after.entries.reduce((acc, row) => {
      const key = row.referenceType || '(null)';
      if (!acc[key]) acc[key] = { count: 0, net: 0 };
      acc[key].count += 1;
      acc[key].net += Number(row.delta || 0);
      return acc;
    }, {}),
  },
  blockedMutationScenarios: [
    'sales_orders.grandTotal/transactionDate period guard',
    'sales_order_items parent-date guard',
    'installment_sale_items parent-date guard',
    'installment_transactions.payment_date guard',
    'sale_profit_allocations snapshot-date guard',
    'accounting_period_snapshots update/delete append-only guard',
  ],
};
const evidencePath = path.join(outputDir, 'v337-real-db-validation.json');
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ...evidence, evidencePath }, null, 2));
