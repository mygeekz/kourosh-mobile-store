// Extracted from server/db/core/initRuntime.ts. Preserve SQL/order exactly.
import { allTypedAsync, runAsync } from "../query";

type TableInfoRow = {
  name: string;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error ?? "");

export const createProductsSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      purchasePrice REAL NOT NULL DEFAULT 0,
      sellingPrice REAL NOT NULL DEFAULT 0,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      saleCount INTEGER NOT NULL DEFAULT 0,
      categoryId INTEGER,
      date_added TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      supplierId INTEGER,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (supplierId) REFERENCES partners(id) ON DELETE SET NULL
    );
  `);
  console.log("Products table ensured.");

  // ------------------------------
  // Inventory extensions (Phase 4)
  // - inventory_logs table
  // - products.threshold / sku / barcode columns (safe add)
  // - helpful indexes
  // ------------------------------
  await runAsync(`
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      oldQuantity INTEGER NOT NULL,
      newQuantity INTEGER NOT NULL,
      changedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );
  `);
  console.log("Inventory logs table ensured.");

  // SQLite doesn't support ADD COLUMN IF NOT EXISTS → check first, and also swallow duplicate column errors.
  const productCols = await allTypedAsync<TableInfoRow>(
    "PRAGMA table_info(products);",
  );
  const colNames = new Set(
    productCols.map((column) => column.name).filter(Boolean),
  );

  const safeAddColumn = async (col: string, alterSql: string) => {
    if (colNames.has(col)) return;
    try {
      await runAsync(alterSql);
      console.log(`Products.${col} column added.`);
    } catch (error: unknown) {
      const msg = getErrorMessage(error).toLowerCase();
      if (msg.includes("duplicate column name")) {
        console.log(`Products.${col} column already exists.`);
        return;
      }
      throw error;
    }
  };

  await safeAddColumn(
    "threshold",
    "ALTER TABLE products ADD COLUMN threshold INTEGER NOT NULL DEFAULT 5;",
  );
  await safeAddColumn("sku", "ALTER TABLE products ADD COLUMN sku TEXT;");
  await safeAddColumn(
    "barcode",
    "ALTER TABLE products ADD COLUMN barcode TEXT;",
  );
  await safeAddColumn(
    "unit",
    "ALTER TABLE products ADD COLUMN unit TEXT NOT NULL DEFAULT 'عدد';",
  );

  // Indexes for faster list/search (safe)
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_products_date_added ON products(date_added);",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_products_categoryId ON products(categoryId);",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_products_name_nocase ON products(name COLLATE NOCASE);",
  );
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_products_name_normalized ON products(
      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 'ي', 'ی'), 'ك', 'ک'), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا') COLLATE NOCASE
    );`,
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_products_supplier_date ON products(supplierId, date_added DESC, id DESC);",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_products_in_stock_date ON products(date_added DESC, id DESC) WHERE stock_quantity > 0;",
  );
};
