-- v341: financial source history is append-only; corrections happen via reversal/replacement.

-- v341 prerequisite: migration must be safe even when the legacy database has
-- not yet passed through the newer schema bootstrap.
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

CREATE TRIGGER IF NOT EXISTS trg_partner_ledger_no_physical_delete_v341
BEFORE DELETE ON partner_ledger
BEGIN
  SELECT RAISE(ABORT, 'partner_ledger is append-only; create a reversal instead');
END;

CREATE TRIGGER IF NOT EXISTS trg_customer_ledger_no_physical_delete_v341
BEFORE DELETE ON customer_ledger
BEGIN
  SELECT RAISE(ABORT, 'customer_ledger is append-only; create a reversal instead');
END;

CREATE TRIGGER IF NOT EXISTS trg_partner_ledger_financial_fields_immutable_v341
BEFORE UPDATE ON partner_ledger
WHEN COALESCE(NEW.partnerId,0) <> COALESCE(OLD.partnerId,0)
  OR COALESCE(NEW.debit,0) <> COALESCE(OLD.debit,0)
  OR COALESCE(NEW.credit,0) <> COALESCE(OLD.credit,0)
  OR COALESCE(NEW.transactionDate,'') <> COALESCE(OLD.transactionDate,'')
  OR COALESCE(NEW.referenceType,'') <> COALESCE(OLD.referenceType,'')
  OR COALESCE(NEW.referenceId,0) <> COALESCE(OLD.referenceId,0)
  OR COALESCE(NEW.settlementBatchId,'') <> COALESCE(OLD.settlementBatchId,'')
BEGIN
  SELECT RAISE(ABORT, 'partner_ledger financial fields are immutable; use reversal + replacement');
END;

CREATE TRIGGER IF NOT EXISTS trg_customer_ledger_financial_fields_immutable_v341
BEFORE UPDATE ON customer_ledger
WHEN COALESCE(NEW.customerId,0) <> COALESCE(OLD.customerId,0)
  OR COALESCE(NEW.debit,0) <> COALESCE(OLD.debit,0)
  OR COALESCE(NEW.credit,0) <> COALESCE(OLD.credit,0)
  OR COALESCE(NEW.transactionDate,'') <> COALESCE(OLD.transactionDate,'')
  OR COALESCE(NEW.referenceType,'') <> COALESCE(OLD.referenceType,'')
  OR COALESCE(NEW.referenceId,0) <> COALESCE(OLD.referenceId,0)
BEGIN
  SELECT RAISE(ABORT, 'customer_ledger financial fields are immutable; use reversal + replacement');
END;

CREATE TRIGGER IF NOT EXISTS trg_sales_orders_no_physical_delete_v341
BEFORE DELETE ON sales_orders
BEGIN
  SELECT RAISE(ABORT, 'sales_orders cannot be physically deleted; cancel/reverse the sale');
END;

CREATE TRIGGER IF NOT EXISTS trg_sales_order_items_no_physical_delete_v341
BEFORE DELETE ON sales_order_items
BEGIN
  SELECT RAISE(ABORT, 'sales_order_items cannot be physically deleted; preserve invoice history');
END;

CREATE TRIGGER IF NOT EXISTS trg_accounting_reversal_links_no_update_v341
BEFORE UPDATE ON accounting_reversal_links
BEGIN
  SELECT RAISE(ABORT, 'accounting_reversal_links is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_accounting_reversal_links_no_delete_v341
BEFORE DELETE ON accounting_reversal_links
BEGIN
  SELECT RAISE(ABORT, 'accounting_reversal_links is append-only');
END;
