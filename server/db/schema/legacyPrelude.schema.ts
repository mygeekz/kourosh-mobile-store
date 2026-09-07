// Extracted from server/db/core/initRuntime.ts. Preserve SQL/order exactly.
import { runAsync } from "../query";

export const createLegacyPreludeSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
  `);
  console.log("Categories table ensured.");

  await runAsync(`
    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partnerName TEXT NOT NULL,
      partnerType TEXT NOT NULL DEFAULT 'Supplier',
      contactPerson TEXT,
      phoneNumber TEXT UNIQUE,
      email TEXT,
      address TEXT,
      notes TEXT,
      dateAdded TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);
  console.log("Partners table ensured.");

  // Telegram chat id (optional, for direct partner messaging)
  try {
    await runAsync("ALTER TABLE partners ADD COLUMN telegramChatId TEXT");
    console.log("Partners table: telegramChatId column added.");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || "")) {
      console.error(
        "Error adding telegramChatId column to partners table:",
        e?.message || e,
      );
    }
  }
  try {
    await runAsync("ALTER TABLE partners ADD COLUMN telegram_linked_at TEXT");
    console.log("Partners table: telegram_linked_at column added.");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || "")) {
      console.error(
        "Error adding telegram_linked_at column to partners table:",
        e?.message || e,
      );
    }
  }
  await runAsync(`
  	  CREATE TABLE IF NOT EXISTS installment_transactions (
  		id INTEGER PRIMARY KEY AUTOINCREMENT,
  		installment_payment_id INTEGER NOT NULL,
  		amount_paid REAL NOT NULL,
  		payment_date TEXT NOT NULL,
  		notes TEXT,
  		FOREIGN KEY (installment_payment_id) REFERENCES installment_payments(id) ON DELETE CASCADE
  	  );
  	`);
  console.log("Installment_transactions table ensured.");

  await runAsync(`
    CREATE TABLE IF NOT EXISTS partner_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partnerId INTEGER NOT NULL,
      transactionDate TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      description TEXT NOT NULL,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      balance REAL NOT NULL,
      referenceType TEXT, -- 'phone_purchase', 'product_purchase', 'manual_payment', 'repair_fee', 'other'
      referenceId INTEGER, -- phone.id, product.id, repair.id or null
      settlementBatchId TEXT, -- groups product-based settlement payments created in one batch
      changeHistoryJson TEXT,
      FOREIGN KEY (partnerId) REFERENCES partners(id) ON DELETE CASCADE
    );
  `);
  console.log(
    "Partner_ledger table ensured and enhanced with referenceType/ID.",
  );
  try {
    await runAsync("ALTER TABLE partner_ledger ADD COLUMN createdAt TEXT");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error(
        "Error adding partner_ledger.createdAt:",
        e?.message || e,
      );
  }
  try {
    await runAsync("ALTER TABLE partner_ledger ADD COLUMN updatedAt TEXT");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error(
        "Error adding partner_ledger.updatedAt:",
        e?.message || e,
      );
  }
  try {
    await runAsync(
      "ALTER TABLE partner_ledger ADD COLUMN settlementBatchId TEXT",
    );
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error(
        "Error adding partner_ledger.settlementBatchId:",
        e?.message || e,
      );
  }
  try {
    await runAsync(
      "ALTER TABLE partner_ledger ADD COLUMN changeHistoryJson TEXT",
    );
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error(
        "Error adding partner_ledger.changeHistoryJson:",
        e?.message || e,
      );
  }
  try {
    await runAsync(
      "CREATE INDEX IF NOT EXISTS idx_partner_ledger_settlement_batch ON partner_ledger(settlementBatchId)",
    );
  } catch (e: any) {
    console.error(
      "Error creating idx_partner_ledger_settlement_batch:",
      e?.message || e,
    );
  }
  try {
    await runAsync(
      "CREATE INDEX IF NOT EXISTS idx_partner_ledger_partner_activity ON partner_ledger(partnerId, transactionDate DESC, id DESC)",
    );
    await runAsync(
      "CREATE INDEX IF NOT EXISTS idx_partner_ledger_partner_reference ON partner_ledger(partnerId, referenceType, referenceId)",
    );
    await runAsync(
      "CREATE INDEX IF NOT EXISTS idx_partner_ledger_partner_batch_activity ON partner_ledger(partnerId, settlementBatchId, transactionDate DESC, id DESC)",
    );
  } catch (e: any) {
    console.error(
      "Error creating partner ledger directory indexes:",
      e?.message || e,
    );
  }
  try {
    await runAsync("ALTER TABLE customer_ledger ADD COLUMN createdAt TEXT");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error(
        "Error adding customer_ledger.createdAt:",
        e?.message || e,
      );
  }
  try {
    await runAsync("ALTER TABLE customer_ledger ADD COLUMN updatedAt TEXT");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error(
        "Error adding customer_ledger.updatedAt:",
        e?.message || e,
      );
  }
  const backfillLedgerTimestamps = async (
    tableName: string,
    dateColumn: string,
  ) => {
    try {
      await runAsync(
        `UPDATE ${tableName} SET createdAt = COALESCE(createdAt, ${dateColumn}, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')), updatedAt = COALESCE(updatedAt, createdAt, ${dateColumn}, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')) WHERE createdAt IS NULL OR updatedAt IS NULL`,
      );
    } catch (e: any) {
      console.error(
        `Error backfilling ${tableName} timestamps:`,
        e?.message || e,
      );
    }
  };
  await backfillLedgerTimestamps("customer_ledger", "transactionDate");
  await backfillLedgerTimestamps("partner_ledger", "transactionDate");
};
