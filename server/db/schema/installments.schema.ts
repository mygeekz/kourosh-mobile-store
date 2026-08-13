// Extracted from server/db/core/initRuntime.ts. Preserve SQL/order exactly.
import { runAsync, allAsync, getAsync, execAsync } from "../query";
import { normalizeInstallmentAccountingDate } from "../date";

export const createInstallmentsSchema = async (): Promise<void> => {
  // New Installment Sales Tables
  await runAsync(`
    CREATE TABLE IF NOT EXISTS installment_sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerId INTEGER NOT NULL,
      phoneId INTEGER, -- از نسخه جدید: می‌تواند NULL باشد (فروش خدمات/لوازم بدون گوشی)
      actualSalePrice REAL NOT NULL,
      downPayment REAL NOT NULL,
      numberOfInstallments INTEGER NOT NULL,
      installmentAmount REAL NOT NULL,
      installmentsStartDate TEXT NOT NULL, -- Shamsi Date: jYYYY/jMM/jDD
      saleDate TEXT, -- تاریخ واقعی انجام فروش/خرید اقساطی توسط مشتری
      saleDateISO TEXT, -- تاریخ حسابداری ISO برای فیلترهای دقیق گزارش
      saleType TEXT NOT NULL DEFAULT 'installment', -- installment | check
      itemsSummary TEXT,
      metaJson TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active', -- draft | active | canceled
      canceledAt TEXT,
      cancelReason TEXT,
      cancellationMode TEXT, -- full_reversal | review_required
      cancellationSettlementStatus TEXT, -- settled | refund_due | customer_balance | needs_reconciliation
      cancellationMetaJson TEXT,
      dateCreated TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (phoneId) REFERENCES phones(id) ON DELETE SET NULL
    );
  `);
  console.log("Installment_sales table ensured.");

  // مهاجرت امن: اگر phoneId در دیتابیس‌های قدیمی NOT NULL باشد، جدول را بازسازی می‌کنیم تا NULL را بپذیرد.
  try {
    const cols = await allAsync("PRAGMA table_info(installment_sales);");
    const phoneCol = Array.isArray(cols)
      ? cols.find((c: any) => c?.name === "phoneId")
      : null;
    const phoneNotNull = phoneCol ? Number(phoneCol.notnull) === 1 : false;
    const existingSaleColumns = new Set(
      Array.isArray(cols) ? cols.map((c: any) => String(c?.name || "")) : [],
    );
    if (phoneNotNull) {
      console.log("Migrating installment_sales.phoneId to allow NULL...");
      await execAsync("PRAGMA foreign_keys=OFF;");
      await execAsync("BEGIN TRANSACTION;");
      await runAsync(
        "ALTER TABLE installment_sales RENAME TO installment_sales_old;",
      );
      await runAsync(`
        CREATE TABLE installment_sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customerId INTEGER NOT NULL,
          phoneId INTEGER,
          actualSalePrice REAL NOT NULL,
          downPayment REAL NOT NULL,
          numberOfInstallments INTEGER NOT NULL,
          installmentAmount REAL NOT NULL,
          installmentsStartDate TEXT NOT NULL,
          saleDate TEXT,
          saleDateISO TEXT,
          saleType TEXT NOT NULL DEFAULT 'installment',
          itemsSummary TEXT,
          metaJson TEXT,
          notes TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          canceledAt TEXT,
          cancelReason TEXT,
          cancellationMode TEXT,
          cancellationSettlementStatus TEXT,
          cancellationMetaJson TEXT,
          dateCreated TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
          FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
          FOREIGN KEY (phoneId) REFERENCES phones(id) ON DELETE SET NULL
        );
      `);
      const columnExpr = (name: string, fallback: string) =>
        existingSaleColumns.has(name) ? name : fallback;
      await runAsync(`
        INSERT INTO installment_sales
          (id, customerId, phoneId, actualSalePrice, downPayment, numberOfInstallments, installmentAmount, installmentsStartDate, saleDate, saleDateISO, saleType, itemsSummary, metaJson, notes, status, canceledAt, cancelReason, cancellationMode, cancellationSettlementStatus, cancellationMetaJson, dateCreated)
        SELECT id, customerId, phoneId, actualSalePrice, downPayment, numberOfInstallments, installmentAmount, installmentsStartDate,
               ${columnExpr("saleDate", "NULL")},
               ${columnExpr("saleDateISO", "NULL")},
               ${columnExpr("saleType", "'installment'")},
               ${columnExpr("itemsSummary", "NULL")},
               ${columnExpr("metaJson", "NULL")},
               ${columnExpr("notes", "NULL")},
               ${columnExpr("status", "'active'")},
               ${columnExpr("canceledAt", "NULL")},
               ${columnExpr("cancelReason", "NULL")},
               ${columnExpr("cancellationMode", "NULL")},
               ${columnExpr("cancellationSettlementStatus", "NULL")},
               ${columnExpr("cancellationMetaJson", "NULL")},
               ${columnExpr("dateCreated", "strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')")}
        FROM installment_sales_old;
      `);
      await runAsync("DROP TABLE installment_sales_old;");
      await execAsync("COMMIT;");
      await execAsync("PRAGMA foreign_keys=ON;");
      console.log("Migration installment_sales done.");
    }
  } catch (e: any) {
    try {
      await execAsync("ROLLBACK;");
    } catch {}
    try {
      await execAsync("PRAGMA foreign_keys=ON;");
    } catch {}
    console.error("Migration error installment_sales:", e?.message || e);
  }

  // اطمینان از وجود ستون‌های جدید در دیتابیس‌های قدیمی
  try {
    await runAsync(
      "ALTER TABLE installment_sales ADD COLUMN saleType TEXT NOT NULL DEFAULT 'installment'",
    );
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error("Error adding saleType column:", e?.message || e);
  }
  try {
    await runAsync(
      "ALTER TABLE installment_sales ADD COLUMN itemsSummary TEXT",
    );
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error("Error adding itemsSummary column:", e?.message || e);
  }
  try {
    await runAsync("ALTER TABLE installment_sales ADD COLUMN metaJson TEXT");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error("Error adding metaJson column:", e?.message || e);
  }
  try {
    await runAsync("ALTER TABLE installment_sales ADD COLUMN saleDate TEXT");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error("Error adding saleDate column:", e?.message || e);
  }
  try {
    await runAsync("ALTER TABLE installment_sales ADD COLUMN saleDateISO TEXT");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error("Error adding saleDateISO column:", e?.message || e);
  }
  for (const [columnSql, label] of [
    ["ALTER TABLE installment_sales ADD COLUMN status TEXT NOT NULL DEFAULT 'active'", "status"],
    ["ALTER TABLE installment_sales ADD COLUMN canceledAt TEXT", "canceledAt"],
    ["ALTER TABLE installment_sales ADD COLUMN cancelReason TEXT", "cancelReason"],
    ["ALTER TABLE installment_sales ADD COLUMN cancellationMode TEXT", "cancellationMode"],
    ["ALTER TABLE installment_sales ADD COLUMN cancellationSettlementStatus TEXT", "cancellationSettlementStatus"],
    ["ALTER TABLE installment_sales ADD COLUMN cancellationMetaJson TEXT", "cancellationMetaJson"],
  ] as const) {
    try {
      await runAsync(columnSql);
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || ""))
        console.error(`Error adding installment_sales.${label}:`, e?.message || e);
    }
  }
  await runAsync("UPDATE installment_sales SET status='active' WHERE status IS NULL OR TRIM(status)=''");

  // Backfill امن برای گزارش‌ها: saleDate واقعی را ترجیح می‌دهیم و برای داده‌های
  // قدیمی فقط dateCreated را fallback می‌گیریم. installmentsStartDate تاریخ فروش نیست.
  try {
    const rows = await allAsync(
      "SELECT id, saleDate, dateCreated, saleDateISO FROM installment_sales WHERE saleDateISO IS NULL OR TRIM(saleDateISO) = ''",
    );
    for (const row of rows as any[]) {
      const accountingDate = normalizeInstallmentAccountingDate(
        row?.saleDate,
        row?.dateCreated,
      );
      if (!accountingDate) continue;
      await runAsync("UPDATE installment_sales SET saleDateISO = ? WHERE id = ?", [
        accountingDate,
        row.id,
      ]);
    }
  } catch (e: any) {
    console.error("Error backfilling installment_sales.saleDateISO:", e?.message || e);
  }

  await runAsync(`
    CREATE TABLE IF NOT EXISTS installment_sale_cancellations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saleId INTEGER NOT NULL UNIQUE,
      mode TEXT NOT NULL,
      reason TEXT NOT NULL,
      returnPhysicalItems INTEGER NOT NULL DEFAULT 0,
      returnUnusedChecks INTEGER NOT NULL DEFAULT 0,
      contractDebt REAL NOT NULL DEFAULT 0,
      downPayment REAL NOT NULL DEFAULT 0,
      collectedAfterDownPayment REAL NOT NULL DEFAULT 0,
      remainingBeforeCancellation REAL NOT NULL DEFAULT 0,
      overpaymentBeforeCancellation REAL NOT NULL DEFAULT 0,
      expectedRefundDue REAL NOT NULL DEFAULT 0,
      ledgerReversalCredit REAL NOT NULL DEFAULT 0,
      downPaymentRefundCredit REAL NOT NULL DEFAULT 0,
      settlementStatus TEXT NOT NULL DEFAULT 'needs_reconciliation',
      reconciliationIssueCount INTEGER NOT NULL DEFAULT 0,
      snapshotJson TEXT NOT NULL DEFAULT '{}',
      createdByUserId INTEGER,
      createdByUsername TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE CASCADE
    );
  `);
  await runAsync("CREATE INDEX IF NOT EXISTS idx_installment_sale_cancellations_status ON installment_sale_cancellations(settlementStatus, createdAt)");

  await runAsync(`
    CREATE TABLE IF NOT EXISTS installment_cancellation_refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cancellationId INTEGER NOT NULL,
      saleId INTEGER NOT NULL,
      customerId INTEGER NOT NULL,
      amount REAL NOT NULL,
      paymentDate TEXT NOT NULL,
      paymentMethod TEXT NOT NULL,
      referenceNo TEXT,
      notes TEXT,
      createdByUserId INTEGER,
      createdByUsername TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (cancellationId) REFERENCES installment_sale_cancellations(id) ON DELETE RESTRICT,
      FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE RESTRICT,
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE RESTRICT
    );
  `);
  await runAsync("CREATE INDEX IF NOT EXISTS idx_installment_cancellation_refunds_sale ON installment_cancellation_refunds(saleId, paymentDate, id)");
  await runAsync("CREATE INDEX IF NOT EXISTS idx_installment_cancellation_refunds_cancellation ON installment_cancellation_refunds(cancellationId, paymentDate, id)");

  // اقلام فروش اقساطی (گوشی/لوازم/خدمات)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS installment_sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saleId INTEGER NOT NULL,
      itemType TEXT NOT NULL, -- phone | inventory | service
      itemId INTEGER,
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      buyPrice REAL DEFAULT 0,
      totalPrice REAL NOT NULL,
      FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE CASCADE
    );
  `);
  console.log("Installment_sale_items table ensured.");
  // سازگاری با دیتابیس‌های قدیمی: اگر برخی ستون‌های جدول installment_sale_items وجود نداشتند، اضافه شوند.
  try {
    await runAsync(
      "ALTER TABLE installment_sale_items ADD COLUMN itemId INTEGER",
    );
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error(
        "Error adding installment_sale_items.itemId:",
        e?.message || e,
      );
  }
  try {
    await runAsync(
      "ALTER TABLE installment_sale_items ADD COLUMN buyPrice REAL DEFAULT 0",
    );
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error(
        "Error adding installment_sale_items.buyPrice:",
        e?.message || e,
      );
  }
  try {
    await runAsync(
      "ALTER TABLE installment_sale_items ADD COLUMN totalPrice REAL NOT NULL DEFAULT 0",
    );
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error(
        "Error adding installment_sale_items.totalPrice:",
        e?.message || e,
      );
  }

  await runAsync(`
    CREATE TABLE IF NOT EXISTS installment_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saleId INTEGER NOT NULL,
      installmentNumber INTEGER NOT NULL,
      dueDate TEXT NOT NULL, -- Shamsi Date: YYYY/MM/DD
      amountDue REAL NOT NULL,
      paymentDate TEXT, -- Shamsi Date: YYYY/MM/DD
      status TEXT NOT NULL DEFAULT 'پرداخت نشده', -- ('پرداخت نشده', 'پرداخت شده')
      FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE CASCADE
    );
  `);
  console.log("Installment_payments table ensured.");

  await runAsync(`
    CREATE TABLE IF NOT EXISTS installment_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saleId INTEGER NOT NULL,
      checkNumber TEXT NOT NULL,
      bankName TEXT NOT NULL,
      dueDate TEXT NOT NULL, -- Shamsi Date: YYYY/MM/DD
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'نزد فروشنده', 
      FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE CASCADE
    );
  `);
  console.log("Installment_checks table ensured.");
  try {
    await runAsync("ALTER TABLE installment_checks ADD COLUMN bankName TEXT");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error(
        "Error adding installment_checks.bankName:",
        e?.message || e,
      );
  }
  try {
    await runAsync("ALTER TABLE installment_checks ADD COLUMN notes TEXT");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error(
        "Error adding installment_checks.notes:",
        e?.message || e,
      );
  }
  try {
    await runAsync("ALTER TABLE installment_checks ADD COLUMN cashedAt TEXT");
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error(
        "Error adding installment_checks.cashedAt:",
        e?.message || e,
      );
  }
  try {
    await runAsync(
      "ALTER TABLE installment_payments ADD COLUMN amountDue REAL NOT NULL DEFAULT 0",
    );
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error(
        "Error adding installment_payments.amountDue:",
        e?.message || e,
      );
  }
  try {
    await runAsync(
      "ALTER TABLE installment_payments ADD COLUMN sourceType TEXT NOT NULL DEFAULT 'installment'",
    );
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error(
        "Error adding installment_payments.sourceType:",
        e?.message || e,
      );
  }
  try {
    await runAsync(
      "ALTER TABLE installment_payments ADD COLUMN sourceId INTEGER",
    );
  } catch (e: any) {
    if (!/duplicate column/i.test(e?.message || ""))
      console.error(
        "Error adding installment_payments.sourceId:",
        e?.message || e,
      );
  }

  // --- Repair installment child tables if they still point to legacy installment_sales_old ---
  const fixLegacyInstallmentFKs = async () => {
    const getFkTarget = async (tableName: string): Promise<string | null> => {
      try {
        const fks = await allAsync(`PRAGMA foreign_key_list(${tableName});`);
        const fk = Array.isArray(fks)
          ? fks.find((row: any) => String(row?.from || "") === "saleId")
          : null;
        return fk ? String(fk.table || "") : null;
      } catch {
        return null;
      }
    };

    const hasColumnIn = async (
      tableName: string,
      columnName: string,
    ): Promise<boolean> => {
      try {
        const cols = await allAsync(`PRAGMA table_info(${tableName});`);
        return (
          Array.isArray(cols) &&
          cols.some((c: any) => String(c?.name || "") === columnName)
        );
      } catch {
        return false;
      }
    };

    const rebuildInstallmentPayments = async () => {
      console.log(
        "Repairing installment_payments foreign key -> installment_sales ...",
      );
      const tempTable = "installment_payments__legacy_backup";
      try {
        await execAsync("PRAGMA foreign_keys=OFF;");
        await execAsync("BEGIN TRANSACTION;");
        await runAsync(`DROP TABLE IF EXISTS ${tempTable};`).catch(() => {});
        await runAsync(
          `ALTER TABLE installment_payments RENAME TO ${tempTable};`,
        );
        await runAsync(`CREATE TABLE installment_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          saleId INTEGER NOT NULL,
          installmentNumber INTEGER NOT NULL,
          dueDate TEXT NOT NULL,
          amountDue REAL NOT NULL DEFAULT 0,
          paymentDate TEXT,
          status TEXT NOT NULL DEFAULT 'پرداخت نشده',
          sourceType TEXT NOT NULL DEFAULT 'installment',
          sourceId INTEGER,
          FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE CASCADE
        );`);
        const hasAmountDue = await hasColumnIn(tempTable, "amountDue");
        const hasSourceType = await hasColumnIn(tempTable, "sourceType");
        const hasSourceId = await hasColumnIn(tempTable, "sourceId");
        const amountExpr = hasAmountDue ? "COALESCE(amountDue, 0)" : "0";
        const sourceTypeExpr = hasSourceType ? "COALESCE(sourceType, 'installment')" : "'installment'";
        const sourceIdExpr = hasSourceId ? "sourceId" : "NULL";
        await runAsync(`INSERT INTO installment_payments (id, saleId, installmentNumber, dueDate, amountDue, paymentDate, status, sourceType, sourceId)
          SELECT id, saleId, installmentNumber, dueDate, ${amountExpr}, paymentDate, COALESCE(status, 'پرداخت نشده'), ${sourceTypeExpr}, ${sourceIdExpr}
          FROM ${tempTable};`);
        await runAsync(`DROP TABLE ${tempTable};`);
        await execAsync("COMMIT;");
        console.log("Repair installment_payments done.");
      } catch (e: any) {
        try {
          await execAsync("ROLLBACK;");
        } catch {}
        throw e;
      } finally {
        try {
          await execAsync("PRAGMA foreign_keys=ON;");
        } catch {}
      }
    };

    const rebuildInstallmentChecks = async () => {
      console.log(
        "Repairing installment_checks foreign key -> installment_sales ...",
      );
      const tempTable = "installment_checks__legacy_backup";
      try {
        await execAsync("PRAGMA foreign_keys=OFF;");
        await execAsync("BEGIN TRANSACTION;");
        await runAsync(`DROP TABLE IF EXISTS ${tempTable};`).catch(() => {});
        await runAsync(
          `ALTER TABLE installment_checks RENAME TO ${tempTable};`,
        );
        await runAsync(`CREATE TABLE installment_checks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          saleId INTEGER NOT NULL,
          checkNumber TEXT NOT NULL,
          bankName TEXT,
          dueDate TEXT NOT NULL,
          amount REAL NOT NULL,
          status TEXT NOT NULL DEFAULT 'نزد فروشنده',
          notes TEXT,
          FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE CASCADE
        );`);
        const hasBankName = await hasColumnIn(tempTable, "bankName");
        const hasNotes = await hasColumnIn(tempTable, "notes");
        const bankExpr = hasBankName ? "bankName" : "NULL";
        const notesExpr = hasNotes ? "notes" : "NULL";
        await runAsync(`INSERT INTO installment_checks (id, saleId, checkNumber, bankName, dueDate, amount, status, notes)
          SELECT id, saleId, checkNumber, ${bankExpr}, dueDate, amount, COALESCE(status, 'نزد فروشنده'), ${notesExpr}
          FROM ${tempTable};`);
        await runAsync(`DROP TABLE ${tempTable};`);
        await execAsync("COMMIT;");
        console.log("Repair installment_checks done.");
      } catch (e: any) {
        try {
          await execAsync("ROLLBACK;");
        } catch {}
        throw e;
      } finally {
        try {
          await execAsync("PRAGMA foreign_keys=ON;");
        } catch {}
      }
    };

    try {
      const paymentsFk = await getFkTarget("installment_payments");
      if (paymentsFk && paymentsFk !== "installment_sales") {
        await rebuildInstallmentPayments();
      }

      const checksFk = await getFkTarget("installment_checks");
      if (checksFk && checksFk !== "installment_sales") {
        await rebuildInstallmentChecks();
      }
    } catch (e: any) {
      console.error(
        "Fix legacy installment FK migration failed:",
        e?.message || e,
      );
    }
  };

  await fixLegacyInstallmentFKs();

  // --- Fix installment_transactions FK references (installment_payments_old -> installment_payments) ---
  const fixInstallmentTransactionsFK = async () => {
    try {
      const exists = await getAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='installment_transactions';",
      );
      if (!exists) return;

      let fkTable: string | null = null;
      try {
        const fks = await allAsync(
          "PRAGMA foreign_key_list(installment_transactions);",
        );
        if (Array.isArray(fks) && fks.length > 0)
          fkTable = String(fks[0]?.table || "");
      } catch {
        // If pragma fails, skip
        return;
      }

      if (!fkTable || fkTable === "installment_payments") return;

      // If FK points to a legacy/missing table (e.g., installment_payments_old), rebuild table safely
      console.log(
        `Migrating installment_transactions FK: ${fkTable} -> installment_payments ...`,
      );
      await execAsync("PRAGMA foreign_keys=OFF;");
      await execAsync("BEGIN TRANSACTION;");

      // Ensure target table exists
      await runAsync(`
        CREATE TABLE IF NOT EXISTS installment_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          saleId INTEGER NOT NULL,
          installmentNumber INTEGER NOT NULL,
          dueDate TEXT NOT NULL,
          amountDue REAL NOT NULL,
          paymentDate TEXT,
          status TEXT NOT NULL DEFAULT 'پرداخت نشده',
          sourceType TEXT NOT NULL DEFAULT 'installment',
          sourceId INTEGER,
          FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE CASCADE
        );
      `);

      // Rename existing transactions table
      try {
        await runAsync(
          "ALTER TABLE installment_transactions RENAME TO installment_transactions_old;",
        );
      } catch {}

      // Recreate with correct FK
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

      const canCopy = await getAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='installment_transactions_old';",
      );
      if (canCopy) {
        await runAsync(`
          INSERT INTO installment_transactions (id, installment_payment_id, amount_paid, payment_date, notes)
          SELECT id, installment_payment_id, amount_paid, payment_date, notes
          FROM installment_transactions_old;
        `);
        await runAsync("DROP TABLE installment_transactions_old;");
      }

      await execAsync("COMMIT;");
      await execAsync("PRAGMA foreign_keys=ON;");
      console.log("Migration installment_transactions done.");
    } catch (e: any) {
      try {
        await execAsync("ROLLBACK;");
      } catch {}
      try {
        await execAsync("PRAGMA foreign_keys=ON;");
      } catch {}
      console.error(
        "Fix installment_transactions FK migration failed:",
        e?.message || e,
      );
    }
  };

  await fixInstallmentTransactionsFK();

  // Migration: normalize legacy check statuses (keeps existing data)
  try {
    await runAsync(
      `UPDATE installment_checks SET status='نزد فروشنده' WHERE status IS NULL OR TRIM(status)='' OR status='نزد مشتری'`,
    );
    await runAsync(
      `UPDATE installment_checks SET status='نقد شد' WHERE TRIM(COALESCE(status,'')) IN ('وصول شده','پاس شده','تسویه شده','نقدشده','پرداخت شده','تکمیل شده','paid','Paid','cashed','Cashed')`,
    );
    await runAsync(
      `UPDATE installment_checks SET status='برگشت خورد' WHERE TRIM(COALESCE(status,'')) IN ('برگشت خورده','برگشت خورد')`,
    );
    await runAsync(
      `UPDATE installment_checks SET status='به مشتری برگشت داده شده' WHERE status='باطل شده'`,
    );
  } catch (e: any) {
    console.warn(
      "Installment checks status migration skipped:",
      e?.message || e,
    );
  }

  // Final list/read-path indexes are ensured after all legacy table rebuilds so
  // migrations cannot silently drop them. They directly support the installment
  // directory's due-date, collection and transaction aggregation queries.
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_installment_sale_items_phone_lookup ON installment_sale_items(itemType, itemId, saleId, id DESC)",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_installment_payments_source_lookup ON installment_payments(sourceType, sourceId, id DESC)",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_installment_payments_sale_source_due ON installment_payments(saleId, sourceType, dueDate, installmentNumber)",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_installment_transactions_payment_date ON installment_transactions(installment_payment_id, payment_date DESC, id DESC)",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_installment_checks_sale_due ON installment_checks(saleId, dueDate, id)",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_installment_sales_directory_date ON installment_sales(saleDateISO DESC, id DESC)",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_installment_sales_customer_date ON installment_sales(customerId, saleDateISO DESC, id DESC)",
  );
};
