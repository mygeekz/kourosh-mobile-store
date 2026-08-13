// Phase 1D: FTS5 unified search index setup extracted from legacyRuntime.ts.

import { getAsync, runAsync } from "../query";

export const ensureFts5UnifiedSearch = async (): Promise<void> => {
  try {
    // 1) Virtual table + meta map
    await runAsync(`
	  	  CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
	        domain UNINDEXED,      -- 'product' | 'phone' | 'customer' | 'partner' | 'service' | 'invoice' | 'repair' | 'installment'
        entity_id UNINDEXED,   -- row id from base table
        title,                 -- title field for highlight
        content,               -- long text
        extra,                 -- sku/imei/phoneNumber...
        tokenize = "unicode61 remove_diacritics 2"
      );
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS search_meta (
        rowid INTEGER PRIMARY KEY,   -- rowid of search_index
        domain TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        UNIQUE(domain, entity_id)
      );
    `);

    // ---------- Products
    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_products_ai_fts AFTER INSERT ON products BEGIN
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('product', NEW.id,
                COALESCE(NEW.name,''),
                COALESCE(NEW.name,'') || ' ' || COALESCE((SELECT name FROM categories WHERE id = NEW.categoryId),''),
                '');
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'product', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_products_au_fts AFTER UPDATE ON products BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='product' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='product' AND entity_id=OLD.id;
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('product', NEW.id,
                COALESCE(NEW.name,''),
                COALESCE(NEW.name,'') || ' ' || COALESCE((SELECT name FROM categories WHERE id = NEW.categoryId),''),
                '');
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'product', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_products_ad_fts AFTER DELETE ON products BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='product' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='product' AND entity_id=OLD.id;
      END;
    `);

    // ---------- Phones
    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_phones_ai_fts AFTER INSERT ON phones BEGIN
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('phone', NEW.id,
                TRIM(COALESCE(NEW.model,'') || ' ' || COALESCE(NEW.storage,'') || ' ' || COALESCE(NEW.ram,'')),
                TRIM(COALESCE(NEW.color,'') || ' ' || COALESCE(NEW.condition,'') || ' ' || COALESCE(NEW.notes,'')),
                COALESCE(NEW.imei,''));
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'phone', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_phones_au_fts AFTER UPDATE ON phones BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='phone' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='phone' AND entity_id=OLD.id;
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('phone', NEW.id,
                TRIM(COALESCE(NEW.model,'') || ' ' || COALESCE(NEW.storage,'') || ' ' || COALESCE(NEW.ram,'')),
                TRIM(COALESCE(NEW.color,'') || ' ' || COALESCE(NEW.condition,'') || ' ' || COALESCE(NEW.notes,'')),
                COALESCE(NEW.imei,''));
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'phone', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_phones_ad_fts AFTER DELETE ON phones BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='phone' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='phone' AND entity_id=OLD.id;
      END;
    `);

    // ---------- Customers
    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_customers_ai_fts AFTER INSERT ON customers BEGIN
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('customer', NEW.id,
                COALESCE(NEW.fullName,''),
                TRIM(COALESCE(NEW.address,'') || ' ' || COALESCE(NEW.notes,'')),
                COALESCE(NEW.phoneNumber,''));
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'customer', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_customers_au_fts AFTER UPDATE ON customers BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='customer' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='customer' AND entity_id=OLD.id;
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('customer', NEW.id,
                COALESCE(NEW.fullName,''),
                TRIM(COALESCE(NEW.address,'') || ' ' || COALESCE(NEW.notes,'')),
                COALESCE(NEW.phoneNumber,''));
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'customer', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_customers_ad_fts AFTER DELETE ON customers BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='customer' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='customer' AND entity_id=OLD.id;
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_partners_ai_fts AFTER INSERT ON partners BEGIN
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('partner', NEW.id,
                COALESCE(NEW.partnerName,''),
                TRIM(COALESCE(NEW.partnerType,'') || ' ' || COALESCE(NEW.phoneNumber,'') || ' ' || COALESCE(NEW.address,'') || ' ' || COALESCE(NEW.notes,'')),
                COALESCE(NEW.phoneNumber,''));
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'partner', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_partners_au_fts AFTER UPDATE ON partners BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='partner' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='partner' AND entity_id=OLD.id;
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('partner', NEW.id,
                COALESCE(NEW.partnerName,''),
                TRIM(COALESCE(NEW.partnerType,'') || ' ' || COALESCE(NEW.phoneNumber,'') || ' ' || COALESCE(NEW.address,'') || ' ' || COALESCE(NEW.notes,'')),
                COALESCE(NEW.phoneNumber,''));
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'partner', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_partners_ad_fts AFTER DELETE ON partners BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='partner' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='partner' AND entity_id=OLD.id;
      END;
    `);

    // ---------- Services
    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_services_ai_fts AFTER INSERT ON services BEGIN
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('service', NEW.id,
                COALESCE(NEW.name,''),
                COALESCE(NEW.description,''),
                CAST(COALESCE(NEW.price,0) AS TEXT));
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'service', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_services_au_fts AFTER UPDATE ON services BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='service' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='service' AND entity_id=OLD.id;
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('service', NEW.id,
                COALESCE(NEW.name,''),
                COALESCE(NEW.description,''),
                CAST(COALESCE(NEW.price,0) AS TEXT));
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'service', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_services_ad_fts AFTER DELETE ON services BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='service' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='service' AND entity_id=OLD.id;
      END;
    `);

    // ---------- Invoices (+ items)
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoices_ai_fts AFTER INSERT ON invoices BEGIN
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'invoice', NEW.id,
	          TRIM(COALESCE(NEW.invoiceNumber,'') || ' ' || 'فاکتور' || ' #' || CAST(NEW.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.notes,'') || ' ' ||
	            COALESCE((SELECT group_concat(description, ' ') FROM invoice_items WHERE invoiceId = NEW.id),'')
	          ),
	          COALESCE(NEW.invoiceNumber,'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'invoice', NEW.id);
	      END;
	    `);

    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoices_au_fts AFTER UPDATE ON invoices BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='invoice' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='invoice' AND entity_id=OLD.id;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'invoice', NEW.id,
	          TRIM(COALESCE(NEW.invoiceNumber,'') || ' ' || 'فاکتور' || ' #' || CAST(NEW.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.notes,'') || ' ' ||
	            COALESCE((SELECT group_concat(description, ' ') FROM invoice_items WHERE invoiceId = NEW.id),'')
	          ),
	          COALESCE(NEW.invoiceNumber,'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'invoice', NEW.id);
	      END;
	    `);

    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoices_ad_fts AFTER DELETE ON invoices BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='invoice' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='invoice' AND entity_id=OLD.id;
	      END;
	    `);

    // هر تغییری در آیتم‌های فاکتور باید ورودی FTS فاکتور را بازسازی کند
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoice_items_ai_fts AFTER INSERT ON invoice_items BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='invoice' AND entity_id=NEW.invoiceId
	        );
	        DELETE FROM search_meta WHERE domain='invoice' AND entity_id=NEW.invoiceId;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        SELECT
	          'invoice', inv.id,
	          TRIM(COALESCE(inv.invoiceNumber,'') || ' ' || 'فاکتور' || ' #' || CAST(inv.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = inv.customerId),'') || ' ' ||
	            COALESCE(inv.notes,'') || ' ' ||
	            COALESCE((SELECT group_concat(description, ' ') FROM invoice_items WHERE invoiceId = inv.id),'')
	          ),
	          COALESCE(inv.invoiceNumber,'')
	        FROM invoices inv WHERE inv.id = NEW.invoiceId;
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'invoice', NEW.invoiceId);
	      END;
	    `);
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoice_items_au_fts AFTER UPDATE ON invoice_items BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='invoice' AND entity_id=NEW.invoiceId
	        );
	        DELETE FROM search_meta WHERE domain='invoice' AND entity_id=NEW.invoiceId;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        SELECT
	          'invoice', inv.id,
	          TRIM(COALESCE(inv.invoiceNumber,'') || ' ' || 'فاکتور' || ' #' || CAST(inv.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = inv.customerId),'') || ' ' ||
	            COALESCE(inv.notes,'') || ' ' ||
	            COALESCE((SELECT group_concat(description, ' ') FROM invoice_items WHERE invoiceId = inv.id),'')
	          ),
	          COALESCE(inv.invoiceNumber,'')
	        FROM invoices inv WHERE inv.id = NEW.invoiceId;
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'invoice', NEW.invoiceId);
	      END;
	    `);
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoice_items_ad_fts AFTER DELETE ON invoice_items BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='invoice' AND entity_id=OLD.invoiceId
	        );
	        DELETE FROM search_meta WHERE domain='invoice' AND entity_id=OLD.invoiceId;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        SELECT
	          'invoice', inv.id,
	          TRIM(COALESCE(inv.invoiceNumber,'') || ' ' || 'فاکتور' || ' #' || CAST(inv.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = inv.customerId),'') || ' ' ||
	            COALESCE(inv.notes,'') || ' ' ||
	            COALESCE((SELECT group_concat(description, ' ') FROM invoice_items WHERE invoiceId = inv.id),'')
	          ),
	          COALESCE(inv.invoiceNumber,'')
	        FROM invoices inv WHERE inv.id = OLD.invoiceId;
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'invoice', OLD.invoiceId);
	      END;
	    `);

    // ---------- Repairs
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_repairs_ai_fts AFTER INSERT ON repairs BEGIN
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'repair', NEW.id,
	          TRIM('تعمیر' || ' #' || CAST(NEW.id AS TEXT) || ' ' || COALESCE(NEW.deviceModel,'')),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.problemDescription,'') || ' ' || COALESCE(NEW.technicianNotes,'') || ' ' || COALESCE(NEW.status,'')
	          ),
	          COALESCE(NEW.serialNumber,'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'repair', NEW.id);
	      END;
	    `);
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_repairs_au_fts AFTER UPDATE ON repairs BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='repair' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='repair' AND entity_id=OLD.id;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'repair', NEW.id,
	          TRIM('تعمیر' || ' #' || CAST(NEW.id AS TEXT) || ' ' || COALESCE(NEW.deviceModel,'')),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.problemDescription,'') || ' ' || COALESCE(NEW.technicianNotes,'') || ' ' || COALESCE(NEW.status,'')
	          ),
	          COALESCE(NEW.serialNumber,'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'repair', NEW.id);
	      END;
	    `);
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_repairs_ad_fts AFTER DELETE ON repairs BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='repair' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='repair' AND entity_id=OLD.id;
	      END;
	    `);

    // ---------- Installment sales
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_installment_sales_ai_fts AFTER INSERT ON installment_sales BEGIN
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'installment', NEW.id,
	          TRIM('اقساط' || ' #' || CAST(NEW.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.itemsSummary,'') || ' ' || COALESCE(NEW.notes,'') || ' ' ||
	            COALESCE((SELECT imei FROM phones WHERE id = NEW.phoneId),'')
	          ),
	          COALESCE((SELECT imei FROM phones WHERE id = NEW.phoneId),'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'installment', NEW.id);
	      END;
	    `);
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_installment_sales_au_fts AFTER UPDATE ON installment_sales BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='installment' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='installment' AND entity_id=OLD.id;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'installment', NEW.id,
	          TRIM('اقساط' || ' #' || CAST(NEW.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.itemsSummary,'') || ' ' || COALESCE(NEW.notes,'') || ' ' ||
	            COALESCE((SELECT imei FROM phones WHERE id = NEW.phoneId),'')
	          ),
	          COALESCE((SELECT imei FROM phones WHERE id = NEW.phoneId),'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'installment', NEW.id);
	      END;
	    `);
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_installment_sales_ad_fts AFTER DELETE ON installment_sales BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='installment' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='installment' AND entity_id=OLD.id;
	      END;
	    `);

    // ---------- Invoices (and invoice_items to keep content fresh)
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoices_ai_fts AFTER INSERT ON invoices BEGIN
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'invoice', NEW.id,
	          TRIM(COALESCE(NEW.invoiceNumber,'') || ' ' || 'فاکتور' || ' #' || CAST(NEW.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.notes,'') || ' ' ||
	            COALESCE((SELECT group_concat(description, ' • ') FROM invoice_items WHERE invoiceId = NEW.id),'')
	          ),
	          COALESCE(NEW.invoiceNumber,'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'invoice', NEW.id);
	      END;
	    `);

    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoices_au_fts AFTER UPDATE ON invoices BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='invoice' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='invoice' AND entity_id=OLD.id;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'invoice', NEW.id,
	          TRIM(COALESCE(NEW.invoiceNumber,'') || ' ' || 'فاکتور' || ' #' || CAST(NEW.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.notes,'') || ' ' ||
	            COALESCE((SELECT group_concat(description, ' • ') FROM invoice_items WHERE invoiceId = NEW.id),'')
	          ),
	          COALESCE(NEW.invoiceNumber,'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'invoice', NEW.id);
	      END;
	    `);

    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoices_ad_fts AFTER DELETE ON invoices BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='invoice' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='invoice' AND entity_id=OLD.id;
	      END;
	    `);

    // invoice_items: any change should refresh its parent invoice record in FTS
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoice_items_ai_fts AFTER INSERT ON invoice_items BEGIN
	        UPDATE invoices SET notes = notes WHERE id = NEW.invoiceId;
	      END;
	    `);
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoice_items_au_fts AFTER UPDATE ON invoice_items BEGIN
	        UPDATE invoices SET notes = notes WHERE id = NEW.invoiceId;
	      END;
	    `);
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoice_items_ad_fts AFTER DELETE ON invoice_items BEGIN
	        UPDATE invoices SET notes = notes WHERE id = OLD.invoiceId;
	      END;
	    `);

    // ---------- Repairs
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_repairs_ai_fts AFTER INSERT ON repairs BEGIN
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'repair', NEW.id,
	          TRIM('تعمیر' || ' #' || CAST(NEW.id AS TEXT) || ' ' || COALESCE(NEW.deviceModel,'')),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.problemDescription,'') || ' ' || COALESCE(NEW.technicianNotes,'')
	          ),
	          COALESCE(NEW.serialNumber,'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'repair', NEW.id);
	      END;
	    `);
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_repairs_au_fts AFTER UPDATE ON repairs BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='repair' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='repair' AND entity_id=OLD.id;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'repair', NEW.id,
	          TRIM('تعمیر' || ' #' || CAST(NEW.id AS TEXT) || ' ' || COALESCE(NEW.deviceModel,'')),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.problemDescription,'') || ' ' || COALESCE(NEW.technicianNotes,'')
	          ),
	          COALESCE(NEW.serialNumber,'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'repair', NEW.id);
	      END;
	    `);
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_repairs_ad_fts AFTER DELETE ON repairs BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='repair' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='repair' AND entity_id=OLD.id;
	      END;
	    `);

    // ---------- Installment sales
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_installments_ai_fts AFTER INSERT ON installment_sales BEGIN
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'installment', NEW.id,
	          TRIM('فروش اقساطی' || ' #' || CAST(NEW.id AS TEXT) || ' ' || COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'')),
	          TRIM(COALESCE(NEW.itemsSummary,'') || ' ' || COALESCE(NEW.notes,'') || ' ' || COALESCE((SELECT imei FROM phones WHERE id = NEW.phoneId),'')),
	          COALESCE((SELECT imei FROM phones WHERE id = NEW.phoneId),'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'installment', NEW.id);
	      END;
	    `);
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_installments_au_fts AFTER UPDATE ON installment_sales BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='installment' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='installment' AND entity_id=OLD.id;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'installment', NEW.id,
	          TRIM('فروش اقساطی' || ' #' || CAST(NEW.id AS TEXT) || ' ' || COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'')),
	          TRIM(COALESCE(NEW.itemsSummary,'') || ' ' || COALESCE(NEW.notes,'') || ' ' || COALESCE((SELECT imei FROM phones WHERE id = NEW.phoneId),'')),
	          COALESCE((SELECT imei FROM phones WHERE id = NEW.phoneId),'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'installment', NEW.id);
	      END;
	    `);
    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_installments_ad_fts AFTER DELETE ON installment_sales BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='installment' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='installment' AND entity_id=OLD.id;
	      END;
	    `);
  } catch (e: any) {
    if (String(e?.message || "").includes("no such module: fts5")) {
      console.warn(
        "⚠️ FTS5 در بیلد فعلی SQLite فعال نیست. unified search غیرفعال می‌ماند.",
      );
    } else {
      throw e;
    }
  }
};

export const rebuildSearchIndexInternal = async (): Promise<void> => {
  await runAsync("BEGIN;");
  try {
    await runAsync(`DELETE FROM search_index;`);
    await runAsync(`DELETE FROM search_meta;`);

    await runAsync(`
      INSERT INTO search_index (domain, entity_id, title, content, extra)
      SELECT 'product', p.id,
             COALESCE(p.name,''),
             TRIM(COALESCE(p.name,'') || ' ' || COALESCE(c.name,'')),
             ''
      FROM products p LEFT JOIN categories c ON c.id = p.categoryId;
    `);

    await runAsync(`
      INSERT INTO search_index (domain, entity_id, title, content, extra)
      SELECT 'phone', ph.id,
             TRIM(COALESCE(ph.model,'') || ' ' || COALESCE(ph.storage,'') || ' ' || COALESCE(ph.ram,'')),
             TRIM(COALESCE(ph.color,'') || ' ' || COALESCE(ph.condition,'') || ' ' || COALESCE(ph.notes,'')),
             COALESCE(ph.imei,'')
      FROM phones ph;
    `);

    await runAsync(`
      INSERT INTO search_index (domain, entity_id, title, content, extra)
      SELECT 'customer', c.id,
             COALESCE(c.fullName,''),
             TRIM(COALESCE(c.address,'') || ' ' || COALESCE(c.notes,'')),
             COALESCE(c.phoneNumber,'')
      FROM customers c;
    `);

    await runAsync(`
      INSERT INTO search_index (domain, entity_id, title, content, extra)
      SELECT 'partner', p.id,
             COALESCE(p.partnerName,''),
             TRIM(COALESCE(p.partnerType,'') || ' ' || COALESCE(p.phoneNumber,'') || ' ' || COALESCE(p.address,'') || ' ' || COALESCE(p.notes,'')),
             COALESCE(p.phoneNumber,'')
      FROM partners p;
    `);

    await runAsync(`
      INSERT INTO search_index (domain, entity_id, title, content, extra)
      SELECT 'service', s.id,
             COALESCE(s.name,''),
             COALESCE(s.description,''),
             CAST(COALESCE(s.price,0) AS TEXT)
      FROM services s;
    `);

    // invoices (+ items)
    await runAsync(`
	    INSERT INTO search_index (domain, entity_id, title, content, extra)
	    SELECT 'invoice', i.id,
	           TRIM(COALESCE(i.invoiceNumber,'') || ' ' || 'فاکتور' || ' #' || CAST(i.id AS TEXT)),
	           TRIM(
	             COALESCE((SELECT fullName FROM customers WHERE id = i.customerId),'') || ' ' ||
	             COALESCE(i.notes,'') || ' ' ||
	             COALESCE((SELECT group_concat(description, ' • ') FROM invoice_items WHERE invoiceId = i.id),'')
	           ),
	           COALESCE(i.invoiceNumber,'')
	    FROM invoices i;
	  `);

    // repairs
    await runAsync(`
	    INSERT INTO search_index (domain, entity_id, title, content, extra)
	    SELECT 'repair', r.id,
	           TRIM('تعمیر' || ' #' || CAST(r.id AS TEXT) || ' ' || COALESCE(r.deviceModel,'')),
	           TRIM(
	             COALESCE((SELECT fullName FROM customers WHERE id = r.customerId),'') || ' ' ||
	             COALESCE(r.problemDescription,'') || ' ' || COALESCE(r.technicianNotes,'')
	           ),
	           COALESCE(r.serialNumber,'')
	    FROM repairs r;
	  `);

    // installment sales
    await runAsync(`
	    INSERT INTO search_index (domain, entity_id, title, content, extra)
	    SELECT 'installment', ins.id,
	           TRIM('فروش اقساطی' || ' #' || CAST(ins.id AS TEXT) || ' ' || COALESCE((SELECT fullName FROM customers WHERE id = ins.customerId),'')),
	           TRIM(COALESCE(ins.itemsSummary,'') || ' ' || COALESCE(ins.notes,'') || ' ' || COALESCE((SELECT imei FROM phones WHERE id = ins.phoneId),'')),
	           COALESCE((SELECT imei FROM phones WHERE id = ins.phoneId),'')
	    FROM installment_sales ins;
	  `);

    await runAsync(`
      INSERT OR IGNORE INTO search_meta(rowid, domain, entity_id)
      SELECT rowid, domain, entity_id FROM search_index;
    `);

    await runAsync("COMMIT;");
  } catch (err) {
    await runAsync("ROLLBACK;");
    throw err;
  }
};

export const initSearchIndexIfNeeded = async (): Promise<void> => {
  try {
    const row = await getAsync(`SELECT COUNT(*) AS c FROM search_index`, []);
    if (!row || !row.c) {
      await rebuildSearchIndexInternal();
      return;
    }

    // ارتقای نسخه: اگر داده‌های جدید (فاکتور/تعمیر/اقساط/همکار) داریم اما هنوز ایندکس نشده‌اند، یکبار ریبیلد کن.
    const hasNewDomains = await getAsync(
      `SELECT COUNT(*) AS c FROM search_index WHERE domain IN ('invoice','repair','installment','partner')`,
      [],
    );
    if (Number(hasNewDomains?.c || 0) > 0) return;

    const [inv, rep, ins, par] = await Promise.all([
      getAsync(`SELECT COUNT(*) AS c FROM invoices`, []),
      getAsync(`SELECT COUNT(*) AS c FROM repairs`, []),
      getAsync(`SELECT COUNT(*) AS c FROM installment_sales`, []),
      getAsync(`SELECT COUNT(*) AS c FROM partners`, []),
    ]);

    const need =
      Number(inv?.c || 0) +
      Number(rep?.c || 0) +
      Number(ins?.c || 0) +
      Number(par?.c || 0);
    if (need > 0) {
      await rebuildSearchIndexInternal();
    }
  } catch (e: any) {
    // اگر search_index هنوز ساخته نشده بود، بی‌صدا رد می‌شویم
  }
};
