// Extracted from server/db/core/initRuntime.ts. Preserve SQL/order exactly.
import { runAsync, allAsync } from "../query";

export const createSalesPurchasesInventorySchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS inventory_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      entryType TEXT NOT NULL, -- 'in' | 'out'
      quantity REAL NOT NULL,
      unitCost REAL NOT NULL DEFAULT 0,
      refType TEXT, -- purchase | sale | adjust
      refId INTEGER,
      entryDate TEXT NOT NULL, -- ISO
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);
  console.log("Inventory_ledger table ensured.");

  await runAsync(`
    CREATE TABLE IF NOT EXISTS sales_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transactionDate TEXT NOT NULL, /* ISO date string e.g., "YYYY-MM-DD" */
      itemType TEXT NOT NULL CHECK(itemType IN ('phone', 'inventory', 'service')),
      itemId INTEGER NOT NULL,
      itemName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      pricePerItem REAL NOT NULL,
      totalPrice REAL NOT NULL, /* This is after discount */
      notes TEXT,
      customerId INTEGER,
      discount REAL DEFAULT 0,
      paymentMethod TEXT DEFAULT 'cash', /* Added paymentMethod with default 'cash' */
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
      -- No direct FK to phones or products to allow deletion of products/phones if needed, or handle soft delete
    );
  `);
  console.log("Sales_transactions table ensured.");

  try {
    const stCols = await allAsync("PRAGMA table_info(sales_transactions);");
    const hasBuyPrice =
      Array.isArray(stCols) &&
      stCols.some((c: any) => c?.name === "buyPrice");
    if (!hasBuyPrice) {
      await runAsync(
        "ALTER TABLE sales_transactions ADD COLUMN buyPrice REAL DEFAULT 0;",
      );
      console.log("Sales_transactions.buyPrice column added.");
    }
    await runAsync(`
      UPDATE sales_transactions
         SET buyPrice = CASE
           WHEN itemType = 'phone' THEN COALESCE((SELECT COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) FROM phones ph WHERE ph.id = sales_transactions.itemId), 0)
           WHEN itemType = 'inventory' THEN COALESCE((SELECT COALESCE(pr.purchasePrice, 0) FROM products pr WHERE pr.id = sales_transactions.itemId), 0)
           ELSE 0
         END
       WHERE COALESCE(buyPrice, 0) = 0
    `);
  } catch (e: any) {
    console.error(
      "Error ensuring sales_transactions.buyPrice column:",
      e?.message || e,
    );
  }

  // --- Sales Orders (نسل جدید فاکتور فروش) ---
  await runAsync(`
  	  CREATE TABLE IF NOT EXISTS sales_orders (
  		id INTEGER PRIMARY KEY AUTOINCREMENT,
  		customerId     INTEGER,
  		paymentMethod  TEXT   NOT NULL DEFAULT 'cash',   -- 'cash' | 'credit'
  		discount       REAL   DEFAULT 0,                -- تخفیف سبد
  		tax            REAL   DEFAULT 0,                -- درصد مالیات (مثلاً 9)
  		subtotal       REAL   NOT NULL,                 -- جمع قبل از تخفیف و مالیات
  		grandTotal     REAL   NOT NULL,                 -- مبلغ نهایی پس از همه چیز
  		transactionDate TEXT  NOT NULL,                 -- ISO  YYYY-MM-DD
  		notes          TEXT,
  		FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
  	  );
  	`);
  console.log("Sales_orders table ensured.");

  await runAsync(`
  	  CREATE TABLE IF NOT EXISTS sales_order_items (
  		id INTEGER PRIMARY KEY AUTOINCREMENT,
  		orderId        INTEGER NOT NULL,
  		itemType       TEXT    NOT NULL,  -- 'phone' | 'inventory' | 'service'
  		itemId         INTEGER NOT NULL,
  		description    TEXT    NOT NULL,
  		quantity       INTEGER NOT NULL,
  		unitPrice      REAL    NOT NULL,
  		discountPerItem REAL   DEFAULT 0,
  		totalPrice     REAL    NOT NULL,  -- (qty*unit) - discountPerItem
  		FOREIGN KEY (orderId) REFERENCES sales_orders(id) ON DELETE CASCADE
  	  );
  	`);
  console.log("Sales_order_items table ensured.");
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_sales_transactions_item_lookup ON sales_transactions(itemType, itemId, transactionDate DESC, id DESC);",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_sales_order_items_item_lookup ON sales_order_items(itemType, itemId, orderId, id DESC);",
  );

  try {
    const soiCols = await allAsync("PRAGMA table_info(sales_order_items);");
    const hasBuyPrice =
      Array.isArray(soiCols) &&
      soiCols.some((c: any) => c?.name === "buyPrice");
    if (!hasBuyPrice) {
      await runAsync(
        "ALTER TABLE sales_order_items ADD COLUMN buyPrice REAL DEFAULT 0;",
      );
      console.log("Sales_order_items.buyPrice column added.");
    }
  } catch (e: any) {
    console.error(
      "Error ensuring sales_order_items.buyPrice column:",
      e?.message || e,
    );
  }

  try {
    await runAsync(`
  UPDATE sales_order_items
     SET buyPrice = CASE
       WHEN itemType = 'phone' THEN COALESCE((SELECT COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) FROM phones ph WHERE ph.id = sales_order_items.itemId), 0)
       WHEN itemType = 'inventory' THEN COALESCE((SELECT COALESCE(pr.purchasePrice, 0) FROM products pr WHERE pr.id = sales_order_items.itemId), 0)
       ELSE 0
     END
   WHERE COALESCE(buyPrice, 0) = 0
    `);
  } catch (e: any) {
    console.error(
      "Error backfilling sales_order_items.buyPrice:",
      e?.message || e,
    );
  }

  // ------------------------------
  // P0 Extensions: Returns / Purchases / Stock Count / Adjustments
  // ------------------------------
  // --- Add status/cancel fields to sales_orders (safe add) ---
  try {
    const soCols = await allAsync("PRAGMA table_info(sales_orders);");
    const hasStatus =
      Array.isArray(soCols) && soCols.some((c: any) => c?.name === "status");
    const hasCanceledAt =
      Array.isArray(soCols) &&
      soCols.some((c: any) => c?.name === "canceledAt");
    const hasCancelReason =
      Array.isArray(soCols) &&
      soCols.some((c: any) => c?.name === "cancelReason");
    if (!hasStatus) {
      await runAsync(
        "ALTER TABLE sales_orders ADD COLUMN status TEXT NOT NULL DEFAULT 'active';",
      );
      console.log("Sales_orders.status column added.");
    }
    if (!hasCanceledAt) {
      await runAsync("ALTER TABLE sales_orders ADD COLUMN canceledAt TEXT;");
      console.log("Sales_orders.canceledAt column added.");
    }
    if (!hasCancelReason) {
      await runAsync(
        "ALTER TABLE sales_orders ADD COLUMN cancelReason TEXT;",
      );
      console.log("Sales_orders.cancelReason column added.");
    }
  } catch (e: any) {
    console.error(
      "Error ensuring sales_orders cancel columns:",
      e?.message || e,
    );
  }

  // Returns (refund / exchange tracking)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS sales_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL,
  customerId INTEGER,
  type TEXT NOT NULL DEFAULT 'refund', -- 'refund' | 'exchange'
  reason TEXT,
  notes TEXT,
  refundAmount REAL NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
  createdByUserId INTEGER,
  FOREIGN KEY (orderId) REFERENCES sales_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
    );
  `);
  await runAsync(`
    CREATE TABLE IF NOT EXISTS sales_return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  returnId INTEGER NOT NULL,
  itemType TEXT NOT NULL,
  itemId INTEGER NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL,
  unitPrice REAL NOT NULL DEFAULT 0,
  lineTotal REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (returnId) REFERENCES sales_returns(id) ON DELETE CASCADE
    );
  `);
  console.log("Sales_returns tables ensured.");

  // Purchases (supplier stock-in receipts)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplierId INTEGER,
  invoiceNumber TEXT,
  notes TEXT,
  totalCost REAL NOT NULL DEFAULT 0,
  purchaseDate TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
  createdByUserId INTEGER,
  FOREIGN KEY (supplierId) REFERENCES partners(id) ON DELETE SET NULL
    );
  `);
  await runAsync(`
    CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchaseId INTEGER NOT NULL,
  productId INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unitCost REAL NOT NULL DEFAULT 0,
  lineTotal REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (purchaseId) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );
  `);
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_purchases_supplier_purchase_date ON purchases(supplierId, purchaseDate DESC, id DESC);",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_product ON purchase_items(purchaseId, productId);",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_purchase_items_product_purchase ON purchase_items(productId, purchaseId);",
  );
  console.log("Purchases tables ensured.");

  // Inventory adjustments (manual corrections)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  productId INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
  createdByUserId INTEGER,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );
  `);
  console.log("Inventory_adjustments table ensured.");

  // Stock count (inventory audit / counting)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS stock_counts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'completed'
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
  completedAt TEXT,
  createdByUserId INTEGER
    );
  `);
  await runAsync(`
    CREATE TABLE IF NOT EXISTS stock_count_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stockCountId INTEGER NOT NULL,
  productId INTEGER NOT NULL,
  expectedQty INTEGER NOT NULL,
  countedQty INTEGER NOT NULL,
  FOREIGN KEY (stockCountId) REFERENCES stock_counts(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(stockCountId, productId)
    );
  `);
  console.log("Stock_count tables ensured.");
};
