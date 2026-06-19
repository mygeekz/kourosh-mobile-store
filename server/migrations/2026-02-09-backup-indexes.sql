-- Add missing product identifiers + performance indexes

-- Add columns if missing (safe runner skips duplicates on existing DBs)
ALTER TABLE products ADD COLUMN sku TEXT;
ALTER TABLE products ADD COLUMN barcode TEXT;

-- Indexes for reporting speed
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_customerId ON invoices(customerId);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_invoiceNumber ON invoices(invoiceNumber);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_sku ON products(sku);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoiceId ON invoice_items(invoiceId);
CREATE INDEX IF NOT EXISTS idx_invoice_items_productId ON invoice_items(productId);
-- Legacy schemas may use snake_case
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);