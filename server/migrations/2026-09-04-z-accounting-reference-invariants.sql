-- v340: explicit standalone accounting documents + mandatory ledger references.
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
CREATE INDEX IF NOT EXISTS idx_accounting_manual_documents_account ON accounting_manual_documents(accountType, accountId, transactionDate DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_manual_documents_replacement ON accounting_manual_documents(replacesDocumentId);

CREATE TRIGGER IF NOT EXISTS trg_accounting_manual_documents_no_update
BEFORE UPDATE ON accounting_manual_documents
BEGIN SELECT RAISE(ABORT, 'accounting_manual_documents is append-only'); END;

CREATE TRIGGER IF NOT EXISTS trg_accounting_manual_documents_no_delete
BEFORE DELETE ON accounting_manual_documents
BEGIN SELECT RAISE(ABORT, 'accounting_manual_documents is append-only'); END;

-- Ledger movement invariants also live in the migration path so an existing
-- database receives the same protection as a fresh schema. Partner movements
-- are always one-sided. Customer cash-sale charges may be an explicit equal
-- debit+credit pair so they remain visible without changing receivable balance.
DROP TRIGGER IF EXISTS trg_partner_ledger_movement_insert_guard;
DROP TRIGGER IF EXISTS trg_partner_ledger_movement_update_guard;
DROP TRIGGER IF EXISTS trg_customer_ledger_movement_insert_guard;
DROP TRIGGER IF EXISTS trg_customer_ledger_movement_update_guard;

CREATE TRIGGER trg_partner_ledger_movement_insert_guard
BEFORE INSERT ON partner_ledger
WHEN COALESCE(NEW.debit,0) < 0
  OR COALESCE(NEW.credit,0) < 0
  OR ((COALESCE(NEW.debit,0) > 0) = (COALESCE(NEW.credit,0) > 0))
BEGIN SELECT RAISE(ABORT, 'invalid partner ledger movement'); END;

CREATE TRIGGER trg_partner_ledger_movement_update_guard
BEFORE UPDATE OF debit, credit ON partner_ledger
WHEN COALESCE(NEW.debit,0) < 0
  OR COALESCE(NEW.credit,0) < 0
  OR ((COALESCE(NEW.debit,0) > 0) = (COALESCE(NEW.credit,0) > 0))
BEGIN SELECT RAISE(ABORT, 'invalid partner ledger movement'); END;

CREATE TRIGGER trg_customer_ledger_movement_insert_guard
BEFORE INSERT ON customer_ledger
WHEN COALESCE(NEW.debit,0) < 0
  OR COALESCE(NEW.credit,0) < 0
  OR (COALESCE(NEW.debit,0) <= 0 AND COALESCE(NEW.credit,0) <= 0)
  OR (
    COALESCE(NEW.debit,0) > 0 AND COALESCE(NEW.credit,0) > 0
    AND (
      ABS(COALESCE(NEW.debit,0) - COALESCE(NEW.credit,0)) > 0.00001
      OR LOWER(TRIM(COALESCE(NEW.referenceType,''))) NOT IN ('sales_order_charge','sales_transaction_charge','installment_charge')
    )
  )
BEGIN SELECT RAISE(ABORT, 'invalid customer ledger movement'); END;

CREATE TRIGGER trg_customer_ledger_movement_update_guard
BEFORE UPDATE OF debit, credit, referenceType ON customer_ledger
WHEN COALESCE(NEW.debit,0) < 0
  OR COALESCE(NEW.credit,0) < 0
  OR (COALESCE(NEW.debit,0) <= 0 AND COALESCE(NEW.credit,0) <= 0)
  OR (
    COALESCE(NEW.debit,0) > 0 AND COALESCE(NEW.credit,0) > 0
    AND (
      ABS(COALESCE(NEW.debit,0) - COALESCE(NEW.credit,0)) > 0.00001
      OR LOWER(TRIM(COALESCE(NEW.referenceType,''))) NOT IN ('sales_order_charge','sales_transaction_charge','installment_charge')
    )
  )
BEGIN SELECT RAISE(ABORT, 'invalid customer ledger movement'); END;

-- New ledger rows must always point to a concrete source document.
CREATE TRIGGER IF NOT EXISTS trg_customer_ledger_reference_insert_guard
BEFORE INSERT ON customer_ledger
WHEN TRIM(COALESCE(NEW.referenceType,'')) = '' OR COALESCE(NEW.referenceId,0) <= 0
BEGIN SELECT RAISE(ABORT, 'customer ledger reference is required'); END;

CREATE TRIGGER IF NOT EXISTS trg_partner_ledger_reference_insert_guard
BEFORE INSERT ON partner_ledger
WHEN TRIM(COALESCE(NEW.referenceType,'')) = '' OR COALESCE(NEW.referenceId,0) <= 0
BEGIN SELECT RAISE(ABORT, 'partner ledger reference is required'); END;

CREATE TRIGGER IF NOT EXISTS trg_customer_ledger_reference_update_guard
BEFORE UPDATE OF referenceType, referenceId ON customer_ledger
WHEN TRIM(COALESCE(NEW.referenceType,'')) = '' OR COALESCE(NEW.referenceId,0) <= 0
BEGIN SELECT RAISE(ABORT, 'customer ledger reference is required'); END;

CREATE TRIGGER IF NOT EXISTS trg_partner_ledger_reference_update_guard
BEFORE UPDATE OF referenceType, referenceId ON partner_ledger
WHEN TRIM(COALESCE(NEW.referenceType,'')) = '' OR COALESCE(NEW.referenceId,0) <= 0
BEGIN SELECT RAISE(ABORT, 'partner ledger reference is required'); END;

-- A manual reference must resolve to the same account and exact frozen movement.
CREATE TRIGGER IF NOT EXISTS trg_customer_manual_document_reference_guard
BEFORE INSERT ON customer_ledger
WHEN LOWER(TRIM(COALESCE(NEW.referenceType,''))) = 'manual_accounting_document'
 AND NOT EXISTS (
   SELECT 1 FROM accounting_manual_documents amd
    WHERE amd.id = NEW.referenceId
      AND amd.accountType = 'customer'
      AND amd.accountId = NEW.customerId
      AND amd.direction = CASE WHEN COALESCE(NEW.debit,0) > 0 THEN 'debit' ELSE 'credit' END
      AND ABS(amd.amount - CASE WHEN COALESCE(NEW.debit,0) > 0 THEN COALESCE(NEW.debit,0) ELSE COALESCE(NEW.credit,0) END) <= 0.00001
      AND datetime(amd.transactionDate) = datetime(NEW.transactionDate)
 )
BEGIN SELECT RAISE(ABORT, 'manual customer document mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_partner_manual_document_reference_guard
BEFORE INSERT ON partner_ledger
WHEN LOWER(TRIM(COALESCE(NEW.referenceType,''))) = 'manual_accounting_document'
 AND NOT EXISTS (
   SELECT 1 FROM accounting_manual_documents amd
    WHERE amd.id = NEW.referenceId
      AND amd.accountType = 'partner'
      AND amd.accountId = NEW.partnerId
      AND amd.direction = CASE WHEN COALESCE(NEW.debit,0) > 0 THEN 'debit' ELSE 'credit' END
      AND ABS(amd.amount - CASE WHEN COALESCE(NEW.debit,0) > 0 THEN COALESCE(NEW.debit,0) ELSE COALESCE(NEW.credit,0) END) <= 0.00001
      AND datetime(amd.transactionDate) = datetime(NEW.transactionDate)
 )
BEGIN SELECT RAISE(ABORT, 'manual partner document mismatch'); END;

-- Profit allocations are capped against their own frozen profit component.
-- Loss allocations are valid, but their direction and total magnitude must
-- remain inside the frozen owner_gain/shared_profit amount.
CREATE TRIGGER IF NOT EXISTS trg_sale_profit_allocation_insert_type_guard
BEFORE INSERT ON sale_profit_allocations
WHEN NEW.sourceStatus='active'
 AND LOWER(TRIM(COALESCE(NEW.allocationType,''))) NOT IN ('owner_gain','shared_profit')
BEGIN SELECT RAISE(ABORT, 'unknown active profit allocation type'); END;

CREATE TRIGGER IF NOT EXISTS trg_sale_profit_allocation_insert_component_cap
BEFORE INSERT ON sale_profit_allocations
WHEN NEW.sourceStatus='active' AND (
  (COALESCE(NEW.amount,0) * COALESCE((
    SELECT CASE WHEN NEW.allocationType='owner_gain' THEN ownerGainAmount ELSE sharedProfitAmount END
      FROM sale_profit_snapshots WHERE id=NEW.snapshotId
  ),0)) < -0.00001
  OR (
    COALESCE((SELECT SUM(ABS(COALESCE(spa.amount,0))) FROM sale_profit_allocations spa
              WHERE spa.snapshotId=NEW.snapshotId AND spa.sourceStatus='active' AND spa.allocationType=NEW.allocationType),0)
    + ABS(COALESCE(NEW.amount,0))
  ) > ABS(COALESCE((
    SELECT CASE WHEN NEW.allocationType='owner_gain' THEN ownerGainAmount ELSE sharedProfitAmount END
      FROM sale_profit_snapshots WHERE id=NEW.snapshotId
  ),0)) + 0.00001
)
BEGIN SELECT RAISE(ABORT, 'profit allocation exceeds frozen profit component'); END;

CREATE TRIGGER IF NOT EXISTS trg_sale_profit_allocation_update_component_cap
BEFORE UPDATE OF amount, sourceStatus, snapshotId, allocationType ON sale_profit_allocations
WHEN NEW.sourceStatus='active' AND (
  LOWER(TRIM(COALESCE(NEW.allocationType,''))) NOT IN ('owner_gain','shared_profit')
  OR (COALESCE(NEW.amount,0) * COALESCE((
    SELECT CASE WHEN NEW.allocationType='owner_gain' THEN ownerGainAmount ELSE sharedProfitAmount END
      FROM sale_profit_snapshots WHERE id=NEW.snapshotId
  ),0)) < -0.00001
  OR (
    COALESCE((SELECT SUM(ABS(COALESCE(spa.amount,0))) FROM sale_profit_allocations spa
              WHERE spa.snapshotId=NEW.snapshotId AND spa.sourceStatus='active'
                AND spa.allocationType=NEW.allocationType AND spa.id<>OLD.id),0)
    + ABS(COALESCE(NEW.amount,0))
  ) > ABS(COALESCE((
    SELECT CASE WHEN NEW.allocationType='owner_gain' THEN ownerGainAmount ELSE sharedProfitAmount END
      FROM sale_profit_snapshots WHERE id=NEW.snapshotId
  ),0)) + 0.00001
)
BEGIN SELECT RAISE(ABORT, 'profit allocation exceeds frozen profit component'); END;

-- Canceled/deleted sales may keep history, but their allocations must not remain active.
CREATE TRIGGER IF NOT EXISTS trg_sale_profit_allocation_active_source_guard
BEFORE INSERT ON sale_profit_allocations
WHEN NEW.sourceStatus='active'
 AND COALESCE((SELECT sourceStatus FROM sale_profit_snapshots WHERE id=NEW.snapshotId),'missing') <> 'active'
BEGIN SELECT RAISE(ABORT, 'active allocation requires active sale snapshot'); END;

CREATE TRIGGER IF NOT EXISTS trg_sale_profit_allocation_active_source_update_guard
BEFORE UPDATE OF sourceStatus, snapshotId ON sale_profit_allocations
WHEN NEW.sourceStatus='active'
 AND COALESCE((SELECT sourceStatus FROM sale_profit_snapshots WHERE id=NEW.snapshotId),'missing') <> 'active'
BEGIN SELECT RAISE(ABORT, 'active allocation requires active sale snapshot'); END;

-- Self-contained prerequisite for the source-status cascade below. v338 normally
-- creates this table first; keeping v340 idempotently self-sufficient prevents a
-- migration-order or partial-legacy database from failing before the safety
-- triggers are installed.
CREATE TABLE IF NOT EXISTS sale_profit_capital_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshotId INTEGER NOT NULL,
  storePartnerId INTEGER NOT NULL,
  sharePercent REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  sourceMethod TEXT NOT NULL DEFAULT 'frozen_at_sale',
  sourceStatus TEXT NOT NULL DEFAULT 'active',
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
  UNIQUE(snapshotId, storePartnerId),
  FOREIGN KEY (snapshotId) REFERENCES sale_profit_snapshots(id) ON DELETE CASCADE,
  FOREIGN KEY (storePartnerId) REFERENCES store_partners(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sale_profit_capital_allocations_snapshot ON sale_profit_capital_allocations(snapshotId);
CREATE INDEX IF NOT EXISTS idx_sale_profit_capital_allocations_partner ON sale_profit_capital_allocations(storePartnerId);

-- Source status is authoritative. DB cascades status to both profit and capital
-- allocations even if an application path forgets the secondary UPDATE.
CREATE TRIGGER IF NOT EXISTS trg_sale_profit_snapshot_status_cascade
AFTER UPDATE OF sourceStatus ON sale_profit_snapshots
BEGIN
  UPDATE sale_profit_allocations
     SET sourceStatus=NEW.sourceStatus,
         updatedAt=(strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'))
   WHERE snapshotId=NEW.id AND sourceStatus<>NEW.sourceStatus;
  UPDATE sale_profit_capital_allocations
     SET sourceStatus=NEW.sourceStatus,
         updatedAt=(strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'))
   WHERE snapshotId=NEW.id AND sourceStatus<>NEW.sourceStatus;
END;

-- Positive-amount invariants for payment/check/settlement source rows.
CREATE TRIGGER IF NOT EXISTS trg_installment_transactions_positive_insert
BEFORE INSERT ON installment_transactions
WHEN COALESCE(NEW.amount_paid,0) <= 0
BEGIN SELECT RAISE(ABORT, 'installment transaction amount must be positive'); END;
CREATE TRIGGER IF NOT EXISTS trg_installment_transactions_positive_update
BEFORE UPDATE OF amount_paid ON installment_transactions
WHEN COALESCE(NEW.amount_paid,0) <= 0
BEGIN SELECT RAISE(ABORT, 'installment transaction amount must be positive'); END;

CREATE TRIGGER IF NOT EXISTS trg_installment_checks_positive_insert
BEFORE INSERT ON installment_checks
WHEN COALESCE(NEW.amount,0) <= 0
BEGIN SELECT RAISE(ABORT, 'installment check amount must be positive'); END;
CREATE TRIGGER IF NOT EXISTS trg_installment_checks_positive_update
BEFORE UPDATE OF amount ON installment_checks
WHEN COALESCE(NEW.amount,0) <= 0
BEGIN SELECT RAISE(ABORT, 'installment check amount must be positive'); END;

CREATE TRIGGER IF NOT EXISTS trg_partner_settlement_positive_insert
BEFORE INSERT ON partner_settlement_transactions
WHEN LOWER(TRIM(COALESCE(NEW.status,'active')))='active' AND COALESCE(NEW.amount,0) <= 0
BEGIN SELECT RAISE(ABORT, 'active partner settlement amount must be positive'); END;
CREATE TRIGGER IF NOT EXISTS trg_partner_settlement_positive_update
BEFORE UPDATE OF amount, status ON partner_settlement_transactions
WHEN LOWER(TRIM(COALESCE(NEW.status,'active')))='active' AND COALESCE(NEW.amount,0) <= 0
BEGIN SELECT RAISE(ABORT, 'active partner settlement amount must be positive'); END;
