-- A sale “header”
CREATE TABLE IF NOT EXISTS sales_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customerId INTEGER,
  paymentMethod TEXT NOT NULL DEFAULT 'cash',         -- cash | credit | installment
  discount REAL DEFAULT 0,                            -- global discount
  tax REAL DEFAULT 0,                                 -- global VAT %
  subtotal REAL NOT NULL,                             -- before discount & tax
  grandTotal REAL NOT NULL,                           -- subtotal - discount + tax
  transactionDate TEXT NOT NULL,                      -- YYYY-MM-DD
  notes TEXT,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
);

-- the order’s line items
CREATE TABLE IF NOT EXISTS sales_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL,
  itemType TEXT NOT NULL CHECK(itemType IN ('phone','inventory','service')),
  itemId INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unitPrice REAL NOT NULL,
  discountPerItem REAL DEFAULT 0,                     -- optional per-row discount
  totalPrice REAL NOT NULL,                           -- (qty*unitPrice)-rowDiscount
  FOREIGN KEY (orderId) REFERENCES sales_orders(id) ON DELETE CASCADE
);

-- Helper Stored Views (optional but handy)
CREATE VIEW IF NOT EXISTS v_order_with_customer AS
SELECT so.*, c.fullName, c.phoneNumber
FROM sales_orders so
LEFT JOIN customers c ON so.customerId = c.id;
