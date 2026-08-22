// Extracted from server/db/core/initRuntime.ts. Preserve SQL/order exactly.
import { runAsync, allAsync } from "../query";
import { backfillCustomerLedgerReferences } from "../core/maintenance";

export const createCustomersSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      nationalCode TEXT,
      phoneNumber TEXT UNIQUE,
      address TEXT,
      notes TEXT,
      tags TEXT,
      dateAdded TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);
  console.log("Customers table ensured.");

  // Targeted indexes for customer lookup and stable alphabetical lists.
  // phoneNumber is already indexed by its UNIQUE constraint, so no duplicate index is created.
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_customers_full_name_nocase ON customers(fullName COLLATE NOCASE);`,
  );
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_customers_full_name_normalized ON customers(
      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(fullName, 'ي', 'ی'), 'ك', 'ک'), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا') COLLATE NOCASE
    );`,
  );

  // Contract identity. Nullable by design so ordinary CRM registration remains possible;
  // contract readiness requires a valid 10-digit value before printing.
  try {
    await runAsync("ALTER TABLE customers ADD COLUMN nationalCode TEXT");
    console.log("Customers table: nationalCode column added.");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || "")) {
      console.error("Error adding nationalCode column to customers table:", e?.message || e);
    }
  }
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_customers_national_code ON customers(nationalCode);`,
  );

  // Customer tags (CRM)
  // Older databases may not have the column; try to add it.
  try {
    await runAsync("ALTER TABLE customers ADD COLUMN tags TEXT");
    console.log("Customers table: tags column added.");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || "")) {
      console.error(
        "Error adding tags column to customers table:",
        e?.message || e,
      );
    }
  }

  // Customer risk override (CRM)
  try {
    await runAsync("ALTER TABLE customers ADD COLUMN riskOverride TEXT");
    console.log("Customers table: riskOverride column added.");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || "")) {
      console.error(
        "Error adding riskOverride column to customers table:",
        e?.message || e,
      );
    }
  }

  // Telegram chat id (optional, for direct customer messaging)
  try {
    await runAsync("ALTER TABLE customers ADD COLUMN telegramChatId TEXT");
    console.log("Customers table: telegramChatId column added.");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || "")) {
      console.error(
        "Error adding telegramChatId column to customers table:",
        e?.message || e,
      );
    }
  }

  // -------------------------------------------
  // Telegram linking (Model A)
  // هدف: لینک امن مشتری به تلگرام با OTP
  // ستون‌ها:
  //  - telegram_chat_id: chat_id مقصد برای ارسال پیام
  //  - telegram_user_id: user id تلگرام (برای audit/anti-fraud)
  //  - telegram_linked_at: زمان لینک شدن (ISO)
  //  - telegram_opted_out: لغو دریافت اعلان‌ها (0/1)
  // -------------------------------------------
  try {
    await runAsync("ALTER TABLE customers ADD COLUMN telegram_chat_id TEXT");
    console.log("Customers table: telegram_chat_id column added.");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || "")) {
      console.error(
        "Error adding telegram_chat_id column to customers table:",
        e?.message || e,
      );
    }
  }
  try {
    await runAsync("ALTER TABLE customers ADD COLUMN telegram_user_id TEXT");
    console.log("Customers table: telegram_user_id column added.");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || "")) {
      console.error(
        "Error adding telegram_user_id column to customers table:",
        e?.message || e,
      );
    }
  }
  try {
    await runAsync(
      "ALTER TABLE customers ADD COLUMN telegram_linked_at TEXT",
    );
    console.log("Customers table: telegram_linked_at column added.");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || "")) {
      console.error(
        "Error adding telegram_linked_at column to customers table:",
        e?.message || e,
      );
    }
  }
  // SQLite: ADD COLUMN with DEFAULT works, but NOT NULL may be problematic on some older engines.
  // We keep it nullable with DEFAULT 0 semantics.
  try {
    await runAsync(
      "ALTER TABLE customers ADD COLUMN telegram_opted_out INTEGER DEFAULT 0",
    );
    await runAsync(
      "ALTER TABLE customers ADD COLUMN telegram_invalid INTEGER DEFAULT 0",
    ).catch(() => {});
    await runAsync(
      "ALTER TABLE customers ADD COLUMN telegram_invalid_reason TEXT",
    ).catch(() => {});
    await runAsync(
      "ALTER TABLE customers ADD COLUMN telegram_invalid_at TEXT",
    ).catch(() => {});
    console.log("Customers table: telegram_opted_out column added.");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || "")) {
      console.error(
        "Error adding telegram_opted_out column to customers table:",
        e?.message || e,
      );
    }
  }

  // Helpful indexes (safe)
  try {
    await runAsync(
      "CREATE INDEX IF NOT EXISTS idx_customers_telegram_chat_id ON customers(telegram_chat_id);",
    );
    await runAsync(
      "CREATE INDEX IF NOT EXISTS idx_customers_telegram_user_id ON customers(telegram_user_id);",
    );
    console.log("Customers table: telegram indexes ensured.");
  } catch (e: any) {
    console.error(
      "Error ensuring telegram indexes on customers table:",
      e?.message || e,
    );
  }

  // Pending telegram link requests (OTP flow)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS telegram_link_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      telegram_user_id TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      verified_at TEXT,
      UNIQUE(chat_id)
    );
  `);
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_tglink_phone ON telegram_link_requests(phone);`,
  );
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_tglink_status ON telegram_link_requests(status);`,
  );
  console.log("Telegram_link_requests table ensured.");

  // One-tap QR link tokens (for in-store linking)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS telegram_link_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      expected_phone TEXT,
      expires_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'issued', -- issued | await_contact | await_otp | used | expired | canceled
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      used_at TEXT,
      chat_id TEXT,
      telegram_user_id TEXT,
      last_error TEXT
    );
  `);
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_tgtokens_customer ON telegram_link_tokens(customer_id);`,
  );
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_tgtokens_status ON telegram_link_tokens(status);`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS customer_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerId INTEGER NOT NULL,
      transactionDate TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      description TEXT NOT NULL,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      balance REAL NOT NULL,
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
    );
  `);
  console.log("Customer_ledger table ensured.");
  // This index is critical for balance lookups used by searchable customer selects.
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_activity ON customer_ledger(customerId, transactionDate DESC, id DESC);",
  );
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
  // Supports server-side ledger paging by the effective activity timestamp without scanning the full customer ledger.
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_effective_activity ON customer_ledger(customerId, COALESCE(updatedAt, createdAt, transactionDate) DESC, id DESC);",
  );
  try {
    await runAsync(
      "ALTER TABLE customer_ledger ADD COLUMN referenceType TEXT",
    );
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error(
        "Error adding customer_ledger.referenceType:",
        e?.message || e,
      );
  }
  try {
    await runAsync(
      "ALTER TABLE customer_ledger ADD COLUMN referenceId INTEGER",
    );
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error(
        "Error adding customer_ledger.referenceId:",
        e?.message || e,
      );
  }
  try {
    await runAsync(
      "CREATE INDEX IF NOT EXISTS idx_customer_ledger_reference ON customer_ledger(referenceType, referenceId)",
    );
  } catch (e: any) {
    console.error(
      "Error creating idx_customer_ledger_reference:",
      e?.message || e,
    );
  }
  try {
    await backfillCustomerLedgerReferences();
  } catch (e: any) {
    console.error(
      "Error backfilling customer_ledger references:",
      e?.message || e,
    );
  }
  try {
    const ledgerRefsToBackfill = await allAsync(`
      SELECT id, description, debit, credit, referenceType, referenceId
        FROM customer_ledger
       WHERE referenceId IS NULL OR referenceType IS NULL OR TRIM(COALESCE(referenceType,'')) = ''
    `);
    for (const row of ledgerRefsToBackfill as any[]) {
      const desc = String(row?.description || "");
      const invoiceNo = Number(
        desc.match(
          /(?:فاکتور(?: فروش)?(?: اعتباری| نقدی)? شماره|مرجوعی فاکتور شماره|پرداخت فاکتور شماره|invoice\s*#?)\s*(\d+)/i,
        )?.[1] || 0,
      );
      if (!invoiceNo) continue;
      let referenceType = String(row?.referenceType || "").trim();
      if (!referenceType) {
        if (
          Number(row?.credit || 0) > 0 &&
          /مرجوعی فاکتور|پرداخت فاکتور|invoice/i.test(desc)
        )
          referenceType = "sales_order_payment";
        else if (Number(row?.debit || 0) > 0 && /فاکتور فروش/i.test(desc))
          referenceType = "sales_order_charge";
      }
      if (!referenceType) continue;
      await runAsync(
        `UPDATE customer_ledger SET referenceType = ?, referenceId = COALESCE(referenceId, ?) WHERE id = ?`,
        [referenceType, invoiceNo, row.id],
      );
    }
  } catch (e: any) {
    console.error(
      "Error backfilling customer_ledger references:",
      e?.message || e,
    );
  }

  await runAsync(`
    CREATE TABLE IF NOT EXISTS customer_followups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerId INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      createdByUserId INTEGER,
      createdByUsername TEXT,
      note TEXT NOT NULL,
      nextFollowupDate TEXT, -- optional ISO
      status TEXT NOT NULL DEFAULT 'open', -- open/closed
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
    );
  `);
  console.log("Customer_followups table ensured.");
};
