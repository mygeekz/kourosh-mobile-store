// Extracted from server/db/core/initRuntime.ts. Preserve SQL/order exactly.
import { runAsync } from "../query";

export const createAuditSchema = async (): Promise<void> => {
  // --- Audit Logs Table ---
  // This table stores a record of user actions for accountability and debugging. Each row
  // captures the user performing the action, their role at the time, the type of action
  // (create/update/delete/login/etc.), the affected entity and its ID (if applicable),
  // a free‑form description of the operation, and a timestamp. See
  // audit_logs.ts for insertion helper. A foreign key links to users table.
  await runAsync(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      username TEXT,
      role TEXT,
      action TEXT NOT NULL,
      entityType TEXT,
      entityId INTEGER,
      description TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);
  console.log("Audit_logs table ensured.");

  // v336: immutable accounting audit trail + reversal links. These tables are
  // append-only accounting evidence; updates/deletes are blocked at SQLite level.
  await runAsync(`
    CREATE TABLE IF NOT EXISTS accounting_audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventType TEXT NOT NULL,
      entityType TEXT NOT NULL,
      entityId INTEGER,
      accountType TEXT,
      accountId INTEGER,
      actorUserId INTEGER,
      actorUsername TEXT,
      actorRole TEXT,
      reason TEXT,
      beforeJson TEXT,
      afterJson TEXT,
      source TEXT NOT NULL DEFAULT 'app',
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_accounting_audit_events_entity ON accounting_audit_events(entityType, entityId, createdAt DESC);`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_accounting_audit_events_account ON accounting_audit_events(accountType, accountId, createdAt DESC);`);
  await runAsync(`
    CREATE TRIGGER IF NOT EXISTS trg_accounting_audit_events_no_update
    BEFORE UPDATE ON accounting_audit_events
    BEGIN
      SELECT RAISE(ABORT, 'accounting_audit_events is append-only');
    END;
  `);
  await runAsync(`
    CREATE TRIGGER IF NOT EXISTS trg_accounting_audit_events_no_delete
    BEFORE DELETE ON accounting_audit_events
    BEGIN
      SELECT RAISE(ABORT, 'accounting_audit_events is append-only');
    END;
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS accounting_reversal_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ledgerKind TEXT NOT NULL CHECK (ledgerKind IN ('partner','customer')),
      originalLedgerId INTEGER NOT NULL,
      reversalLedgerId INTEGER NOT NULL,
      replacementLedgerId INTEGER,
      reason TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      UNIQUE(ledgerKind, originalLedgerId),
      UNIQUE(ledgerKind, reversalLedgerId)
    );
  `);

  // v340: every standalone/manual movement is itself a first-class immutable
  // accounting document. Ledger rows reference this document by ID instead of
  // using a type-only marker with a NULL referenceId.
  await runAsync(`
    CREATE TABLE IF NOT EXISTS accounting_manual_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      accountType TEXT NOT NULL CHECK (accountType IN ('customer','partner')),
      accountId INTEGER NOT NULL CHECK (accountId > 0),
      documentKind TEXT NOT NULL DEFAULT 'standalone_adjustment' CHECK (documentKind IN ('standalone_adjustment','correction_replacement')),
      direction TEXT NOT NULL CHECK (direction IN ('debit','credit')),
      amount REAL NOT NULL CHECK (amount > 0),
      transactionDate TEXT NOT NULL,
      reason TEXT NOT NULL CHECK (length(trim(reason)) >= 3),
      replacesDocumentId INTEGER,
      createdByUserId INTEGER,
      createdByUsername TEXT,
      createdByRole TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (replacesDocumentId) REFERENCES accounting_manual_documents(id)
    );
  `);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_accounting_manual_documents_account ON accounting_manual_documents(accountType, accountId, transactionDate DESC, id DESC);`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_accounting_manual_documents_replacement ON accounting_manual_documents(replacesDocumentId);`);
  await runAsync(`
    CREATE TRIGGER IF NOT EXISTS trg_accounting_manual_documents_no_update
    BEFORE UPDATE ON accounting_manual_documents
    BEGIN SELECT RAISE(ABORT, 'accounting_manual_documents is append-only'); END;
  `);
  await runAsync(`
    CREATE TRIGGER IF NOT EXISTS trg_accounting_manual_documents_no_delete
    BEFORE DELETE ON accounting_manual_documents
    BEGIN SELECT RAISE(ABORT, 'accounting_manual_documents is append-only'); END;
  `);

  // DB-level invariants: manual movements are one-sided. Customer cash-sales are
  // the only deliberate exception: an equal debit+credit pair keeps the sale
  // visible in history while producing zero balance delta. The reference type
  // makes that exception explicit and prevents a manual UI row from using it.
  for (const triggerName of [
    "trg_partner_ledger_movement_insert_guard",
    "trg_partner_ledger_movement_update_guard",
    "trg_customer_ledger_movement_insert_guard",
    "trg_customer_ledger_movement_update_guard",
  ]) {
    await runAsync(`DROP TRIGGER IF EXISTS ${triggerName}`);
  }

  await runAsync(`
    CREATE TRIGGER trg_partner_ledger_movement_insert_guard
    BEFORE INSERT ON partner_ledger
    WHEN COALESCE(NEW.debit,0) < 0
      OR COALESCE(NEW.credit,0) < 0
      OR ((COALESCE(NEW.debit,0) > 0) = (COALESCE(NEW.credit,0) > 0))
    BEGIN
      SELECT RAISE(ABORT, 'invalid partner ledger movement');
    END;
  `);
  await runAsync(`
    CREATE TRIGGER trg_partner_ledger_movement_update_guard
    BEFORE UPDATE OF debit, credit ON partner_ledger
    WHEN COALESCE(NEW.debit,0) < 0
      OR COALESCE(NEW.credit,0) < 0
      OR ((COALESCE(NEW.debit,0) > 0) = (COALESCE(NEW.credit,0) > 0))
    BEGIN
      SELECT RAISE(ABORT, 'invalid partner ledger movement');
    END;
  `);

  const customerMovementGuard = `
      COALESCE(NEW.debit,0) < 0
      OR COALESCE(NEW.credit,0) < 0
      OR (COALESCE(NEW.debit,0) <= 0 AND COALESCE(NEW.credit,0) <= 0)
      OR (
        COALESCE(NEW.debit,0) > 0 AND COALESCE(NEW.credit,0) > 0
        AND (
          ABS(COALESCE(NEW.debit,0) - COALESCE(NEW.credit,0)) > 0.00001
          OR LOWER(TRIM(COALESCE(NEW.referenceType,''))) NOT IN ('sales_order_charge','sales_transaction_charge','installment_charge')
        )
      )`;
  await runAsync(`
    CREATE TRIGGER trg_customer_ledger_movement_insert_guard
    BEFORE INSERT ON customer_ledger
    WHEN ${customerMovementGuard}
    BEGIN
      SELECT RAISE(ABORT, 'invalid customer ledger movement');
    END;
  `);
  await runAsync(`
    CREATE TRIGGER trg_customer_ledger_movement_update_guard
    BEFORE UPDATE OF debit, credit, referenceType ON customer_ledger
    WHEN ${customerMovementGuard}
    BEGIN
      SELECT RAISE(ABORT, 'invalid customer ledger movement');
    END;
  `);

  // v340: reference IDs are mandatory for every NEW financial ledger movement.
  // Legacy rows with missing references remain visible to reconciliation, but no
  // new UI/API path can create another orphan movement.
  for (const triggerName of [
    "trg_customer_ledger_reference_insert_guard",
    "trg_partner_ledger_reference_insert_guard",
    "trg_customer_ledger_reference_update_guard",
    "trg_partner_ledger_reference_update_guard",
    "trg_customer_manual_document_reference_guard",
    "trg_partner_manual_document_reference_guard",
  ]) await runAsync(`DROP TRIGGER IF EXISTS ${triggerName}`);

  await runAsync(`
    CREATE TRIGGER trg_customer_ledger_reference_insert_guard
    BEFORE INSERT ON customer_ledger
    WHEN TRIM(COALESCE(NEW.referenceType,'')) = '' OR COALESCE(NEW.referenceId,0) <= 0
    BEGIN SELECT RAISE(ABORT, 'customer ledger reference is required'); END;
  `);
  await runAsync(`
    CREATE TRIGGER trg_partner_ledger_reference_insert_guard
    BEFORE INSERT ON partner_ledger
    WHEN TRIM(COALESCE(NEW.referenceType,'')) = '' OR COALESCE(NEW.referenceId,0) <= 0
    BEGIN SELECT RAISE(ABORT, 'partner ledger reference is required'); END;
  `);
  await runAsync(`
    CREATE TRIGGER trg_customer_ledger_reference_update_guard
    BEFORE UPDATE OF referenceType, referenceId ON customer_ledger
    WHEN TRIM(COALESCE(NEW.referenceType,'')) = '' OR COALESCE(NEW.referenceId,0) <= 0
    BEGIN SELECT RAISE(ABORT, 'customer ledger reference is required'); END;
  `);
  await runAsync(`
    CREATE TRIGGER trg_partner_ledger_reference_update_guard
    BEFORE UPDATE OF referenceType, referenceId ON partner_ledger
    WHEN TRIM(COALESCE(NEW.referenceType,'')) = '' OR COALESCE(NEW.referenceId,0) <= 0
    BEGIN SELECT RAISE(ABORT, 'partner ledger reference is required'); END;
  `);
  await runAsync(`
    CREATE TRIGGER trg_customer_manual_document_reference_guard
    BEFORE INSERT ON customer_ledger
    WHEN LOWER(TRIM(COALESCE(NEW.referenceType,''))) = 'manual_accounting_document'
     AND NOT EXISTS (
       SELECT 1 FROM accounting_manual_documents amd
        WHERE amd.id = NEW.referenceId AND amd.accountType='customer' AND amd.accountId=NEW.customerId
          AND amd.direction = CASE WHEN COALESCE(NEW.debit,0)>0 THEN 'debit' ELSE 'credit' END
          AND ABS(amd.amount - CASE WHEN COALESCE(NEW.debit,0)>0 THEN COALESCE(NEW.debit,0) ELSE COALESCE(NEW.credit,0) END) <= 0.00001
          AND datetime(amd.transactionDate) = datetime(NEW.transactionDate)
     )
    BEGIN SELECT RAISE(ABORT, 'manual customer document mismatch'); END;
  `);
  await runAsync(`
    CREATE TRIGGER trg_partner_manual_document_reference_guard
    BEFORE INSERT ON partner_ledger
    WHEN LOWER(TRIM(COALESCE(NEW.referenceType,''))) = 'manual_accounting_document'
     AND NOT EXISTS (
       SELECT 1 FROM accounting_manual_documents amd
        WHERE amd.id = NEW.referenceId AND amd.accountType='partner' AND amd.accountId=NEW.partnerId
          AND amd.direction = CASE WHEN COALESCE(NEW.debit,0)>0 THEN 'debit' ELSE 'credit' END
          AND ABS(amd.amount - CASE WHEN COALESCE(NEW.debit,0)>0 THEN COALESCE(NEW.debit,0) ELSE COALESCE(NEW.credit,0) END) <= 0.00001
          AND datetime(amd.transactionDate) = datetime(NEW.transactionDate)
     )
    BEGIN SELECT RAISE(ABORT, 'manual partner document mismatch'); END;
  `);

  // v340 profit/payment invariants. Loss allocations are valid; each active
  // allocation is bounded by its own frozen owner_gain/shared_profit component.
  for (const triggerName of [
    "trg_sale_profit_allocation_insert_cap",
    "trg_sale_profit_allocation_insert_total_cap",
    "trg_sale_profit_allocation_update_total_cap",
    "trg_sale_profit_allocation_insert_type_guard",
    "trg_sale_profit_allocation_insert_component_cap",
    "trg_sale_profit_allocation_update_component_cap",
    "trg_sale_profit_allocation_active_source_guard",
    "trg_sale_profit_allocation_active_source_update_guard",
    "trg_sale_profit_snapshot_status_cascade",
    "trg_installment_transactions_positive_insert",
    "trg_installment_transactions_positive_update",
    "trg_installment_checks_positive_insert",
    "trg_installment_checks_positive_update",
    "trg_partner_settlement_positive_insert",
    "trg_partner_settlement_positive_update",
  ]) await runAsync(`DROP TRIGGER IF EXISTS ${triggerName}`);
  await runAsync(`
    CREATE TRIGGER trg_sale_profit_allocation_insert_type_guard
    BEFORE INSERT ON sale_profit_allocations
    WHEN NEW.sourceStatus='active'
      AND LOWER(TRIM(COALESCE(NEW.allocationType,''))) NOT IN ('owner_gain','shared_profit')
    BEGIN SELECT RAISE(ABORT, 'unknown active profit allocation type'); END;
  `);
  await runAsync(`
    CREATE TRIGGER trg_sale_profit_allocation_insert_component_cap
    BEFORE INSERT ON sale_profit_allocations
    WHEN NEW.sourceStatus='active' AND (
      (COALESCE(NEW.amount,0) * COALESCE((SELECT CASE WHEN NEW.allocationType='owner_gain' THEN ownerGainAmount ELSE sharedProfitAmount END FROM sale_profit_snapshots WHERE id=NEW.snapshotId),0)) < -0.00001
      OR (COALESCE((SELECT SUM(ABS(COALESCE(spa.amount,0))) FROM sale_profit_allocations spa WHERE spa.snapshotId=NEW.snapshotId AND spa.sourceStatus='active' AND spa.allocationType=NEW.allocationType),0) + ABS(COALESCE(NEW.amount,0)))
         > ABS(COALESCE((SELECT CASE WHEN NEW.allocationType='owner_gain' THEN ownerGainAmount ELSE sharedProfitAmount END FROM sale_profit_snapshots WHERE id=NEW.snapshotId),0)) + 0.00001
    )
    BEGIN SELECT RAISE(ABORT, 'profit allocation exceeds frozen profit component'); END;
  `);
  await runAsync(`
    CREATE TRIGGER trg_sale_profit_allocation_update_component_cap
    BEFORE UPDATE OF amount, sourceStatus, snapshotId, allocationType ON sale_profit_allocations
    WHEN NEW.sourceStatus='active' AND (
      LOWER(TRIM(COALESCE(NEW.allocationType,''))) NOT IN ('owner_gain','shared_profit')
      OR (COALESCE(NEW.amount,0) * COALESCE((SELECT CASE WHEN NEW.allocationType='owner_gain' THEN ownerGainAmount ELSE sharedProfitAmount END FROM sale_profit_snapshots WHERE id=NEW.snapshotId),0)) < -0.00001
      OR (COALESCE((SELECT SUM(ABS(COALESCE(spa.amount,0))) FROM sale_profit_allocations spa WHERE spa.snapshotId=NEW.snapshotId AND spa.sourceStatus='active' AND spa.allocationType=NEW.allocationType AND spa.id<>OLD.id),0) + ABS(COALESCE(NEW.amount,0)))
         > ABS(COALESCE((SELECT CASE WHEN NEW.allocationType='owner_gain' THEN ownerGainAmount ELSE sharedProfitAmount END FROM sale_profit_snapshots WHERE id=NEW.snapshotId),0)) + 0.00001
    )
    BEGIN SELECT RAISE(ABORT, 'profit allocation exceeds frozen profit component'); END;
  `);
  await runAsync(`
    CREATE TRIGGER trg_sale_profit_allocation_active_source_guard
    BEFORE INSERT ON sale_profit_allocations
    WHEN NEW.sourceStatus='active' AND COALESCE((SELECT sourceStatus FROM sale_profit_snapshots WHERE id=NEW.snapshotId),'missing') <> 'active'
    BEGIN SELECT RAISE(ABORT, 'active allocation requires active sale snapshot'); END;
  `);
  await runAsync(`
    CREATE TRIGGER trg_sale_profit_allocation_active_source_update_guard
    BEFORE UPDATE OF sourceStatus, snapshotId ON sale_profit_allocations
    WHEN NEW.sourceStatus='active' AND COALESCE((SELECT sourceStatus FROM sale_profit_snapshots WHERE id=NEW.snapshotId),'missing') <> 'active'
    BEGIN SELECT RAISE(ABORT, 'active allocation requires active sale snapshot'); END;
  `);
  await runAsync(`
    CREATE TRIGGER trg_sale_profit_snapshot_status_cascade
    AFTER UPDATE OF sourceStatus ON sale_profit_snapshots
    BEGIN
      UPDATE sale_profit_allocations SET sourceStatus=NEW.sourceStatus, updatedAt=(strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')) WHERE snapshotId=NEW.id AND sourceStatus<>NEW.sourceStatus;
      UPDATE sale_profit_capital_allocations SET sourceStatus=NEW.sourceStatus, updatedAt=(strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')) WHERE snapshotId=NEW.id AND sourceStatus<>NEW.sourceStatus;
    END;
  `);
  await runAsync(`CREATE TRIGGER trg_installment_transactions_positive_insert BEFORE INSERT ON installment_transactions WHEN COALESCE(NEW.amount_paid,0)<=0 BEGIN SELECT RAISE(ABORT, 'installment transaction amount must be positive'); END;`);
  await runAsync(`CREATE TRIGGER trg_installment_transactions_positive_update BEFORE UPDATE OF amount_paid ON installment_transactions WHEN COALESCE(NEW.amount_paid,0)<=0 BEGIN SELECT RAISE(ABORT, 'installment transaction amount must be positive'); END;`);
  await runAsync(`CREATE TRIGGER trg_installment_checks_positive_insert BEFORE INSERT ON installment_checks WHEN COALESCE(NEW.amount,0)<=0 BEGIN SELECT RAISE(ABORT, 'installment check amount must be positive'); END;`);
  await runAsync(`CREATE TRIGGER trg_installment_checks_positive_update BEFORE UPDATE OF amount ON installment_checks WHEN COALESCE(NEW.amount,0)<=0 BEGIN SELECT RAISE(ABORT, 'installment check amount must be positive'); END;`);
  await runAsync(`CREATE TRIGGER trg_partner_settlement_positive_insert BEFORE INSERT ON partner_settlement_transactions WHEN LOWER(TRIM(COALESCE(NEW.status,'active')))='active' AND COALESCE(NEW.amount,0)<=0 BEGIN SELECT RAISE(ABORT, 'active partner settlement amount must be positive'); END;`);
  await runAsync(`CREATE TRIGGER trg_partner_settlement_positive_update BEFORE UPDATE OF amount,status ON partner_settlement_transactions WHEN LOWER(TRIM(COALESCE(NEW.status,'active')))='active' AND COALESCE(NEW.amount,0)<=0 BEGIN SELECT RAISE(ABORT, 'active partner settlement amount must be positive'); END;`);


  // v337: accounting period governance. Closed periods are enforced inside
  // SQLite so API/UI bugs cannot mutate historical financial documents.
  await runAsync(`
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
  `);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_accounting_period_locks_range ON accounting_period_locks(periodStart, periodEnd);`);

  // v342: period state is append-only. The lock row remains historical evidence;
  // reopening/reclosing creates state events instead of rewriting/deleting the lock.
  await runAsync(`
    CREATE TABLE IF NOT EXISTS accounting_period_state_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lockId INTEGER NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('closed','reopened')),
      reason TEXT NOT NULL,
      snapshotId INTEGER,
      actorUserId INTEGER,
      actorUsername TEXT,
      actorRole TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (lockId) REFERENCES accounting_period_locks(id)
    );
  `);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_accounting_period_state_events_lock ON accounting_period_state_events(lockId, id DESC);`);
  await runAsync(`CREATE TRIGGER IF NOT EXISTS trg_accounting_period_state_events_no_update BEFORE UPDATE ON accounting_period_state_events BEGIN SELECT RAISE(ABORT, 'accounting_period_state_events is append-only'); END;`);
  await runAsync(`CREATE TRIGGER IF NOT EXISTS trg_accounting_period_state_events_no_delete BEFORE DELETE ON accounting_period_state_events BEGIN SELECT RAISE(ABORT, 'accounting_period_state_events is append-only'); END;`);

  await runAsync(`
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
  `);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_accounting_period_snapshots_range ON accounting_period_snapshots(periodStart, periodEnd, version DESC);`);
  await runAsync(`
    CREATE TRIGGER IF NOT EXISTS trg_accounting_period_snapshots_no_update
    BEFORE UPDATE ON accounting_period_snapshots
    BEGIN SELECT RAISE(ABORT, 'accounting_period_snapshots is append-only'); END;
  `);
  await runAsync(`
    CREATE TRIGGER IF NOT EXISTS trg_accounting_period_snapshots_no_delete
    BEFORE DELETE ON accounting_period_snapshots
    BEGIN SELECT RAISE(ABORT, 'accounting_period_snapshots is append-only'); END;
  `);

  const lockedDateExists = (dateExpression: string) => `EXISTS (
    SELECT 1 FROM accounting_period_locks apl
    WHERE apl.status = 'closed'
      AND COALESCE((SELECT apse.action FROM accounting_period_state_events apse WHERE apse.lockId=apl.id ORDER BY apse.id DESC LIMIT 1), 'closed') = 'closed'
      AND date(${dateExpression}) BETWEEN date(apl.periodStart) AND date(apl.periodEnd)
  )`;
  const periodGuards: Array<{ table: string; insertDate: string; updateOldDate?: string; updateNewDate?: string; deleteDate?: string }> = [
    { table: 'partner_ledger', insertDate: 'NEW.transactionDate', updateOldDate: 'OLD.transactionDate', updateNewDate: 'NEW.transactionDate', deleteDate: 'OLD.transactionDate' },
    { table: 'customer_ledger', insertDate: 'NEW.transactionDate', updateOldDate: 'OLD.transactionDate', updateNewDate: 'NEW.transactionDate', deleteDate: 'OLD.transactionDate' },
    { table: 'purchases', insertDate: 'NEW.purchaseDate', updateOldDate: 'OLD.purchaseDate', updateNewDate: 'NEW.purchaseDate', deleteDate: 'OLD.purchaseDate' },
    { table: 'sales_orders', insertDate: 'NEW.transactionDate', updateOldDate: 'OLD.transactionDate', updateNewDate: 'NEW.transactionDate', deleteDate: 'OLD.transactionDate' },
    { table: 'sales_transactions', insertDate: 'NEW.transactionDate', updateOldDate: 'OLD.transactionDate', updateNewDate: 'NEW.transactionDate', deleteDate: 'OLD.transactionDate' },
    { table: 'installment_sales', insertDate: "COALESCE(NEW.saleDateISO, NEW.saleDate, NEW.dateCreated)", updateOldDate: "COALESCE(OLD.saleDateISO, OLD.saleDate, OLD.dateCreated)", updateNewDate: "COALESCE(NEW.saleDateISO, NEW.saleDate, NEW.dateCreated)", deleteDate: "COALESCE(OLD.saleDateISO, OLD.saleDate, OLD.dateCreated)" },
    { table: 'installment_payments', insertDate: 'COALESCE(NEW.paymentDate, NEW.dueDate)', updateOldDate: 'COALESCE(OLD.paymentDate, OLD.dueDate)', updateNewDate: 'COALESCE(NEW.paymentDate, NEW.dueDate)', deleteDate: 'COALESCE(OLD.paymentDate, OLD.dueDate)' },
    { table: 'installment_transactions', insertDate: 'NEW.payment_date', updateOldDate: 'OLD.payment_date', updateNewDate: 'NEW.payment_date', deleteDate: 'OLD.payment_date' },
    { table: 'expenses', insertDate: 'NEW.expenseDate', updateOldDate: 'OLD.expenseDate', updateNewDate: 'NEW.expenseDate', deleteDate: 'OLD.expenseDate' },
    { table: 'partner_settlement_transactions', insertDate: 'NEW.settlementDate', updateOldDate: 'OLD.settlementDate', updateNewDate: 'NEW.settlementDate', deleteDate: 'OLD.settlementDate' },
    { table: 'sale_profit_snapshots', insertDate: 'COALESCE(NEW.saleDate, NEW.createdAt)', updateOldDate: 'COALESCE(OLD.saleDate, OLD.createdAt)', updateNewDate: 'COALESCE(NEW.saleDate, NEW.createdAt)', deleteDate: 'COALESCE(OLD.saleDate, OLD.createdAt)' },
    { table: 'sales_returns', insertDate: 'NEW.createdAt', updateOldDate: 'OLD.createdAt', updateNewDate: 'NEW.createdAt', deleteDate: 'OLD.createdAt' },
  ];

  for (const guard of periodGuards) {
    const safe = guard.table.replace(/[^a-z0-9_]/gi, '');
    for (const suffix of ['insert', 'update', 'delete']) await runAsync(`DROP TRIGGER IF EXISTS trg_${safe}_period_lock_${suffix}`);
    await runAsync(`
      CREATE TRIGGER trg_${safe}_period_lock_insert
      BEFORE INSERT ON ${guard.table}
      WHEN ${lockedDateExists(guard.insertDate)}
      BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;
    `);
    await runAsync(`
      CREATE TRIGGER trg_${safe}_period_lock_update
      BEFORE UPDATE ON ${guard.table}
      WHEN ${lockedDateExists(guard.updateOldDate || guard.insertDate)} OR ${lockedDateExists(guard.updateNewDate || guard.insertDate)}
      BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;
    `);
    await runAsync(`
      CREATE TRIGGER trg_${safe}_period_lock_delete
      BEFORE DELETE ON ${guard.table}
      WHEN ${lockedDateExists(guard.deleteDate || guard.insertDate.replace(/NEW\./g, 'OLD.'))}
      BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;
    `);
  }

  // Child line-items inherit the accounting date from their parent document.
  const childGuards: Array<{ table: string; parentTable: string; childFk: string; parentPk: string; parentDate: string }> = [
    { table: 'purchase_items', parentTable: 'purchases', childFk: 'purchaseId', parentPk: 'id', parentDate: 'purchaseDate' },
    { table: 'sales_order_items', parentTable: 'sales_orders', childFk: 'orderId', parentPk: 'id', parentDate: 'transactionDate' },
    { table: 'installment_sale_items', parentTable: 'installment_sales', childFk: 'saleId', parentPk: 'id', parentDate: "COALESCE(saleDateISO, saleDate, dateCreated)" },
  ];
  for (const guard of childGuards) {
    const safe = guard.table.replace(/[^a-z0-9_]/gi, '');
    for (const suffix of ['insert', 'update', 'delete']) await runAsync(`DROP TRIGGER IF EXISTS trg_${safe}_period_lock_${suffix}`);
    const parentLocked = (fkExpr: string) => `EXISTS (
      SELECT 1 FROM ${guard.parentTable} parent
      JOIN accounting_period_locks apl ON apl.status = 'closed'
       AND COALESCE((SELECT apse.action FROM accounting_period_state_events apse WHERE apse.lockId=apl.id ORDER BY apse.id DESC LIMIT 1), 'closed') = 'closed'
       AND date(${guard.parentDate.replace(/\b(saleDateISO|saleDate|dateCreated|purchaseDate|transactionDate)\b/g, 'parent.$1')}) BETWEEN date(apl.periodStart) AND date(apl.periodEnd)
      WHERE parent.${guard.parentPk} = ${fkExpr}
    )`;
    await runAsync(`CREATE TRIGGER trg_${safe}_period_lock_insert BEFORE INSERT ON ${guard.table} WHEN ${parentLocked(`NEW.${guard.childFk}`)} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);
    await runAsync(`CREATE TRIGGER trg_${safe}_period_lock_update BEFORE UPDATE ON ${guard.table} WHEN ${parentLocked(`OLD.${guard.childFk}`)} OR ${parentLocked(`NEW.${guard.childFk}`)} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);
    await runAsync(`CREATE TRIGGER trg_${safe}_period_lock_delete BEFORE DELETE ON ${guard.table} WHEN ${parentLocked(`OLD.${guard.childFk}`)} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);
  }

  // v338: a frozen sale-profit snapshot is historical evidence. Lifecycle fields
  // such as sourceStatus/notes may change, but financial, ownership, supplier and
  // cost-basis facts captured at sale time may not be rewritten in place.
  await runAsync(`DROP TRIGGER IF EXISTS trg_sale_profit_snapshots_frozen_financial_update`);
  await runAsync(`
    CREATE TRIGGER trg_sale_profit_snapshots_frozen_financial_update
    BEFORE UPDATE ON sale_profit_snapshots
    WHEN OLD.snapshotState = 'frozen_at_sale' AND (
      NEW.sourceKind IS NOT OLD.sourceKind OR NEW.sourceId IS NOT OLD.sourceId OR
      NEW.sourceItemRefType IS NOT OLD.sourceItemRefType OR NEW.sourceItemId IS NOT OLD.sourceItemId OR
      NEW.saleDate IS NOT OLD.saleDate OR NEW.itemType IS NOT OLD.itemType OR NEW.itemId IS NOT OLD.itemId OR
      NEW.itemDescription IS NOT OLD.itemDescription OR NEW.quantity IS NOT OLD.quantity OR
      NEW.ownershipProfileId IS NOT OLD.ownershipProfileId OR NEW.ownershipTitle IS NOT OLD.ownershipTitle OR
      NEW.ownershipType IS NOT OLD.ownershipType OR NEW.profitShareProfileId IS NOT OLD.profitShareProfileId OR
      NEW.profitShareProfileTitle IS NOT OLD.profitShareProfileTitle OR
      NEW.initialCostPerUnit IS NOT OLD.initialCostPerUnit OR NEW.marketCostPerUnit IS NOT OLD.marketCostPerUnit OR
      NEW.saleUnitPrice IS NOT OLD.saleUnitPrice OR NEW.itemDiscount IS NOT OLD.itemDiscount OR
      NEW.saleAmount IS NOT OLD.saleAmount OR NEW.initialCostAmount IS NOT OLD.initialCostAmount OR
      NEW.marketCostAmount IS NOT OLD.marketCostAmount OR NEW.ownerGainAmount IS NOT OLD.ownerGainAmount OR
      NEW.sharedProfitAmount IS NOT OLD.sharedProfitAmount OR NEW.totalProfitAmount IS NOT OLD.totalProfitAmount OR
      NEW.supplierIdAtSale IS NOT OLD.supplierIdAtSale OR NEW.supplierNameAtSale IS NOT OLD.supplierNameAtSale OR
      NEW.ownershipSharesJson IS NOT OLD.ownershipSharesJson OR NEW.profitShareSharesJson IS NOT OLD.profitShareSharesJson OR
      NEW.snapshotVersion IS NOT OLD.snapshotVersion OR NEW.snapshotState IS NOT OLD.snapshotState OR
      NEW.sourceCostBasis IS NOT OLD.sourceCostBasis OR NEW.frozenAt IS NOT OLD.frozenAt
    )
    BEGIN SELECT RAISE(ABORT, 'frozen sale profit snapshot cannot be rewritten'); END;
  `);

  // Profit allocations are also immutable for snapshots whose sale date is in a closed period.
  for (const suffix of ['insert', 'update', 'delete']) await runAsync(`DROP TRIGGER IF EXISTS trg_sale_profit_allocations_period_lock_${suffix}`);
  const allocationLocked = (snapshotExpr: string) => `EXISTS (
    SELECT 1 FROM sale_profit_snapshots sps
    JOIN accounting_period_locks apl ON apl.status = 'closed'
      AND COALESCE((SELECT apse.action FROM accounting_period_state_events apse WHERE apse.lockId=apl.id ORDER BY apse.id DESC LIMIT 1), 'closed') = 'closed'
      AND date(COALESCE(sps.saleDate, sps.createdAt)) BETWEEN date(apl.periodStart) AND date(apl.periodEnd)
    WHERE sps.id = ${snapshotExpr}
  )`;
  await runAsync(`CREATE TRIGGER trg_sale_profit_allocations_period_lock_insert BEFORE INSERT ON sale_profit_allocations WHEN ${allocationLocked('NEW.snapshotId')} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);
  await runAsync(`CREATE TRIGGER trg_sale_profit_allocations_period_lock_update BEFORE UPDATE ON sale_profit_allocations WHEN ${allocationLocked('OLD.snapshotId')} OR ${allocationLocked('NEW.snapshotId')} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);
  await runAsync(`CREATE TRIGGER trg_sale_profit_allocations_period_lock_delete BEFORE DELETE ON sale_profit_allocations WHEN ${allocationLocked('OLD.snapshotId')} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);

  for (const suffix of ['insert', 'update', 'delete']) await runAsync(`DROP TRIGGER IF EXISTS trg_sale_profit_capital_allocations_period_lock_${suffix}`);
  await runAsync(`CREATE TRIGGER trg_sale_profit_capital_allocations_period_lock_insert BEFORE INSERT ON sale_profit_capital_allocations WHEN ${allocationLocked('NEW.snapshotId')} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);
  await runAsync(`CREATE TRIGGER trg_sale_profit_capital_allocations_period_lock_update BEFORE UPDATE ON sale_profit_capital_allocations WHEN ${allocationLocked('OLD.snapshotId')} OR ${allocationLocked('NEW.snapshotId')} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);
  await runAsync(`CREATE TRIGGER trg_sale_profit_capital_allocations_period_lock_delete BEFORE DELETE ON sale_profit_capital_allocations WHEN ${allocationLocked('OLD.snapshotId')} BEGIN SELECT RAISE(ABORT, 'accounting period is closed'); END;`);

  // v341: immutable financial identity. Direct financial edits/deletes are blocked
  // even if a UI/repository path is bypassed; corrections append reversals/replacements.
  for (const triggerName of [
    'trg_partner_ledger_no_physical_delete_v341',
    'trg_customer_ledger_no_physical_delete_v341',
    'trg_partner_ledger_financial_fields_immutable_v341',
    'trg_customer_ledger_financial_fields_immutable_v341',
    'trg_sales_orders_no_physical_delete_v341',
    'trg_sales_order_items_no_physical_delete_v341',
    'trg_accounting_reversal_links_no_update_v341',
    'trg_accounting_reversal_links_no_delete_v341',
  ]) await runAsync(`DROP TRIGGER IF EXISTS ${triggerName}`);

  await runAsync(`CREATE TRIGGER trg_partner_ledger_no_physical_delete_v341 BEFORE DELETE ON partner_ledger BEGIN SELECT RAISE(ABORT, 'partner_ledger is append-only; create a reversal instead'); END;`);
  await runAsync(`CREATE TRIGGER trg_customer_ledger_no_physical_delete_v341 BEFORE DELETE ON customer_ledger BEGIN SELECT RAISE(ABORT, 'customer_ledger is append-only; create a reversal instead'); END;`);
  await runAsync(`
    CREATE TRIGGER trg_partner_ledger_financial_fields_immutable_v341
    BEFORE UPDATE ON partner_ledger
    WHEN COALESCE(NEW.partnerId,0) <> COALESCE(OLD.partnerId,0)
      OR COALESCE(NEW.debit,0) <> COALESCE(OLD.debit,0)
      OR COALESCE(NEW.credit,0) <> COALESCE(OLD.credit,0)
      OR COALESCE(NEW.transactionDate,'') <> COALESCE(OLD.transactionDate,'')
      OR COALESCE(NEW.referenceType,'') <> COALESCE(OLD.referenceType,'')
      OR COALESCE(NEW.referenceId,0) <> COALESCE(OLD.referenceId,0)
      OR COALESCE(NEW.settlementBatchId,'') <> COALESCE(OLD.settlementBatchId,'')
    BEGIN SELECT RAISE(ABORT, 'partner_ledger financial fields are immutable; use reversal + replacement'); END;
  `);
  await runAsync(`
    CREATE TRIGGER trg_customer_ledger_financial_fields_immutable_v341
    BEFORE UPDATE ON customer_ledger
    WHEN COALESCE(NEW.customerId,0) <> COALESCE(OLD.customerId,0)
      OR COALESCE(NEW.debit,0) <> COALESCE(OLD.debit,0)
      OR COALESCE(NEW.credit,0) <> COALESCE(OLD.credit,0)
      OR COALESCE(NEW.transactionDate,'') <> COALESCE(OLD.transactionDate,'')
      OR COALESCE(NEW.referenceType,'') <> COALESCE(OLD.referenceType,'')
      OR COALESCE(NEW.referenceId,0) <> COALESCE(OLD.referenceId,0)
    BEGIN SELECT RAISE(ABORT, 'customer_ledger financial fields are immutable; use reversal + replacement'); END;
  `);
  await runAsync(`CREATE TRIGGER trg_sales_orders_no_physical_delete_v341 BEFORE DELETE ON sales_orders BEGIN SELECT RAISE(ABORT, 'sales_orders cannot be physically deleted; cancel/reverse the sale'); END;`);
  await runAsync(`CREATE TRIGGER trg_sales_order_items_no_physical_delete_v341 BEFORE DELETE ON sales_order_items BEGIN SELECT RAISE(ABORT, 'sales_order_items cannot be physically deleted; preserve invoice history'); END;`);
  await runAsync(`CREATE TRIGGER trg_accounting_reversal_links_no_update_v341 BEFORE UPDATE ON accounting_reversal_links BEGIN SELECT RAISE(ABORT, 'accounting_reversal_links is append-only'); END;`);
  await runAsync(`CREATE TRIGGER trg_accounting_reversal_links_no_delete_v341 BEFORE DELETE ON accounting_reversal_links BEGIN SELECT RAISE(ABORT, 'accounting_reversal_links is append-only'); END;`);

};
