// Extracted from server/db/core/initRuntime.ts. Preserve SQL/order exactly.
import { runAsync } from "../query";

export const createInvoicesSchema = async (): Promise<void> => {
  // --- بخش ساخت جداول فاکتور ---
  await runAsync(`
    CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoiceNumber TEXT UNIQUE, -- شماره فاکتور یکتا (برای چاپ/ارجاع)
  customerId INTEGER,
  date TEXT NOT NULL, -- ISO Date
  subtotal REAL NOT NULL,
  discountAmount REAL DEFAULT 0,
  grandTotal REAL NOT NULL,
  notes TEXT,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
    );
  `);
  console.log("Invoices table ensured.");

  await runAsync(`
    CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoiceId INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unitPrice REAL NOT NULL,
  totalPrice REAL NOT NULL,
  itemType TEXT, -- phone / inventory / service
  itemId INTEGER, -- ارتباط به کالای فروخته‌شده
  FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE
    );
  `);
  console.log("Invoice_items table ensured.");
};
