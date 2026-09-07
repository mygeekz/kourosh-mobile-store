import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const sha256Text = (value) => createHash('sha256').update(value).digest('hex');
export const sha256File = (filePath) => createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

const lockedDateExists = (dateExpression) => `EXISTS (
  SELECT 1 FROM accounting_period_locks apl
  WHERE apl.status = 'closed'
    AND date(${dateExpression}) BETWEEN date(apl.periodStart) AND date(apl.periodEnd)
)`;

export function installAccountingGovernanceSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounting_period_locks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      periodStart TEXT NOT NULL,
      periodEnd TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'closed' CHECK (status = 'closed'),
      closeReason TEXT,
      closedByUserId INTEGER,
      closedByUsername TEXT,
      closedByRole TEXT,
      closedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      snapshotId INTEGER,
      CHECK (date(periodStart) IS NOT NULL AND date(periodEnd) IS NOT NULL AND date(periodStart) <= date(periodEnd)),
      UNIQUE(periodStart, periodEnd)
    );
    CREATE INDEX IF NOT EXISTS idx_accounting_period_locks_range ON accounting_period_locks(periodStart, periodEnd);

    CREATE TABLE IF NOT EXISTS accounting_period_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lockId INTEGER,
      periodStart TEXT NOT NULL,
      periodEnd TEXT NOT NULL,
      version INTEGER NOT NULL,
      payloadJson TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      createdByUserId INTEGER,
      createdByUsername TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      UNIQUE(periodStart, periodEnd, version),
      FOREIGN KEY (lockId) REFERENCES accounting_period_locks(id)
    );
    CREATE INDEX IF NOT EXISTS idx_accounting_period_snapshots_range ON accounting_period_snapshots(periodStart, periodEnd, version DESC);
    CREATE TRIGGER IF NOT EXISTS trg_accounting_period_snapshots_no_update
      BEFORE UPDATE ON accounting_period_snapshots
      BEGIN SELECT RAISE(ABORT, 'accounting_period_snapshots is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS trg_accounting_period_snapshots_no_delete
      BEFORE DELETE ON accounting_period_snapshots
      BEGIN SELECT RAISE(ABORT, 'accounting_period_snapshots is append-only'); END;
  `);

  const periodGuards = [
    { table: 'partner_ledger', insertDate: 'NEW.transactionDate', oldDate: 'OLD.transactionDate', newDate: 'NEW.transactionDate', deleteDate: 'OLD.transactionDate' },
    { table: 'customer_ledger', insertDate: 'NEW.transactionDate', oldDate: 'OLD.transactionDate', newDate: 'NEW.transactionDate', deleteDate: 'OLD.transactionDate' },
    { table: 'purchases', insertDate: 'NEW.purchaseDate', oldDate: 'OLD.purchaseDate', newDate: 'NEW.purchaseDate', deleteDate: 'OLD.purchaseDate' },
    { table: 'sales_orders', insertDate: 'NEW.transactionDate', oldDate: 'OLD.transactionDate', newDate: 'NEW.transactionDate', deleteDate: 'OLD.transactionDate' },
    { table: 'sales_transactions', insertDate: 'NEW.transactionDate', oldDate: 'OLD.transactionDate', newDate: 'NEW.transactionDate', deleteDate: 'OLD.transactionDate' },
    { table: 'installment_sales', insertDate: 'COALESCE(NEW.saleDateISO, NEW.saleDate, NEW.dateCreated)', oldDate: 'COALESCE(OLD.saleDateISO, OLD.saleDate, OLD.dateCreated)', newDate: 'COALESCE(NEW.saleDateISO, NEW.saleDate, NEW.dateCreated)', deleteDate: 'COALESCE(OLD.saleDateISO, OLD.saleDate, OLD.dateCreated)' },
    { table: 'installment_payments', insertDate: 'COALESCE(NEW.paymentDate, NEW.dueDate)', oldDate: 'COALESCE(OLD.paymentDate, OLD.dueDate)', newDate: 'COALESCE(NEW.paymentDate, NEW.dueDate)', deleteDate: 'COALESCE(OLD.paymentDate, OLD.dueDate)' },
    { table: 'installment_transactions', insertDate: 'NEW.payment_date', oldDate: 'OLD.payment_date', newDate: 'NEW.payment_date', deleteDate: 'OLD.payment_date' },
    { table: 'expenses', insertDate: 'NEW.expenseDate', oldDate: 'OLD.expenseDate', newDate: 'NEW.expenseDate', deleteDate: 'OLD.expenseDate' },
    { table: 'partner_settlement_transactions', insertDate: 'NEW.settlementDate', oldDate: 'OLD.settlementDate', newDate: 'NEW.settlementDate', deleteDate: 'OLD.settlementDate' },
    { table: 'sale_profit_snapshots', insertDate: 'COALESCE(NEW.saleDate, NEW.createdAt)', oldDate: 'COALESCE(OLD.saleDate, OLD.createdAt)', newDate: 'COALESCE(NEW.saleDate, NEW.createdAt)', deleteDate: 'COALESCE(OLD.saleDate, OLD.createdAt)' },
    { table: 'sales_returns', insertDate: 'NEW.createdAt', oldDate: 'OLD.createdAt', newDate: 'NEW.createdAt', deleteDate: 'OLD.createdAt' },
  ];

  for (const guard of periodGuards) {
    const safe = guard.table.replace(/[^a-z0-9_]/gi, '');
    db.exec(`DROP TRIGGER IF EXISTS trg_${safe}_period_lock_insert; DROP TRIGGER IF EXISTS trg_${safe}_period_lock_update; DROP TRIGGER IF EXISTS trg_${safe}_period_lock_delete;`);
    db.exec(`CREATE TRIGGER trg_${safe}_period_lock_insert BEFORE INSERT ON ${guard.table} WHEN ${lockedDateExists(guard.insertDate)} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);
    db.exec(`CREATE TRIGGER trg_${safe}_period_lock_update BEFORE UPDATE ON ${guard.table} WHEN ${lockedDateExists(guard.oldDate)} OR ${lockedDateExists(guard.newDate)} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);
    db.exec(`CREATE TRIGGER trg_${safe}_period_lock_delete BEFORE DELETE ON ${guard.table} WHEN ${lockedDateExists(guard.deleteDate)} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);
  }

  const childGuards = [
    { table: 'purchase_items', parentTable: 'purchases', childFk: 'purchaseId', parentPk: 'id', parentDate: 'parent.purchaseDate' },
    { table: 'sales_order_items', parentTable: 'sales_orders', childFk: 'orderId', parentPk: 'id', parentDate: 'parent.transactionDate' },
    { table: 'installment_sale_items', parentTable: 'installment_sales', childFk: 'saleId', parentPk: 'id', parentDate: 'COALESCE(parent.saleDateISO, parent.saleDate, parent.dateCreated)' },
  ];
  for (const guard of childGuards) {
    const safe = guard.table.replace(/[^a-z0-9_]/gi, '');
    const parentLocked = (fkExpr) => `EXISTS (
      SELECT 1 FROM ${guard.parentTable} parent
      JOIN accounting_period_locks apl ON apl.status = 'closed'
       AND date(${guard.parentDate}) BETWEEN date(apl.periodStart) AND date(apl.periodEnd)
      WHERE parent.${guard.parentPk} = ${fkExpr}
    )`;
    db.exec(`DROP TRIGGER IF EXISTS trg_${safe}_period_lock_insert; DROP TRIGGER IF EXISTS trg_${safe}_period_lock_update; DROP TRIGGER IF EXISTS trg_${safe}_period_lock_delete;`);
    db.exec(`CREATE TRIGGER trg_${safe}_period_lock_insert BEFORE INSERT ON ${guard.table} WHEN ${parentLocked(`NEW.${guard.childFk}`)} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);
    db.exec(`CREATE TRIGGER trg_${safe}_period_lock_update BEFORE UPDATE ON ${guard.table} WHEN ${parentLocked(`OLD.${guard.childFk}`)} OR ${parentLocked(`NEW.${guard.childFk}`)} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);
    db.exec(`CREATE TRIGGER trg_${safe}_period_lock_delete BEFORE DELETE ON ${guard.table} WHEN ${parentLocked(`OLD.${guard.childFk}`)} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);
  }

  const allocationLocked = (snapshotExpr) => `EXISTS (
    SELECT 1 FROM sale_profit_snapshots sps
    JOIN accounting_period_locks apl ON apl.status = 'closed'
      AND date(COALESCE(sps.saleDate, sps.createdAt)) BETWEEN date(apl.periodStart) AND date(apl.periodEnd)
    WHERE sps.id = ${snapshotExpr}
  )`;
  db.exec(`DROP TRIGGER IF EXISTS trg_sale_profit_allocations_period_lock_insert; DROP TRIGGER IF EXISTS trg_sale_profit_allocations_period_lock_update; DROP TRIGGER IF EXISTS trg_sale_profit_allocations_period_lock_delete;`);
  db.exec(`CREATE TRIGGER trg_sale_profit_allocations_period_lock_insert BEFORE INSERT ON sale_profit_allocations WHEN ${allocationLocked('NEW.snapshotId')} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);
  db.exec(`CREATE TRIGGER trg_sale_profit_allocations_period_lock_update BEFORE UPDATE ON sale_profit_allocations WHEN ${allocationLocked('OLD.snapshotId')} OR ${allocationLocked('NEW.snapshotId')} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);
  db.exec(`CREATE TRIGGER trg_sale_profit_allocations_period_lock_delete BEFORE DELETE ON sale_profit_allocations WHEN ${allocationLocked('OLD.snapshotId')} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);
}

export function ensureMigrationChecksums(db, migrationsDir) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, sha256 TEXT, appliedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')));`);
  const cols = db.prepare(`PRAGMA table_info(schema_migrations)`).all().map((row) => String(row.name));
  if (!cols.includes('sha256')) db.exec(`ALTER TABLE schema_migrations ADD COLUMN sha256 TEXT;`);
  const files = fs.readdirSync(migrationsDir).filter((name) => name.toLowerCase().endsWith('.sql')).sort((a, b) => a.localeCompare(b, 'en'));
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const hash = sha256Text(sql);
    const row = db.prepare(`SELECT id, sha256 FROM schema_migrations WHERE id=? LIMIT 1`).get(file);
    if (!row) throw new Error(`real-db validation expected migration ${file} to already be applied`);
    const stored = String(row.sha256 || '').trim().toLowerCase();
    if (stored && stored !== hash) throw new Error(`checksum mismatch for ${file}`);
    if (!stored) db.prepare(`UPDATE schema_migrations SET sha256=? WHERE id=?`).run(hash, file);
  }
  return db.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN COALESCE(sha256,'')='' THEN 1 ELSE 0 END) AS missing FROM schema_migrations`).get();
}

export function partnerAccountingBreakdown(db, partnerId) {
  const rows = db.prepare(`SELECT id, transactionDate, description, COALESCE(debit,0) debit, COALESCE(credit,0) credit, referenceType, referenceId FROM partner_ledger WHERE partnerId=? ORDER BY datetime(COALESCE(transactionDate,createdAt,updatedAt)), id`).all(partnerId);
  let running = 0;
  let supplierCredits = 0;
  let supplierDebits = 0;
  const entries = rows.map((row) => {
    const debit = Number(row.debit || 0), credit = Number(row.credit || 0), delta = credit - debit;
    running += delta;
    const ref = String(row.referenceType || '').toLowerCase();
    const isProfit = ref.includes('profit') || ref.includes('share');
    if (!isProfit) { supplierCredits += credit; supplierDebits += debit; }
    return { ...row, debit, credit, delta, runningBalance: running, bucket: isProfit ? 'profit_share' : debit > 0 ? 'payment' : 'supplier' };
  });
  const profitAllocations = db.prepare(`SELECT spa.id, spa.amount, spa.allocationType, spa.snapshotId FROM sale_profit_allocations spa WHERE spa.sourceStatus='active' AND spa.storePartnerId IN (SELECT storePartnerId FROM store_partner_legacy_links WHERE legacyPartnerId=?) ORDER BY spa.id`).all(partnerId);
  return {
    canonicalBalance: rows.reduce((sum, row) => sum + Number(row.credit || 0) - Number(row.debit || 0), 0),
    supplierReceivable: supplierCredits - supplierDebits,
    supplierCredits,
    supplierDebits,
    totalPayments: rows.reduce((sum, row) => sum + Number(row.debit || 0), 0),
    totalIncreases: rows.reduce((sum, row) => sum + Number(row.credit || 0), 0),
    profitShareAccrued: profitAllocations.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    entries,
    profitAllocations,
  };
}

export function closePeriodForValidation(db, periodStart, periodEnd) {
  const payload = {
    schemaVersion: 1,
    periodStart,
    periodEnd,
    metrics: {
      salesOrdersTotal: Number(db.prepare(`SELECT COALESCE(SUM(COALESCE(grandTotal,0)),0) value FROM sales_orders WHERE COALESCE(status,'active')='active' AND date(transactionDate) BETWEEN date(?) AND date(?)`).get(periodStart, periodEnd).value || 0),
      partnerLedgerNet: Number(db.prepare(`SELECT COALESCE(SUM(COALESCE(credit,0)-COALESCE(debit,0)),0) value FROM partner_ledger WHERE date(transactionDate) BETWEEN date(?) AND date(?)`).get(periodStart, periodEnd).value || 0),
      installmentReceiptsTotal: Number(db.prepare(`SELECT COALESCE(SUM(COALESCE(amount_paid,0)),0) value FROM installment_transactions WHERE date(payment_date) BETWEEN date(?) AND date(?)`).get(periodStart, periodEnd).value || 0),
    },
  };
  const payloadJson = JSON.stringify(payload);
  const sha256 = sha256Text(payloadJson);
  db.exec('BEGIN IMMEDIATE');
  try {
    const lock = db.prepare(`INSERT INTO accounting_period_locks(periodStart,periodEnd,closeReason,closedByUsername,closedByRole) VALUES(?,?,?,?,?)`).run(periodStart, periodEnd, 'v337 validation', 'release-validator', 'Admin');
    const lockId = Number(lock.lastInsertRowid);
    const version = Number(db.prepare(`SELECT COALESCE(MAX(version),0)+1 nextVersion FROM accounting_period_snapshots WHERE periodStart=? AND periodEnd=?`).get(periodStart,periodEnd).nextVersion || 1);
    const snap = db.prepare(`INSERT INTO accounting_period_snapshots(lockId,periodStart,periodEnd,version,payloadJson,sha256,createdByUsername) VALUES(?,?,?,?,?,?,?)`).run(lockId, periodStart, periodEnd, version, payloadJson, sha256, 'release-validator');
    const snapshotId = Number(snap.lastInsertRowid);
    db.prepare(`UPDATE accounting_period_locks SET snapshotId=? WHERE id=?`).run(snapshotId, lockId);
    db.exec('COMMIT');
    return { lockId, snapshotId, version, sha256, payload };
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch {}
    throw error;
  }
}

export function expectClosedPeriodError(fn, label) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  if (!caught || !String(caught.message || caught).includes('accounting period is closed')) {
    throw new Error(`${label}: expected accounting period is closed, got ${caught ? String(caught.message || caught) : 'no error'}`);
  }
  return String(caught.message || caught);
}
