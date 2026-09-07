// Extracted from server/db/core/initRuntime.ts. Preserve SQL/order exactly.
import { runAsync, allAsync } from "../query";

export const createExpensesSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expenseDate TEXT NOT NULL, -- ISO
      category TEXT NOT NULL, -- rent|salary|inventory|overhead
      title TEXT NOT NULL,
      amount INTEGER NOT NULL, -- stored in smallest currency unit (rial) or toman? using integer as before
      vendor TEXT,
      notes TEXT,
      paymentMethod TEXT NOT NULL DEFAULT 'cash',
      referenceNo TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      createdByUserId INTEGER,
      createdByUsername TEXT
    );
  `);
  console.log("Expenses table ensured.");

  // ---- Expenses schema migrations (non-breaking) ----
  const expenseCols: any[] = (await allAsync("PRAGMA table_info(expenses);")) as any[];
  const expenseColNames = new Set((expenseCols || []).map((c: any) => c?.name).filter(Boolean));
  const safeAddExpenseColumn = async (col: string, alterSql: string) => {
    if (expenseColNames.has(col)) return;
    try {
      await runAsync(alterSql);
      expenseColNames.add(col);
      console.log(`Expenses.${col} column added.`);
    } catch (e: any) {
      const msg = String(e?.message || "").toLowerCase();
      if (msg.includes("duplicate column name")) return;
      throw e;
    }
  };
  await safeAddExpenseColumn("paymentMethod", "ALTER TABLE expenses ADD COLUMN paymentMethod TEXT NOT NULL DEFAULT 'cash';");
  await safeAddExpenseColumn("referenceNo", "ALTER TABLE expenses ADD COLUMN referenceNo TEXT;");

  await runAsync(`
    CREATE TABLE IF NOT EXISTS recurring_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL, -- rent|salary|inventory|overhead
      amount INTEGER NOT NULL,
      vendor TEXT,
      notes TEXT,
      dayOfMonth INTEGER NOT NULL DEFAULT 1, -- 1..31
      nextRunDate TEXT NOT NULL, -- YYYY-MM-DD
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      createdByUserId INTEGER,
      createdByUsername TEXT
    );
  `);
  console.log("Recurring_expenses table ensured.");

  const recurringCols = await allAsync("PRAGMA table_info(recurring_expenses);");
  const recurringColNames = new Set((recurringCols || []).map((c: any) => c?.name).filter(Boolean));
  const safeAddRecurringColumn = async (col: string, alterSql: string) => {
    if (recurringColNames.has(col)) return;
    try {
      await runAsync(alterSql);
      recurringColNames.add(col);
      console.log(`Recurring_expenses.${col} column added.`);
    } catch (e: any) {
      const msg = String(e?.message || "").toLowerCase();
      if (msg.includes("duplicate column name")) return;
      throw e;
    }
  };
  await safeAddRecurringColumn("recurringType", "ALTER TABLE recurring_expenses ADD COLUMN recurringType TEXT NOT NULL DEFAULT 'monthly';");
  await safeAddRecurringColumn("totalInstallments", "ALTER TABLE recurring_expenses ADD COLUMN totalInstallments INTEGER;");
  await safeAddRecurringColumn("paidInstallments", "ALTER TABLE recurring_expenses ADD COLUMN paidInstallments INTEGER NOT NULL DEFAULT 0;");

  await runAsync(`
    CREATE TABLE IF NOT EXISTS recurring_expense_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recurringExpenseId INTEGER NOT NULL,
      runMonth TEXT NOT NULL, -- YYYY-MM
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      UNIQUE(recurringExpenseId, runMonth)
    );
  `);
  console.log("Recurring_expense_runs table ensured.");

  await runAsync(`
    CREATE TABLE IF NOT EXISTS recurring_expense_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recurringExpenseId INTEGER NOT NULL,
      expenseId INTEGER,
      runMonth TEXT NOT NULL,
      paymentDate TEXT NOT NULL,
      amount INTEGER NOT NULL,
      paymentMethod TEXT NOT NULL DEFAULT 'cash',
      referenceNo TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      createdByUserId INTEGER,
      createdByUsername TEXT
    );
  `);
  console.log("Recurring_expense_payments table ensured.");

  await runAsync(`
    CREATE TABLE IF NOT EXISTS debt_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshotDate TEXT NOT NULL, -- YYYY-MM-DD
      totalDebt REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      UNIQUE(snapshotDate)
    );
  `);
  console.log("Debt_snapshots table ensured.");
};
