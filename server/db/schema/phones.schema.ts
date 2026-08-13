// Extracted from server/db/core/initRuntime.ts. Preserve SQL/order exactly.
import { allTypedAsync, runAsync } from "../query";

type TableInfoRow = {
  name: string;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error ?? "");

export const createPhonesSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS mobile_phone_details ( /* Old structure */
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL UNIQUE,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      color TEXT,
      storage INTEGER,
      ram INTEGER,
      imei TEXT NOT NULL UNIQUE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );
  `);
  console.log("Mobile_phone_details table (old structure) ensured.");

  await runAsync(`
    CREATE TABLE IF NOT EXISTS phones ( /* New standalone */
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT NOT NULL,
      color TEXT,
      storage TEXT,
      ram TEXT,
      imei TEXT NOT NULL UNIQUE,
      batteryHealth INTEGER,
      condition TEXT,
      purchasePrice REAL NOT NULL,
      currentPurchasePrice REAL,
      currentPurchasePriceUpdatedAt TEXT,
      salePrice REAL,
      sellerName TEXT,
      buyerName TEXT,
      purchaseDate TEXT, /* ISO Date YYYY-MM-DD */
      saleDate TEXT,     /* ISO Date YYYY-MM-DD */
      registerDate TEXT NOT NULL, /* ISO DateTime string */
      status TEXT NOT NULL, /* e.g., "موجود در انبار", "فروخته شده", "فروخته شده (قسطی)" */
      notes TEXT,
      supplierId INTEGER,
      FOREIGN KEY (supplierId) REFERENCES partners(id) ON DELETE SET NULL
    );
  `);
  console.log("Phones table (new standalone) ensured.");

  // IMEI is already covered by the UNIQUE constraint. These indexes target
  // model lookup plus the status/supplier/date access paths used by inventory and sales selects.
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_phones_model_nocase ON phones(model COLLATE NOCASE);",
  );
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_phones_model_normalized ON phones(
      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(model, 'ي', 'ی'), 'ك', 'ک'), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا') COLLATE NOCASE
    );`,
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_phones_status_register_date ON phones(status, registerDate DESC, id DESC);",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_phones_supplier_register_date ON phones(supplierId, registerDate DESC, id DESC);",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_phones_supplier_purchase_date ON phones(supplierId, purchaseDate DESC, id DESC);",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_phones_supplier_status_sale_date ON phones(supplierId, status, saleDate DESC, id DESC);",
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS phone_inventory_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phoneId INTEGER,
      eventType TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      eventDate TEXT,
      tone TEXT,
      icon TEXT,
      oldStatus TEXT,
      newStatus TEXT,
      oldPurchasePrice REAL,
      newPurchasePrice REAL,
      oldSalePrice REAL,
      newSalePrice REAL,
      actorUserId INTEGER,
      actorUsername TEXT,
      actorDisplayName TEXT,
      metadata TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_phone_inventory_events_phone_created ON phone_inventory_events(phoneId, createdAt DESC);",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_phone_inventory_events_phone_event_date ON phone_inventory_events(phoneId, eventDate DESC, id DESC);",
  );
  console.log("Phone inventory events table ensured.");

  // اطمینان حاصل کنید که ستون returnDate برای ثبت تاریخ مرجوعی وجود داشته باشد
  try {
    await runAsync("ALTER TABLE phones ADD COLUMN returnDate TEXT");
    console.log("Phones table: returnDate column added.");
  } catch (error: unknown) {
    // اگر ستون قبلاً وجود داشته باشد، نادیده بگیرید
    if (!/duplicate column/i.test(getErrorMessage(error))) {
      console.error(
        "Error adding returnDate column to phones table:",
        getErrorMessage(error),
      );
    }
  }

  // قیمت خرید روز / قیمت جایگزینی گوشی برای تحلیل واقعی سود و سهم شرکا
  try {
    await runAsync("ALTER TABLE phones ADD COLUMN currentPurchasePrice REAL");
    console.log("Phones table: currentPurchasePrice column added.");
  } catch (error: unknown) {
    if (!/duplicate column/i.test(getErrorMessage(error))) {
      console.error(
        "Error adding currentPurchasePrice column to phones table:",
        getErrorMessage(error),
      );
    }
  }
  try {
    await runAsync(
      "ALTER TABLE phones ADD COLUMN currentPurchasePriceUpdatedAt TEXT",
    );
    console.log("Phones table: currentPurchasePriceUpdatedAt column added.");
  } catch (error: unknown) {
    if (!/duplicate column/i.test(getErrorMessage(error))) {
      console.error(
        "Error adding currentPurchasePriceUpdatedAt column to phones table:",
        getErrorMessage(error),
      );
    }
  }
  try {
    await runAsync(
      "UPDATE phones SET currentPurchasePrice = purchasePrice WHERE (currentPurchasePrice IS NULL OR currentPurchasePrice = 0) AND purchasePrice IS NOT NULL",
    );
  } catch (error: unknown) {
    console.error(
      "Error backfilling currentPurchasePrice:",
      getErrorMessage(error),
    );
  }

  // --- Phone Models / Colors (برای اتوکامپلیت + ذخیرهٔ پایدار) ---
  await runAsync(`
    CREATE TABLE IF NOT EXISTS phone_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);
  await runAsync(`
    CREATE TABLE IF NOT EXISTS phone_colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);

  // ------------------------------
  // Store ownership core (phase 2/3)
  // additive only; legacy partners table remains untouched.
  // ------------------------------
  await runAsync(`
    CREATE TABLE IF NOT EXISTS store_partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT,
      colorTag TEXT,
      notes TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      isStore INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);
  try {
    const storePartnerCols = await allTypedAsync<TableInfoRow>(
      "PRAGMA table_info(store_partners);",
    );
    if (!storePartnerCols.some((column) => column.name === "isStore")) {
      await runAsync(
        `ALTER TABLE store_partners ADD COLUMN isStore INTEGER NOT NULL DEFAULT 0`,
      );
    }
  } catch (error: unknown) {
    if (!/duplicate column/i.test(getErrorMessage(error))) {
      console.error(
        "Error adding isStore column to store_partners table:",
        getErrorMessage(error),
      );
    }
  }
  await runAsync(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_store_partners_name_unique ON store_partners(name);`,
  );
  await runAsync(`
    CREATE TABLE IF NOT EXISTS store_partner_legacy_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      storePartnerId INTEGER NOT NULL,
      legacyPartnerId INTEGER NOT NULL,
      linkType TEXT NOT NULL DEFAULT 'owner',
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      UNIQUE(storePartnerId, legacyPartnerId),
      UNIQUE(legacyPartnerId, linkType),
      FOREIGN KEY (storePartnerId) REFERENCES store_partners(id) ON DELETE CASCADE,
      FOREIGN KEY (legacyPartnerId) REFERENCES partners(id) ON DELETE CASCADE
    );
  `);
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_store_partner_legacy_links_store ON store_partner_legacy_links(storePartnerId);`,
  );
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_store_partner_legacy_links_legacy ON store_partner_legacy_links(legacyPartnerId);`,
  );
  await runAsync(`
    CREATE TABLE IF NOT EXISTS profit_share_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      notes TEXT,
      isDefault INTEGER NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);
  await runAsync(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_profit_share_profiles_title_unique ON profit_share_profiles(title);`,
  );
  await runAsync(`
    CREATE TABLE IF NOT EXISTS profit_share_profile_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profileId INTEGER NOT NULL,
      storePartnerId INTEGER NOT NULL,
      sharePercent REAL NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      UNIQUE(profileId, storePartnerId),
      FOREIGN KEY (profileId) REFERENCES profit_share_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (storePartnerId) REFERENCES store_partners(id) ON DELETE CASCADE
    );
  `);
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_profit_share_profile_items_profile ON profit_share_profile_items(profileId);`,
  );
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ownership_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      ownershipType TEXT NOT NULL DEFAULT 'shared',
      notes TEXT,
      profitShareProfileId INTEGER,
      isDefault INTEGER NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (profitShareProfileId) REFERENCES profit_share_profiles(id) ON DELETE SET NULL
    );
  `);
  await runAsync(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_ownership_profiles_title_unique ON ownership_profiles(title);`,
  );
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ownership_profile_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ownershipProfileId INTEGER NOT NULL,
      storePartnerId INTEGER NOT NULL,
      sharePercent REAL NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      roleLabel TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      UNIQUE(ownershipProfileId, storePartnerId),
      FOREIGN KEY (ownershipProfileId) REFERENCES ownership_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (storePartnerId) REFERENCES store_partners(id) ON DELETE CASCADE
    );
  `);
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ownership_profile_items_profile ON ownership_profile_items(ownershipProfileId);`,
  );
  await runAsync(`
    CREATE TABLE IF NOT EXISTS phone_ownership_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phoneId INTEGER NOT NULL,
      ownershipProfileId INTEGER NOT NULL,
      sourceLegacyPartnerId INTEGER,
      sourceMethod TEXT NOT NULL DEFAULT 'manual',
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      UNIQUE(phoneId),
      FOREIGN KEY (phoneId) REFERENCES phones(id) ON DELETE CASCADE,
      FOREIGN KEY (ownershipProfileId) REFERENCES ownership_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (sourceLegacyPartnerId) REFERENCES partners(id) ON DELETE SET NULL
    );
  `);
  await runAsync(`
    CREATE TABLE IF NOT EXISTS product_ownership_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      ownershipProfileId INTEGER NOT NULL,
      sourceLegacyPartnerId INTEGER,
      sourceMethod TEXT NOT NULL DEFAULT 'manual',
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      UNIQUE(productId),
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (ownershipProfileId) REFERENCES ownership_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (sourceLegacyPartnerId) REFERENCES partners(id) ON DELETE SET NULL
    );
  `);
  console.log("Store ownership core tables ensured.");

  const phoneCols = await allTypedAsync<TableInfoRow>(
    "PRAGMA table_info(phones);",
  );
  const phoneColNames = new Set(
    phoneCols.map((column) => column.name).filter(Boolean),
  );
  if (!phoneColNames.has("ownershipProfileId")) {
    try {
      await runAsync(
        "ALTER TABLE phones ADD COLUMN ownershipProfileId INTEGER",
      );
      console.log("Phones.ownershipProfileId column added.");
    } catch (error: unknown) {
      if (!/duplicate column/i.test(getErrorMessage(error))) {
        console.error(
          "Error adding phones.ownershipProfileId:",
          getErrorMessage(error),
        );
      }
    }
  }
  const productColsForOwnership = await allTypedAsync<TableInfoRow>(
    "PRAGMA table_info(products);",
  );
  const productColNamesForOwnership = new Set(
    productColsForOwnership.map((column) => column.name).filter(Boolean),
  );
  if (!productColNamesForOwnership.has("ownershipProfileId")) {
    try {
      await runAsync(
        "ALTER TABLE products ADD COLUMN ownershipProfileId INTEGER",
      );
      console.log("Products.ownershipProfileId column added.");
    } catch (error: unknown) {
      if (!/duplicate column/i.test(getErrorMessage(error))) {
        console.error(
          "Error adding products.ownershipProfileId:",
          getErrorMessage(error),
        );
      }
    }
  }
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_phones_ownershipProfileId ON phones(ownershipProfileId);`,
  );
  await runAsync(`
    CREATE TABLE IF NOT EXISTS sale_profit_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sourceKind TEXT NOT NULL,
      sourceId INTEGER NOT NULL,
      sourceItemRefType TEXT NOT NULL,
      sourceItemId INTEGER NOT NULL,
      saleDate TEXT,
      itemType TEXT NOT NULL,
      itemId INTEGER,
      itemDescription TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      ownershipProfileId INTEGER,
      ownershipTitle TEXT,
      ownershipType TEXT,
      profitShareProfileId INTEGER,
      profitShareProfileTitle TEXT,
      initialCostPerUnit REAL NOT NULL DEFAULT 0,
      marketCostPerUnit REAL NOT NULL DEFAULT 0,
      saleUnitPrice REAL NOT NULL DEFAULT 0,
      itemDiscount REAL NOT NULL DEFAULT 0,
      saleAmount REAL NOT NULL DEFAULT 0,
      initialCostAmount REAL NOT NULL DEFAULT 0,
      marketCostAmount REAL NOT NULL DEFAULT 0,
      ownerGainAmount REAL NOT NULL DEFAULT 0,
      sharedProfitAmount REAL NOT NULL DEFAULT 0,
      totalProfitAmount REAL NOT NULL DEFAULT 0,
      sourceStatus TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      UNIQUE(sourceKind, sourceItemRefType, sourceItemId)
    );
  `);
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_sale_profit_snapshots_source ON sale_profit_snapshots(sourceKind, sourceId);`,
  );
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_sale_profit_snapshots_partner_profile ON sale_profit_snapshots(ownershipProfileId, profitShareProfileId);`,
  );
  await runAsync(`
    CREATE TABLE IF NOT EXISTS sale_profit_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshotId INTEGER NOT NULL,
      sourceKind TEXT NOT NULL,
      sourceId INTEGER NOT NULL,
      sourceItemRefType TEXT NOT NULL,
      sourceItemId INTEGER NOT NULL,
      storePartnerId INTEGER NOT NULL,
      allocationType TEXT NOT NULL,
      sharePercent REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0,
      sourceStatus TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (snapshotId) REFERENCES sale_profit_snapshots(id) ON DELETE CASCADE,
      FOREIGN KEY (storePartnerId) REFERENCES store_partners(id) ON DELETE CASCADE
    );
  `);
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_sale_profit_allocations_source ON sale_profit_allocations(sourceKind, sourceId);`,
  );
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_sale_profit_allocations_snapshot ON sale_profit_allocations(snapshotId);`,
  );
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_sale_profit_allocations_partner ON sale_profit_allocations(storePartnerId);`,
  );
  await runAsync(`
    CREATE TABLE IF NOT EXISTS partner_settlement_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      settlementDate TEXT NOT NULL,
      fromStorePartnerId INTEGER NOT NULL,
      destinationKind TEXT NOT NULL DEFAULT 'partner',
      toStorePartnerId INTEGER,
      amount REAL NOT NULL DEFAULT 0,
      paymentMethod TEXT,
      referenceNo TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      createdByUserId INTEGER,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (fromStorePartnerId) REFERENCES store_partners(id) ON DELETE CASCADE,
      FOREIGN KEY (toStorePartnerId) REFERENCES store_partners(id) ON DELETE SET NULL
    );
  `);
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_partner_settlement_transactions_date ON partner_settlement_transactions(settlementDate);`,
  );
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_partner_settlement_transactions_from ON partner_settlement_transactions(fromStorePartnerId);`,
  );
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_partner_settlement_transactions_to ON partner_settlement_transactions(toStorePartnerId);`,
  );

  console.log("Sale profit snapshot tables ensured.");
  console.log("Partner settlement transaction table ensured.");

  console.log("Phone_models & phone_colors tables ensured.");

  // Seed مدل‌ها و رنگ‌ها (INSERT OR IGNORE => بدون تخریب داده‌های قبلی)
  const seedModels: string[] = [
    // Apple
    "iPhone SE (2022)",
    "iPhone 11",
    "iPhone 11 Pro",
    "iPhone 11 Pro Max",
    "iPhone 12 mini",
    "iPhone 12",
    "iPhone 12 Pro",
    "iPhone 12 Pro Max",
    "iPhone 13 mini",
    "iPhone 13",
    "iPhone 13 Pro",
    "iPhone 13 Pro Max",
    "iPhone 14",
    "iPhone 14 Plus",
    "iPhone 14 Pro",
    "iPhone 14 Pro Max",
    "iPhone 15",
    "iPhone 15 Plus",
    "iPhone 15 Pro",
    "iPhone 15 Pro Max",
    "iPhone 16",
    "iPhone 16 Plus",
    "iPhone 16 Pro",
    "iPhone 16 Pro Max",
    // Samsung
    "Galaxy S20",
    "Galaxy S20+",
    "Galaxy S20 Ultra",
    "Galaxy S21",
    "Galaxy S21+",
    "Galaxy S21 Ultra",
    "Galaxy S22",
    "Galaxy S22+",
    "Galaxy S22 Ultra",
    "Galaxy S23",
    "Galaxy S23+",
    "Galaxy S23 Ultra",
    "Galaxy S24",
    "Galaxy S24+",
    "Galaxy S24 Ultra",
    "Galaxy S25",
    "Galaxy S25+",
    "Galaxy S25 Ultra",
    "Galaxy Z Flip5",
    "Galaxy Z Fold5",
    "Galaxy Z Flip6",
    "Galaxy Z Fold6",
    "Galaxy A14",
    "Galaxy A15",
    "Galaxy A24",
    "Galaxy A25",
    "Galaxy A34",
    "Galaxy A35",
    "Galaxy A54",
    "Galaxy A55",
    "Galaxy A56",
    // Xiaomi / Redmi
    "Xiaomi 12",
    "Xiaomi 12 Pro",
    "Xiaomi 12T",
    "Xiaomi 12T Pro",
    "Xiaomi 13",
    "Xiaomi 13 Pro",
    "Xiaomi 13T",
    "Xiaomi 13T Pro",
    "Xiaomi 14",
    "Xiaomi 14 Pro",
    "Xiaomi 14 Ultra",
    "Xiaomi 14T",
    "Xiaomi 14T Pro",
    "Xiaomi 15",
    "Xiaomi 15 Pro",
    "Xiaomi 15 Ultra",
    "Redmi Note 11",
    "Redmi Note 11 Pro",
    "Redmi Note 12",
    "Redmi Note 12 Pro",
    "Redmi Note 13",
    "Redmi Note 13 Pro",
    "Redmi Note 13 Pro+",
    "Redmi Note 13 4G",
    "Redmi Note 14",
    "Redmi Note 14 Pro",
    "Redmi Note 14 Pro+",
    "Redmi Note 14 4G",
    // POCO (درخواستی + جدید)
    "POCO C61",
    "POCO C65",
    "POCO C71",
    "POCO C75",
    "POCO C76",
    "POCO C85",
    "POCO M6",
    "POCO M6 Pro",
    "POCO X3 Pro",
    "POCO X4 Pro",
    "POCO X5",
    "POCO X5 Pro",
    "POCO X6",
    "POCO X6 Pro",
    "POCO F4",
    "POCO F5",
    "POCO F5 Pro",
    "POCO F6",
    "POCO F6 Pro",
  ];
  const seedColors: string[] = [
    "مشکی",
    "سفید",
    "نقره‌ای",
    "خاکستری",
    "طلایی",
    "رزگلد",
    "آبی",
    "آبی روشن",
    "سرمه‌ای",
    "سبز",
    "سبز روشن",
    "قرمز",
    "صورتی",
    "بنفش",
    "زرد",
    "نارنجی",
    "قهوه‌ای",
    "کرمی",
    "یاسی",
    "گرافیتی",
    "بنفش تیره",
    "لیمویی",
    "زیتونی",
    // رنگ‌های رایج جدید
    "آبی تیتانیوم",
    "مشکی تیتانیوم",
    "سفید تیتانیوم",
    "طوسی تیتانیوم",
    "طبیعی تیتانیوم",
  ];
  for (const m of seedModels) {
    if (m && String(m).trim()) {
      await runAsync("INSERT OR IGNORE INTO phone_models (name) VALUES (?)", [
        String(m).trim(),
      ]);
    }
  }
  for (const c of seedColors) {
    if (c && String(c).trim()) {
      await runAsync("INSERT OR IGNORE INTO phone_colors (name) VALUES (?)", [
        String(c).trim(),
      ]);
    }
  }
};
