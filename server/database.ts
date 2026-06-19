
import sqlite3 from 'sqlite3';
import path, { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import moment from 'jalali-moment';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';

import type { 
    ActivityItem as FrontendActivityItem, 
    InstallmentSale as FrontendInstallmentSale,
    DashboardKPIs as FrontendDashboardKPIs,
    SalesDataPoint as FrontendSalesDataPoint, // Keep this if used by getDashboardSalesChartData for its specific output
    DailySalesPoint, // Add this for clarity if not already here
    TopSellingItem, // Add this for clarity
    SalesSummaryData as FrontendSalesSummaryData,
    DebtorReportItem as FrontendDebtorReportItem,
    CreditorReportItem as FrontendCreditorReportItem,
    TopCustomerReportItem as FrontendTopCustomerReportItem,
    TopSupplierReportItem as FrontendTopSupplierReportItem,
    PhoneSaleProfitReportItem, // Added
    PhoneInstallmentSaleProfitReportItem, // Added
    InvoiceData as FrontendInvoiceData,
    Role as FrontendRole,
    UserForDisplay as FrontendUserForDisplay,
    ChangePasswordPayload,
    ProfitabilityAnalysisItem,
    VelocityItem,
    PurchaseSuggestionItem,
    NewRepairData, // Added
    RepairPart, // Added
    Repair as FrontendRepair, // Added
    FinalizeRepairPayload,
    Service, // Added
} from '../types';

export type { ChangePasswordPayload, NewRepairData, FinalizeRepairPayload, Service };


// Shared types (could be imported from a shared types file if frontend and backend share one)
export interface ProductPayload {
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  stock_quantity: number;
  categoryId: number | null;
  supplierId: number | null;
}
export interface UpdateProductPayload { // For PUT /api/products/:id
  name?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  stock_quantity?: number;
  categoryId?: number | null;
  supplierId?: number | null;
}
export interface PhoneEntryPayload { // Used for POST
  model: string;
  color?: string | null;
  storage?: string | null;
  ram?: string | null;
  imei: string;
  batteryHealth?: number | null;
  condition?: string | null;
  purchasePrice: number;
  currentPurchasePrice?: number | null;
  salePrice?: number | null;
  sellerName?: string | null;
  purchaseDate?: string | null; // ISO Date string YYYY-MM-DD
  saleDate?: string | null;     // ISO Date string YYYY-MM-DD
  registerDate?: string; // ISO DateTime string
  status?: string; // e.g., "موجود در انبار", "فروخته شده"
  notes?: string | null;
  supplierId?: number | null;
}

export interface PhoneEntryUpdatePayload { // Used for PUT
  model?: string;
  color?: string | null;
  storage?: string | null;
  ram?: string | null;
  imei?: string;
  batteryHealth?: number | string | null;
  condition?: string | null;
  purchasePrice?: number | string | null;
  currentPurchasePrice?: number | string | null;
  salePrice?: number | string | null;
  sellerName?: string | null;
  purchaseDate?: string | null; // Can be Shamsi from datepicker, needs conversion if changed
  status?: string;
  notes?: string | null;
  supplierId?: number | string | null;
}


export type PhoneCostBasisSource = 'currentPurchasePrice' | 'documentBuyPrice' | 'purchasePrice';

export const toAccountingNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const resolvePhoneCostBasis = (phone: { currentPurchasePrice?: any; purchasePrice?: any } | null | undefined, documentBuyPrice?: any): { amount: number; source: PhoneCostBasisSource } => {
  const current = toAccountingNumber(phone?.currentPurchasePrice);
  const document = toAccountingNumber(documentBuyPrice);
  const original = toAccountingNumber(phone?.purchasePrice);
  if (current > 0) return { amount: current, source: 'currentPurchasePrice' };
  if (document > 0) return { amount: document, source: 'documentBuyPrice' };
  return { amount: original, source: 'purchasePrice' };
};

export const resolvePhoneCostBasisAmount = (phone: { currentPurchasePrice?: any; purchasePrice?: any } | null | undefined, documentBuyPrice?: any): number => resolvePhoneCostBasis(phone, documentBuyPrice).amount;

export const syncPhoneCostBasisSnapshots = async (phoneId: number, costBasisAmount: number): Promise<void> => {
  const phoneIdNum = Number(phoneId);
  const basis = toAccountingNumber(costBasisAmount);
  if (!Number.isInteger(phoneIdNum) || phoneIdNum <= 0 || basis <= 0) return;
  await runAsync(`UPDATE sales_transactions SET buyPrice = ? WHERE itemType = 'phone' AND itemId = ?`, [basis, phoneIdNum]).catch(() => undefined);
  await runAsync(`UPDATE sales_order_items SET buyPrice = ? WHERE itemType = 'phone' AND itemId = ?`, [basis, phoneIdNum]).catch(() => undefined);
  await runAsync(`UPDATE installment_sale_items SET buyPrice = ? WHERE itemType = 'phone' AND itemId = ?`, [basis, phoneIdNum]).catch(() => undefined);
};

export interface PhoneHistoryActor {
  userId?: number | null;
  username?: string | null;
  displayName?: string | null;
}

export interface PhoneInventoryEventPayload {
  eventType: string;
  title: string;
  description?: string | null;
  eventDate?: string | null;
  tone?: string | null;
  icon?: string | null;
  oldStatus?: string | null;
  newStatus?: string | null;
  oldPurchasePrice?: number | null;
  newPurchasePrice?: number | null;
  oldSalePrice?: number | null;
  newSalePrice?: number | null;
  metadata?: any;
  actor?: PhoneHistoryActor | null;
}


export interface SaleDataPayload {
  itemType: 'phone' | 'inventory' | 'service';
  itemId: number;
  quantity: number;
  transactionDate: string; // Shamsi date YYYY/MM/DD from frontend
  customerId?: number | null;
  notes?: string | null;
  discount?: number;
  paymentMethod: 'cash' | 'credit'; // Added
}
export interface CustomerPayload {
  fullName: string;
  phoneNumber?: string | null;
  address?: string | null;
  notes?: string | null;
  telegramChatId?: string | null;
}
export interface LedgerEntryPayload {
    description: string;
    debit?: number;
    credit?: number;
    transactionDate: string; // ISO DateTime string
    referenceType?: string | null;
    referenceId?: number | null;
    settlementBatchId?: string | null;
}


const inferCustomerLedgerReference = (
  description: string,
  debit?: number,
  credit?: number,
  explicit?: { referenceType?: string | null; referenceId?: number | null }
): { referenceType: string | null; referenceId: number | null } => {
  if (explicit?.referenceType || explicit?.referenceId != null) {
    return {
      referenceType: explicit?.referenceType || null,
      referenceId: explicit?.referenceId == null ? null : Number(explicit.referenceId) || null,
    };
  }

  const desc = String(description || '').trim();
  const invoiceMatch = desc.match(/(?:فاکتور(?:\s*فروش)?|invoice)\s*(?:شماره|#)?\s*(\d+)/i);
  const invoiceId = invoiceMatch ? Number(invoiceMatch[1]) || null : null;
  if (invoiceId) {
    if (Number(credit || 0) > 0 && Number(debit || 0) <= 0) {
      return { referenceType: 'sales_order_receipt', referenceId: invoiceId };
    }
    if (Number(debit || 0) > 0) {
      return { referenceType: 'sales_order_charge', referenceId: invoiceId };
    }
  }

  return { referenceType: null, referenceId: null };
};

const backfillCustomerLedgerReferences = async (): Promise<void> => {
  const rows = await allAsync(
    `SELECT id, description, debit, credit, referenceType, referenceId
       FROM customer_ledger
      WHERE (referenceType IS NULL OR referenceType = '' OR referenceId IS NULL)`
  ).catch(() => [] as any[]);

  for (const row of rows) {
    const inferred = inferCustomerLedgerReference(String(row.description || ''), Number(row.debit || 0), Number(row.credit || 0));
    if (!inferred.referenceType || inferred.referenceId == null) continue;
    await runAsync(
      `UPDATE customer_ledger
          SET referenceType = COALESCE(referenceType, ?),
              referenceId = COALESCE(referenceId, ?)
        WHERE id = ?`,
      [inferred.referenceType, inferred.referenceId, row.id]
    ).catch(() => null as any);
  }
};
export interface PartnerPayload {
  partnerName: string;
  partnerType: string;
  contactPerson?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  telegramChatId?: string | null;
}
export interface SettingItem {
    key: string;
    value: string;
}
export interface OldMobilePhonePayload { // For the deprecated mobile phone structure
    purchasePrice: number;
    sellingPrice: number;
    brand: string;
    model: string;
    color?: string;
    storage?: number;
    ram?: number;
    imei: string;
}

// Types for Installment Sales - Ensure these are exported if used by server/index.ts
export type CheckStatus =
  | "نزد فروشنده"
  | "در جریان وصول"
  | "نقد شد"
  | "برگشت خورد"
  | "به مشتری برگشت داده شده";


const normalizeCheckStatus = (raw: any): CheckStatus => {
  const s = String(raw || '').trim();
  if (s === 'نزد مشتری') return 'نزد فروشنده';
  if (s === 'وصول شده') return 'نقد شد';
  if (s === 'برگشت خورده') return 'برگشت خورد';
  if (s === 'باطل شده') return 'به مشتری برگشت داده شده';
  // اگر یکی از وضعیت‌های جدید بود، همان را برگردان
  return s as CheckStatus;
};

export type InstallmentPaymentStatus = "پرداخت نشده" | "پرداخت جزئی" | "پرداخت شده" | "دیرکرد";


export interface InstallmentCheckInfo {
  id?: number; 
  checkNumber: string;
  bankName: string;
  dueDate: string; 
  amount: number;
  status: CheckStatus;
  cashPaid?: number;
  cashRemaining?: number;
  cashPaymentId?: number | null;
  cashTransactions?: Array<{
    id?: number;
    amount_paid?: number;
    amountPaid?: number;
    payment_date?: string;
    paymentDate?: string;
    notes?: string;
  }>;
}

export interface InstallmentSalePayload { 
  customerId: number;
  phoneId: number;
  actualSalePrice: number;
  downPayment: number;
  numberOfInstallments: number;
  installmentAmount: number;
  installmentsStartDate: string; 
  checks: InstallmentCheckInfo[]; 
  notes?: string;
}

export interface UserUpdatePayload { // For updating user's role/profile
  roleId?: number;
  firstName?: string | null;
  lastName?: string | null;
}

export interface UserForDb {
  id: number;
  username: string;
  passwordHash: string;
  roleId: number;
  roleName: string;
  firstName?: string | null;
  lastName?: string | null;
  lastLoginAt?: string | null;
  dateAdded: string;
  avatarPath?: string | null;
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const DB_PATH = join(__dirname, 'kourosh_inventory.db');
const MOBILE_PHONE_CATEGORY_NAME = "گوشی‌های موبایل";
const DEFAULT_CATEGORIES = ["لوازم جانبی", "قطعات"];
// const DEFAULT_SUPPLIER_NAME = "تامین‌کننده پیش‌نمایش"; // This is now removed
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'password123'; // Default password for initial admin
const ADMIN_ROLE_NAME = 'Admin';
const SALESPERSON_ROLE_NAME = 'Salesperson';

// Additional role names for fine‑grained RBAC. These will be seeded on DB initialization.
// Manager: Has access to most reports and can view audit logs but cannot change settings.
// Warehouse: Manages product and inventory entries.
// Technician: Handles repair orders and service entries.
// Marketer: Can view RFM/Cohort analyses and manage campaigns.
const MANAGER_ROLE_NAME    = 'Manager';
const WAREHOUSE_ROLE_NAME  = 'Warehouse';
const TECHNICIAN_ROLE_NAME = 'Technician';
const MARKETER_ROLE_NAME   = 'Marketer';


let db: sqlite3.Database | null = null;

// -----------------------------
// Telegram Link Requests (Model A)
// -----------------------------
// Pending OTP-based linking requests.
// A customer is linked only after OTP verification.

export type TelegramLinkRequestStatus = 'pending' | 'verified' | 'expired' | 'blocked';

export interface TelegramLinkRequestRow {
  id: number;
  phone: string;
  chat_id: string;
  telegram_user_id: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  status: TelegramLinkRequestStatus;
  created_at: string;
  verified_at?: string | null;
  last_error?: string | null;
}

// Promisified DB operations
export const runAsync = (sql: string, params: any[] = []): Promise<sqlite3.RunResult> => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized. Call getDbInstance first."));
    db.run(sql, params, function(this: sqlite3.RunResult, err: Error | null) {
      if (err) return reject(err);
      resolve(this);
    });
  });
};

export const getAsync = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized. Call getDbInstance first."));
    db.get(sql, params, (err: Error | null, row: any) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

export const allAsync = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized. Call getDbInstance first."));
    db.all(sql, params, (err: Error | null, rows: any[]) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

export const execAsync = (sql: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized. Call getDbInstance first."));
    db.exec(sql, function(this: sqlite3.Statement, err: Error | null) {
      if (err) return reject(err);
      resolve();
    });
  });
};

const sanitizeJalaliDate = (input: string): string => {
  const map: Record<string, string> = {
    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
    '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
  };
  const clean = String(input || '')
    .trim()
    .replace(/[۰-۹٠-٩]/g, (d) => map[d] ?? d)
    .replace(/-/g, '/')
    .replace(/\bA\.?P\.?\b/gi, '')
    .replace(/\bAM\b|\bPM\b/gi, '')
    .replace(/[^0-9/]/g, '')
    .replace(/\/+$/g, '')
    .replace(/^\/+/, '');
  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (c.length === 4 && Number(c) >= 1200) return `${c}/${a.padStart(2, '0')}/${b.padStart(2, '0')}`;
    if (a.length === 4) return `${a}/${b.padStart(2, '0')}/${c.padStart(2, '0')}`;
  }
  return clean.replace(/\s+/g, '');
};
export const fromShamsiStringToISO = (shamsiDateString?: string | null): string | undefined => {
  if (!shamsiDateString || typeof shamsiDateString !== 'string' || shamsiDateString.trim() === '') return undefined;

  const clean = sanitizeJalaliDate(shamsiDateString);

  const m = moment(clean, ['jYYYY/jMM/jDD', 'jYYYY/jM/jD'], true).locale('en');
  return m.isValid() ? m.format('YYYY-MM-DD') : undefined;
};


const getOrCreateMobilePhoneCategory = async (): Promise<{ id: number; name: string }> => {
  let category = await getAsync("SELECT id, name FROM categories WHERE name = ?", [MOBILE_PHONE_CATEGORY_NAME]);
  if (!category) {
    const result = await runAsync("INSERT INTO categories (name) VALUES (?)", [MOBILE_PHONE_CATEGORY_NAME]);
    category = { id: result.lastID, name: MOBILE_PHONE_CATEGORY_NAME };
    console.log(`Category "${MOBILE_PHONE_CATEGORY_NAME}" created with ID: ${category.id}`);
  }
  return category;
};

const seedDefaultCategories = async (): Promise<void> => {
  for (const catName of DEFAULT_CATEGORIES) {
    const existing = await getAsync("SELECT id FROM categories WHERE name = ?", [catName]);
    if (!existing) {
      await runAsync("INSERT INTO categories (name) VALUES (?)", [catName]);
      console.log(`Default category "${catName}" created.`);
    }
  }
};

const seedInitialRolesAndAdmin = async (): Promise<void> => {
  // Ensure Admin Role
  let adminRole = await getAsync("SELECT id FROM roles WHERE name = ?", [ADMIN_ROLE_NAME]);
  if (!adminRole) {
    const adminRoleResult = await runAsync("INSERT INTO roles (name) VALUES (?)", [ADMIN_ROLE_NAME]);
    adminRole = { id: adminRoleResult.lastID };
    console.log(`Role "${ADMIN_ROLE_NAME}" created with ID: ${adminRole.id}`);
  }

  // Ensure Salesperson Role
  let salespersonRole = await getAsync("SELECT id FROM roles WHERE name = ?", [SALESPERSON_ROLE_NAME]);
  if (!salespersonRole) {
    const salespersonRoleResult = await runAsync("INSERT INTO roles (name) VALUES (?)", [SALESPERSON_ROLE_NAME]);
    salespersonRole = { id: salespersonRoleResult.lastID };
    console.log(`Role "${SALESPERSON_ROLE_NAME}" created with ID: ${salespersonRole.id}`);
  }

  // Ensure Manager Role
  let managerRole = await getAsync("SELECT id FROM roles WHERE name = ?", [MANAGER_ROLE_NAME]);
  if (!managerRole) {
    const managerRoleResult = await runAsync("INSERT INTO roles (name) VALUES (?)", [MANAGER_ROLE_NAME]);
    managerRole = { id: managerRoleResult.lastID };
    console.log(`Role "${MANAGER_ROLE_NAME}" created with ID: ${managerRole.id}`);
  }
  // Ensure Warehouse Role
  let warehouseRole = await getAsync("SELECT id FROM roles WHERE name = ?", [WAREHOUSE_ROLE_NAME]);
  if (!warehouseRole) {
    const warehouseRoleResult = await runAsync("INSERT INTO roles (name) VALUES (?)", [WAREHOUSE_ROLE_NAME]);
    warehouseRole = { id: warehouseRoleResult.lastID };
    console.log(`Role "${WAREHOUSE_ROLE_NAME}" created with ID: ${warehouseRole.id}`);
  }
  // Ensure Technician Role
  let technicianRole = await getAsync("SELECT id FROM roles WHERE name = ?", [TECHNICIAN_ROLE_NAME]);
  if (!technicianRole) {
    const technicianRoleResult = await runAsync("INSERT INTO roles (name) VALUES (?)", [TECHNICIAN_ROLE_NAME]);
    technicianRole = { id: technicianRoleResult.lastID };
    console.log(`Role "${TECHNICIAN_ROLE_NAME}" created with ID: ${technicianRole.id}`);
  }
  // Ensure Marketer Role
  let marketerRole = await getAsync("SELECT id FROM roles WHERE name = ?", [MARKETER_ROLE_NAME]);
  if (!marketerRole) {
    const marketerRoleResult = await runAsync("INSERT INTO roles (name) VALUES (?)", [MARKETER_ROLE_NAME]);
    marketerRole = { id: marketerRoleResult.lastID };
    console.log(`Role "${MARKETER_ROLE_NAME}" created with ID: ${marketerRole.id}`);
  }

  // Ensure Default Admin User
  const adminUser = await getAsync("SELECT id FROM users WHERE username = ?", [DEFAULT_ADMIN_USERNAME]);
  if (!adminUser && adminRole?.id) { // check adminRole.id to ensure role was created
    const hashedPassword = await bcryptjs.hash(DEFAULT_ADMIN_PASSWORD, 10);
    await runAsync("INSERT INTO users (username, passwordHash, roleId) VALUES (?, ?, ?)", [DEFAULT_ADMIN_USERNAME, hashedPassword, adminRole.id]);
    console.log(`Default admin user "${DEFAULT_ADMIN_USERNAME}" created.`);
  } else if (!adminRole?.id) {
    console.error(`Could not create default admin user because Admin role ID is missing.`);
  }
};

const ensureDefaultBusinessSettings = async (): Promise<void> => {
  const defaultSettings: SettingItem[] = [
    { key: 'store_name', value: 'فروشگاه کوروش' },
    { key: 'store_address_line1', value: 'خیابان اصلی، پلاک ۱۲۳' },
    { key: 'store_city_state_zip', value: 'تهران، استان تهران، ۱۲۳۴۵-۶۷۸' },
    { key: 'store_phone', value: '۰۲۱-۱۲۳۴۵۶۷۸' },
    { key: 'store_email', value: 'info@kouroshstore.example.com' },
      { key: 'backup_enabled', value: '1' },
    { key: 'backup_cron', value: '0 2 * * *' },
    { key: 'backup_timezone', value: 'Asia/Tehran' },
    { key: 'backup_retention', value: '14' },

    // Telegram routing (comma/newline separated chat ids, or JSON array)
    { key: 'telegram_chat_ids_reports', value: '' },
    { key: 'telegram_chat_ids_installments', value: '' },
    { key: 'telegram_chat_ids_sales', value: '' },
    { key: 'telegram_chat_ids_notifications', value: '' },

    // Commercial module feature flags
    { key: 'feature_cash_sales_enabled', value: '1' },
    { key: 'feature_dashboard_experience_enabled', value: '1' },
    { key: 'feature_installments_enabled', value: '1' },
    { key: 'feature_products_inventory_enabled', value: '1' },
    { key: 'feature_mobile_phones_enabled', value: '1' },
    { key: 'feature_purchases_stock_counts_enabled', value: '1' },
    { key: 'feature_people_crm_enabled', value: '1' },
    { key: 'feature_repairs_services_enabled', value: '1' },
    { key: 'feature_notifications_outbox_enabled', value: '1' },
    { key: 'feature_sms_enabled', value: '1' },
    { key: 'feature_telegram_enabled', value: '1' },
    { key: 'feature_advanced_reports_enabled', value: '1' },
    { key: 'feature_ai_pricing_enabled', value: '1' },
    { key: 'feature_smart_insights_enabled', value: '1' },
    { key: 'feature_audit_log_enabled', value: '1' },
    { key: 'feature_local_domain_pwa_enabled', value: '1' },
    { key: 'feature_phone_ai_pricing_settings_enabled', value: '1' },
    { key: 'feature_phone_ai_price_signal_enabled', value: '1' },
    { key: 'feature_phone_ai_strategy_advisor_enabled', value: '1' },
    { key: 'feature_phone_pricing_behavior_learning_enabled', value: '1' },
    { key: 'feature_phone_smart_warnings_enabled', value: '1' },
    { key: 'feature_phone_inventory_drilldown_enabled', value: '1' },
    { key: 'feature_dashboard_clock_widget_enabled', value: '1' },
    { key: 'feature_settings_ai_control_panel_enabled', value: '1' },
];

  for (const setting of defaultSettings) {
    const existing = await getAsync("SELECT value FROM settings WHERE key = ?", [setting.key]);
    if (!existing) {
      await runAsync("INSERT INTO settings (key, value) VALUES (?, ?)", [setting.key, setting.value]);
      console.log(`Default setting "${setting.key}" created.`);
    }
  }
};


const initializeDatabaseInternal = async (): Promise<void> => {
  // Non-destructive: Use CREATE TABLE IF NOT EXISTS
  try {
    await runAsync("PRAGMA foreign_keys = ON;");
    console.log("Foreign key support enabled.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );
    `);
    console.log("Categories table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS partners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partnerName TEXT NOT NULL,
        partnerType TEXT NOT NULL DEFAULT 'Supplier',
        contactPerson TEXT,
        phoneNumber TEXT UNIQUE,
        email TEXT,
        address TEXT,
        notes TEXT,
        dateAdded TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
      );
    `);
    console.log("Partners table ensured.");

    // Telegram chat id (optional, for direct partner messaging)
    try {
      await runAsync("ALTER TABLE partners ADD COLUMN telegramChatId TEXT");
      console.log("Partners table: telegramChatId column added.");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding telegramChatId column to partners table:', e?.message || e);
      }
    }
    try {
      await runAsync("ALTER TABLE partners ADD COLUMN telegram_linked_at TEXT");
      console.log("Partners table: telegram_linked_at column added.");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding telegram_linked_at column to partners table:', e?.message || e);
      }
    }
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
	console.log("Installment_transactions table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS partner_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partnerId INTEGER NOT NULL,
        transactionDate TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        description TEXT NOT NULL,
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        balance REAL NOT NULL,
        referenceType TEXT, -- 'phone_purchase', 'product_purchase', 'manual_payment', 'repair_fee', 'other'
        referenceId INTEGER, -- phone.id, product.id, repair.id or null
        settlementBatchId TEXT, -- groups product-based settlement payments created in one batch
        changeHistoryJson TEXT,
        FOREIGN KEY (partnerId) REFERENCES partners(id) ON DELETE CASCADE
      );
    `);
    console.log("Partner_ledger table ensured and enhanced with referenceType/ID.");
    try { await runAsync("ALTER TABLE partner_ledger ADD COLUMN createdAt TEXT"); } catch (e: any) { if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding partner_ledger.createdAt:', e?.message || e); }
    try { await runAsync("ALTER TABLE partner_ledger ADD COLUMN updatedAt TEXT"); } catch (e: any) { if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding partner_ledger.updatedAt:', e?.message || e); }
    try { await runAsync("ALTER TABLE partner_ledger ADD COLUMN settlementBatchId TEXT"); } catch (e: any) { if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding partner_ledger.settlementBatchId:', e?.message || e); }
    try { await runAsync("ALTER TABLE partner_ledger ADD COLUMN changeHistoryJson TEXT"); } catch (e: any) { if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding partner_ledger.changeHistoryJson:', e?.message || e); }
    try { await runAsync("CREATE INDEX IF NOT EXISTS idx_partner_ledger_settlement_batch ON partner_ledger(settlementBatchId)"); } catch (e: any) { console.error('Error creating idx_partner_ledger_settlement_batch:', e?.message || e); }
    try { await runAsync("ALTER TABLE customer_ledger ADD COLUMN createdAt TEXT"); } catch (e: any) { if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding customer_ledger.createdAt:', e?.message || e); }
    try { await runAsync("ALTER TABLE customer_ledger ADD COLUMN updatedAt TEXT"); } catch (e: any) { if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding customer_ledger.updatedAt:', e?.message || e); }
    const backfillLedgerTimestamps = async (tableName: string, dateColumn: string) => {
      try {
        await runAsync(`UPDATE ${tableName} SET createdAt = COALESCE(createdAt, ${dateColumn}, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')), updatedAt = COALESCE(updatedAt, createdAt, ${dateColumn}, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')) WHERE createdAt IS NULL OR updatedAt IS NULL`);
      } catch (e: any) {
        console.error(`Error backfilling ${tableName} timestamps:`, e?.message || e);
      }
    };
    await backfillLedgerTimestamps('customer_ledger', 'transactionDate');
    await backfillLedgerTimestamps('partner_ledger', 'transactionDate');

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
    console.log("Products table ensured.")


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
    const productCols: any[] = (await allAsync("PRAGMA table_info(products);")) as any[];
    const colNames = new Set((productCols || []).map((c: any) => c?.name).filter(Boolean));

    const safeAddColumn = async (col: string, alterSql: string) => {
      if (colNames.has(col)) return;
      try {
        await runAsync(alterSql);
        console.log(`Products.${col} column added.`);
      } catch (e: any) {
        const msg = String(e?.message || '').toLowerCase();
        if (msg.includes('duplicate column name')) {
          console.log(`Products.${col} column already exists.`);
          return;
        }
        throw e;
      }
    };

    await safeAddColumn("threshold", "ALTER TABLE products ADD COLUMN threshold INTEGER NOT NULL DEFAULT 5;");
    await safeAddColumn("sku", "ALTER TABLE products ADD COLUMN sku TEXT;");
    await safeAddColumn("barcode", "ALTER TABLE products ADD COLUMN barcode TEXT;");
    await safeAddColumn("unit", "ALTER TABLE products ADD COLUMN unit TEXT NOT NULL DEFAULT 'عدد';");

    // Indexes for faster list/search (safe)
    await runAsync("CREATE INDEX IF NOT EXISTS idx_products_date_added ON products(date_added);");
    await runAsync("CREATE INDEX IF NOT EXISTS idx_products_categoryId ON products(categoryId);");
    await runAsync("CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);");
    await runAsync("CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);");

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
    await runAsync("CREATE INDEX IF NOT EXISTS idx_phone_inventory_events_phone_created ON phone_inventory_events(phoneId, createdAt DESC);");
    console.log("Phone inventory events table ensured.");

    // اطمینان حاصل کنید که ستون returnDate برای ثبت تاریخ مرجوعی وجود داشته باشد
    try {
      await runAsync("ALTER TABLE phones ADD COLUMN returnDate TEXT");
      console.log("Phones table: returnDate column added.");
    } catch (e: any) {
      // اگر ستون قبلاً وجود داشته باشد، نادیده بگیرید
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding returnDate column to phones table:', e.message);
      }
    }


    // قیمت خرید روز / قیمت جایگزینی گوشی برای تحلیل واقعی سود و سهم شرکا
    try {
      await runAsync("ALTER TABLE phones ADD COLUMN currentPurchasePrice REAL");
      console.log("Phones table: currentPurchasePrice column added.");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding currentPurchasePrice column to phones table:', e.message);
      }
    }
    try {
      await runAsync("ALTER TABLE phones ADD COLUMN currentPurchasePriceUpdatedAt TEXT");
      console.log("Phones table: currentPurchasePriceUpdatedAt column added.");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding currentPurchasePriceUpdatedAt column to phones table:', e.message);
      }
    }
    try {
      await runAsync("UPDATE phones SET currentPurchasePrice = purchasePrice WHERE (currentPurchasePrice IS NULL OR currentPurchasePrice = 0) AND purchasePrice IS NOT NULL");
    } catch (e: any) {
      console.error('Error backfilling currentPurchasePrice:', e?.message || e);
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
      const storePartnerCols: any[] = (await allAsync("PRAGMA table_info(store_partners);")) as any[];
      if (!storePartnerCols.some((col) => String(col?.name || '') === 'isStore')) {
        await runAsync(`ALTER TABLE store_partners ADD COLUMN isStore INTEGER NOT NULL DEFAULT 0`);
      }
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding isStore column to store_partners table:', e.message);
      }
    }
    await runAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_store_partners_name_unique ON store_partners(name);`);
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
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_store_partner_legacy_links_store ON store_partner_legacy_links(storePartnerId);`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_store_partner_legacy_links_legacy ON store_partner_legacy_links(legacyPartnerId);`);
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
    await runAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_profit_share_profiles_title_unique ON profit_share_profiles(title);`);
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
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_profit_share_profile_items_profile ON profit_share_profile_items(profileId);`);
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
    await runAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ownership_profiles_title_unique ON ownership_profiles(title);`);
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
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_ownership_profile_items_profile ON ownership_profile_items(ownershipProfileId);`);
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
    console.log('Store ownership core tables ensured.');

    const phoneCols: any[] = (await allAsync("PRAGMA table_info(phones);")) as any[];
    const phoneColNames = new Set((phoneCols || []).map((c: any) => c?.name).filter(Boolean));
    if (!phoneColNames.has('ownershipProfileId')) {
      try {
        await runAsync("ALTER TABLE phones ADD COLUMN ownershipProfileId INTEGER");
        console.log('Phones.ownershipProfileId column added.');
      } catch (e: any) {
        if (!/duplicate column/i.test(e?.message || '')) {
          console.error('Error adding phones.ownershipProfileId:', e?.message || e);
        }
      }
    }
    if (!colNames.has('ownershipProfileId')) {
      try {
        await runAsync("ALTER TABLE products ADD COLUMN ownershipProfileId INTEGER");
        console.log('Products.ownershipProfileId column added.');
      } catch (e: any) {
        if (!/duplicate column/i.test(e?.message || '')) {
          console.error('Error adding products.ownershipProfileId:', e?.message || e);
        }
      }
    }
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_phones_ownershipProfileId ON phones(ownershipProfileId);`);
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
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_sale_profit_snapshots_source ON sale_profit_snapshots(sourceKind, sourceId);`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_sale_profit_snapshots_partner_profile ON sale_profit_snapshots(ownershipProfileId, profitShareProfileId);`);
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
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_sale_profit_allocations_source ON sale_profit_allocations(sourceKind, sourceId);`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_sale_profit_allocations_snapshot ON sale_profit_allocations(snapshotId);`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_sale_profit_allocations_partner ON sale_profit_allocations(storePartnerId);`);
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
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_partner_settlement_transactions_date ON partner_settlement_transactions(settlementDate);`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_partner_settlement_transactions_from ON partner_settlement_transactions(fromStorePartnerId);`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_partner_settlement_transactions_to ON partner_settlement_transactions(toStorePartnerId);`);

    console.log('Sale profit snapshot tables ensured.');
    console.log('Partner settlement transaction table ensured.');

    console.log('Phone_models & phone_colors tables ensured.');

    // Seed مدل‌ها و رنگ‌ها (INSERT OR IGNORE => بدون تخریب داده‌های قبلی)
    const seedModels: string[] = [
      // Apple
      'iPhone SE (2022)',
      'iPhone 11','iPhone 11 Pro','iPhone 11 Pro Max',
      'iPhone 12 mini','iPhone 12','iPhone 12 Pro','iPhone 12 Pro Max',
      'iPhone 13 mini','iPhone 13','iPhone 13 Pro','iPhone 13 Pro Max',
      'iPhone 14','iPhone 14 Plus','iPhone 14 Pro','iPhone 14 Pro Max',
      'iPhone 15','iPhone 15 Plus','iPhone 15 Pro','iPhone 15 Pro Max',
      'iPhone 16','iPhone 16 Plus','iPhone 16 Pro','iPhone 16 Pro Max',
      // Samsung
      'Galaxy S20','Galaxy S20+','Galaxy S20 Ultra',
      'Galaxy S21','Galaxy S21+','Galaxy S21 Ultra',
      'Galaxy S22','Galaxy S22+','Galaxy S22 Ultra',
      'Galaxy S23','Galaxy S23+','Galaxy S23 Ultra',
      'Galaxy S24','Galaxy S24+','Galaxy S24 Ultra',
      'Galaxy S25','Galaxy S25+','Galaxy S25 Ultra',
      'Galaxy Z Flip5','Galaxy Z Fold5','Galaxy Z Flip6','Galaxy Z Fold6',
      'Galaxy A14','Galaxy A15','Galaxy A24','Galaxy A25','Galaxy A34','Galaxy A35','Galaxy A54','Galaxy A55','Galaxy A56',
      // Xiaomi / Redmi
      'Xiaomi 12','Xiaomi 12 Pro','Xiaomi 12T','Xiaomi 12T Pro',
      'Xiaomi 13','Xiaomi 13 Pro','Xiaomi 13T','Xiaomi 13T Pro',
      'Xiaomi 14','Xiaomi 14 Pro','Xiaomi 14 Ultra','Xiaomi 14T','Xiaomi 14T Pro',
      'Xiaomi 15','Xiaomi 15 Pro','Xiaomi 15 Ultra',
      'Redmi Note 11','Redmi Note 11 Pro','Redmi Note 12','Redmi Note 12 Pro',
      'Redmi Note 13','Redmi Note 13 Pro','Redmi Note 13 Pro+','Redmi Note 13 4G',
      'Redmi Note 14','Redmi Note 14 Pro','Redmi Note 14 Pro+','Redmi Note 14 4G',
      // POCO (درخواستی + جدید)
      'POCO C61','POCO C65','POCO C71','POCO C75','POCO C76','POCO C85',
      'POCO M6','POCO M6 Pro','POCO X3 Pro','POCO X4 Pro','POCO X5','POCO X5 Pro','POCO X6','POCO X6 Pro',
      'POCO F4','POCO F5','POCO F5 Pro','POCO F6','POCO F6 Pro',
    ];
    const seedColors: string[] = [
      'مشکی','سفید','نقره‌ای','خاکستری','طلایی','رزگلد','آبی','آبی روشن','سرمه‌ای','سبز','سبز روشن',
      'قرمز','صورتی','بنفش','زرد','نارنجی','قهوه‌ای','کرمی','یاسی',
      'گرافیتی','بنفش تیره','لیمویی','زیتونی',
      // رنگ‌های رایج جدید
      'آبی تیتانیوم','مشکی تیتانیوم','سفید تیتانیوم','طوسی تیتانیوم','طبیعی تیتانیوم',
    ];
    for (const m of seedModels) {
      if (m && String(m).trim()) {
        await runAsync('INSERT OR IGNORE INTO phone_models (name) VALUES (?)', [String(m).trim()]);
      }
    }
    for (const c of seedColors) {
      if (c && String(c).trim()) {
        await runAsync('INSERT OR IGNORE INTO phone_colors (name) VALUES (?)', [String(c).trim()]);
      }
    }

    await runAsync(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT NOT NULL,
        phoneNumber TEXT UNIQUE,
        address TEXT,
        notes TEXT,
        tags TEXT,
        dateAdded TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
      );
    `);
    console.log("Customers table ensured.");

    // Customer tags (CRM)
    // Older databases may not have the column; try to add it.
    try {
      await runAsync("ALTER TABLE customers ADD COLUMN tags TEXT");
      console.log("Customers table: tags column added.");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding tags column to customers table:', e?.message || e);
      }
    }

    
    // Customer risk override (CRM)
    try {
      await runAsync("ALTER TABLE customers ADD COLUMN riskOverride TEXT");
      console.log("Customers table: riskOverride column added.");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding riskOverride column to customers table:', e?.message || e);
      }
    }

    // Telegram chat id (optional, for direct customer messaging)
    try {
      await runAsync("ALTER TABLE customers ADD COLUMN telegramChatId TEXT");
      console.log("Customers table: telegramChatId column added.");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding telegramChatId column to customers table:', e?.message || e);
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
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding telegram_chat_id column to customers table:', e?.message || e);
      }
    }
    try {
      await runAsync("ALTER TABLE customers ADD COLUMN telegram_user_id TEXT");
      console.log("Customers table: telegram_user_id column added.");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding telegram_user_id column to customers table:', e?.message || e);
      }
    }
    try {
      await runAsync("ALTER TABLE customers ADD COLUMN telegram_linked_at TEXT");
      console.log("Customers table: telegram_linked_at column added.");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding telegram_linked_at column to customers table:', e?.message || e);
      }
    }
    // SQLite: ADD COLUMN with DEFAULT works, but NOT NULL may be problematic on some older engines.
    // We keep it nullable with DEFAULT 0 semantics.
    try {
      await runAsync("ALTER TABLE customers ADD COLUMN telegram_opted_out INTEGER DEFAULT 0");
      await runAsync("ALTER TABLE customers ADD COLUMN telegram_invalid INTEGER DEFAULT 0").catch(() => {});
      await runAsync("ALTER TABLE customers ADD COLUMN telegram_invalid_reason TEXT").catch(() => {});
      await runAsync("ALTER TABLE customers ADD COLUMN telegram_invalid_at TEXT").catch(() => {});
      console.log("Customers table: telegram_opted_out column added.");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding telegram_opted_out column to customers table:', e?.message || e);
      }
    }

    // Helpful indexes (safe)
    try {
      await runAsync("CREATE INDEX IF NOT EXISTS idx_customers_telegram_chat_id ON customers(telegram_chat_id);");
      await runAsync("CREATE INDEX IF NOT EXISTS idx_customers_telegram_user_id ON customers(telegram_user_id);");
      console.log("Customers table: telegram indexes ensured.");
    } catch (e: any) {
      console.error('Error ensuring telegram indexes on customers table:', e?.message || e);
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
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_tglink_phone ON telegram_link_requests(phone);`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_tglink_status ON telegram_link_requests(status);`);
    console.log('Telegram_link_requests table ensured.');

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
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_tgtokens_customer ON telegram_link_tokens(customer_id);`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_tgtokens_status ON telegram_link_tokens(status);`);

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
    try { await runAsync("ALTER TABLE customer_ledger ADD COLUMN createdAt TEXT"); } catch (e: any) { if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding customer_ledger.createdAt:', e?.message || e); }
    try { await runAsync("ALTER TABLE customer_ledger ADD COLUMN updatedAt TEXT"); } catch (e: any) { if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding customer_ledger.updatedAt:', e?.message || e); }
    try { await runAsync("ALTER TABLE customer_ledger ADD COLUMN referenceType TEXT"); } catch (e: any) { if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding customer_ledger.referenceType:', e?.message || e); }
    try { await runAsync("ALTER TABLE customer_ledger ADD COLUMN referenceId INTEGER"); } catch (e: any) { if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding customer_ledger.referenceId:', e?.message || e); }
    try { await runAsync("CREATE INDEX IF NOT EXISTS idx_customer_ledger_reference ON customer_ledger(referenceType, referenceId)"); } catch (e: any) { console.error('Error creating idx_customer_ledger_reference:', e?.message || e); }
    try { await backfillCustomerLedgerReferences(); } catch (e: any) { console.error('Error backfilling customer_ledger references:', e?.message || e); }
    try {
      const ledgerRefsToBackfill = await allAsync(`
        SELECT id, description, debit, credit, referenceType, referenceId
          FROM customer_ledger
         WHERE referenceId IS NULL OR referenceType IS NULL OR TRIM(COALESCE(referenceType,'')) = ''
      `);
      for (const row of ledgerRefsToBackfill as any[]) {
        const desc = String(row?.description || '');
        const invoiceNo = Number((desc.match(/(?:فاکتور(?: فروش)?(?: اعتباری| نقدی)? شماره|مرجوعی فاکتور شماره|پرداخت فاکتور شماره|invoice\s*#?)\s*(\d+)/i)?.[1] || 0));
        if (!invoiceNo) continue;
        let referenceType = String(row?.referenceType || '').trim();
        if (!referenceType) {
          if (Number(row?.credit || 0) > 0 && /مرجوعی فاکتور|پرداخت فاکتور|invoice/i.test(desc)) referenceType = 'sales_order_payment';
          else if (Number(row?.debit || 0) > 0 && /فاکتور فروش/i.test(desc)) referenceType = 'sales_order_charge';
        }
        if (!referenceType) continue;
        await runAsync(`UPDATE customer_ledger SET referenceType = ?, referenceId = COALESCE(referenceId, ?) WHERE id = ?`, [referenceType, invoiceNo, row.id]);
      }
    } catch (e: any) { console.error('Error backfilling customer_ledger references:', e?.message || e); }

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

    await runAsync(`
      CREATE TABLE IF NOT EXISTS dismissed_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        notificationId TEXT NOT NULL,
        dismissedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        UNIQUE(userId, notificationId)
      );
    `);
    console.log("Dismissed_notifications table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS sms_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        createdByUserId INTEGER,
        createdByUsername TEXT,
        provider TEXT NOT NULL,
        eventType TEXT, -- e.g. INSTALLMENT_COMPLETED / TEST_PATTERN
        entityType TEXT, -- e.g. installment_sale / repair / invoice
        entityId INTEGER,
        recipient TEXT NOT NULL,
        patternId TEXT, -- bodyId/template/patternCode
        tokensJson TEXT, -- JSON array of strings
        success INTEGER NOT NULL DEFAULT 0,
        responseJson TEXT,
        errorText TEXT
      );
    `);
    console.log("Sms_logs table ensured.");

    // ---- SMS Logs schema migrations (non-breaking) ----
    // Older DBs may miss newer columns; add them safely.
    const addCol = async (name: str, decl: str): Promise<void> => {
      try {
        // SQLite: adding an existing column throws; we ignore.
        await runAsync(`ALTER TABLE sms_logs ADD COLUMN ${name} ${decl}`);
      } catch {}
    };

    await addCol('error', 'TEXT');
    await addCol('relatedLogId', 'INTEGER');
    await addCol('requestJson', 'TEXT');
    await addCol('httpStatus', 'INTEGER');
    await addCol('rawResponseText', 'TEXT');
    await addCol('durationMs', 'INTEGER');
    await addCol('correlationId', 'TEXT');


    await runAsync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expenseDate TEXT NOT NULL, -- ISO
        category TEXT NOT NULL, -- rent|salary|inventory|overhead
        title TEXT NOT NULL,
        amount INTEGER NOT NULL, -- stored in smallest currency unit (rial) or toman? using integer as before
        vendor TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        createdByUserId INTEGER,
        createdByUsername TEXT
      );
    `);
    console.log("Expenses table ensured.");

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
      CREATE TABLE IF NOT EXISTS debt_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        snapshotDate TEXT NOT NULL, -- YYYY-MM-DD
        totalDebt REAL NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        UNIQUE(snapshotDate)
      );
    `);
    console.log("Debt_snapshots table ensured.");

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
      const hasBuyPrice = Array.isArray(stCols) && stCols.some((c: any) => c?.name === "buyPrice");
      if (!hasBuyPrice) {
        await runAsync("ALTER TABLE sales_transactions ADD COLUMN buyPrice REAL DEFAULT 0;");
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
      console.error("Error ensuring sales_transactions.buyPrice column:", e?.message || e);
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

try {
  const soiCols = await allAsync("PRAGMA table_info(sales_order_items);");
  const hasBuyPrice = Array.isArray(soiCols) && soiCols.some((c: any) => c?.name === "buyPrice");
  if (!hasBuyPrice) {
    await runAsync("ALTER TABLE sales_order_items ADD COLUMN buyPrice REAL DEFAULT 0;");
    console.log("Sales_order_items.buyPrice column added.");
  }
} catch (e: any) {
  console.error("Error ensuring sales_order_items.buyPrice column:", e?.message || e);
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
  console.error("Error backfilling sales_order_items.buyPrice:", e?.message || e);
}

// ------------------------------
// P0 Extensions: Returns / Purchases / Stock Count / Adjustments
// ------------------------------
// --- Add status/cancel fields to sales_orders (safe add) ---
try {
  const soCols = await allAsync("PRAGMA table_info(sales_orders);");
  const hasStatus = Array.isArray(soCols) && soCols.some((c: any) => c?.name === "status");
  const hasCanceledAt = Array.isArray(soCols) && soCols.some((c: any) => c?.name === "canceledAt");
  const hasCancelReason = Array.isArray(soCols) && soCols.some((c: any) => c?.name === "cancelReason");
  if (!hasStatus) {
    await runAsync("ALTER TABLE sales_orders ADD COLUMN status TEXT NOT NULL DEFAULT 'active';");
    console.log("Sales_orders.status column added.");
  }
  if (!hasCanceledAt) {
    await runAsync("ALTER TABLE sales_orders ADD COLUMN canceledAt TEXT;");
    console.log("Sales_orders.canceledAt column added.");
  }
  if (!hasCancelReason) {
    await runAsync("ALTER TABLE sales_orders ADD COLUMN cancelReason TEXT;");
    console.log("Sales_orders.cancelReason column added.");
  }
} catch (e: any) {
  console.error("Error ensuring sales_orders cancel columns:", e?.message || e);
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


    await runAsync(`
      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        price REAL NOT NULL DEFAULT 0
      );
    `);
    console.log("Services table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );
    `);
    console.log("Settings table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );
    `);
    console.log("Roles table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        roleId INTEGER NOT NULL,
        dateAdded TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE RESTRICT -- Prevent role deletion if in use
      );
    `);
    console.log("Users table ensured.");
    await runAsync(`
      CREATE TABLE IF NOT EXISTS user_dashboard_layouts (
        userId INTEGER PRIMARY KEY,
        layoutJson TEXT NOT NULL,
        updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log("User dashboard layouts table ensured.");


     try {
      await runAsync("ALTER TABLE users ADD COLUMN avatarPath TEXT");
      console.log("Column 'avatarPath' added to 'users' table.");
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) {
        console.error("Error adding avatarPath column to users:", e);
      }
    }

    try {
      await runAsync("ALTER TABLE users ADD COLUMN firstName TEXT");
      console.log("Column 'firstName' added to 'users' table.");
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) {
        console.error("Error adding firstName column to users:", e);
      }
    }

    try {
      await runAsync("ALTER TABLE users ADD COLUMN lastName TEXT");
      console.log("Column 'lastName' added to 'users' table.");
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) {
        console.error("Error adding lastName column to users:", e);
      }
    }

    try {
      await runAsync("ALTER TABLE users ADD COLUMN lastLoginAt TEXT");
      console.log("Column 'lastLoginAt' added to 'users' table.");
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) {
        console.error("Error adding lastLoginAt column to users:", e);
      }
    }

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
        saleType TEXT NOT NULL DEFAULT 'installment', -- installment | check
        itemsSummary TEXT,
        metaJson TEXT,
        notes TEXT,
        dateCreated TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (phoneId) REFERENCES phones(id) ON DELETE SET NULL
      );
    `);
    console.log("Installment_sales table ensured.");

    // مهاجرت امن: اگر phoneId در دیتابیس‌های قدیمی NOT NULL باشد، جدول را بازسازی می‌کنیم تا NULL را بپذیرد.
    try {
      const cols = await allAsync("PRAGMA table_info(installment_sales);");
      const phoneCol = Array.isArray(cols) ? cols.find((c: any) => c?.name === 'phoneId') : null;
      const phoneNotNull = phoneCol ? Number(phoneCol.notnull) === 1 : false;
      if (phoneNotNull) {
        console.log('Migrating installment_sales.phoneId to allow NULL...');
        await execAsync('PRAGMA foreign_keys=OFF;');
        await execAsync('BEGIN TRANSACTION;');
        await runAsync('ALTER TABLE installment_sales RENAME TO installment_sales_old;');
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
            saleType TEXT NOT NULL DEFAULT 'installment',
            itemsSummary TEXT,
            metaJson TEXT,
            notes TEXT,
            dateCreated TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
            FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
            FOREIGN KEY (phoneId) REFERENCES phones(id) ON DELETE SET NULL
          );
        `);
        await runAsync(`
          INSERT INTO installment_sales
            (id, customerId, phoneId, actualSalePrice, downPayment, numberOfInstallments, installmentAmount, installmentsStartDate, saleDate, notes, dateCreated)
          SELECT id, customerId, phoneId, actualSalePrice, downPayment, numberOfInstallments, installmentAmount, installmentsStartDate, NULL, notes, dateCreated
          FROM installment_sales_old;
        `);
        await runAsync('DROP TABLE installment_sales_old;');
        await execAsync('COMMIT;');
        await execAsync('PRAGMA foreign_keys=ON;');
        console.log('Migration installment_sales done.');
      }
    } catch (e: any) {
      try { await execAsync('ROLLBACK;'); } catch {}
      try { await execAsync('PRAGMA foreign_keys=ON;'); } catch {}
      console.error('Migration error installment_sales:', e?.message || e);
    }

    // اطمینان از وجود ستون‌های جدید در دیتابیس‌های قدیمی
    try {
      await runAsync("ALTER TABLE installment_sales ADD COLUMN saleType TEXT NOT NULL DEFAULT 'installment'");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding saleType column:', e?.message || e);
    }
    try {
      await runAsync('ALTER TABLE installment_sales ADD COLUMN itemsSummary TEXT');
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding itemsSummary column:', e?.message || e);
    }
    try {
      await runAsync('ALTER TABLE installment_sales ADD COLUMN metaJson TEXT');
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding metaJson column:', e?.message || e);
    }
    try {
      await runAsync('ALTER TABLE installment_sales ADD COLUMN saleDate TEXT');
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding saleDate column:', e?.message || e);
    }

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
    console.log('Installment_sale_items table ensured.');
    // سازگاری با دیتابیس‌های قدیمی: اگر برخی ستون‌های جدول installment_sale_items وجود نداشتند، اضافه شوند.
    try {
      await runAsync('ALTER TABLE installment_sale_items ADD COLUMN itemId INTEGER');
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding installment_sale_items.itemId:', e?.message || e);
    }
    try {
      await runAsync("ALTER TABLE installment_sale_items ADD COLUMN buyPrice REAL DEFAULT 0");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding installment_sale_items.buyPrice:', e?.message || e);
    }
    try {
      await runAsync("ALTER TABLE installment_sale_items ADD COLUMN totalPrice REAL NOT NULL DEFAULT 0");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding installment_sale_items.totalPrice:', e?.message || e);
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
      await runAsync('ALTER TABLE installment_checks ADD COLUMN bankName TEXT');
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding installment_checks.bankName:', e?.message || e);
    }
    try {
      await runAsync('ALTER TABLE installment_checks ADD COLUMN notes TEXT');
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding installment_checks.notes:', e?.message || e);
    }
    try {
      await runAsync('ALTER TABLE installment_payments ADD COLUMN amountDue REAL NOT NULL DEFAULT 0');
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding installment_payments.amountDue:', e?.message || e);
    }
    try {
      await runAsync("ALTER TABLE installment_payments ADD COLUMN sourceType TEXT NOT NULL DEFAULT 'installment'");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding installment_payments.sourceType:', e?.message || e);
    }
    try {
      await runAsync('ALTER TABLE installment_payments ADD COLUMN sourceId INTEGER');
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding installment_payments.sourceId:', e?.message || e);
    }


    // --- Repair installment child tables if they still point to legacy installment_sales_old ---
    const fixLegacyInstallmentFKs = async () => {
      const getFkTarget = async (tableName: string): Promise<string | null> => {
        try {
          const fks = await allAsync(`PRAGMA foreign_key_list(${tableName});`);
          const fk = Array.isArray(fks) ? fks.find((row: any) => String(row?.from || '') === 'saleId') : null;
          return fk ? String(fk.table || '') : null;
        } catch {
          return null;
        }
      };

      const hasColumnIn = async (tableName: string, columnName: string): Promise<boolean> => {
        try {
          const cols = await allAsync(`PRAGMA table_info(${tableName});`);
          return Array.isArray(cols) && cols.some((c: any) => String(c?.name || '') === columnName);
        } catch {
          return false;
        }
      };

      const rebuildInstallmentPayments = async () => {
        console.log('Repairing installment_payments foreign key -> installment_sales ...');
        const tempTable = 'installment_payments__legacy_backup';
        try {
          await execAsync('PRAGMA foreign_keys=OFF;');
          await execAsync('BEGIN TRANSACTION;');
          await runAsync(`DROP TABLE IF EXISTS ${tempTable};`).catch(() => {});
          await runAsync(`ALTER TABLE installment_payments RENAME TO ${tempTable};`);
          await runAsync(`CREATE TABLE installment_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            saleId INTEGER NOT NULL,
            installmentNumber INTEGER NOT NULL,
            dueDate TEXT NOT NULL,
            amountDue REAL NOT NULL DEFAULT 0,
            paymentDate TEXT,
            status TEXT NOT NULL DEFAULT 'پرداخت نشده',
            FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE CASCADE
          );`);
          const hasAmountDue = await hasColumnIn(tempTable, 'amountDue');
          const amountExpr = hasAmountDue ? 'COALESCE(amountDue, 0)' : '0';
          await runAsync(`INSERT INTO installment_payments (id, saleId, installmentNumber, dueDate, amountDue, paymentDate, status)
            SELECT id, saleId, installmentNumber, dueDate, ${amountExpr}, paymentDate, COALESCE(status, 'پرداخت نشده')
            FROM ${tempTable};`);
          await runAsync(`DROP TABLE ${tempTable};`);
          await execAsync('COMMIT;');
          console.log('Repair installment_payments done.');
        } catch (e: any) {
          try { await execAsync('ROLLBACK;'); } catch {}
          throw e;
        } finally {
          try { await execAsync('PRAGMA foreign_keys=ON;'); } catch {}
        }
      };

      const rebuildInstallmentChecks = async () => {
        console.log('Repairing installment_checks foreign key -> installment_sales ...');
        const tempTable = 'installment_checks__legacy_backup';
        try {
          await execAsync('PRAGMA foreign_keys=OFF;');
          await execAsync('BEGIN TRANSACTION;');
          await runAsync(`DROP TABLE IF EXISTS ${tempTable};`).catch(() => {});
          await runAsync(`ALTER TABLE installment_checks RENAME TO ${tempTable};`);
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
          const hasBankName = await hasColumnIn(tempTable, 'bankName');
          const hasNotes = await hasColumnIn(tempTable, 'notes');
          const bankExpr = hasBankName ? 'bankName' : 'NULL';
          const notesExpr = hasNotes ? 'notes' : 'NULL';
          await runAsync(`INSERT INTO installment_checks (id, saleId, checkNumber, bankName, dueDate, amount, status, notes)
            SELECT id, saleId, checkNumber, ${bankExpr}, dueDate, amount, COALESCE(status, 'نزد فروشنده'), ${notesExpr}
            FROM ${tempTable};`);
          await runAsync(`DROP TABLE ${tempTable};`);
          await execAsync('COMMIT;');
          console.log('Repair installment_checks done.');
        } catch (e: any) {
          try { await execAsync('ROLLBACK;'); } catch {}
          throw e;
        } finally {
          try { await execAsync('PRAGMA foreign_keys=ON;'); } catch {}
        }
      };

      try {
        const paymentsFk = await getFkTarget('installment_payments');
        if (paymentsFk && paymentsFk !== 'installment_sales') {
          await rebuildInstallmentPayments();
        }

        const checksFk = await getFkTarget('installment_checks');
        if (checksFk && checksFk !== 'installment_sales') {
          await rebuildInstallmentChecks();
        }
      } catch (e: any) {
        console.error('Fix legacy installment FK migration failed:', e?.message || e);
      }
    };

    await fixLegacyInstallmentFKs();


    // --- Fix installment_transactions FK references (installment_payments_old -> installment_payments) ---
    const fixInstallmentTransactionsFK = async () => {
      try {
        const exists = await getAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='installment_transactions';");
        if (!exists) return;

        let fkTable: string | null = null;
        try {
          const fks = await allAsync("PRAGMA foreign_key_list(installment_transactions);");
          if (Array.isArray(fks) && fks.length > 0) fkTable = String(fks[0]?.table || '');
        } catch {
          // If pragma fails, skip
          return;
        }

        if (!fkTable || fkTable === 'installment_payments') return;

        // If FK points to a legacy/missing table (e.g., installment_payments_old), rebuild table safely
        console.log(`Migrating installment_transactions FK: ${fkTable} -> installment_payments ...`);
        await execAsync('PRAGMA foreign_keys=OFF;');
        await execAsync('BEGIN TRANSACTION;');

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
            FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE CASCADE
          );
        `);

        // Rename existing transactions table
        try { await runAsync('ALTER TABLE installment_transactions RENAME TO installment_transactions_old;'); } catch {}

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

        const canCopy = await getAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='installment_transactions_old';");
        if (canCopy) {
          await runAsync(`
            INSERT INTO installment_transactions (id, installment_payment_id, amount_paid, payment_date, notes)
            SELECT id, installment_payment_id, amount_paid, payment_date, notes
            FROM installment_transactions_old;
          `);
          await runAsync('DROP TABLE installment_transactions_old;');
        }

        await execAsync('COMMIT;');
        await execAsync('PRAGMA foreign_keys=ON;');
        console.log('Migration installment_transactions done.');
      } catch (e: any) {
        try { await execAsync('ROLLBACK;'); } catch {}
        try { await execAsync('PRAGMA foreign_keys=ON;'); } catch {}
        console.error('Fix installment_transactions FK migration failed:', e?.message || e);
      }
    };

    await fixInstallmentTransactionsFK();



    // Migration: normalize legacy check statuses (keeps existing data)
    try {
      await runAsync(`UPDATE installment_checks SET status='نزد فروشنده' WHERE status IS NULL OR TRIM(status)='' OR status='نزد مشتری'`);
      await runAsync(`UPDATE installment_checks SET status='نقد شد' WHERE status='وصول شده'`);
      await runAsync(`UPDATE installment_checks SET status='برگشت خورد' WHERE status='برگشت خورده'`);
      await runAsync(`UPDATE installment_checks SET status='به مشتری برگشت داده شده' WHERE status='باطل شده'`);
    } catch (e: any) {
      console.warn("Installment checks status migration skipped:", e?.message || e);
    }


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


    // New Repair Center Tables
    await runAsync(`
      CREATE TABLE IF NOT EXISTS repairs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerId INTEGER NOT NULL,
        deviceModel TEXT NOT NULL,
        deviceColor TEXT,
        serialNumber TEXT,
        problemDescription TEXT NOT NULL,
        technicianNotes TEXT,
        status TEXT NOT NULL,
        estimatedCost REAL,
        finalCost REAL,
        dateReceived TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        dateCompleted TEXT,
        technicianId INTEGER,
        laborFee REAL,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE RESTRICT,
        FOREIGN KEY (technicianId) REFERENCES partners(id) ON DELETE SET NULL
      );
    `);
    console.log("Repairs table ensured.");

     try {
      await runAsync("ALTER TABLE repairs ADD COLUMN technicianId INTEGER REFERENCES partners(id) ON DELETE SET NULL");
      console.log("Column 'technicianId' added to 'repairs' table.");
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) console.error("Error adding technicianId column to repairs:", e);
    }
    try {
      await runAsync("ALTER TABLE repairs ADD COLUMN laborFee REAL");
      console.log("Column 'laborFee' added to 'repairs' table.");
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) console.error("Error adding laborFee column to repairs:", e);
    }

    await runAsync(`
      CREATE TABLE IF NOT EXISTS repair_parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repairId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        quantityUsed INTEGER NOT NULL,
        FOREIGN KEY (repairId) REFERENCES repairs(id) ON DELETE CASCADE,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT
      );
    `);
    console.log("Repair_parts table ensured.");

    // --- Audit Logs Table ---
    // This table stores a record of user actions for accountability and debugging. Each row
    // captures the user performing the action, their role at the time, the type of action
    // (create/update/delete/login/etc.), the affected entity and its ID (if applicable),
    // a free‑form description of the operation, and a timestamp. See
    // audit_logs.ts for insertion helper. A foreign key links to users table.
    await runAsync(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        username TEXT,
        role TEXT,
        action TEXT NOT NULL,
        entityType TEXT,
        entityId INTEGER,
        description TEXT,
        createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        FOREIGN KEY (userId) REFERENCES users(id)
      );
    `);
    console.log("Audit_logs table ensured.");


  } catch(err: any) {
    console.error("Error during table creation phase:", err);
    throw new Error(`Failed during table creation: ${err.message}`);
  }
await ensureFts5UnifiedSearch();
await initSearchIndexIfNeeded();

  // Seed initial data (idempotently)
  try {
    await getOrCreateMobilePhoneCategory();
    await seedDefaultCategories();
    // The call to seedDefaultSupplier() is removed from here.
    await seedInitialRolesAndAdmin();
    await ensureDefaultBusinessSettings();
    await backfillLegacyHistoryAndLedgers().catch((e) => {
      console.error('Legacy history/ledger backfill failed:', e?.message || e);
    });
    await normalizePhonePurchaseLedgers().catch((e) => {
      console.error('Phone purchase ledger normalization failed:', e?.message || e);
    });
    console.log("Initial data seeding completed/verified.");
  } catch (err: any) {
    console.error("Error seeding initial data:", err);
  }
};

let dbInstance: sqlite3.Database | null = null;
let dbInitializationPromise: Promise<sqlite3.Database | null> | null = null;

export const getDbInstance = (forceNew: boolean = false): Promise<sqlite3.Database | null> => {
  if (dbInstance && !forceNew) return Promise.resolve(dbInstance);
  if (dbInitializationPromise && !forceNew) return dbInitializationPromise;

  dbInitializationPromise = new Promise<sqlite3.Database | null>((resolveConnection, rejectConnection) => {
    const connect = () => {
        const newDb = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, async (err: Error | null) => {
            if (err) {
                console.error('Error opening database connection:', err);
                dbInitializationPromise = null; // Reset promise on failure
                return rejectConnection(new Error(`Failed to open DB: ${err.message}`));
            }
            console.log('Connected to the SQLite database: kourosh_inventory.db');
            db = newDb; // Crucial: assign to the module-scoped db variable
            try {
                await initializeDatabaseInternal();
                dbInstance = newDb;
                resolveConnection(dbInstance);
            } catch (initErr: any) {
                console.error("Database initialization process failed:", initErr);
                dbInitializationPromise = null; // Reset promise on failure
                if (db) {
                    db.close(); // Attempt to close the problematic connection
                    db = null;
                }
                rejectConnection(new Error(`DB init failed: ${initErr.message}`));
            }
        });
    };

    if (db && forceNew) {
        db.close((closeErr: Error | null) => {
            if (closeErr) {
                console.error('Error closing existing DB for re-initialization:', closeErr);
                // Proceed with creating new connection anyway, but log the error
            }
            db = null;
            dbInstance = null;
            console.log('Existing DB connection closed (or attempted to close) for re-initialization.');
            connect();
        });
    } else {
        connect();
    }
  });
  return dbInitializationPromise;
};

export const closeDbConnection = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err: Error | null) => {
                if (err) {
                    console.error('Error closing the database connection:', err);
                    return reject(new Error(`Failed to close DB: ${err.message}`));
                }
                console.log('Database connection closed.');
                db = null;
                dbInstance = null;
                dbInitializationPromise = null;
                resolve();
            });
        } else {
            resolve();
        }
    });
};

// === Audit Log Helpers ===
/**
 * Inserts a new audit log entry capturing a user action. Pass null for userId if the action
 * is performed by the system (e.g. scheduled tasks). The action string should be a short
 * verb (e.g. 'create', 'update', 'delete', 'login'). The entityType is a high‑level
 * descriptor like 'product', 'sale', 'customer', etc. The entityId can be null when
 * the action is not tied to a specific row. The description should provide more
 * context; avoid storing sensitive data here. This function is fire‑and‑forget and
 * returns void; errors will be logged but not thrown.
 */
export const addAuditLog = async (
  userId: number | null,
  username: string | null,
  role: string | null,
  action: string,
  entityType: string | null,
  entityId: number | null,
  description: string | null
): Promise<void> => {
  try {
    await runAsync(
      `INSERT INTO audit_logs (userId, username, role, action, entityType, entityId, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId ?? null, username ?? null, role ?? null, action, entityType ?? null, entityId ?? null, description ?? null]
    );
  } catch (err) {
    console.error('Failed to insert audit log:', err);
  }
};

/**
 * Retrieves audit log entries in reverse chronological order. Supports simple pagination
 * using limit and offset parameters. Results include the userId, username, role,
 * action, entityType, entityId, description and createdAt fields.
 */
export const getAuditLogs = async (limit: number = 100, offset: number = 0) => {
  return allAsync(
    `SELECT id, userId, username, role, action, entityType, entityId, description, createdAt
     FROM audit_logs
     ORDER BY datetime(createdAt) DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
};

// === RFM and Cohort Reports ===
export interface RfmItem {
  customerId: number;
  customerName: string;
  recencyDays: number;
  frequency: number;
  monetary: number;
  rScore: number;
  fScore: number;
  mScore: number;
  rfm: string;
}

/**
 * Computes a simple RFM (Recency, Frequency, Monetary) analysis for all customers who
 * have at least one sales order. Recency is measured in days since the most recent
 * order, frequency is the count of orders, and monetary is the sum of order totals.
 * Scores for R/F/M are assigned from 1–3 using tertiles. Returns a list sorted
 * alphabetically by customer name.
 */
export const getRfmReport = async (): Promise<RfmItem[]> => {
  // Fetch aggregated order stats per customer. Null customerId rows are ignored.
  const rows: any[] = await allAsync(
    `SELECT c.id as customerId, c.fullName as customerName,
            MAX(o.transactionDate) as lastDate,
            COUNT(o.id) as frequency,
            SUM(o.grandTotal) as monetary
     FROM sales_orders o
     JOIN customers c ON c.id = o.customerId
     GROUP BY c.id
     HAVING COUNT(o.id) > 0`
  );
  if (!rows || rows.length === 0) return [];

  const now = moment().startOf('day');
  // Compute recency (in days) for each row and collect arrays for scoring.
  const recencies: number[] = [];
  const frequencies: number[] = [];
  const monetaries: number[] = [];
  for (const row of rows) {
    const recencyDays = now.diff(moment(row.lastDate).startOf('day'), 'days');
    row.recencyDays = recencyDays;
    recencies.push(recencyDays);
    frequencies.push(Number(row.frequency));
    monetaries.push(Number(row.monetary));
  }
  // Compute tertiles (0-33%, 34-66%, 67-100%) for scoring.
  const tertile = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const len = sorted.length;
    const t1 = sorted[Math.floor(len / 3)];
    const t2 = sorted[Math.floor((2 * len) / 3)];
    return [t1, t2];
  };
  const [recT1, recT2] = tertile(recencies);
  const [freqT1, freqT2] = tertile(frequencies);
  const [monT1, monT2] = tertile(monetaries);
  // Assign scores: for recency, lower days = higher score.
  const getScore = (v: number, t1: number, t2: number, invert: boolean = false) => {
    // invert = true means smaller values give higher score (for recency)
    if (!invert) {
      if (v <= t1) return 1;
      if (v <= t2) return 2;
      return 3;
    } else {
      if (v <= t1) return 3;
      if (v <= t2) return 2;
      return 1;
    }
  };
  const items: RfmItem[] = rows.map((row) => {
    const recScore = getScore(row.recencyDays, recT1, recT2, true);
    const freqScore = getScore(Number(row.frequency), freqT1, freqT2, false);
    const monScore = getScore(Number(row.monetary), monT1, monT2, false);
    return {
      customerId: row.customerId,
      customerName: row.customerName,
      recencyDays: row.recencyDays,
      frequency: Number(row.frequency),
      monetary: Number(row.monetary),
      rScore: recScore,
      fScore: freqScore,
      mScore: monScore,
      rfm: `${recScore}${freqScore}${monScore}`,
    };
  });
  // Sort by customer name for predictable display.
  return items.sort((a, b) => a.customerName.localeCompare(b.customerName, 'fa'));
};

export interface CohortRow {
  cohortMonth: string; // e.g. "2025-01"
  counts: number[];    // counts[i] = number of customers in cohort who purchased again i months later
  totals: number;      // total customers in cohort
}

/**
 * Generates a simple cohort analysis based on first purchase month. Each cohort is defined
 * by the month (YYYY-MM) in which a customer first made a purchase. For each cohort,
 * an array of counts is returned where index 0 represents the number of customers in
 * the cohort (baseline), index 1 the number who purchased again the following month,
 * index 2 the number who purchased again two months later, and so on. This allows
 * tracking retention over time. Note: this implementation ignores multiple purchases
 * within the same month beyond the first.
 */
export const getCohortReport = async (): Promise<CohortRow[]> => {
  // Step 1: gather first purchase month for each customer
  const firstPurchaseRows: any[] = await allAsync(
    `SELECT c.id as customerId, MIN(o.transactionDate) as firstDate
     FROM sales_orders o
     JOIN customers c ON c.id = o.customerId
     GROUP BY c.id`
  );
  if (!firstPurchaseRows || firstPurchaseRows.length === 0) return [];
  // Map customer -> first cohort month (YYYY-MM)
  const firstMonthMap: Record<number, string> = {};
  for (const row of firstPurchaseRows) {
    const monthStr = moment(row.firstDate).format('YYYY-MM');
    firstMonthMap[row.customerId] = monthStr;
  }
  // Collect all orders grouped by customer and month
  const orderRows: any[] = await allAsync(
    `SELECT o.customerId, o.transactionDate
     FROM sales_orders o
     WHERE o.customerId IS NOT NULL`
  );
  // Build a map: cohortMonth -> { customers: Set, counts: Map<offset, Set<customerId>> }
  const cohorts: Record<string, { customers: Set<number>; offsets: Map<number, Set<number>> }> = {};
  for (const row of orderRows) {
    const cid = row.customerId;
    const cohortMonth = firstMonthMap[cid];
    if (!cohortMonth) continue;
    const orderMonth = moment(row.transactionDate).format('YYYY-MM');
    // Compute offset: months difference between orderMonth and cohortMonth
    const offset = moment(orderMonth + '-01').diff(moment(cohortMonth + '-01'), 'months');
    if (offset < 0) continue; // Should not happen
    if (!cohorts[cohortMonth]) {
      cohorts[cohortMonth] = { customers: new Set<number>(), offsets: new Map<number, Set<number>>() };
    }
    cohorts[cohortMonth].customers.add(cid);
    if (!cohorts[cohortMonth].offsets.has(offset)) {
      cohorts[cohortMonth].offsets.set(offset, new Set<number>());
    }
    cohorts[cohortMonth].offsets.get(offset)!.add(cid);
  }
  // Convert to array of CohortRow
  const result: CohortRow[] = [];
  const sortedCohorts = Object.keys(cohorts).sort();
  for (const month of sortedCohorts) {
    const entry = cohorts[month];
    const maxOffset = Math.max(...Array.from(entry.offsets.keys()));
    const counts: number[] = [];
    for (let i = 0; i <= maxOffset; i++) {
      const set = entry.offsets.get(i);
      counts.push(set ? set.size : 0);
    }
    result.push({ cohortMonth: month, counts, totals: entry.customers.size });
  }
  return result;
};
// --- Reports helpers (top-level) ---
export const getProfitPerSaleMapFromDb = async (ids:number[]) => {
  await getDbInstance();
  if(!ids.length) return new Map<number,number>();
  const ph = ids.map(()=>'?').join(',');
  const rows = await allAsync(`
    SELECT st.id AS saleId,
           SUM(st.totalPrice - CASE
             WHEN st.itemType='inventory' THEN COALESCE(p.purchasePrice,0)*st.quantity
             WHEN st.itemType='phone'     THEN COALESCE(NULLIF(ph.currentPurchasePrice,0), NULLIF(st.buyPrice,0), ph.purchasePrice,0)*st.quantity
             ELSE 0 END) AS profit
    FROM sales_transactions st
    LEFT JOIN products p ON st.itemType='inventory' AND st.itemId=p.id
    LEFT JOIN phones   ph ON st.itemType='phone'     AND st.itemId=ph.id
    WHERE st.id IN (${ph})
    GROUP BY st.id
  `, ids);
  const map = new Map<number,number>();
  rows.forEach(r=>map.set(Number(r.saleId), Number(r.profit)||0));
  return map;
};


// Internal helper function for adding partner ledger entries
export const addPartnerLedgerEntryInternal = async ( // Made exportable if needed, but consider if it's truly public API
  partnerId: number,
  description: string,
  debit: number | undefined,
  credit: number | undefined,
  transactionDateISO?: string,
  referenceType?: string,
  referenceId?: number,
  settlementBatchId?: string,
  changeHistoryJson?: string | null
): Promise<any> => {
  const dateToStore = transactionDateISO || new Date().toISOString();
  const nowIso = new Date().toISOString();
  const prevBalanceRow = await getAsync(
    `SELECT balance FROM partner_ledger WHERE partnerId = ? ORDER BY id DESC LIMIT 1`,
    [partnerId]
  );
  const prevBalance = prevBalanceRow ? prevBalanceRow.balance : 0;
  const currentDebit = debit || 0;
  const currentCredit = credit || 0;
  const newBalance = prevBalance + currentCredit - currentDebit;

  const result = await runAsync(
    `INSERT INTO partner_ledger (partnerId, transactionDate, createdAt, updatedAt, description, debit, credit, balance, referenceType, referenceId, settlementBatchId, changeHistoryJson) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [partnerId, dateToStore, nowIso, nowIso, description, currentDebit, currentCredit, newBalance, referenceType, referenceId, settlementBatchId || null, changeHistoryJson || null]
  );
  return await getAsync("SELECT * FROM partner_ledger WHERE id = ?", [result.lastID]);
};

const PHONE_PURCHASE_LEDGER_REFERENCE_TYPES = ['phone_purchase', 'phone_purchase_edit', 'phone_purchase_reversal_on_edit'] as const;
const PRODUCT_PURCHASE_LEDGER_REFERENCE_TYPES = ['product_purchase', 'product_purchase_edit'] as const;
const PURCHASE_LEDGER_REFERENCE_TYPE_SET = new Set<string>([...PHONE_PURCHASE_LEDGER_REFERENCE_TYPES, ...PRODUCT_PURCHASE_LEDGER_REFERENCE_TYPES]);

type LedgerChangeHistoryEntry = {
  changedAt: string;
  reason?: string;
  actor?: { userId?: number | null; username?: string | null; displayName?: string | null } | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  note?: string | null;
};

const parseLedgerChangeHistory = (value: any): LedgerChangeHistoryEntry[] => {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const stringifyLedgerChangeHistory = (existing: any, next: LedgerChangeHistoryEntry): string => {
  const history = parseLedgerChangeHistory(existing);
  history.push(next);
  return JSON.stringify(history);
};

const buildPhonePurchaseDescription = (phone: { model?: string | null; imei?: string | null; id?: number | null; purchasePrice?: number | null; currentPurchasePrice?: number | null }) => {
  const price = Number(phone?.currentPurchasePrice ?? phone?.purchasePrice ?? 0) || 0;
  const label = [phone?.model || 'گوشی', phone?.imei ? `IMEI: ${phone.imei}` : '', phone?.id ? `شناسه گوشی: ${phone.id}` : ''].filter(Boolean).join(' • ');
  return `دریافت گوشی: ${label} به ارزش ${price.toLocaleString('fa-IR')}`;
};

const fetchLatestPurchaseLedgerRowForReference = async (referenceId: number, referenceTypes: readonly string[]) => {
  if (!referenceId || !referenceTypes.length) return null;
  const placeholders = referenceTypes.map(() => '?').join(', ');
  return await getAsync(
    `SELECT * FROM partner_ledger WHERE referenceId = ? AND referenceType IN (${placeholders}) ORDER BY datetime(COALESCE(updatedAt, createdAt, transactionDate)) DESC, id DESC LIMIT 1`,
    [referenceId, ...referenceTypes]
  );
};

// --- Services ---
export const getAllServicesFromDb = async (): Promise<Service[]> => {
    await getDbInstance();
    return await allAsync(`SELECT * FROM services ORDER BY name ASC`);
};

export const addServiceToDb = async (service: Omit<Service, 'id'>): Promise<Service> => {
    await getDbInstance();
    const { name, description, price } = service;
    try {
        const result = await runAsync(
            `INSERT INTO services (name, description, price) VALUES (?, ?, ?)`,
            [name, description, price]
        );
        return await getAsync("SELECT * FROM services WHERE id = ?", [result.lastID]);
    } catch (err: any) {
        if (err.message.includes('UNIQUE constraint failed')) {
            throw new Error('نام این خدمت تکراری است.');
        }
        throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
    }
};

export const updateServiceInDb = async (id: number, service: Omit<Service, 'id'>): Promise<Service> => {
    await getDbInstance();
    const { name, description, price } = service;
    try {
        await runAsync(
            `UPDATE services SET name = ?, description = ?, price = ? WHERE id = ?`,
            [name, description, price, id]
        );
        const updatedService = await getAsync("SELECT * FROM services WHERE id = ?", [id]);
        if (!updatedService) throw new Error("خدمت برای ویرایش یافت نشد.");
        return updatedService;
    } catch (err: any) {
        if (err.message.includes('UNIQUE constraint failed')) {
            throw new Error('نام این خدمت تکراری است.');
        }
        throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
    }
};

export const deleteServiceFromDb = async (id: number): Promise<boolean> => {
    await getDbInstance();
    const result = await runAsync(`DELETE FROM services WHERE id = ?`, [id]);
    if (result.changes === 0) {
      throw new Error("خدمت برای حذف یافت نشد.");
    }
    return result.changes > 0;
};


// --- Categories ---
export const addCategoryToDb = async (name: string): Promise<any> => {
  await getDbInstance(); // Ensure DB is initialized before any operation
  try {
    const result = await runAsync(`INSERT INTO categories (name) VALUES (?)`, [name]);
    return await getAsync("SELECT * FROM categories WHERE id = ?", [result.lastID]);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      throw new Error('نام دسته‌بندی تکراری است.');
    }
    console.error('DB Error (addCategoryToDb):', err);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const getAllCategoriesFromDb = async (): Promise<any[]> => {
  await getDbInstance();
  try {
    return await allAsync(`SELECT * FROM categories ORDER BY name ASC`);
  } catch (err: any) {
    console.error('DB Error (getAllCategoriesFromDb):', err);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const updateCategoryInDb = async (id: number, name: string): Promise<any> => {
  await getDbInstance();
  try {
    const existing = await getAsync("SELECT id FROM categories WHERE id = ?", [id]);
    if (!existing) {
      throw new Error("دسته‌بندی برای بروزرسانی یافت نشد.");
    }
    await runAsync(`UPDATE categories SET name = ? WHERE id = ?`, [name, id]);
    return await getAsync("SELECT * FROM categories WHERE id = ?", [id]);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      throw new Error('این نام دسته‌بندی قبلا ثبت شده است.');
    }
    console.error('DB Error (updateCategoryInDb):', err);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const deleteCategoryFromDb = async (id: number): Promise<boolean> => {
  await getDbInstance();
  try {
    const result = await runAsync(`DELETE FROM categories WHERE id = ?`, [id]);
    if (result.changes === 0) {
        // This check is a bit redundant if the calling function already checks for 404,
        // but good for direct DB function calls.
        throw new Error("دسته‌بندی برای حذف یافت نشد یا قبلا حذف شده است.");
    }
    return result.changes > 0;
  } catch (err: any) {
    console.error('DB Error (deleteCategoryFromDb):', err);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};


// --- Products (Inventory) ---
export const addProductToDb = async (product: ProductPayload): Promise<any> => {
  await getDbInstance();
  const { name, purchasePrice, sellingPrice, stock_quantity, categoryId, supplierId, sku, barcode, unit } = product as any;

  try {
    await execAsync("BEGIN TRANSACTION;");
    const result = await runAsync(
      `INSERT INTO products (name, purchasePrice, sellingPrice, stock_quantity, categoryId, supplierId, saleCount, sku, barcode, unit)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [name, purchasePrice, sellingPrice, stock_quantity, categoryId, supplierId, sku || null, barcode || null, unit || 'عدد']
    );
    const newProductId = result.lastID;

    if (supplierId && purchasePrice > 0 && stock_quantity > 0) {
      const creditAmount = purchasePrice * stock_quantity;
      const description = `دریافت کالا: ${stock_quantity} عدد ${name} (شناسه محصول: ${newProductId}) به ارزش واحد ${purchasePrice.toLocaleString('fa-IR')}`;
      await addPartnerLedgerEntryInternal(supplierId, description, 0, creditAmount, new Date().toISOString(), 'product_purchase', newProductId);
    }

    await execAsync("COMMIT;");
    return await getAsync(
      `SELECT p.*, c.name as categoryName, pa.partnerName as supplierName
       FROM products p
       LEFT JOIN categories c ON p.categoryId = c.id
       LEFT JOIN partners pa ON p.supplierId = pa.id
       WHERE p.id = ?`,
      [newProductId]
    );
  } catch (err: any) {
    await execAsync("ROLLBACK;");
    console.error('DB Error (addProductToDb):', err);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const getAllProductsFromDb = async (supplierIdFilter: number | null = null): Promise<any[]> => {
  await getDbInstance();
  let sql = `
    SELECT p.id, p.name, p.purchasePrice, p.sellingPrice, p.stock_quantity, p.saleCount, p.date_added, p.sku, p.barcode, p.unit,
           p.categoryId, c.name as categoryName,
           p.supplierId, pa.partnerName as supplierName
    FROM products p
    LEFT JOIN categories c ON p.categoryId = c.id
    LEFT JOIN partners pa ON p.supplierId = pa.id
  `;
  const params: any[] = [];
  if (supplierIdFilter) {
    sql += " WHERE p.supplierId = ?";
    params.push(supplierIdFilter);
  }
  sql += " ORDER BY p.date_added DESC";
  try {
    return await allAsync(sql, params);
  } catch (err: any) {
    console.error('DB Error (getAllProductsFromDb):', err);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const updateProductInDb = async (productId: number, productData: UpdateProductPayload): Promise<any> => {
    await getDbInstance();
    const { name, purchasePrice, sellingPrice, stock_quantity, categoryId, supplierId, sku, barcode, unit } = productData as any;

    const product = await getAsync("SELECT * FROM products WHERE id = ?", [productId]);
    if (!product) {
        throw new Error("محصول برای بروزرسانی یافت نشد.");
    }

    // Build the update query dynamically
    const fieldsToUpdate: string[] = [];
    const params: any[] = [];

    if (name !== undefined) { fieldsToUpdate.push("name = ?"); params.push(name); }
    if (purchasePrice !== undefined) { fieldsToUpdate.push("purchasePrice = ?"); params.push(purchasePrice); }
    if (sellingPrice !== undefined) { fieldsToUpdate.push("sellingPrice = ?"); params.push(sellingPrice); }
    if (stock_quantity !== undefined) { fieldsToUpdate.push("stock_quantity = ?"); params.push(stock_quantity); }
    if (categoryId !== undefined) { fieldsToUpdate.push("categoryId = ?"); params.push(categoryId); } // Handles null
    if (supplierId !== undefined) { fieldsToUpdate.push("supplierId = ?"); params.push(supplierId); } // Handles null
    if (sku !== undefined) { fieldsToUpdate.push("sku = ?"); params.push(sku || null); }
    if (barcode !== undefined) { fieldsToUpdate.push("barcode = ?"); params.push(barcode || null); }
    if (unit !== undefined) { fieldsToUpdate.push("unit = ?"); params.push(unit || 'عدد'); }

    if (fieldsToUpdate.length === 0) {
        return product; // No changes, return current product data
    }

    params.push(productId);
    const sql = `UPDATE products SET ${fieldsToUpdate.join(", ")} WHERE id = ?`;

    try {
        // For inventory products, direct ledger adjustment on simple edit is complex and often not standard.
        // Ledger entries are typically for acquisitions/disposals.
        // If purchase price or supplier changes AND stock_quantity changes, it could imply a new purchase or return.
        // For now, we just update the product details. Partner ledger adjustments would need more specific logic for stock changes.
        await runAsync(sql, params);
        return await getAsync(
         `SELECT p.*, c.name as categoryName, pa.partnerName as supplierName
          FROM products p
          LEFT JOIN categories c ON p.categoryId = c.id
          LEFT JOIN partners pa ON p.supplierId = pa.id
          WHERE p.id = ?`,
         [productId]
       );
    } catch (err: any) {
        console.error('DB Error (updateProductInDb):', err);
        throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
    }
};

export const deleteProductFromDb = async (productId: number): Promise<boolean> => {
    await getDbInstance();
    await execAsync("BEGIN TRANSACTION;");
    try {
        const product = await getAsync("SELECT * FROM products WHERE id = ?", [productId]);
        if (!product) {
            throw new Error("محصول برای حذف یافت نشد.");
        }

        const saleRecord = await getAsync(
            "SELECT id FROM sales_transactions WHERE itemType = 'inventory' AND itemId = ? LIMIT 1",
            [productId]
        );
        if (saleRecord) {
            throw new Error("امکان حذف محصول وجود ندارد زیرا قبلاً فروخته شده است.");
        }

        if (product.supplierId && product.purchasePrice > 0 && product.stock_quantity > 0) {
            const debitAmount = product.purchasePrice * product.stock_quantity;
            const description = `حذف/بازگشت کالا: ${product.stock_quantity} عدد ${product.name} (شناسه محصول: ${productId}) از انبار`;
            await addPartnerLedgerEntryInternal(product.supplierId, description, debitAmount, 0, new Date().toISOString(), 'product_return_on_delete', productId);
        }
        
        const result = await runAsync(`DELETE FROM products WHERE id = ?`, [productId]);
        
        await execAsync("COMMIT;");
        return result.changes > 0;
    } catch (err: any) {
        await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in deleteProductFromDb:", rbErr));
        console.error('DB Error (deleteProductFromDb):', err);
        throw err; // Re-throw the original error
    }
};

// --- Standalone Phones ---
const safeJsonStringify = (value: any): string | null => {
  if (value === undefined || value === null) return null;
  try { return JSON.stringify(value); } catch { return null; }
};

const safeJsonParse = <T = any>(value: any): T | null => {
  if (!value || typeof value !== 'string') return null;
  try { return JSON.parse(value) as T; } catch { return null; }
};

const normalizeMoney = (value: any): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const resolvePhoneHistoryActor = (actor?: PhoneHistoryActor | null) => ({
  userId: actor?.userId ?? null,
  username: actor?.username ?? null,
  displayName: actor?.displayName ?? actor?.username ?? null,
});

export const addPhoneInventoryEventToDb = async (phoneId: number | null, payload: PhoneInventoryEventPayload): Promise<any> => {
  await getDbInstance();
  const actor = resolvePhoneHistoryActor(payload.actor);
  const result = await runAsync(
    `INSERT INTO phone_inventory_events (
      phoneId, eventType, title, description, eventDate, tone, icon,
      oldStatus, newStatus, oldPurchasePrice, newPurchasePrice, oldSalePrice, newSalePrice,
      actorUserId, actorUsername, actorDisplayName, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      phoneId ?? null,
      payload.eventType,
      payload.title,
      payload.description || null,
      payload.eventDate || null,
      payload.tone || null,
      payload.icon || null,
      payload.oldStatus || null,
      payload.newStatus || null,
      normalizeMoney(payload.oldPurchasePrice),
      normalizeMoney(payload.newPurchasePrice),
      normalizeMoney(payload.oldSalePrice),
      normalizeMoney(payload.newSalePrice),
      actor.userId,
      actor.username,
      actor.displayName,
      safeJsonStringify(payload.metadata),
    ]
  );
  return await getAsync(`SELECT * FROM phone_inventory_events WHERE id = ?`, [result.lastID]);
};

export const listPhoneInventoryEventsFromDb = async (phoneId: number): Promise<any[]> => {
  await getDbInstance();
  const rows = await allAsync(
    `SELECT * FROM phone_inventory_events WHERE phoneId = ? ORDER BY datetime(COALESCE(eventDate, createdAt)) DESC, id DESC`,
    [phoneId]
  );
  return (rows || []).map((row: any) => ({ ...row, metadata: safeJsonParse(row.metadata) }));
};


const resolveHistoryWindow = (filters?: { days?: number; startDate?: string; endDate?: string }) => {
  const safeDays = Number.isFinite(Number(filters?.days)) && Number(filters?.days) > 0 ? Number(filters?.days) : 30;
  const startDate = String(filters?.startDate || '').trim();
  const endDate = String(filters?.endDate || '').trim();
  const hasCustomRange = !!(startDate || endDate);
  const sinceIso = startDate || new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();
  const untilIso = endDate ? `${endDate}T23:59:59.999Z` : new Date().toISOString();
  return { safeDays, sinceIso, untilIso, hasCustomRange };
};

export const getPhoneInventoryChangeReportFromDb = async (filters?: { days?: number; startDate?: string; endDate?: string }): Promise<any> => {
  await getDbInstance();
  const { safeDays, sinceIso, untilIso, hasCustomRange } = resolveHistoryWindow(filters);
  const rows = (await allAsync(
    `SELECT * FROM phone_inventory_events
      WHERE datetime(COALESCE(eventDate, createdAt)) >= datetime(?)
        AND datetime(COALESCE(eventDate, createdAt)) <= datetime(?)
      ORDER BY datetime(COALESCE(eventDate, createdAt)) DESC, id DESC`,
    [sinceIso, untilIso]
  )) || [];
  const parsedRows = rows.map((row: any) => ({ ...row, metadata: safeJsonParse(row.metadata) }));
  const statusChanges = parsedRows.filter((row: any) => row.oldStatus != null && row.newStatus != null && row.oldStatus !== row.newStatus).length;
  const purchasePriceChanges = parsedRows.filter((row: any) => normalizeMoney(row.oldPurchasePrice) !== normalizeMoney(row.newPurchasePrice) && (row.oldPurchasePrice != null || row.newPurchasePrice != null)).length;
  const salePriceChanges = parsedRows.filter((row: any) => normalizeMoney(row.oldSalePrice) !== normalizeMoney(row.newSalePrice) && (row.oldSalePrice != null || row.newSalePrice != null)).length;
  const priceChanges = parsedRows.filter((row: any) => (normalizeMoney(row.oldPurchasePrice) !== normalizeMoney(row.newPurchasePrice) || normalizeMoney(row.oldSalePrice) !== normalizeMoney(row.newSalePrice)) && (row.oldPurchasePrice != null || row.newPurchasePrice != null || row.oldSalePrice != null || row.newSalePrice != null)).length;
  const criticalEvents = parsedRows.filter((row: any) => ['deleted','returned','sale_returned'].includes(String(row.eventType || '')) || ['rose','amber'].includes(String(row.tone || ''))).length;
  return {
    windowDays: safeDays,
    hasCustomRange,
    startDate: sinceIso,
    endDate: untilIso,
    totalEvents: parsedRows.length,
    statusChanges,
    priceChanges,
    purchasePriceChanges,
    salePriceChanges,
    criticalEvents,
    recentEvents: parsedRows.slice(0, 12),
  };
};

const getPhoneHistoryEventClass = (row: any): 'price' | 'status' | 'critical' | 'audit' => {
  const hasStatusChange = row.oldStatus != null && row.newStatus != null && String(row.oldStatus) !== String(row.newStatus);
  const hasPriceChange = (normalizeMoney(row.oldPurchasePrice) !== normalizeMoney(row.newPurchasePrice) || normalizeMoney(row.oldSalePrice) !== normalizeMoney(row.newSalePrice))
    && (row.oldPurchasePrice != null || row.newPurchasePrice != null || row.oldSalePrice != null || row.newSalePrice != null);
  const isCritical = ['deleted', 'returned', 'sale_returned'].includes(String(row.eventType || '')) || ['rose', 'amber'].includes(String(row.tone || ''));
  if (isCritical) return 'critical';
  if (hasPriceChange) return 'price';
  if (hasStatusChange) return 'status';
  return 'audit';
};

export const searchPhoneInventoryEventsFromDb = async (filters?: {
  days?: number;
  startDate?: string;
  endDate?: string;
  q?: string;
  eventClass?: string;
  model?: string;
  limit?: number;
}): Promise<any[]> => {
  await getDbInstance();
  const { sinceIso, untilIso } = resolveHistoryWindow(filters);
  const safeLimit = Number.isFinite(Number(filters?.limit)) && Number(filters?.limit) > 0 ? Math.min(500, Number(filters?.limit)) : 120;
  const rows = (await allAsync(
    `SELECT e.*, p.model AS phoneModel, p.imei AS phoneImei, p.status AS currentStatus
       FROM phone_inventory_events e
       LEFT JOIN phones p ON p.id = e.phoneId
      WHERE datetime(COALESCE(e.eventDate, e.createdAt)) >= datetime(?)
        AND datetime(COALESCE(e.eventDate, e.createdAt)) <= datetime(?)
      ORDER BY datetime(COALESCE(e.eventDate, e.createdAt)) DESC, e.id DESC`,
    [sinceIso, untilIso]
  )) || [];

  const q = String(filters?.q || '').trim().toLowerCase();
  const wantedClass = String(filters?.eventClass || 'all');
  const wantedModel = String(filters?.model || 'all').trim();

  return rows
    .map((row: any) => {
      const parsed = { ...row, metadata: safeJsonParse(row.metadata) };
      return { ...parsed, eventClass: getPhoneHistoryEventClass(parsed) };
    })
    .filter((row: any) => {
      if (wantedClass !== 'all' && row.eventClass !== wantedClass) return false;
      if (wantedModel !== 'all' && String(row.phoneModel || '').trim() !== wantedModel) return false;
      if (!q) return true;
      const haystack = [
        row.title,
        row.description,
        row.actorDisplayName,
        row.actorUsername,
        row.phoneModel,
        row.phoneImei,
        row.currentStatus,
        Array.isArray(row.metadata?.changes) ? row.metadata.changes.join(' ') : '',
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, safeLimit);
};

export const getPhoneInventoryEnterpriseReportFromDb = async (filters?: { days?: number; startDate?: string; endDate?: string }): Promise<any> => {
  const rows = await searchPhoneInventoryEventsFromDb({ ...filters, limit: 500, eventClass: 'all' });
  const { safeDays, sinceIso, untilIso, hasCustomRange } = resolveHistoryWindow(filters);
  const priceChanges = rows.filter((row: any) => row.eventClass === 'price').length;
  const statusChanges = rows.filter((row: any) => row.eventClass === 'status').length;
  const criticalEvents = rows.filter((row: any) => row.eventClass === 'critical').length;

  const modelMap = new Map<string, { model: string; totalChanges: number; priceChanges: number; statusChanges: number; criticalEvents: number }>();
  const actorMap = new Map<string, { actor: string; totalChanges: number }>();

  for (const row of rows) {
    const model = String(row.phoneModel || 'نامشخص').trim() || 'نامشخص';
    const modelAgg = modelMap.get(model) || { model, totalChanges: 0, priceChanges: 0, statusChanges: 0, criticalEvents: 0 };
    modelAgg.totalChanges += 1;
    if (row.eventClass === 'price') modelAgg.priceChanges += 1;
    if (row.eventClass === 'status') modelAgg.statusChanges += 1;
    if (row.eventClass === 'critical') modelAgg.criticalEvents += 1;
    modelMap.set(model, modelAgg);

    const actor = String(row.actorDisplayName || row.actorUsername || 'نامشخص').trim() || 'نامشخص';
    const actorAgg = actorMap.get(actor) || { actor, totalChanges: 0 };
    actorAgg.totalChanges += 1;
    actorMap.set(actor, actorAgg);
  }

  return {
    windowDays: safeDays,
    hasCustomRange,
    startDate: sinceIso,
    endDate: untilIso,
    totalEvents: rows.length,
    filteredEvents: rows.length,
    priceChanges,
    statusChanges,
    criticalEvents,
    eventClassCounts: [
      { key: 'price', label: 'تغییر قیمت', count: priceChanges },
      { key: 'status', label: 'تغییر وضعیت', count: statusChanges },
      { key: 'critical', label: 'رویداد حساس', count: criticalEvents },
      { key: 'audit', label: 'ثبت/ویرایش عمومی', count: rows.filter((row: any) => row.eventClass === 'audit').length },
    ],
    topModels: Array.from(modelMap.values()).sort((a, b) => b.totalChanges - a.totalChanges).slice(0, 6),
    topActors: Array.from(actorMap.values()).sort((a, b) => b.totalChanges - a.totalChanges).slice(0, 6),
    recentCriticalEvents: rows.filter((row: any) => row.eventClass === 'critical').slice(0, 8),
  };
};

export const addPhoneEntryToDb = async (phoneData: PhoneEntryPayload, actor?: PhoneHistoryActor | null): Promise<any> => {
  await getDbInstance();
  const {
    model, color, storage, ram, imei, batteryHealth, condition,
    purchasePrice, currentPurchasePrice, salePrice, sellerName, purchaseDate,
    supplierId // saleDate will be null/undefined on initial registration
  } = phoneData;

  const registerDate = phoneData.registerDate || new Date().toISOString();
  const status = phoneData.status || "موجود در انبار";

  try {
    const existingPhone = await getAsync("SELECT id FROM phones WHERE imei = ?", [imei]);
    if (existingPhone) {
      throw new Error('شماره IMEI تکراری است.');
    }
    await execAsync("BEGIN TRANSACTION;");
    const result = await runAsync(
      `INSERT INTO phones (model, color, storage, ram, imei, batteryHealth, condition, purchasePrice, currentPurchasePrice, currentPurchasePriceUpdatedAt, salePrice, sellerName, purchaseDate, saleDate, registerDate, status, notes, supplierId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        model, color, storage, ram, imei, batteryHealth, condition,
        purchasePrice,
        currentPurchasePrice != null && Number(currentPurchasePrice) > 0 ? Number(currentPurchasePrice) : purchasePrice,
        new Date().toISOString(),
        salePrice, sellerName, purchaseDate,
        null, // Explicitly set saleDate to null on initial registration
        registerDate, status, phoneData.notes, supplierId
      ]
    );
    const newPhoneId = result.lastID;

    if (supplierId && purchasePrice > 0) {
      const description = buildPhonePurchaseDescription({ model, imei, id: newPhoneId, purchasePrice });
      const historyJson = JSON.stringify([
        {
          changedAt: registerDate,
          reason: 'initial_phone_purchase',
          after: {
            partnerId: supplierId,
            debit: 0,
            credit: purchasePrice,
            transactionDate: purchaseDate || registerDate,
            description,
            phoneId: newPhoneId,
            model,
            imei,
            purchasePrice,
          },
        },
      ]);
      await addPartnerLedgerEntryInternal(supplierId, description, 0, purchasePrice, purchaseDate || registerDate, 'phone_purchase', newPhoneId, undefined, historyJson);
    }

    await addPhoneInventoryEventToDb(newPhoneId, {
      eventType: 'created',
      title: 'ثبت اولیه دستگاه',
      description: `دستگاه ${model} با وضعیت «${status}» وارد انبار شد.`,
      eventDate: registerDate,
      tone: 'slate',
      icon: 'fa-box-archive',
      newStatus: status,
      newPurchasePrice: purchasePrice,
      newSalePrice: salePrice ?? null,
      metadata: { model, imei, condition, batteryHealth: batteryHealth ?? null },
      actor,
    });

    if (purchaseDate || supplierId) {
      await addPhoneInventoryEventToDb(newPhoneId, {
        eventType: 'acquisition_snapshot',
        title: 'ثبت خرید و تامین',
        description: supplierId
          ? `ورود از تامین‌کننده${phoneData.sellerName ? ` / ثبت‌کننده: ${phoneData.sellerName}` : ''}`
          : `خرید بدون تامین‌کننده مشخص${phoneData.sellerName ? ` / ثبت‌کننده: ${phoneData.sellerName}` : ''}`,
        eventDate: purchaseDate || registerDate,
        tone: 'sky',
        icon: 'fa-truck-ramp-box',
        newPurchasePrice: purchasePrice,
        metadata: { supplierId: supplierId ?? null, sellerName: sellerName ?? null },
        actor,
      });
    }

    if (salePrice != null && Number(salePrice) > 0) {
      await addPhoneInventoryEventToDb(newPhoneId, {
        eventType: 'pricing_initialized',
        title: 'ثبت قیمت فروش اولیه',
        description: `برای دستگاه یک قیمت فروش اولیه تعریف شد.`,
        eventDate: purchaseDate || registerDate,
        tone: 'emerald',
        icon: 'fa-tags',
        newPurchasePrice: purchasePrice,
        newSalePrice: salePrice,
        actor,
      });
    }

    if (batteryHealth != null && batteryHealth !== '') {
      await addPhoneInventoryEventToDb(newPhoneId, {
        eventType: 'battery_snapshot',
        title: 'ثبت سلامت باتری',
        description: `سلامت باتری در زمان ورود ثبت شد.`,
        eventDate: registerDate,
        tone: Number(batteryHealth) >= 85 ? 'emerald' : Number(batteryHealth) >= 75 ? 'amber' : 'rose',
        icon: 'fa-battery-three-quarters',
        metadata: { batteryHealth: Number(batteryHealth) },
        actor,
      });
    }

    await execAsync("COMMIT;");
    return await getAsync(
      `SELECT ph.*, pa.partnerName as supplierName
       FROM phones ph
       LEFT JOIN partners pa ON ph.supplierId = pa.id
       WHERE ph.id = ?`, [newPhoneId]);
  } catch (err: any) {
    await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in addPhoneEntryToDb:", rbErr));
    console.error('DB Error (addPhoneEntryToDb):', err);
    if (err.message.includes('UNIQUE constraint failed: phones.imei') || err.message.includes('شماره IMEI تکراری است')) {
      throw new Error('شماره IMEI تکراری است.');
    }
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const updatePhoneEntryInDb = async (phoneId: number, phoneData: PhoneEntryUpdatePayload, actor?: PhoneHistoryActor | null): Promise<any> => {
  await getDbInstance();
  const {
    model, color, storage, ram, imei, batteryHealth, condition,
    purchasePrice, currentPurchasePrice, salePrice, sellerName, purchaseDate, // purchaseDate can be Shamsi from DatePicker
    status, notes, supplierId
  } = phoneData;

  const existingPhone = await getAsync("SELECT * FROM phones WHERE id = ?", [phoneId]);
  if (!existingPhone) {
    throw new Error("گوشی برای بروزرسانی یافت نشد.");
  }

  if (imei && imei !== existingPhone.imei) {
    const imeiExists = await getAsync("SELECT id FROM phones WHERE imei = ? AND id != ?", [imei, phoneId]);
    if (imeiExists) {
      throw new Error('شماره IMEI جدید تکراری است.');
    }
  }
  
  await execAsync("BEGIN TRANSACTION;");
  const affectedPartners = new Set<number>();
  try {
    // Handle ledger adjustments if purchasePrice or supplierId changes
    const newPurchasePrice = purchasePrice !== undefined && purchasePrice !== null && String(purchasePrice).trim() !== '' ? Number(purchasePrice) : Number(existingPhone.purchasePrice || 0);
    const newSupplierId = supplierId !== undefined && supplierId !== null && String(supplierId).trim() !== '' ? Number(supplierId) : existingPhone.supplierId;
    const effectivePurchaseDate = purchaseDate ? fromShamsiStringToISO(purchaseDate) || new Date().toISOString() : (existingPhone.purchaseDate || new Date().toISOString());
    const nowIso = new Date().toISOString();
    const shouldSyncPurchaseLedger = (
      newPurchasePrice !== Number(existingPhone.purchasePrice || 0)
      || newSupplierId !== existingPhone.supplierId
      || String(model || existingPhone.model || '') !== String(existingPhone.model || '')
      || String(imei || existingPhone.imei || '') !== String(existingPhone.imei || '')
    );
    if (shouldSyncPurchaseLedger) {
      const previousLedgerRow = await fetchLatestPurchaseLedgerRowForReference(phoneId, PHONE_PURCHASE_LEDGER_REFERENCE_TYPES);
      const syncPartnerId = Number(newSupplierId || previousLedgerRow?.partnerId || existingPhone.supplierId || 0);
      if (!syncPartnerId) {
        throw new Error('همکار تأمین‌کننده برای همگام‌سازی دفتر خرید مشخص نیست.');
      }
      const phoneLabel = [model || existingPhone.model, imei || existingPhone.imei ? `IMEI: ${imei || existingPhone.imei}` : '', `شناسه: ${phoneId}`].filter(Boolean).join(' • ');
      const nextDescription = buildPhonePurchaseDescription({ model: model || existingPhone.model, imei: imei || existingPhone.imei, id: phoneId, purchasePrice: newPurchasePrice });
      const beforeSnapshot = previousLedgerRow ? {
        partnerId: Number(previousLedgerRow.partnerId || existingPhone.supplierId || 0) || null,
        debit: Number(previousLedgerRow.debit || 0),
        credit: Number(previousLedgerRow.credit || 0),
        transactionDate: String(previousLedgerRow.transactionDate || ''),
        description: String(previousLedgerRow.description || ''),
        referenceType: String(previousLedgerRow.referenceType || ''),
        referenceId: Number(previousLedgerRow.referenceId || phoneId) || phoneId,
        supplierId: existingPhone.supplierId ?? null,
        purchasePrice: Number(existingPhone.purchasePrice || 0),
      } : {
        partnerId: existingPhone.supplierId ?? null,
        debit: 0,
        credit: Number(existingPhone.purchasePrice || 0),
        transactionDate: String(existingPhone.purchaseDate || ''),
        description: buildPhonePurchaseDescription({ model: existingPhone.model, imei: existingPhone.imei, id: phoneId, purchasePrice: Number(existingPhone.purchasePrice || 0) }),
        referenceType: 'phone_purchase',
        referenceId: phoneId,
        supplierId: existingPhone.supplierId ?? null,
        purchasePrice: Number(existingPhone.purchasePrice || 0),
      };
      const historyJson = stringifyLedgerChangeHistory((previousLedgerRow as any)?.changeHistoryJson, {
        changedAt: nowIso,
        reason: 'phone_purchase_update',
        actor: actor ? { userId: actor.userId ?? null, username: actor.username ?? null, displayName: actor.displayName ?? null } : null,
        before: beforeSnapshot,
        after: {
          partnerId: syncPartnerId ?? null,
          debit: 0,
          credit: newPurchasePrice,
          transactionDate: nowIso,
          description: nextDescription,
          referenceType: 'phone_purchase',
          referenceId: phoneId,
          supplierId: syncPartnerId ?? null,
          purchasePrice: newPurchasePrice,
          phoneLabel,
        },
      });

      if (previousLedgerRow) {
        await runAsync(
          `UPDATE partner_ledger
              SET partnerId = ?, transactionDate = ?, updatedAt = ?, description = ?, debit = 0, credit = ?, referenceType = 'phone_purchase', referenceId = ?, changeHistoryJson = ?
            WHERE id = ?`,
          [syncPartnerId, nowIso, nowIso, nextDescription, newPurchasePrice, phoneId, historyJson, Number(previousLedgerRow.id)]
        );
      } else {
        await addPartnerLedgerEntryInternal(syncPartnerId, nextDescription, 0, newPurchasePrice, nowIso, 'phone_purchase', phoneId, undefined, historyJson);
      }

      affectedPartners.add(Number(existingPhone.supplierId || 0));
      affectedPartners.add(Number(syncPartnerId || 0));
      affectedPartners.add(Number((previousLedgerRow as any)?.partnerId || 0));
    }


    const fieldsToUpdate: string[] = [];
    const params: any[] = [];

    /**
     * Pushes an update for a specific column if the new value differs from the existing one. It
     * handles numeric strings, Jalali/Gregorian dates and empty/null values gracefully. In particular:
     *   - numeric strings are converted to numbers unless blank (then become null)
     *   - date strings containing a '/' are treated as Jalali and converted to ISO using fromShamsiStringToISO()
     *   - date strings without '/' are assumed to already be ISO and are left unchanged
     *   - undefined values do not trigger an update
     *   - explicit null values will set the column to null
     */
    const updateIfChanged = (
      field: string,
      newValue: any,
      existingValue: any,
      isNumericString = false,
      isDate = false
    ) => {
      let finalValue = newValue;
      if (isNumericString && typeof newValue === 'string') {
        finalValue = newValue.trim() === '' ? null : Number(newValue);
      } else if (isDate && typeof newValue === 'string') {
        // Only convert when the incoming value looks like a Jalali date (contains '/').
        // Otherwise, treat the string as an ISO date and leave it untouched. This prevents
        // ISO dates from being misinterpreted as Jalali and converted to far‑future years.
        finalValue = newValue.includes('/')
          ? fromShamsiStringToISO(newValue) || null
          : newValue;
      }
      // Only push update if value is defined and different from existing
      if (finalValue !== undefined && finalValue !== existingValue) {
        fieldsToUpdate.push(`${field} = ?`);
        // If not numeric/date and empty string, treat as null
        params.push(finalValue === '' && !isNumericString && !isDate ? null : finalValue);
      } else if (newValue === null && existingValue !== null) {
        // Explicit null request
        fieldsToUpdate.push(`${field} = ?`);
        params.push(null);
      }
    };
    
    updateIfChanged('model', model, existingPhone.model);
    updateIfChanged('color', color, existingPhone.color);
    updateIfChanged('storage', storage, existingPhone.storage);
    updateIfChanged('ram', ram, existingPhone.ram);
    updateIfChanged('imei', imei, existingPhone.imei);
    updateIfChanged('batteryHealth', batteryHealth, existingPhone.batteryHealth, true);
    updateIfChanged('condition', condition, existingPhone.condition);
    updateIfChanged('purchasePrice', purchasePrice, existingPhone.purchasePrice, true);
    updateIfChanged('currentPurchasePrice', currentPurchasePrice, existingPhone.currentPurchasePrice, true);
    if (currentPurchasePrice !== undefined && normalizeMoney(currentPurchasePrice) !== normalizeMoney(existingPhone.currentPurchasePrice)) {
      fieldsToUpdate.push('currentPurchasePriceUpdatedAt = ?');
      params.push(new Date().toISOString());
    }
    updateIfChanged('salePrice', salePrice, existingPhone.salePrice, true);
    updateIfChanged('sellerName', sellerName, existingPhone.sellerName);
    updateIfChanged('purchaseDate', purchaseDate, existingPhone.purchaseDate, false, true);
    updateIfChanged('status', status, existingPhone.status);
    updateIfChanged('notes', notes, existingPhone.notes);
    updateIfChanged('supplierId', supplierId, existingPhone.supplierId, true);

    // Determine if the phone was previously sold and whether the new status transitions it into or out of a sold state.
    const wasSoldBefore = existingPhone.status === 'فروخته شده' || existingPhone.status === 'فروخته شده (قسطی)';
    // transitioningToSold: true => becoming sold, false => becoming non‑sold, null => no change or status not provided
    let transitioningToSold: boolean | null = null;
    if (status !== undefined && status !== null) {
      const newStatus = String(status);
      const isNowSold = newStatus === 'فروخته شده' || newStatus === 'فروخته شده (قسطی)';
      transitioningToSold = isNowSold;
      // If the new status is not a sold state, clear saleDate to avoid stale sale dates when a phone is returned
      if (!isNowSold) {
        fieldsToUpdate.push('saleDate = ?');
        params.push(null);
      }
    }

    // If the phone transitions from sold → non‑sold, record the return date in Shamsi. Conversely,
    // if it transitions back into a sold state, clear the return date. This avoids overwriting
    // purchaseDate when a phone is returned and ensures returnDate reflects the date of return.
    if (transitioningToSold !== null) {
      if (!transitioningToSold && wasSoldBefore) {
        fieldsToUpdate.push('returnDate = ?');
        params.push(moment().locale('fa').format('jYYYY/jMM/jDD'));
      } else if (transitioningToSold && existingPhone.returnDate) {
        fieldsToUpdate.push('returnDate = ?');
        params.push(null);
      }
    }

    if (fieldsToUpdate.length > 0) {
      params.push(phoneId);
      const sql = `UPDATE phones SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
      await runAsync(sql, params);
    }

    const updatedPhone = await getAsync("SELECT ph.*, pa.partnerName as supplierName FROM phones ph LEFT JOIN partners pa ON ph.supplierId = pa.id WHERE ph.id = ?", [phoneId]);
    const updatedCostBasis = resolvePhoneCostBasisAmount(updatedPhone);
    if (updatedCostBasis > 0) {
      await syncPhoneCostBasisSnapshots(Number(phoneId), updatedCostBasis);
    }
    const changeItems: string[] = [];
    if (updatedPhone) {
      if (existingPhone.status !== updatedPhone.status) changeItems.push(`وضعیت از «${existingPhone.status || '-'}» به «${updatedPhone.status || '-'}»`);
      if (normalizeMoney(existingPhone.purchasePrice) !== normalizeMoney(updatedPhone.purchasePrice)) changeItems.push(`بهای خرید از ${Number(existingPhone.purchasePrice || 0).toLocaleString('fa-IR')} به ${Number(updatedPhone.purchasePrice || 0).toLocaleString('fa-IR')}`);
      if (normalizeMoney(existingPhone.currentPurchasePrice) !== normalizeMoney(updatedPhone.currentPurchasePrice)) changeItems.push(`قیمت خرید روز از ${Number(existingPhone.currentPurchasePrice || existingPhone.purchasePrice || 0).toLocaleString('fa-IR')} به ${Number(updatedPhone.currentPurchasePrice || updatedPhone.purchasePrice || 0).toLocaleString('fa-IR')}`);
      if (normalizeMoney(existingPhone.salePrice) !== normalizeMoney(updatedPhone.salePrice)) changeItems.push(`قیمت فروش از ${Number(existingPhone.salePrice || 0).toLocaleString('fa-IR')} به ${Number(updatedPhone.salePrice || 0).toLocaleString('fa-IR')}`);
      if ((existingPhone.supplierId || null) !== (updatedPhone.supplierId || null)) changeItems.push(`تامین‌کننده ${existingPhone.supplierId ? 'تغییر کرد' : 'ثبت شد'}`);
      if ((existingPhone.batteryHealth || null) !== (updatedPhone.batteryHealth || null) && updatedPhone.batteryHealth != null) changeItems.push(`سلامت باتری به ${Number(updatedPhone.batteryHealth).toLocaleString('fa-IR')}٪ رسید`);
      if ((existingPhone.imei || '') !== (updatedPhone.imei || '')) changeItems.push('IMEI بروزرسانی شد');
      if ((existingPhone.model || '') !== (updatedPhone.model || '')) changeItems.push('مدل یا شناسنامه دستگاه بروزرسانی شد');
      if ((existingPhone.notes || '') !== (updatedPhone.notes || '')) changeItems.push('یادداشت مدیریتی بروزرسانی شد');

      if (changeItems.length > 0) {
        const fieldDiffs = [
          existingPhone.status !== updatedPhone.status ? { key: 'status', label: 'وضعیت', from: existingPhone.status || null, to: updatedPhone.status || null, kind: 'status' } : null,
          normalizeMoney(existingPhone.purchasePrice) !== normalizeMoney(updatedPhone.purchasePrice) ? { key: 'purchasePrice', label: 'بهای خرید', from: normalizeMoney(existingPhone.purchasePrice), to: normalizeMoney(updatedPhone.purchasePrice), kind: 'money' } : null,
          normalizeMoney(existingPhone.currentPurchasePrice) !== normalizeMoney(updatedPhone.currentPurchasePrice) ? { key: 'currentPurchasePrice', label: 'قیمت خرید روز', from: normalizeMoney(existingPhone.currentPurchasePrice), to: normalizeMoney(updatedPhone.currentPurchasePrice), kind: 'money' } : null,
          normalizeMoney(existingPhone.salePrice) !== normalizeMoney(updatedPhone.salePrice) ? { key: 'salePrice', label: 'قیمت فروش', from: normalizeMoney(existingPhone.salePrice), to: normalizeMoney(updatedPhone.salePrice), kind: 'money' } : null,
          (existingPhone.supplierId || null) !== (updatedPhone.supplierId || null) ? { key: 'supplier', label: 'تامین‌کننده', from: existingPhone.supplierName || null, to: updatedPhone.supplierName || null, kind: 'text' } : null,
          (existingPhone.batteryHealth || null) !== (updatedPhone.batteryHealth || null) ? { key: 'batteryHealth', label: 'سلامت باتری', from: existingPhone.batteryHealth ?? null, to: updatedPhone.batteryHealth ?? null, kind: 'percent' } : null,
          (existingPhone.notes || '') !== (updatedPhone.notes || '') ? { key: 'notes', label: 'یادداشت', from: existingPhone.notes || null, to: updatedPhone.notes || null, kind: 'text' } : null,
        ].filter(Boolean);
        await addPhoneInventoryEventToDb(phoneId, {
          eventType: 'updated',
          title: 'بروزرسانی اطلاعات دستگاه',
          description: changeItems.join(' • '),
          eventDate: new Date().toISOString(),
          tone: existingPhone.status !== updatedPhone.status ? 'violet' : (normalizeMoney(existingPhone.salePrice) !== normalizeMoney(updatedPhone.salePrice) || normalizeMoney(existingPhone.purchasePrice) !== normalizeMoney(updatedPhone.purchasePrice)) ? 'sky' : 'slate',
          icon: existingPhone.status !== updatedPhone.status ? 'fa-arrows-rotate' : (normalizeMoney(existingPhone.salePrice) !== normalizeMoney(updatedPhone.salePrice) || normalizeMoney(existingPhone.purchasePrice) !== normalizeMoney(updatedPhone.purchasePrice)) ? 'fa-badge-dollar' : 'fa-pen-ruler',
          oldStatus: existingPhone.status || null,
          newStatus: updatedPhone.status || null,
          oldPurchasePrice: existingPhone.purchasePrice ?? null,
          newPurchasePrice: updatedPhone.purchasePrice ?? null,
          oldSalePrice: existingPhone.salePrice ?? null,
          newSalePrice: updatedPhone.salePrice ?? null,
          metadata: {
            before: {
              model: existingPhone.model, imei: existingPhone.imei, supplierId: existingPhone.supplierId ?? null,
              purchaseDate: existingPhone.purchaseDate ?? null, batteryHealth: existingPhone.batteryHealth ?? null, notes: existingPhone.notes ?? null,
            },
            after: {
              model: updatedPhone.model, imei: updatedPhone.imei, supplierId: updatedPhone.supplierId ?? null,
              purchaseDate: updatedPhone.purchaseDate ?? null, batteryHealth: updatedPhone.batteryHealth ?? null, notes: updatedPhone.notes ?? null,
            },
            changes: changeItems,
            fieldDiffs,
          },
          actor,
        });
      }

      await execAsync("COMMIT;");
      for (const pid of [...affectedPartners].filter((value) => Number.isFinite(value) && value > 0)) {
        await recalcPartnerBalances(pid);
      }
      await normalizePhonePurchaseLedgers(true).catch((normalizeErr) => console.error('normalizePhonePurchaseLedgers failed after phone update:', normalizeErr));
      return updatedPhone;
    }

    await execAsync("COMMIT;");
    for (const pid of [...affectedPartners].filter((value) => Number.isFinite(value) && value > 0)) {
      await recalcPartnerBalances(pid);
    }
    await normalizePhonePurchaseLedgers(true).catch((normalizeErr) => console.error('normalizePhonePurchaseLedgers failed after phone update:', normalizeErr));
    return await getAsync(
      `SELECT ph.*, pa.partnerName as supplierName
       FROM phones ph
       LEFT JOIN partners pa ON ph.supplierId = pa.id
       WHERE ph.id = ?`, [phoneId]);

  } catch (err: any) {
    await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in updatePhoneEntryInDb:", rbErr));
    console.error('DB Error (updatePhoneEntryInDb):', err);
    if (err.message.includes('UNIQUE constraint failed: phones.imei') || err.message.includes('شماره IMEI جدید تکراری است')) {
      throw new Error('شماره IMEI جدید تکراری است.');
    }
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const deletePhoneEntryFromDb = async (phoneId: number, actor?: PhoneHistoryActor | null): Promise<boolean> => {
  await getDbInstance();
  const phone = await getAsync("SELECT * FROM phones WHERE id = ?", [phoneId]);
  if (!phone) {
    throw new Error("گوشی برای حذف یافت نشد.");
  }

  // Check if phone is part of an installment sale (legacy + new items table)
  const installmentSale = await getAsync("SELECT id FROM installment_sales WHERE phoneId = ?", [phoneId]);
  const installmentSaleItem = await getAsync(
    "SELECT saleId as id FROM installment_sale_items WHERE itemType = 'phone' AND itemId = ? LIMIT 1",
    [phoneId]
  ).catch(() => null);
  const found = installmentSale || installmentSaleItem;
  if (found) {
    throw new Error(`امکان حذف گوشی وجود ندارد. این گوشی در فروش اقساطی شماره ${found.id} ثبت شده است.`);
  }
  
  // Check if phone is part of a regular sale
  const regularSale = await getAsync("SELECT id FROM sales_transactions WHERE itemType = 'phone' AND itemId = ?", [phoneId]);
  if (regularSale) {
    throw new Error(`امکان حذف گوشی وجود ندارد. این گوشی در فروش نقدی/اعتباری شماره ${regularSale.id} ثبت شده است.`);
  }


  await execAsync("BEGIN TRANSACTION;");
  try {
    // If phone was purchased from a supplier, reverse the ledger entry
    if (phone.supplierId && phone.purchasePrice > 0) {
      const description = `حذف گوشی: ${phone.model} (IMEI: ${phone.imei}, شناسه: ${phoneId}) - بازگشت مبلغ خرید اولیه`;
      await addPartnerLedgerEntryInternal(phone.supplierId, description, phone.purchasePrice, 0, new Date().toISOString(), 'phone_delete', phoneId);
    }

    await addPhoneInventoryEventToDb(phoneId, {
      eventType: 'deleted',
      title: 'حذف دستگاه از انبار',
      description: `رکورد دستگاه از ماژول انبار حذف شد.`,
      eventDate: new Date().toISOString(),
      tone: 'rose',
      icon: 'fa-trash',
      oldStatus: phone.status || null,
      oldPurchasePrice: phone.purchasePrice ?? null,
      oldSalePrice: phone.salePrice ?? null,
      metadata: { model: phone.model, imei: phone.imei, supplierId: phone.supplierId ?? null },
      actor,
    });

    const result = await runAsync(`DELETE FROM phones WHERE id = ?`, [phoneId]);
    await execAsync("COMMIT;");
    return result.changes > 0;
  } catch (err: any) {
    await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in deletePhoneEntryFromDb:", rbErr));
    console.error('DB Error (deletePhoneEntryFromDb):', err);
    throw err; 
  }
};

// --- Phone Models / Colors (API برای اتوکامپلیت) ---
export const getAllPhoneModelsFromDb = async (): Promise<string[]> => {
  await getDbInstance();
  const rows = await allAsync(`SELECT name FROM phone_models ORDER BY name COLLATE NOCASE ASC`);
  return (rows || []).map((r: any) => String(r.name));
};

export const addPhoneModelToDb = async (name: string): Promise<string[]> => {
  await getDbInstance();
  const n = String(name || '').trim();
  if (!n) throw new Error('نام مدل نامعتبر است.');
  await runAsync('INSERT OR IGNORE INTO phone_models (name) VALUES (?)', [n]);
  return getAllPhoneModelsFromDb();
};

export const getAllPhoneColorsFromDb = async (): Promise<string[]> => {
  await getDbInstance();
  const rows = await allAsync(`SELECT name FROM phone_colors ORDER BY name COLLATE NOCASE ASC`);
  return (rows || []).map((r: any) => String(r.name));
};

export const addPhoneColorToDb = async (name: string): Promise<string[]> => {
  await getDbInstance();
  const n = String(name || '').trim();
  if (!n) throw new Error('نام رنگ نامعتبر است.');
  await runAsync('INSERT OR IGNORE INTO phone_colors (name) VALUES (?)', [n]);
  return getAllPhoneColorsFromDb();
};


export const getAllPhoneEntriesFromDb = async (supplierIdFilter: number | null = null, statusFilter?: string, phoneId?: number): Promise<any[]> => {
  await getDbInstance();
  let sql = `
    SELECT ph.*, pa.partnerName as supplierName, cu.fullName as buyerName
    FROM phones ph
    LEFT JOIN partners pa ON ph.supplierId = pa.id
    -- شناسایی خریدار آخر (در صورت وجود) از فروش اقساطی، تراکنش‌های قدیمی و فروش‌های جدید
    LEFT JOIN (
      SELECT phoneId, MAX(customerId) AS customerId
      FROM (
        SELECT phoneId, customerId FROM installment_sales
        UNION ALL
        SELECT itemId AS phoneId, customerId FROM sales_transactions WHERE itemType = 'phone'
        UNION ALL
        SELECT soi.itemId AS phoneId, so.customerId
          FROM sales_order_items soi
          JOIN sales_orders so ON so.id = soi.orderId
        WHERE soi.itemType = 'phone'
      )
      GROUP BY phoneId
    ) sale ON sale.phoneId = ph.id
    LEFT JOIN customers cu ON cu.id = sale.customerId
  `;
  const params: any[] = [];
  const conditions: string[] = [];

  if (phoneId) { // If specific phoneId is requested
    conditions.push("ph.id = ?");
    params.push(phoneId);
  } else { // Apply filters if not fetching a specific phone
    if (supplierIdFilter) {
      conditions.push("ph.supplierId = ?");
      params.push(supplierIdFilter);
    }
    if (statusFilter) {
      // Allow multiple statuses separated by comma
      const statuses = String(statusFilter).split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        conditions.push("ph.status = ?");
        params.push(statuses[0]);
      } else if (statuses.length > 1) {
        conditions.push(`ph.status IN (${statuses.map(_=>'?').join(',')})`);
        params.push(...statuses);
      }
    }
  }


  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  
  sql += " ORDER BY ph.registerDate DESC";
  try {
    return await allAsync(sql, params);
  } catch (err: any) {
    console.error('DB Error (getAllPhoneEntriesFromDb):', err);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};


// --- Sales ---
export const getSellableItemsFromDb = async (): Promise<{ phones: any[], inventory: any[], services: any[] }> => {
  await getDbInstance();
  try {
    const getColumnNames = async (tableName: string): Promise<Set<string>> => {
      try {
        const rows: any[] = await allAsync(`PRAGMA table_info(${tableName})`);
        return new Set((rows || []).map((c: any) => String(c.name)));
      } catch {
        return new Set<string>();
      }
    };

    const [phoneColNames, productColNames, ownershipProfileCols, profitShareCols] = await Promise.all([
      getColumnNames('phones'),
      getColumnNames('products'),
      getColumnNames('ownership_profiles'),
      getColumnNames('profit_share_profiles'),
    ]);

    const hasPhoneOwnership = phoneColNames.has('ownershipProfileId');
    const hasProductOwnership = productColNames.has('ownershipProfileId');
    const hasOwnershipProfilesTable = ownershipProfileCols.size > 0;
    const hasProfitShareProfilesTable = profitShareCols.size > 0;

    const hasOwnershipTitle = ownershipProfileCols.has('title');
    const hasOwnershipType = ownershipProfileCols.has('ownershipType');
    const hasOwnershipProfitShareProfileId = ownershipProfileCols.has('profitShareProfileId');
    const hasProfitShareTitle = profitShareCols.has('title');

    const phoneOwnershipSelect = hasPhoneOwnership ? 'ph.ownershipProfileId' : 'NULL as ownershipProfileId';
    const productOwnershipSelect = hasProductOwnership ? 'pr.ownershipProfileId' : 'NULL as ownershipProfileId';

    const phoneOwnershipJoin = hasPhoneOwnership && hasOwnershipProfilesTable
      ? 'LEFT JOIN ownership_profiles op ON op.id = ph.ownershipProfileId'
      : '';
    const productOwnershipJoin = hasProductOwnership && hasOwnershipProfilesTable
      ? 'LEFT JOIN ownership_profiles op ON op.id = pr.ownershipProfileId'
      : '';
    const profitShareJoin = hasOwnershipProfilesTable && hasProfitShareProfilesTable && hasOwnershipProfitShareProfileId
      ? 'LEFT JOIN profit_share_profiles psp ON psp.id = op.profitShareProfileId'
      : '';

    const ownershipMetaSelect = [
      hasOwnershipProfilesTable && hasOwnershipTitle ? 'op.title as ownershipTitle' : 'NULL as ownershipTitle',
      hasOwnershipProfilesTable && hasOwnershipType ? 'op.ownershipType as ownershipType' : 'NULL as ownershipType',
      hasOwnershipProfilesTable && hasOwnershipProfitShareProfileId ? 'op.profitShareProfileId as profitShareProfileId' : 'NULL as profitShareProfileId',
      hasProfitShareProfilesTable && hasProfitShareTitle && hasOwnershipProfilesTable && hasOwnershipProfitShareProfileId
        ? 'psp.title as profitShareProfileTitle'
        : 'NULL as profitShareProfileTitle',
    ].join(', ');

    const loadPhones = async () => {
      try {
        return await allAsync(`
          SELECT ph.id, ph.model, ph.imei, ph.salePrice as price, ph.purchasePrice, ph.purchasePrice as initialPurchasePrice, ph.currentPurchasePrice, COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) as buyPrice, 1 as stock,
                 ${phoneOwnershipSelect},
                 ${ownershipMetaSelect}
          FROM phones ph
          ${phoneOwnershipJoin}
          ${profitShareJoin}
          WHERE ph.status = 'موجود در انبار' AND ph.salePrice IS NOT NULL AND ph.salePrice > 0
        `);
      } catch (err) {
        console.warn('Sellable phones query fallback activated:', err);
        return await allAsync(`
          SELECT ph.id, ph.model, ph.imei, ph.salePrice as price, ph.purchasePrice, ph.purchasePrice as initialPurchasePrice, ph.currentPurchasePrice, COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) as buyPrice, 1 as stock,
                 NULL as ownershipProfileId,
                 NULL as ownershipTitle,
                 NULL as ownershipType,
                 NULL as profitShareProfileId,
                 NULL as profitShareProfileTitle
          FROM phones ph
          WHERE ph.status = 'موجود در انبار' AND ph.salePrice IS NOT NULL AND ph.salePrice > 0
        `);
      }
    };

    const loadInventory = async () => {
      try {
        return await allAsync(`
          SELECT pr.id, pr.name, pr.sellingPrice as price, pr.purchasePrice, pr.stock_quantity as stock,
                 ${productOwnershipSelect},
                 ${ownershipMetaSelect}
          FROM products pr
          ${productOwnershipJoin}
          ${profitShareJoin}
          WHERE pr.stock_quantity > 0 AND pr.sellingPrice IS NOT NULL AND pr.sellingPrice > 0
        `);
      } catch (err) {
        console.warn('Sellable inventory query fallback activated:', err);
        return await allAsync(`
          SELECT pr.id, pr.name, pr.sellingPrice as price, pr.purchasePrice, pr.stock_quantity as stock,
                 NULL as ownershipProfileId,
                 NULL as ownershipTitle,
                 NULL as ownershipType,
                 NULL as profitShareProfileId,
                 NULL as profitShareProfileTitle
          FROM products pr
          WHERE pr.stock_quantity > 0 AND pr.sellingPrice IS NOT NULL AND pr.sellingPrice > 0
        `);
      }
    };

    const [phones, inventory, services] = await Promise.all([
      loadPhones(),
      loadInventory(),
      allAsync(`
        SELECT id, name, price
        FROM services
        WHERE price IS NOT NULL
      `),
    ]);

    return {
      phones: phones.map(p => ({
        ...p,
        type: 'phone',
        name: `${p.model} (IMEI: ${p.imei})`
      })),
      inventory: inventory.map(i => ({
        ...i,
        type: 'inventory'
      })),
      services: services.map(s => ({
        ...s,
        type: 'service'
      }))
    };
  } catch (err: any) {
    console.error('DB Error (getSellableItemsFromDb):', err);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const getAllSalesTransactionsFromDb = async (customerIdFilter: number | null = null): Promise<any[]> => {
  await getDbInstance();
  let sql = `
    SELECT st.*, c.fullName as customerFullName,
           CASE WHEN st.itemType = 'phone' THEN ph.imei ELSE NULL END as imei,
           CASE WHEN st.itemType = 'phone' THEN ph.model ELSE NULL END as phoneModel
    FROM sales_transactions st
    LEFT JOIN customers c ON st.customerId = c.id
    LEFT JOIN phones ph ON st.itemType = 'phone' AND st.itemId = ph.id
  `;
  const params: any[] = [];
  if (customerIdFilter) {
    sql += " WHERE st.customerId = ?";
    params.push(customerIdFilter);
  }
  sql += " ORDER BY st.id DESC";

  try {
    return await allAsync(sql, params);
  } catch (err: any) {
    console.error('DB Error (getAllSalesTransactionsFromDb):', err);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};
/* فهرست خلاصهٔ همهٔ سفارش‌های فروش برای صفحهٔ «فاکتورها» */
export const getAllSalesOrdersFromDb = async (): Promise<any[]> => {
  await getDbInstance();
  return await allAsync(`
    SELECT
        so.id,
        so.transactionDate,
        so.grandTotal            AS totalPrice,
        c.fullName               AS customerFullName,
        COALESCE(
          (SELECT description
             FROM sales_order_items
            WHERE orderId = so.id
            LIMIT 1),
          '—'
        )                        AS itemName
    FROM   sales_orders  AS so
    LEFT  JOIN customers  AS c  ON c.id = so.customerId
    ORDER BY so.id DESC
  `);
};

export const addCustomerLedgerEntryToDb = async (customerId: number, entryData: LedgerEntryPayload): Promise<any> => {
  await getDbInstance();
  const { description, debit, credit, transactionDate, referenceType, referenceId } = entryData;
  return await addCustomerLedgerEntryInternal(customerId, description, debit, credit, transactionDate, { referenceType, referenceId });
};


export const addCustomerLedgerEntryInternal = async ( // Made exportable if needed
  customerId: number,
  description: string,
  debit: number | undefined,
  credit: number | undefined,
  transactionDateISO?: string,
  meta?: { referenceType?: string | null; referenceId?: number | null }
): Promise<any> => {
  const dateToStore = transactionDateISO || new Date().toISOString();
  const nowIso = new Date().toISOString();
  const prevBalanceRow = await getAsync(
    `SELECT balance FROM customer_ledger WHERE customerId = ? ORDER BY id DESC LIMIT 1`,
    [customerId]
  );
  const prevBalance = prevBalanceRow ? prevBalanceRow.balance : 0;
  const currentDebit = debit || 0;
  const currentCredit = credit || 0;
  const newBalance = prevBalance + currentDebit - currentCredit;

  const inferredRef = inferCustomerLedgerReference(description, currentDebit, currentCredit, meta);

  const result = await runAsync(
    `INSERT INTO customer_ledger (customerId, transactionDate, createdAt, updatedAt, description, debit, credit, balance, referenceType, referenceId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [customerId, dateToStore, nowIso, nowIso, description, currentDebit, currentCredit, newBalance, inferredRef.referenceType, inferredRef.referenceId]
  );
  return await getAsync("SELECT * FROM customer_ledger WHERE id = ?", [result.lastID]);
};

export const recordSaleTransactionInDb = async (saleData: SaleDataPayload): Promise<any> => {
  await getDbInstance();
  // transactionDate is expected as Shamsi 'YYYY/MM/DD' from frontend
  const { itemType, itemId, quantity, transactionDate: shamsiTransactionDate, customerId, notes, discount = 0, paymentMethod } = saleData; 
  const normalizedQuantity = Number(quantity);
  const normalizedDiscount = Number(discount || 0);
  if (!['phone', 'inventory', 'service'].includes(String(itemType))) throw new Error('نوع قلم فروش نامعتبر است.');
  if (!Number.isInteger(Number(itemId)) || Number(itemId) <= 0) throw new Error('شناسه قلم فروش نامعتبر است.');
  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) throw new Error('تعداد فروش نامعتبر است.');
  if (!Number.isFinite(normalizedDiscount) || normalizedDiscount < 0) throw new Error('مبلغ تخفیف نامعتبر است.');
  if (paymentMethod !== 'cash' && paymentMethod !== 'credit') throw new Error('روش پرداخت نامعتبر است.');
  
  // Convert Shamsi date to ISO YYYY-MM-DD for storage and for phone's saleDate
  const isoTransactionDate = moment(shamsiTransactionDate, 'jYYYY/jMM/jDD').format('YYYY-MM-DD');
  if (!moment(isoTransactionDate, 'YYYY-MM-DD', true).isValid()) {
    throw new Error('تاریخ تراکنش ارائه شده پس از تبدیل به میلادی، نامعتبر است.');
  }
  

  try {
    await execAsync("BEGIN TRANSACTION;");
    let itemName: string;
    let pricePerItem: number;
    let purchasePriceOfItem = 0; // For profit calculation

    if (itemType === 'phone') {
      if (normalizedQuantity !== 1) throw new Error('تعداد برای فروش گوشی باید ۱ باشد.');
      const phone = await getAsync("SELECT model, imei, salePrice, purchasePrice, currentPurchasePrice, status FROM phones WHERE id = ?", [itemId]);
      if (!phone) throw new Error('گوشی مورد نظر برای فروش یافت نشد.');
      // گوشی باید یا در انبار موجود باشد یا به عنوان مرجوعی برگشته باشد (از فروش نقدی یا اقساطی)
      if (phone.status !== 'موجود در انبار' && phone.status !== 'مرجوعی' && phone.status !== 'مرجوعی اقساطی') {
        throw new Error(`گوشی "${phone.model} (IMEI: ${phone.imei})" در وضعیت "${phone.status}" قرار دارد و قابل فروش نیست.`);
      }
      if (phone.salePrice === null || typeof phone.salePrice !== 'number' || phone.salePrice <= 0) throw new Error(`قیمت فروش برای گوشی "${phone.model} (IMEI: ${phone.imei})" مشخص نشده یا نامعتبر است.`);

      itemName = `${phone.model} (IMEI: ${phone.imei})`;
      pricePerItem = phone.salePrice;
      purchasePriceOfItem = resolvePhoneCostBasisAmount(phone);
      // هنگام فروش مجدد گوشی، وضعیت را به «فروخته شده» تغییر می‌دهیم و تاریخ فروش را ثبت می‌کنیم. همچنین اگر گوشی
      // قبلاً مرجوع شده باشد، تاریخ مرجوعی (returnDate) را پاک می‌کنیم تا در نمایش مجدد فروش، به اشتباه باقی نماند.
      await runAsync("UPDATE phones SET status = 'فروخته شده', saleDate = ?, currentPurchasePrice = ?, currentPurchasePriceUpdatedAt = (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')), returnDate = NULL WHERE id = ?", [isoTransactionDate, purchasePriceOfItem, itemId]);
      await syncPhoneCostBasisSnapshots(Number(itemId), purchasePriceOfItem);
    } else if (itemType === 'inventory') {
      const product = await getAsync("SELECT name, sellingPrice, purchasePrice, stock_quantity FROM products WHERE id = ?", [itemId]);
      if (!product) throw new Error('کالای مورد نظر در انبار یافت نشد.');
      if (Number(product.stock_quantity) < normalizedQuantity) throw new Error(`موجودی کالا (${product.name}: ${product.stock_quantity} عدد) برای فروش کافی نیست (درخواست: ${normalizedQuantity} عدد).`);
      if (product.sellingPrice === null || typeof product.sellingPrice !== 'number' || product.sellingPrice <= 0) throw new Error(`قیمت فروش برای کالا "${product.name}" مشخص نشده یا نامعتبر است.`);

      itemName = product.name;
      pricePerItem = product.sellingPrice;
      purchasePriceOfItem = product.purchasePrice;
      await runAsync("UPDATE products SET stock_quantity = stock_quantity - ?, saleCount = saleCount + ? WHERE id = ?", [normalizedQuantity, normalizedQuantity, itemId]);
    } else if (itemType === 'service') {
        const service = await getAsync("SELECT name, price FROM services WHERE id = ?", [itemId]);
        if (!service) throw new Error('خدمت مورد نظر یافت نشد.');
        if (normalizedQuantity !== 1) throw new Error('تعداد برای فروش خدمت باید ۱ باشد.');
        
        itemName = service.name;
        pricePerItem = service.price;
        // No stock update, no purchase price for services
    } else {
      throw new Error('نوع کالای نامعتبر برای فروش.');
    }

    const subTotal = normalizedQuantity * pricePerItem;
    if (normalizedDiscount > subTotal) throw new Error('مبلغ تخفیف نمی‌تواند بیشتر از قیمت کل کالا باشد.');
    const totalPrice = subTotal - normalizedDiscount;
    if (totalPrice < 0) throw new Error('قیمت نهایی پس از تخفیف نمی‌تواند منفی باشد.');

    const saleResult = await runAsync(
      `INSERT INTO sales_transactions (transactionDate, itemType, itemId, itemName, quantity, pricePerItem, totalPrice, notes, customerId, discount, paymentMethod, buyPrice)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [isoTransactionDate, itemType, itemId, itemName, normalizedQuantity, pricePerItem, totalPrice, notes, customerId, normalizedDiscount, paymentMethod, purchasePriceOfItem]
    );

    if (customerId && totalPrice > 0) {
      const ledgerDescription = paymentMethod === 'credit'
        ? `خرید اعتباری: ${itemName} (شناسه فروش: ${saleResult.lastID})`
        : `خرید نقدی: ${itemName} (شناسه فروش: ${saleResult.lastID})`;
      // برای خرید نقدی هم رکورد متوازن ثبت می‌کنیم تا در دفتر حساب و تاریخچه دیده شود ولی مانده تغییر نکند.
      await addCustomerLedgerEntryInternal(
        customerId,
        ledgerDescription,
        totalPrice,
        paymentMethod === 'credit' ? 0 : totalPrice,
        new Date().toISOString()
      );
    }

    await execAsync("COMMIT;");
    return await getAsync("SELECT * FROM sales_transactions WHERE id = ?", [saleResult.lastID]);
  } catch (err: any) {
    await execAsync("ROLLBACK;");
    console.error('DB Error (recordSaleTransactionInDb):', err);
    throw err;
  }
};

// --- Customers ---
export const addCustomerToDb = async (customerData: CustomerPayload): Promise<any> => {
  await getDbInstance();
  const { fullName, phoneNumber, address, notes, telegramChatId } = customerData;
  try {
    const result = await runAsync(
      `INSERT INTO customers (fullName, phoneNumber, address, notes, telegramChatId) VALUES (?, ?, ?, ?, ?)`,
      [fullName, phoneNumber || null, address || null, notes || null, telegramChatId || null]
    );
    return await getAsync("SELECT * FROM customers WHERE id = ?", [result.lastID]);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed: customers.phoneNumber')) {
      throw new Error('این شماره تماس قبلا برای مشتری دیگری ثبت شده است.');
    }
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const getAllCustomersWithBalanceFromDb = async (): Promise<any[]> => {
  await getDbInstance();
  return await allAsync(`
    SELECT
      c.*,
      COALESCE((
        SELECT SUM(COALESCE(l.debit, 0) - COALESCE(l.credit, 0))
        FROM customer_ledger l
        WHERE l.customerId = c.id
      ), 0) AS currentBalance
    FROM customers c
    ORDER BY c.fullName ASC
  `);
};

export const getCustomerByIdFromDb = async (customerId: number): Promise<any> => {
  await getDbInstance();
  const customer = await getAsync(`
    SELECT
      c.*,
      COALESCE((
        SELECT SUM(COALESCE(l.debit, 0) - COALESCE(l.credit, 0))
        FROM customer_ledger l
        WHERE l.customerId = c.id
      ), 0) AS currentBalance
    FROM customers c
    WHERE c.id = ?
  `, [customerId]);
  return customer;
};

export const updateCustomerInDb = async (customerId: number, customerData: CustomerPayload): Promise<any> => {
  await getDbInstance();
  const { fullName, phoneNumber, address, notes, telegramChatId } = customerData;
  try {
    await runAsync(
      `UPDATE customers SET fullName = ?, phoneNumber = ?, address = ?, notes = ?, telegramChatId = ? WHERE id = ?`,
      [fullName, phoneNumber || null, address || null, notes || null, telegramChatId || null, customerId]
    );
    return await getCustomerByIdFromDb(customerId);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed: customers.phoneNumber')) {
      throw new Error('این شماره تماس قبلا برای مشتری دیگری ثبت شده است.');
    }
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

// Update only CRM tags for a customer. Tags are stored as a JSON string.
export const updateCustomerTagsInDb = async (customerId: number, tags: string[]): Promise<any> => {
  await getDbInstance();
  const clean = (tags || [])
    .map(t => String(t || '').trim())
    .filter(Boolean)
    .slice(0, 50);
  await runAsync(`UPDATE customers SET tags = ? WHERE id = ?`, [JSON.stringify(clean), customerId]);
  return await getCustomerByIdFromDb(customerId);
};

export const deleteCustomerFromDb = async (customerId: number): Promise<boolean> => {
  await getDbInstance();
  const result = await runAsync(`DELETE FROM customers WHERE id = ?`, [customerId]);
  return result.changes > 0;
};


type CustomerLedgerSourceInfo = {
  sourceKind: 'installment_sale' | 'sales_order' | 'repair' | 'manual' | null;
  sourceId: number | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
  sourceIcon: string | null;
  sourceResolved: boolean;
};

const formatFaSourceNumber = (value: number) => Number(value || 0).toLocaleString('fa-IR');

const parseCustomerLedgerSourceFromDescription = (description?: string | null) => {
  const raw = String(description || '').trim();
  const installmentId = Number(
    raw.match(/شناسه\s*فروش(?:\s*اقساطی)?[:：]?\s*(\d+)/i)?.[1] ||
    raw.match(/معامله\s*شماره\s*(\d+)/i)?.[1] ||
    0
  );
  const invoiceId = Number(
    raw.match(/(?:فاکتور|invoice).*?(?:شماره|#)\s*(\d+)/i)?.[1] ||
    raw.match(/(?:فاکتور|invoice)\s*#?\s*(\d+)/i)?.[1] ||
    0
  );
  return { raw, installmentId, invoiceId };
};

const inferCustomerLedgerSourceCandidate = (row: any): { kind: CustomerLedgerSourceInfo['sourceKind']; id: number | null } => {
  const referenceType = String(row?.referenceType || '').trim().toLowerCase();
  const referenceId = Number(row?.referenceId || 0);
  const parsed = parseCustomerLedgerSourceFromDescription(row?.description);
  const raw = parsed.raw;

  if (referenceType === 'installment_payment_tx' && referenceId > 0) {
    return { kind: 'installment_sale', id: referenceId };
  }

  if (referenceType.includes('installment') && referenceId > 0) {
    return { kind: 'installment_sale', id: referenceId };
  }

  if ((referenceType.includes('sales_order') || referenceType.includes('invoice')) && referenceId > 0) {
    return { kind: 'sales_order', id: referenceId };
  }

  if (referenceType.includes('repair') && referenceId > 0) {
    return { kind: 'repair', id: referenceId };
  }

  if (parsed.installmentId && /قسط|اقساط|فروش\s*اقساطی/i.test(raw)) {
    return { kind: 'installment_sale', id: parsed.installmentId };
  }

  if (parsed.invoiceId && /فاکتور|invoice|فروش\s*اعتباری|فروش\s*نقدی/i.test(raw)) {
    return { kind: 'sales_order', id: parsed.invoiceId };
  }

  return { kind: null, id: null };
};

const resolveCustomerLedgerSourceInfo = async (row: any, customerId: number): Promise<CustomerLedgerSourceInfo> => {
  const fallback: CustomerLedgerSourceInfo = {
    sourceKind: null,
    sourceId: null,
    sourceLabel: null,
    sourceUrl: null,
    sourceIcon: null,
    sourceResolved: false,
  };

  const candidate = inferCustomerLedgerSourceCandidate(row);
  if (!candidate.kind || !candidate.id) return fallback;

  if (candidate.kind === 'installment_sale') {
    let saleId = Number(candidate.id || 0);

    if (String(row?.referenceType || '').trim().toLowerCase() === 'installment_payment_tx') {
      const txSource = await getAsync(
        `SELECT s.id AS saleId
           FROM installment_transactions it
           JOIN installment_payments ip ON ip.id = it.installment_payment_id
           JOIN installment_sales s ON s.id = ip.saleId
          WHERE it.id = ? AND s.customerId = ?
          LIMIT 1`,
        [candidate.id, customerId]
      ).catch(() => null as any);
      saleId = Number(txSource?.saleId || 0);
    }

    if (!saleId) return fallback;

    const sale = await getAsync(
      `SELECT id, COALESCE(NULLIF(itemsSummary, ''), 'فروش اقساطی') AS title
         FROM installment_sales
        WHERE id = ? AND customerId = ?
        LIMIT 1`,
      [saleId, customerId]
    ).catch(() => null as any);

    if (!sale?.id) return {
      sourceKind: 'installment_sale',
      sourceId: saleId,
      sourceLabel: `پرونده اقساطی #${formatFaSourceNumber(saleId)} یافت نشد`,
      sourceUrl: null,
      sourceIcon: 'fa-solid fa-file-invoice-dollar',
      sourceResolved: false,
    };

    return {
      sourceKind: 'installment_sale',
      sourceId: Number(sale.id),
      sourceLabel: `پرونده اقساطی #${formatFaSourceNumber(Number(sale.id))}`,
      sourceUrl: `/installment-sales/${Number(sale.id)}`,
      sourceIcon: 'fa-solid fa-file-invoice-dollar',
      sourceResolved: true,
    };
  }

  if (candidate.kind === 'sales_order') {
    const orderId = Number(candidate.id || 0);
    const order = await getAsync(
      `SELECT id, paymentMethod
         FROM sales_orders
        WHERE id = ? AND customerId = ? AND (status IS NULL OR status = 'active')
        LIMIT 1`,
      [orderId, customerId]
    ).catch(() => null as any);

    return {
      sourceKind: 'sales_order',
      sourceId: orderId,
      sourceLabel: order?.id ? `فاکتور فروش #${formatFaSourceNumber(orderId)}` : `فاکتور فروش #${formatFaSourceNumber(orderId)} یافت نشد`,
      sourceUrl: order?.id ? `/invoices/${orderId}` : null,
      sourceIcon: 'fa-solid fa-file-invoice',
      sourceResolved: Boolean(order?.id),
    };
  }

  if (candidate.kind === 'repair') {
    const repairId = Number(candidate.id || 0);
    const repair = await getAsync(
      `SELECT id FROM repairs WHERE id = ? AND customerId = ? LIMIT 1`,
      [repairId, customerId]
    ).catch(() => null as any);

    return {
      sourceKind: 'repair',
      sourceId: repairId,
      sourceLabel: repair?.id ? `پرونده تعمیر #${formatFaSourceNumber(repairId)}` : `پرونده تعمیر #${formatFaSourceNumber(repairId)} یافت نشد`,
      sourceUrl: repair?.id ? `/repairs/${repairId}` : null,
      sourceIcon: 'fa-solid fa-screwdriver-wrench',
      sourceResolved: Boolean(repair?.id),
    };
  }

  return fallback;
};

const decorateCustomerLedgerSourceRows = async (rows: any[], customerId: number): Promise<any[]> => {
  return await Promise.all((rows || []).map(async (row) => {
    const source = await resolveCustomerLedgerSourceInfo(row, customerId);
    return { ...row, ...source };
  }));
};


const getLatestCustomerLedgerSourceForReport = async (customerId: number): Promise<CustomerLedgerSourceInfo> => {
  const fallback: CustomerLedgerSourceInfo = {
    sourceKind: null,
    sourceId: null,
    sourceLabel: null,
    sourceUrl: null,
    sourceIcon: null,
    sourceResolved: false,
  };

  const rows = await allAsync(
    `SELECT *
       FROM customer_ledger
      WHERE customerId = ?
      ORDER BY
        CASE WHEN COALESCE(debit, 0) > 0 THEN 0 ELSE 1 END,
        datetime(COALESCE(updatedAt, createdAt, transactionDate)) DESC,
        id DESC
      LIMIT 12`,
    [customerId]
  ).catch(() => [] as any[]);

  let firstCandidate: CustomerLedgerSourceInfo | null = null;
  for (const row of rows || []) {
    const source = await resolveCustomerLedgerSourceInfo(row, customerId);
    if (!firstCandidate && (source.sourceLabel || source.sourceKind || source.sourceId)) firstCandidate = source;
    if (source.sourceResolved && source.sourceUrl) return source;
  }
  return firstCandidate || fallback;
};

type PartnerLedgerSourceInfo = {
  sourceKind: 'phone' | 'product' | 'partner_ledger' | 'manual' | null;
  sourceId: number | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
  sourceIcon: string | null;
  sourceResolved: boolean;
};

const resolvePartnerLedgerSourceInfo = async (row: any, partnerId: number): Promise<PartnerLedgerSourceInfo> => {
  const fallback: PartnerLedgerSourceInfo = {
    sourceKind: null,
    sourceId: null,
    sourceLabel: null,
    sourceUrl: null,
    sourceIcon: null,
    sourceResolved: false,
  };

  const referenceType = String(row?.referenceType || '').trim().toLowerCase();
  const referenceId = Number(row?.referenceId || 0);
  const raw = String(row?.description || '').trim();

  if (referenceId > 0 && referenceType.includes('phone')) {
    const phone = await getAsync(
      `SELECT id, model, imei
         FROM phones
        WHERE id = ? AND (partnerId = ? OR partnerId IS NULL OR ? IS NULL)
        LIMIT 1`,
      [referenceId, partnerId, partnerId]
    ).catch(() => null as any);

    if (phone?.id) {
      const model = String(phone.model || 'گوشی').trim();
      const imei = String(phone.imei || '').trim();
      return {
        sourceKind: 'phone',
        sourceId: Number(phone.id),
        sourceLabel: `${model}${imei ? ` • IMEI: ${imei}` : ''}`,
        sourceUrl: `/mobile-phones?phoneId=${Number(phone.id)}`,
        sourceIcon: 'fa-solid fa-mobile-screen-button',
        sourceResolved: true,
      };
    }

    return {
      sourceKind: 'phone',
      sourceId: referenceId,
      sourceLabel: `گوشی #${formatFaSourceNumber(referenceId)} یافت نشد`,
      sourceUrl: null,
      sourceIcon: 'fa-solid fa-mobile-screen-button',
      sourceResolved: false,
    };
  }

  if (referenceId > 0 && referenceType.includes('product')) {
    const product = await getAsync(
      `SELECT id, name
         FROM products
        WHERE id = ?
        LIMIT 1`,
      [referenceId]
    ).catch(() => null as any);

    return {
      sourceKind: 'product',
      sourceId: referenceId,
      sourceLabel: product?.id ? `کالا: ${String(product.name || `#${referenceId}`).trim()}` : `کالا #${formatFaSourceNumber(referenceId)} یافت نشد`,
      sourceUrl: product?.id ? `/products?productId=${referenceId}` : null,
      sourceIcon: 'fa-solid fa-box',
      sourceResolved: Boolean(product?.id),
    };
  }

  const phoneIdFromText = Number(
    raw.match(/(?:شناسه\s*گوشی|phone\s*id|ph)[:：#\s-]*(\d+)/i)?.[1] ||
    0
  );
  if (phoneIdFromText > 0) {
    return resolvePartnerLedgerSourceInfo({ ...row, referenceType: 'phone_purchase', referenceId: phoneIdFromText }, partnerId);
  }

  return fallback;
};

const getLatestPartnerLedgerSourceForReport = async (partnerId: number): Promise<PartnerLedgerSourceInfo> => {
  const fallback: PartnerLedgerSourceInfo = {
    sourceKind: null,
    sourceId: null,
    sourceLabel: null,
    sourceUrl: null,
    sourceIcon: null,
    sourceResolved: false,
  };

  const rows = await allAsync(
    `SELECT *
       FROM partner_ledger
      WHERE partnerId = ?
      ORDER BY
        CASE WHEN referenceType IS NOT NULL AND TRIM(referenceType) <> '' THEN 0 ELSE 1 END,
        CASE WHEN COALESCE(credit, 0) > 0 THEN 0 ELSE 1 END,
        datetime(COALESCE(updatedAt, createdAt, transactionDate)) DESC,
        id DESC
      LIMIT 12`,
    [partnerId]
  ).catch(() => [] as any[]);

  let firstCandidate: PartnerLedgerSourceInfo | null = null;
  for (const row of rows || []) {
    const source = await resolvePartnerLedgerSourceInfo(row, partnerId);
    if (!firstCandidate && (source.sourceLabel || source.sourceKind || source.sourceId)) firstCandidate = source;
    if (source.sourceResolved && source.sourceUrl) return source;
  }
  return firstCandidate || fallback;
};

export const getLedgerForCustomerFromDb = async (customerId: number): Promise<any[]> => {
  await getDbInstance();
  const rows = await allAsync(
    `SELECT * FROM customer_ledger WHERE customerId = ? ORDER BY datetime(COALESCE(updatedAt, createdAt, transactionDate)) DESC, id DESC`,
    [customerId]
  );
  return await decorateCustomerLedgerSourceRows(rows, customerId);
};


export type CustomerFollowupPayload = {
  note: string;
  nextFollowupDate?: string | null; // ISO
};

export const addCustomerFollowupToDb = async (
  customerId: number,
  payload: CustomerFollowupPayload,
  actor?: { userId?: number; username?: string }
): Promise<any> => {
  await getDbInstance();
  const note = String(payload.note || '').trim();
  if (!note) throw new Error('یادداشت پیگیری خالی است.');
  const nextDate = payload.nextFollowupDate || null;

  const result = await runAsync(
    `INSERT INTO customer_followups (customerId, createdByUserId, createdByUsername, note, nextFollowupDate, status)
     VALUES (?, ?, ?, ?, ?, 'open')`,
    [customerId, actor?.userId || null, actor?.username || null, note, nextDate]
  );
  return await getAsync(`SELECT * FROM customer_followups WHERE id = ?`, [result.lastID]);
};

export const listCustomerFollowupsFromDb = async (customerId: number): Promise<any[]> => {
  await getDbInstance();
  return await allAsync(
    `SELECT * FROM customer_followups WHERE customerId = ? ORDER BY createdAt DESC, id DESC`,
    [customerId]
  );
};

export const closeCustomerFollowupInDb = async (customerId: number, followupId: number): Promise<any> => {
  await getDbInstance();
  await runAsync(
    `UPDATE customer_followups SET status = 'closed' WHERE id = ? AND customerId = ?`,
    [followupId, customerId]
  );
  return await getAsync(`SELECT * FROM customer_followups WHERE id = ?`, [followupId]);
};


export const updateCustomerFollowupInDb = async (
  customerId: number,
  followupId: number,
  payload: { note?: string; nextFollowupDate?: string | null; status?: 'open'|'closed' }
): Promise<any> => {
  await getDbInstance();

  const updates: string[] = [];
  const params: any[] = [];

  if (payload.note != null) {
    const note = String(payload.note).trim();
    if (!note) throw new Error('یادداشت پیگیری خالی است.');
    updates.push("note = ?");
    params.push(note);
  }

  if (payload.nextFollowupDate !== undefined) {
    updates.push("nextFollowupDate = ?");
    params.push(payload.nextFollowupDate ?? null);
  }

  if (payload.status != null) {
    updates.push("status = ?");
    params.push(payload.status);
  }

  if (updates.length === 0) {
    return await getAsync(`SELECT * FROM customer_followups WHERE id = ? AND customerId = ?`, [followupId, customerId]);
  }

  params.push(followupId, customerId);

  await runAsync(
    `UPDATE customer_followups SET ${updates.join(', ')} WHERE id = ? AND customerId = ?`,
    params
  );

  return await getAsync(`SELECT * FROM customer_followups WHERE id = ? AND customerId = ?`, [followupId, customerId]);
};


export const setCustomerRiskOverrideInDb = async (customerId: number, risk: 'low'|'medium'|'high'|null): Promise<any> => {
  await getDbInstance();
  await runAsync(`UPDATE customers SET riskOverride = ? WHERE id = ?`, [risk, customerId]);
  return await getAsync(`SELECT * FROM customers WHERE id = ?`, [customerId]);
};



export type CustomerLedgerInsights = {
  customerId: number;
  currentBalance: number; // >0 بدهکار، <0 بستانکار
  totalDebit: number;
  totalCredit: number;
  lastPaymentDate: string | null; // ISO
  daysSinceLastPayment: number | null;
  overdueInstallmentsCount: number;
  overdueChecksCount: number;
  riskLevel: 'low' | 'medium' | 'high';
  score: number; // 0..100 (خوش‌حسابی)
  suggestedActions: string[];
};

export const getCustomerLedgerInsightsFromDb = async (customerId: number): Promise<CustomerLedgerInsights> => {
  await getDbInstance();

  const totals = await getAsync(
    `SELECT 
        COALESCE(SUM(debit),0) AS totalDebit,
        COALESCE(SUM(credit),0) AS totalCredit,
        (SELECT balance FROM customer_ledger WHERE customerId = ? ORDER BY id DESC LIMIT 1) AS currentBalance
      FROM customer_ledger
     WHERE customerId = ?`,
    [customerId, customerId]
  );

  const lastPay = await getAsync(
    `SELECT transactionDate AS lastPaymentDate
       FROM customer_ledger
      WHERE customerId = ? AND credit > 0
      ORDER BY transactionDate DESC, id DESC
      LIMIT 1`,
    [customerId]
  );

  // Overdue installments / checks based on Jalali date string YYYY/MM/DD (lexicographic works)
  const todayJ = moment().locale('fa').format('jYYYY/jMM/jDD');

  const overdueInstallmentsRow = await getAsync(
    `SELECT COALESCE(COUNT(*),0) AS cnt
       FROM installment_payments ip
       JOIN installment_sales s ON s.id = ip.saleId
      WHERE s.customerId = ?
        AND ip.status != 'پرداخت شده'
        AND ip.dueDate < ?`,
    [customerId, todayJ]
  );

  const overdueChecksRow = await getAsync(
    `SELECT COALESCE(COUNT(*),0) AS cnt
       FROM installment_checks ic
       JOIN installment_sales s ON s.id = ic.saleId
      WHERE s.customerId = ?
        AND ic.status != 'وصول شده'
        AND ic.dueDate < ?`,
    [customerId, todayJ]
  );

  const currentBalance = Number(totals?.currentBalance || 0);
  const totalDebit = Number(totals?.totalDebit || 0);
  const totalCredit = Number(totals?.totalCredit || 0);

  const lastPaymentDate = lastPay?.lastPaymentDate ? String(lastPay.lastPaymentDate) : null;

  let daysSinceLastPayment: number | null = null;
  if (lastPaymentDate) {
    const diff = moment().diff(moment(lastPaymentDate), 'days');
    daysSinceLastPayment = Number.isFinite(diff) ? diff : null;
  }

  const overdueInstallmentsCount = Number(overdueInstallmentsRow?.cnt || 0);
  const overdueChecksCount = Number(overdueChecksRow?.cnt || 0);

  // Risk heuristic (simple but useful)
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  const overdueAny = overdueInstallmentsCount + overdueChecksCount;

  if (currentBalance > 0 && overdueAny >= 2) riskLevel = 'high';
  else if (currentBalance > 0 && overdueAny >= 1) riskLevel = 'medium';
  else if (currentBalance > 0 && (daysSinceLastPayment ?? 0) >= 30) riskLevel = 'medium';

  
  // Score (0..100) + suggested actions
  let score = 100;

  // debt penalty (only if debtor)
  if (currentBalance > 0) {
    // every 1,000,000 تومان debt => -10 (cap -40)
    const debtPenalty = Math.min(40, Math.floor(currentBalance / 1_000_000) * 10);
    score -= debtPenalty;
  }

  // overdue penalties
  score -= Math.min(30, overdueInstallmentsCount * 15);
  score -= Math.min(40, overdueChecksCount * 20);

  // inactivity penalty
  if ((daysSinceLastPayment ?? 0) >= 60) score -= 20;
  else if ((daysSinceLastPayment ?? 0) >= 30) score -= 10;

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  const suggestedActions: string[] = [];

  if (overdueAny > 0) {
    suggestedActions.push('یادآوری فوری بابت سررسیدهای گذشته');
  }
  if (currentBalance > 0 && score < 60) {
    suggestedActions.push('برای فروش جدید، پیش‌پرداخت/تسویه بگیر');
  } else if (currentBalance > 0 && score >= 60) {
    suggestedActions.push('پیگیری ملایم برای تسویه یا پرداخت بخشی از بدهی');
  }
  if ((daysSinceLastPayment ?? 0) >= 45 && currentBalance > 0) {
    suggestedActions.push('تماس پیگیری (بیش از ۴۵ روز از آخرین پرداخت)');
  }
  if (currentBalance <= 0 && overdueAny === 0) {
    suggestedActions.push('مشتری خوش‌حساب — امکان ارائه تخفیف/اعتبار');
  }

  // Risk level (derived from score + overdue)
  if (score <= 40 || (currentBalance > 0 && overdueAny >= 2)) riskLevel = 'high';
  else if (score <= 70 || (currentBalance > 0 && overdueAny >= 1)) riskLevel = 'medium';
  else riskLevel = 'low';

return {
    customerId,
    currentBalance,
    totalDebit,
    totalCredit,
    lastPaymentDate,
    daysSinceLastPayment,
    overdueInstallmentsCount,
    overdueChecksCount,
    riskLevel,
    score,
    suggestedActions,
  };
};

// --- Partners ---
export const addPartnerToDb = async (partnerData: PartnerPayload): Promise<any> => {
  await getDbInstance();
  const { partnerName, partnerType, contactPerson, phoneNumber, email, address, notes, telegramChatId } = partnerData;
  try {
    const result = await runAsync(
      `INSERT INTO partners (partnerName, partnerType, contactPerson, phoneNumber, email, address, notes, telegramChatId) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [partnerName, partnerType, contactPerson || null, phoneNumber || null, email || null, address || null, notes || null, telegramChatId || null]
    );
    return await getAsync("SELECT * FROM partners WHERE id = ?", [result.lastID]);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed: partners.phoneNumber')) {
      throw new Error('این شماره تماس قبلا برای همکار دیگری ثبت شده است.');
    }
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};


const SOLD_PHONE_DAILY_BUY_PRICE_SQL = `COALESCE(
  NULLIF((
    SELECT soi.buyPrice
    FROM sales_order_items soi
    JOIN sales_orders so ON so.id = soi.orderId
    WHERE soi.itemType = 'phone'
      AND soi.itemId = ph.id
      AND (so.status IS NULL OR so.status = 'active')
    ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC
    LIMIT 1
  ), 0),
  NULLIF((
    SELECT st.buyPrice
    FROM sales_transactions st
    WHERE st.itemType = 'phone'
      AND st.itemId = ph.id
    ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC
    LIMIT 1
  ), 0),
  NULLIF((
    SELECT isi.buyPrice
    FROM installment_sale_items isi
    JOIN installment_sales isale ON isale.id = isi.saleId
    WHERE isi.itemType = 'phone'
      AND isi.itemId = ph.id
    ORDER BY datetime(COALESCE(isale.dateCreated, '1970-01-01')) DESC, isi.id DESC
    LIMIT 1
  ), 0),
  NULLIF(ph.currentPurchasePrice, 0),
  ph.purchasePrice,
  0
)`;

const PHONE_SETTLEMENT_LEDGER_TYPES_SQL = `('phone_settlement_payment','phone_payment','product_settlement_phone')`;
// Manual/product-specific settlements previously entered from the partner panel.
// Kept for legacy compatibility, but the UI now treats phone settlement as read-only
// and derives cash/installment progress from the actual sale/payment source.
const PHONE_SETTLEMENT_MANUAL_PAID_SQL = `COALESCE((
  SELECT SUM(COALESCE(l.debit, 0))
  FROM partner_ledger l
  WHERE l.partnerId = ph.supplierId
    AND l.referenceId = ph.id
    AND l.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
), 0)`;
const PHONE_SETTLEMENT_PAID_SQL = PHONE_SETTLEMENT_MANUAL_PAID_SQL;

export const getAllPartnersWithBalanceFromDb = async (partnerType?: string): Promise<any[]> => {
  await getDbInstance();
  let sql = `
    SELECT
      p.*,
      COALESCE((
        SELECT SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0))
        FROM partner_ledger l
        WHERE l.partnerId = p.id
      ), 0) AS currentBalance,
      COALESCE((SELECT COUNT(*) FROM phones ph WHERE ph.supplierId = p.id), 0) AS totalPhonesSupplied,
      COALESCE((SELECT COUNT(*) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS phonesSoldCount,
      COALESCE((SELECT COUNT(*) FROM phones ph WHERE ph.supplierId = p.id AND ph.status = 'فروخته شده (قسطی)'), 0) AS phonesInstallmentSoldCount,
      COALESCE((
        SELECT COUNT(DISTINCT isale.id)
        FROM installment_sales isale
        JOIN installment_sale_items isi ON isi.saleId = isale.id AND isi.itemType = 'phone'
        JOIN phones ph ON ph.id = isi.itemId
        WHERE ph.supplierId = p.id
          AND (
            EXISTS (SELECT 1 FROM installment_payments ip WHERE ip.saleId = isale.id AND COALESCE(ip.status, '') <> 'پرداخت شده')
            OR EXISTS (SELECT 1 FROM installment_checks ic WHERE ic.saleId = isale.id AND COALESCE(ic.status, '') NOT IN ('پاس شده', 'وصول شده', 'تسویه شده'))
          )
      ), 0) AS openInstallmentSalesCount,
      COALESCE((SELECT COUNT(*) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی')), 0) AS unsoldPhonesCount,
      COALESCE((SELECT SUM(COALESCE(pr.purchasePrice, 0) * COALESCE(pr.stock_quantity, 0)) FROM products pr WHERE pr.supplierId = p.id), 0) AS accessoriesPayableAmount,
      COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS phoneSalesReceivableAmount,
      COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS soldPhonesCurrentPurchaseAmount,
      COALESCE((SELECT SUM(COALESCE(ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS soldPhonesInitialPurchaseAmount,
      COALESCE((
        SELECT SUM(COALESCE((
          SELECT SUM(COALESCE(l.debit, 0))
          FROM partner_ledger l
          WHERE l.partnerId = p.id
            AND l.referenceId = ph.id
            AND l.referenceType IN ('phone_settlement_payment','phone_payment','product_settlement_phone')
        ), 0))
        FROM phones ph
        WHERE ph.supplierId = p.id
          AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')
      ), 0) AS soldPhonesProductSettlementPaidAmount,
      (
        COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0)
        - COALESCE((
          SELECT SUM(COALESCE((
            SELECT SUM(COALESCE(l.debit, 0))
            FROM partner_ledger l
            WHERE l.partnerId = p.id
              AND l.referenceId = ph.id
              AND l.referenceType IN ('phone_settlement_payment','phone_payment','product_settlement_phone')
          ), 0))
          FROM phones ph
          WHERE ph.supplierId = p.id
            AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')
        ), 0)
      ) AS soldPhonesProductSettlementBalance,
      (
        COALESCE((SELECT SUM(COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0)
        - COALESCE((
          SELECT SUM(COALESCE((
            SELECT SUM(COALESCE(l.debit, 0))
            FROM partner_ledger l
            WHERE l.partnerId = p.id
              AND l.referenceId = ph.id
              AND l.referenceType IN ('phone_settlement_payment','phone_payment','product_settlement_phone')
          ), 0))
          FROM phones ph
          WHERE ph.supplierId = p.id
            AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')
        ), 0)
      ) AS unallocatedPartnerPaymentAmount,
      (
        COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0)
        - COALESCE((SELECT SUM(COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0)
      ) AS soldPhonesCurrentPurchaseBalance,
      CASE WHEN COALESCE((SELECT SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0) > 0
        THEN COALESCE((SELECT SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0)
        ELSE 0
      END AS totalReceivableAmount,
      COALESCE((SELECT SUM(COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی')), 0) AS unsoldPhonesInventoryAmount,
      COALESCE((SELECT SUM(COALESCE(pr.purchasePrice, 0) * COALESCE(pr.stock_quantity, 0)) FROM products pr WHERE pr.supplierId = p.id AND COALESCE(pr.stock_quantity, 0) > 0), 0) AS unsoldAccessoriesInventoryAmount,
      COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL} - COALESCE(ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS soldPhoneCurrentDeltaAmount,
      (
        COALESCE((SELECT SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0)
        + COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL} - COALESCE(ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0)
        - COALESCE((SELECT SUM(COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی')), 0)
        - COALESCE((SELECT SUM(COALESCE(pr.purchasePrice, 0) * COALESCE(pr.stock_quantity, 0)) FROM products pr WHERE pr.supplierId = p.id AND COALESCE(pr.stock_quantity, 0) > 0), 0)
      ) AS realizedCollectedBalance
    FROM partners p
  `;
  const params: any[] = [];
  if (partnerType) {
    sql += " WHERE p.partnerType = ?";
    params.push(partnerType);
  }
  sql += " ORDER BY p.partnerName ASC";

  return await allAsync(sql, params);
};

export const getPartnerByIdFromDb = async (partnerId: number): Promise<any> => {
  await getDbInstance();
  await normalizePhonePurchaseLedgers(true).catch((e) => {
    console.error('Phone purchase ledger normalization failed while loading partner:', e?.message || e);
  });
  return await getAsync(`
    SELECT
      p.*,
      COALESCE((
        SELECT SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0))
        FROM partner_ledger l
        WHERE l.partnerId = p.id
      ), 0) AS currentBalance,
      COALESCE((SELECT COUNT(*) FROM phones ph WHERE ph.supplierId = p.id), 0) AS totalPhonesSupplied,
      COALESCE((SELECT COUNT(*) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS phonesSoldCount,
      COALESCE((SELECT COUNT(*) FROM phones ph WHERE ph.supplierId = p.id AND ph.status = 'فروخته شده (قسطی)'), 0) AS phonesInstallmentSoldCount,
      COALESCE((
        SELECT COUNT(DISTINCT isale.id)
        FROM installment_sales isale
        JOIN installment_sale_items isi ON isi.saleId = isale.id AND isi.itemType = 'phone'
        JOIN phones ph ON ph.id = isi.itemId
        WHERE ph.supplierId = p.id
          AND (
            EXISTS (SELECT 1 FROM installment_payments ip WHERE ip.saleId = isale.id AND COALESCE(ip.status, '') <> 'پرداخت شده')
            OR EXISTS (SELECT 1 FROM installment_checks ic WHERE ic.saleId = isale.id AND COALESCE(ic.status, '') NOT IN ('پاس شده', 'وصول شده', 'تسویه شده'))
          )
      ), 0) AS openInstallmentSalesCount,
      COALESCE((SELECT COUNT(*) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی')), 0) AS unsoldPhonesCount,
      COALESCE((SELECT SUM(COALESCE(pr.purchasePrice, 0) * COALESCE(pr.stock_quantity, 0)) FROM products pr WHERE pr.supplierId = p.id), 0) AS accessoriesPayableAmount,
      COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS phoneSalesReceivableAmount,
      COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS soldPhonesCurrentPurchaseAmount,
      COALESCE((SELECT SUM(COALESCE(ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS soldPhonesInitialPurchaseAmount,
      COALESCE((
        SELECT SUM(COALESCE((
          SELECT SUM(COALESCE(l.debit, 0))
          FROM partner_ledger l
          WHERE l.partnerId = p.id
            AND l.referenceId = ph.id
            AND l.referenceType IN ('phone_settlement_payment','phone_payment','product_settlement_phone')
        ), 0))
        FROM phones ph
        WHERE ph.supplierId = p.id
          AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')
      ), 0) AS soldPhonesProductSettlementPaidAmount,
      (
        COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0)
        - COALESCE((
          SELECT SUM(COALESCE((
            SELECT SUM(COALESCE(l.debit, 0))
            FROM partner_ledger l
            WHERE l.partnerId = p.id
              AND l.referenceId = ph.id
              AND l.referenceType IN ('phone_settlement_payment','phone_payment','product_settlement_phone')
          ), 0))
          FROM phones ph
          WHERE ph.supplierId = p.id
            AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')
        ), 0)
      ) AS soldPhonesProductSettlementBalance,
      (
        COALESCE((SELECT SUM(COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0)
        - COALESCE((
          SELECT SUM(COALESCE((
            SELECT SUM(COALESCE(l.debit, 0))
            FROM partner_ledger l
            WHERE l.partnerId = p.id
              AND l.referenceId = ph.id
              AND l.referenceType IN ('phone_settlement_payment','phone_payment','product_settlement_phone')
          ), 0))
          FROM phones ph
          WHERE ph.supplierId = p.id
            AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')
        ), 0)
      ) AS unallocatedPartnerPaymentAmount,
      (
        COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0)
        - COALESCE((SELECT SUM(COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0)
      ) AS soldPhonesCurrentPurchaseBalance,
      CASE WHEN COALESCE((SELECT SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0) > 0
        THEN COALESCE((SELECT SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0)
        ELSE 0
      END AS totalReceivableAmount,
      COALESCE((SELECT SUM(COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی')), 0) AS unsoldPhonesInventoryAmount,
      COALESCE((SELECT SUM(COALESCE(pr.purchasePrice, 0) * COALESCE(pr.stock_quantity, 0)) FROM products pr WHERE pr.supplierId = p.id AND COALESCE(pr.stock_quantity, 0) > 0), 0) AS unsoldAccessoriesInventoryAmount,
      COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL} - COALESCE(ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS soldPhoneCurrentDeltaAmount,
      (
        COALESCE((SELECT SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0)
        + COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL} - COALESCE(ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0)
        - COALESCE((SELECT SUM(COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی')), 0)
        - COALESCE((SELECT SUM(COALESCE(pr.purchasePrice, 0) * COALESCE(pr.stock_quantity, 0)) FROM products pr WHERE pr.supplierId = p.id AND COALESCE(pr.stock_quantity, 0) > 0), 0)
      ) AS realizedCollectedBalance
    FROM partners p
    WHERE p.id = ?
  `, [partnerId]);
};

export const updatePartnerInDb = async (partnerId: number, partnerData: PartnerPayload): Promise<any> => {
  await getDbInstance();
  const { partnerName, partnerType, contactPerson, phoneNumber, email, address, notes, telegramChatId } = partnerData;
   try {
    await runAsync(
      `UPDATE partners SET partnerName = ?, partnerType = ?, contactPerson = ?, phoneNumber = ?, email = ?, address = ?, notes = ?, telegramChatId = ? 
       WHERE id = ?`,
      [partnerName, partnerType, contactPerson || null, phoneNumber || null, email || null, address || null, notes || null, telegramChatId || null, partnerId]
    );
    return await getPartnerByIdFromDb(partnerId);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed: partners.phoneNumber')) {
      throw new Error('این شماره تماس قبلا برای همکار دیگری ثبت شده است.');
    }
     if (err.message.includes('NOT NULL constraint failed: partners.partnerName') || err.message.includes('NOT NULL constraint failed: partners.partnerType')) {
      throw new Error('نام همکار و نوع همکار نمی‌توانند خالی باشند.');
    }
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const deletePartnerFromDb = async (partnerId: number): Promise<boolean> => {
  await getDbInstance();
  const result = await runAsync(`DELETE FROM partners WHERE id = ?`, [partnerId]);
  return result.changes > 0;
};

export const addPartnerLedgerEntryToDb = async (partnerId: number, entryData: LedgerEntryPayload): Promise<any> => {
  await getDbInstance();
  const { description, debit, credit, transactionDate, referenceType, referenceId, settlementBatchId, changeHistoryJson } = entryData as any;
  return await addPartnerLedgerEntryInternal(
    partnerId,
    description,
    debit,
    credit,
    transactionDate,
    referenceType || undefined,
    referenceId != null ? Number(referenceId) : undefined,
    settlementBatchId ? String(settlementBatchId).trim() : undefined,
    changeHistoryJson ? String(changeHistoryJson) : undefined
  );
};

const PHONE_PURCHASE_LEDGER_DISPLAY_TYPES = new Set<string>(['phone_purchase', 'phone_purchase_edit', 'phone_purchase_reversal_on_edit']);

const collapseDuplicatePhonePurchaseLedgerRows = (rows: any[]): any[] => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const latestByPhoneReference = new Map<number, any>();
  const keptRows: any[] = [];

  for (const row of rows) {
    const referenceType = String(row?.referenceType || '').trim();
    const referenceId = Number(row?.referenceId || 0);
    if (referenceId > 0 && PHONE_PURCHASE_LEDGER_DISPLAY_TYPES.has(referenceType)) {
      if (!latestByPhoneReference.has(referenceId)) {
        latestByPhoneReference.set(referenceId, row);
      }
      continue;
    }
    keptRows.push(row);
  }

  return [...keptRows, ...latestByPhoneReference.values()].sort((a, b) =>
    String(b.updatedAt || b.createdAt || b.transactionDate || '').localeCompare(String(a.updatedAt || a.createdAt || a.transactionDate || '')) ||
    Number(b.id || 0) - Number(a.id || 0)
  );
};

export const getLedgerForPartnerFromDb = async (partnerId: number): Promise<any[]> => {
  await getDbInstance();
  const rows = await allAsync(
    `SELECT * FROM partner_ledger WHERE partnerId = ? ORDER BY datetime(COALESCE(updatedAt, createdAt, transactionDate)) DESC, id DESC`,
    [partnerId]
  );
  return collapseDuplicatePhonePurchaseLedgerRows(rows);
};

export const getPurchasedItemsFromPartnerDb = async (partnerId: number): Promise<any[]> => {
  await getDbInstance();
  const products = await allAsync(
    `SELECT
        pr.id,
        pr.name,
        COALESCE(SUM(pi.quantity), 0) as quantityPurchased,
        COALESCE(SUM(pi.quantity), 0) as quantity,
        COALESCE((
          SELECT pi2.unitCost
            FROM purchase_items pi2
            JOIN purchases p2 ON p2.id = pi2.purchaseId
           WHERE pi2.productId = pr.id
             AND p2.supplierId = ?
           ORDER BY datetime(COALESCE(p2.purchaseDate, '1970-01-01')) DESC, pi2.id DESC
           LIMIT 1
        ), pr.purchasePrice, 0) as unitPrice,
        COALESCE(NULLIF(pr.unit, ''), 'عدد') as unit,
        COALESCE(SUM(pi.lineTotal), 0) as totalPrice,
        MAX(p.purchaseDate) as purchaseDate,
        'product' as type,
        NULL as status,
        NULL as soldAt,
        COALESCE((
          SELECT pi2.unitCost
            FROM purchase_items pi2
            JOIN purchases p2 ON p2.id = pi2.purchaseId
           WHERE pi2.productId = pr.id
             AND p2.supplierId = ?
           ORDER BY datetime(COALESCE(p2.purchaseDate, '1970-01-01')) DESC, pi2.id DESC
           LIMIT 1
        ), pr.purchasePrice, 0) as purchasePrice,
        pr.sellingPrice,
        pr.sku,
        pr.barcode
     FROM products pr
     JOIN purchase_items pi ON pi.productId = pr.id
     JOIN purchases p ON p.id = pi.purchaseId
     WHERE p.supplierId = ?
     GROUP BY pr.id, pr.name, pr.unit, pr.purchasePrice, pr.sellingPrice, pr.sku, pr.barcode
     ORDER BY datetime(MAX(p.purchaseDate)) DESC, pr.id DESC`, [partnerId, partnerId, partnerId]
  );
  const phones = await allAsync(
    `SELECT ph.id, ph.model as name, ph.imei as identifier,
            ${SOLD_PHONE_DAILY_BUY_PRICE_SQL} as purchasePrice,
            COALESCE(ph.purchasePrice, 0) as initialPurchasePrice,
            ph.currentPurchasePrice,
            ph.currentPurchasePriceUpdatedAt,
            ${SOLD_PHONE_DAILY_BUY_PRICE_SQL} as soldDailyPurchasePrice,
            ${SOLD_PHONE_DAILY_BUY_PRICE_SQL} as settlementPurchasePrice,
            ${PHONE_SETTLEMENT_PAID_SQL} as phoneSettlementPaidAmount,
            (${SOLD_PHONE_DAILY_BUY_PRICE_SQL} - ${PHONE_SETTLEMENT_PAID_SQL}) as phoneSettlementBalance,
            COALESCE((
              SELECT COUNT(1)
              FROM partner_ledger l
              WHERE l.partnerId = ph.supplierId
                AND l.referenceId = ph.id
                AND l.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
                AND COALESCE(l.debit, 0) > 0
            ), 0) as phoneSettlementPaymentCount,
            (
              SELECT MAX(l.transactionDate)
              FROM partner_ledger l
              WHERE l.partnerId = ph.supplierId
                AND l.referenceId = ph.id
                AND l.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
                AND COALESCE(l.debit, 0) > 0
            ) as phoneSettlementLastPaymentDate,
            CASE
              WHEN EXISTS (
                SELECT 1 FROM sales_order_items soi
                JOIN sales_orders so ON so.id = soi.orderId
                WHERE soi.itemType = 'phone' AND soi.itemId = ph.id
                  AND COALESCE(NULLIF(soi.buyPrice, 0), 0) > 0
                  AND (so.status IS NULL OR so.status = 'active')
              ) THEN 'sales_order'
              WHEN EXISTS (
                SELECT 1 FROM sales_transactions st
                WHERE st.itemType = 'phone' AND st.itemId = ph.id
                  AND COALESCE(NULLIF(st.buyPrice, 0), 0) > 0
              ) THEN 'legacy_sale'
              WHEN EXISTS (
                SELECT 1 FROM installment_sale_items isi
                JOIN installment_sales isale ON isale.id = isi.saleId
                WHERE isi.itemType = 'phone' AND isi.itemId = ph.id
                  AND COALESCE(NULLIF(isi.buyPrice, 0), 0) > 0
              ) THEN 'installment_sale'
              WHEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), 0) > 0 THEN 'phone_current'
              ELSE 'initial_purchase'
            END as settlementPriceSource,
            CASE
              WHEN EXISTS (SELECT 1 FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND COALESCE(NULLIF(soi.buyPrice, 0), 0) > 0 AND (so.status IS NULL OR so.status = 'active')) THEN 'فاکتور فروش'
              WHEN EXISTS (SELECT 1 FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id AND COALESCE(NULLIF(st.buyPrice, 0), 0) > 0) THEN 'فروش نقدی قدیمی'
              WHEN EXISTS (SELECT 1 FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id AND COALESCE(NULLIF(isi.buyPrice, 0), 0) > 0) THEN 'فروش اقساطی'
              WHEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), 0) > 0 THEN 'قیمت خرید روز گوشی'
              ELSE 'قیمت خرید اولیه'
            END as settlementPriceSourceLabel,
            COALESCE(
              (SELECT 'sales_order' FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT 'legacy_sale' FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT 'installment_sale' FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1)
            ) as saleSourceType,
            COALESCE(
              (SELECT so.id FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT st.id FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT isale.id FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1)
            ) as saleSourceId,
            COALESCE(
              (SELECT so.transactionDate FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT st.transactionDate FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT isale.dateCreated FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1),
              ph.saleDate
            ) as soldAt,
            COALESCE(
              (SELECT 'فاکتور #' || so.id FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT 'فروش نقدی #' || st.id FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT 'اقساطی #' || isale.id FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1)
            ) as saleReferenceLabel,
            COALESCE(
              (SELECT soi.unitPrice FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT st.pricePerItem FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT isi.unitPrice FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1),
              ph.salePrice
            ) as saleUnitPrice,
            COALESCE(
              (SELECT soi.totalPrice FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT st.totalPrice FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT isi.totalPrice FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1),
              ph.salePrice
            ) as saleTotalPrice,
            COALESCE(
              (SELECT so.customerId FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT st.customerId FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT isale.customerId FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1)
            ) as saleCustomerId,
            COALESCE(
              (SELECT c.fullName FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId LEFT JOIN customers c ON c.id = so.customerId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT c.fullName FROM sales_transactions st LEFT JOIN customers c ON c.id = st.customerId WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT c.fullName FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId LEFT JOIN customers c ON c.id = isale.customerId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1)
            ) as saleCustomerName,
            COALESCE(
              (SELECT c.phoneNumber FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId LEFT JOIN customers c ON c.id = so.customerId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT c.phoneNumber FROM sales_transactions st LEFT JOIN customers c ON c.id = st.customerId WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT c.phoneNumber FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId LEFT JOIN customers c ON c.id = isale.customerId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1)
            ) as saleCustomerPhone,
            COALESCE(
              (SELECT so.paymentMethod FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT st.paymentMethod FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT isale.saleType FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1)
            ) as salePaymentMethod,
            COALESCE(
              (SELECT isale.actualSalePrice FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1),
              0
            ) as installmentSaleActualTotal,
            COALESCE(
              (SELECT isale.downPayment FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1),
              0
            ) as installmentSaleDownPayment,
            COALESCE(
              (SELECT SUM(COALESCE(it.amount_paid, 0))
                 FROM installment_sale_items isi
                 JOIN installment_sales isale ON isale.id = isi.saleId
                 JOIN installment_payments ip ON ip.saleId = isale.id
                 JOIN installment_transactions it ON it.installment_payment_id = ip.id
                WHERE isi.itemType = 'phone' AND isi.itemId = ph.id),
              0
            ) as installmentSaleTransactionPaidAmount,
            COALESCE(
              (SELECT SUM(COALESCE(ic.amount, 0))
                 FROM installment_sale_items isi
                 JOIN installment_sales isale ON isale.id = isi.saleId
                 JOIN installment_checks ic ON ic.saleId = isale.id
                WHERE isi.itemType = 'phone'
                  AND isi.itemId = ph.id
                  AND TRIM(COALESCE(ic.status, '')) IN ('پاس شده','نقد شد','وصول شده','تسویه شده','تکمیل شده','پرداخت شده')),
              0
            ) as installmentSaleCheckPaidAmount,
            COALESCE(
              (SELECT SUM(COALESCE(ip.amountDue, 0)) FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId JOIN installment_payments ip ON ip.saleId = isale.id WHERE isi.itemType = 'phone' AND isi.itemId = ph.id),
              0
            ) as installmentSaleScheduledAmount,
            COALESCE(
              (SELECT COUNT(1)
                 FROM installment_sale_items isi
                 JOIN installment_sales isale ON isale.id = isi.saleId
                 JOIN installment_payments ip ON ip.saleId = isale.id
                WHERE isi.itemType = 'phone'
                  AND isi.itemId = ph.id
                  AND TRIM(COALESCE(ip.status, '')) NOT IN ('پرداخت شده','تکمیل شده','تسویه شده')),
              0
            ) as installmentSaleOpenPaymentsCount,
            COALESCE(
              (SELECT COUNT(1)
                 FROM installment_sale_items isi
                 JOIN installment_sales isale ON isale.id = isi.saleId
                 JOIN installment_checks ic ON ic.saleId = isale.id
                WHERE isi.itemType = 'phone'
                  AND isi.itemId = ph.id
                  AND TRIM(COALESCE(ic.status, '')) NOT IN ('پاس شده','نقد شد','وصول شده','تسویه شده','تکمیل شده','پرداخت شده')),
              0
            ) as installmentSaleOpenChecksCount,
            ${PHONE_SETTLEMENT_MANUAL_PAID_SQL} as phoneSettlementManualPaidAmount,
            1 as quantityPurchased,
            'عدد' as unit,
            ${SOLD_PHONE_DAILY_BUY_PRICE_SQL} as totalPrice,
            ph.purchaseDate, ph.status, 'phone' as type
     FROM phones ph
     WHERE ph.supplierId = ?`, [partnerId]
  );
  return [...products, ...phones].sort((a, b) => new Date(String(b.purchaseDate || b.soldAt || 0)).getTime() - new Date(String(a.purchaseDate || a.soldAt || 0)).getTime());
};



const LEGACY_LEDGER_BACKFILL_KEY = 'legacy_history_ledger_backfill_v1';

const backfillLegacyHistoryAndLedgers = async (): Promise<void> => {
  const doneRow = await getAsync(`SELECT value FROM settings WHERE key = ?`, [LEGACY_LEDGER_BACKFILL_KEY]).catch(() => null as any);
  if (String(doneRow?.value || '') === 'done') return;

  const touchedCustomers = new Set<number>();
  const touchedPartners = new Set<number>();

  // فروش‌های قدیمی
  const legacySales = await allAsync(
    `SELECT id, customerId, itemName, totalPrice, paymentMethod, transactionDate
       FROM sales_transactions
      WHERE customerId IS NOT NULL
        AND COALESCE(totalPrice, 0) > 0
        AND NOT EXISTS (
          SELECT 1 FROM customer_ledger cl
           WHERE cl.customerId = sales_transactions.customerId
             AND cl.description LIKE '%' || 'شناسه فروش: ' || sales_transactions.id || '%'
        )
   ORDER BY datetime(COALESCE(transactionDate, datetime('now'))) ASC, id ASC`
  ).catch(() => [] as any[]);

  for (const sale of legacySales) {
    const customerId = Number(sale.customerId || 0);
    if (!customerId) continue;
    const totalPrice = Number(sale.totalPrice || 0);
    if (totalPrice <= 0) continue;
    const isCredit = String(sale.paymentMethod || '').toLowerCase() === 'credit';
    const desc = isCredit
      ? `خرید اعتباری: ${sale.itemName || 'کالا/خدمت'} (شناسه فروش: ${sale.id})`
      : `خرید نقدی: ${sale.itemName || 'کالا/خدمت'} (شناسه فروش: ${sale.id})`;
    await runAsync(
      `INSERT INTO customer_ledger (customerId, transactionDate, description, debit, credit, balance)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [customerId, sale.transactionDate || new Date().toISOString(), desc, totalPrice, isCredit ? 0 : totalPrice]
    );
    touchedCustomers.add(customerId);
  }

  // فاکتورهای فروش جدیدتر که شاید قبلاً ledger نخورده‌اند
  const salesOrders = await allAsync(
    `SELECT id, customerId, paymentMethod, grandTotal, transactionDate
       FROM sales_orders
      WHERE customerId IS NOT NULL
        AND COALESCE(grandTotal, 0) > 0
        AND (status IS NULL OR status = 'active')
        AND NOT EXISTS (
          SELECT 1 FROM customer_ledger cl
           WHERE cl.customerId = sales_orders.customerId
             AND cl.description = CASE
               WHEN sales_orders.paymentMethod = 'credit' THEN 'فاکتور فروش اعتباری شماره ' || sales_orders.id
               ELSE 'فاکتور فروش نقدی شماره ' || sales_orders.id
             END
        )
   ORDER BY datetime(COALESCE(transactionDate, datetime('now'))) ASC, id ASC`
  ).catch(() => [] as any[]);

  for (const order of salesOrders) {
    const customerId = Number(order.customerId || 0);
    if (!customerId) continue;
    const grandTotal = Number(order.grandTotal || 0);
    if (grandTotal <= 0) continue;
    const isCredit = String(order.paymentMethod || '').toLowerCase() === 'credit';
    const desc = isCredit ? `فاکتور فروش اعتباری شماره ${order.id}` : `فاکتور فروش نقدی شماره ${order.id}`;
    await runAsync(
      `INSERT INTO customer_ledger (customerId, transactionDate, description, debit, credit, balance)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [customerId, order.transactionDate || new Date().toISOString(), desc, grandTotal, isCredit ? 0 : grandTotal]
    );
    touchedCustomers.add(customerId);
  }

  // فروش‌های اقساطی قدیمی
  const installmentSales = await allAsync(
    `SELECT id, customerId, actualSalePrice, downPayment, itemsSummary, dateCreated
       FROM installment_sales
      WHERE customerId IS NOT NULL
        AND COALESCE(actualSalePrice, 0) > 0
        AND NOT EXISTS (
          SELECT 1 FROM customer_ledger cl
           WHERE cl.customerId = installment_sales.customerId
             AND (
               cl.description LIKE '%' || 'شناسه فروش: ' || installment_sales.id || '%'
               OR cl.description LIKE '%' || 'شناسه فروش اقساطی: ' || installment_sales.id || '%'
             )
        )
   ORDER BY datetime(COALESCE(dateCreated, datetime('now'))) ASC, id ASC`
  ).catch(() => [] as any[]);

  for (const sale of installmentSales) {
    const customerId = Number(sale.customerId || 0);
    if (!customerId) continue;
    const total = Number(sale.actualSalePrice || 0);
    const down = Number(sale.downPayment || 0);
    const debt = total - down;
    const shortItems = String(sale.itemsSummary || sale.mainItemName || '').trim();
    const desc = shortItems
      ? shortItems
      : debt > 0
        ? 'خرید اقساطی'
        : 'خرید نقدی';
    await runAsync(
      `INSERT INTO customer_ledger (customerId, transactionDate, description, debit, credit, balance)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [customerId, sale.dateCreated || new Date().toISOString(), desc, total, debt > 0 ? 0 : total]
    );
    touchedCustomers.add(customerId);
  }

  // رسیدهای خرید قدیمی تامین‌کننده
  const purchaseReceipts = await allAsync(
    `SELECT id, supplierId, invoiceNumber, totalCost, purchaseDate
       FROM purchases
      WHERE supplierId IS NOT NULL
        AND COALESCE(totalCost, 0) > 0
        AND NOT EXISTS (
          SELECT 1 FROM partner_ledger pl
           WHERE pl.partnerId = purchases.supplierId
             AND (
               (pl.referenceType = 'product_purchase' AND pl.referenceId = purchases.id)
               OR pl.description LIKE 'ثبت خرید کالا (رسید انبار) شماره ' || purchases.id || '%'
             )
        )
   ORDER BY datetime(COALESCE(purchaseDate, datetime('now'))) ASC, id ASC`
  ).catch(() => [] as any[]);

  for (const purchase of purchaseReceipts) {
    const partnerId = Number(purchase.supplierId || 0);
    if (!partnerId) continue;
    const totalCost = Number(purchase.totalCost || 0);
    if (totalCost <= 0) continue;
    const desc = `ثبت خرید کالا (رسید انبار) شماره ${purchase.id}` + (purchase.invoiceNumber ? ` | فاکتور: ${purchase.invoiceNumber}` : '');
    await runAsync(
      `INSERT INTO partner_ledger (partnerId, transactionDate, description, debit, credit, balance, referenceType, referenceId)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [partnerId, purchase.purchaseDate || new Date().toISOString(), desc, 0, totalCost, 'product_purchase', purchase.id]
    );
    touchedPartners.add(partnerId);
  }

  for (const customerId of touchedCustomers) {
    await recalcCustomerBalances(customerId);
  }
  for (const partnerId of touchedPartners) {
    await recalcPartnerBalances(partnerId);
  }


  await runAsync(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, 'done')`, [LEGACY_LEDGER_BACKFILL_KEY]);
};

const PHONE_PURCHASE_LEDGER_COLLAPSE_KEY = 'phone_purchase_ledger_collapse_v1';

const normalizePhonePurchaseLedgers = async (force = false): Promise<void> => {
  const doneRow = await getAsync(`SELECT value FROM settings WHERE key = ?`, [PHONE_PURCHASE_LEDGER_COLLAPSE_KEY]).catch(() => null as any);
  if (!force && String(doneRow?.value || '') === 'done') return;
  if (force && String(doneRow?.value || '') === 'done') {
    const hasDuplicates = await getAsync(
      `SELECT 1
         FROM partner_ledger
        WHERE referenceType IN ('phone_purchase', 'phone_purchase_edit', 'phone_purchase_reversal_on_edit')
        GROUP BY referenceId
       HAVING COUNT(*) > 1
        LIMIT 1`
    ).catch(() => null as any);
    if (!hasDuplicates) return;
  }

  const rows = await allAsync(
    `SELECT *
       FROM partner_ledger
      WHERE referenceType IN ('phone_purchase', 'phone_purchase_edit', 'phone_purchase_reversal_on_edit')
        AND referenceId IS NOT NULL
   ORDER BY referenceId ASC, datetime(COALESCE(updatedAt, createdAt, transactionDate)) ASC, id ASC`,
    []
  ).catch(() => [] as any[]);

  const groups = new Map<number, any[]>();
  for (const row of rows as any[]) {
    const refId = Number(row.referenceId || 0);
    if (!refId) continue;
    const list = groups.get(refId) || [];
    list.push(row);
    groups.set(refId, list);
  }

  const touchedPartners = new Set<number>();

  for (const [phoneId, entries] of groups.entries()) {
    if (!entries.length) continue;
    const phone = await getAsync(
      `SELECT id, model, imei, purchasePrice, currentPurchasePrice, currentPurchasePriceUpdatedAt, purchaseDate, registerDate, supplierId, updatedAt
         FROM phones
        WHERE id = ?`,
      [phoneId]
    ).catch(() => null as any);
    if (!phone) continue;

    const canonical = entries[entries.length - 1];
    const previousPartnerIds = new Set<number>(entries.map((row) => Number(row.partnerId || 0)).filter((value) => Number.isFinite(value) && value > 0));
    const newPartnerId = Number(phone.supplierId || canonical.partnerId || 0);
    const newAmount = Number(phone.purchasePrice || canonical.credit || canonical.debit || 0);
    const newTransactionDate = String(phone.currentPurchasePriceUpdatedAt || phone.updatedAt || phone.registerDate || phone.purchaseDate || canonical.updatedAt || canonical.transactionDate || new Date().toISOString());
    const newDescription = buildPhonePurchaseDescription({ model: phone.model, imei: phone.imei, id: phone.id, purchasePrice: newAmount });
    const historyJson = stringifyLedgerChangeHistory((canonical as any)?.changeHistoryJson, {
      changedAt: new Date().toISOString(),
      reason: 'legacy_phone_purchase_normalization',
      before: entries.map((row) => ({
        id: row.id,
        partnerId: row.partnerId,
        debit: row.debit,
        credit: row.credit,
        transactionDate: row.transactionDate,
        updatedAt: row.updatedAt,
        referenceType: row.referenceType,
        description: row.description,
      })),
      after: {
        partnerId: newPartnerId || null,
        debit: 0,
        credit: newAmount,
        transactionDate: newTransactionDate,
        description: newDescription,
        referenceType: 'phone_purchase',
        referenceId: phoneId,
      },
    });

    await runAsync(
      `UPDATE partner_ledger
          SET partnerId = ?, transactionDate = ?, updatedAt = ?, description = ?, debit = 0, credit = ?, referenceType = 'phone_purchase', referenceId = ?, changeHistoryJson = ?
        WHERE id = ?`,
      [newPartnerId, newTransactionDate, new Date().toISOString(), newDescription, newAmount, phoneId, historyJson, canonical.id]
    );

    if (entries.length > 1) {
      for (const row of entries.slice(0, -1)) {
        await runAsync(`DELETE FROM partner_ledger WHERE id = ?`, [row.id]);
      }
    }

    previousPartnerIds.add(newPartnerId);
    for (const partnerId of previousPartnerIds) {
      if (partnerId > 0) touchedPartners.add(partnerId);
    }
  }

  for (const partnerId of touchedPartners) {
    await recalcPartnerBalances(partnerId);
  }

  await runAsync(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, 'done')`, [PHONE_PURCHASE_LEDGER_COLLAPSE_KEY]);
};

// --- Reports ---
export const getSalesSummaryAndProfit = async (fromDateShamsi: string, toDateShamsi: string): Promise<FrontendSalesSummaryData> => {
  await getDbInstance();
  const fromDateISO = fromShamsiStringToISO(fromDateShamsi);
  const toDateISO = fromShamsiStringToISO(toDateShamsi);
  if (!fromDateISO || !toDateISO) throw new Error('فرمت تاریخ نامعتبر است.');

  // NOTE: سیستم فروش از P0 به بعد «فاکتور» (sales_orders) را به‌عنوان منبع اصلی فروش دارد.
  // برای سازگاری با داده‌های قدیمی، هنوز sales_transactions را هم در گزارش‌ها لحاظ می‌کنیم.

  // 1) درآمد (فاکتورهای جدید + تراکنش‌های قدیمی)
  const ordersAgg = await getAsync(
    `SELECT
        COALESCE(SUM(grandTotal), 0) as totalRevenue,
        COALESCE(COUNT(id), 0) as ordersCount
     FROM sales_orders
     WHERE date(transactionDate) BETWEEN date(?) AND date(?)
       AND (status IS NULL OR status = 'active')`,
    [fromDateISO, toDateISO]
  );

  const legacyAgg = await getAsync(
    `SELECT
        COALESCE(SUM(totalPrice), 0) as totalRevenue,
        COALESCE(COUNT(id), 0) as txCount
     FROM sales_transactions
     WHERE date(transactionDate) BETWEEN date(?) AND date(?)`,
    [fromDateISO, toDateISO]
  );

  const totalRevenue = Number(ordersAgg?.totalRevenue || 0) + Number(legacyAgg?.totalRevenue || 0);
  const totalTransactions = Number(ordersAgg?.ordersCount || 0) + Number(legacyAgg?.txCount || 0);

  // 2) COGS (فاکتورهای جدید + تراکنش‌های قدیمی)
  // حساس: برای گوشی فروخته‌شده، قیمت خرید روز/جایگزینی باید مبنای سود باشد؛ نه قیمت ثبت اولیه.
  // برای کالا نیز اگر ردیف فروش buyPrice ذخیره کرده باشد، همان قیمت لحظه فروش معتبرتر از قیمت فعلی کارت کالا است.
  const ordersCogs = await getAsync(
    `SELECT COALESCE(SUM(
        CASE
          WHEN soi.itemType = 'inventory' THEN COALESCE(NULLIF(soi.buyPrice, 0), p.purchasePrice, 0) * COALESCE(soi.quantity, 0)
          WHEN soi.itemType = 'phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(soi.buyPrice, 0), ph.purchasePrice, 0) * COALESCE(soi.quantity, 0)
          ELSE 0
        END
      ), 0) as cogs
     FROM sales_order_items soi
     JOIN sales_orders so ON so.id = soi.orderId
     LEFT JOIN products p ON soi.itemType = 'inventory' AND soi.itemId = p.id
     LEFT JOIN phones   ph ON soi.itemType = 'phone' AND soi.itemId = ph.id
     WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
       AND (so.status IS NULL OR so.status = 'active')`,
    [fromDateISO, toDateISO]
  );

  const legacyCogs = await getAsync(
    `SELECT COALESCE(SUM(
        CASE
          WHEN st.itemType = 'inventory' THEN COALESCE(p.purchasePrice, 0) * COALESCE(st.quantity, 0)
          WHEN st.itemType = 'phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(st.buyPrice, 0), ph.purchasePrice, 0) * COALESCE(st.quantity, 0)
          ELSE 0
        END
      ), 0) as cogs
     FROM sales_transactions st
     LEFT JOIN products p ON st.itemType = 'inventory' AND st.itemId = p.id
     LEFT JOIN phones   ph ON st.itemType = 'phone' AND st.itemId = ph.id
     WHERE date(st.transactionDate) BETWEEN date(?) AND date(?)`,
    [fromDateISO, toDateISO]
  );

  const totalCostOfGoodsSold = Number(ordersCogs?.cogs || 0) + Number(legacyCogs?.cogs || 0);
  const grossProfit = totalRevenue - totalCostOfGoodsSold;
  const averageSaleValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // 3) Daily sales (order grandTotal + legacy totalPrice)
  // گروه‌بندی باید روی روز انجام شود، نه timestamp کامل؛ وگرنه هدر/نمودار فروش امروز صفر یا چندتکه می‌شود.
  const dailySalesQuery = `
    SELECT saleDate as date, SUM(amount) as totalSales
    FROM (
      SELECT date(transactionDate) as saleDate, grandTotal as amount
      FROM sales_orders
      WHERE date(transactionDate) BETWEEN date(?) AND date(?)
        AND (status IS NULL OR status = 'active')
      UNION ALL
      SELECT date(transactionDate) as saleDate, totalPrice as amount
      FROM sales_transactions
      WHERE date(transactionDate) BETWEEN date(?) AND date(?)
    )
    GROUP BY saleDate
    ORDER BY saleDate ASC
  `;
  const dailySales: DailySalesPoint[] = await allAsync(dailySalesQuery, [fromDateISO, toDateISO, fromDateISO, toDateISO]);

  // 4) Top selling items (by revenue) from unified line items
  // تخفیف کلی فاکتور به نسبت سهم هر ردیف پخش می‌شود تا پرفروش‌ها با مبلغ ناخالص/غلط نمایش داده نشوند.
  const topItemsQuery = `
    WITH invoice_lines AS (
      SELECT
        so.id AS orderId,
        soi.itemId,
        soi.itemType,
        COALESCE(soi.description, p.name, ph.model, '—') AS itemName,
        COALESCE(soi.quantity, 0) AS quantity,
        MAX(0, COALESCE(soi.totalPrice, (COALESCE(soi.quantity, 0) * COALESCE(soi.unitPrice, 0)) - COALESCE(soi.discountPerItem, 0))) AS lineNet,
        COALESCE(so.discount, 0) AS orderDiscount
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.orderId
      LEFT JOIN products p ON soi.itemType = 'inventory' AND soi.itemId = p.id
      LEFT JOIN phones ph ON soi.itemType = 'phone' AND soi.itemId = ph.id
      WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
        AND (so.status IS NULL OR so.status = 'active')
    ),
    order_bases AS (
      SELECT orderId, SUM(lineNet) AS orderBase FROM invoice_lines GROUP BY orderId
    ),
    lines AS (
      SELECT itemId, itemType, itemName, quantity, totalPrice
      FROM sales_transactions
      WHERE date(transactionDate) BETWEEN date(?) AND date(?)
      UNION ALL
      SELECT il.itemId, il.itemType, il.itemName, il.quantity,
             MAX(0, il.lineNet - CASE WHEN COALESCE(ob.orderBase, 0) > 0 THEN il.orderDiscount * (il.lineNet / ob.orderBase) ELSE 0 END) AS totalPrice
      FROM invoice_lines il
      LEFT JOIN order_bases ob ON ob.orderId = il.orderId
    )
    SELECT itemId, itemType, itemName,
           SUM(totalPrice) as totalRevenue,
           SUM(quantity) as quantitySold
    FROM lines
    GROUP BY itemId, itemType, itemName
    ORDER BY totalRevenue DESC
    LIMIT 20
  `;
  const topItemsRaw = await allAsync(topItemsQuery, [fromDateISO, toDateISO, fromDateISO, toDateISO]);
  const topSellingItems: TopSellingItem[] = (topItemsRaw || []).map((item: any) => ({
    id: item.itemId,
    itemType: item.itemType,
    itemName: item.itemName,
    totalRevenue: Number(item.totalRevenue || 0),
    quantitySold: Number(item.quantitySold || 0),
  }));

  return { totalRevenue, grossProfit, totalTransactions, averageSaleValue, dailySales, topSellingItems };
};

export const getDebtorsList = async (): Promise<FrontendDebtorReportItem[]> => {
  await getDbInstance();
  // Source of truth is the ledger movement sum, not the last row's cached balance.
  // This avoids stale balances after legacy imports, manual edits, or failed recalculation jobs.
  const rows = await allAsync(`
    SELECT c.id, c.fullName, c.phoneNumber,
           ROUND(COALESCE(SUM(COALESCE(cl.debit, 0) - COALESCE(cl.credit, 0)), 0), 2) AS balance
      FROM customers c
      LEFT JOIN customer_ledger cl ON cl.customerId = c.id
     GROUP BY c.id, c.fullName, c.phoneNumber
    HAVING balance > 0.00001
     ORDER BY balance DESC, c.fullName ASC
  `);

  return await Promise.all((rows || []).map(async (row: any) => {
    const source = await getLatestCustomerLedgerSourceForReport(Number(row.id || 0));
    return { ...row, ...source };
  }));
};

export const getCreditorsList = async (): Promise<FrontendCreditorReportItem[]> => {
  await getDbInstance();
  // Partner ledger direction: credit increases payable to partner, debit reduces it.
  // Use movement sum for reports so the payable list never shows only the last transaction.
  const rows = await allAsync(`
    SELECT p.id, p.partnerName, p.partnerType,
           ROUND(COALESCE(SUM(COALESCE(pl.credit, 0) - COALESCE(pl.debit, 0)), 0), 2) AS balance
      FROM partners p
      LEFT JOIN partner_ledger pl ON pl.partnerId = p.id
     GROUP BY p.id, p.partnerName, p.partnerType
    HAVING balance > 0.00001
     ORDER BY balance DESC, p.partnerName ASC
  `);

  return await Promise.all((rows || []).map(async (row: any) => {
    const source = await getLatestPartnerLedgerSourceForReport(Number(row.id || 0));
    return { ...row, ...source };
  }));
};

export const getTopCustomersBySales = async (fromDateShamsi: string, toDateShamsi: string): Promise<FrontendTopCustomerReportItem[]> => {
  await getDbInstance();
  const fromDateISO = fromShamsiStringToISO(fromDateShamsi);
  const toDateISO = fromShamsiStringToISO(toDateShamsi);
  if (!fromDateISO || !toDateISO) throw new Error('فرمت تاریخ نامعتبر است.');
  // منبع اصلی: sales_orders (فاکتورها). برای داده‌های قدیمی، sales_transactions هم لحاظ می‌شود.
  const query = `
    SELECT x.customerId, c.fullName,
           SUM(x.amount) as totalSpent,
           COUNT(x.txId) as transactionCount
    FROM (
      SELECT so.customerId as customerId, so.grandTotal as amount, so.id as txId
      FROM sales_orders so
      WHERE so.transactionDate BETWEEN ? AND ?
        AND so.customerId IS NOT NULL
        AND (so.status IS NULL OR so.status = 'active')

      UNION ALL

      SELECT st.customerId as customerId, st.totalPrice as amount, st.id as txId
      FROM sales_transactions st
      WHERE date(st.transactionDate) BETWEEN date(?) AND date(?)
        AND st.customerId IS NOT NULL
    ) x
    JOIN customers c ON c.id = x.customerId
    GROUP BY x.customerId, c.fullName
    ORDER BY totalSpent DESC
    LIMIT 20
  `;
  return await allAsync(query, [fromDateISO, toDateISO, fromDateISO, toDateISO]);
};

export const getTopSuppliersByPurchaseValue = async (fromDateISO: string, toDateISO: string): Promise<FrontendTopSupplierReportItem[]> => {
  await getDbInstance();
  // This query sums purchase prices from 'products' and 'phones' tables based on date_added/purchaseDate.
  // It's a simplified approach. A more accurate way would be to sum actual ledger entries (credits to supplier)
  // for purchases, but that requires ledger entries to consistently reference product/phone IDs.
  // The current ledger entry system for purchases is good, so we can leverage that.
  
  const query = `
    SELECT
        p.id as partnerId,
        p.partnerName,
        SUM(pl.credit) as totalPurchaseValue,
        COUNT(DISTINCT pl.id) as transactionCount -- Count ledger entries representing purchases
    FROM partners p
    JOIN partner_ledger pl ON p.id = pl.partnerId
    WHERE p.partnerType = 'Supplier'
      AND pl.credit > 0 -- Considering credit entries as value received from supplier
      AND pl.referenceType IN ('product_purchase', 'phone_purchase')
      AND DATE(pl.transactionDate) BETWEEN DATE(?) AND DATE(?)
    GROUP BY p.id, p.partnerName
    ORDER BY totalPurchaseValue DESC
    LIMIT 20;
  `;
  return await allAsync(query, [fromDateISO, toDateISO]);
};


export const getPhoneSalesDateBounds = async (): Promise<{ minDate: string | null; maxDate: string | null }> => {
  await getDbInstance();
  const q = `
    SELECT
      MIN(d) as minDate,
      MAX(d) as maxDate
    FROM (
      SELECT so.transactionDate as d
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.orderId
      WHERE soi.itemType = 'phone'
        AND (so.status IS NULL OR so.status = 'active')
      UNION ALL
      SELECT st.transactionDate as d
      FROM sales_transactions st
      WHERE st.itemType = 'phone'
    )
  `;
  const row = await getAsync(q, []);
  return { minDate: row?.minDate ?? null, maxDate: row?.maxDate ?? null };
};

export const getPhoneInstallmentSalesDateBounds = async (): Promise<{ minDate: string | null; maxDate: string | null }> => {
  await getDbInstance();
  const q = `
    SELECT
      MIN(DATE(dateCreated)) as minDate,
      MAX(DATE(dateCreated)) as maxDate
    FROM installment_sales
  `;
  const row = await getAsync(q, []);
  return { minDate: row?.minDate ?? null, maxDate: row?.maxDate ?? null };
};

export const getPhoneSalesReport = async (fromDateISO: string, toDateISO: string): Promise<PhoneSaleProfitReportItem[]> => {
  await getDbInstance();
  // گزارش سود فروش گوشی باید قیمت خرید روز ذخیره‌شده در ردیف فروش را ملاک بگیرد؛
  // fallback فقط برای داده‌های قدیمی است که buyPrice ندارند.
  const query = `
    SELECT
      txId as transactionId,
      transactionDate,
      customerFullName,
      phoneModel,
      imei,
      purchasePrice,
      totalPrice,
      profit
    FROM (
      SELECT
          so.id as txId,
          so.transactionDate,
          c.fullName as customerFullName,
          ph.model as phoneModel,
          ph.imei,
          COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(soi.buyPrice, 0), ph.purchasePrice, 0) as purchasePrice,
          soi.totalPrice as totalPrice,
          (soi.totalPrice - (COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(soi.buyPrice, 0), ph.purchasePrice, 0) * COALESCE(soi.quantity, 1))) as profit
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.orderId
      JOIN phones ph ON soi.itemType = 'phone' AND soi.itemId = ph.id
      LEFT JOIN customers c ON so.customerId = c.id
      WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
        AND (so.status IS NULL OR so.status = 'active')

      UNION ALL

      SELECT
          st.id as txId,
          st.transactionDate,
          c.fullName as customerFullName,
          ph.model as phoneModel,
          ph.imei,
          COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(st.buyPrice, 0), ph.purchasePrice, 0) as purchasePrice,
          st.totalPrice as totalPrice,
          (st.totalPrice - (COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(st.buyPrice, 0), ph.purchasePrice, 0) * COALESCE(st.quantity, 1))) as profit
      FROM sales_transactions st
      JOIN phones ph ON st.itemType = 'phone' AND st.itemId = ph.id
      LEFT JOIN customers c ON st.customerId = c.id
      WHERE date(st.transactionDate) BETWEEN date(?) AND date(?)
    )
    ORDER BY transactionDate DESC
  `;
  return await allAsync(query, [fromDateISO, toDateISO, fromDateISO, toDateISO]);
};

export const getPhoneInstallmentSalesReport = async (fromDateISO: string, toDateISO: string): Promise<PhoneInstallmentSaleProfitReportItem[]> => {
  await getDbInstance();
  // فروش اقساطی جدید از installment_sale_items.buyPrice استفاده می‌کند؛ داده‌های قدیمی از currentPurchasePrice گوشی fallback می‌گیرند.
  const query = `
    SELECT
      saleId,
      dateCreated,
      customerFullName,
      phoneModel,
      imei,
      purchasePrice,
      actualSalePrice,
      totalProfit
    FROM (
      SELECT
        isale.id as saleId,
        isale.dateCreated,
        c.fullName as customerFullName,
        ph.model as phoneModel,
        ph.imei,
        COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(isi.buyPrice, 0), ph.purchasePrice, 0) as purchasePrice,
        COALESCE(isi.totalPrice, isale.actualSalePrice, 0) as actualSalePrice,
        (COALESCE(isi.totalPrice, isale.actualSalePrice, 0) - (COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(isi.buyPrice, 0), ph.purchasePrice, 0) * COALESCE(isi.quantity, 1))) as totalProfit
      FROM installment_sale_items isi
      JOIN installment_sales isale ON isale.id = isi.saleId
      JOIN phones ph ON isi.itemType = 'phone' AND isi.itemId = ph.id
      JOIN customers c ON isale.customerId = c.id
      WHERE DATE(isale.dateCreated) BETWEEN DATE(?) AND DATE(?)

      UNION ALL

      SELECT
        isale.id as saleId,
        isale.dateCreated,
        c.fullName as customerFullName,
        ph.model as phoneModel,
        ph.imei,
        COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) as purchasePrice,
        COALESCE(isale.actualSalePrice, 0) as actualSalePrice,
        (COALESCE(isale.actualSalePrice, 0) - COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0)) as totalProfit
      FROM installment_sales isale
      JOIN phones ph ON isale.phoneId = ph.id
      JOIN customers c ON isale.customerId = c.id
      WHERE DATE(isale.dateCreated) BETWEEN DATE(?) AND DATE(?)
        AND NOT EXISTS (SELECT 1 FROM installment_sale_items isi WHERE isi.saleId = isale.id AND isi.itemType = 'phone')
    )
    ORDER BY dateCreated DESC;
  `;
  return await allAsync(query, [fromDateISO, toDateISO, fromDateISO, toDateISO]);
};
// ---------- Invoice (تک فروش) ----------
export const getInvoiceDataById = async (
  saleId: number
): Promise<FrontendInvoiceData | null> => {
  await getDbInstance();

  const sale = await getAsync(
    `SELECT st.*, c.fullName  as customerFullName,
            c.phoneNumber    as customerPhone,
            c.address        as customerAddress,
            ph.purchasePrice AS phonePurchasePrice,
            ph.currentPurchasePrice AS phoneCurrentPurchasePrice,
            pr.purchasePrice AS productPurchasePrice
       FROM sales_transactions st
       LEFT JOIN customers c ON st.customerId = c.id
       LEFT JOIN phones ph ON st.itemType = 'phone' AND st.itemId = ph.id
       LEFT JOIN products pr ON st.itemType = 'inventory' AND st.itemId = pr.id
      WHERE st.id = ?`,
    [saleId]
  );
  if (!sale) return null;

  /* تنظیمات فروشگاه */
  const settings = await getAllSettingsAsObject();
  const businessDetails = {
    name: settings.store_name || "فروشگاه شما",
    addressLine1: settings.store_address_line1 || "",
    addressLine2: settings.store_address_line2 || "",
    cityStateZip: settings.store_city_state_zip || "",
    phone: settings.store_phone || "",
    email: settings.store_email || "",
    logoUrl: settings.store_logo_path ? `/uploads/${settings.store_logo_path}` : undefined,
  };

  /* مشخصات مشتری */
  const customerDetails = sale.customerId
    ? {
        id: sale.customerId,
        fullName: sale.customerFullName,
        phoneNumber: sale.customerPhone,
        address: sale.customerAddress,
      }
    : null;

  /* قلم فاکتور (totalPrice is net price for the line) */
  const lineItems = [
    {
      id: 1,
      itemType: sale.itemType,
      itemId: sale.itemId,
      description: sale.itemName,
      quantity: sale.quantity,
      unitPrice: sale.pricePerItem,
      totalPrice: sale.totalPrice, // Net price from DB: (qty * price) - discount
      buyPrice: sale.itemType === 'phone'
        ? resolvePhoneCostBasisAmount({ currentPurchasePrice: sale.phoneCurrentPurchasePrice, purchasePrice: sale.phonePurchasePrice }, sale.buyPrice)
        : Number(sale.buyPrice || sale.productPurchasePrice || 0),
      currentPurchasePrice: Number(sale.phoneCurrentPurchasePrice || 0),
      originalPurchasePrice: Number(sale.phonePurchasePrice || sale.productPurchasePrice || 0),
      costBasisSource: (() => {
        const buy = Number(sale.buyPrice || 0);
        const current = Number(sale.phoneCurrentPurchasePrice || 0);
        const original = Number(sale.phonePurchasePrice || sale.productPurchasePrice || 0);
        if (sale.itemType === 'phone' && current > 0) return 'current_purchase_price';
        if (buy > 0) return 'sale_item_buy_price';
        if (sale.itemType === 'phone' && original > 0) return 'original_purchase_price';
        if (sale.itemType === 'inventory' && original > 0) return 'product_purchase_price';
        return '';
      })(),
    },
  ];

  /* محاسبات برای خلاصه فاکتور */
  // Subtotal is the sum of gross prices (before discount)
  const subtotal       = sale.quantity * sale.pricePerItem;
  const discountAmount = sale.discount ?? 0;
  // Grand total is the final net price
  const grandTotal     = subtotal - discountAmount;

  // Sanity check: grandTotal should equal the net price from the database
  if (grandTotal !== sale.totalPrice) {
      console.warn(`Invoice ${sale.id} grandTotal mismatch! Calculated: ${grandTotal}, DB: ${sale.totalPrice}`);
  }


  return {
    businessDetails,
    customerDetails,
    invoiceMetadata: {
      invoiceNumber: String(sale.id),
      transactionDate: moment(sale.transactionDate, "YYYY-MM-DD")
        .locale("fa")
        .format("jYYYY/jMM/jDD"),
    },
    lineItems,
    financialSummary: { subtotal, discountAmount, grandTotal },
    notes: sale.notes,
  };
};


// ---------- Invoice (چند فروش در یک فاکتور) ----------
export const getInvoiceDataForSaleIds = async (
  saleIds: number[]
): Promise<FrontendInvoiceData | null> => {
  await getDbInstance();
  if (saleIds.length === 0) return null;

  const previews = saleIds.map(() => "?").join(",");
  const sales = await allAsync(
    `SELECT st.*, c.fullName  as customerFullName,
            c.phoneNumber    as customerPhone,
            c.address        as customerAddress,
            ph.purchasePrice AS phonePurchasePrice,
            ph.currentPurchasePrice AS phoneCurrentPurchasePrice,
            pr.purchasePrice AS productPurchasePrice
       FROM sales_transactions st
       LEFT JOIN customers c ON st.customerId = c.id
       LEFT JOIN phones ph ON st.itemType = 'phone' AND st.itemId = ph.id
       LEFT JOIN products pr ON st.itemType = 'inventory' AND st.itemId = pr.id
      WHERE st.id IN (${previews})
      ORDER BY st.id ASC`, // Consistent ordering
    saleIds
  );
  if (sales.length === 0) return null;

  /* تنظیمات فروشگاه */
  const settings = await getAllSettingsAsObject();
  const businessDetails = {
    name: settings.store_name || "فروشگاه شما",
    addressLine1: settings.store_address_line1 || "",
    cityStateZip: settings.store_city_state_zip || "",
    phone: settings.store_phone || "",
    email: settings.store_email || "",
    logoUrl: settings.store_logo_path ? `/uploads/${settings.store_logo_path}` : undefined,
  };

  /* مشخصات مشتری (از اولین فروش) */
  const firstSale = sales[0];
  const customerDetails = firstSale.customerId
    ? {
        id: firstSale.customerId,
        fullName: firstSale.customerFullName,
        phoneNumber: firstSale.customerPhone,
        address: firstSale.customerAddress,
      }
    : null;

  /* اقلام فاکتور (totalPrice is net price for the line) */
  const lineItems = sales.map((s, idx) => ({
    id: idx + 1,
    itemType: s.itemType,
    itemId: s.itemId,
    description: s.itemName,
    quantity: s.quantity,
    unitPrice: s.pricePerItem,
    totalPrice: s.totalPrice, // Net price from DB: (qty * price) - discount
    buyPrice: s.itemType === 'phone'
      ? resolvePhoneCostBasisAmount({ currentPurchasePrice: s.phoneCurrentPurchasePrice, purchasePrice: s.phonePurchasePrice }, s.buyPrice)
      : Number(s.buyPrice || s.productPurchasePrice || 0),
    currentPurchasePrice: Number(s.phoneCurrentPurchasePrice || 0),
    originalPurchasePrice: Number(s.phonePurchasePrice || s.productPurchasePrice || 0),
    costBasisSource: (() => {
      const buy = Number(s.buyPrice || 0);
      const current = Number(s.phoneCurrentPurchasePrice || 0);
      const original = Number(s.phonePurchasePrice || s.productPurchasePrice || 0);
      if (s.itemType === 'phone' && current > 0) return 'current_purchase_price';
      if (buy > 0) return 'sale_item_buy_price';
      if (s.itemType === 'phone' && original > 0) return 'original_purchase_price';
      if (s.itemType === 'inventory' && original > 0) return 'product_purchase_price';
      return '';
    })(),
  }));

  /* محاسبات برای خلاصه فاکتور */
  // Subtotal is the sum of gross prices (before discount)
  const subtotal = sales.reduce((sum, s) => sum + s.quantity * s.pricePerItem, 0);
  // Discount is the sum of all individual discounts
  const discountAmount = sales.reduce((sum, s) => sum + (s.discount || 0), 0);
  // Grand total is the final net price
  const grandTotal = subtotal - discountAmount;

  // Sanity check: grandTotal should equal the sum of net prices from the database
  const grandTotalCheck = sales.reduce((sum, s) => sum + s.totalPrice, 0);
  if (Math.abs(grandTotal - grandTotalCheck) > 0.001) { // Use tolerance for float comparison
      console.warn(`Invoice ${saleIds.join(',')} grandTotal mismatch! Calculated: ${grandTotal}, DB Sum: ${grandTotalCheck}`);
  }

  // Use notes from all sales, combined.
  const notes = sales.map(s => s.notes).filter(Boolean).join('\n---\n');

  return {
    businessDetails,
    customerDetails,
    invoiceMetadata: {
      invoiceNumber: saleIds.join(", "), // «مرجع» فاکتور
      transactionDate: moment(firstSale.transactionDate, "YYYY-MM-DD")
        .locale("fa")
        .format("jYYYY/jMM/jDD"),
    },
    lineItems,
    financialSummary: { subtotal, discountAmount, grandTotal },
    notes: notes,
  };
};


export async function createInvoice(invoiceData: any): Promise<number> {
  await getDbInstance(); // اطمینان از اتصال
  const subtotal = invoiceData.lineItems.reduce(
    (sum: number, item: any) => sum + (item.unitPrice || 0) * (item.quantity || 0),
    0
  );
  const discount = invoiceData.financialSummary?.discountAmount || 0;
  const grandTotal = subtotal - discount;

  const result = await runAsync(
    `INSERT INTO invoices 
      (invoiceNumber, customerId, date, subtotal, discountAmount, grandTotal, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      invoiceData.invoiceNumber || `INV-${Date.now()}`, // شماره فاکتور یکتا
      invoiceData.customerId || null,
      invoiceData.date,
      subtotal,
      discount,
      grandTotal,
      invoiceData.notes || '',
    ]
  );

  const invoiceId = result.lastID;

  for (const item of invoiceData.lineItems) {
    await runAsync(
      `INSERT INTO invoice_items 
        (invoiceId, description, quantity, unitPrice, totalPrice, itemType, itemId) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceId,
        item.description,
        item.quantity,
        item.unitPrice,
        (item.unitPrice || 0) * (item.quantity || 0),
        item.itemType || null,
        item.itemId || null
      ]
    );
  }

  return invoiceId;
}

// --- Settings ---
export const getAllSettingsAsObject = async (): Promise<Record<string, string>> => {
  await getDbInstance();
  const settingsArray = await allAsync("SELECT key, value FROM settings");
  return settingsArray.reduce((obj, item) => {
    obj[item.key] = item.value;
    return obj;
  }, {});
};

export const updateMultipleSettings = async (settings: SettingItem[]): Promise<void> => {
  await getDbInstance();
  await execAsync("BEGIN TRANSACTION;");
  try {
    for (const setting of settings) {
      await runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        [setting.key, setting.value]
      );
    }
    await execAsync("COMMIT;");
  } catch (err: any) {
    await execAsync("ROLLBACK;");
    throw new Error(`خطا در عملیاتی پایگاه داده در به‌روزرسانی تنظیمات: ${err.message}`);
  }
};

export const updateSetting = async (key: string, value: string): Promise<void> => {
    await getDbInstance();
    await runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
};

// --- Users and Roles ---
export const getAllRoles = async (): Promise<FrontendRole[]> => {
  await getDbInstance();
  return await allAsync("SELECT * FROM roles ORDER BY name ASC");
};

export const addUserToDb = async (username: string, passwordPlain: string, roleId: number): Promise<Omit<UserForDb, 'passwordHash' | 'roleName'>> => {
  await getDbInstance();
  const existingUser = await getAsync("SELECT id FROM users WHERE username = ?", [username]);
  if (existingUser) throw new Error("نام کاربری قبلا استفاده شده است.");
  
  const passwordHash = await bcryptjs.hash(passwordPlain, 10);
  const result = await runAsync(
    "INSERT INTO users (username, passwordHash, roleId) VALUES (?, ?, ?)",
    [username, passwordHash, roleId]
  );
  return { id: result.lastID, username, roleId, dateAdded: new Date().toISOString() };
};

export const updateUserInDb = async (userId: number, data: UserUpdatePayload): Promise<Omit<UserForDb, 'passwordHash'>> => {
  await getDbInstance();
  const user = await getAsync("SELECT * FROM users WHERE id = ?", [userId]);
  if (!user) throw new Error("کاربر یافت نشد.");
  if (user.username === 'admin' && data.roleId && (await getAsync("SELECT name FROM roles WHERE id = ?", [data.roleId]))?.name !== ADMIN_ROLE_NAME) {
      throw new Error("نقش کاربر مدیر اصلی (admin) قابل تغییر نیست مگر به نقش مدیر دیگری.");
  }

  const fieldsToUpdate: string[] = [];
  const params: any[] = [];

  if (data.roleId !== undefined) {
    fieldsToUpdate.push("roleId = ?");
    params.push(data.roleId);
  }

  if (data.firstName !== undefined) {
    fieldsToUpdate.push("firstName = ?");
    params.push((data.firstName ?? '').toString().trim() || null);
  }

  if (data.lastName !== undefined) {
    fieldsToUpdate.push("lastName = ?");
    params.push((data.lastName ?? '').toString().trim() || null);
  }

  if (fieldsToUpdate.length === 0) {
    const role = await getAsync("SELECT name FROM roles WHERE id = ?", [user.roleId]);
    return { id: user.id, username: user.username, roleId: user.roleId, roleName: role.name, firstName: user.firstName, lastName: user.lastName, dateAdded: user.dateAdded, avatarPath: user.avatarPath, lastLoginAt: user.lastLoginAt };
  }

  params.push(userId);
  await runAsync(`UPDATE users SET ${fieldsToUpdate.join(", ")} WHERE id = ?`, params);
  const updatedUser = await getAsync("SELECT id, username, roleId, firstName, lastName, dateAdded, avatarPath, lastLoginAt FROM users WHERE id = ?", [userId]);
  const role = await getAsync("SELECT name FROM roles WHERE id = ?", [updatedUser.roleId]);
  return { ...updatedUser, roleName: role.name };
};

export const deleteUserFromDb = async (userId: number): Promise<boolean> => {
  await getDbInstance();
  const user = await getAsync("SELECT username FROM users WHERE id = ?", [userId]);
  if (!user) throw new Error("کاربر یافت نشد.");
  if (user.username === 'admin') throw new Error("امکان حذف کاربر مدیر اصلی (admin) وجود ندارد.");
  
  const result = await runAsync("DELETE FROM users WHERE id = ?", [userId]);
  return result.changes > 0;
};

export const getAllUsersWithRoles = async (): Promise<FrontendUserForDisplay[]> => {
  await getDbInstance();
  const usersFromDb = await allAsync(`
    SELECT u.id, u.username, u.roleId, r.name as roleName, u.firstName, u.lastName, u.dateAdded, u.avatarPath, u.lastLoginAt
    FROM users u
    JOIN roles r ON u.roleId = r.id
    ORDER BY u.username ASC
  `);
  return usersFromDb.map(user => ({
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: user.roleName,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      lastLogin: user.lastLoginAt ?? null,
      dateAdded: user.dateAdded,
      avatarUrl: user.avatarPath ? `/uploads/avatars/${user.avatarPath}` : null,
  }));
};

export const findUserByUsername = async (username: string): Promise<UserForDb | null> => {
  await getDbInstance();

  const hasColumn = async (table: string, col: string) => {
    try {
      const rows: any[] = await allAsync(`PRAGMA table_info(${table});`);
      return Array.isArray(rows) && rows.some((r: any) => String(r?.name) === col);
    } catch {
      return false;
    }
  };

  const hasDateAdded = await hasColumn('users', 'dateAdded');
  const hasAvatarPath = await hasColumn('users', 'avatarPath');
  const hasFirstName = await hasColumn('users', 'firstName');
  const hasLastName = await hasColumn('users', 'lastName');
  const hasLastLoginAt = await hasColumn('users', 'lastLoginAt');
  const hasUsername = await hasColumn('users', 'username');
  const hasEmail = await hasColumn('users', 'email');
  const hasPasswordHash = await hasColumn('users', 'passwordHash');
  const hasLegacyPassword = await hasColumn('users', 'password');
  const hasRoleId = await hasColumn('users', 'roleId');
  const hasRole = await hasColumn('users', 'role');

  const selectDateAdded = hasDateAdded ? 'u.dateAdded as dateAdded' : "NULL as dateAdded";
  const selectAvatarPath = hasAvatarPath ? 'u.avatarPath as avatarPath' : "NULL as avatarPath";
  const selectFirstName = hasFirstName ? 'u.firstName as firstName' : "NULL as firstName";
  const selectLastName = hasLastName ? 'u.lastName as lastName' : "NULL as lastName";
  const selectLastLoginAt = hasLastLoginAt ? 'u.lastLoginAt as lastLoginAt' : "NULL as lastLoginAt";
  const selectIdentity = hasUsername
    ? 'u.username as username'
    : hasEmail
      ? 'u.email as username'
      : '"" as username';
  const selectPassword = hasPasswordHash
    ? 'u.passwordHash as passwordHash'
    : hasLegacyPassword
      ? 'u.password as passwordHash'
      : 'NULL as passwordHash';
  const selectRoleId = hasRoleId ? 'u.roleId as roleId' : '1 as roleId';

  const whereClauses: string[] = [];
  const params: any[] = [];
  if (hasUsername) {
    whereClauses.push('u.username = ?');
    params.push(username);
  }
  if (hasEmail) {
    whereClauses.push('u.email = ?');
    params.push(username);
  }
  if (!whereClauses.length) return null;

  try {
    const roleJoin = hasRoleId ? 'LEFT JOIN roles r ON u.roleId = r.id' : '';
    const selectRoleName = hasRoleId ? 'r.name as roleName' : hasRole ? 'u.role as roleName' : '"Admin" as roleName';

    const userRow = await getAsync(
      `SELECT u.id, ${selectIdentity}, ${selectPassword}, ${selectRoleId}, ${selectRoleName}, ${selectFirstName}, ${selectLastName}, ${selectLastLoginAt}, ${selectDateAdded}, ${selectAvatarPath}
       FROM users u
       ${roleJoin}
       WHERE ${whereClauses.join(' OR ')}
       LIMIT 1`,
      params
    );

    if (userRow) {
      return {
        ...userRow,
        roleName: userRow.roleName || 'Admin',
      } as UserForDb;
    }
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (!msg.includes('no such column') && !msg.includes('no such table')) throw e;
  }

  return null;
};

export const changePasswordInDb = async (userId: number, { oldPassword, newPassword }: ChangePasswordPayload): Promise<boolean> => {
    await getDbInstance();
    const user = await getAsync("SELECT passwordHash FROM users WHERE id = ?", [userId]);
    if (!user) throw new Error("کاربر یافت نشد.");

    const isMatch = await bcryptjs.compare(oldPassword, user.passwordHash);
    if (!isMatch) throw new Error("کلمه عبور فعلی نامعتبر است.");

    const newPasswordHash = await bcryptjs.hash(newPassword, 10);
    const result = await runAsync("UPDATE users SET passwordHash = ? WHERE id = ?", [newPasswordHash, userId]);
    return result.changes > 0;
};

export const resetUserPasswordInDb = async (userId: number, newPasswordPlain: string): Promise<boolean> => {
    await getDbInstance();
    const user = await getAsync("SELECT id, username FROM users WHERE id = ?", [userId]);
    if (!user) throw new Error("کاربر برای تغییر رمز عبور یافت نشد.");
   

    const newPasswordHash = await bcryptjs.hash(newPasswordPlain, 10);
    const result = await runAsync("UPDATE users SET passwordHash = ? WHERE id = ?", [newPasswordHash, userId]);
    return result.changes > 0;
};


export const updateAvatarPathInDb = async (userId: number, avatarPath: string): Promise<UserForDb> => {
    await getDbInstance();
    await runAsync("UPDATE users SET avatarPath = ? WHERE id = ?", [avatarPath, userId]);
    const updatedUser = await getAsync("SELECT * FROM users WHERE id = ?", [userId]);
    const role = await getAsync("SELECT name FROM roles WHERE id = ?", [updatedUser.roleId]);
    return { ...updatedUser, roleName: role.name };
};

/// --- Dashboard ---
export interface RepairFinancialSummary {
  count: number;
  revenue: number;
  partsCost: number;
  laborFee: number;
  costs: number;
  profit: number;
}

export const getRepairFinancialSummary = async (fromISO: string, toISO: string): Promise<RepairFinancialSummary> => {
  await getDbInstance();

  const rows = await allAsync(
    `SELECT
        r.id,
        COALESCE(r.finalCost, 0) AS finalCost,
        COALESCE(r.laborFee, 0) AS laborFee,
        COALESCE(SUM(COALESCE(rp.quantityUsed, 0) * COALESCE(p.purchasePrice, 0)), 0) AS partsCost
       FROM repairs r
       LEFT JOIN repair_parts rp ON rp.repairId = r.id
       LEFT JOIN products p ON p.id = rp.productId
      WHERE r.status = 'تحویل داده شده'
        AND date(COALESCE(r.dateCompleted, r.dateReceived)) BETWEEN date(?) AND date(?)
      GROUP BY r.id`,
    [fromISO, toISO]
  );

  let count = 0;
  let revenue = 0;
  let partsCost = 0;
  let laborFee = 0;
  for (const r of (rows || []) as any[]) {
    count += 1;
    revenue += Number(r.finalCost || 0);
    partsCost += Number(r.partsCost || 0);
    laborFee += Number(r.laborFee || 0);
  }
  const costs = partsCost + laborFee;
  const profit = revenue - costs;
  return { count, revenue, partsCost, laborFee, costs, profit };
};

export const getDashboardKPIs = async (): Promise<FrontendDashboardKPIs> => {
  await getDbInstance();

  // تاریخ‌ها با جلالی و مقایسه‌ی ایمن در SQLite
  const todayISO = moment().format('YYYY-MM-DD');
  const firstDayOfMonthISO = moment().startOf('jMonth').format('YYYY-MM-DD');
  const lastDayOfMonthISO  = moment().endOf('jMonth').format('YYYY-MM-DD');

  // فروش ماهانه: تراکنش‌های نقدی + سفارش‌ها
  // برای اطمینان از اینکه گوشی‌های مرجوعی از مبلغ کل کسر می‌شوند، تراکنش‌های مربوط به گوشی‌هایی که وضعیت‌شان
  // دیگر فروخته شده نیست را در محاسبه لحاظ نمی‌کنیم و از مبلغ فاکتورها، مجموع قیمت اقلام بازگشتی را کم می‌کنیم.
  const monthCash = await getAsync(
    `SELECT COALESCE(SUM(st.totalPrice),0) AS total
       FROM sales_transactions st
       LEFT JOIN phones ph ON st.itemType='phone' AND st.itemId=ph.id
      WHERE date(st.transactionDate) BETWEEN date(?) AND date(?)
        AND (st.itemType <> 'phone' OR ph.status IN ('فروخته شده','فروخته شده (قسطی)'))`,
    [firstDayOfMonthISO, lastDayOfMonthISO]
  );
  const monthOrders = await getAsync(
    `SELECT COALESCE(SUM(
              so.grandTotal
              - COALESCE((
                    SELECT SUM(soi.totalPrice)
                      FROM sales_order_items soi
                      JOIN phones p2 ON soi.itemType='phone' AND soi.itemId=p2.id
                     WHERE soi.orderId = so.id AND p2.status NOT IN ('فروخته شده','فروخته شده (قسطی)')
                ), 0)
            ),0) AS total
       FROM sales_orders so
      WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
        AND (so.status IS NULL OR so.status = 'active')`,
    [firstDayOfMonthISO, lastDayOfMonthISO]
  );

  // درآمد فروش نقدی گوشی ماه جاری: فقط فروش‌های نقدی گوشی‌ها
  // معیار: اقلام موبایل با وضعیت «فروخته شده»
  const monthCashOnly = await getAsync(
    `SELECT COALESCE(SUM(st.totalPrice),0) AS total
       FROM sales_transactions st
       LEFT JOIN phones ph ON st.itemType='phone' AND st.itemId=ph.id
      WHERE date(st.transactionDate) BETWEEN date(?) AND date(?)
        AND st.itemType = 'phone' AND ph.status = 'فروخته شده'`,
    [firstDayOfMonthISO, lastDayOfMonthISO]
  );

  const monthOrdersCash = await getAsync(
    `SELECT COALESCE(SUM(soi.totalPrice),0) AS total
       FROM sales_orders so
       JOIN sales_order_items soi ON soi.orderId = so.id
       LEFT JOIN phones p2 ON soi.itemType='phone' AND soi.itemId=p2.id
      WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
        AND (so.status IS NULL OR so.status = 'active')
        AND soi.itemType = 'phone' AND p2.status = 'فروخته شده'`,
    [firstDayOfMonthISO, lastDayOfMonthISO]
  );

  // درآمد فروش اقساطی ماه جاری (جدول installment_sales)
  const monthInstallmentSales = await getAsync(
    `SELECT COALESCE(SUM(actualSalePrice),0) AS total
       FROM installment_sales
      WHERE date(dateCreated) BETWEEN date(?) AND date(?)`,
    [firstDayOfMonthISO, lastDayOfMonthISO]
  );

  // درآمد فروش اقساطی از مسیر «sales_orders» (برای فروش‌های اقساطیِ لوازم/خدمات یا فروش‌های غیر-گوشی)
  // معیار: paymentMethod='installment'
  // و برای اقلام موبایل فقط اگر وضعیت «فروخته شده (قسطی)» باشد.
  const monthOrdersInstallment = await getAsync(
    `SELECT COALESCE(SUM(soi.totalPrice),0) AS total
       FROM sales_orders so
       JOIN sales_order_items soi ON soi.orderId = so.id
       LEFT JOIN phones p2 ON soi.itemType='phone' AND soi.itemId=p2.id
      WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
        AND (so.status IS NULL OR so.status = 'active')
        AND so.paymentMethod = 'installment'
        AND (soi.itemType <> 'phone' OR p2.status = 'فروخته شده (قسطی)')`,
    [firstDayOfMonthISO, lastDayOfMonthISO]
  );

  // فروش امروز: تراکنش‌های نقدی + سفارش‌ها با لحاظ کردن بازگشتی‌ها
  const todayCash = await getAsync(
    `SELECT COALESCE(SUM(st.totalPrice),0) AS total
       FROM sales_transactions st
       LEFT JOIN phones ph ON st.itemType='phone' AND st.itemId=ph.id
      WHERE date(st.transactionDate)=date(?)
        AND (st.itemType <> 'phone' OR ph.status IN ('فروخته شده','فروخته شده (قسطی)'))`,
    [todayISO]
  );
  const todayOrders = await getAsync(
    `SELECT COALESCE(SUM(
              so.grandTotal
              - COALESCE((
                    SELECT SUM(soi.totalPrice)
                      FROM sales_order_items soi
                      JOIN phones p2 ON soi.itemType='phone' AND soi.itemId=p2.id
                     WHERE soi.orderId = so.id AND p2.status NOT IN ('فروخته شده','فروخته شده (قسطی)')
                ), 0)
            ),0) AS total
       FROM sales_orders so
      WHERE date(so.transactionDate)=date(?)
        AND (so.status IS NULL OR so.status = 'active')`,
    [todayISO]
  );

  const monthLegacyInvoices = await getAsync(
    `SELECT COALESCE(SUM(i.grandTotal),0) AS total
       FROM invoices i
      WHERE date(i.date) BETWEEN date(?) AND date(?)
        AND NOT EXISTS (SELECT 1 FROM sales_orders so WHERE so.id = i.id)`,
    [firstDayOfMonthISO, lastDayOfMonthISO]
  );
  const todayLegacyInvoices = await getAsync(
    `SELECT COALESCE(SUM(i.grandTotal),0) AS total
       FROM invoices i
      WHERE date(i.date)=date(?)
        AND NOT EXISTS (SELECT 1 FROM sales_orders so WHERE so.id = i.id)`,
    [todayISO]
  );

  // شمارش‌ها
  const activeProductsCountRes = await getAsync(
    "SELECT COALESCE(COUNT(id),0) AS count FROM products WHERE stock_quantity > 0"
  );
  const activePhonesCountRes = await getAsync(
    // در شمارش گوشی‌های فعال (قابل فروش) وضعیت‌های موجود در انبار و مرجوعی (اقساطی یا نقدی) را لحاظ می‌کنیم
    "SELECT COALESCE(COUNT(id),0) AS count FROM phones WHERE status IN ('موجود در انبار','مرجوعی','مرجوعی اقساطی')"
  );
  const totalCustomersCountRes = await getAsync(
    "SELECT COALESCE(COUNT(id),0) AS count FROM customers"
  );

  // تعمیرات ماه جاری (فروش / هزینه / سود)
  const repairSummaryMonth = await getRepairFinancialSummary(firstDayOfMonthISO, lastDayOfMonthISO);

  // مجموع کل تاریخ (نقد + اقساط + سفارش‌ها)
  const totalCashSalesRes        = await getAsync("SELECT COALESCE(SUM(totalPrice),0) AS total FROM sales_transactions");
  const totalInstallmentSalesRes = await getAsync("SELECT COALESCE(SUM(actualSalePrice),0) AS total FROM installment_sales");
  const totalOrdersRes           = await getAsync("SELECT COALESCE(SUM(grandTotal),0) AS total FROM sales_orders WHERE (status IS NULL OR status = 'active')");
  const totalSalesAllTime =
    (totalCashSalesRes?.total || 0) +
    (totalInstallmentSalesRes?.total || 0) +
    (totalOrdersRes?.total || 0);

  return {
    totalSalesMonth: (monthCash?.total || 0) + (monthOrders?.total || 0) + (monthLegacyInvoices?.total || 0),
    revenueToday: (todayCash?.total || 0) + (todayOrders?.total || 0) + (todayLegacyInvoices?.total || 0),

    // KPIهای اختصاصی داشبورد
    phoneSalesRevenueMonth: (monthCashOnly?.total || 0) + (monthOrdersCash?.total || 0),
    installmentSalesRevenueMonth: (monthInstallmentSales?.total || 0) + (monthOrdersInstallment?.total || 0),
    repairRevenueMonth: repairSummaryMonth.revenue,
    repairCostsMonth: repairSummaryMonth.costs,
    repairProfitMonth: repairSummaryMonth.profit,
    repairCountMonth: repairSummaryMonth.count,

    activeProductsCount: (activeProductsCountRes?.count || 0) + (activePhonesCountRes?.count || 0),
    totalCustomersCount: totalCustomersCountRes?.count || 0,
    totalSalesAllTime,
  };
};

export const getDashboardSalesChartData = async (period: string): Promise<FrontendSalesDataPoint[]> => {
  await getDbInstance();

  // بازه‌ها و فرمت گروه‌بندی
  const now = moment().locale('en');
  let start: moment.Moment;
  let fmt: '%Y-%m-%d' | '%Y-%m';
  let labelFn: (s: string) => string;

  if (period === 'weekly') {
    // برای نمودار هفتگی، ۷ روز اخیر را با فرمت شمسی (روز و ماه) نمایش می‌دهیم.
    // استفاده از فرمت تقویم جلالی به‌جای نام روز هفته باعث می‌شود برچسب‌ها یکتاتر باشند
    // و عدم نمایش داده که از تکرار نام روزها ناشی می‌شود، برطرف گردد.
    start = now.clone().startOf('day').subtract(6, 'days');
    fmt = '%Y-%m-%d';
    labelFn = (iso: string) => {
      // iso ورودی مانند 2025-10-07 را به شمسی تبدیل کرده و به صورت jMM/jDD برمی‌گردانیم
      return moment(iso).locale('fa').format('jMM/jDD');
    };
  } else if (period === 'yearly') {
    start = now.clone().startOf('month').subtract(11, 'months');
    fmt = '%Y-%m';
    labelFn = (ym: string) => moment(ym + '-01').locale('fa').format('jMMMM');
  } else {
    // monthly = 30 روز اخیر مثل fallback
    start = now.clone().startOf('day').subtract(29, 'days');
    fmt = '%Y-%m-%d';
    labelFn = (iso: string) => moment(iso).locale('fa').format('jMM/jDD');
  }

  const startISO = start.format('YYYY-MM-DD');
  const endISO   = now.clone().endOf('day').format('YYYY-MM-DD');

  // تجمیع از هر دو منبع: سفارش‌های جدید + تراکنش‌های قدیمی
  const rows = await allAsync(
    `
    SELECT strftime('${fmt}', t.transactionDate) AS date_group, SUM(t.amount) AS sales
      FROM (
        -- سفارش‌ها: مبلغ نهایی منهای مجموع مبلغ اقلام گوشی‌هایی که مرجوع شده‌اند
        SELECT so.transactionDate AS transactionDate,
               (so.grandTotal
                - COALESCE((
                    SELECT SUM(soi.totalPrice)
                      FROM sales_order_items soi
                      JOIN phones p2 ON soi.itemType='phone' AND soi.itemId=p2.id
                     WHERE soi.orderId = so.id AND p2.status NOT IN ('فروخته شده','فروخته شده (قسطی)')
                   ), 0)
               ) AS amount
          FROM sales_orders so
         WHERE (so.status IS NULL OR so.status = 'active')
        UNION ALL
        -- تراکنش‌های تکی: فقط زمانی محسوب می‌شوند که گوشی همچنان فروخته شده باشد
        SELECT st.transactionDate AS transactionDate,
               st.totalPrice AS amount
          FROM sales_transactions st
          LEFT JOIN phones ph ON st.itemType='phone' AND st.itemId=ph.id
         WHERE (st.itemType <> 'phone' OR ph.status IN ('فروخته شده','فروخته شده (قسطی)'))
      ) t
     WHERE date(t.transactionDate) BETWEEN date(?) AND date(?)
     GROUP BY date_group
     ORDER BY date_group ASC
    `,
    [startISO, endISO]
  );

  // داده‌های موجود را در یک نقشه ذخیره کن تا بتوانیم بازهٔ کامل را پر کنیم
  const dataMap = new Map<string, number>();
  rows.forEach((r: any) => {
    dataMap.set(r.date_group, Number(r.sales) || 0);
  });

  // strftime pattern ها را به فرمت moment معادل تبدیل کن
  const groupFmt = fmt === '%Y-%m-%d' ? 'YYYY-MM-DD' : 'YYYY-MM';
  const result: FrontendSalesDataPoint[] = [];

  // بازهٔ تکرار: اگر بازه سالانه باشد گام ماهیانه می‌شود و در غیر این صورت روزانه
  const stepUnit = period === 'yearly' ? 'month' : 'day';
  let cursor = start.clone();
  // از زمان شروع تا پایان (امروز) پیمایش کن و برای هر بازه مقدار را از dataMap بگیر
  while (cursor.isSameOrBefore(now, stepUnit as any)) {
    const key = cursor.locale('en').format(groupFmt);
    const salesValue = dataMap.get(key) || 0;
    result.push({
      name: labelFn(key),
      sales: salesValue,
    });
    cursor.add(1, stepUnit as any);
  }
  return result;
};



export const getDashboardRecentActivities = async (): Promise<FrontendActivityItem[]> => {
    await getDbInstance();
    const sales = await allAsync(
        `SELECT st.id, st.itemName, st.totalPrice, st.transactionDate, c.fullName as customerName 
         FROM sales_transactions st 
         LEFT JOIN customers c ON st.customerId = c.id
         ORDER BY st.id DESC LIMIT 3`
    );
    const newProducts = await allAsync("SELECT id, name, date_added FROM products ORDER BY id DESC LIMIT 2");
    const newPhones = await allAsync("SELECT id, model, registerDate FROM phones ORDER BY id DESC LIMIT 2");

    const activities: FrontendActivityItem[] = [];
    sales.forEach(s => activities.push({
        id: `sale-${s.id}`,
        typeDescription: "فروش جدید",
        details: `${s.itemName} به ${s.customerName || 'مهمان'} به ارزش ${s.totalPrice.toLocaleString('fa-IR')} تومان`,
        timestamp: moment(s.transactionDate).toISOString(), 
        icon: "fa-solid fa-cash-register",
        color: "bg-green-500",
        link: `/invoices/${s.id}`
    }));
    newProducts.forEach(p => activities.push({
        id: `product-${p.id}`,
        typeDescription: "محصول جدید",
        details: `${p.name} اضافه شد`,
        timestamp: p.date_added,
        icon: "fa-solid fa-box",
        color: "bg-blue-500",
        link: `/products` 
    }));
     newPhones.forEach(ph => activities.push({
        id: `phone-${ph.id}`,
        typeDescription: "گوشی جدید",
        details: `${ph.model} اضافه شد`,
        timestamp: ph.registerDate,
        icon: "fa-solid fa-mobile-screen",
        color: "bg-purple-500",
        link: `/mobile-phones`
    }));

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
};


// ===================== Dashboard Layout (per-user) =====================
type DashboardLayoutsPayload = any;

export const getUserDashboardLayoutFromDb = async (userId: number): Promise<DashboardLayoutsPayload | null> => {
  await getDbInstance();
  const row = await getAsync<{ layoutJson: string }>(
    'SELECT layoutJson FROM user_dashboard_layouts WHERE userId = ?',
    [userId],
  );

  if (!row?.layoutJson) return null;

  try {
    return JSON.parse(row.layoutJson);
  } catch {
    return null;
  }
};

export const upsertUserDashboardLayoutInDb = async (userId: number, layouts: DashboardLayoutsPayload): Promise<void> => {
  await getDbInstance();
  const layoutJson = JSON.stringify(layouts ?? {});
  // Basic safety limit to avoid storing huge payloads
  if (layoutJson.length > 200_000) throw new Error('Layout payload is too large.');

  await runAsync(
    `INSERT INTO user_dashboard_layouts (userId, layoutJson, updatedAt)
     VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'))
     ON CONFLICT(userId) DO UPDATE SET
       layoutJson = excluded.layoutJson,
       updatedAt = strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')`,
    [userId, layoutJson],
  );
};

export const deleteUserDashboardLayoutFromDb = async (userId: number): Promise<void> => {
  await getDbInstance();
  await runAsync('DELETE FROM user_dashboard_layouts WHERE userId = ?', [userId]);
};


// --- Installment Sales ---
export const addInstallmentSaleToDb = async (saleData: InstallmentSalePayload): Promise<any> => {
  await getDbInstance();
  const {
    customerId,
    phoneId,
    actualSalePrice,
    downPayment,
    numberOfInstallments,
    installmentAmount,
    installmentsStartDate,
    saleDate,
    checks = [],
    notes,
  } = saleData as any;

  const saleType: 'installment' | 'check' = (saleData as any).saleType === 'check' ? 'check' : 'installment';

  // اقلام جدید (با سازگاری عقب‌رو)
  const phonesPayload: any[] = Array.isArray((saleData as any).phones) ? (saleData as any).phones : [];
  const accessoryPayload: any[] = Array.isArray((saleData as any).accessories) ? (saleData as any).accessories : [];
  const servicesPayload: any[] = Array.isArray((saleData as any).services) ? (saleData as any).services : [];
  const explicitPhoneIds: number[] = Array.isArray((saleData as any).phoneIds)
    ? (saleData as any).phoneIds
        .map((x: any) => Number(x))
        .filter((n: any) => Number.isInteger(n) && n > 0)
    : [];

  const legacyPhoneId = Number(phoneId);
  const phoneIds: number[] = Array.from(
    new Set<number>(
      [
        ...(Number.isInteger(legacyPhoneId) && legacyPhoneId > 0 ? [legacyPhoneId] : []),
        ...phonesPayload
          .map((p: any) => Number(p.phoneId))
          .filter((n: any) => Number.isInteger(n) && n > 0),
        ...explicitPhoneIds,
      ]
    )
  );

  const hasAnyItems = phoneIds.length > 0 || accessoryPayload.length > 0 || servicesPayload.length > 0;
  if (!hasAnyItems) throw new Error('حداقل یک قلم (موبایل/لوازم/خدمات) برای فروش اقساطی الزامی است.');
  const normalizedActualSalePrice = Number(actualSalePrice);
  const normalizedDownPayment = Number(downPayment || 0);
  if (!Number.isFinite(normalizedActualSalePrice) || normalizedActualSalePrice <= 0) throw new Error('مبلغ کل قرارداد نامعتبر است.');
  if (!Number.isFinite(normalizedDownPayment) || normalizedDownPayment < 0) throw new Error('پیش‌پرداخت نامعتبر است.');
  if (normalizedDownPayment > normalizedActualSalePrice) throw new Error('پیش‌پرداخت نمی‌تواند بیشتر از مبلغ کل قرارداد باشد.');
  if (saleType === 'installment') {
    if (!Number.isInteger(Number(numberOfInstallments)) || Number(numberOfInstallments) <= 0) throw new Error('تعداد اقساط باید عدد صحیح مثبت باشد.');
    if (!Number.isFinite(Number(installmentAmount)) || Number(installmentAmount) <= 0) throw new Error('مبلغ هر قسط باید مثبت باشد.');
  }

  const itemsSummaryParts: string[] = [];

  try {
    await execAsync('BEGIN TRANSACTION;');

    // 1) اعتبارسنجی و آماده‌سازی اقلام
    // Phones
    const parseJalaliDbDate = (rawValue: any, label: string) => {
      const raw = String(rawValue || '').trim();
      const parsed = moment(raw, ['jYYYY/jMM/jDD', 'jYYYY/jM/jD'], true);
      if (!parsed.isValid()) throw new Error(`${label} نامعتبر است.`);
      return parsed;
    };
    const installmentStartMoment = parseJalaliDbDate(installmentsStartDate, 'تاریخ شروع اقساط');
    const saleDateMoment = parseJalaliDbDate(saleDate || installmentsStartDate, 'تاریخ خرید اقساطی');
    const normalizedInstallmentsStartDate = installmentStartMoment.locale('fa').format('jYYYY/jMM/jDD');
    const normalizedSaleDate = saleDateMoment.locale('fa').format('jYYYY/jMM/jDD');
    const saleDateISO = saleDateMoment.locale('en').format('YYYY-MM-DD');
    for (const pid of phoneIds) {
      const ph = await getAsync('SELECT id, model, imei, status, purchasePrice, currentPurchasePrice, salePrice FROM phones WHERE id = ?', [pid]);
      if (!ph) throw new Error('گوشی مورد نظر یافت نشد.');
      if (ph.status !== 'موجود در انبار' && ph.status !== 'مرجوعی' && ph.status !== 'مرجوعی اقساطی') {
        throw new Error('این گوشی قبلاً فروخته شده یا در دسترس نیست.');
      }
      itemsSummaryParts.push(`${ph.model}${ph.imei ? ` (${ph.imei})` : ''}`);
    }

    // Inventory (accessories)
    for (const a of accessoryPayload) {
      const productId = Number(a.productId);
      const qty = Math.max(1, Number(a.qty || a.quantity || 1));
      if (!Number.isFinite(productId)) throw new Error('کالای نامعتبر است.');
      const pr = await getAsync('SELECT id, name, stock_quantity, sellingPrice FROM products WHERE id = ?', [productId]);
      if (!pr) throw new Error('کالای مورد نظر یافت نشد.');
      if (Number(pr.stock_quantity) < qty) throw new Error(`موجودی کالای «${pr.name}» کافی نیست.`);
      itemsSummaryParts.push(`${pr.name} × ${qty}`);
    }

    // Services
    for (const s of servicesPayload) {
      const serviceId = Number(s.serviceId || s.id);
      const qty = Math.max(1, Number(s.qty || s.quantity || 1));
      if (!Number.isFinite(serviceId)) throw new Error('خدمت نامعتبر است.');
      const sv = await getAsync('SELECT id, name, price FROM services WHERE id = ?', [serviceId]);
      if (!sv) throw new Error('خدمت مورد نظر یافت نشد.');
      itemsSummaryParts.push(`${sv.name} × ${qty}`);
    }

    // 2) ایجاد رکورد فروش
    const metaJson = (saleData as any).meta ? JSON.stringify((saleData as any).meta) : ((saleData as any).metaJson ? String((saleData as any).metaJson) : null);
    const itemsSummary = itemsSummaryParts.join('، ');
    const mainPhoneId: number | null = phoneIds.length > 0 ? phoneIds[0] : null;
    const saleResult = await runAsync(
      `INSERT INTO installment_sales
        (customerId, phoneId, actualSalePrice, downPayment, numberOfInstallments, installmentAmount, installmentsStartDate, saleDate, saleType, itemsSummary, metaJson, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        customerId,
        mainPhoneId,
        normalizedActualSalePrice,
        normalizedDownPayment,
        Number(numberOfInstallments) || 0,
        Number(installmentAmount) || 0,
        normalizedInstallmentsStartDate,
        normalizedSaleDate,
        saleType,
        itemsSummary,
        metaJson,
        notes || null,
      ]
    );
    const saleId = saleResult.lastID;

    // 3) اقلام فروش
    // Phones
    for (const pid of phoneIds) {
      const ph = await getAsync('SELECT id, model, imei, purchasePrice, currentPurchasePrice, salePrice FROM phones WHERE id = ?', [pid]);
      const unit = Number(
        phonesPayload.find((x: any) => Number(x.phoneId) === pid)?.sellPrice ??
        ph?.salePrice ??
        0
      );
      const phonePayload = phonesPayload.find((x: any) => Number(x.phoneId) === pid);
      const payloadBuyPrice = Number(phonePayload?.buyPrice || 0);
      const buy = resolvePhoneCostBasisAmount(ph, payloadBuyPrice);
      if (!Number.isFinite(unit) || unit <= 0) throw new Error(`قیمت فروش برای گوشی «${ph?.model || 'موبایل'}» نامعتبر است.`);
      if (!Number.isFinite(buy) || buy < 0) throw new Error(`قیمت خرید برای گوشی «${ph?.model || 'موبایل'}» نامعتبر است.`);
      const desc = `${ph?.model || 'موبایل'}${ph?.imei ? ` (IMEI: ${ph.imei})` : ''}`;
      await runAsync(
        `INSERT INTO installment_sale_items (saleId, itemType, itemId, description, quantity, unitPrice, buyPrice, totalPrice)
         VALUES (?,?,?,?,?,?,?,?)`,
        [saleId, 'phone', pid, desc, 1, unit, buy, unit]
      );
      await runAsync(
        "UPDATE phones SET currentPurchasePrice = ?, currentPurchasePriceUpdatedAt = (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')) WHERE id = ?",
        [buy, pid]
      );
      await syncPhoneCostBasisSnapshots(Number(pid), buy);
    }

    // Inventory
    for (const a of accessoryPayload) {
      const productId = Number(a.productId);
      const qty = Math.max(1, Number(a.qty || a.quantity || 1));
      const pr = await getAsync('SELECT id, name, sellingPrice, purchasePrice FROM products WHERE id = ?', [productId]);
      const unit = Number(a.sellPrice ?? a.unitPrice ?? pr?.sellingPrice ?? 0);
      const buy = Number(a.buyPrice ?? pr?.purchasePrice ?? 0);
      const desc = String(a.name || pr?.name || 'لوازم');
      if (!Number.isFinite(unit) || unit <= 0) throw new Error(`قیمت فروش کالای «${desc}» نامعتبر است.`);
      if (!Number.isFinite(buy) || buy < 0) throw new Error(`قیمت خرید کالای «${desc}» نامعتبر است.`);
      if (!Number.isFinite(unit) || unit <= 0) throw new Error(`قیمت خدمت «${desc}» نامعتبر است.`);
      const total = unit * qty;
      await runAsync(
        `INSERT INTO installment_sale_items (saleId, itemType, itemId, description, quantity, unitPrice, buyPrice, totalPrice)
         VALUES (?,?,?,?,?,?,?,?)`,
        [saleId, 'inventory', productId, desc, qty, unit, buy, total]
      );
      // کاهش موجودی
      await runAsync('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [qty, productId]);
    }

    // Services
    for (const s of servicesPayload) {
      const serviceId = Number(s.serviceId || s.id);
      const qty = Math.max(1, Number(s.qty || s.quantity || 1));
      const sv = await getAsync('SELECT id, name, price FROM services WHERE id = ?', [serviceId]);
      const unit = Number(s.sellPrice ?? s.unitPrice ?? sv?.price ?? 0);
      const desc = String(s.name || sv?.name || 'خدمات');
      const total = unit * qty;
      await runAsync(
        `INSERT INTO installment_sale_items (saleId, itemType, itemId, description, quantity, unitPrice, buyPrice, totalPrice)
         VALUES (?,?,?,?,?,?,?,?)`,
        [saleId, 'service', serviceId, desc, qty, unit, 0, total]
      );
    }

    // 4) ایجاد اقساط
    const nInst = Number(numberOfInstallments) || 0;
    const instAmt = Number(installmentAmount) || 0;
    if (nInst > 0 && instAmt > 0) {
      let currentDueDate = moment(installmentsStartDate, 'jYYYY/jMM/jDD');
      for (let i = 0; i < nInst; i++) {
        await runAsync(
          `INSERT INTO installment_payments (saleId, installmentNumber, dueDate, amountDue) VALUES (?, ?, ?, ?)`,
          [saleId, i + 1, currentDueDate.format('jYYYY/jMM/jDD'), instAmt]
        );
        currentDueDate.add(1, 'jMonth');
      }
    }

    // 5) چک‌ها
    for (const check of checks) {
      await runAsync(
        `INSERT INTO installment_checks (saleId, checkNumber, bankName, dueDate, amount, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [saleId, check.checkNumber, check.bankName, check.dueDate, check.amount, normalizeCheckStatus((check as any).status ?? 'نزد فروشنده')]
      );
    }

    // 6) آپدیت وضعیت گوشی‌ها
    for (const pid of phoneIds) {
      await runAsync("UPDATE phones SET status = 'فروخته شده (قسطی)', saleDate = ? WHERE id = ?", [saleDateISO, pid]);
    }

    await snapshotInstallmentSaleProfitAllocations(Number(saleId));

    // 7) دفتر مشتری
    // در برخی دیتابیس‌های قدیمی، schema دفتر مشتری ممکن است کامل migrate نشده باشد.
    // ثبت فروش نباید به خاطر خطا در عملیاتی ledger متوقف شود.
    try {
      const totalDebt = normalizedActualSalePrice - normalizedDownPayment;
      if (totalDebt > 0) {
        const ledgerDescription = `خرید اقساطی (شناسه فروش: ${saleId})، موارد: ${itemsSummary || '—'}، مبلغ کل: ${normalizedActualSalePrice.toLocaleString('fa-IR')}، پیش پرداخت: ${normalizedDownPayment.toLocaleString('fa-IR')}`;
        await addCustomerLedgerEntryInternal(customerId, ledgerDescription, totalDebt, 0, new Date().toISOString(), { referenceType: 'installment_charge', referenceId: Number(saleId) });
      } else if (normalizedDownPayment > 0 && totalDebt <= 0) {
        const ledgerDescription = `خرید (شناسه فروش اقساطی: ${saleId})، پرداخت کامل`;
        await addCustomerLedgerEntryInternal(customerId, ledgerDescription, normalizedActualSalePrice, normalizedActualSalePrice, new Date().toISOString(), { referenceType: 'installment_charge', referenceId: Number(saleId) });
      }
    } catch (ledgerErr: any) {
      console.warn('Installment sale saved, but customer ledger update failed:', ledgerErr?.message || ledgerErr);
    }

    await execAsync('COMMIT;');
    return await getInstallmentSaleByIdFromDb(saleId);
  } catch (err: any) {
    await execAsync('ROLLBACK;');
    console.error('DB Error (addInstallmentSaleToDb):', err);
    throw err;
  }
};

/**
 * حذف فروش اقساطی از پایگاه داده.
 * این تابع همه اقساط و چک‌های مرتبط با فروش را حذف می‌کند
 * و وضعیت گوشی مرتبط را به «موجود در انبار» برمی‌گرداند و saleDate را خالی می‌کند.
 * @param saleId شناسه فروش اقساطی
 */
export const deleteInstallmentSaleFromDb = async (saleId: number): Promise<void> => {
  await getDbInstance();
  // پیدا کردن رکورد فروش
  const sale = await getAsync('SELECT * FROM installment_sales WHERE id = ?', [saleId]);
  if (!sale) throw new Error('فروش اقساطی یافت نشد.');
  try {
    await execAsync('BEGIN TRANSACTION;');

    // اقلام را بخوان (برای بازگردانی موجودی/وضعیت)
    const items: any[] = await allAsync('SELECT * FROM installment_sale_items WHERE saleId = ?', [saleId]).catch(() => []);
    await updateSaleProfitSnapshotSourceStatus('installment_sale', saleId, 'deleted');
    const phoneIds: number[] = Array.from(
      new Set<number>(
        (items || [])
          .filter((it: any) => it.itemType === 'phone')
          .map((it: any) => Number(it.itemId))
          .filter((n: any) => Number.isInteger(n) && n > 0)
          .concat(Number.isInteger(Number(sale.phoneId)) && Number(sale.phoneId) > 0 ? [Number(sale.phoneId)] : [])
      )
    );

    // بازگردانی لوازم به موجودی
    for (const it of items || []) {
      if (it.itemType === 'inventory') {
        const pid = Number(it.itemId);
        const qty = Math.max(1, Number(it.quantity || 1));
        if (Number.isFinite(pid) && Number.isFinite(qty)) {
          await runAsync('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [qty, pid]);
        }
      }
    }

    // بازگرداندن وضعیت گوشی‌ها (اگر وجود داشته باشند)
    const returnDateShamsi = moment().locale('fa').format('jYYYY/jMM/jDD');
    for (const pid of phoneIds) {
      const phoneRow = await getAsync('SELECT purchaseDate FROM phones WHERE id = ?', [pid]);
      const existingPurchaseDate = phoneRow ? phoneRow.purchaseDate : null;
      await runAsync(
        "UPDATE phones SET status = 'مرجوعی اقساطی', saleDate = NULL, purchaseDate = ?, returnDate = ? WHERE id = ?",
        [existingPurchaseDate, returnDateShamsi, pid]
      );
    }

    // حذف اقساط
    await runAsync('DELETE FROM installment_payments WHERE saleId = ?', [saleId]);
    // حذف چک‌ها
    await runAsync('DELETE FROM installment_checks WHERE saleId = ?', [saleId]);
    // حذف اقلام
    await runAsync('DELETE FROM installment_sale_items WHERE saleId = ?', [saleId]).catch(() => {});
    // حذف خود فروش
    await runAsync('DELETE FROM installment_sales WHERE id = ?', [saleId]);
    await execAsync('COMMIT;');
  } catch (err) {
    await execAsync('ROLLBACK;');
    throw err;
  }
};

export const getAllInstallmentSalesFromDb = async (): Promise<FrontendInstallmentSale[]> => {
  await getDbInstance();

  const salesFromDb = await allAsync(`
    SELECT 
        isale.*, 
        c.fullName as customerFullName, 
        p.model as phoneModel, 
        p.imei as phoneImei,
        p.purchaseDate as phonePurchaseDate,
        p.registerDate as phoneRegisterDate,
        p.saleDate as phoneSaleDate,
        isale.actualSalePrice as totalInstallmentPrice
    FROM installment_sales isale
    JOIN customers c ON isale.customerId = c.id
    LEFT JOIN phones p ON isale.phoneId = p.id
    ORDER BY isale.dateCreated DESC
  `);

  const sales: FrontendInstallmentSale[] = [];

  for (const saleDb of salesFromDb) {
    const isCheckSale =
      saleDb.saleType === 'check' || Number(saleDb.numberOfInstallments || 0) === 0;

    let remainingAmount =
      Number(saleDb.totalInstallmentPrice || 0) - Number(saleDb.downPayment || 0);

    let nextDueDate: string | null = null;
    let overallStatus: FrontendInstallmentSale['overallStatus'] = 'در حال پرداخت';

    if (isCheckSale) {
      const checksRaw = await allAsync(
        'SELECT * FROM installment_checks WHERE saleId = ? ORDER BY dueDate ASC',
        [saleDb.id]
      );
      const checks = (checksRaw || []).map((c: any) => ({ ...c, status: normalizeCheckStatus(c.status) }));

      const paidByChecks = checks
        .filter((c: any) => c.status === 'نقد شد')
        .reduce((s: number, c: any) => s + Number(c.amount || 0), 0);

      remainingAmount = Math.max(0, remainingAmount - paidByChecks);

      const unsettled = checks.filter(
        (c: any) => c.status !== 'نقد شد' && c.status !== 'به مشتری برگشت داده شده'
      );

      nextDueDate = unsettled[0]?.dueDate ?? null;

      const hasBounced = checks.some((c: any) => c.status === 'برگشت خورد');
      const hasOverdue = unsettled.some((c: any) => {
        try {
          return moment(c.dueDate, 'jYYYY/jMM/jDD').isBefore(moment(), 'day');
        } catch {
          return false;
        }
      });

      overallStatus =
        remainingAmount === 0
          ? 'تکمیل شده'
          : hasBounced || hasOverdue
          ? 'معوق'
          : 'در حال پرداخت';
    } else {
      const payments = await allAsync(
        'SELECT * FROM installment_payments WHERE saleId = ? ORDER BY installmentNumber ASC',
        [saleDb.id]
      );

      let allPaid = payments.length > 0;
      let hasOverdue = false;

      for (const payment of payments) {
        if (payment.status !== 'پرداخت شده') {
          allPaid = false;
          if (!nextDueDate) nextDueDate = payment.dueDate;

          try {
            if (moment(payment.dueDate, 'jYYYY/jMM/jDD').isBefore(moment(), 'day')) {
              hasOverdue = true;
            }
          } catch {}
        }

        const sumResult = await getAsync(
          `SELECT SUM(amount_paid) as totalPaid FROM installment_transactions WHERE installment_payment_id = ?`,
          [payment.id]
        );
        const totalPaidForInstallment = sumResult.totalPaid || 0;
        remainingAmount -= totalPaidForInstallment;
      }

      remainingAmount = Math.max(0, remainingAmount);

      if (allPaid) overallStatus = 'تکمیل شده';
      else if (hasOverdue) overallStatus = 'معوق';
    }

    sales.push({
      ...saleDb,
      payments: [],
      checks: [],
      remainingAmount,
      nextDueDate,
      overallStatus,
    });
  }

  return sales;
};

// ===================== Installments DB section (FINAL) =====================

// مهم: moment از قبل در فایل شما استفاده شده. اگر import ندارید اضافه کنید:
// import moment from 'jalali-moment';

type OverallStatus = FrontendInstallmentSale["overallStatus"]; // همان تایپ شما

export const getInstallmentSaleByIdFromDb = async (
  saleId: number
): Promise<FrontendInstallmentSale | null> => {
  await getDbInstance();

  const saleDb = await getAsync(
    `
    SELECT 
        isale.*, 
        c.fullName as customerFullName, 
        p.model as phoneModel, 
        p.imei as phoneImei,
        p.purchaseDate as phonePurchaseDate,
        p.registerDate as phoneRegisterDate,
        p.saleDate as phoneSaleDate,
        isale.actualSalePrice as totalInstallmentPrice
    FROM installment_sales isale
    JOIN customers c ON isale.customerId = c.id
    LEFT JOIN phones p ON isale.phoneId = p.id
    WHERE isale.id = ?
  `,
    [saleId]
  );

  if (!saleDb) return null;

  // اقساط و چک‌ها
  const payments: any[] = await allAsync(
    "SELECT * FROM installment_payments WHERE saleId = ? ORDER BY installmentNumber ASC",
    [saleDb.id]
  );
  const checksRaw: any[] = await allAsync(
    "SELECT * FROM installment_checks WHERE saleId = ? ORDER BY dueDate ASC",
    [saleDb.id]
  );
  const checks = (checksRaw || []).map((c: any) => ({ ...c, status: normalizeCheckStatus(c.status) }));

  // اقلام (گوشی/لوازم/خدمات) - برای نمایش در جزئیات
  const items: any[] = await allAsync(
    `SELECT isi.itemType, isi.itemId, isi.description, isi.quantity, isi.unitPrice, isi.buyPrice, isi.totalPrice,
            ph.currentPurchasePrice AS phoneCurrentPurchasePrice,
            ph.purchasePrice AS phonePurchasePrice,
            CASE
              WHEN isi.itemType = 'phone' AND COALESCE(NULLIF(ph.currentPurchasePrice, 0), 0) > 0 THEN 'currentPurchasePrice'
              WHEN COALESCE(NULLIF(isi.buyPrice, 0), 0) > 0 THEN 'documentBuyPrice'
              WHEN isi.itemType = 'phone' AND COALESCE(NULLIF(ph.purchasePrice, 0), 0) > 0 THEN 'purchasePrice'
              ELSE 'unknown'
            END AS costBasisSource
       FROM installment_sale_items isi
       LEFT JOIN phones ph ON isi.itemType = 'phone' AND ph.id = isi.itemId
      WHERE isi.saleId = ?
      ORDER BY isi.id ASC`,
    [saleDb.id]
  ).catch(() => []);

  // ماندهٔ پایه = مجموع اقساط (بدون پیش‌پرداخت)
  let remainingAmount =
    Number(saleDb.totalInstallmentPrice || 0) - Number(saleDb.downPayment || 0);

  // برای تعیین وضعیت کلی
  let nextDueDate: string | null = null;
  let overallStatus: OverallStatus = "در حال پرداخت";
  let allPaid = payments.length > 0;
  let hasOverdue = false;

  // مجموع پرداختی واقعی (تراکنش‌ها) روی کل اقساط
  let totalPaidAcrossInstallments = 0;

  // تراکنش‌های هر قسط + محاسبات
  for (const p of payments) {
    // خواندن تراکنش‌های این قسط
    let txs: any[] = [];
    try {
      txs = await allAsync(
        `SELECT id, installment_payment_id, amount_paid, payment_date, notes
         FROM installment_transactions
         WHERE installment_payment_id = ?
         ORDER BY payment_date ASC, id ASC`,
        [p.id]
      );
    } catch (_e) {
      // اگر جدول وجود نداشت یا خطا در عملیاتیی شد، نگذاریم کل تابع خطا در عملیات بدهد
      txs = [];
    }

    // اتصال تاریخچه به آبجکت قسط برای نمایش در UI
    (p as any).transactions = txs;

    // جمع پرداختی همین قسط
    const paidForInstallment = txs.reduce(
      (s: number, t: any) => s + Number(t.amount_paid || 0),
      0
    );

    // فیلدهای کمکی برای UI
    (p as any).computedPaid = paidForInstallment;
    (p as any).computedRemaining = Math.max(
      0,
      Number(p.amountDue || 0) - paidForInstallment
    );

    // اثر در ماندهٔ کل
    totalPaidAcrossInstallments += paidForInstallment;
  }

  // اتصال تراکنش‌های وصول نقدی چک به خود کارت چک برای UI و محاسبات شفاف
  const checkRecoveryByCheckId = new Map<number, { paid: number; remaining: number; paymentId: number; transactions: any[] }>();
  for (const p of payments) {
    if ((p as any).sourceType !== 'check_recovery' || !(p as any).sourceId) continue;
    const paid = Number((p as any).computedPaid || 0);
    checkRecoveryByCheckId.set(Number((p as any).sourceId), {
      paid,
      remaining: Math.max(0, Number((p as any).amountDue || 0) - paid),
      paymentId: Number((p as any).id),
      transactions: ((p as any).transactions || []),
    });
  }
  for (const c of checks) {
    const recovery = checkRecoveryByCheckId.get(Number((c as any).id));
    (c as any).cashPaid = recovery?.paid || 0;
    (c as any).cashRemaining = Math.max(0, Number((c as any).amount || 0) - Number((c as any).cashPaid || 0));
    (c as any).cashPaymentId = recovery?.paymentId || null;
    (c as any).cashTransactions = recovery?.transactions || [];
  }

  // کم کردن پرداخت‌های واقعی از ماندهٔ پایه
  remainingAmount = Math.max(0, remainingAmount - totalPaidAcrossInstallments);

  // تعیین وضعیت کلی و سررسید بعدی بر اساس «تسویه واقعی» هر قسط
  for (const p of payments) {
    const fullyPaid =
      Number((p as any).computedPaid || 0) >= Number(p.amountDue || 0);

    if (!fullyPaid) {
      allPaid = false;

      if (!nextDueDate) nextDueDate = p.dueDate;

      try {
        if (moment(p.dueDate, "jYYYY/jMM/jDD").isBefore(moment(), "day")) {
          hasOverdue = true;
        }
      } catch {
        // اگر فرمت تاریخ بد بود، نادیده بگیر
      }
    }
  }

  if (allPaid) overallStatus = "تکمیل شده";
  else if (hasOverdue) overallStatus = "معوق";


  const isCheckSale =
    saleDb.saleType === 'check' || Number(saleDb.numberOfInstallments || 0) === 0;

  if (isCheckSale) {
    const paidByChecks = checks
      .filter((c: any) => c.status === 'نقد شد')
      .reduce((s: number, c: any) => s + Number(c.amount || 0), 0);

    remainingAmount = Math.max(0, remainingAmount - paidByChecks);

    const unsettled = checks.filter(
      (c: any) => c.status !== 'نقد شد' && Number((c as any).cashRemaining ?? c.amount ?? 0) > 0
    );

    nextDueDate = unsettled[0]?.dueDate ?? null;

    const hasBounced = checks.some((c: any) => c.status === 'برگشت خورد');
    const hasOverdueChecks = unsettled.some((c: any) => {
      try {
        return moment(c.dueDate, 'jYYYY/jMM/jDD').isBefore(moment(), 'day');
      } catch {
        return false;
      }
    });

    overallStatus =
      remainingAmount === 0
        ? 'تکمیل شده'
        : hasBounced || hasOverdueChecks
        ? 'معوق'
        : 'در حال پرداخت';
  }


  return {
    ...saleDb,
    items,
    payments, // حاوی transactions/computedPaid/computedRemaining
    checks,
    remainingAmount,
    nextDueDate,
    overallStatus,
  };
};

export const updateInstallmentPaymentStatusInDb = async (
  paymentId: number,
  paid: boolean,
  paymentDateShamsi?: string
): Promise<boolean> => {
  await getDbInstance();
  const status = paid ? "پرداخت شده" : "پرداخت نشده";
  const paymentDate = paid && paymentDateShamsi ? paymentDateShamsi : null;

  const result = await runAsync(
    "UPDATE installment_payments SET status = ?, paymentDate = ? WHERE id = ?",
    [status, paymentDate, paymentId]
  );
  return result.changes > 0;
};

export const updateCheckStatusInDb = async (
  checkId: number,
  status: CheckStatus
): Promise<boolean> => {
  await getDbInstance();
  const result = await runAsync(
    "UPDATE installment_checks SET status = ? WHERE id = ?",
    [status, checkId]
  );
  return result.changes > 0;
};

export const addCheckRecoveryPaymentToDb = async (checkId: number, amount: number, isoDate: string, notes?: string) => {
  await execAsync("BEGIN TRANSACTION;");
  try {
    const check = await getAsync(
      `SELECT ic.*, isale.customerId, isale.id as saleId
         FROM installment_checks ic
         JOIN installment_sales isale ON isale.id = ic.saleId
        WHERE ic.id = ?`,
      [checkId]
    );
    if (!check) throw new Error('چک مورد نظر برای ثبت دریافت نقدی یافت نشد.');

    const normalizedStatus = normalizeCheckStatus(check.status);
    if (!['برگشت خورد', 'به مشتری برگشت داده شده'].includes(normalizedStatus)) {
      throw new Error('دریافت نقدی فقط برای چک برگشت‌خورده یا چک برگشت‌داده‌شده به مشتری فعال است.');
    }

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      throw new Error('مبلغ دریافت نقدی باید عدد مثبت باشد.');
    }

    let payment = await getAsync(
      `SELECT * FROM installment_payments WHERE saleId = ? AND sourceType = 'check_recovery' AND sourceId = ? LIMIT 1`,
      [check.saleId, checkId]
    );

    if (!payment) {
      const countRow = await getAsync(`SELECT COALESCE(MAX(installmentNumber), 0) as maxNo FROM installment_payments WHERE saleId = ?`, [check.saleId]);
      const installmentNumber = Number(countRow?.maxNo || 0) + 1;
      const result = await runAsync(
        `INSERT INTO installment_payments (saleId, installmentNumber, dueDate, amountDue, paymentDate, status, sourceType, sourceId)
         VALUES (?, ?, ?, ?, NULL, 'پرداخت نشده', 'check_recovery', ?)`,
        [check.saleId, installmentNumber, check.dueDate, Number(check.amount || 0), checkId]
      );
      payment = await getAsync(`SELECT * FROM installment_payments WHERE id = ?`, [result.lastID]);
    }

    await assertInstallmentPaymentAmountIsValid(Number(payment.id), normalizedAmount);

    const txNotes = String(notes || '').trim() || `دریافت نقدی بابت چک شماره ${check.checkNumber}`;
    const result = await runAsync(
      `INSERT INTO installment_transactions (installment_payment_id, amount_paid, payment_date, notes) VALUES (?, ?, ?, ?)`,
      [payment.id, normalizedAmount, isoDate, txNotes]
    );

    const sumResult = await getAsync(
      `SELECT COALESCE(SUM(amount_paid), 0) as totalPaid FROM installment_transactions WHERE installment_payment_id = ?`,
      [payment.id]
    );
    const totalPaid = Number(sumResult?.totalPaid || 0);
    const amountDue = Number(payment.amountDue || check.amount || 0);
    const newStatus: InstallmentPaymentStatus = totalPaid >= amountDue ? 'پرداخت شده' : totalPaid > 0 ? 'پرداخت جزئی' : 'پرداخت نشده';
    const dateToUpdate = newStatus === 'پرداخت شده' || newStatus === 'پرداخت جزئی' ? isoDate : null;

    await runAsync(
      `UPDATE installment_payments SET status = ?, paymentDate = ? WHERE id = ?`,
      [newStatus, dateToUpdate, payment.id]
    );

    const insertedTx = await getAsync("SELECT * FROM installment_transactions WHERE id = ?", [result.lastID]);
    await syncInstallmentTransactionCustomerLedger(Number(result.lastID), Number(payment.id), normalizedAmount, isoDate, txNotes);

    await execAsync("COMMIT;");
    return { transaction: insertedTx, paymentId: Number(payment.id), status: newStatus };
  } catch (error) {
    await execAsync("ROLLBACK;");
    throw error;
  }
};

export const getInstallmentPaymentDetailsForSms = async (
  paymentId: number
): Promise<any> => {
  await getDbInstance();
  // تاریخ‌ها در DB شمسی ذخیره شده‌اند؛ همان را می‌خوانیم.
  const query = `
        SELECT
            ip.id as paymentId,
            ip.dueDate,
            ip.amountDue,
            isale.id as saleId,
            isale.customerId as customerId,
            c.fullName as customerFullName,
            c.phoneNumber as customerPhoneNumber
        FROM installment_payments ip
        JOIN installment_sales isale ON ip.saleId = isale.id
        JOIN customers c ON isale.customerId = c.id
        WHERE ip.id = ?
    `;
  return await getAsync(query, [paymentId]);
};

/**
 * Fetch high-level information about an installment sale for sending a "fully settled" SMS.
 * Tokens typically include (customer name, saleId, total price).
 */
export const getInstallmentSaleDetailsForSms = async (saleId: number): Promise<any> => {
  await getDbInstance();
  const query = `
        SELECT
            isale.id as saleId,
            isale.actualSalePrice as totalPrice,
            c.fullName as customerFullName,
            c.phoneNumber as customerPhoneNumber
        FROM installment_sales isale
        JOIN customers c ON isale.customerId = c.id
        WHERE isale.id = ?
    `;
  return await getAsync(query, [saleId]);
};

/**
 * Fetch detailed information about a single installment check for sending SMS.
 * Returns the check number, due date, amount, and the customer's name and phone number.
 * This helper is analogous to getInstallmentPaymentDetailsForSms but for checks.
 *
 * @param checkId The primary key of the check in the installment_checks table
 */
export const getInstallmentCheckDetailsForSms = async (
  checkId: number
): Promise<any> => {
  await getDbInstance();
  const query = `
        SELECT
            ic.id as checkId,
            ic.checkNumber,
            ic.dueDate,
            ic.amount,
            c.fullName as customerFullName,
            c.phoneNumber as customerPhoneNumber
        FROM installment_checks ic
        JOIN installment_sales isale ON ic.saleId = isale.id
        JOIN customers c ON isale.customerId = c.id
        WHERE ic.id = ?
    `;
  return await getAsync(query, [checkId]);
};
// ===================== /Installments DB section =====================

// --- Smart Analysis (SQL-based) ---
export const getProfitabilityReportFromDb = async (): Promise<ProfitabilityAnalysisItem[]> => {
    await getDbInstance();
    const query = `
        WITH lines AS (
            -- Legacy lines
            SELECT itemId, itemType, itemName, quantity, totalPrice, COALESCE(buyPrice, 0) as buyPrice
            FROM sales_transactions

            UNION ALL

            -- New invoice lines (net line total after per-item discount)
            SELECT
              soi.itemId,
              soi.itemType,
              soi.description as itemName,
              soi.quantity,
              ((COALESCE(soi.quantity, 0) * COALESCE(soi.unitPrice, 0)) - COALESCE(soi.discountPerItem, 0)) as totalPrice,
              COALESCE(soi.buyPrice, 0) as buyPrice
            FROM sales_order_items soi
            JOIN sales_orders so ON so.id = soi.orderId
            WHERE (so.status IS NULL OR so.status = 'active')

            UNION ALL

            -- Installment sale items (accessories/services/phones sold on installment)
            SELECT isi.itemId, isi.itemType, isi.description as itemName, isi.quantity, isi.totalPrice, COALESCE(isi.buyPrice, 0) as buyPrice
            FROM installment_sale_items isi
            JOIN installment_sales ins ON ins.id = isi.saleId
        )
        SELECT
            l.itemId,
            l.itemType,
            l.itemName,
            SUM(l.quantity) as totalQuantitySold,
            SUM(l.totalPrice) as totalRevenue,
            SUM(
                CASE
                    WHEN l.itemType = 'inventory' THEN COALESCE(NULLIF(l.buyPrice, 0), p.purchasePrice, 0) * l.quantity
                    WHEN l.itemType = 'phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(l.buyPrice, 0), ph.purchasePrice, 0) * l.quantity
                    ELSE 0
                END
            ) as totalCost,
            (SUM(l.totalPrice) - SUM(
                CASE
                    WHEN l.itemType = 'inventory' THEN COALESCE(NULLIF(l.buyPrice, 0), p.purchasePrice, 0) * l.quantity
                    WHEN l.itemType = 'phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(l.buyPrice, 0), ph.purchasePrice, 0) * l.quantity
                    ELSE 0
                END
            )) as grossProfit,
            CASE
                WHEN SUM(l.totalPrice) = 0 THEN 0
                ELSE ((SUM(l.totalPrice) - SUM(
                    CASE
                        WHEN l.itemType = 'inventory' THEN COALESCE(NULLIF(l.buyPrice, 0), p.purchasePrice, 0) * l.quantity
                        WHEN l.itemType = 'phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(l.buyPrice, 0), ph.purchasePrice, 0) * l.quantity
                        ELSE 0
                    END
                )) * 100.0 / SUM(l.totalPrice))
            END as profitMargin
        FROM lines l
        LEFT JOIN products p ON l.itemType = 'inventory' AND l.itemId = p.id
        LEFT JOIN phones ph ON l.itemType = 'phone' AND l.itemId = ph.id
        GROUP BY l.itemId, l.itemType, l.itemName
        ORDER BY grossProfit DESC;
    `;
    const result: ProfitabilityAnalysisItem[] = await allAsync(query);
    return result.map(item => ({
        ...item,
        profitMargin: parseFloat(Number(item.profitMargin).toFixed(2))
    }));
};

export const getInventoryVelocityReportFromDb = async (): Promise<VelocityItem[]> => {
    await getDbInstance();
    const query = `
        WITH lines AS (
            SELECT itemId, itemType, quantity
            FROM sales_transactions
            WHERE itemType IN ('inventory','phone')
            UNION ALL
            SELECT soi.itemId, soi.itemType, soi.quantity
            FROM sales_order_items soi
            JOIN sales_orders so ON so.id = soi.orderId
            WHERE (so.status IS NULL OR so.status = 'active')
              AND soi.itemType IN ('inventory','phone')
        ),
        ItemSales AS (
            SELECT
                itemId,
                itemType,
                SUM(quantity) as totalQuantitySold
            FROM lines
            GROUP BY itemId, itemType
        ),
        AllItems AS (
            SELECT
                id as itemId,
                'inventory' as itemType,
                name as itemName,
                date_added as registrationDate
            FROM products
            UNION ALL
            SELECT
                id as itemId,
                'phone' as itemType,
                model || ' (IMEI: ' || imei || ')' as itemName,
                registerDate as registrationDate
            FROM phones
        )
        SELECT
            ai.itemId,
            ai.itemType,
            ai.itemName,
            (COALESCE(s.totalQuantitySold, 0) * 1.0 / (MAX(1, (julianday('now') - julianday(ai.registrationDate))))) as salesPerDay,
            CASE
                WHEN (COALESCE(s.totalQuantitySold, 0) * 1.0 / (MAX(1, (julianday('now') - julianday(ai.registrationDate))))) > 0.5 THEN 'پرفروش (داغ)'
                WHEN (COALESCE(s.totalQuantitySold, 0) > 0) OR ((julianday('now') - julianday(ai.registrationDate)) <= 60) THEN 'عادی'
                ELSE 'کم‌فروش (راکد)'
            END as classification
        FROM AllItems ai
        LEFT JOIN ItemSales s ON ai.itemId = s.itemId AND ai.itemType = s.itemType
        ORDER BY salesPerDay DESC;
    `;
    return await allAsync(query);
};

export const getPurchaseSuggestionsReportFromDb = async (): Promise<Omit<PurchaseSuggestionItem, 'suggestedPurchaseQuantity'>[]> => {
    await getDbInstance();
    const query = `
        WITH ItemVelocity AS (
            SELECT * FROM (
              SELECT
                  ai.itemId,
                  ai.itemType,
                  (COALESCE(s.totalQuantitySold, 0) * 1.0 / (MAX(1, (julianday('now') - julianday(ai.registrationDate))))) as salesPerDay
              FROM (
                SELECT id as itemId, 'inventory' as itemType, date_added as registrationDate FROM products
                UNION ALL
                SELECT id as itemId, 'phone' as itemType, registerDate as registrationDate FROM phones
              ) ai
              LEFT JOIN (
                WITH lines AS (
                    SELECT itemId, itemType, quantity
                    FROM sales_transactions
                    WHERE itemType IN ('inventory','phone')
                    UNION ALL
                    SELECT soi.itemId, soi.itemType, soi.quantity
                    FROM sales_order_items soi
                    JOIN sales_orders so ON so.id = soi.orderId
                    WHERE (so.status IS NULL OR so.status = 'active')
                      AND soi.itemType IN ('inventory','phone')
                )
                SELECT itemId, itemType, SUM(quantity) as totalQuantitySold
                FROM lines
                GROUP BY itemId, itemType
              ) s ON ai.itemId = s.itemId AND ai.itemType = s.itemType
            ) WHERE salesPerDay > 0
        ),
        StockLevels AS (
            -- IMPORTANT: include items with صفر موجودی as well.
            -- Otherwise the suggestions list becomes empty exactly when it's most needed.
            SELECT id as itemId, 'inventory' as itemType, name as itemName, COALESCE(stock_quantity, 0) as currentStock FROM products
            UNION ALL
            SELECT id as itemId, 'phone' as itemType, model || ' (IMEI: ' || imei || ')' as itemName, 1 as currentStock FROM phones WHERE status = 'موجود در انبار'
        )
        SELECT
            sl.itemId,
            iv.itemType,
            sl.itemName,
            sl.currentStock,
            iv.salesPerDay,
            (sl.currentStock / iv.salesPerDay) as daysOfStockLeft
        FROM StockLevels sl
        JOIN ItemVelocity iv ON sl.itemId = iv.itemId AND sl.itemType = iv.itemType
        WHERE (sl.currentStock / iv.salesPerDay) < 30 -- Reorder threshold: 30 days
        ORDER BY daysOfStockLeft ASC;
    `;
    return await allAsync(query);
};


// --- Repair Center ---
export const createRepairInDb = async (data: NewRepairData): Promise<any> => {
  await getDbInstance();
  const { customerId, deviceModel, deviceColor, serialNumber, problemDescription, estimatedCost } = data;
  const result = await runAsync(
    `INSERT INTO repairs (customerId, deviceModel, deviceColor, serialNumber, problemDescription, estimatedCost, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [customerId, deviceModel, deviceColor || null, serialNumber || null, problemDescription, estimatedCost || null, 'پذیرش شده']
  );
  return await getRepairByIdFromDb(result.lastID);
};

export const getAllRepairsFromDb = async (statusFilter?: string): Promise<FrontendRepair[]> => {
  await getDbInstance();
  let sql = `
    SELECT r.*, c.fullName as customerFullName, t.partnerName as technicianName
    FROM repairs r
    JOIN customers c ON r.customerId = c.id
    LEFT JOIN partners t ON r.technicianId = t.id
  `;
  const params = [];
  if (statusFilter) {
    sql += ' WHERE r.status = ?';
    params.push(statusFilter);
  }
  sql += ' ORDER BY r.dateReceived DESC';
  return await allAsync(sql, params);
};

export const getRepairByIdFromDb = async (repairId: number): Promise<any> => {
    await getDbInstance();
    const repair = await getAsync(
        `SELECT r.*, c.fullName as customerFullName, c.phoneNumber as customerPhoneNumber, t.partnerName as technicianName 
        FROM repairs r 
        JOIN customers c ON r.customerId = c.id 
        LEFT JOIN partners t ON r.technicianId = t.id
        WHERE r.id = ?`,
        [repairId]
    );
    if (!repair) return null;

    const parts = await allAsync(
        `SELECT rp.*, p.name as productName, p.sellingPrice as pricePerItem
         FROM repair_parts rp
         JOIN products p ON rp.productId = p.id
         WHERE rp.repairId = ?`,
        [repairId]
    );
    
    return { repair, parts };
};

export const updateRepairInDb = async (repairId: number, data: Partial<FrontendRepair>): Promise<any> => {
    await getDbInstance();
    const { status, technicianNotes, finalCost, technicianId, laborFee } = data;
    
    const existingRepair = await getAsync("SELECT * FROM repairs WHERE id = ?", [repairId]);
    if (!existingRepair) throw new Error("Repair not found");

    const fieldsToUpdate: string[] = [];
    const params: any[] = [];
    
    if (status) { fieldsToUpdate.push("status = ?"); params.push(status); }
    if (technicianNotes !== undefined) { fieldsToUpdate.push("technicianNotes = ?"); params.push(technicianNotes); }
    if (finalCost !== undefined) { fieldsToUpdate.push("finalCost = ?"); params.push(finalCost); }
    if (technicianId !== undefined) { fieldsToUpdate.push("technicianId = ?"); params.push(technicianId); }
    if (laborFee !== undefined) { fieldsToUpdate.push("laborFee = ?"); params.push(laborFee); }


    if (fieldsToUpdate.length === 0) return existingRepair;

    if (status === 'تحویل داده شده') {
        fieldsToUpdate.push("dateCompleted = ?");
        params.push(new Date().toISOString());
    }

    params.push(repairId);
    
    await runAsync(`UPDATE repairs SET ${fieldsToUpdate.join(', ')} WHERE id = ?`, params);
    return await getRepairByIdFromDb(repairId);
};

export const finalizeRepairInDb = async (repairId: number, data: FinalizeRepairPayload): Promise<any> => {
  await execAsync("BEGIN TRANSACTION;");
  try {
    const repair = await getAsync("SELECT * FROM repairs WHERE id = ?", [repairId]);
    if (!repair) throw new Error("تعمیر برای نهایی‌سازی یافت نشد.");
    if (repair.status === 'تحویل داده شده') throw new Error("این تعمیر قبلا نهایی شده است.");
    if (!data.technicianId) throw new Error("قبل از نهایی‌سازی، باید یک تعمیرکار به این تعمیر اختصاص داده شود.");

    const newStatus = "تحویل داده شده";
    await runAsync(
      `UPDATE repairs SET status = ?, finalCost = ?, laborFee = ?, dateCompleted = ?, technicianId = ? WHERE id = ?`,
      [newStatus, data.finalCost, data.laborFee, new Date().toISOString(), data.technicianId, repairId]
    );

    // Debit customer account for the final cost
    if (data.finalCost > 0) {
      const customerLedgerDesc = `هزینه تعمیر دستگاه: ${repair.deviceModel} (شناسه تعمیر: ${repairId})`;
      await addCustomerLedgerEntryInternal(repair.customerId, customerLedgerDesc, data.finalCost, 0, new Date().toISOString());
    }

    // Credit technician's account for the labor fee
    if (data.laborFee > 0) {
      const techLedgerDesc = `اجرت تعمیر دستگاه: ${repair.deviceModel} (شناسه تعمیر: ${repairId})`;
      await addPartnerLedgerEntryInternal(data.technicianId, techLedgerDesc, 0, data.laborFee, new Date().toISOString(), 'repair_fee', repairId);
    }

    await execAsync("COMMIT;");
    return await getRepairByIdFromDb(repairId);
  } catch(err: any) {
    await execAsync("ROLLBACK;");
    console.error('DB Error (finalizeRepairInDb):', err);
    throw err;
  }
};


export const addPartToRepairInDb = async (repairId: number, productId: number, quantityUsed: number): Promise<RepairPart> => {
    await getDbInstance();
    await execAsync("BEGIN TRANSACTION;");
    try {
        const product = await getAsync("SELECT stock_quantity FROM products WHERE id = ?", [productId]);
        if (!product) throw new Error("محصول یافت نشد.");
        if (product.stock_quantity < quantityUsed) throw new Error("موجودی محصول در انبار کافی نیست.");

        await runAsync("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?", [quantityUsed, productId]);
        const result = await runAsync(
            `INSERT INTO repair_parts (repairId, productId, quantityUsed) VALUES (?, ?, ?)`,
            [repairId, productId, quantityUsed]
        );

        await execAsync("COMMIT;");
        return await getAsync("SELECT rp.*, p.name as productName, p.sellingPrice as pricePerItem FROM repair_parts rp JOIN products p ON rp.productId = p.id WHERE rp.id = ?", [result.lastID]);
    } catch (err: any) {
        await execAsync("ROLLBACK;");
        throw err;
    }
};

export const deletePartFromRepairInDb = async (partId: number): Promise<boolean> => {
    await getDbInstance();
    await execAsync("BEGIN TRANSACTION;");
    try {
        const part = await getAsync("SELECT productId, quantityUsed FROM repair_parts WHERE id = ?", [partId]);
        if (!part) throw new Error("قطعه مصرفی یافت نشد.");

        await runAsync("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?", [part.quantityUsed, part.productId]);
        const result = await runAsync("DELETE FROM repair_parts WHERE id = ?", [partId]);

        await execAsync("COMMIT;");
        return result.changes > 0;
    } catch (err: any) {
        await execAsync("ROLLBACK;");
        throw err;
    }
};

export const getRepairDetailsForSms = async (repairId: number): Promise<any> => {
    await getDbInstance();
    return await getAsync(
      `SELECT r.id, r.deviceModel, r.finalCost, r.estimatedCost, c.fullName as customerFullName, c.phoneNumber as customerPhoneNumber 
       FROM repairs r JOIN customers c ON r.customerId = c.id WHERE r.id = ?`,
      [repairId]
    );
};


export const getOverdueInstallmentsFromDb = async (): Promise<any[]> => {
    await getDbInstance();
    // This function fetches all unpaid installments. The caller will filter by date
    // as date logic in JS with moment.js is easier and more reliable than in SQLite.
    const query = `
SELECT
    ip.id,
    ip.saleId,
    isale.customerId as customerId,
    ip.dueDate,
    ip.amountDue,
    c.fullName as customerFullName,
    c.phoneNumber as customerPhoneNumber,
    c.telegram_chat_id as telegramChatId,
    c.telegram_opted_out as telegramOptedOut,
    c.telegram_invalid as telegramInvalid
FROM installment_payments ip
JOIN installment_sales isale ON ip.saleId = isale.id
JOIN customers c ON isale.customerId = c.id
WHERE ip.status = 'پرداخت نشده'
  AND COALESCE(ip.amountDue, 0) > 0
ORDER BY ip.dueDate ASC
    `;
    return await allAsync(query);
};

/**
 * Fetch all installment payments that are not yet paid along with customer and sale information.
 * The caller should perform any date filtering (e.g., differences of 7, 3, or 0 days) in JS.
 */
export const getPendingInstallmentPaymentsWithCustomer = async (): Promise<any[]> => {
    await getDbInstance();
    const query = `
        SELECT
            ip.id AS paymentId,
            ip.saleId,
            ip.dueDate,
            ip.amountDue,
            ip.status AS paymentStatus,
            isale.customerId,
            c.fullName AS customerFullName
        FROM installment_payments ip
        JOIN installment_sales isale ON ip.saleId = isale.id
        JOIN customers c ON isale.customerId = c.id
        WHERE ip.status != 'پرداخت شده'
          AND COALESCE(ip.amountDue, 0) > 0
        ORDER BY ip.dueDate ASC
    `;
    return await allAsync(query);
};

/**
 * Fetch all checks associated with installment sales that are still pending or in process (not settled).
 * The caller should perform any date filtering (e.g., 7, 3, or 0 days before due) in JS.
 */
export const getPendingInstallmentChecksWithCustomer = async (): Promise<any[]> => {
    await getDbInstance();
    const query = `
        SELECT
            ic.id AS checkId,
            ic.saleId,
            ic.checkNumber,
            ic.bankName,
            ic.dueDate,
            ic.amount,
            ic.status AS checkStatus,
            isale.customerId,
            c.fullName AS customerFullName,
            c.phoneNumber AS customerPhoneNumber,
            c.telegram_chat_id AS telegramChatId,
            c.telegram_opted_out AS telegramOptedOut,
            c.telegram_invalid AS telegramInvalid
        FROM installment_checks ic
        JOIN installment_sales isale ON ic.saleId = isale.id
        JOIN customers c ON isale.customerId = c.id
        WHERE COALESCE(ic.amount, 0) > 0
          AND COALESCE(ic.status, '') NOT IN ('نقد شد','برگشت خورد','به مشتری برگشت داده شده','وصول شده','برگشت خورده','باطل شده','پاس شده','تسویه شده')
        ORDER BY ic.dueDate ASC
    `;
    return await allAsync(query);
};

export const getRepairsReadyForPickupFromDb = async (): Promise<any[]> => {
    await getDbInstance();
    const query = `
SELECT
    r.id,
    r.customerId as customerId,
    r.deviceModel,
    r.finalCost,
    r.status,
    r.dateCompleted,
    c.fullName as customerFullName,
    c.phoneNumber as customerPhoneNumber,
    c.telegram_chat_id as telegramChatId,
    c.telegram_opted_out as telegramOptedOut,
    c.telegram_invalid as telegramInvalid
FROM repairs r
JOIN customers c on r.customerId = c.id
WHERE r.status = 'آماده تحویل'
ORDER BY r.dateCompleted DESC
    `;
    return await allAsync(query);
};

const getInstallmentPaymentLedgerMeta = async (paymentId: number) => {
  const row = await getAsync(
    `SELECT ip.id AS paymentId, ip.saleId, ip.installmentNumber, isale.customerId
       FROM installment_payments ip
       JOIN installment_sales isale ON isale.id = ip.saleId
      WHERE ip.id = ?`,
    [paymentId]
  );
  if (!row || !row.customerId) return null;
  return {
    customerId: Number(row.customerId),
    saleId: Number(row.saleId),
    installmentNumber: Number(row.installmentNumber || 0),
  };
};

const syncInstallmentTransactionCustomerLedger = async (
  txId: number,
  paymentId: number,
  amount: number,
  isoDate: string,
  notes?: string | null,
) => {
  const meta = await getInstallmentPaymentLedgerMeta(paymentId);
  if (!meta) return;

  const description = [
    `دریافت بابت قسط ${meta.installmentNumber ? meta.installmentNumber.toLocaleString('fa-IR') : '—'}`,
    `شناسه فروش: ${meta.saleId}`,
    notes ? `یادداشت: ${notes}` : '',
  ].filter(Boolean).join(' | ');

  const existing = await getAsync(
    `SELECT id FROM customer_ledger WHERE referenceType = ? AND referenceId = ? LIMIT 1`,
    ['installment_payment_tx', txId]
  );

  if (existing?.id) {
    await runAsync(
      `UPDATE customer_ledger
          SET transactionDate = ?,
              updatedAt = ?,
              description = ?,
              debit = 0,
              credit = ?
        WHERE id = ?`,
      [isoDate, new Date().toISOString(), description, amount, existing.id]
    );
    await recalcCustomerBalancesInternal(meta.customerId);
    return;
  }

  await addCustomerLedgerEntryInternal(
    meta.customerId,
    description,
    0,
    amount,
    isoDate,
    { referenceType: 'installment_payment_tx', referenceId: txId }
  );
  await recalcCustomerBalancesInternal(meta.customerId);
};

const deleteInstallmentTransactionCustomerLedger = async (txId: number, paymentId: number) => {
  const meta = await getInstallmentPaymentLedgerMeta(paymentId);
  const existing = await getAsync(
    `SELECT id FROM customer_ledger WHERE referenceType = ? AND referenceId = ? LIMIT 1`,
    ['installment_payment_tx', txId]
  );
  if (!existing?.id) return;
  await runAsync(`DELETE FROM customer_ledger WHERE id = ?`, [existing.id]);
  if (meta?.customerId) await recalcCustomerBalancesInternal(meta.customerId);
};

export const addInstallmentTransactionToDb = async (paymentId: number, amount: number, isoDate: string, notes?: string) => {
  await execAsync("BEGIN TRANSACTION;");
  try {
    const payment = await getAsync("SELECT * FROM installment_payments WHERE id = ?", [paymentId]);
    if (!payment) {
      throw new Error("قسط مورد نظر برای ثبت پرداخت یافت نشد.");
    }
    await assertInstallmentPaymentAmountIsValid(paymentId, amount);

    // 1. Insert the partial payment transaction
    const result = await runAsync(
      `INSERT INTO installment_transactions (installment_payment_id, amount_paid, payment_date, notes) VALUES (?, ?, ?, ?)`,
      [paymentId, amount, isoDate, notes]
    );

    // 2. Get sum of all payments for this installment
    const sumResult = await getAsync(
      `SELECT SUM(amount_paid) as totalPaid FROM installment_transactions WHERE installment_payment_id = ?`,
      [paymentId]
    );
    const totalPaid = sumResult.totalPaid || 0;

    // 3. Update the parent installment's status based on the total paid amount
    let newStatus: InstallmentPaymentStatus = payment.status;
    if (totalPaid >= payment.amountDue) {
      newStatus = 'پرداخت شده';
    } else if (totalPaid > 0) {
      newStatus = 'پرداخت جزئی'; // New status for partially paid installments
    } else {
      newStatus = 'پرداخت نشده';
    }

    // Only update paymentDate if the status is changing to a form of paid
    const dateToUpdate = (newStatus === 'پرداخت شده' || newStatus === 'پرداخت جزئی') ? isoDate : null;

    await runAsync(
      `UPDATE installment_payments SET status = ?, paymentDate = ? WHERE id = ?`,
      [newStatus, dateToUpdate, paymentId]
    );

    const insertedTx = await getAsync("SELECT * FROM installment_transactions WHERE id = ?", [result.lastID]);
    await syncInstallmentTransactionCustomerLedger(Number(result.lastID), paymentId, amount, isoDate, notes);

    await execAsync("COMMIT;");
    return insertedTx;
  } catch (error) {
    await execAsync("ROLLBACK;");
    throw error;
  }
};

// === Installment transactions: update + delete + status recalc ===
const _toNumber = (v: any) => Number(String(v ?? '0').replace(/[^\d.-]/g, '')) || 0;

const assertInstallmentPaymentAmountIsValid = async (paymentId: number, amount: number, excludeTxId?: number): Promise<void> => {
  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) throw new Error('مبلغ پرداخت باید عدد مثبت باشد.');
  const payment = await getAsync('SELECT id, amountDue FROM installment_payments WHERE id = ?', [paymentId]);
  if (!payment) throw new Error('قسط مورد نظر برای ثبت پرداخت یافت نشد.');
  const paidRow = await getAsync(
    `SELECT COALESCE(SUM(amount_paid), 0) as totalPaid
     FROM installment_transactions
     WHERE installment_payment_id = ? ${excludeTxId ? 'AND id <> ?' : ''}`,
    excludeTxId ? [paymentId, excludeTxId] : [paymentId]
  );
  const paidBefore = _toNumber(paidRow?.totalPaid);
  const amountDue = _toNumber(payment.amountDue);
  const remaining = Math.max(0, amountDue - paidBefore);
  if (normalizedAmount > remaining + 1) {
    throw new Error(`مبلغ پرداخت (${normalizedAmount.toLocaleString('fa-IR')}) بیشتر از مانده این قسط (${remaining.toLocaleString('fa-IR')}) است.`);
  }
};

export const getPaymentIdByTransactionIdFromDb = async (txId: number): Promise<number | null> => {
  await getDbInstance();
  const row = await getAsync(
    "SELECT installment_payment_id FROM installment_transactions WHERE id = ?",
    [txId]
  );
  return row ? (row.installment_payment_id as number) : null;
};

export const recalcInstallmentPaymentStatusInDb = async (paymentId: number): Promise<void> => {
  await getDbInstance();
  const p = await getAsync("SELECT id, amountDue FROM installment_payments WHERE id = ?", [paymentId]);
  if (!p) return;

  const rows = await allAsync(
    "SELECT amount_paid, payment_date FROM installment_transactions WHERE installment_payment_id = ? ORDER BY payment_date ASC, id ASC",
    [paymentId]
  );
  const totalPaid = rows.reduce((s: number, r: any) => s + _toNumber(r.amount_paid), 0);
  const amountDue = _toNumber(p.amountDue);

  // حالت سه‌گانه وضعیت
  let status: InstallmentPaymentStatus = 'پرداخت نشده';
  let paymentDate: string | null = null;

  if (totalPaid >= amountDue && amountDue > 0) {
    status = 'پرداخت شده';
    // در صورت تسویه کامل، تاریخ آخرین تراکنش را به‌عنوان paymentDate می‌گذاریم
    if (rows.length) paymentDate = rows[rows.length - 1].payment_date ?? null;
  } else if (totalPaid > 0) {
    status = 'پرداخت جزئی';
    paymentDate = null; // برای پرداخت جزئی تاریخ نهایی نگذار
  }

  await runAsync(
    "UPDATE installment_payments SET status = ?, paymentDate = ? WHERE id = ?",
    [status, paymentDate, paymentId]
  );
};

export const updateInstallmentTransactionInDb = async (txId: number, amount: number, isoDate: string, notes?: string) => {
  await execAsync("BEGIN TRANSACTION;");
  try {
    const paymentId = await getPaymentIdByTransactionIdFromDb(txId);
    if (!paymentId) throw new Error("تراکنش مورد نظر یافت نشد.");
    await assertInstallmentPaymentAmountIsValid(paymentId, amount, txId);

    await runAsync(
      "UPDATE installment_transactions SET amount_paid = ?, payment_date = ?, notes = ? WHERE id = ?",
      [amount, isoDate, notes ?? null, txId]
    );

    await recalcInstallmentPaymentStatusInDb(paymentId);
    const updatedTx = await getAsync("SELECT * FROM installment_transactions WHERE id = ?", [txId]);
    await syncInstallmentTransactionCustomerLedger(txId, paymentId, amount, isoDate, notes);
    await execAsync("COMMIT;");
    return updatedTx;
  } catch (error) {
    await execAsync("ROLLBACK;");
    throw error;
  }
};

export const deleteInstallmentTransactionFromDb = async (txId: number): Promise<boolean> => {
  await execAsync("BEGIN TRANSACTION;");
  try {
    const paymentId = await getPaymentIdByTransactionIdFromDb(txId);
    if (!paymentId) throw new Error("تراکنش مورد نظر یافت نشد.");

    await deleteInstallmentTransactionCustomerLedger(txId, paymentId);
    const result = await runAsync("DELETE FROM installment_transactions WHERE id = ?", [txId]);

    // نکتهٔ حیاتی: بعد از حذف، وضعیت قسط را بازمحاسبه کن
    await recalcInstallmentPaymentStatusInDb(paymentId);

    await execAsync("COMMIT;");
    return result.changes > 0;
  } catch (error) {
    await execAsync("ROLLBACK;");
    throw error;
  }
};

// === FTS5: Unified Search ===
const ensureFts5UnifiedSearch = async (): Promise<void> => {
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
    if (String(e?.message || '').includes('no such module: fts5')) {
      console.warn('⚠️ FTS5 در بیلد فعلی SQLite فعال نیست. unified search غیرفعال می‌ماند.');
    } else {
      throw e;
    }
  }
};
const rebuildSearchIndexInternal = async (): Promise<void> => {
  await runAsync('BEGIN;');
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

    await runAsync('COMMIT;');
  } catch (err) {
    await runAsync('ROLLBACK;');
    throw err;
  }
};

// اگر خالی بود، یکبار پرش کن
const initSearchIndexIfNeeded = async (): Promise<void> => {
  try {
    const row = await getAsync(`SELECT COUNT(*) AS c FROM search_index`, []);
    if (!row || !row.c) {
      await rebuildSearchIndexInternal();
      return;
    }

    // ارتقای نسخه: اگر داده‌های جدید (فاکتور/تعمیر/اقساط/همکار) داریم اما هنوز ایندکس نشده‌اند، یکبار ریبیلد کن.
    const hasNewDomains = await getAsync(
      `SELECT COUNT(*) AS c FROM search_index WHERE domain IN ('invoice','repair','installment','partner')`,
      []
    );
    if (Number(hasNewDomains?.c || 0) > 0) return;

    const [inv, rep, ins, par] = await Promise.all([
      getAsync(`SELECT COUNT(*) AS c FROM invoices`, []),
      getAsync(`SELECT COUNT(*) AS c FROM repairs`, []),
      getAsync(`SELECT COUNT(*) AS c FROM installment_sales`, []),
      getAsync(`SELECT COUNT(*) AS c FROM partners`, []),
    ]);

    const need = Number(inv?.c || 0) + Number(rep?.c || 0) + Number(ins?.c || 0) + Number(par?.c || 0);
    if (need > 0) {
      await rebuildSearchIndexInternal();
    }
  } catch (e: any) {
    // اگر search_index هنوز ساخته نشده بود، بی‌صدا رد می‌شویم
  }
};

// اگر دوست داری برای دیباگ از بیرون هم صدا بزنیش:
export const rebuildSearchIndex = async (): Promise<void> => {
  await ensureFts5UnifiedSearch();
  await rebuildSearchIndexInternal();
};



/* =======================================================================
   PARTNERS LEDGER — single source of truth (no duplicates)
   ======================================================================= */

/** Update a single partner ledger entry safely and recalc balances */
export const updatePartnerLedgerEntryInDb = async (
  partnerId: number,
  entryId: number,
  data: Partial<LedgerEntryPayload>
) => {
  await getDbInstance();
  const row = await getAsync(`SELECT * FROM partner_ledger WHERE id = ?`, [entryId]);
  if (!row) throw new Error('رکورد دفتر یافت نشد');
  if (Number(row.partnerId) !== Number(partnerId)) throw new Error('عدم تطابق همکار');

  const rawDesc  = (data as any)?.description;
  const rawDebit = (data as any)?.debit;
  const rawCred  = (data as any)?.credit;
  const rawDate  = (data as any)?.transactionDate;

  const description     = (rawDesc  == null) ? row.description : String(rawDesc).trim();
  const debit           = (rawDebit == null || rawDebit === '') ? row.debit  : Number(rawDebit)  || 0;
  const credit          = (rawCred  == null || rawCred  === '') ? row.credit : Number(rawCred)   || 0;
  const transactionDate = (rawDate && !Number.isNaN(Date.parse(rawDate)))
                            ? new Date(rawDate).toISOString()
                            : row.transactionDate;

  // Exactly one of debit/credit must be > 0
  if ((debit > 0 && credit > 0) || (debit <= 0 && credit <= 0)) {
    throw new Error('مبالغ نامعتبر: فقط یکی از بدهکار/بستانکار و حتماً مثبت');
  }

  const updatedAt = new Date().toISOString();
  const changeHistoryJson = stringifyLedgerChangeHistory((row as any)?.changeHistoryJson, {
    changedAt: updatedAt,
    reason: 'manual_edit',
    before: {
      description: row.description,
      debit: row.debit,
      credit: row.credit,
      transactionDate: row.transactionDate,
      referenceType: row.referenceType ?? null,
      referenceId: row.referenceId ?? null,
    },
    after: {
      description,
      debit,
      credit,
      transactionDate,
      referenceType: row.referenceType ?? null,
      referenceId: row.referenceId ?? null,
    },
  });

  await runAsync(
    `UPDATE partner_ledger
        SET description = ?, debit = ?, credit = ?, transactionDate = ?, updatedAt = ?, changeHistoryJson = ?
      WHERE id = ?`,
    [description, debit, credit, transactionDate, updatedAt, changeHistoryJson, entryId]
  );

  await recalcPartnerBalances(partnerId);
  return await getAsync(`SELECT * FROM partner_ledger WHERE id = ?`, [entryId]);
};

/** Delete a partner ledger entry with ownership check and recalc */
export const deletePartnerLedgerEntryFromDb = async (
  partnerId: number,
  entryId: number
) => {
  await getDbInstance();
  const row = await getAsync(
    `SELECT id, partnerId FROM partner_ledger WHERE id = ?`,
    [entryId]
  );
  if (!row) throw new Error('رکورد دفتر یافت نشد');
  if (Number(row.partnerId) !== Number(partnerId)) throw new Error('عدم تطابق همکار');

  await runAsync(`DELETE FROM partner_ledger WHERE id = ?`, [entryId]);
  await recalcPartnerBalances(partnerId);
  return true;
};

/** Recalculate running balances for a partner's ledger */
export const recalcPartnerBalances = async (partnerId: number) => {
  await getDbInstance();
  const rows = await allAsync(
    `SELECT id, debit, credit, transactionDate
       FROM partner_ledger
      WHERE partnerId = ?
   ORDER BY datetime(transactionDate) ASC, id ASC`,
    [partnerId]
  );

  let balance = 0;
  await runAsync('BEGIN');
  try {
    for (const r of rows) {
      const d = Number(r.debit)  || 0;
      const c = Number(r.credit) || 0;
      // در دفتر همکار، credit یعنی بدهی به همکار بیشتر شده و debit یعنی پرداخت/تسویه.
      balance = balance + c - d;
      await runAsync(`UPDATE partner_ledger SET balance = ? WHERE id = ?`, [balance, r.id]);
    }
    await runAsync('COMMIT');
  } catch (e) {
    await runAsync('ROLLBACK');
    throw e;
  }
};


/* =======================================================================
   CUSTOMERS LEDGER — single source of truth (no duplicates)
   ======================================================================= */

export const updateCustomerLedgerEntryInDb = async (
  customerId: number,
  entryId: number,
  data: Partial<LedgerEntryPayload>
) => {
  await getDbInstance();
  const row = await getAsync(`SELECT * FROM customer_ledger WHERE id = ?`, [entryId]);
  if (!row) throw new Error('رکورد دفتر یافت نشد');
  if (Number(row.customerId) !== Number(customerId)) throw new Error('عدم تطابق مشتری');

  const rawDesc  = (data as any)?.description;
  const rawDebit = (data as any)?.debit;
  const rawCred  = (data as any)?.credit;
  const rawDate  = (data as any)?.transactionDate;

  const description     = (rawDesc  == null) ? row.description : String(rawDesc).trim();
  const debit           = (rawDebit == null || rawDebit === '') ? row.debit  : Number(rawDebit)  || 0;
  const credit          = (rawCred  == null || rawCred  === '') ? row.credit : Number(rawCred)   || 0;
  const transactionDate = (rawDate && !Number.isNaN(Date.parse(rawDate)))
                            ? new Date(rawDate).toISOString()
                            : row.transactionDate;
  const explicitRefType = Object.prototype.hasOwnProperty.call(data || {}, 'referenceType') ? ((data as any).referenceType ?? null) : row.referenceType;
  const explicitRefId = Object.prototype.hasOwnProperty.call(data || {}, 'referenceId') ? ((data as any).referenceId ?? null) : row.referenceId;

  if ((debit > 0 && credit > 0) || (debit <= 0 && credit <= 0))
    throw new Error('مبالغ نامعتبر: فقط یکی از بدهکار/بستانکار و حتماً مثبت');

  const inferredRef = inferCustomerLedgerReference(description, debit, credit, { referenceType: explicitRefType, referenceId: explicitRefId });

  await runAsync(
    `UPDATE customer_ledger
        SET description = ?, debit = ?, credit = ?, transactionDate = ?, updatedAt = ?, referenceType = ?, referenceId = ?
      WHERE id = ?`,
    [description, debit, credit, transactionDate, new Date().toISOString(), inferredRef.referenceType, inferredRef.referenceId, entryId]
  );

  await recalcCustomerBalances(customerId);
  return await getAsync(`SELECT * FROM customer_ledger WHERE id = ?`, [entryId]);
};

export const deleteCustomerLedgerEntryFromDb = async (
  customerId: number,
  entryId: number
) => {
  await getDbInstance();
  const row = await getAsync(
    `SELECT id, customerId FROM customer_ledger WHERE id = ?`,
    [entryId]
  );
  if (!row) throw new Error('رکورد دفتر یافت نشد');
  if (Number(row.customerId) !== Number(customerId)) throw new Error('عدم تطابق مشتری');

  await runAsync(`DELETE FROM customer_ledger WHERE id = ?`, [entryId]);
  await recalcCustomerBalances(customerId);
  return true;
};

const recalcCustomerBalancesInternal = async (customerId: number) => {
  await getDbInstance();
  const rows = await allAsync(
    `SELECT id, debit, credit, transactionDate
       FROM customer_ledger
      WHERE customerId = ?
   ORDER BY datetime(transactionDate) ASC, id ASC`,
    [customerId]
  );

  let balance = 0;
  for (const r of rows) {
    balance = balance + (Number(r.debit) || 0) - (Number(r.credit) || 0);
    await runAsync(`UPDATE customer_ledger SET balance = ? WHERE id = ?`, [balance, r.id]);
  }
  try {
    await runAsync(`UPDATE customers SET currentBalance = ? WHERE id = ?`, [balance, customerId]);
  } catch (_e) {}
};

export const recalcCustomerBalances = async (customerId: number) => {
  await getDbInstance();
  await runAsync('BEGIN');
  try {
    await recalcCustomerBalancesInternal(customerId);
    await runAsync('COMMIT');
  } catch (e) {
    await runAsync('ROLLBACK');
    throw e;
  }
};



// =====================================================
// P0 API Helpers: Inventory Adjustments / Purchases / Stock Counts
// =====================================================

export interface AdjustStockPayload {
  delta: number;           // positive => add, negative => reduce
  reason?: string;
  notes?: string;
  createdByUserId?: number;
}

export const adjustProductStockInDb = async (
  productId: number,
  payload: AdjustStockPayload
): Promise<{ productId: number; oldQuantity: number; newQuantity: number; delta: number }> => {
  await getDbInstance();
  const delta = Number(payload?.delta || 0);
  if (!Number.isFinite(delta) || delta === 0) throw new Error('مقدار تغییر موجودی معتبر نیست.');
  const reason = payload?.reason || 'اصلاح دستی موجودی';
  const notes = payload?.notes || '';
  const createdByUserId = payload?.createdByUserId ?? null;

  await execAsync('BEGIN TRANSACTION;');
  try {
    const pr = await getAsync(`SELECT stock_quantity FROM products WHERE id=?`, [productId]);
    if (!pr) throw new Error('محصول یافت نشد.');
    const oldQuantity = Number(pr.stock_quantity) || 0;
    const newQuantity = oldQuantity + delta;
    if (newQuantity < 0) throw new Error('موجودی پس از اصلاح نمی‌تواند منفی شود.');

    await runAsync(`UPDATE products SET stock_quantity=? WHERE id=?`, [newQuantity, productId]);
    await runAsync(
      `INSERT INTO inventory_logs (productId, oldQuantity, newQuantity, changedAt) VALUES (?,?,?,?)`,
      [productId, oldQuantity, newQuantity, new Date().toISOString()]
    );
    await runAsync(
      `INSERT INTO inventory_adjustments (productId, delta, reason, notes, createdAt, createdByUserId) VALUES (?,?,?,?,?,?)`,
      [productId, delta, reason, notes, new Date().toISOString(), createdByUserId]
    );

    await execAsync('COMMIT;');
    return { productId, oldQuantity, newQuantity, delta };
  } catch (e) {
    await execAsync('ROLLBACK;');
    throw e;
  }
};

export interface PurchaseReceiptItemPayload {
  productId: number;
  quantity: number;
  unitCost: number;
}
export interface PurchaseReceiptPayload {
  supplierId?: number | null;
  invoiceNumber?: string | null;
  notes?: string | null;
  items: PurchaseReceiptItemPayload[];
  createdByUserId?: number;
  purchaseDateISO?: string; // optional ISO datetime
}

export const createPurchaseReceiptInDb = async (payload: PurchaseReceiptPayload) => {
  await getDbInstance();
  if (!payload?.items?.length) throw new Error('لیست اقلام خرید خالی است.');
  const supplierId = payload.supplierId ?? null;
  const invoiceNumber = payload.invoiceNumber ?? null;
  const notes = payload.notes ?? '';
  const createdByUserId = payload.createdByUserId ?? null;
  const purchaseDate = payload.purchaseDateISO || new Date().toISOString();

  await execAsync('BEGIN TRANSACTION;');
  try {
    const ins = await runAsync(
      `INSERT INTO purchases (supplierId, invoiceNumber, notes, totalCost, purchaseDate, createdByUserId)
       VALUES (?,?,?,?,?,?)`,
      [supplierId, invoiceNumber, notes, 0, purchaseDate, createdByUserId]
    );
    const purchaseId = ins.lastID as number;

    let totalCost = 0;

    for (const it of payload.items) {
      const productId = Number(it.productId);
      const quantity = Math.floor(Number(it.quantity));
      const unitCost = Number(it.unitCost);

      if (!productId || quantity <= 0) throw new Error('آیتم خرید نامعتبر است.');
      if (!Number.isFinite(unitCost) || unitCost < 0) throw new Error('قیمت خرید نامعتبر است.');

      const pr = await getAsync(`SELECT id, name, stock_quantity, purchasePrice FROM products WHERE id=?`, [productId]);
      if (!pr) throw new Error(`محصول با شناسه ${productId} یافت نشد.`);

      const oldQty = Number(pr.stock_quantity) || 0;
      const newQty = oldQty + quantity;

      // Weighted average for purchasePrice (optional)
      let newPurchasePrice = Number(pr.purchasePrice) || 0;
      if (unitCost > 0) {
        const oldValue = newPurchasePrice * oldQty;
        const addValue = unitCost * quantity;
        const denom = oldQty + quantity;
        newPurchasePrice = denom > 0 ? (oldValue + addValue) / denom : unitCost;
      }

      await runAsync(`UPDATE products SET stock_quantity=?, purchasePrice=? WHERE id=?`, [newQty, newPurchasePrice, productId]);
      await runAsync(
        `INSERT INTO inventory_logs (productId, oldQuantity, newQuantity, changedAt) VALUES (?,?,?,?)`,
        [productId, oldQty, newQty, purchaseDate]
      );

      const lineTotal = unitCost * quantity;
      totalCost += lineTotal;

      await runAsync(
        `INSERT INTO purchase_items (purchaseId, productId, quantity, unitCost, lineTotal) VALUES (?,?,?,?,?)`,
        [purchaseId, productId, quantity, unitCost, lineTotal]
      );
    }

    await runAsync(`UPDATE purchases SET totalCost=? WHERE id=?`, [totalCost, purchaseId]);

    if (supplierId && totalCost > 0) {
      const desc = `ثبت خرید کالا (رسید انبار) شماره ${purchaseId}` + (invoiceNumber ? ` | فاکتور: ${invoiceNumber}` : '');
      // credit => بدهی به تامین‌کننده افزایش می‌یابد
      await addPartnerLedgerEntryInternal(Number(supplierId), desc, 0, totalCost, purchaseDate, 'product_purchase', purchaseId);
    }

    await execAsync('COMMIT;');

    return await getPurchaseByIdFromDb(purchaseId);
  } catch (e) {
    await execAsync('ROLLBACK;');
    throw e;
  }
};

export const getAllPurchasesFromDb = async () => {
  await getDbInstance();
  return await allAsync(
    `SELECT p.*, pa.partnerName as supplierName
       FROM purchases p
       LEFT JOIN partners pa ON pa.id = p.supplierId
   ORDER BY datetime(p.purchaseDate) DESC, p.id DESC`
  );
};

export const getPurchaseByIdFromDb = async (purchaseId: number) => {
  await getDbInstance();
  const purchase = await getAsync(
    `SELECT p.*, pa.partnerName as supplierName
       FROM purchases p
       LEFT JOIN partners pa ON pa.id = p.supplierId
      WHERE p.id = ?`,
    [purchaseId]
  );
  if (!purchase) return null;
  const items = await allAsync(
    `SELECT pi.*, pr.name as productName
       FROM purchase_items pi
       JOIN products pr ON pr.id = pi.productId
      WHERE pi.purchaseId = ?
      ORDER BY pi.id ASC`,
    [purchaseId]
  );
  return { ...purchase, items };
};

export interface StockCountCreatePayload {
  title: string;
  notes?: string;
  createdByUserId?: number;
}

export const createStockCountInDb = async (payload: StockCountCreatePayload) => {
  await getDbInstance();
  if (!payload?.title?.trim()) throw new Error('عنوان انبارگردانی الزامی است.');
  const ins = await runAsync(
    `INSERT INTO stock_counts (title, status, notes, createdAt, createdByUserId) VALUES (?,?,?,?,?)`,
    [payload.title.trim(), 'open', payload.notes || '', new Date().toISOString(), payload.createdByUserId ?? null]
  );
  return await getStockCountByIdFromDb(Number(ins.lastID));
};

export const getAllStockCountsFromDb = async () => {
  await getDbInstance();
  return await allAsync(`SELECT * FROM stock_counts ORDER BY datetime(createdAt) DESC, id DESC`);
};

export const getStockCountByIdFromDb = async (stockCountId: number) => {
  await getDbInstance();
  const sc = await getAsync(`SELECT * FROM stock_counts WHERE id = ?`, [stockCountId]);
  if (!sc) return null;
  const items = await allAsync(
    `SELECT sci.*, pr.name as productName
       FROM stock_count_items sci
       JOIN products pr ON pr.id = sci.productId
      WHERE sci.stockCountId = ?
      ORDER BY pr.name ASC`,
    [stockCountId]
  );
  return { ...sc, items };
};

export const upsertStockCountItemInDb = async (
  stockCountId: number,
  productId: number,
  countedQty: number
) => {
  await getDbInstance();
  const sc = await getAsync(`SELECT status FROM stock_counts WHERE id=?`, [stockCountId]);
  if (!sc) throw new Error('انبارگردانی یافت نشد.');
  if (String(sc.status) !== 'open') throw new Error('این انبارگردانی بسته شده است.');

  const pr = await getAsync(`SELECT stock_quantity FROM products WHERE id=?`, [productId]);
  if (!pr) throw new Error('محصول یافت نشد.');
  const expectedQty = Number(pr.stock_quantity) || 0;
  const cq = Math.floor(Number(countedQty));
  if (!Number.isFinite(cq) || cq < 0) throw new Error('مقدار شمارش‌شده نامعتبر است.');

  await runAsync(
    `INSERT INTO stock_count_items (stockCountId, productId, expectedQty, countedQty)
     VALUES (?,?,?,?)
     ON CONFLICT(stockCountId, productId) DO UPDATE SET countedQty=excluded.countedQty`,
    [stockCountId, productId, expectedQty, cq]
  );
  return true;
};

export const completeStockCountInDb = async (stockCountId: number, createdByUserId?: number) => {
  await getDbInstance();
  const sc = await getAsync(`SELECT * FROM stock_counts WHERE id=?`, [stockCountId]);
  if (!sc) throw new Error('انبارگردانی یافت نشد.');
  if (String(sc.status) !== 'open') throw new Error('این انبارگردانی قبلاً بسته شده است.');

  const items = await allAsync(`SELECT * FROM stock_count_items WHERE stockCountId=?`, [stockCountId]);
  await execAsync('BEGIN TRANSACTION;');
  try {
    for (const it of items) {
      const expectedQty = Number(it.expectedQty) || 0;
      const countedQty = Number(it.countedQty) || 0;
      const delta = countedQty - expectedQty;
      if (delta === 0) continue;

      const pr = await getAsync(`SELECT stock_quantity FROM products WHERE id=?`, [it.productId]);
      if (!pr) continue;
      const oldQty = Number(pr.stock_quantity) || 0;
      const newQty = oldQty + delta;
      if (newQty < 0) throw new Error('نتیجه موجودی منفی شد. عملیات متوقف شد.');

      await runAsync(`UPDATE products SET stock_quantity=? WHERE id=?`, [newQty, it.productId]);
      await runAsync(
        `INSERT INTO inventory_logs (productId, oldQuantity, newQuantity, changedAt) VALUES (?,?,?,?)`,
        [it.productId, oldQty, newQty, new Date().toISOString()]
      );
      await runAsync(
        `INSERT INTO inventory_adjustments (productId, delta, reason, notes, createdAt, createdByUserId)
         VALUES (?,?,?,?,?,?)`,
        [it.productId, delta, `انبارگردانی #${stockCountId}`, `اصلاح موجودی از ${expectedQty} به ${countedQty}`, new Date().toISOString(), createdByUserId ?? null]
      );
    }

    await runAsync(`UPDATE stock_counts SET status='completed', completedAt=? WHERE id=?`, [new Date().toISOString(), stockCountId]);
    await execAsync('COMMIT;');
    return await getStockCountByIdFromDb(stockCountId);
  } catch (e) {
    await execAsync('ROLLBACK;');
    throw e;
  }
};


export const addAuditLogEntry = async (
  userId: number | null,
  entity: string,
  entityId: number,
  action: string,
  meta: any = null
) => {
  await getDbInstance();
  await runAsync(
    `INSERT INTO audit_logs (userId, entity, entityId, action, meta, createdAt)
     VALUES (?,?,?,?,?,?)`,
    [userId, entity, entityId, action, meta ? JSON.stringify(meta) : null, new Date().toISOString()]
  );
};


export const dismissNotificationForUserInDb = async (userId: number, notificationId: string): Promise<void> => {
  await getDbInstance();
  const nid = String(notificationId || '').trim();
  if (!nid) throw new Error('notificationId خالی است.');
  await runAsync(
    `INSERT OR IGNORE INTO dismissed_notifications (userId, notificationId) VALUES (?, ?)`,
    [userId, nid]
  );
};

export const listDismissedNotificationIdsForUserFromDb = async (userId: number): Promise<string[]> => {
  await getDbInstance();
  const rows = await allAsync(
    `SELECT notificationId FROM dismissed_notifications WHERE userId = ?`,
    [userId]
  );
  return (rows || []).map((r: any) => String(r.notificationId));
};



export type ExpenseCategory = 'rent' | 'salary' | 'inventory' | 'overhead';

export type ExpensePayload = {
  expenseDate: string; // ISO
  category: ExpenseCategory;
  title: string;
  amount: number;
  vendor?: string | null;
  notes?: string | null;
};

export const addExpenseToDb = async (payload: ExpensePayload, actor?: { userId?: number; username?: string }) => {
  await getDbInstance();
  const title = String(payload.title || '').trim();
  if (!title) throw new Error('عنوان هزینه خالی است.');
  const amount = Number(payload.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('مبلغ هزینه نامعتبر است.');
  const category = String(payload.category || '').trim() as any;
  const allowed: ExpenseCategory[] = ['rent','salary','inventory','overhead'];
  if (!allowed.includes(category)) throw new Error('دسته‌بندی هزینه نامعتبر است.');
  const expenseDate = String(payload.expenseDate || '').trim();
  if (!expenseDate) throw new Error('تاریخ هزینه خالی است.');

  const result = await runAsync(
    `INSERT INTO expenses (expenseDate, category, title, amount, vendor, notes, createdByUserId, createdByUsername)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      expenseDate,
      category,
      title,
      Math.round(amount),
      payload.vendor ?? null,
      payload.notes ?? null,
      actor?.userId ?? null,
      actor?.username ?? null,
    ]
  );
  return await getAsync(`SELECT * FROM expenses WHERE id = ?`, [result.lastID]);
};

export const updateExpenseInDb = async (id: number, payload: Partial<ExpensePayload>) => {
  await getDbInstance();
  const updates: string[] = [];
  const params: any[] = [];

  if (payload.title != null) {
    const t = String(payload.title || '').trim();
    if (!t) throw new Error('عنوان هزینه خالی است.');
    updates.push('title = ?');
    params.push(t);
  }
  if (payload.amount != null) {
    const a = Number(payload.amount);
    if (!Number.isFinite(a) || a <= 0) throw new Error('مبلغ هزینه نامعتبر است.');
    updates.push('amount = ?');
    params.push(Math.round(a));
  }
  if (payload.category != null) {
    const c = String(payload.category).trim() as any;
    const allowed: ExpenseCategory[] = ['rent','salary','inventory','overhead'];
    if (!allowed.includes(c)) throw new Error('دسته‌بندی هزینه نامعتبر است.');
    updates.push('category = ?');
    params.push(c);
  }
  if (payload.expenseDate != null) {
    const d = String(payload.expenseDate || '').trim();
    if (!d) throw new Error('تاریخ هزینه خالی است.');
    updates.push('expenseDate = ?');
    params.push(d);
  }
  if (payload.vendor !== undefined) {
    updates.push('vendor = ?');
    params.push(payload.vendor ?? null);
  }
  if (payload.notes !== undefined) {
    updates.push('notes = ?');
    params.push(payload.notes ?? null);
  }

  if (!updates.length) return await getAsync(`SELECT * FROM expenses WHERE id = ?`, [id]);

  params.push(id);
  await runAsync(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`, params);
  return await getAsync(`SELECT * FROM expenses WHERE id = ?`, [id]);
};

export const deleteExpenseFromDb = async (id: number) => {
  await getDbInstance();
  await runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
};

export const listExpensesFromDb = async (filters?: { from?: string; to?: string; category?: string }) => {
  await getDbInstance();
  const where: string[] = [];
  const params: any[] = [];
  if (filters?.from) { where.push('date(expenseDate) >= date(?)'); params.push(String(filters.from).slice(0, 10)); }
  if (filters?.to) { where.push('date(expenseDate) <= date(?)'); params.push(String(filters.to).slice(0, 10)); }
  if (filters?.category && filters.category !== 'all') { where.push('category = ?'); params.push(filters.category); }
  const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
  return await allAsync(
    `SELECT * FROM expenses ${whereSql} ORDER BY expenseDate DESC, id DESC LIMIT 2000`,
    params
  );
};

export const getExpensesSummaryFromDb = async (filters?: { from?: string; to?: string }) => {
  await getDbInstance();
  const where: string[] = [];
  const params: any[] = [];
  if (filters?.from) { where.push('date(expenseDate) >= date(?)'); params.push(String(filters.from).slice(0, 10)); }
  if (filters?.to) { where.push('date(expenseDate) <= date(?)'); params.push(String(filters.to).slice(0, 10)); }
  const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
  const rows = await allAsync(
    `SELECT category, SUM(amount) as total FROM expenses ${whereSql} GROUP BY category`,
    params
  );
  const totalRow = await getAsync(
    `SELECT SUM(amount) as total FROM expenses ${whereSql}`,
    params
  );
  return { byCategory: rows || [], total: Number(totalRow?.total || 0) };
};



export type RecurringExpensePayload = {
  title: string;
  category: ExpenseCategory;
  amount: number;
  vendor?: string | null;
  notes?: string | null;
  dayOfMonth: number; // 1..31
  nextRunDate: string; // YYYY-MM-DD
  isActive?: boolean;
};

export const addRecurringExpenseToDb = async (payload: RecurringExpensePayload, actor?: { userId?: number; username?: string }) => {
  await getDbInstance();
  const title = String(payload.title || '').trim();
  if (!title) throw new Error('عنوان هزینه تکرارشونده خالی است.');
  const amount = Number(payload.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('مبلغ نامعتبر است.');
  const category = String(payload.category || '').trim() as any;
  const allowed: ExpenseCategory[] = ['rent','salary','inventory','overhead'];
  if (!allowed.includes(category)) throw new Error('دسته‌بندی نامعتبر است.');
  const dayOfMonth = Math.floor(Number(payload.dayOfMonth));
  if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) throw new Error('روز ماه نامعتبر است.');
  const nextRunDate = String(payload.nextRunDate || '').trim();
  if (!nextRunDate) throw new Error('nextRunDate خالی است.');

  const ins = await runAsync(
    `INSERT INTO recurring_expenses (title, category, amount, vendor, notes, dayOfMonth, nextRunDate, isActive, createdByUserId, createdByUsername)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      title, category, Math.round(amount),
      payload.vendor ?? null,
      payload.notes ?? null,
      dayOfMonth,
      nextRunDate,
      payload.isActive === false ? 0 : 1,
      actor?.userId ?? null,
      actor?.username ?? null,
    ]
  );

  return await getAsync(`SELECT * FROM recurring_expenses WHERE id = ?`, [ins.lastID]);
};

export const listRecurringExpensesFromDb = async () => {
  await getDbInstance();
  return await allAsync(`SELECT * FROM recurring_expenses ORDER BY isActive DESC, nextRunDate ASC, id DESC`, []);
};

export const updateRecurringExpenseInDb = async (id: number, payload: Partial<RecurringExpensePayload>) => {
  await getDbInstance();
  const updates: string[] = [];
  const params: any[] = [];

  if (payload.title != null) {
    const t = String(payload.title || '').trim();
    if (!t) throw new Error('عنوان خالی است.');
    updates.push('title = ?'); params.push(t);
  }
  if (payload.amount != null) {
    const a = Number(payload.amount);
    if (!Number.isFinite(a) || a <= 0) throw new Error('مبلغ نامعتبر است.');
    updates.push('amount = ?'); params.push(Math.round(a));
  }
  if (payload.category != null) {
    const c = String(payload.category).trim() as any;
    const allowed: ExpenseCategory[] = ['rent','salary','inventory','overhead'];
    if (!allowed.includes(c)) throw new Error('دسته‌بندی نامعتبر است.');
    updates.push('category = ?'); params.push(c);
  }
  if (payload.vendor !== undefined) { updates.push('vendor = ?'); params.push(payload.vendor ?? null); }
  if (payload.notes !== undefined) { updates.push('notes = ?'); params.push(payload.notes ?? null); }
  if (payload.dayOfMonth != null) {
    const d = Math.floor(Number(payload.dayOfMonth));
    if (!d || d < 1 || d > 31) throw new Error('روز ماه نامعتبر است.');
    updates.push('dayOfMonth = ?'); params.push(d);
  }
  if (payload.nextRunDate != null) {
    const n = String(payload.nextRunDate || '').trim();
    if (!n) throw new Error('nextRunDate خالی است.');
    updates.push('nextRunDate = ?'); params.push(n);
  }
  if (payload.isActive != null) { updates.push('isActive = ?'); params.push(payload.isActive ? 1 : 0); }

  if (!updates.length) return await getAsync(`SELECT * FROM recurring_expenses WHERE id = ?`, [id]);

  params.push(id);
  await runAsync(`UPDATE recurring_expenses SET ${updates.join(', ')} WHERE id = ?`, params);
  return await getAsync(`SELECT * FROM recurring_expenses WHERE id = ?`, [id]);
};

export const deleteRecurringExpenseFromDb = async (id: number) => {
  await getDbInstance();
  await runAsync(`DELETE FROM recurring_expenses WHERE id = ?`, [id]);
};

export const getRecurringExpenseByIdFromDb = async (id: number) => {
  await getDbInstance();
  return await getAsync(`SELECT * FROM recurring_expenses WHERE id = ?`, [id]);
};

export const advanceRecurringExpenseNextRunDateInDb = async (id: number, nextRunDate: string) => {
  await getDbInstance();
  await runAsync(`UPDATE recurring_expenses SET nextRunDate = ? WHERE id = ?`, [nextRunDate, id]);
};



export const markRecurringExpenseRunInDb = async (recurringExpenseId: number, runMonth: string) => {
  await getDbInstance();
  const m = String(runMonth || '').trim();
  if (!m) throw new Error('runMonth خالی است.');
  try {
    await runAsync(
      `INSERT INTO recurring_expense_runs (recurringExpenseId, runMonth) VALUES (?, ?)`,
      [recurringExpenseId, m]
    );
    return { inserted: true };
  } catch (e: any) {
    // SQLite unique constraint
    return { inserted: false };
  }
};



export const upsertDebtSnapshotInDb = async (snapshotDate: string, totalDebt: number) => {
  await getDbInstance();
  const d = String(snapshotDate || '').trim();
  if (!d) throw new Error('snapshotDate خالی است.');
  const v = Number(totalDebt || 0);
  await runAsync(
    `INSERT INTO debt_snapshots (snapshotDate, totalDebt) VALUES (?, ?)
     ON CONFLICT(snapshotDate) DO UPDATE SET totalDebt = excluded.totalDebt`,
    [d, v]
  );
};

export const listDebtSnapshotsFromDb = async (fromDate: string, toDate: string) => {
  await getDbInstance();
  return await allAsync(
    `SELECT snapshotDate, totalDebt FROM debt_snapshots
      WHERE snapshotDate >= ? AND snapshotDate <= ?
      ORDER BY snapshotDate ASC`,
    [fromDate, toDate]
  );
};



export const recordInventoryInDb = async (payload: {
  productId: number;
  entryType: 'in' | 'out';
  quantity: number;
  unitCost?: number;
  refType?: string;
  refId?: number;
  entryDate: string;
}) => {
  await getDbInstance();
  const q = Number(payload.quantity || 0);
  if (!Number.isFinite(q) || q <= 0) throw new Error('quantity نامعتبر');
  const uc = Number(payload.unitCost || 0);
  await runAsync(
    `INSERT INTO inventory_ledger (productId, entryType, quantity, unitCost, refType, refId, entryDate)
     VALUES (?,?,?,?,?,?,?)`,
    [
      payload.productId,
      payload.entryType,
      q,
      payload.entryType === 'in' ? uc : 0,
      payload.refType ?? null,
      payload.refId ?? null,
      payload.entryDate,
    ]
  );
};

export const computeFifoCogsForProduct = async (productId: number, soldQty: number) => {
  await getDbInstance();
  let remaining = Number(soldQty || 0);
  if (remaining <= 0) return { cogs: 0, consumed: [] as any[] };

  const ins = await allAsync(
    `SELECT id, quantity, unitCost FROM inventory_ledger
      WHERE productId = ? AND entryType = 'in'
      ORDER BY entryDate ASC, id ASC`,
    [productId]
  );

  const outs = await allAsync(
    `SELECT quantity FROM inventory_ledger
      WHERE productId = ? AND entryType = 'out'
      ORDER BY entryDate ASC, id ASC`,
    [productId]
  );
  const totalOut = (outs || []).reduce((s:any, r:any)=>s+Number(r.quantity||0),0);

  // available by FIFO layers
  let consumedOut = totalOut;
  let cogs = 0;
  const used:any[] = [];

  for (const row of ins || []) {
    let layerQty = Number(row.quantity || 0);
    if (consumedOut > 0) {
      const take = Math.min(layerQty, consumedOut);
      layerQty -= take;
      consumedOut -= take;
    }
    if (layerQty <= 0) continue;

    const takeForSale = Math.min(layerQty, remaining);
    if (takeForSale > 0) {
      cogs += takeForSale * Number(row.unitCost || 0);
      used.push({ inId: row.id, qty: takeForSale, unitCost: row.unitCost });
      remaining -= takeForSale;
    }
    if (remaining <= 0) break;
  }

  return { cogs, consumed: used, shortfall: remaining };
};



export const getInventoryFifoAgingForAllProducts = async () => {
  await getDbInstance();

  const products = await allAsync(`SELECT id, name FROM products ORDER BY name ASC`, []);
  const outRows = await allAsync(
    `SELECT productId, SUM(quantity) as outQty
       FROM inventory_ledger
      WHERE entryType = 'out'
      GROUP BY productId`,
    []
  );
  const outMap: Record<string, number> = {};
  (outRows || []).forEach((r: any) => { outMap[String(r.productId)] = Number(r.outQty || 0); });

  const inRows = await allAsync(
    `SELECT productId, entryDate, quantity, unitCost
       FROM inventory_ledger
      WHERE entryType = 'in'
      ORDER BY productId ASC, entryDate ASC, id ASC`,
    []
  );

  const layersByProduct: Record<string, any[]> = {};
  for (const r of inRows || []) {
    const pid = String(r.productId);
    if (!layersByProduct[pid]) layersByProduct[pid] = [];
    layersByProduct[pid].push({
      entryDate: String(r.entryDate),
      remaining: Number(r.quantity || 0),
      unitCost: Number(r.unitCost || 0),
    });
  }

  for (const pid of Object.keys(layersByProduct)) {
    let remainingOut = Number(outMap[pid] || 0);
    const layers = layersByProduct[pid];
    for (const L of layers) {
      if (remainingOut <= 0) break;
      const take = Math.min(L.remaining, remainingOut);
      L.remaining -= take;
      remainingOut -= take;
    }
    layersByProduct[pid] = layers.filter((l) => l.remaining > 0.0000001);
  }

  const now = moment();
  const result: any[] = [];
  for (const p of products || []) {
    const pid = String(p.id);
    const layers = layersByProduct[pid] || [];
    const totalQty = layers.reduce((s, l) => s + Number(l.remaining || 0), 0);
    const totalValue = layers.reduce((s, l) => s + Number(l.remaining || 0) * Number(l.unitCost || 0), 0);
    const avgCost = totalQty > 0 ? totalValue / totalQty : 0;

    const aging = layers.map((l) => {
      const days = Math.max(0, now.diff(moment(l.entryDate), 'days'));
      return {
        entryDate: l.entryDate,
        remainingQty: l.remaining,
        unitCost: l.unitCost,
        value: Number(l.remaining) * Number(l.unitCost),
        ageDays: days,
      };
    });

    result.push({
      productId: p.id,
      name: p.name,
      onHandQty: totalQty,
      onHandValue: totalValue,
      avgCost,
      layers: aging,
    });
  }

  return result;
};

export const getMonthlyProfitByProductFifo = async (monthsBack: number = 6) => {
  await getDbInstance();
  const m = Math.max(1, Math.min(24, Math.floor(Number(monthsBack || 6))));
  const startMonth = moment().startOf('month').subtract(m - 1, 'month').format('YYYY-MM');

  const sales = await allAsync(
    `SELECT itemId as productId, itemName, SUM(quantity) as qty, SUM(totalPrice) as revenue,
            substr(transactionDate, 1, 7) as month
       FROM sales_transactions
      WHERE itemType = 'inventory'
        AND substr(transactionDate, 1, 7) >= ?
      GROUP BY itemId, itemName, substr(transactionDate, 1, 7)
      ORDER BY month ASC`,
    [startMonth]
  );

  const rows: any[] = [];
  for (const r of sales || []) {
    const pid = Number(r.productId);
    const qty = Number(r.qty || 0);
    const revenue = Number(r.revenue || 0);
    const month = String(r.month);

    const end = moment(month + '-01').endOf('month').toDate().toISOString();
    const prevEnd = moment(month + '-01').subtract(1, 'month').endOf('month').toDate().toISOString();

    const soldToEnd = await getAsync(
      `SELECT SUM(quantity) as q FROM inventory_ledger
        WHERE productId = ? AND entryType = 'out' AND entryDate <= ?`,
      [pid, end]
    );
    const soldToPrev = await getAsync(
      `SELECT SUM(quantity) as q FROM inventory_ledger
        WHERE productId = ? AND entryType = 'out' AND entryDate <= ?`,
      [pid, prevEnd]
    );

    const qtyToEnd = Number(soldToEnd?.q || 0);
    const qtyToPrev = Number(soldToPrev?.q || 0);

    const fifoEnd = await computeFifoCogsForProduct(pid, qtyToEnd);
    const fifoPrev = await computeFifoCogsForProduct(pid, qtyToPrev);

    const cogs = Number(fifoEnd.cogs || 0) - Number(fifoPrev.cogs || 0);
    const profit = revenue - cogs;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

    rows.push({
      month,
      productId: pid,
      name: String(r.itemName),
      qty,
      revenue,
      cogs,
      profit,
      marginPct,
    });
  }

  return rows;
};



export const createInventoryAdjustmentInDb = async (payload: {
  productId: number;
  direction: 'in'|'out';
  quantity: number;
  unitCost?: number; // required for 'in'
  reason?: string;
  entryDate: string; // ISO
}) => {
  await getDbInstance();
  const pid = Number(payload.productId);
  const dir = payload.direction;
  const qty = Number(payload.quantity || 0);
  if (!pid) throw new Error('productId نامعتبر');
  if (dir !== 'in' && dir !== 'out') throw new Error('direction نامعتبر');
  if (!Number.isFinite(qty) || qty <= 0) throw new Error('quantity نامعتبر');
  const unitCost = Number(payload.unitCost || 0);
  if (dir === 'in' && (!Number.isFinite(unitCost) || unitCost < 0)) throw new Error('unitCost نامعتبر');
  const entryDate = String(payload.entryDate || '').trim();
  if (!entryDate) throw new Error('entryDate خالی است.');

  const product = await getAsync(`SELECT id, stock_quantity FROM products WHERE id = ?`, [pid]);
  if (!product) throw new Error('محصول یافت نشد.');
  if (dir === 'out' && Number(product.stock_quantity || 0) < qty) throw new Error('موجودی برای تعدیل منفی کافی نیست.');

  await execAsync('BEGIN TRANSACTION;');
  try {
    const res = await runAsync(
      `INSERT INTO inventory_adjustments (productId, direction, quantity, unitCost, reason, entryDate)
       VALUES (?,?,?,?,?,?)`,
      [pid, dir, qty, dir === 'in' ? unitCost : 0, payload.reason ?? null, entryDate]
    );

    // stock update
    if (dir === 'in') {
      await runAsync(`UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?`, [qty, pid]);
    } else {
      await runAsync(`UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`, [qty, pid]);
    }

    // ledger record
    await recordInventoryInDb({
      productId: pid,
      entryType: dir,
      quantity: qty,
      unitCost: dir === 'in' ? unitCost : 0,
      refType: 'adjust',
      refId: Number((res as any)?.lastID || 0),
      entryDate,
    });

    await execAsync('COMMIT;');
    return { id: Number((res as any)?.lastID || 0) };
  } catch (e) {
    await execAsync('ROLLBACK;');
    throw e;
  }
};

export const getInventoryAgingBucketsFromDb = async () => {
  const rows = await getInventoryFifoAgingForAllProducts();
  const buckets = { b0_30: 0, b31_90: 0, b91_180: 0, b181_plus: 0 };
  for (const r of rows || []) {
    for (const l of (r.layers || [])) {
      const v = Number(l.value || 0);
      const d = Number(l.ageDays || 0);
      if (d <= 30) buckets.b0_30 += v;
      else if (d <= 90) buckets.b31_90 += v;
      else if (d <= 180) buckets.b91_180 += v;
      else buckets.b181_plus += v;
    }
  }
  return buckets;
};


export const listSalesProfitRowsFifo = async (fromIso: string, toIso: string) => {
  await getDbInstance();

  const safeNum = (v: any) => Number(v || 0);

  const ins = await allAsync(
    `SELECT id, productId, entryDate, quantity, unitCost
       FROM inventory_ledger
      WHERE entryType = 'in' AND entryDate <= ?
      ORDER BY entryDate ASC, id ASC`,
    [toIso]
  );

  const saleRows = await allAsync(
    `WITH invoice_lines AS (
       SELECT
         so.id AS saleId,
         so.transactionDate AS date,
         soi.itemId AS productId,
         COALESCE(soi.description, p.name, '—') AS name,
         COALESCE(soi.quantity, 0) AS qty,
         MAX(0, COALESCE(soi.totalPrice, (COALESCE(soi.quantity, 0) * COALESCE(soi.unitPrice, 0)) - COALESCE(soi.discountPerItem, 0))) AS lineNet,
         COALESCE(so.discount, 0) AS orderDiscount,
         soi.id AS lineId
       FROM sales_orders so
       JOIN sales_order_items soi ON so.id = soi.orderId
       LEFT JOIN products p ON p.id = soi.itemId
       WHERE soi.itemType = 'inventory'
         AND (so.status IS NULL OR so.status = 'active')
         AND date(so.transactionDate) BETWEEN date(?) AND date(?)
     ),
     order_bases AS (
       SELECT saleId, SUM(lineNet) AS orderBase FROM invoice_lines GROUP BY saleId
     )
     SELECT saleId, date, productId, name, qty, revenue
       FROM (
         SELECT
           il.saleId,
           il.date,
           il.productId,
           il.name,
           il.qty,
           MAX(0, il.lineNet - CASE WHEN COALESCE(ob.orderBase, 0) > 0 THEN il.orderDiscount * (il.lineNet / ob.orderBase) ELSE 0 END) AS revenue,
           0 AS sourceSort,
           il.lineId AS lineId
         FROM invoice_lines il
         LEFT JOIN order_bases ob ON ob.saleId = il.saleId

         UNION ALL

         SELECT
           ins.id AS saleId,
           COALESCE(ins.dateCreated, ins.installmentsStartDate) AS date,
           isi.itemId AS productId,
           COALESCE(isi.description, p.name, '—') AS name,
           COALESCE(isi.quantity, 0) AS qty,
           COALESCE(isi.totalPrice, 0) AS revenue,
           1 AS sourceSort,
           isi.id AS lineId
         FROM installment_sales ins
         JOIN installment_sale_items isi ON ins.id = isi.saleId
         LEFT JOIN products p ON p.id = isi.itemId
         WHERE isi.itemType = 'inventory'
           AND date(COALESCE(ins.dateCreated, ins.installmentsStartDate)) BETWEEN date(?) AND date(?)
       ) src
      ORDER BY date(date) ASC, sourceSort ASC, saleId ASC, lineId ASC`,
    [fromIso, toIso, fromIso, toIso]
  );

  if (!saleRows || saleRows.length === 0) return [];

  const layers: Record<string, any[]> = {};
  for (const r of ins || []) {
    const pid = String(r.productId);
    if (!layers[pid]) layers[pid] = [];
    layers[pid].push({ remaining: safeNum(r.quantity), unitCost: safeNum(r.unitCost) });
  }

  const takeFromLayers = (pid: number, qty: number) => {
    const key = String(pid);
    const L = layers[key] || [];
    let remaining = safeNum(qty);
    let cogs = 0;
    for (const layer of L) {
      if (remaining <= 0) break;
      const take = Math.min(safeNum(layer.remaining), remaining);
      if (take > 0) {
        cogs += take * safeNum(layer.unitCost);
        layer.remaining -= take;
        remaining -= take;
      }
    }
    layers[key] = (layers[key] || []).filter((x: any) => safeNum(x.remaining) > 0.0000001);
    return cogs;
  };

  const useFallbackCost = !ins || ins.length === 0;
  const results: any[] = [];

  for (const s of saleRows as any[]) {
    const pid = safeNum(s.productId);
    const qty = safeNum(s.qty);
    const revenue = safeNum(s.revenue);

    let cogs = 0;
    if (!useFallbackCost) {
      cogs = takeFromLayers(pid, qty);
    }
    if (!cogs) {
      const pRow = await getAsync(`SELECT purchasePrice FROM products WHERE id = ?`, [pid]);
      cogs = qty * safeNum(pRow?.purchasePrice);
    }

    const profit = revenue - cogs;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

    results.push({
      saleId: safeNum(s.saleId),
      date: String(s.date || '').slice(0, 19),
      productId: pid,
      name: String(s.name || '—'),
      qty,
      revenue,
      cogs,
      profit,
      marginPct,
    });
  }

  return results.sort((a, b) => String(a.date).localeCompare(String(b.date)));
};

export const getRealProfitPerProductFifo = async (fromIso: string, toIso: string) => {
  await getDbInstance();

  // Normalize incoming dates
  const fromMoment = moment(String(fromIso));
  const toMoment = moment(String(toIso));
  // Use DATE-only boundaries because many tables store YYYY-MM-DD
  const fromDate = (fromMoment.isValid() ? fromMoment : moment().startOf('month')).format('YYYY-MM-DD');
  const toDate = (toMoment.isValid() ? toMoment : moment().endOf('day')).format('YYYY-MM-DD');

  // Prefer the newer transaction tables if they have data (sales_transactions + inventory_ledger).
  // Some installs only populate sales_orders/sales_order_items and products.purchasePrice.
  const stCountRow = await getAsync(`SELECT COUNT(*) as c FROM sales_transactions`);
  const ledgerCountRow = await getAsync(`SELECT COUNT(*) as c FROM inventory_ledger`);
  const stCount = Number(stCountRow?.c || 0);
  const ledgerCount = Number(ledgerCountRow?.c || 0);

  // Helper to compute totals
  const safeNum = (v: any) => Number(v || 0);

  if (stCount > 0 && ledgerCount > 0) {
    // -----------------------------
    // FIFO via ledger (original path)
    // -----------------------------
    // Sales (inventory only) within period
    const sales = await allAsync(
      `SELECT itemId as productId, itemName as name,
              SUM(quantity) as qty,
              SUM(totalPrice) as revenue
         FROM sales_transactions
        WHERE itemType = 'inventory'
          AND date(transactionDate) >= date(?) AND date(transactionDate) <= date(?)
        GROUP BY itemId, itemName
        ORDER BY revenue DESC`,
      [fromDate, toDate]
    );

    const totalRevenueRow = await getAsync(
      `SELECT SUM(totalPrice) as total
         FROM sales_transactions
        WHERE itemType = 'inventory'
          AND date(transactionDate) >= date(?) AND date(transactionDate) <= date(?)`,
      [fromDate, toDate]
    );
    const totalRevenue = safeNum(totalRevenueRow?.total);

    const rows: any[] = [];
    for (const r of sales || []) {
      const pid = Number(r.productId);
      const qty = safeNum(r.qty);
      const revenue = safeNum(r.revenue);

      // FIFO COGS for period using ledger outs (date-only compare)
      const outToEnd = await getAsync(
        `SELECT SUM(quantity) as q
           FROM inventory_ledger
          WHERE productId = ?
            AND entryType = 'out'
            AND date(entryDate) <= date(?)`,
        [pid, toDate]
      );
      const outBeforeFrom = await getAsync(
        `SELECT SUM(quantity) as q
           FROM inventory_ledger
          WHERE productId = ?
            AND entryType = 'out'
            AND date(entryDate) < date(?)`,
        [pid, fromDate]
      );

      const qtyToEnd = safeNum(outToEnd?.q);
      const qtyToPrev = safeNum(outBeforeFrom?.q);

      const fifoEnd = await computeFifoCogsForProduct(pid, qtyToEnd);
      const fifoPrev = await computeFifoCogsForProduct(pid, qtyToPrev);

      const cogs = safeNum(fifoEnd?.cogs) - safeNum(fifoPrev?.cogs);

      const profit = revenue - cogs;
      const avgBuyPrice = qty > 0 ? (cogs / qty) : 0;
      const avgSellPrice = qty > 0 ? (revenue / qty) : 0;
      const shareOfRevenue = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
      const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

      rows.push({
        productId: pid,
        name: String(r.name),
        qty,
        revenue,
        cogs,
        profit,
        avgBuyPrice,
        avgSellPrice,
        shareOfRevenue,
        marginPct,
      });
    }

    return { from: fromDate, to: toDate, totalRevenue, items: rows };
  }

  // ---------------------------------
  // Fallback path: orders + product cost
  // ---------------------------------
  // Aggregate sales by product from sales_order_items + installment items.
  // تخفیف ردیفی و سهم تخفیف کلی فاکتور اینجا لحاظ می‌شود؛ وگرنه گزارش سود واقعی کالا در فاکتورهای چندقلمی بیش‌نمایی می‌شود.
  const sales = await allAsync(
    `WITH invoice_lines AS (
       SELECT
         so.id AS orderId,
         soi.itemId AS productId,
         COALESCE(soi.description, p.name, '—') AS name,
         COALESCE(soi.quantity, 0) AS qty,
         MAX(0, COALESCE(soi.totalPrice, (COALESCE(soi.quantity, 0) * COALESCE(soi.unitPrice, 0)) - COALESCE(soi.discountPerItem, 0))) AS lineNet,
         COALESCE(so.discount, 0) AS orderDiscount
       FROM sales_order_items soi
       JOIN sales_orders so ON so.id = soi.orderId
       LEFT JOIN products p ON p.id = soi.itemId
       WHERE soi.itemType = 'inventory'
         AND (so.status IS NULL OR so.status = 'active')
         AND date(so.transactionDate) >= date(?)
         AND date(so.transactionDate) <= date(?)
     ),
     order_bases AS (
       SELECT orderId, SUM(lineNet) AS orderBase FROM invoice_lines GROUP BY orderId
     ),
     normalized_sales AS (
       SELECT il.productId, il.name, il.qty,
              MAX(0, il.lineNet - CASE WHEN COALESCE(ob.orderBase, 0) > 0 THEN il.orderDiscount * (il.lineNet / ob.orderBase) ELSE 0 END) AS revenue
       FROM invoice_lines il
       LEFT JOIN order_bases ob ON ob.orderId = il.orderId
       UNION ALL
       SELECT
         isi.itemId as productId,
         COALESCE(isi.description, p.name, '—') as name,
         COALESCE(isi.quantity, 0) as qty,
         COALESCE(isi.totalPrice, 0) as revenue
       FROM installment_sale_items isi
       JOIN installment_sales ins ON ins.id = isi.saleId
       LEFT JOIN products p ON p.id = isi.itemId
       WHERE isi.itemType = 'inventory'
         AND date(COALESCE(ins.dateCreated, ins.installmentsStartDate)) >= date(?)
         AND date(COALESCE(ins.dateCreated, ins.installmentsStartDate)) <= date(?)
     )
     SELECT productId, name, SUM(qty) as qty, SUM(revenue) as revenue
       FROM normalized_sales
      GROUP BY productId, name
      ORDER BY revenue DESC`,
    [fromDate, toDate, fromDate, toDate]
  );

  const totalRevenueRow = await getAsync(
    `WITH invoice_lines AS (
       SELECT
         so.id AS orderId,
         MAX(0, COALESCE(soi.totalPrice, (COALESCE(soi.quantity, 0) * COALESCE(soi.unitPrice, 0)) - COALESCE(soi.discountPerItem, 0))) AS lineNet,
         COALESCE(so.discount, 0) AS orderDiscount
       FROM sales_order_items soi
       JOIN sales_orders so ON so.id = soi.orderId
       WHERE soi.itemType = 'inventory'
         AND (so.status IS NULL OR so.status = 'active')
         AND date(so.transactionDate) >= date(?)
         AND date(so.transactionDate) <= date(?)
     ),
     order_bases AS (
       SELECT orderId, SUM(lineNet) AS orderBase FROM invoice_lines GROUP BY orderId
     ),
     normalized_sales AS (
       SELECT MAX(0, il.lineNet - CASE WHEN COALESCE(ob.orderBase, 0) > 0 THEN il.orderDiscount * (il.lineNet / ob.orderBase) ELSE 0 END) AS revenue
       FROM invoice_lines il
       LEFT JOIN order_bases ob ON ob.orderId = il.orderId
       UNION ALL
       SELECT COALESCE(isi.totalPrice, 0) as revenue
       FROM installment_sale_items isi
       JOIN installment_sales ins ON ins.id = isi.saleId
       WHERE isi.itemType = 'inventory'
         AND date(COALESCE(ins.dateCreated, ins.installmentsStartDate)) >= date(?)
         AND date(COALESCE(ins.dateCreated, ins.installmentsStartDate)) <= date(?)
     )
     SELECT SUM(revenue) as total FROM normalized_sales`,
    [fromDate, toDate, fromDate, toDate]
  );
  const totalRevenue = safeNum(totalRevenueRow?.total);

  const rows: any[] = [];
  for (const r of sales || []) {
    const pid = Number(r.productId);
    const qty = safeNum(r.qty);
    const revenue = safeNum(r.revenue);

    // Use products.purchasePrice as cost baseline if available
    const pRow = await getAsync(
      `SELECT purchasePrice as buyPrice
         FROM products
        WHERE id = ?`,
      [pid]
    );
    const buyPrice = safeNum(pRow?.buyPrice);
    const cogs = qty * buyPrice;

    const profit = revenue - cogs;
    const avgBuyPrice = qty > 0 ? buyPrice : 0;
    const avgSellPrice = qty > 0 ? (revenue / qty) : 0;
    const shareOfRevenue = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

    rows.push({
      productId: pid,
      name: String(r.name),
      qty,
      revenue,
      cogs,
      profit,
      avgBuyPrice,
      avgSellPrice,
      shareOfRevenue,
      marginPct,
    });
  }

  return { from: fromDate, to: toDate, totalRevenue, items: rows };
};



// =====================================================
// Reports: Saved Filters & Scheduling (PageKit "CEO-level" polish)
// =====================================================

type SavedFilterRow = {
  id: number;
  userId: number;
  reportKey: string;
  name: string;
  filtersJson: string;
  createdAt: string;
  updatedAt: string;
};

const ensureReportSavedFiltersTable = async () => {
  await getDbInstance();
  await runAsync(`
    CREATE TABLE IF NOT EXISTS report_saved_filters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      reportKey TEXT NOT NULL,
      name TEXT NOT NULL,
      filtersJson TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      UNIQUE(userId, reportKey, name)
    );
  `);
};

export const listReportSavedFilters = async (userId: number, reportKey: string) => {
  await ensureReportSavedFiltersTable();
  return (await allAsync(
    `SELECT id, userId, reportKey, name, filtersJson, createdAt, updatedAt
     FROM report_saved_filters
     WHERE userId = ? AND reportKey = ?
     ORDER BY createdAt DESC`,
    [userId, reportKey]
  )) as SavedFilterRow[];
};

export const createOrReplaceReportSavedFilter = async (userId: number, reportKey: string, name: string, filters: any) => {
  await ensureReportSavedFiltersTable();
  const filtersJson = JSON.stringify(filters ?? {});
  // Upsert by UNIQUE(userId, reportKey, name)
  await runAsync(
    `INSERT INTO report_saved_filters (userId, reportKey, name, filtersJson)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(userId, reportKey, name) DO UPDATE SET
       filtersJson = excluded.filtersJson,
       updatedAt = (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))`,
    [userId, reportKey, name, filtersJson]
  );
  const row = await getAsync(
    `SELECT id, userId, reportKey, name, filtersJson, createdAt, updatedAt
     FROM report_saved_filters
     WHERE userId = ? AND reportKey = ? AND name = ?`,
    [userId, reportKey, name]
  );
  return row as SavedFilterRow;
};

export const deleteReportSavedFilter = async (userId: number, id: number) => {
  await ensureReportSavedFiltersTable();
  await runAsync(`DELETE FROM report_saved_filters WHERE id = ? AND userId = ?`, [id, userId]);
  return { success: true };
};

// =====================================================
// Reports: New CFO/CEO-grade reports
// =====================================================

export type InventoryTurnoverReport = {
  periodDays: number;
  cogs: number;
  avgInventoryValue: number;
  inventoryTurnover: number;
  daysOfInventory: number;
  diagnostics?: {
    fromDate: string;
    toDate: string;
    fromJalali: string;
    toJalali: string;
    endValue: number;
    purchaseValue: number;
    orderCogs: number;
    installmentCogs: number;
    legacyCogs: number;
    ledgerCogs: number;
    productsWithStock: number;
    productsWithCost: number;
    productsWithSellingFallback: number;
  };
};

export const getInventoryTurnoverReport = async (fromISO: string, toISO: string): Promise<InventoryTurnoverReport> => {
  await getDbInstance();

  const safeNum = (v: any) => {
    const n = Number(v || 0);
    return Number.isFinite(n) ? n : 0;
  };

  const fromMoment = moment(String(fromISO), ['YYYY-MM-DD', moment.ISO_8601], true);
  const toMoment = moment(String(toISO), ['YYYY-MM-DD', moment.ISO_8601], true);
  const fromDate = (fromMoment.isValid() ? fromMoment : moment().startOf('jMonth')).format('YYYY-MM-DD');
  const toDate = (toMoment.isValid() ? toMoment : moment().endOf('day')).format('YYYY-MM-DD');
  const fromJalali = moment(fromDate, 'YYYY-MM-DD').locale('en').format('jYYYY/jMM/jDD');
  const toJalali = moment(toDate, 'YYYY-MM-DD').locale('en').format('jYYYY/jMM/jDD');

  const periodDays = Math.max(1, moment(toDate).diff(moment(fromDate), 'days') + 1);

  // Some project tables store Gregorian ISO dates (YYYY-MM-DD) and some older/local flows store Jalali dates (jYYYY/jMM/jDD).
  // SQLite date() cannot parse Jalali strings, so every date filter accepts BOTH forms.
  const dateClause = (expr: string) => `(
    date(${expr}) BETWEEN date(?) AND date(?)
    OR REPLACE(SUBSTR(COALESCE(${expr}, ''), 1, 10), '-', '/') BETWEEN ? AND ?
  )`;
  const rangeParams = () => [fromDate, toDate, fromJalali, toJalali];

  // A missing purchasePrice should not make the whole report zero. Many installs created inventory with purchasePrice=0.
  // We first use cost, then fallback to sellingPrice as an estimated inventory basis. This keeps the report useful while
  // diagnostics below still reveal that the cost basis is incomplete.
  const productBasis = `COALESCE(NULLIF(p.purchasePrice, 0), NULLIF(p.sellingPrice, 0), 0)`;

  const productStats: any = await getAsync(
    `SELECT
        COALESCE(SUM(CASE WHEN COALESCE(stock_quantity, 0) > 0 THEN 1 ELSE 0 END), 0) as productsWithStock,
        COALESCE(SUM(CASE WHEN COALESCE(stock_quantity, 0) > 0 AND COALESCE(purchasePrice, 0) > 0 THEN 1 ELSE 0 END), 0) as productsWithCost,
        COALESCE(SUM(CASE WHEN COALESCE(stock_quantity, 0) > 0 AND COALESCE(purchasePrice, 0) = 0 AND COALESCE(sellingPrice, 0) > 0 THEN 1 ELSE 0 END), 0) as productsWithSellingFallback,
        COALESCE(SUM(COALESCE(stock_quantity, 0) * COALESCE(NULLIF(purchasePrice, 0), NULLIF(sellingPrice, 0), 0)), 0) as invValue
       FROM products`,
    []
  );
  const endValue = safeNum(productStats?.invValue);

  const purchaseRow: any = await getAsync(
    `SELECT COALESCE(SUM(
        COALESCE(NULLIF(pi.lineTotal, 0), COALESCE(pi.quantity, 0) * COALESCE(NULLIF(pi.unitCost, 0), ${productBasis}, 0))
      ), 0) as purchaseValue
       FROM purchase_items pi
       JOIN purchases pu ON pu.id = pi.purchaseId
       LEFT JOIN products p ON p.id = pi.productId
      WHERE ${dateClause('pu.purchaseDate')}`,
    rangeParams()
  );

  const ledgerInRow: any = await getAsync(
    `SELECT COALESCE(SUM(COALESCE(il.quantity, 0) * COALESCE(NULLIF(il.unitCost, 0), ${productBasis}, 0)), 0) as purchaseValue
       FROM inventory_ledger il
       LEFT JOIN products p ON p.id = il.productId
      WHERE il.entryType = 'in'
        AND ${dateClause('il.entryDate')}`,
    rangeParams()
  );

  const purchaseValue = Math.max(safeNum(purchaseRow?.purchaseValue), safeNum(ledgerInRow?.purchaseValue));

  const orderCogsRow: any = await getAsync(
    `SELECT COALESCE(SUM(
        COALESCE(soi.quantity, 0) * COALESCE(
          NULLIF(soi.buyPrice, 0),
          ${productBasis},
          CASE WHEN COALESCE(soi.quantity, 0) > 0 THEN COALESCE(soi.totalPrice, 0) / COALESCE(soi.quantity, 1) ELSE 0 END,
          0
        )
      ), 0) as cogs
       FROM sales_order_items soi
       JOIN sales_orders so ON so.id = soi.orderId
       LEFT JOIN products p ON p.id = soi.itemId
      WHERE soi.itemType = 'inventory'
        AND (so.status IS NULL OR so.status = 'active')
        AND ${dateClause('so.transactionDate')}`,
    rangeParams()
  );

  const installmentCogsRow: any = await getAsync(
    `SELECT COALESCE(SUM(
        COALESCE(isi.quantity, 0) * COALESCE(
          NULLIF(isi.buyPrice, 0),
          ${productBasis},
          CASE WHEN COALESCE(isi.quantity, 0) > 0 THEN COALESCE(isi.totalPrice, 0) / COALESCE(isi.quantity, 1) ELSE 0 END,
          0
        )
      ), 0) as cogs
       FROM installment_sale_items isi
       JOIN installment_sales ins ON ins.id = isi.saleId
       LEFT JOIN products p ON p.id = isi.itemId
      WHERE isi.itemType = 'inventory'
        AND ${dateClause('COALESCE(ins.saleDate, ins.dateCreated, ins.installmentsStartDate)')}`,
    rangeParams()
  );

  const legacyCogsRow: any = await getAsync(
    `SELECT COALESCE(SUM(
        COALESCE(st.quantity, 0) * COALESCE(
          NULLIF(st.buyPrice, 0),
          ${productBasis},
          CASE WHEN COALESCE(st.quantity, 0) > 0 THEN COALESCE(st.totalPrice, 0) / COALESCE(st.quantity, 1) ELSE 0 END,
          0
        )
      ), 0) as cogs
       FROM sales_transactions st
       LEFT JOIN products p ON p.id = st.itemId
      WHERE st.itemType = 'inventory'
        AND ${dateClause('st.transactionDate')}`,
    rangeParams()
  );

  const ledgerOutCogsRow: any = await getAsync(
    `SELECT COALESCE(SUM(COALESCE(il.quantity, 0) * COALESCE(NULLIF(il.unitCost, 0), ${productBasis}, 0)), 0) as cogs
       FROM inventory_ledger il
       LEFT JOIN products p ON p.id = il.productId
      WHERE il.entryType = 'out'
        AND (il.refType IS NULL OR il.refType IN ('sale', 'adjust'))
        AND ${dateClause('il.entryDate')}`,
    rangeParams()
  );

  const orderCogs = safeNum(orderCogsRow?.cogs);
  const installmentCogs = safeNum(installmentCogsRow?.cogs);
  const legacyCogs = safeNum(legacyCogsRow?.cogs);
  const ledgerCogs = safeNum(ledgerOutCogsRow?.cogs);
  const salesSourcesCogs = orderCogs + installmentCogs + legacyCogs;
  const cogs = salesSourcesCogs > 0 ? salesSourcesCogs : ledgerCogs;

  const startValue = Math.max(0, endValue - purchaseValue + cogs);
  let avgInventoryValue = Math.max(0, (startValue + endValue) / 2);

  // Last-resort fallback: if the stock valuation is absent but we do have sales movement, use the COGS basis as
  // an operational denominator so the report does not collapse to all-zero. This is flagged in diagnostics.
  if (avgInventoryValue <= 0 && cogs > 0) avgInventoryValue = cogs;

  const inventoryTurnover = avgInventoryValue > 0 ? (cogs / avgInventoryValue) : 0;
  const daysOfInventory = cogs > 0 && avgInventoryValue > 0 ? (avgInventoryValue / cogs) * periodDays : 0;

  return {
    periodDays,
    cogs,
    avgInventoryValue,
    inventoryTurnover,
    daysOfInventory,
    diagnostics: {
      fromDate,
      toDate,
      fromJalali,
      toJalali,
      endValue,
      purchaseValue,
      orderCogs,
      installmentCogs,
      legacyCogs,
      ledgerCogs,
      productsWithStock: safeNum(productStats?.productsWithStock),
      productsWithCost: safeNum(productStats?.productsWithCost),
      productsWithSellingFallback: safeNum(productStats?.productsWithSellingFallback),
    },
  };
};

export type DeadStockItem = {
  productId: number;
  name: string;
  categoryName?: string | null;
  stock: number;
  purchasePrice: number;
  value: number;
  lastSaleDate?: string | null;
  daysSinceLastSale?: number | null;
};

export const getDeadStockReport = async (days: number): Promise<DeadStockItem[]> => {
  await getDbInstance();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // last sale date from inventory_ledger out(sale)
  const rows: any[] = await allAsync(
    `
    SELECT
      p.id as productId,
      p.name,
      c.name as categoryName,
      p.stock_quantity as stock,
      p.purchasePrice,
      (p.stock_quantity * p.purchasePrice) as value,
      (SELECT MAX(entryDate) FROM inventory_ledger il WHERE il.productId = p.id AND il.entryType='out' AND il.refType='sale') as lastSaleDate
    FROM products p
    LEFT JOIN categories c ON c.id = p.categoryId
    WHERE p.stock_quantity > 0
    `,
    []
  );

  return rows
    .map((r) => {
      const last = r.lastSaleDate ? new Date(r.lastSaleDate).getTime() : null;
      const diffDays = last ? Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24)) : null;
      return {
        productId: Number(r.productId),
        name: String(r.name),
        categoryName: r.categoryName ?? null,
        stock: Number(r.stock ?? 0),
        purchasePrice: Number(r.purchasePrice ?? 0),
        value: Number(r.value ?? 0),
        lastSaleDate: r.lastSaleDate ?? null,
        daysSinceLastSale: diffDays,
      } as DeadStockItem;
    })
    .filter((r) => !r.lastSaleDate || new Date(r.lastSaleDate).toISOString() < cutoff)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
};

export type AbcItem = {
  productId: number;
  name: string;
  categoryName?: string | null;
  sales: number;
  cogs: number;
  profit: number;
  share: number;
  cumShare: number;
  bucket: 'A' | 'B' | 'C';
};

export const getAbcReport = async (fromISO: string, toISO: string, metric: 'sales' | 'profit' = 'sales'): Promise<AbcItem[]> => {
  await getDbInstance();

  // Aggregate from sales_order_items (inventory only), join products purchasePrice for cogs approximation
  const rows: any[] = await allAsync(
    `
    SELECT
      x.productId,
      x.name,
      x.categoryName,
      SUM(x.sales) as sales,
      SUM(x.cogs) as cogs
    FROM (
      SELECT
        p.id as productId,
        p.name,
        c.name as categoryName,
        ((COALESCE(soi.quantity,0) * COALESCE(soi.unitPrice,0)) - COALESCE(soi.discountPerItem,0)) as sales,
        (COALESCE(soi.quantity,0) * COALESCE(p.purchasePrice,0)) as cogs
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.orderId
      JOIN products p ON p.id = soi.itemId
      LEFT JOIN categories c ON c.id = p.categoryId
      WHERE soi.itemType = 'inventory'
        AND so.transactionDate BETWEEN ? AND ?

      UNION ALL

      SELECT
        p.id as productId,
        p.name,
        c.name as categoryName,
        COALESCE(isi.totalPrice,0) as sales,
        (COALESCE(isi.quantity,0) * COALESCE(p.purchasePrice,0)) as cogs
      FROM installment_sale_items isi
      JOIN installment_sales ins ON ins.id = isi.saleId
      JOIN products p ON p.id = isi.itemId
      LEFT JOIN categories c ON c.id = p.categoryId
      WHERE isi.itemType = 'inventory'
        AND date(COALESCE(ins.dateCreated, ins.installmentsStartDate)) BETWEEN ? AND ?
    ) x
    GROUP BY x.productId, x.name, x.categoryName
    `,
    [fromISO.slice(0,10), toISO.slice(0,10)]
  );

  const items = rows.map((r) => {
    const sales = Number(r.sales ?? 0);
    const cogs = Number(r.cogs ?? 0);
    const profit = sales - cogs;
    return {
      productId: Number(r.productId),
      name: String(r.name),
      categoryName: r.categoryName ?? null,
      sales,
      cogs,
      profit,
      share: 0,
      cumShare: 0,
      bucket: 'C' as const,
    };
  });

  const total = items.reduce((acc, it) => acc + (metric === 'sales' ? it.sales : it.profit), 0) || 1;

  items.sort((a, b) => (metric === 'sales' ? b.sales - a.sales : b.profit - a.profit));

  let cum = 0;
  for (const it of items) {
    const v = metric === 'sales' ? it.sales : it.profit;
    const share = v / total;
    cum += share;
    it.share = share;
    it.cumShare = cum;
    it.bucket = cum <= 0.8 ? 'A' : cum <= 0.95 ? 'B' : 'C';
  }

  return items;
};

export type AgingBucket = {
  bucket: '0-30' | '31-60' | '61-90' | '90+';
  amount: number;
};

export type AgingReceivableRow = {
  customerId: number;
  fullName: string;
  phoneNumber?: string | null;
  totalOutstanding: number;
  buckets: AgingBucket[];
};

export const getAgingReceivablesReport = async (): Promise<AgingReceivableRow[]> => {
  await getDbInstance();

  // Pull ledger entries per customer, then allocate outstanding using FIFO (oldest debits first, credits reduce)
  const customers: any[] = await allAsync(`SELECT id, fullName, phoneNumber FROM customers`, []);

  const results: AgingReceivableRow[] = [];
  for (const c of customers) {
    const rows: any[] = await allAsync(
      `SELECT transactionDate, description, debit, credit
       FROM customer_ledger
       WHERE customerId = ?
       ORDER BY date(substr(transactionDate, 1, 10)) ASC, id ASC`,
      [c.id]
    );

    let creditPool = 0;
    const openDebits: { date: string; amount: number }[] = [];

    for (const r of rows) {
      const debit = Number(r.debit ?? 0);
      const credit = Number(r.credit ?? 0);
      if (credit > 0) creditPool += credit;

      if (debit > 0) {
        let remaining = debit;
        // Apply existing credit pool
        if (creditPool > 0) {
          const used = Math.min(creditPool, remaining);
          creditPool -= used;
          remaining -= used;
        }
        if (remaining > 0) openDebits.push({ date: String(r.transactionDate), amount: remaining });
      }

      // Extra credits can offset existing open debits (in case credits come later)
      while (creditPool > 0 && openDebits.length > 0) {
        const d = openDebits[0];
        const used = Math.min(creditPool, d.amount);
        creditPool -= used;
        d.amount -= used;
        if (d.amount <= 0.00001) openDebits.shift();
      }
    }

    const now = Date.now();
    const buckets: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };

    for (const d of openDebits) {
      const ageDays = Math.floor((now - new Date(d.date).getTime()) / (1000 * 60 * 60 * 24));
      const b = ageDays <= 30 ? '0-30' : ageDays <= 60 ? '31-60' : ageDays <= 90 ? '61-90' : '90+';
      buckets[b] += d.amount;
    }

    const totalOutstanding = Object.values(buckets).reduce((a, b) => a + b, 0);

    if (totalOutstanding > 0.00001) {
      results.push({
        customerId: Number(c.id),
        fullName: String(c.fullName),
        phoneNumber: c.phoneNumber ?? null,
        totalOutstanding,
        buckets: (Object.keys(buckets) as any).map((k: any) => ({ bucket: k, amount: buckets[k] })) as AgingBucket[],
      });
    }
  }

  results.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  return results;
};

export type CashflowDay = {
  date: string; // YYYY-MM-DD
  inflow: number;
  outflow: number;
  net: number;
};

export type CashflowReport = {
  days: CashflowDay[];
  totals: { inflow: number; outflow: number; net: number };
  forecast: CashflowDay[];
};

export const getCashflowReport = async (fromISO: string, toISO: string, forecastDays: number = 30): Promise<CashflowReport> => {
  await getDbInstance();

  const from = fromISO.slice(0,10);
  const to = toISO.slice(0,10);

  // In some installs, not all modules/tables exist yet. Prefer returning an empty report
  // instead of throwing 500 for missing tables.
  const safeAll = async (sql: string, params: any[]) => {
    try {
      return await allAsync(sql, params);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('no such table')) return [] as any[];
      throw e;
    }
  };

  const hasColumn = async (table: string, col: string) => {
    try {
      const rows: any[] = await allAsync(`PRAGMA table_info(${table});`);
      return Array.isArray(rows) && rows.some((r: any) => String(r?.name) === col);
    } catch {
      return false;
    }
  };

  // Inflow: only actual collected money.
  // Credit invoices create receivables, not cashflow. Cash orders and balanced cash sales are counted here;
  // credit/installment collections are counted from customer_ledger and installment_transactions.
  const salesRows: any[] = await safeAll(
    `SELECT substr(transactionDate,1,10) as date, SUM(grandTotal) as amount
       FROM sales_orders
      WHERE substr(transactionDate,1,10) BETWEEN ? AND ?
        AND (status IS NULL OR status = 'active')
        AND LOWER(COALESCE(paymentMethod, 'cash')) = 'cash'
      GROUP BY substr(transactionDate,1,10)`,
    [from, to]
  );

  const legacyCashSalesRows: any[] = await safeAll(
    `SELECT substr(transactionDate,1,10) as date, SUM(totalPrice) as amount
       FROM sales_transactions
      WHERE substr(transactionDate,1,10) BETWEEN ? AND ?
        AND LOWER(COALESCE(paymentMethod, 'cash')) = 'cash'
      GROUP BY substr(transactionDate,1,10)`,
    [from, to]
  );

  const customerReceiptRows: any[] = await safeAll(
    `SELECT substr(transactionDate,1,10) as date, SUM(COALESCE(credit,0)) as amount
       FROM customer_ledger
      WHERE substr(transactionDate,1,10) BETWEEN ? AND ?
        AND COALESCE(credit,0) > 0
        AND COALESCE(debit,0) = 0
      GROUP BY substr(transactionDate,1,10)`,
    [from, to]
  );

  const instRows: any[] = await safeAll(
    `SELECT substr(it.payment_date,1,10) as date, SUM(COALESCE(it.amount_paid,0)) as amount
       FROM installment_transactions it
      WHERE substr(it.payment_date,1,10) BETWEEN ? AND ?
      GROUP BY substr(it.payment_date,1,10)`,
    [from, to]
  );

  // Outflow: expenses + inventory_ledger in(purchase/adjust) cost
  const expRows: any[] = await safeAll(
    `SELECT substr(expenseDate,1,10) as date, SUM(amount) as amount
     FROM expenses
     WHERE substr(expenseDate,1,10) BETWEEN ? AND ?
     GROUP BY substr(expenseDate,1,10)`,
    [from, to]
  );

  const invInRows: any[] = await safeAll(
    `SELECT substr(entryDate,1,10) as date,
            SUM(CASE WHEN entryType='in' THEN quantity * COALESCE(unitCost,0) ELSE 0 END) as amount
     FROM inventory_ledger
     WHERE substr(entryDate,1,10) BETWEEN ? AND ?
     GROUP BY substr(entryDate,1,10)`,
    [from, to]
  );

  const map: Record<string, { inflow: number; outflow: number }> = {};
  const add = (date: string, inflow: number, outflow: number) => {
    const d = String(date).slice(0,10);
    if (!map[d]) map[d] = { inflow: 0, outflow: 0 };
    map[d].inflow += inflow;
    map[d].outflow += outflow;
  };

  for (const r of salesRows) add(r.date, Number(r.amount ?? 0), 0);
  for (const r of legacyCashSalesRows) add(r.date, Number(r.amount ?? 0), 0);
  for (const r of customerReceiptRows) add(r.date, Number(r.amount ?? 0), 0);
  for (const r of instRows) add(r.date, Number(r.amount ?? 0), 0);
  for (const r of expRows) add(r.date, 0, Number(r.amount ?? 0));
  for (const r of invInRows) add(r.date, 0, Number(r.amount ?? 0));

  // Build date range days
  const days: CashflowDay[] = [];
  const start = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0,10);
    const inflow = map[key]?.inflow ?? 0;
    const outflow = map[key]?.outflow ?? 0;
    days.push({ date: key, inflow, outflow, net: inflow - outflow });
  }

  const totals = days.reduce((acc, x) => {
    acc.inflow += x.inflow;
    acc.outflow += x.outflow;
    acc.net += x.net;
    return acc;
  }, { inflow: 0, outflow: 0, net: 0 });

  // Forecast: simple moving average of last 30 days
  const tail = days.slice(-30);
  const avgIn = tail.length ? tail.reduce((a, x) => a + x.inflow, 0) / tail.length : 0;
  const avgOut = tail.length ? tail.reduce((a, x) => a + x.outflow, 0) / tail.length : 0;

  const forecast: CashflowDay[] = [];
  const lastDate = new Date((days[days.length - 1]?.date ?? to) + 'T00:00:00Z');
  for (let i = 1; i <= forecastDays; i++) {
    const d = new Date(lastDate);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0,10);
    forecast.push({ date: key, inflow: avgIn, outflow: avgOut, net: avgIn - avgOut });
  }

  return { days, totals, forecast };
};


// ==========================================
// Telegram Link Requests (Model A) helpers
// ==========================================

export const normalizeIranPhone = (input: string): string => {
  const raw = String(input || '').trim();
  if (!raw) return '';
  // keep digits only
  let d = raw.replace(/[^0-9۰-۹٠-٩]/g, '');
  // convert Persian/Arabic digits to latin
  d = d
    .replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
    .replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));

  // +98..., 98..., 0098...
  if (d.startsWith('0098')) d = d.slice(4);
  if (d.startsWith('98')) d = d.slice(2);
  if (d.startsWith('0')) return d;
  // if user sent 9xxxxxxxxx
  if (d.length === 10 && d.startsWith('9')) return '0' + d;
  return d;
};

export const upsertTelegramLinkRequest = async (opts: {
  phone: string;
  chatId: string;
  telegramUserId: string;
  codeHash: string;
  expiresAtISO: string;
}): Promise<{ id: number }> => {
  const phone = normalizeIranPhone(opts.phone);
  const chatId = String(opts.chatId || '').trim();
  const telegramUserId = String(opts.telegramUserId || '').trim();
  if (!phone || !chatId || !telegramUserId) throw new Error('Invalid link request');

  // Upsert by chat_id
  await runAsync(
    `INSERT INTO telegram_link_requests (phone, chat_id, telegram_user_id, code_hash, expires_at, attempts, status, last_error)
     VALUES (?,?,?,?,?,0,'pending',NULL)
     ON CONFLICT(chat_id) DO UPDATE SET
       phone=excluded.phone,
       telegram_user_id=excluded.telegram_user_id,
       code_hash=excluded.code_hash,
       expires_at=excluded.expires_at,
       attempts=0,
       status='pending',
       last_error=NULL,
       verified_at=NULL`,
    [phone, chatId, telegramUserId, opts.codeHash, opts.expiresAtISO]
  );
  const row = await getAsync(`SELECT id FROM telegram_link_requests WHERE chat_id=? LIMIT 1`, [chatId]);
  return { id: Number(row?.id || 0) };
};

export const getPendingTelegramLinkRequestByChatId = async (chatId: string): Promise<TelegramLinkRequestRow | null> => {
  const id = String(chatId || '').trim();
  if (!id) return null;
  // expire old ones lazily
  await runAsync(
    `UPDATE telegram_link_requests SET status='expired'
     WHERE status='pending' AND expires_at < ?`,
    [moment().toISOString()]
  ).catch(() => {});

  const row = await getAsync(
    `SELECT * FROM telegram_link_requests WHERE chat_id=? AND status='pending' LIMIT 1`,
    [id]
  );
  return (row as any) || null;
};

export const bumpTelegramLinkRequestAttempt = async (id: number, errMsg?: string | null) => {
  await runAsync(
    `UPDATE telegram_link_requests
     SET attempts = attempts + 1,
         last_error = COALESCE(?, last_error)
     WHERE id=?`,
    [errMsg ?? null, Number(id)]
  );
};

export const markTelegramLinkRequestVerified = async (id: number) => {
  await runAsync(
    `UPDATE telegram_link_requests
     SET status='verified', verified_at=?
     WHERE id=?`,
    [moment().toISOString(), Number(id)]
  );
};

export const linkCustomerTelegramByPhone = async (opts: {
  phone: string;
  chatId: string;
  telegramUserId: string;
}) => {
  const phone = normalizeIranPhone(opts.phone);
  const chatId = String(opts.chatId || '').trim();
  const telegramUserId = String(opts.telegramUserId || '').trim();
  if (!phone || !chatId || !telegramUserId) throw new Error('Invalid link args');

  const c = await getAsync(`SELECT id FROM customers WHERE phoneNumber=? LIMIT 1`, [phone]);
  const customerId = Number(c?.id || 0);
  if (!customerId) return { ok: false as const, reason: 'not_found' as const };

  const now = moment().toISOString();
  // Keep both camel + snake to remain backward compatible with existing UI code.
  await runAsync(
    `UPDATE customers
     SET telegramChatId=?, telegram_chat_id=?, telegram_user_id=?, telegram_linked_at=?, telegram_opted_out=0
     WHERE id=?`,
    [chatId, chatId, telegramUserId, now, customerId]
  );

  return { ok: true as const, customerId };
};

export const getLinkedPartnerByChatId = async (chatId: string): Promise<any | null> => {
  const id = String(chatId || '').trim();
  if (!id) return null;
  try {
    return await getAsync(
      `SELECT id, partnerName, phoneNumber, telegramChatId, telegram_linked_at
       FROM partners
       WHERE telegramChatId=?
       LIMIT 1`,
      [id]
    );
  } catch {
    return await getAsync(
      `SELECT id, partnerName, phoneNumber, telegramChatId
       FROM partners
       WHERE telegramChatId=?
       LIMIT 1`,
      [id]
    );
  }
};

export const linkPartnerTelegramByPhone = async (opts: {
  phone: string;
  chatId: string;
}) => {
  const phone = normalizeIranPhone(opts.phone);
  const chatId = String(opts.chatId || '').trim();
  if (!phone || !chatId) throw new Error('Invalid partner link args');

  const p = await getAsync(`SELECT id FROM partners WHERE phoneNumber=? LIMIT 1`, [phone]);
  const partnerId = Number(p?.id || 0);
  if (!partnerId) return { ok: false as const, reason: 'not_found' as const };

  const now = moment().toISOString();
  await runAsync(
    `UPDATE partners
     SET telegramChatId=?, telegram_linked_at=?
     WHERE id=?`,
    [chatId, now, partnerId]
  );

  return { ok: true as const, partnerId };
};

export const unlinkPartnerTelegram = async (partnerId: number) => {
  await runAsync(
    `UPDATE partners
     SET telegramChatId=NULL,
         telegram_linked_at=NULL
     WHERE id=?`,
    [Number(partnerId)]
  ).catch(() => {});
};

const sha256Hex = (s: string) => crypto.createHash('sha256').update(String(s)).digest('hex');

export const createTelegramLinkToken = async (opts: { customerId: number; expiresMinutes?: number }) => {
  const customerId = Number(opts.customerId || 0);
  if (!customerId) throw new Error('customerId is required');

  const c = await getAsync(`SELECT phoneNumber FROM customers WHERE id=? LIMIT 1`, [customerId]);
  const expectedPhone = c?.phoneNumber ? normalizeIranPhone(String(c.phoneNumber)) : null;

  const tokenPlain = crypto.randomBytes(18).toString('base64url'); // URL-safe
  const tokenHash = sha256Hex(tokenPlain);

  const mins = Math.max(5, Math.min(24 * 60, Number(opts.expiresMinutes ?? 60)));
  const expiresAtISO = moment().add(mins, 'minutes').toISOString();

  await runAsync(
    `INSERT INTO telegram_link_tokens (token_hash, customer_id, expected_phone, expires_at, status)
     VALUES (?,?,?,?, 'issued')`,
    [tokenHash, customerId, expectedPhone, expiresAtISO]
  );

  const row = await getAsync(`SELECT id FROM telegram_link_tokens WHERE token_hash=? LIMIT 1`, [tokenHash]);
  return { id: Number(row?.id || 0), token: tokenPlain, expiresAtISO, expectedPhone };
};

export const getTelegramLinkTokenByPlainToken = async (plainToken: string) => {
  const t = String(plainToken || '').trim();
  if (!t) return null;

  // expire old tokens lazily
  await runAsync(
    `UPDATE telegram_link_tokens SET status='expired'
     WHERE status IN ('issued','await_contact','await_otp') AND expires_at < ?`,
    [moment().toISOString()]
  ).catch(() => {});

  const hash = sha256Hex(t);
  const row = await getAsync(`SELECT * FROM telegram_link_tokens WHERE token_hash=? LIMIT 1`, [hash]);
  return (row as any) || null;
};

export const getPendingTelegramLinkTokenByChatId = async (chatId: string) => {
  const id = String(chatId || '').trim();
  if (!id) return null;
  const row = await getAsync(
    `SELECT * FROM telegram_link_tokens
     WHERE chat_id=? AND status IN ('await_contact','await_otp')
     ORDER BY id DESC LIMIT 1`,
    [id]
  );
  return (row as any) || null;
};

export const markTelegramLinkTokenStatus = async (id: number, status: string, extra?: { chatId?: string; telegramUserId?: string; err?: string | null }) => {
  await runAsync(
    `UPDATE telegram_link_tokens
     SET status=?,
         chat_id=COALESCE(?, chat_id),
         telegram_user_id=COALESCE(?, telegram_user_id),
         used_at=CASE WHEN ? IN ('used','canceled','expired') THEN COALESCE(used_at, ?) ELSE used_at END,
         last_error=COALESCE(?, last_error)
     WHERE id=?`,
    [status, extra?.chatId ?? null, extra?.telegramUserId ?? null, status, moment().toISOString(), extra?.err ?? null, Number(id)]
  );
};

export const linkCustomerTelegramById = async (opts: { customerId: number; chatId: string; telegramUserId: string }) => {
  const customerId = Number(opts.customerId || 0);
  const chatId = String(opts.chatId || '').trim();
  const telegramUserId = String(opts.telegramUserId || '').trim();
  if (!customerId || !chatId || !telegramUserId) throw new Error('Invalid link args');

  const now = moment().toISOString();
  await runAsync(
    `UPDATE customers
     SET telegramChatId=?, telegram_chat_id=?, telegram_user_id=?, telegram_linked_at=?, telegram_opted_out=0,
         telegram_invalid=0, telegram_invalid_reason=NULL, telegram_invalid_at=NULL
     WHERE id=?`,
    [chatId, chatId, telegramUserId, now, customerId]
  );

  return { ok: true as const, customerId };
};


export const getPhoneInventoryDashboardReportFromDb = async (filters?: { days?: number; startDate?: string; endDate?: string }): Promise<any> => {
  await getDbInstance();
  const rows = await searchPhoneInventoryEventsFromDb({ ...filters, limit: 1000, eventClass: 'all' });
  const currentPhones = (await allAsync(`
    SELECT ph.*, pa.partnerName as supplierName
      FROM phones ph
      LEFT JOIN partners pa ON ph.supplierId = pa.id
  `)) || [];
  const { safeDays, sinceIso, untilIso, hasCustomRange } = resolveHistoryWindow(filters);
  const now = moment();
  const staleBuckets = [
    { key: 'fresh', label: 'کمتر از ۷ روز', count: 0 },
    { key: 'warm', label: '۷ تا ۳۰ روز', count: 0 },
    { key: 'stale', label: '۳۰ تا ۶۰ روز', count: 0 },
    { key: 'critical', label: '۶۰+ روز', count: 0 },
  ];
  const supplierMap = new Map<string, any>();
  const modelMap = new Map<string, any>();

  for (const phone of currentPhones as any[]) {
    const baseDate = phone.purchaseDate || phone.registerDate || phone.saleDate || null;
    const ageDays = baseDate ? Math.max(0, now.diff(moment(baseDate), 'days')) : 0;
    const stale = ageDays >= 30;
    const sellable = ['موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی'].includes(String(phone.status || ''));
    if (ageDays < 7) staleBuckets[0].count += 1;
    else if (ageDays < 30) staleBuckets[1].count += 1;
    else if (ageDays < 60) staleBuckets[2].count += 1;
    else staleBuckets[3].count += 1;

    const supplierName = String(phone.supplierName || 'بدون تامین‌کننده').trim() || 'بدون تامین‌کننده';
    const supplierAgg = supplierMap.get(supplierName) || { name: supplierName, total: 0, staleCount: 0, missingSalePriceCount: 0, lowBatteryCount: 0, potentialMargin: 0, avgPurchasePrice: 0, avgSalePrice: 0, _purchaseSum: 0, _saleSum: 0, criticalEvents: 0 };
    supplierAgg.total += 1;
    if (stale) supplierAgg.staleCount += 1;
    if (!phone.salePrice || Number(phone.salePrice) <= 0) supplierAgg.missingSalePriceCount += 1;
    if (phone.batteryHealth != null && Number(phone.batteryHealth) > 0 && Number(phone.batteryHealth) < 80) supplierAgg.lowBatteryCount += 1;
    supplierAgg.potentialMargin += Math.max(0, Number(phone.salePrice || 0) - Number(phone.purchasePrice || 0));
    supplierAgg._purchaseSum += Number(phone.purchasePrice || 0);
    supplierAgg._saleSum += Number(phone.salePrice || 0);
    supplierMap.set(supplierName, supplierAgg);

    const modelName = String(phone.model || 'نامشخص').trim() || 'نامشخص';
    const modelAgg = modelMap.get(modelName) || { name: modelName, total: 0, staleCount: 0, missingSalePriceCount: 0, lowBatteryCount: 0, potentialMargin: 0, avgPurchasePrice: 0, avgSalePrice: 0, _purchaseSum: 0, _saleSum: 0, criticalEvents: 0 };
    modelAgg.total += 1;
    if (stale) modelAgg.staleCount += 1;
    if (!phone.salePrice || Number(phone.salePrice) <= 0) modelAgg.missingSalePriceCount += 1;
    if (phone.batteryHealth != null && Number(phone.batteryHealth) > 0 && Number(phone.batteryHealth) < 80) modelAgg.lowBatteryCount += 1;
    modelAgg.potentialMargin += Math.max(0, Number(phone.salePrice || 0) - Number(phone.purchasePrice || 0));
    modelAgg._purchaseSum += Number(phone.purchasePrice || 0);
    modelAgg._saleSum += Number(phone.salePrice || 0);
    modelMap.set(modelName, modelAgg);
  }

  for (const row of rows as any[]) {
    const modelName = String(row.phoneModel || 'نامشخص').trim() || 'نامشخص';
    const supplierCriticalTarget = modelMap.get(modelName);
    if (supplierCriticalTarget && row.eventClass === 'critical') supplierCriticalTarget.criticalEvents += 1;
  }

  const dailyMap = new Map<string, any>();
  const priceRows = rows.filter((row: any) => row.eventClass === 'price');
  let saleIncrease = 0, saleDecrease = 0, purchaseIncrease = 0, purchaseDecrease = 0, netSaleDelta = 0, netPurchaseDelta = 0;
  for (const row of rows as any[]) {
    const dt = moment(row.eventDate || row.createdAt);
    const dateKey = dt.format('YYYY-MM-DD');
    const point = dailyMap.get(dateKey) || { date: dateKey, label: dt.locale('fa').format('jDD jMMM'), total: 0, price: 0, status: 0, critical: 0 };
    point.total += 1;
    if (row.eventClass === 'price') point.price += 1;
    if (row.eventClass === 'status') point.status += 1;
    if (row.eventClass === 'critical') point.critical += 1;
    dailyMap.set(dateKey, point);
  }
  for (const row of priceRows as any[]) {
    const oldSale = normalizeMoney(row.oldSalePrice);
    const newSale = normalizeMoney(row.newSalePrice);
    const oldPurchase = normalizeMoney(row.oldPurchasePrice);
    const newPurchase = normalizeMoney(row.newPurchasePrice);
    if (oldSale != null && newSale != null && oldSale !== newSale) {
      if (newSale > oldSale) saleIncrease += 1;
      if (newSale < oldSale) saleDecrease += 1;
      netSaleDelta += (newSale - oldSale);
    }
    if (oldPurchase != null && newPurchase != null && oldPurchase !== newPurchase) {
      if (newPurchase > oldPurchase) purchaseIncrease += 1;
      if (newPurchase < oldPurchase) purchaseDecrease += 1;
      netPurchaseDelta += (newPurchase - oldPurchase);
    }
  }
  const finalizeHeatmap = (items: any[]) => items.map((item: any) => ({
    ...item,
    avgPurchasePrice: item.total ? Math.round(item._purchaseSum / item.total) : 0,
    avgSalePrice: item.total ? Math.round(item._saleSum / item.total) : 0,
    _purchaseSum: undefined,
    _saleSum: undefined,
  }));

  const supplierHeatmap = finalizeHeatmap(Array.from(supplierMap.values())).sort((a: any, b: any) => (b.staleCount + b.missingSalePriceCount) - (a.staleCount + a.missingSalePriceCount)).slice(0, 8);
  const modelHeatmap = finalizeHeatmap(Array.from(modelMap.values())).sort((a: any, b: any) => (b.criticalEvents + b.staleCount + b.missingSalePriceCount) - (a.criticalEvents + a.staleCount + a.missingSalePriceCount)).slice(0, 8);
  const sellableInventory = (currentPhones as any[]).filter((phone: any) => ['موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی'].includes(String(phone.status || ''))).length;
  const totalPotentialMargin = (currentPhones as any[]).reduce((sum: number, phone: any) => sum + Math.max(0, Number(phone.salePrice || 0) - Number(phone.purchasePrice || 0)), 0);

  return {
    windowDays: safeDays,
    hasCustomRange,
    startDate: sinceIso,
    endDate: untilIso,
    totalInventory: (currentPhones as any[]).length,
    sellableInventory,
    totalPotentialMargin,
    staleBuckets,
    pricingTrend: { saleIncrease, saleDecrease, purchaseIncrease, purchaseDecrease, netSaleDelta, netPurchaseDelta },
    supplierHeatmap,
    modelHeatmap,
    dailyActivity: Array.from(dailyMap.values()).sort((a: any, b: any) => a.date.localeCompare(b.date)).slice(-14),
  };
};

// ==============================
// Store ownership / partners (phase 2/3)
// ==============================

const tableExists = async (tableName: string): Promise<boolean> => {
  try {
    const row: any = await getAsync(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`, [tableName]);
    return !!row?.name;
  } catch {
    return false;
  }
};

const getColumnNamesSafe = async (tableName: string): Promise<Set<string>> => {
  try {
    const exists = await tableExists(tableName);
    if (!exists) return new Set<string>();
    const rows: any[] = await allAsync(`PRAGMA table_info(${tableName})`);
    return new Set((rows || []).map((row: any) => String(row?.name || '')).filter(Boolean));
  } catch {
    return new Set<string>();
  }
};

const hasStoreOwnershipCoreTables = async (): Promise<boolean> => {
  const required = [
    'store_partners',
    'store_partner_legacy_links',
    'profit_share_profiles',
    'profit_share_profile_items',
    'ownership_profiles',
    'ownership_profile_items',
  ];
  const checks = await Promise.all(required.map((name) => tableExists(name)));
  return checks.every(Boolean);
};


type ShareInput = { storePartnerId: number; sharePercent: number; sortOrder?: number; roleLabel?: string | null };

const normalizePercent = (value: number): number => Math.round((Number(value) || 0) * 100) / 100;

const replaceProfitShareProfileItems = async (profileId: number, items: ShareInput[]): Promise<void> => {
  await runAsync(`DELETE FROM profit_share_profile_items WHERE profileId = ?`, [profileId]);
  for (const [index, item] of items.entries()) {
    await runAsync(
      `INSERT INTO profit_share_profile_items (profileId, storePartnerId, sharePercent, sortOrder) VALUES (?, ?, ?, ?)`,
      [profileId, item.storePartnerId, normalizePercent(item.sharePercent), item.sortOrder ?? index]
    );
  }
};

const replaceOwnershipProfileItems = async (ownershipProfileId: number, items: ShareInput[]): Promise<void> => {
  await runAsync(`DELETE FROM ownership_profile_items WHERE ownershipProfileId = ?`, [ownershipProfileId]);
  for (const [index, item] of items.entries()) {
    await runAsync(
      `INSERT INTO ownership_profile_items (ownershipProfileId, storePartnerId, sharePercent, sortOrder, roleLabel) VALUES (?, ?, ?, ?, ?)`,
      [ownershipProfileId, item.storePartnerId, normalizePercent(item.sharePercent), item.sortOrder ?? index, item.roleLabel || null]
    );
  }
};

const getProfileItems = async (table: 'profit_share_profile_items' | 'ownership_profile_items', id: number): Promise<any[]> => {
  const coreReady = await hasStoreOwnershipCoreTables();
  if (!coreReady) return [];
  const sql = table === 'profit_share_profile_items'
    ? `SELECT i.id, i.storePartnerId, i.sharePercent, i.sortOrder, sp.name as partnerName, sp.colorTag
         FROM profit_share_profile_items i
         JOIN store_partners sp ON sp.id = i.storePartnerId
        WHERE i.profileId = ?
        ORDER BY i.sortOrder ASC, i.id ASC`
    : `SELECT i.id, i.storePartnerId, i.sharePercent, i.sortOrder, i.roleLabel, sp.name as partnerName, sp.colorTag
         FROM ownership_profile_items i
         JOIN store_partners sp ON sp.id = i.storePartnerId
        WHERE i.ownershipProfileId = ?
        ORDER BY i.sortOrder ASC, i.id ASC`;
  try {
    return await allAsync(sql, [id]);
  } catch {
    return [];
  }
};

export const getLegacyPartnerCandidatesFromDb = async (): Promise<any[]> => {
  const hasPartners = await tableExists('partners');
  if (!hasPartners) return [];
  const hasCore = await hasStoreOwnershipCoreTables();
  if (!hasCore) {
    return allAsync(
      `SELECT p.id, p.partnerName, p.partnerType,
              COALESCE((SELECT COUNT(1) FROM phones ph WHERE ph.supplierId = p.id), 0) as phoneCount,
              COALESCE((SELECT COUNT(1) FROM products pr WHERE pr.supplierId = p.id), 0) as productCount,
              0 as isLinked,
              NULL as linkedStorePartnerId,
              NULL as linkedStorePartnerName
         FROM partners p
        ORDER BY p.partnerName COLLATE NOCASE ASC`
    );
  }
  return allAsync(
    `SELECT p.id, p.partnerName, p.partnerType,
            COALESCE((SELECT COUNT(1) FROM phones ph WHERE ph.supplierId = p.id), 0) as phoneCount,
            COALESCE((SELECT COUNT(1) FROM products pr WHERE pr.supplierId = p.id), 0) as productCount,
            CASE WHEN spl.id IS NOT NULL THEN 1 ELSE 0 END as isLinked,
            sp.id as linkedStorePartnerId,
            sp.name as linkedStorePartnerName
       FROM partners p
       LEFT JOIN store_partner_legacy_links spl ON spl.legacyPartnerId = p.id AND spl.linkType = 'owner'
       LEFT JOIN store_partners sp ON sp.id = spl.storePartnerId
      ORDER BY p.partnerName COLLATE NOCASE ASC`
  );
};

export const listStorePartnersFromDb = async (): Promise<any[]> => {
  const hasCore = await hasStoreOwnershipCoreTables();
  if (!hasCore) return [];
  const rows = await allAsync(`SELECT * FROM store_partners ORDER BY isActive DESC, id ASC`);
  const links = await allAsync(
    `SELECT spl.storePartnerId, spl.legacyPartnerId, spl.linkType, p.partnerName as legacyPartnerName
       FROM store_partner_legacy_links spl
       JOIN partners p ON p.id = spl.legacyPartnerId`
  ).catch(() => [] as any[]);
  const linkMap = new Map<number, any[]>();
  for (const link of links as any[]) {
    const key = Number(link.storePartnerId || 0);
    if (!linkMap.has(key)) linkMap.set(key, []);
    linkMap.get(key)!.push({
      legacyPartnerId: link.legacyPartnerId,
      legacyPartnerName: link.legacyPartnerName,
      linkType: link.linkType,
    });
  }
  return (rows as any[]).map((row) => ({
    ...row,
    legacyLinks: linkMap.get(Number(row.id || 0)) || [],
  }));
};

export const createStorePartnerFromDb = async (payload: { name: string; code?: string | null; colorTag?: string | null; notes?: string | null; legacyPartnerId?: number | null; isStore?: number | boolean | null; }): Promise<any> => {
  if (payload.isStore) {
    await runAsync(`UPDATE store_partners SET isStore = 0 WHERE isStore = 1`).catch(() => undefined);
  }
  const result = await runAsync(
    `INSERT INTO store_partners (name, code, colorTag, notes, isStore) VALUES (?, ?, ?, ?, ?)`,
    [String(payload.name || '').trim(), payload.code || null, payload.colorTag || null, payload.notes || null, payload.isStore ? 1 : 0]
  );
  const id = Number(result.lastID);
  if (payload.legacyPartnerId) {
    await runAsync(
      `INSERT OR IGNORE INTO store_partner_legacy_links (storePartnerId, legacyPartnerId, linkType) VALUES (?, ?, 'owner')`,
      [id, payload.legacyPartnerId]
    );
  }
  const row = await getAsync(`SELECT * FROM store_partners WHERE id = ?`, [id]);
  return row;
};

export const updateStorePartnerFromDb = async (id: number, payload: { name?: string; code?: string | null; colorTag?: string | null; notes?: string | null; isActive?: number | boolean; isStore?: number | boolean; legacyPartnerIds?: number[]; }): Promise<any> => {
  const current = await getAsync(`SELECT * FROM store_partners WHERE id = ?`, [id]);
  if (!current) throw new Error('شریک موردنظر پیدا نشد.');
  if (payload.isStore) {
    await runAsync(`UPDATE store_partners SET isStore = 0 WHERE isStore = 1 AND id <> ?`, [id]).catch(() => undefined);
  }
  await runAsync(
    `UPDATE store_partners
        SET name = ?, code = ?, colorTag = ?, notes = ?, isActive = ?, isStore = ?, updatedAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')
      WHERE id = ?`,
    [
      payload.name != null ? String(payload.name).trim() : current.name,
      payload.code !== undefined ? payload.code : current.code,
      payload.colorTag !== undefined ? payload.colorTag : current.colorTag,
      payload.notes !== undefined ? payload.notes : current.notes,
      payload.isActive === undefined ? current.isActive : (payload.isActive ? 1 : 0),
      payload.isStore === undefined ? (current.isStore || 0) : (payload.isStore ? 1 : 0),
      id,
    ]
  );
  if (payload.legacyPartnerIds) {
    await runAsync(`DELETE FROM store_partner_legacy_links WHERE storePartnerId = ? AND linkType = 'owner'`, [id]);
    for (const legacyPartnerId of payload.legacyPartnerIds) {
      await runAsync(`INSERT OR IGNORE INTO store_partner_legacy_links (storePartnerId, legacyPartnerId, linkType) VALUES (?, ?, 'owner')`, [id, legacyPartnerId]);
    }
  }
  return getAsync(`SELECT * FROM store_partners WHERE id = ?`, [id]);
};

export const listProfitShareProfilesFromDb = async (): Promise<any[]> => {
  const hasCore = await hasStoreOwnershipCoreTables();
  if (!hasCore) return [];
  const profiles = await allAsync(`SELECT * FROM profit_share_profiles ORDER BY isDefault DESC, id ASC`).catch(() => [] as any[]);
  const result = [] as any[];
  for (const profile of profiles as any[]) {
    result.push({ ...profile, items: await getProfileItems('profit_share_profile_items', profile.id) });
  }
  return result;
};

export const createProfitShareProfileFromDb = async (payload: { title: string; notes?: string | null; isDefault?: boolean; items: ShareInput[]; }): Promise<any> => {
  if (!payload.items?.length) throw new Error('حداقل یک شریک برای پروفایل سهم سود لازم است.');
  const total = payload.items.reduce((sum, item) => sum + normalizePercent(item.sharePercent), 0);
  if (Math.abs(total - 100) > 0.05) throw new Error('جمع درصدهای سهم سود باید 100 باشد.');
  if (payload.isDefault) {
    await runAsync(`UPDATE profit_share_profiles SET isDefault = 0 WHERE isDefault = 1`);
  }
  const result = await runAsync(
    `INSERT INTO profit_share_profiles (title, notes, isDefault) VALUES (?, ?, ?)`,
    [String(payload.title || '').trim(), payload.notes || null, payload.isDefault ? 1 : 0]
  );
  const id = Number(result.lastID);
  await replaceProfitShareProfileItems(id, payload.items);
  return { ...(await getAsync(`SELECT * FROM profit_share_profiles WHERE id = ?`, [id])), items: await getProfileItems('profit_share_profile_items', id) };
};

export const listOwnershipProfilesFromDb = async (): Promise<any[]> => {
  const hasCore = await hasStoreOwnershipCoreTables();
  if (!hasCore) return [];
  const profiles = await allAsync(`SELECT op.*, psp.title as profitShareProfileTitle FROM ownership_profiles op LEFT JOIN profit_share_profiles psp ON psp.id = op.profitShareProfileId ORDER BY op.isDefault DESC, op.id ASC`).catch(() => [] as any[]);
  const result = [] as any[];
  for (const profile of profiles as any[]) {
    result.push({ ...profile, items: await getProfileItems('ownership_profile_items', profile.id) });
  }
  return result;
};

export const createOwnershipProfileFromDb = async (payload: { title: string; ownershipType?: string; notes?: string | null; isDefault?: boolean; profitShareProfileId?: number | null; items: ShareInput[]; }): Promise<any> => {
  if (!payload.items?.length) throw new Error('حداقل یک شریک برای پروفایل مالکیت لازم است.');
  const total = payload.items.reduce((sum, item) => sum + normalizePercent(item.sharePercent), 0);
  if (Math.abs(total - 100) > 0.05) throw new Error('جمع درصدهای مالکیت باید 100 باشد.');
  if (payload.isDefault) {
    await runAsync(`UPDATE ownership_profiles SET isDefault = 0 WHERE isDefault = 1`);
  }
  const result = await runAsync(
    `INSERT INTO ownership_profiles (title, ownershipType, notes, isDefault, profitShareProfileId) VALUES (?, ?, ?, ?, ?)`,
    [String(payload.title || '').trim(), payload.ownershipType || 'shared', payload.notes || null, payload.isDefault ? 1 : 0, payload.profitShareProfileId || null]
  );
  const id = Number(result.lastID);
  await replaceOwnershipProfileItems(id, payload.items);
  const profile = await getAsync(`SELECT * FROM ownership_profiles WHERE id = ?`, [id]);
  return { ...profile, items: await getProfileItems('ownership_profile_items', id) };
};

export const saveStoreOwnershipConfigurationFromDb = async (payload: { storePartnerId?: number | null; items: ShareInput[]; }): Promise<any> => {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) throw new Error('حداقل یک سهم برای تنظیمات فروشگاه لازم است.');
  const normalizedItems = items.map((item, index) => ({
    storePartnerId: Number(item.storePartnerId),
    sharePercent: normalizePercent(Number(item.sharePercent || 0)),
    sortOrder: item.sortOrder ?? index,
  })).filter((item) => item.storePartnerId > 0);
  if (!normalizedItems.length) throw new Error('حداقل یک شریک معتبر برای تنظیمات فروشگاه لازم است.');
  const total = normalizedItems.reduce((sum, item) => sum + item.sharePercent, 0);
  if (Math.abs(total - 100) > 0.05) throw new Error('جمع درصد سهم شرکا باید 100 باشد.');

  const ids = normalizedItems.map((item) => item.storePartnerId);
  const partners = await allAsync(`SELECT * FROM store_partners WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  if ((partners as any[]).length !== ids.length) throw new Error('بخشی از شرکای انتخاب‌شده پیدا نشدند.');

  // فروشگاه یک شریک نیست؛ فروشگاه تجمیع عملکرد همه شرکاست.
  // ستون isStore برای سازگاری نگه داشته می‌شود اما در مدل جدید خاموش می‌ماند.
  await runAsync(`UPDATE store_partners SET isStore = 0`).catch(() => undefined);

  let defaultProfitShare: any = await getAsync(`SELECT * FROM profit_share_profiles WHERE isDefault = 1 ORDER BY id DESC LIMIT 1`);
  if (!defaultProfitShare) {
    const created = await createProfitShareProfileFromDb({ title: 'پروفایل پیش‌فرض سود فروشگاه', isDefault: true, items: normalizedItems });
    defaultProfitShare = created;
  } else {
    await runAsync(`UPDATE profit_share_profiles SET title = ?, updatedAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc') WHERE id = ?`, ['پروفایل پیش‌فرض سود فروشگاه', Number(defaultProfitShare.id)]);
    await replaceProfitShareProfileItems(Number(defaultProfitShare.id), normalizedItems);
    defaultProfitShare = await getAsync(`SELECT * FROM profit_share_profiles WHERE id = ?`, [Number(defaultProfitShare.id)]);
    (defaultProfitShare as any).items = await getProfileItems('profit_share_profile_items', Number(defaultProfitShare.id));
  }

  let storeOwnership: any = await getAsync(`SELECT * FROM ownership_profiles WHERE ownershipType = 'store' ORDER BY isDefault DESC, id ASC LIMIT 1`);
  if (!storeOwnership) {
    storeOwnership = await createOwnershipProfileFromDb({
      title: 'مالکیت تجمیعی فروشگاه',
      ownershipType: 'store',
      isDefault: true,
      profitShareProfileId: Number(defaultProfitShare.id),
      items: normalizedItems.map((item, index) => ({ ...item, sortOrder: index, roleLabel: 'سهم تجمیعی فروشگاه' })),
    });
  } else {
    await runAsync(`UPDATE ownership_profiles SET title = ?, ownershipType = 'store', isDefault = 1, profitShareProfileId = ?, updatedAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc') WHERE id = ?`, ['مالکیت تجمیعی فروشگاه', Number(defaultProfitShare.id), Number(storeOwnership.id)]);
    await replaceOwnershipProfileItems(Number(storeOwnership.id), normalizedItems.map((item, index) => ({ ...item, sortOrder: index, roleLabel: 'سهم تجمیعی فروشگاه' })));
    storeOwnership = await getAsync(`SELECT * FROM ownership_profiles WHERE id = ?`, [Number(storeOwnership.id)]);
    (storeOwnership as any).items = await getProfileItems('ownership_profile_items', Number(storeOwnership.id));
  }

  return {
    storePartners: await listStorePartnersFromDb(),
    profitShareProfiles: await listProfitShareProfilesFromDb(),
    ownershipProfiles: await listOwnershipProfilesFromDb(),
    selectedStorePartnerId: null,
  };
};

const createDefaultOwnershipCore = async (legacyPartnerIds: number[]): Promise<any> => {
  if (!legacyPartnerIds.length) throw new Error('حداقل یک شریک قدیمی را انتخاب کنید.');
  const legacyPartners = await allAsync(`SELECT * FROM partners WHERE id IN (${legacyPartnerIds.map(() => '?').join(',')}) ORDER BY id ASC`, legacyPartnerIds);
  if (legacyPartners.length !== legacyPartnerIds.length) throw new Error('بخشی از شرکای انتخاب‌شده پیدا نشدند.');

  const createdStorePartners: any[] = [];
  for (const partner of legacyPartners) {
    const existingLink = await getAsync(`SELECT sp.* FROM store_partner_legacy_links spl JOIN store_partners sp ON sp.id = spl.storePartnerId WHERE spl.legacyPartnerId = ? AND spl.linkType = 'owner'`, [partner.id]);
    if (existingLink) {
      createdStorePartners.push(existingLink);
      continue;
    }
    const created = await createStorePartnerFromDb({ name: partner.partnerName, legacyPartnerId: partner.id, notes: `ایجادشده از همکار قدیمی #${partner.id}` });
    createdStorePartners.push(created);
  }

  let defaultProfitShare = await getAsync(`SELECT * FROM profit_share_profiles WHERE isDefault = 1 ORDER BY id DESC LIMIT 1`);
  if (defaultProfitShare) {
    (defaultProfitShare as any).items = await getProfileItems('profit_share_profile_items', Number((defaultProfitShare as any).id));
  }
  if (!defaultProfitShare) {
    const count = createdStorePartners.length;
    const base = Math.floor((10000 / count)) / 100;
    const items = createdStorePartners.map((sp, index) => ({
      storePartnerId: sp.id,
      sharePercent: index === count - 1 ? normalizePercent(100 - base * (count - 1)) : base,
      sortOrder: index,
    }));
    defaultProfitShare = await createProfitShareProfileFromDb({ title: 'پروفایل پیش‌فرض فروشگاه', isDefault: true, items });
  }

  let storeOwnership = await getAsync(`SELECT * FROM ownership_profiles WHERE ownershipType = 'store' ORDER BY isDefault DESC, id ASC LIMIT 1`);
  if (!storeOwnership) {
    storeOwnership = await createOwnershipProfileFromDb({
      title: 'مالکیت مغازه',
      ownershipType: 'store',
      isDefault: true,
      profitShareProfileId: defaultProfitShare.id,
      items: (defaultProfitShare.items || []).map((item: any, index: number) => ({ storePartnerId: item.storePartnerId, sharePercent: item.sharePercent, sortOrder: index, roleLabel: 'شریک مغازه' })),
    });
  }

  for (const [index, sp] of createdStorePartners.entries()) {
    const existingPersonal = await getAsync(`SELECT * FROM ownership_profiles WHERE ownershipType = 'personal' AND title = ? LIMIT 1`, [sp.name]);
    if (!existingPersonal) {
      await createOwnershipProfileFromDb({
        title: sp.name,
        ownershipType: 'personal',
        items: [{ storePartnerId: sp.id, sharePercent: 100, sortOrder: index, roleLabel: 'مالک اصلی' }],
      });
    }
  }

  return {
    storePartners: await listStorePartnersFromDb(),
    profitShareProfiles: await listProfitShareProfilesFromDb(),
    ownershipProfiles: await listOwnershipProfilesFromDb(),
  };
};

export const bootstrapStoreOwnershipCoreFromDb = async (legacyPartnerIds: number[]): Promise<any> => {
  const core = await createDefaultOwnershipCore(legacyPartnerIds);
  const backfill = await applyStoreOwnershipBackfillFromDb().catch(() => ({ phonesUpdated: 0, productsUpdated: 0 }));
  return { ...core, backfill };
};

const resolveLegacyPartnerOwnershipMap = async (): Promise<Map<number, number>> => {
  const map = new Map<number, number>();
  const links = await allAsync(`SELECT spl.legacyPartnerId, sp.id as storePartnerId, sp.name FROM store_partner_legacy_links spl JOIN store_partners sp ON sp.id = spl.storePartnerId WHERE spl.linkType = 'owner'`);
  const storeProfile = await getAsync(`SELECT * FROM ownership_profiles WHERE ownershipType = 'store' ORDER BY isDefault DESC, id ASC LIMIT 1`);
  for (const link of links) {
    const personal = await getAsync(`SELECT op.id FROM ownership_profiles op JOIN ownership_profile_items opi ON opi.ownershipProfileId = op.id WHERE op.ownershipType = 'personal' AND opi.storePartnerId = ? GROUP BY op.id HAVING COUNT(*) = 1 LIMIT 1`, [link.storePartnerId]);
    if (personal?.id) map.set(Number(link.legacyPartnerId), Number(personal.id));
  }
  const storeLegacy = await allAsync(`SELECT id, partnerName FROM partners WHERE lower(trim(partnerName)) IN ('مغازه', 'store', 'shop')`);
  if (storeProfile?.id) {
    for (const legacy of storeLegacy) map.set(Number(legacy.id), Number(storeProfile.id));
  }
  return map;
};

export const getStoreOwnershipCoverageFromDb = async (): Promise<any> => {
  const phoneCols = await getColumnNamesSafe('phones');
  const productCols = await getColumnNamesSafe('products');
  const hasPhoneOwnership = phoneCols.has('ownershipProfileId');
  const hasProductOwnership = productCols.has('ownershipProfileId');
  const hasCore = await hasStoreOwnershipCoreTables();

  const [phoneSummary, productSummary, profiles, storePartners] = await Promise.all([
    hasPhoneOwnership ? getAsync(`SELECT COUNT(1) as total, SUM(CASE WHEN ownershipProfileId IS NOT NULL THEN 1 ELSE 0 END) as mapped FROM phones`) : getAsync(`SELECT COUNT(1) as total, 0 as mapped FROM phones`),
    hasProductOwnership ? getAsync(`SELECT COUNT(1) as total, SUM(CASE WHEN ownershipProfileId IS NOT NULL THEN 1 ELSE 0 END) as mapped FROM products`) : getAsync(`SELECT COUNT(1) as total, 0 as mapped FROM products`),
    hasCore ? getAsync(`SELECT COUNT(1) as count FROM ownership_profiles`) : Promise.resolve({ count: 0 }),
    hasCore ? getAsync(`SELECT COUNT(1) as count FROM store_partners WHERE isActive = 1`) : Promise.resolve({ count: 0 }),
  ]);
  return {
    phones: { total: Number((phoneSummary as any)?.total || 0), mapped: Number((phoneSummary as any)?.mapped || 0) },
    products: { total: Number((productSummary as any)?.total || 0), mapped: Number((productSummary as any)?.mapped || 0) },
    ownershipProfiles: Number((profiles as any)?.count || 0),
    activeStorePartners: Number((storePartners as any)?.count || 0),
  };
};

export const previewStoreOwnershipBackfillFromDb = async (): Promise<any> => {
  const phoneCols = await getColumnNamesSafe('phones');
  const productCols = await getColumnNamesSafe('products');
  const hasPhoneOwnership = phoneCols.has('ownershipProfileId');
  const hasProductOwnership = productCols.has('ownershipProfileId');
  const ownershipMap = await resolveLegacyPartnerOwnershipMap().catch(() => new Map<number, number>());
  const phones = await allAsync(`SELECT ph.id, ph.model, ph.imei, ph.supplierId, pa.partnerName as legacyPartnerName${hasPhoneOwnership ? ', ph.ownershipProfileId' : ', NULL as ownershipProfileId'} FROM phones ph LEFT JOIN partners pa ON pa.id = ph.supplierId ORDER BY ph.id DESC`).catch(() => [] as any[]);
  const products = await allAsync(`SELECT pr.id, pr.name, pr.stock_quantity, pr.supplierId, pa.partnerName as legacyPartnerName${hasProductOwnership ? ', pr.ownershipProfileId' : ', NULL as ownershipProfileId'} FROM products pr LEFT JOIN partners pa ON pa.id = pr.supplierId ORDER BY pr.id DESC`).catch(() => [] as any[]);
  const analyze = (rows: any[]) => {
    const ready = [] as any[];
    const missingLink = [] as any[];
    const alreadyMapped = [] as any[];
    for (const row of rows) {
      if (row.ownershipProfileId) {
        alreadyMapped.push(row);
        continue;
      }
      const candidate = row.supplierId ? ownershipMap.get(Number(row.supplierId)) : null;
      if (candidate) ready.push({ ...row, candidateOwnershipProfileId: candidate });
      else missingLink.push(row);
    }
    return { ready, missingLink, alreadyMapped };
  };
  const phoneResult = analyze(phones as any[]);
  const productResult = analyze(products as any[]);
  return {
    phones: {
      readyCount: phoneResult.ready.length,
      missingCount: phoneResult.missingLink.length,
      alreadyMappedCount: phoneResult.alreadyMapped.length,
      missingExamples: phoneResult.missingLink.slice(0, 25),
    },
    products: {
      readyCount: productResult.ready.length,
      missingCount: productResult.missingLink.length,
      alreadyMappedCount: productResult.alreadyMapped.length,
      missingExamples: productResult.missingLink.slice(0, 25),
    },
  };
};

export const applyStoreOwnershipBackfillFromDb = async (): Promise<any> => {
  const phoneCols = await getColumnNamesSafe('phones');
  const productCols = await getColumnNamesSafe('products');
  const hasPhoneOwnership = phoneCols.has('ownershipProfileId');
  const hasProductOwnership = productCols.has('ownershipProfileId');
  const hasPhoneSnapshots = await tableExists('phone_ownership_snapshots');
  const hasProductSnapshots = await tableExists('product_ownership_snapshots');
  const ownershipMap = await resolveLegacyPartnerOwnershipMap().catch(() => new Map<number, number>());
  const phones = hasPhoneOwnership ? await allAsync(`SELECT id, supplierId, ownershipProfileId FROM phones WHERE ownershipProfileId IS NULL AND supplierId IS NOT NULL`).catch(() => [] as any[]) : [];
  const products = hasProductOwnership ? await allAsync(`SELECT id, supplierId, ownershipProfileId FROM products WHERE ownershipProfileId IS NULL AND supplierId IS NOT NULL`).catch(() => [] as any[]) : [];
  let phonesUpdated = 0;
  let productsUpdated = 0;
  for (const row of phones as any[]) {
    const ownershipProfileId = ownershipMap.get(Number(row.supplierId || 0));
    if (!ownershipProfileId) continue;
    await runAsync(`UPDATE phones SET ownershipProfileId = ? WHERE id = ?`, [ownershipProfileId, row.id]);
    if (hasPhoneSnapshots) {
      await runAsync(`INSERT OR IGNORE INTO phone_ownership_snapshots (phoneId, ownershipProfileId, sourceLegacyPartnerId, sourceMethod, notes) VALUES (?, ?, ?, 'legacy_supplier_backfill', ?)`, [row.id, ownershipProfileId, row.supplierId, 'انتساب خودکار از supplierId قدیمی']).catch(() => null);
    }
    phonesUpdated += 1;
  }
  for (const row of products as any[]) {
    const ownershipProfileId = ownershipMap.get(Number(row.supplierId || 0));
    if (!ownershipProfileId) continue;
    await runAsync(`UPDATE products SET ownershipProfileId = ? WHERE id = ?`, [ownershipProfileId, row.id]);
    if (hasProductSnapshots) {
      await runAsync(`INSERT OR IGNORE INTO product_ownership_snapshots (productId, ownershipProfileId, sourceLegacyPartnerId, sourceMethod, notes) VALUES (?, ?, ?, 'legacy_supplier_backfill', ?)`, [row.id, ownershipProfileId, row.supplierId, 'انتساب خودکار از supplierId قدیمی']).catch(() => null);
    }
    productsUpdated += 1;
  }
  return { phonesUpdated, productsUpdated, coverage: await getStoreOwnershipCoverageFromDb() };
};

export const listStoreOwnershipReviewQueueFromDb = async (): Promise<any> => {
  const phoneCols = await getColumnNamesSafe('phones');
  const productCols = await getColumnNamesSafe('products');
  const hasPhoneOwnership = phoneCols.has('ownershipProfileId');
  const hasProductOwnership = productCols.has('ownershipProfileId');
  const ownershipMap = await resolveLegacyPartnerOwnershipMap().catch(() => new Map<number, number>());
  const [phoneRows, productRows, phoneSummary, productSummary] = await Promise.all([
    allAsync(`SELECT ph.id, ph.model, ph.imei, ph.supplierId, pa.partnerName as legacyPartnerName${hasPhoneOwnership ? ', ph.ownershipProfileId' : ', NULL as ownershipProfileId'}, ph.status, ph.purchasePrice, ph.salePrice FROM phones ph LEFT JOIN partners pa ON pa.id = ph.supplierId ${hasPhoneOwnership ? 'WHERE ph.ownershipProfileId IS NULL' : ''} ORDER BY ph.id DESC LIMIT 250`).catch(() => [] as any[]),
    allAsync(`SELECT pr.id, pr.name, pr.stock_quantity, pr.supplierId, pa.partnerName as legacyPartnerName${hasProductOwnership ? ', pr.ownershipProfileId' : ', NULL as ownershipProfileId'}, pr.purchasePrice, pr.selling_price FROM products pr LEFT JOIN partners pa ON pa.id = pr.supplierId ${hasProductOwnership ? 'WHERE pr.ownershipProfileId IS NULL' : ''} ORDER BY pr.id DESC LIMIT 250`).catch(() => [] as any[]),
    hasPhoneOwnership ? getAsync(`SELECT COUNT(1) as count FROM phones WHERE ownershipProfileId IS NULL`).catch(() => ({ count: 0 })) : Promise.resolve({ count: 0 }),
    hasProductOwnership ? getAsync(`SELECT COUNT(1) as count FROM products WHERE ownershipProfileId IS NULL`).catch(() => ({ count: 0 })) : Promise.resolve({ count: 0 }),
  ]);
  const mapCandidate = (supplierId: any) => {
    const legacyId = Number(supplierId || 0);
    if (!legacyId) return null;
    return ownershipMap.get(legacyId) || null;
  };
  return {
    phones: {
      total: Number((phoneSummary as any)?.count || 0),
      items: (phoneRows as any[]).map((row: any) => ({ ...row, candidateOwnershipProfileId: mapCandidate(row.supplierId), candidateReason: mapCandidate(row.supplierId) ? 'قابل انتساب از supplierId قدیمی' : 'نیازمند تعیین دستی' })),
    },
    products: {
      total: Number((productSummary as any)?.count || 0),
      items: (productRows as any[]).map((row: any) => ({ ...row, candidateOwnershipProfileId: mapCandidate(row.supplierId), candidateReason: mapCandidate(row.supplierId) ? 'قابل انتساب از supplierId قدیمی' : 'نیازمند تعیین دستی' })),
    },
  };
};

export const assignStoreOwnershipReviewItemsFromDb = async (payload: { targetType: 'phones' | 'products'; ids: number[]; ownershipProfileId: number; notes?: string | null; }): Promise<any> => {
  const phoneCols = await getColumnNamesSafe('phones');
  const productCols = await getColumnNamesSafe('products');
  const hasPhoneOwnership = phoneCols.has('ownershipProfileId');
  const hasProductOwnership = productCols.has('ownershipProfileId');
  const hasPhoneSnapshots = await tableExists('phone_ownership_snapshots');
  const hasProductSnapshots = await tableExists('product_ownership_snapshots');
  const targetType = payload?.targetType === 'products' ? 'products' : 'phones';
  const ids = Array.from(new Set((payload?.ids || []).map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)));
  const ownershipProfileId = Number(payload?.ownershipProfileId || 0);
  if (!ids.length) throw new Error('حداقل یک مورد برای انتساب انتخاب کن.');
  if (!ownershipProfileId) throw new Error('پروفایل مالکیت معتبر انتخاب نشده است.');
  if (targetType === 'phones' && !hasPhoneOwnership) throw new Error('ستون مالکیت گوشی‌ها هنوز روی دیتابیس شما آماده نشده است.');
  if (targetType === 'products' && !hasProductOwnership) throw new Error('ستون مالکیت کالاها هنوز روی دیتابیس شما آماده نشده است.');
  const notes = String(payload?.notes || '').trim() || 'انتساب دستی از صف بازبینی مالکیت';
  let updated = 0;
  if (targetType === 'phones') {
    for (const id of ids) {
      const row = await getAsync(`SELECT id, supplierId FROM phones WHERE id = ?`, [id]);
      if (!row?.id) continue;
      await runAsync(`UPDATE phones SET ownershipProfileId = ? WHERE id = ?`, [ownershipProfileId, id]);
      if (hasPhoneSnapshots) {
        await runAsync(`INSERT OR IGNORE INTO phone_ownership_snapshots (phoneId, ownershipProfileId, sourceLegacyPartnerId, sourceMethod, notes) VALUES (?, ?, ?, 'manual_review', ?)`, [id, ownershipProfileId, row.supplierId || null, notes]).catch(() => null);
      }
      updated += 1;
    }
  } else {
    for (const id of ids) {
      const row = await getAsync(`SELECT id, supplierId FROM products WHERE id = ?`, [id]);
      if (!row?.id) continue;
      await runAsync(`UPDATE products SET ownershipProfileId = ? WHERE id = ?`, [ownershipProfileId, id]);
      if (hasProductSnapshots) {
        await runAsync(`INSERT OR IGNORE INTO product_ownership_snapshots (productId, ownershipProfileId, sourceLegacyPartnerId, sourceMethod, notes) VALUES (?, ?, ?, 'manual_review', ?)`, [id, ownershipProfileId, row.supplierId || null, notes]).catch(() => null);
      }
      updated += 1;
    }
  }
  return { targetType, updated, coverage: await getStoreOwnershipCoverageFromDb() };
};

type ProfitShareLine = { storePartnerId: number; sharePercent: number; partnerName?: string | null; colorTag?: string | null };
type ResolvedOwnershipContext = {
  ownershipProfileId: number | null;
  ownershipTitle: string | null;
  ownershipType: 'personal' | 'store' | 'shared' | null;
  ownershipItems: ProfitShareLine[];
  profitShareProfileId: number | null;
  profitShareProfileTitle: string | null;
  profitShareItems: ProfitShareLine[];
};

type SaleProfitSnapshotItemInput = {
  sourceKind: 'sales_order' | 'installment_sale';
  sourceId: number;
  sourceItemRefType: 'sales_order_item' | 'installment_sale_item';
  sourceItemId: number;
  saleDate: string | null;
  itemType: 'phone' | 'inventory' | 'service';
  itemId: number | null;
  itemDescription: string;
  quantity: number;
  saleUnitPrice: number;
  itemDiscount: number;
  saleAmount: number;
  initialCostPerUnit: number;
  marketCostPerUnit: number;
  ownershipProfileId: number | null;
  fallbackNotes?: string | null;
};

const normalizeShareLines = (items: ProfitShareLine[]): ProfitShareLine[] => {
  const cleaned = (items || [])
    .map((item) => ({
      storePartnerId: Number(item.storePartnerId) || 0,
      sharePercent: Number(item.sharePercent) || 0,
      partnerName: item.partnerName || null,
      colorTag: item.colorTag || null,
    }))
    .filter((item) => item.storePartnerId > 0 && item.sharePercent !== 0);
  const total = cleaned.reduce((sum, item) => sum + item.sharePercent, 0);
  if (!cleaned.length || Math.abs(total) < 1e-9) return [];
  return cleaned.map((item) => ({ ...item, sharePercent: (item.sharePercent / total) * 100 }));
};

const getDefaultProfitShareProfileFromDb = async (): Promise<any | null> => {
  return (await getAsync(`SELECT * FROM profit_share_profiles WHERE isDefault = 1 AND isActive = 1 ORDER BY id DESC LIMIT 1`)) || null;
};

const getDefaultOwnershipProfileFromDb = async (): Promise<any | null> => {
  return (await getAsync(`SELECT * FROM ownership_profiles WHERE isDefault = 1 AND isActive = 1 ORDER BY id DESC LIMIT 1`)) || null;
};

const getProfitShareLinesByProfileId = async (profileId: number | null | undefined): Promise<ProfitShareLine[]> => {
  if (!profileId) return [];
  const rows = await allAsync(
    `SELECT i.storePartnerId, i.sharePercent, sp.name as partnerName, sp.colorTag
       FROM profit_share_profile_items i
       JOIN store_partners sp ON sp.id = i.storePartnerId
      WHERE i.profileId = ?
      ORDER BY i.sortOrder ASC, i.id ASC`,
    [profileId]
  );
  return normalizeShareLines(rows as ProfitShareLine[]);
};

const getOwnershipLinesByProfileId = async (ownershipProfileId: number | null | undefined): Promise<ProfitShareLine[]> => {
  if (!ownershipProfileId) return [];
  const rows = await allAsync(
    `SELECT i.storePartnerId, i.sharePercent, sp.name as partnerName, sp.colorTag
       FROM ownership_profile_items i
       JOIN store_partners sp ON sp.id = i.storePartnerId
      WHERE i.ownershipProfileId = ?
      ORDER BY i.sortOrder ASC, i.id ASC`,
    [ownershipProfileId]
  );
  return normalizeShareLines(rows as ProfitShareLine[]);
};

const resolveOwnershipContextByProfileId = async (ownershipProfileId: number | null | undefined): Promise<ResolvedOwnershipContext> => {
  let profile = ownershipProfileId
    ? await getAsync(`SELECT op.*, psp.title as profitShareProfileTitle FROM ownership_profiles op LEFT JOIN profit_share_profiles psp ON psp.id = op.profitShareProfileId WHERE op.id = ?`, [ownershipProfileId])
    : null;
  if (!profile) {
    profile = await getDefaultOwnershipProfileFromDb();
    if (profile) {
      const linked = profile.profitShareProfileId ? await getAsync(`SELECT title FROM profit_share_profiles WHERE id = ?`, [profile.profitShareProfileId]) : null;
      profile = { ...profile, profitShareProfileTitle: linked?.title || null };
    }
  }

  const ownershipItems = normalizeShareLines(await getOwnershipLinesByProfileId(Number(profile?.id || 0)));
  let profitShareItems = normalizeShareLines(await getProfitShareLinesByProfileId(Number(profile?.profitShareProfileId || 0)));
  let profitShareProfileId = Number(profile?.profitShareProfileId || 0) || null;
  let profitShareProfileTitle = (profile as any)?.profitShareProfileTitle || null;

  if (!profitShareItems.length) {
    const defaultProfit = await getDefaultProfitShareProfileFromDb();
    if (defaultProfit) {
      const defaultItems = normalizeShareLines(await getProfitShareLinesByProfileId(Number(defaultProfit.id)));
      if (defaultItems.length) {
        profitShareItems = defaultItems;
        profitShareProfileId = Number(defaultProfit.id);
        profitShareProfileTitle = String(defaultProfit.title || '').trim() || null;
      }
    }
  }

  if (!profitShareItems.length) {
    profitShareItems = ownershipItems;
    if (!profitShareProfileTitle && ownershipItems.length) {
      profitShareProfileTitle = 'تقسیم بر پایه مالکیت';
    }
  }

  return {
    ownershipProfileId: Number(profile?.id || 0) || null,
    ownershipTitle: profile ? String(profile.title || '').trim() || null : null,
    ownershipType: profile ? ((String(profile.ownershipType || 'shared') as any) || 'shared') : null,
    ownershipItems,
    profitShareProfileId,
    profitShareProfileTitle,
    profitShareItems,
  };
};

const allocateAmountAcrossShares = (amount: number, items: ProfitShareLine[]): Array<ProfitShareLine & { amount: number }> => {
  const normalized = normalizeShareLines(items);
  if (!normalized.length || !Number.isFinite(Number(amount))) return [];
  return normalized.map((item) => ({
    ...item,
    amount: Number(amount) * (Number(item.sharePercent) / 100),
  }));
};

const purgeProfitSnapshotsForSource = async (sourceKind: 'sales_order' | 'installment_sale', sourceId: number): Promise<void> => {
  const snapshots = await allAsync(`SELECT id FROM sale_profit_snapshots WHERE sourceKind = ? AND sourceId = ?`, [sourceKind, sourceId]);
  const ids = (snapshots || []).map((row: any) => Number(row.id)).filter((id: number) => id > 0);
  if (ids.length) {
    await runAsync(`DELETE FROM sale_profit_allocations WHERE snapshotId IN (${ids.map(() => '?').join(',')})`, ids);
  }
  await runAsync(`DELETE FROM sale_profit_snapshots WHERE sourceKind = ? AND sourceId = ?`, [sourceKind, sourceId]);
};

export const updateSaleProfitSnapshotSourceStatus = async (
  sourceKind: 'sales_order' | 'installment_sale',
  sourceId: number,
  sourceStatus: 'active' | 'canceled' | 'deleted'
): Promise<void> => {
  await runAsync(`UPDATE sale_profit_snapshots SET sourceStatus = ?, updatedAt = (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')) WHERE sourceKind = ? AND sourceId = ?`, [sourceStatus, sourceKind, sourceId]);
  await runAsync(`UPDATE sale_profit_allocations SET sourceStatus = ?, updatedAt = (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')) WHERE sourceKind = ? AND sourceId = ?`, [sourceStatus, sourceKind, sourceId]);
};

const persistSaleProfitSnapshotItem = async (input: SaleProfitSnapshotItemInput): Promise<void> => {
  const ctx = await resolveOwnershipContextByProfileId(input.ownershipProfileId);
  const quantity = Number(input.quantity) || 0;
  const saleAmount = Number(input.saleAmount) || 0;
  const initialCostPerUnit = Number(input.initialCostPerUnit) || 0;
  const marketCostPerUnit = Number(input.marketCostPerUnit) || 0;
  const initialCostAmount = initialCostPerUnit * quantity;
  const marketCostAmount = marketCostPerUnit * quantity;
  let ownerGainAmount = 0;
  let sharedProfitAmount = 0;
  let notes = String(input.fallbackNotes || '').trim();

  if (ctx.ownershipType === 'personal') {
    ownerGainAmount = marketCostAmount - initialCostAmount;
    sharedProfitAmount = saleAmount - marketCostAmount;
  } else {
    ownerGainAmount = 0;
    sharedProfitAmount = saleAmount - initialCostAmount;
  }
  const totalProfitAmount = ownerGainAmount + sharedProfitAmount;

  const snapshotInsert = await runAsync(
    `INSERT INTO sale_profit_snapshots (
      sourceKind, sourceId, sourceItemRefType, sourceItemId, saleDate, itemType, itemId, itemDescription,
      quantity, ownershipProfileId, ownershipTitle, ownershipType, profitShareProfileId, profitShareProfileTitle,
      initialCostPerUnit, marketCostPerUnit, saleUnitPrice, itemDiscount, saleAmount,
      initialCostAmount, marketCostAmount, ownerGainAmount, sharedProfitAmount, totalProfitAmount, sourceStatus, notes
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      input.sourceKind,
      input.sourceId,
      input.sourceItemRefType,
      input.sourceItemId,
      input.saleDate || null,
      input.itemType,
      input.itemId,
      input.itemDescription,
      quantity,
      ctx.ownershipProfileId,
      ctx.ownershipTitle,
      ctx.ownershipType,
      ctx.profitShareProfileId,
      ctx.profitShareProfileTitle,
      initialCostPerUnit,
      marketCostPerUnit,
      Number(input.saleUnitPrice) || 0,
      Number(input.itemDiscount) || 0,
      saleAmount,
      initialCostAmount,
      marketCostAmount,
      ownerGainAmount,
      sharedProfitAmount,
      totalProfitAmount,
      'active',
      notes || null,
    ]
  );
  const snapshotId = Number(snapshotInsert.lastID || 0);

  const ownerAllocations = ctx.ownershipType === 'personal' ? allocateAmountAcrossShares(ownerGainAmount, ctx.ownershipItems) : [];
  const sharedAllocations = allocateAmountAcrossShares(sharedProfitAmount, ctx.profitShareItems);

  if (ctx.ownershipType === 'personal' && !ownerAllocations.length && ownerGainAmount !== 0) {
    notes = [notes, 'سهم مالک شخصی یافت نشد.'].filter(Boolean).join(' | ');
    await runAsync(`UPDATE sale_profit_snapshots SET notes = ? WHERE id = ?`, [notes, snapshotId]);
  }

  const allAllocations = [
    ...ownerAllocations.map((row) => ({ ...row, allocationType: 'owner_gain' })),
    ...sharedAllocations.map((row) => ({ ...row, allocationType: 'shared_profit' })),
  ];

  for (const allocation of allAllocations) {
    await runAsync(
      `INSERT INTO sale_profit_allocations (
        snapshotId, sourceKind, sourceId, sourceItemRefType, sourceItemId, storePartnerId, allocationType, sharePercent, amount, sourceStatus, notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        snapshotId,
        input.sourceKind,
        input.sourceId,
        input.sourceItemRefType,
        input.sourceItemId,
        allocation.storePartnerId,
        allocation.allocationType,
        allocation.sharePercent,
        allocation.amount,
        'active',
        allocation.partnerName || null,
      ]
    );
  }
};

export const snapshotSalesOrderProfitAllocations = async (orderId: number, saleDate?: string | null): Promise<void> => {
  await purgeProfitSnapshotsForSource('sales_order', orderId);
  const rows = await allAsync(
    `SELECT soi.id as sourceItemId, soi.orderId as sourceId, soi.itemType, soi.itemId, soi.description,
            soi.quantity, soi.unitPrice, soi.discountPerItem, soi.buyPrice, soi.totalPrice,
            ph.purchasePrice as phonePurchasePrice, ph.ownershipProfileId as phoneOwnershipProfileId,
            pr.purchasePrice as productPurchasePrice, pr.ownershipProfileId as productOwnershipProfileId
       FROM sales_order_items soi
       LEFT JOIN phones ph ON soi.itemType = 'phone' AND ph.id = soi.itemId
       LEFT JOIN products pr ON soi.itemType = 'inventory' AND pr.id = soi.itemId
      WHERE soi.orderId = ?
      ORDER BY soi.id ASC`,
    [orderId]
  );

  for (const row of rows as any[]) {
    const initialCostPerUnit = row.itemType === 'phone'
      ? Number(row.phonePurchasePrice) || 0
      : row.itemType === 'inventory'
        ? Number(row.productPurchasePrice) || 0
        : 0;
    const ownershipProfileId = row.itemType === 'phone'
      ? Number(row.phoneOwnershipProfileId) || null
      : row.itemType === 'inventory'
        ? Number(row.productOwnershipProfileId) || null
        : null;
    await persistSaleProfitSnapshotItem({
      sourceKind: 'sales_order',
      sourceId: Number(row.sourceId),
      sourceItemRefType: 'sales_order_item',
      sourceItemId: Number(row.sourceItemId),
      saleDate: saleDate || null,
      itemType: row.itemType,
      itemId: Number(row.itemId) || null,
      itemDescription: String(row.description || '').trim() || `آیتم ${row.sourceItemId}`,
      quantity: Number(row.quantity) || 0,
      saleUnitPrice: Number(row.unitPrice) || 0,
      itemDiscount: Number(row.discountPerItem) || 0,
      saleAmount: Number(row.totalPrice) || 0,
      initialCostPerUnit,
      marketCostPerUnit: Number(row.buyPrice) || initialCostPerUnit || 0,
      ownershipProfileId,
      fallbackNotes: ownershipProfileId ? null : 'مالکیت مشخص نبود؛ تلاش شد پروفایل پیش‌فرض اعمال شود.',
    });
  }
};

export const snapshotInstallmentSaleProfitAllocations = async (saleId: number): Promise<void> => {
  await purgeProfitSnapshotsForSource('installment_sale', saleId);
  const sale = await getAsync(`SELECT installmentsStartDate FROM installment_sales WHERE id = ?`, [saleId]);
  const saleDate = sale?.installmentsStartDate ? (() => {
    const raw = String(sale.installmentsStartDate || '').trim();
    const m = moment(raw, ['YYYY-MM-DD', 'jYYYY/jMM/jDD', moment.ISO_8601], true);
    return m.isValid() ? m.locale('en').format('YYYY-MM-DD') : raw || null;
  })() : null;
  const rows = await allAsync(
    `SELECT isi.id as sourceItemId, isi.saleId as sourceId, isi.itemType, isi.itemId, isi.description,
            isi.quantity, isi.unitPrice, isi.buyPrice, isi.totalPrice,
            ph.purchasePrice as phonePurchasePrice, ph.ownershipProfileId as phoneOwnershipProfileId,
            pr.purchasePrice as productPurchasePrice, pr.ownershipProfileId as productOwnershipProfileId
       FROM installment_sale_items isi
       LEFT JOIN phones ph ON isi.itemType = 'phone' AND ph.id = isi.itemId
       LEFT JOIN products pr ON isi.itemType = 'inventory' AND pr.id = isi.itemId
      WHERE isi.saleId = ?
      ORDER BY isi.id ASC`,
    [saleId]
  );

  for (const row of rows as any[]) {
    const initialCostPerUnit = row.itemType === 'phone'
      ? Number(row.phonePurchasePrice) || 0
      : row.itemType === 'inventory'
        ? Number(row.productPurchasePrice) || 0
        : 0;
    const ownershipProfileId = row.itemType === 'phone'
      ? Number(row.phoneOwnershipProfileId) || null
      : row.itemType === 'inventory'
        ? Number(row.productOwnershipProfileId) || null
        : null;
    await persistSaleProfitSnapshotItem({
      sourceKind: 'installment_sale',
      sourceId: Number(row.sourceId),
      sourceItemRefType: 'installment_sale_item',
      sourceItemId: Number(row.sourceItemId),
      saleDate,
      itemType: row.itemType,
      itemId: Number(row.itemId) || null,
      itemDescription: String(row.description || '').trim() || `آیتم ${row.sourceItemId}`,
      quantity: Number(row.quantity) || 0,
      saleUnitPrice: Number(row.unitPrice) || 0,
      itemDiscount: 0,
      saleAmount: Number(row.totalPrice) || 0,
      initialCostPerUnit,
      marketCostPerUnit: Number(row.buyPrice) || initialCostPerUnit || 0,
      ownershipProfileId,
      fallbackNotes: ownershipProfileId ? null : 'مالکیت مشخص نبود؛ تلاش شد پروفایل پیش‌فرض اعمال شود.',
    });
  }
};

const buildSaleProfitSnapshotResponse = async (sourceKind: 'sales_order' | 'installment_sale', sourceId: number): Promise<any> => {
  const snapshots = await allAsync(
    `SELECT * FROM sale_profit_snapshots WHERE sourceKind = ? AND sourceId = ? ORDER BY id ASC`,
    [sourceKind, sourceId]
  );
  const allocations = await allAsync(
    `SELECT spa.*, sp.name as partnerName, sp.colorTag
       FROM sale_profit_allocations spa
       LEFT JOIN store_partners sp ON sp.id = spa.storePartnerId
      WHERE spa.sourceKind = ? AND spa.sourceId = ?
      ORDER BY spa.id ASC`,
    [sourceKind, sourceId]
  );

  const bySnapshot = new Map<number, any[]>();
  for (const row of allocations as any[]) {
    const key = Number(row.snapshotId) || 0;
    if (!bySnapshot.has(key)) bySnapshot.set(key, []);
    bySnapshot.get(key)!.push(row);
  }

  const partnerMap = new Map<number, any>();
  for (const row of allocations as any[]) {
    const pid = Number(row.storePartnerId) || 0;
    if (!pid) continue;
    if (!partnerMap.has(pid)) {
      partnerMap.set(pid, {
        storePartnerId: pid,
        partnerName: row.partnerName || `شریک ${pid}`,
        colorTag: row.colorTag || null,
        ownerGainAmount: 0,
        sharedProfitAmount: 0,
        totalAmount: 0,
      });
    }
    const bucket = partnerMap.get(pid)!;
    const amount = Number(row.amount) || 0;
    if (row.allocationType === 'owner_gain') bucket.ownerGainAmount += amount;
    if (row.allocationType === 'shared_profit') bucket.sharedProfitAmount += amount;
    bucket.totalAmount += amount;
  }

  const totals = (snapshots as any[]).reduce((acc, row) => {
    acc.saleAmount += Number(row.saleAmount) || 0;
    acc.initialCostAmount += Number(row.initialCostAmount) || 0;
    acc.marketCostAmount += Number(row.marketCostAmount) || 0;
    acc.ownerGainAmount += Number(row.ownerGainAmount) || 0;
    acc.sharedProfitAmount += Number(row.sharedProfitAmount) || 0;
    acc.totalProfitAmount += Number(row.totalProfitAmount) || 0;
    return acc;
  }, {
    saleAmount: 0,
    initialCostAmount: 0,
    marketCostAmount: 0,
    ownerGainAmount: 0,
    sharedProfitAmount: 0,
    totalProfitAmount: 0,
  });

  return {
    sourceKind,
    sourceId,
    totals,
    items: (snapshots as any[]).map((row) => ({
      ...row,
      allocations: bySnapshot.get(Number(row.id) || 0) || [],
    })),
    partnerTotals: Array.from(partnerMap.values()).sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount)),
  };
};

export const getSalesOrderProfitSnapshotFromDb = async (orderId: number): Promise<any> => {
  return buildSaleProfitSnapshotResponse('sales_order', orderId);
};

export const getInstallmentSaleProfitSnapshotFromDb = async (saleId: number): Promise<any> => {
  return buildSaleProfitSnapshotResponse('installment_sale', saleId);
};


type PartnerReportRange = { fromDateIso?: string | null; toDateIso?: string | null; partnerId?: number | null; };


type EffectivePartnerRow = { storePartnerId: number; partnerName: string; colorTag?: string | null; notes?: string | null; legacyPartnerId?: number | null };

type LegacyPartnerContext = {
  partners: EffectivePartnerRow[];
  defaultShareMap: Map<number, number>;
  legacyToStorePartnerId: Map<number, number>;
  storeLegacyPartnerIds: Set<number>;
};

const isStoreLegacyName = (value: any): boolean => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'مغازه' || normalized === 'store' || normalized === 'shop' || normalized === 'فروشگاه';
};

const getLegacyPartnersForFallback = async (): Promise<EffectivePartnerRow[]> => {
  const rows = await allAsync(`SELECT id, partnerName FROM partners WHERE partnerType = 'Supplier' ORDER BY id ASC`).catch(() => [] as any[]);
  return (rows as any[])
    .filter((row) => !isStoreLegacyName(row.partnerName))
    .map((row) => ({
      storePartnerId: Number(row.id),
      legacyPartnerId: Number(row.id),
      partnerName: String(row.partnerName || `شریک ${row.id}`),
      colorTag: null,
      notes: null,
    }));
};

const getLegacyPartnerContextForReports = async (): Promise<LegacyPartnerContext> => {
  const hasCore = await hasStoreOwnershipCoreTables();
  let partners: EffectivePartnerRow[] = [];
  const legacyToStorePartnerId = new Map<number, number>();
  if (hasCore) {
    const rows = await listStorePartnersFromDb().catch(() => [] as any[]);
    partners = (rows as any[])
      .filter((row) => Number(row.isActive ?? 1) === 1)
      .map((row) => ({
        storePartnerId: Number(row.id),
        partnerName: String(row.name || `شریک ${row.id}`),
        colorTag: row.colorTag || null,
        notes: row.notes || null,
        legacyPartnerId: Array.isArray(row.legacyLinks) && row.legacyLinks.length ? Number(row.legacyLinks[0].legacyPartnerId) : null,
      }));
    for (const row of rows as any[]) {
      const links = Array.isArray(row.legacyLinks) ? row.legacyLinks : [];
      for (const link of links) {
        legacyToStorePartnerId.set(Number(link.legacyPartnerId), Number(row.id));
      }
    }
  }
  if (!partners.length) {
    partners = await getLegacyPartnersForFallback();
    for (const partner of partners) {
      if (partner.legacyPartnerId != null) legacyToStorePartnerId.set(Number(partner.legacyPartnerId), Number(partner.storePartnerId));
    }
  }

  const defaultShareMap = new Map<number, number>();
  if (hasCore && partners.length) {
    const defaultProfile: any = await getAsync(`SELECT id FROM profit_share_profiles WHERE isDefault = 1 ORDER BY id DESC LIMIT 1`).catch(() => null);
    if (defaultProfile?.id) {
      const items = await allAsync(`SELECT storePartnerId, sharePercent FROM profit_share_profile_items WHERE profileId = ?`, [Number(defaultProfile.id)]).catch(() => [] as any[]);
      for (const item of items as any[]) defaultShareMap.set(Number(item.storePartnerId), Number(item.sharePercent) || 0);
    }
  }
  if (!defaultShareMap.size && partners.length) {
    const base = Math.floor((10000 / partners.length)) / 100;
    partners.forEach((partner, index) => {
      defaultShareMap.set(Number(partner.storePartnerId), index === partners.length - 1 ? normalizePercent(100 - base * (partners.length - 1)) : base);
    });
  }

  const storeLegacyRows = await allAsync(`SELECT id, partnerName FROM partners WHERE partnerType = 'Supplier' ORDER BY id ASC`).catch(() => [] as any[]);
  const storeLegacyPartnerIds = new Set<number>((storeLegacyRows as any[]).filter((row) => isStoreLegacyName(row.partnerName)).map((row) => Number(row.id)));

  return { partners, defaultShareMap, legacyToStorePartnerId, storeLegacyPartnerIds };
};

const resolveLegacyOwnershipShares = async (legacySupplierId: number | null | undefined, context?: LegacyPartnerContext): Promise<{ ownershipKind: 'personal' | 'store'; shares: Array<{ storePartnerId: number; sharePercent: number }> }> => {
  const ctx = context || await getLegacyPartnerContextForReports();
  const defaultShares = Array.from(ctx.defaultShareMap.entries()).map(([storePartnerId, sharePercent]) => ({ storePartnerId, sharePercent }));
  if (!legacySupplierId || ctx.storeLegacyPartnerIds.has(Number(legacySupplierId))) {
    return { ownershipKind: 'store', shares: defaultShares };
  }
  const mappedStorePartnerId = ctx.legacyToStorePartnerId.get(Number(legacySupplierId));
  if (mappedStorePartnerId) {
    return { ownershipKind: 'personal', shares: [{ storePartnerId: Number(mappedStorePartnerId), sharePercent: 100 }] };
  }
  return { ownershipKind: 'store', shares: defaultShares };
};

const getLegacySaleRowsForReports = async (range: PartnerReportRange = {}): Promise<any[]> => {
  const orderFilter = buildDateRangeSql('so.transactionDate', range);
  const salesOrderRows = await allAsync(
    `SELECT 'sales_order' as sourceKind, so.id as sourceId, soi.id as sourceItemId, so.transactionDate as saleDate,
            soi.itemType, soi.itemId, soi.description as itemDescription, soi.quantity, soi.totalPrice as saleAmount,
            CASE
              WHEN soi.itemType = 'phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(soi.buyPrice, 0), ph.purchasePrice, 0)
              WHEN soi.itemType = 'inventory' THEN COALESCE(NULLIF(soi.buyPrice, 0), pr.purchasePrice, 0)
              ELSE COALESCE(soi.buyPrice, 0)
            END as marketUnitBuyPrice,
            ph.model as phoneModel, ph.imei as phoneImei, ph.purchasePrice as phonePurchasePrice, ph.currentPurchasePrice as phoneCurrentPurchasePrice, ph.supplierId as phoneSupplierId,
            pr.name as productName, pr.purchasePrice as productPurchasePrice, pr.supplierId as productSupplierId
       FROM sales_order_items soi
       JOIN sales_orders so ON so.id = soi.orderId
       LEFT JOIN phones ph ON soi.itemType = 'phone' AND ph.id = soi.itemId
       LEFT JOIN products pr ON soi.itemType = 'inventory' AND pr.id = soi.itemId
      WHERE COALESCE(so.status, 'active') = 'active'${orderFilter.sql}
      ORDER BY so.transactionDate DESC, so.id DESC, soi.id DESC`,
    orderFilter.params
  ).catch(() => [] as any[]);

  const installmentFilter = buildDateRangeSql('ins.dateCreated', range);
  const installmentRows = await allAsync(
    `SELECT 'installment_sale' as sourceKind, ins.id as sourceId, isi.id as sourceItemId, ins.dateCreated as saleDate,
            isi.itemType, isi.itemId, isi.description as itemDescription, isi.quantity, isi.totalPrice as saleAmount,
            CASE
              WHEN isi.itemType = 'phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(isi.buyPrice, 0), ph.purchasePrice, 0)
              WHEN isi.itemType = 'inventory' THEN COALESCE(NULLIF(isi.buyPrice, 0), pr.purchasePrice, 0)
              ELSE COALESCE(isi.buyPrice, 0)
            END as marketUnitBuyPrice,
            ph.model as phoneModel, ph.imei as phoneImei, ph.purchasePrice as phonePurchasePrice, ph.currentPurchasePrice as phoneCurrentPurchasePrice, ph.supplierId as phoneSupplierId,
            pr.name as productName, pr.purchasePrice as productPurchasePrice, pr.supplierId as productSupplierId
       FROM installment_sale_items isi
       JOIN installment_sales ins ON ins.id = isi.saleId
       LEFT JOIN phones ph ON isi.itemType = 'phone' AND ph.id = isi.itemId
       LEFT JOIN products pr ON isi.itemType = 'inventory' AND pr.id = isi.itemId
      WHERE 1 = 1${installmentFilter.sql}
      ORDER BY ins.dateCreated DESC, ins.id DESC, isi.id DESC`,
    installmentFilter.params
  ).catch(() => [] as any[]);

  return [...(salesOrderRows as any[]), ...(installmentRows as any[])];
};

const buildLegacyComputedSales = async (range: PartnerReportRange = {}): Promise<any[]> => {
  const context = await getLegacyPartnerContextForReports();
  const sourceRows = await getLegacySaleRowsForReports(range);
  const computed: any[] = [];
  for (const row of sourceRows as any[]) {
    const itemType = String(row.itemType || 'service');
    const quantity = Number(row.quantity) || 0;
    const saleAmount = Number(row.saleAmount) || 0;
    const initialUnitCost = itemType === 'phone'
      ? Number(row.phonePurchasePrice) || 0
      : itemType === 'inventory'
        ? Number(row.productPurchasePrice) || 0
        : 0;
    const initialCostAmount = itemType === 'phone' ? initialUnitCost : initialUnitCost * quantity;
    const marketUnitBuyPrice = Number(row.marketUnitBuyPrice) || 0;
    const marketCostAmount = itemType === 'service'
      ? 0
      : marketUnitBuyPrice > 0
        ? (itemType === 'phone' ? marketUnitBuyPrice : marketUnitBuyPrice * quantity)
        : initialCostAmount;
    const legacySupplierId = itemType === 'phone' ? Number(row.phoneSupplierId || 0) : itemType === 'inventory' ? Number(row.productSupplierId || 0) : null;
    const ownership = await resolveLegacyOwnershipShares(legacySupplierId, context);
    const capitalShares = ownership.shares.map((share) => ({ ...share, amount: initialCostAmount * ((Number(share.sharePercent) || 0) / 100) }));
    const ownerGainAmount = ownership.ownershipKind === 'personal' ? (marketCostAmount - initialCostAmount) : 0;
    const sharedProfitAmount = ownership.ownershipKind === 'personal' ? (saleAmount - marketCostAmount) : (saleAmount - initialCostAmount);
    const sharedAllocations = Array.from(context.defaultShareMap.entries()).map(([storePartnerId, sharePercent]) => ({
      storePartnerId,
      sharePercent,
      amount: sharedProfitAmount * ((Number(sharePercent) || 0) / 100),
    }));
    const ownerAllocations = ownership.ownershipKind === 'personal'
      ? ownership.shares.map((share) => ({ ...share, amount: ownerGainAmount * ((Number(share.sharePercent) || 0) / 100) }))
      : [];
    computed.push({
      sourceKind: row.sourceKind,
      sourceId: Number(row.sourceId),
      sourceItemId: Number(row.sourceItemId),
      saleDate: row.saleDate,
      itemType,
      itemId: row.itemId != null ? Number(row.itemId) : null,
      itemDescription: row.phoneModel || row.productName || row.itemDescription || '-',
      quantity,
      saleAmount,
      initialCostAmount,
      marketCostAmount,
      ownershipKind: ownership.ownershipKind,
      ownershipShares: ownership.shares,
      capitalAllocations: capitalShares,
      ownerGainAmount,
      ownerAllocations,
      sharedProfitAmount,
      sharedAllocations,
      totalProfitAmount: ownerGainAmount + sharedProfitAmount,
      documentKey: row.sourceKind === 'sales_order' ? `INV-${row.sourceId}` : `INS-${row.sourceId}`,
      model: row.phoneModel || null,
      imei: row.phoneImei || null,
      legacySupplierId: legacySupplierId || null,
    });
  }
  return computed;
};

const summarizeLegacyProfitRows = async (range: PartnerReportRange = {}) => {
  const context = await getLegacyPartnerContextForReports();
  const computed = await buildLegacyComputedSales(range);
  const summaryMap = new Map<number, any>();
  for (const partner of context.partners) {
    summaryMap.set(Number(partner.storePartnerId), {
      storePartnerId: Number(partner.storePartnerId),
      partnerName: partner.partnerName,
      colorTag: partner.colorTag || null,
      capitalReturnAmount: 0,
      ownerGainAmount: 0,
      sharedProfitAmount: 0,
      totalAmount: 0,
      settlementEntitlementAmount: 0,
      documentsCount: 0,
      phoneLinesCount: 0,
      accessoryLinesCount: 0,
      serviceLinesCount: 0,
      _docKeys: new Set<string>(),
    });
  }
  const ensure = (partnerId: number) => {
    if (!summaryMap.has(partnerId)) {
      const partner = context.partners.find((item) => Number(item.storePartnerId) === Number(partnerId));
      summaryMap.set(partnerId, {
        storePartnerId: partnerId,
        partnerName: partner?.partnerName || `شریک ${partnerId}`,
        colorTag: partner?.colorTag || null,
        capitalReturnAmount: 0,
        ownerGainAmount: 0,
        sharedProfitAmount: 0,
        totalAmount: 0,
        settlementEntitlementAmount: 0,
        documentsCount: 0,
        phoneLinesCount: 0,
        accessoryLinesCount: 0,
        serviceLinesCount: 0,
        _docKeys: new Set<string>(),
      });
    }
    return summaryMap.get(partnerId);
  };
  for (const row of computed) {
    for (const alloc of row.capitalAllocations) {
      const bucket = ensure(Number(alloc.storePartnerId));
      bucket.capitalReturnAmount += Number(alloc.amount) || 0;
      bucket.settlementEntitlementAmount += Number(alloc.amount) || 0;
      bucket._docKeys.add(`${row.sourceKind}:${row.sourceId}`);
      if (row.itemType === 'phone') bucket.phoneLinesCount += 1;
      else if (row.itemType === 'inventory') bucket.accessoryLinesCount += 1;
      else bucket.serviceLinesCount += 1;
    }
    for (const alloc of row.ownerAllocations) {
      const bucket = ensure(Number(alloc.storePartnerId));
      bucket.ownerGainAmount += Number(alloc.amount) || 0;
      bucket.totalAmount += Number(alloc.amount) || 0;
      bucket.settlementEntitlementAmount += Number(alloc.amount) || 0;
      bucket._docKeys.add(`${row.sourceKind}:${row.sourceId}`);
    }
    for (const alloc of row.sharedAllocations) {
      const bucket = ensure(Number(alloc.storePartnerId));
      bucket.sharedProfitAmount += Number(alloc.amount) || 0;
      bucket.totalAmount += Number(alloc.amount) || 0;
      bucket.settlementEntitlementAmount += Number(alloc.amount) || 0;
      bucket._docKeys.add(`${row.sourceKind}:${row.sourceId}`);
    }
  }
  const summaries = Array.from(summaryMap.values()).map((row: any) => ({ ...row, documentsCount: row._docKeys.size })).map(({ _docKeys, ...rest }) => rest);
  const totals = summaries.reduce((acc: any, row: any) => {
    acc.capitalReturnAmount += Number(row.capitalReturnAmount) || 0;
    acc.ownerGainAmount += Number(row.ownerGainAmount) || 0;
    acc.sharedProfitAmount += Number(row.sharedProfitAmount) || 0;
    acc.totalAmount += Number(row.totalAmount) || 0;
    acc.settlementEntitlementAmount += Number(row.settlementEntitlementAmount) || 0;
    acc.documentsCount += Number(row.documentsCount) || 0;
    acc.phoneLinesCount += Number(row.phoneLinesCount) || 0;
    acc.accessoryLinesCount += Number(row.accessoryLinesCount) || 0;
    acc.serviceLinesCount += Number(row.serviceLinesCount) || 0;
    return acc;
  }, { capitalReturnAmount: 0, ownerGainAmount: 0, sharedProfitAmount: 0, totalAmount: 0, settlementEntitlementAmount: 0, documentsCount: 0, phoneLinesCount: 0, accessoryLinesCount: 0, serviceLinesCount: 0 });
  return { context, computed, summaries, totals };
};

const buildDateRangeSql = (field: string, range?: PartnerReportRange) => {
  const clauses: string[] = [];
  const params: any[] = [];
  if (range?.fromDateIso) {
    clauses.push(`${field} >= ?`);
    params.push(range.fromDateIso);
  }
  if (range?.toDateIso) {
    clauses.push(`${field} <= ?`);
    params.push(range.toDateIso);
  }
  return { sql: clauses.length ? ` AND ${clauses.join(' AND ')}` : '', params };
};

const mapActiveStorePartners = async () => {
  const partners = await allAsync(`SELECT id, name, colorTag, notes FROM store_partners WHERE isActive = 1 ORDER BY id ASC`);
  return (partners as any[]).map((row) => ({
    storePartnerId: Number(row.id),
    partnerName: row.name,
    colorTag: row.colorTag || null,
    notes: row.notes || null,
  }));
};

export const getPartnerProfitReportFromDb = async (range: PartnerReportRange = {}): Promise<any> => {
  const hasSnapshots = await tableExists('sale_profit_snapshots') && await tableExists('sale_profit_allocations');
  if (!hasSnapshots) {
    const legacy = await summarizeLegacyProfitRows(range);
    const selectedPartner = range.partnerId ? legacy.summaries.find((item: any) => Number(item.storePartnerId) === Number(range.partnerId)) || null : null;
    return { partners: legacy.context.partners, summaries: legacy.summaries, totals: legacy.totals, selectedPartner };
  }

  const partners = await mapActiveStorePartners();
  const dateFilter = buildDateRangeSql('sps.saleDate', range);
  const rows = await allAsync(
    `SELECT spa.storePartnerId, sp.name as partnerName, sp.colorTag, spa.allocationType, spa.amount,
            sps.sourceKind, sps.sourceId, sps.itemType, sps.saleDate
       FROM sale_profit_allocations spa
       JOIN sale_profit_snapshots sps ON sps.id = spa.snapshotId
       JOIN store_partners sp ON sp.id = spa.storePartnerId
      WHERE spa.sourceStatus = 'active'
        AND sps.sourceStatus = 'active'${dateFilter.sql}
      ORDER BY sps.saleDate DESC, spa.id DESC`,
    dateFilter.params
  ).catch(() => [] as any[]);

  const capitalRows = await allAsync(
    `SELECT sps.sourceKind, sps.sourceId, sps.itemType, sps.saleDate, sps.initialCostAmount,
            opi.storePartnerId, sp.name as partnerName, sp.colorTag, opi.sharePercent
       FROM sale_profit_snapshots sps
       JOIN ownership_profile_items opi ON opi.ownershipProfileId = sps.ownershipProfileId
       JOIN store_partners sp ON sp.id = opi.storePartnerId
      WHERE sps.sourceStatus = 'active'${dateFilter.sql}
      ORDER BY sps.saleDate DESC, sps.id DESC, opi.id DESC`,
    dateFilter.params
  ).catch(() => [] as any[]);

  if (!(rows as any[]).length && !(capitalRows as any[]).length) {
    const legacy = await summarizeLegacyProfitRows(range);
    const selectedPartner = range.partnerId ? legacy.summaries.find((item: any) => Number(item.storePartnerId) === Number(range.partnerId)) || null : null;
    return { partners: legacy.context.partners, summaries: legacy.summaries, totals: legacy.totals, selectedPartner };
  }

  const summaryMap = new Map<number, any>();
  for (const partner of partners) {
    summaryMap.set(Number(partner.storePartnerId), {
      storePartnerId: Number(partner.storePartnerId),
      partnerName: partner.partnerName,
      colorTag: partner.colorTag || null,
      capitalReturnAmount: 0,
      ownerGainAmount: 0,
      sharedProfitAmount: 0,
      totalAmount: 0,
      settlementEntitlementAmount: 0,
      documentsCount: 0,
      phoneLinesCount: 0,
      accessoryLinesCount: 0,
      serviceLinesCount: 0,
      _docKeys: new Set<string>(),
    });
  }

  const ensureBucket = (partnerId: number, partnerName?: string | null, colorTag?: string | null) => {
    if (!summaryMap.has(partnerId)) {
      summaryMap.set(partnerId, {
        storePartnerId: partnerId,
        partnerName: partnerName || `شریک ${partnerId}`,
        colorTag: colorTag || null,
        capitalReturnAmount: 0,
        ownerGainAmount: 0,
        sharedProfitAmount: 0,
        totalAmount: 0,
        settlementEntitlementAmount: 0,
        documentsCount: 0,
        phoneLinesCount: 0,
        accessoryLinesCount: 0,
        serviceLinesCount: 0,
        _docKeys: new Set<string>(),
      });
    }
    return summaryMap.get(partnerId)!;
  };

  for (const row of capitalRows as any[]) {
    const partnerId = Number(row.storePartnerId) || 0;
    const bucket = ensureBucket(partnerId, row.partnerName, row.colorTag);
    const capitalAmount = (Number(row.initialCostAmount) || 0) * ((Number(row.sharePercent) || 0) / 100);
    bucket.capitalReturnAmount += capitalAmount;
    bucket.settlementEntitlementAmount += capitalAmount;
    bucket._docKeys.add(`${row.sourceKind}:${row.sourceId}`);
    if (row.itemType === 'phone') bucket.phoneLinesCount += 1;
    else if (row.itemType === 'inventory') bucket.accessoryLinesCount += 1;
    else bucket.serviceLinesCount += 1;
  }

  for (const row of rows as any[]) {
    const partnerId = Number(row.storePartnerId) || 0;
    const bucket = ensureBucket(partnerId, row.partnerName, row.colorTag);
    const amount = Number(row.amount) || 0;
    if (row.allocationType === 'owner_gain') bucket.ownerGainAmount += amount;
    if (row.allocationType === 'shared_profit') bucket.sharedProfitAmount += amount;
    bucket.totalAmount += amount;
    bucket.settlementEntitlementAmount += amount;
    bucket._docKeys.add(`${row.sourceKind}:${row.sourceId}`);
  }

  const summaries = Array.from(summaryMap.values()).map((row: any) => ({
    ...row,
    documentsCount: row._docKeys.size,
  })).map(({ _docKeys, ...rest }) => rest)
    .sort((a: any, b: any) => Number(b.settlementEntitlementAmount) - Number(a.settlementEntitlementAmount));

  const totals = summaries.reduce((acc: any, row: any) => {
    acc.capitalReturnAmount += Number(row.capitalReturnAmount) || 0;
    acc.ownerGainAmount += Number(row.ownerGainAmount) || 0;
    acc.sharedProfitAmount += Number(row.sharedProfitAmount) || 0;
    acc.totalAmount += Number(row.totalAmount) || 0;
    acc.settlementEntitlementAmount += Number(row.settlementEntitlementAmount) || 0;
    acc.documentsCount += Number(row.documentsCount) || 0;
    acc.phoneLinesCount += Number(row.phoneLinesCount) || 0;
    acc.accessoryLinesCount += Number(row.accessoryLinesCount) || 0;
    acc.serviceLinesCount += Number(row.serviceLinesCount) || 0;
    return acc;
  }, {
    capitalReturnAmount: 0,
    ownerGainAmount: 0,
    sharedProfitAmount: 0,
    totalAmount: 0,
    settlementEntitlementAmount: 0,
    documentsCount: 0,
    phoneLinesCount: 0,
    accessoryLinesCount: 0,
    serviceLinesCount: 0,
  });

  const selectedPartner = range.partnerId ? summaries.find((item: any) => Number(item.storePartnerId) === Number(range.partnerId)) || null : null;

  return { partners, summaries, totals, selectedPartner };
};


const buildLegacyAccessoriesReportFromDb = async (range: PartnerReportRange & { partnerId: number }): Promise<any> => {
  const context = await getLegacyPartnerContextForReports();
  const partner = context.partners.find((item) => Number(item.storePartnerId) === Number(range.partnerId));
  if (!partner) throw new Error('شریک موردنظر پیدا نشد.');
  const computed = await buildLegacyComputedSales(range);
  const sales = computed
    .filter((row) => row.itemType === 'inventory')
    .map((row) => {
      const ownershipSharePercent = Number((row.capitalAllocations.find((item: any) => Number(item.storePartnerId) === Number(range.partnerId))?.sharePercent) || 0);
      const capitalReturnAmount = Number((row.capitalAllocations.find((item: any) => Number(item.storePartnerId) === Number(range.partnerId))?.amount) || 0);
      const ownerGainAmount = Number((row.ownerAllocations.find((item: any) => Number(item.storePartnerId) === Number(range.partnerId))?.amount) || 0);
      const sharedProfitAmount = Number((row.sharedAllocations.find((item: any) => Number(item.storePartnerId) === Number(range.partnerId))?.amount) || 0);
      return {
        snapshotId: null,
        saleDate: row.saleDate,
        sourceKind: row.sourceKind,
        sourceId: row.sourceId,
        sourceItemId: row.sourceItemId,
        itemName: row.itemDescription,
        quantity: row.quantity,
        grossSaleAmount: row.saleAmount,
        initialCostAmount: row.initialCostAmount,
        marketCostAmount: row.marketCostAmount,
        ownershipSharePercent,
        attributedSaleAmount: row.saleAmount * (ownershipSharePercent / 100),
        capitalReturnAmount,
        ownerGainAmount,
        sharedProfitAmount,
        totalProfitAmount: ownerGainAmount + sharedProfitAmount,
        settlementEntitlementAmount: capitalReturnAmount + ownerGainAmount + sharedProfitAmount,
        documentKey: row.documentKey,
      };
    })
    .filter((row) => row.ownershipSharePercent > 0 || row.totalProfitAmount !== 0 || row.capitalReturnAmount !== 0);

  const productCols = await getColumnNamesSafe('products');
  const hasOwnershipProfileId = productCols.has('ownershipProfileId');
  const products = await allAsync(`SELECT pr.id, pr.name, pr.stock_quantity, pr.purchasePrice, pr.date_added, pr.supplierId${hasOwnershipProfileId ? ', pr.ownershipProfileId' : ', NULL as ownershipProfileId'} FROM products pr ORDER BY pr.id DESC`).catch(() => [] as any[]);
  const currentInventory: any[] = [];
  for (const row of products as any[]) {
    let sharePercent = 0;
    if (row.ownershipProfileId) {
      const item = await getAsync(`SELECT sharePercent FROM ownership_profile_items WHERE ownershipProfileId = ? AND storePartnerId = ?`, [Number(row.ownershipProfileId), Number(range.partnerId)]).catch(() => null);
      sharePercent = Number(item?.sharePercent) || 0;
    }
    if (!sharePercent) {
      const ownership = await resolveLegacyOwnershipShares(Number(row.supplierId || 0), context);
      sharePercent = Number((ownership.shares.find((item) => Number(item.storePartnerId) === Number(range.partnerId))?.sharePercent) || 0);
    }
    if (!sharePercent) continue;
    const stockQuantity = Number(row.stock_quantity) || 0;
    const purchasePrice = Number(row.purchasePrice) || 0;
    currentInventory.push({
      productId: Number(row.id),
      itemName: row.name,
      stockQuantity,
      purchasePrice,
      sharePercent,
      attributedQuantity: stockQuantity * (sharePercent / 100),
      attributedValue: stockQuantity * purchasePrice * (sharePercent / 100),
      dateAdded: row.date_added,
    });
  }

  const summary = {
    purchasesCount: 0,
    purchasesGrossAmount: 0,
    purchasesAttributedAmount: 0,
    salesCount: sales.length,
    salesGrossAmount: sales.reduce((sum, row) => sum + (Number(row.grossSaleAmount) || 0), 0),
    salesAttributedAmount: sales.reduce((sum, row) => sum + (Number(row.attributedSaleAmount) || 0), 0),
    capitalReturnAmount: sales.reduce((sum, row) => sum + (Number(row.capitalReturnAmount) || 0), 0),
    ownerGainAmount: sales.reduce((sum, row) => sum + (Number(row.ownerGainAmount) || 0), 0),
    sharedProfitAmount: sales.reduce((sum, row) => sum + (Number(row.sharedProfitAmount) || 0), 0),
    totalProfitAmount: sales.reduce((sum, row) => sum + (Number(row.totalProfitAmount) || 0), 0),
    settlementEntitlementAmount: sales.reduce((sum, row) => sum + (Number(row.settlementEntitlementAmount) || 0), 0),
    currentInventoryQuantity: currentInventory.reduce((sum, row) => sum + (Number(row.attributedQuantity) || 0), 0),
    currentInventoryValue: currentInventory.reduce((sum, row) => sum + (Number(row.attributedValue) || 0), 0),
  };

  return { partner, summary, purchases: [], sales, currentInventory };
};

const buildLegacyPhonesReportFromDb = async (range: PartnerReportRange & { partnerId: number }): Promise<any> => {
  const context = await getLegacyPartnerContextForReports();
  const partner = context.partners.find((item) => Number(item.storePartnerId) === Number(range.partnerId));
  if (!partner) throw new Error('شریک موردنظر پیدا نشد.');
  const phones = await allAsync(`SELECT id, model, imei, purchasePrice, purchaseDate, saleDate, status, supplierId FROM phones ORDER BY id DESC`).catch(() => [] as any[]);
  const purchases = [] as any[];
  const currentInventory = [] as any[];
  for (const row of phones as any[]) {
    const ownership = await resolveLegacyOwnershipShares(Number(row.supplierId || 0), context);
    const sharePercent = Number((ownership.shares.find((item) => Number(item.storePartnerId) === Number(range.partnerId))?.sharePercent) || 0);
    if (!sharePercent) continue;
    const purchasePrice = Number(row.purchasePrice) || 0;
    purchases.push({
      phoneId: Number(row.id),
      purchaseDate: row.purchaseDate,
      saleDate: row.saleDate,
      model: row.model,
      imei: row.imei,
      purchasePrice,
      sharePercent,
      attributedPurchaseAmount: purchasePrice * (sharePercent / 100),
      status: row.status,
      documentKey: `PH-${row.id}`,
    });
    if (['in_stock','pending','reserved'].includes(String(row.status || ''))) {
      currentInventory.push({
        phoneId: Number(row.id),
        model: row.model,
        imei: row.imei,
        purchasePrice,
        sharePercent,
        attributedValue: purchasePrice * (sharePercent / 100),
        status: row.status,
      });
    }
  }

  const computed = await buildLegacyComputedSales(range);
  const sales = computed.filter((row) => row.itemType === 'phone').map((row) => {
    const ownershipSharePercent = Number((row.capitalAllocations.find((item: any) => Number(item.storePartnerId) === Number(range.partnerId))?.sharePercent) || 0);
    const capitalReturnAmount = Number((row.capitalAllocations.find((item: any) => Number(item.storePartnerId) === Number(range.partnerId))?.amount) || 0);
    const ownerGainAmount = Number((row.ownerAllocations.find((item: any) => Number(item.storePartnerId) === Number(range.partnerId))?.amount) || 0);
    const sharedProfitAmount = Number((row.sharedAllocations.find((item: any) => Number(item.storePartnerId) === Number(range.partnerId))?.amount) || 0);
    return {
      snapshotId: null,
      saleDate: row.saleDate,
      sourceKind: row.sourceKind,
      sourceId: row.sourceId,
      sourceItemId: row.sourceItemId,
      phoneId: row.itemId,
      model: row.model || row.itemDescription,
      imei: row.imei || '-',
      grossSaleAmount: row.saleAmount,
      initialCostAmount: row.initialCostAmount,
      marketCostAmount: row.marketCostAmount,
      ownershipSharePercent,
      attributedSaleAmount: row.saleAmount * (ownershipSharePercent / 100),
      capitalReturnAmount,
      ownerGainAmount,
      sharedProfitAmount,
      totalProfitAmount: ownerGainAmount + sharedProfitAmount,
      settlementEntitlementAmount: capitalReturnAmount + ownerGainAmount + sharedProfitAmount,
      documentKey: row.documentKey,
    };
  }).filter((row) => row.ownershipSharePercent > 0 || row.totalProfitAmount !== 0 || row.capitalReturnAmount !== 0);

  const summary = {
    purchasesCount: purchases.length,
    purchasesGrossAmount: purchases.reduce((sum, row) => sum + (Number(row.purchasePrice) || 0), 0),
    purchasesAttributedAmount: purchases.reduce((sum, row) => sum + (Number(row.attributedPurchaseAmount) || 0), 0),
    salesCount: sales.length,
    salesGrossAmount: sales.reduce((sum, row) => sum + (Number(row.grossSaleAmount) || 0), 0),
    salesAttributedAmount: sales.reduce((sum, row) => sum + (Number(row.attributedSaleAmount) || 0), 0),
    capitalReturnAmount: sales.reduce((sum, row) => sum + (Number(row.capitalReturnAmount) || 0), 0),
    ownerGainAmount: sales.reduce((sum, row) => sum + (Number(row.ownerGainAmount) || 0), 0),
    sharedProfitAmount: sales.reduce((sum, row) => sum + (Number(row.sharedProfitAmount) || 0), 0),
    totalProfitAmount: sales.reduce((sum, row) => sum + (Number(row.totalProfitAmount) || 0), 0),
    settlementEntitlementAmount: sales.reduce((sum, row) => sum + (Number(row.settlementEntitlementAmount) || 0), 0),
    currentInventoryCount: currentInventory.length,
    currentInventoryValue: currentInventory.reduce((sum, row) => sum + (Number(row.attributedValue) || 0), 0),
  };

  return { partner, summary, purchases, sales, currentInventory };
};

const buildLegacySettlementReportFromDb = async (range: PartnerReportRange = {}): Promise<any> => {
  const profit = await getPartnerProfitReportFromDb(range);
  const partners = profit.partners || [];
  const settlements = [] as any[];
  for (const partner of partners) {
    const [phoneReport, accessoryReport] = await Promise.all([
      buildLegacyPhonesReportFromDb({ ...range, partnerId: Number(partner.storePartnerId) }),
      buildLegacyAccessoriesReportFromDb({ ...range, partnerId: Number(partner.storePartnerId) }),
    ]);
    const summary = (profit.summaries || []).find((item: any) => Number(item.storePartnerId) === Number(partner.storePartnerId)) || {};
    settlements.push({
      storePartnerId: Number(partner.storePartnerId),
      partnerName: partner.partnerName,
      colorTag: partner.colorTag || null,
      capitalReturnAmount: Number(summary.capitalReturnAmount) || 0,
      ownerGainAmount: Number(summary.ownerGainAmount) || 0,
      sharedProfitAmount: Number(summary.sharedProfitAmount) || 0,
      recognizedProfit: Number(summary.totalAmount) || 0,
      settlementEntitlement: Number(summary.settlementEntitlementAmount) || 0,
      phoneInventoryValue: Number(phoneReport.summary.currentInventoryValue) || 0,
      accessoryInventoryValue: Number(accessoryReport.summary.currentInventoryValue) || 0,
      inventoryValue: (Number(phoneReport.summary.currentInventoryValue) || 0) + (Number(accessoryReport.summary.currentInventoryValue) || 0),
      settlementBalance: Number(summary.settlementEntitlementAmount) || 0,
      settlementStatus: (Number(summary.settlementEntitlementAmount) || 0) > 0.5 ? 'creditor' : (Number(summary.settlementEntitlementAmount) || 0) < -0.5 ? 'debtor' : 'settled',
      paidSettlementAmount: 0,
      receivedSettlementAmount: 0,
      netSettledAmount: 0,
      remainingSettlementBalance: Number(summary.settlementEntitlementAmount) || 0,
      remainingSettlementStatus: (Number(summary.settlementEntitlementAmount) || 0) > 0.5 ? 'creditor' : (Number(summary.settlementEntitlementAmount) || 0) < -0.5 ? 'debtor' : 'settled',
    });
  }
  try {
    if (await tableExists('partner_ledger')) {
      const ledgerDateFilter = buildDateRangeSql('pl.transactionDate', range);
      const phoneLedgerRows = await allAsync(
        `SELECT pl.partnerId as storePartnerId,
                SUM(COALESCE(pl.debit, 0)) as receivedAmount,
                COUNT(*) as settlementCount
           FROM partner_ledger pl
          WHERE pl.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
            AND COALESCE(pl.debit, 0) > 0${ledgerDateFilter.sql}
          GROUP BY pl.partnerId`,
        ledgerDateFilter.params
      );
      const phoneLedgerMap = new Map((phoneLedgerRows as any[]).map((row) => [Number(row.storePartnerId), row]));
      for (const row of settlements) {
        const ledger = phoneLedgerMap.get(Number(row.storePartnerId)) as any;
        const receivedAmount = Number(ledger?.receivedAmount) || 0;
        const settlementCount = Number(ledger?.settlementCount) || 0;
        row.receivedSettlementAmount = receivedAmount;
        row.phoneSpecificSettlementAmount = receivedAmount;
        row.phoneSpecificSettlementCount = settlementCount;
        row.netSettledAmount = receivedAmount - (Number(row.paidSettlementAmount) || 0);
        row.remainingSettlementBalance = (Number(row.settlementEntitlement) || 0) - receivedAmount;
        row.remainingSettlementStatus = row.remainingSettlementBalance > 0.5 ? 'creditor' : row.remainingSettlementBalance < -0.5 ? 'debtor' : 'settled';
      }
    }
  } catch (error) {
    console.warn('Legacy phone-specific partner settlement reconciliation skipped:', (error as any)?.message || error);
  }

  const totals = {
    totalSettlementEntitlement: settlements.reduce((sum, row) => sum + (Number(row.settlementEntitlement) || 0), 0),
    totalCapitalReturnAmount: settlements.reduce((sum, row) => sum + (Number(row.capitalReturnAmount) || 0), 0),
    totalOwnerGainAmount: settlements.reduce((sum, row) => sum + (Number(row.ownerGainAmount) || 0), 0),
    totalSharedProfitAmount: settlements.reduce((sum, row) => sum + (Number(row.sharedProfitAmount) || 0), 0),
    totalRecognizedProfit: settlements.reduce((sum, row) => sum + (Number(row.recognizedProfit) || 0), 0),
    totalInventoryValue: settlements.reduce((sum, row) => sum + (Number(row.inventoryValue) || 0), 0),
    totalPhoneInventoryValue: settlements.reduce((sum, row) => sum + (Number(row.phoneInventoryValue) || 0), 0),
    totalAccessoryInventoryValue: settlements.reduce((sum, row) => sum + (Number(row.accessoryInventoryValue) || 0), 0),
    totalPaidSettlements: settlements.reduce((sum, row) => sum + (Number(row.paidSettlementAmount) || 0), 0),
    totalReceivedSettlements: settlements.reduce((sum, row) => sum + (Number(row.receivedSettlementAmount) || 0), 0),
    totalPhoneSpecificSettlements: settlements.reduce((sum, row) => sum + (Number(row.phoneSpecificSettlementAmount) || 0), 0),
  };
  return {
    profile: { id: null, title: 'تقسیم پیش‌فرض سود فروشگاه' },
    partners,
    settlements,
    transactions: [],
    totals,
  };
};

export const getPartnerAccessoriesReportFromDb = async (range: PartnerReportRange & { partnerId: number }): Promise<any> => {
  const hasCore = await hasStoreOwnershipCoreTables();
  if (!hasCore) return buildLegacyAccessoriesReportFromDb(range);
  const partnerId = Number(range.partnerId) || 0;
  const partner = await getAsync(`SELECT id, name, colorTag, notes FROM store_partners WHERE id = ?`, [partnerId]);
  if (!partner) return buildLegacyAccessoriesReportFromDb(range);

  const purchaseFilter = buildDateRangeSql('p.purchaseDate', range);
  const purchaseRows = await allAsync(
    `SELECT p.id as purchaseId, pi.id as purchaseItemId, p.purchaseDate, pr.id as productId, pr.name as itemName,
            pi.quantity, pi.unitCost, pi.lineTotal, opi.sharePercent
       FROM purchase_items pi
       JOIN purchases p ON p.id = pi.purchaseId
       JOIN products pr ON pr.id = pi.productId
       JOIN ownership_profile_items opi ON opi.ownershipProfileId = pr.ownershipProfileId AND opi.storePartnerId = ?
      WHERE 1 = 1${purchaseFilter.sql}
      ORDER BY p.purchaseDate DESC, p.id DESC, pi.id DESC`,
    [partnerId].concat(purchaseFilter.params as any)
  );

  const purchases = (purchaseRows as any[]).map((row) => {
    const sharePercent = Number(row.sharePercent) || 0;
    const quantity = Number(row.quantity) || 0;
    const lineTotal = Number(row.lineTotal) || 0;
    const unitCost = Number(row.unitCost) || 0;
    return {
      purchaseId: Number(row.purchaseId),
      purchaseItemId: Number(row.purchaseItemId),
      purchaseDate: row.purchaseDate,
      itemName: row.itemName,
      quantity,
      unitCost,
      grossAmount: lineTotal,
      sharePercent,
      attributedQuantity: quantity * (sharePercent / 100),
      attributedAmount: lineTotal * (sharePercent / 100),
      documentKey: `PUR-${row.purchaseId}`,
    };
  });

  const salesFilter = buildDateRangeSql('sps.saleDate', range);
  const salesRows = await allAsync(
    `SELECT sps.id as snapshotId, sps.saleDate, sps.sourceKind, sps.sourceId, sps.sourceItemId,
            sps.itemDescription, sps.quantity, sps.saleAmount, sps.initialCostAmount, sps.ownerGainAmount as snapshotOwnerGainAmount,
            sps.sharedProfitAmount as snapshotSharedProfitAmount, sps.totalProfitAmount,
            COALESCE(opi.sharePercent, 0) as ownershipSharePercent,
            SUM(CASE WHEN spa.allocationType = 'owner_gain' THEN spa.amount ELSE 0 END) as partnerOwnerGainAmount,
            SUM(CASE WHEN spa.allocationType = 'shared_profit' THEN spa.amount ELSE 0 END) as partnerSharedProfitAmount,
            SUM(spa.amount) as partnerTotalProfitAmount
       FROM sale_profit_snapshots sps
       JOIN sale_profit_allocations spa ON spa.snapshotId = sps.id AND spa.storePartnerId = ? AND spa.sourceStatus = 'active'
       LEFT JOIN ownership_profile_items opi ON opi.ownershipProfileId = sps.ownershipProfileId AND opi.storePartnerId = ?
      WHERE sps.sourceStatus = 'active'
        AND sps.itemType = 'inventory'${salesFilter.sql}
      GROUP BY sps.id, sps.saleDate, sps.sourceKind, sps.sourceId, sps.sourceItemId, sps.itemDescription,
               sps.quantity, sps.saleAmount, sps.initialCostAmount, sps.ownerGainAmount, sps.sharedProfitAmount, sps.totalProfitAmount, opi.sharePercent
      ORDER BY sps.saleDate DESC, sps.id DESC`,
    [partnerId, partnerId].concat(salesFilter.params as any)
  );

  const sales = (salesRows as any[]).map((row) => {
    const quantity = Number(row.quantity) || 0;
    const saleAmount = Number(row.saleAmount) || 0;
    const ownershipSharePercent = Number(row.ownershipSharePercent) || 0;
    return {
      snapshotId: Number(row.snapshotId),
      saleDate: row.saleDate,
      sourceKind: row.sourceKind,
      sourceId: Number(row.sourceId),
      sourceItemId: Number(row.sourceItemId),
      itemName: row.itemDescription,
      quantity,
      grossSaleAmount: saleAmount,
      ownershipSharePercent,
      attributedSaleAmount: saleAmount * (ownershipSharePercent / 100),
      capitalReturnAmount: (Number(row.initialCostAmount) || 0) * (ownershipSharePercent / 100),
      ownerGainAmount: Number(row.partnerOwnerGainAmount) || 0,
      sharedProfitAmount: Number(row.partnerSharedProfitAmount) || 0,
      totalProfitAmount: Number(row.partnerTotalProfitAmount) || 0,
      settlementEntitlementAmount: ((Number(row.initialCostAmount) || 0) * (ownershipSharePercent / 100)) + (Number(row.partnerTotalProfitAmount) || 0),
      documentKey: row.sourceKind === 'sales_order' ? `INV-${row.sourceId}` : `INS-${row.sourceId}`,
    };
  });

  const inventoryRows = await allAsync(
    `SELECT pr.id as productId, pr.name as itemName, pr.stock_quantity, pr.purchasePrice, opi.sharePercent
       FROM products pr
       JOIN ownership_profile_items opi ON opi.ownershipProfileId = pr.ownershipProfileId AND opi.storePartnerId = ?
      WHERE COALESCE(pr.stock_quantity, 0) > 0
      ORDER BY pr.name COLLATE NOCASE ASC`,
    [partnerId]
  );

  const currentInventory = (inventoryRows as any[]).map((row) => {
    const stockQuantity = Number(row.stock_quantity) || 0;
    const purchasePrice = Number(row.purchasePrice) || 0;
    const sharePercent = Number(row.sharePercent) || 0;
    return {
      productId: Number(row.productId),
      itemName: row.itemName,
      stockQuantity,
      purchasePrice,
      sharePercent,
      attributedQuantity: stockQuantity * (sharePercent / 100),
      attributedValue: stockQuantity * purchasePrice * (sharePercent / 100),
    };
  });

  const summary = {
    purchasesCount: purchases.length,
    purchasesGrossAmount: purchases.reduce((sum, row) => sum + (Number(row.grossAmount) || 0), 0),
    purchasesAttributedAmount: purchases.reduce((sum, row) => sum + (Number(row.attributedAmount) || 0), 0),
    purchasesAttributedQuantity: purchases.reduce((sum, row) => sum + (Number(row.attributedQuantity) || 0), 0),
    salesCount: sales.length,
    salesGrossAmount: sales.reduce((sum, row) => sum + (Number(row.grossSaleAmount) || 0), 0),
    salesAttributedAmount: sales.reduce((sum, row) => sum + (Number(row.attributedSaleAmount) || 0), 0),
    capitalReturnAmount: sales.reduce((sum, row) => sum + (Number(row.capitalReturnAmount) || 0), 0),
    salesProfitAmount: sales.reduce((sum, row) => sum + (Number(row.totalProfitAmount) || 0), 0),
    settlementEntitlementAmount: sales.reduce((sum, row) => sum + (Number(row.settlementEntitlementAmount) || 0), 0),
    salesQuantity: sales.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0),
    currentInventoryQuantity: currentInventory.reduce((sum, row) => sum + (Number(row.attributedQuantity) || 0), 0),
    currentInventoryValue: currentInventory.reduce((sum, row) => sum + (Number(row.attributedValue) || 0), 0),
  };

  const shouldFallback = !purchases.length && !sales.length && !currentInventory.length;
  if (shouldFallback) return buildLegacyAccessoriesReportFromDb(range);
  return { partner: { storePartnerId: Number(partner.id), partnerName: partner.name, colorTag: partner.colorTag || null }, summary, purchases, sales, currentInventory };
};

export const listPartnerSettlementTransactionsFromDb = async (range: PartnerReportRange = {}): Promise<any[]> => {
  if (!(await tableExists('partner_settlement_transactions'))) return [];
  const filter = buildDateRangeSql('pst.settlementDate', range);
  const rows = await allAsync(
    `SELECT pst.*, fp.name as fromPartnerName, fp.colorTag as fromPartnerColorTag, tp.name as toPartnerName, tp.colorTag as toPartnerColorTag
       FROM partner_settlement_transactions pst
       JOIN store_partners fp ON fp.id = pst.fromStorePartnerId
       LEFT JOIN store_partners tp ON tp.id = pst.toStorePartnerId
      WHERE pst.status = 'active'${filter.sql}
      ORDER BY pst.settlementDate DESC, pst.id DESC`,
    filter.params as any
  );
  return (rows as any[]).map((row) => ({
    id: Number(row.id),
    settlementDate: row.settlementDate,
    fromStorePartnerId: Number(row.fromStorePartnerId),
    fromPartnerName: row.fromPartnerName,
    fromPartnerColorTag: row.fromPartnerColorTag || null,
    destinationKind: row.destinationKind || 'partner',
    toStorePartnerId: row.toStorePartnerId != null ? Number(row.toStorePartnerId) : null,
    toPartnerName: row.toPartnerName || null,
    toPartnerColorTag: row.toPartnerColorTag || null,
    amount: Number(row.amount) || 0,
    paymentMethod: row.paymentMethod || null,
    referenceNo: row.referenceNo || null,
    notes: row.notes || null,
    status: row.status || 'active',
    createdByUserId: row.createdByUserId != null ? Number(row.createdByUserId) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
};

export const createPartnerSettlementTransactionFromDb = async (payload: any): Promise<any> => {
  const settlementDate = String(payload?.settlementDate || '').trim();
  const fromStorePartnerId = Number(payload?.fromStorePartnerId) || 0;
  const destinationKind = String(payload?.destinationKind || 'partner').trim() === 'store' ? 'store' : 'partner';
  const toStorePartnerId = destinationKind === 'partner' ? (Number(payload?.toStorePartnerId) || 0) : null;
  const amount = Number(payload?.amount) || 0;
  const paymentMethod = String(payload?.paymentMethod || '').trim() || null;
  const referenceNo = String(payload?.referenceNo || '').trim() || null;
  const notes = String(payload?.notes || '').trim() || null;
  const createdByUserId = payload?.createdByUserId != null ? Number(payload.createdByUserId) || null : null;

  if (!settlementDate) throw new Error('تاریخ تسویه الزامی است.');
  if (!fromStorePartnerId) throw new Error('شریک پرداخت‌کننده را انتخاب کنید.');
  if (!(amount > 0)) throw new Error('مبلغ تسویه باید بیشتر از صفر باشد.');

  const fromPartner = await getAsync(`SELECT id FROM store_partners WHERE id = ? AND isActive = 1`, [fromStorePartnerId]);
  if (!fromPartner) throw new Error('شریک پرداخت‌کننده معتبر نیست.');

  if (destinationKind === 'partner') {
    if (!toStorePartnerId) throw new Error('شریک دریافت‌کننده را انتخاب کنید.');
    if (toStorePartnerId === fromStorePartnerId) throw new Error('شریک پرداخت‌کننده و دریافت‌کننده نمی‌توانند یکسان باشند.');
    const toPartner = await getAsync(`SELECT id FROM store_partners WHERE id = ? AND isActive = 1`, [toStorePartnerId]);
    if (!toPartner) throw new Error('شریک دریافت‌کننده معتبر نیست.');
  }

  const result: any = await runAsync(
    `INSERT INTO partner_settlement_transactions (settlementDate, fromStorePartnerId, destinationKind, toStorePartnerId, amount, paymentMethod, referenceNo, notes, createdByUserId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [settlementDate, fromStorePartnerId, destinationKind, toStorePartnerId, amount, paymentMethod, referenceNo, notes, createdByUserId]
  );
  const row = await getAsync(`SELECT * FROM partner_settlement_transactions WHERE id = ?`, [Number(result?.lastID || 0)]);
  return row;
};

export const cancelPartnerSettlementTransactionFromDb = async (transactionId: number): Promise<void> => {
  const id = Number(transactionId) || 0;
  if (!id) throw new Error('شناسه تسویه نامعتبر است.');
  await runAsync(`UPDATE partner_settlement_transactions SET status = 'canceled', updatedAt = (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')) WHERE id = ?`, [id]);
};

export const getPartnerSettlementReportFromDb = async (range: PartnerReportRange = {}): Promise<any> => {
  const hasCore = await hasStoreOwnershipCoreTables();
  if (!hasCore) return buildLegacySettlementReportFromDb(range);
  const partners = await mapActiveStorePartners();
  const profitData = await getPartnerProfitReportFromDb(range);

  const phoneInventoryRows = await allAsync(
    `SELECT opi.storePartnerId, SUM(COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) * (COALESCE(opi.sharePercent, 0) / 100.0)) as attributedValue
       FROM phones ph
       JOIN ownership_profile_items opi ON opi.ownershipProfileId = ph.ownershipProfileId
      WHERE ph.status IN ('in_stock', 'pending', 'reserved')
      GROUP BY opi.storePartnerId`
  );
  const accessoryInventoryRows = await allAsync(
    `SELECT opi.storePartnerId, SUM(COALESCE(pr.stock_quantity, 0) * COALESCE(pr.purchasePrice, 0) * (COALESCE(opi.sharePercent, 0) / 100.0)) as attributedValue
       FROM products pr
       JOIN ownership_profile_items opi ON opi.ownershipProfileId = pr.ownershipProfileId
      WHERE COALESCE(pr.stock_quantity, 0) > 0
      GROUP BY opi.storePartnerId`
  );

  const phoneMap = new Map((phoneInventoryRows as any[]).map((row) => [Number(row.storePartnerId), Number(row.attributedValue) || 0]));
  const accessoryMap = new Map((accessoryInventoryRows as any[]).map((row) => [Number(row.storePartnerId), Number(row.attributedValue) || 0]));
  const profitMap = new Map(((profitData?.summaries || []) as any[]).map((row) => [Number(row.storePartnerId), row]));

  const defaultProfile = await getDefaultProfitShareProfileFromDb();
  let shareLines = normalizeShareLines(await getProfitShareLinesByProfileId(Number(defaultProfile?.id || 0)));
  if (!shareLines.length && partners.length) {
    const equal = 100 / partners.length;
    shareLines = partners.map((partner: any) => ({ storePartnerId: Number(partner.storePartnerId), partnerName: partner.partnerName, colorTag: partner.colorTag || null, sharePercent: equal }));
  }

  const rows = partners.map((partner: any) => {
    const storePartnerId = Number(partner.storePartnerId);
    const profitRow = profitMap.get(storePartnerId) || {};
    const phoneInventoryValue = phoneMap.get(storePartnerId) || 0;
    const accessoryInventoryValue = accessoryMap.get(storePartnerId) || 0;
    const inventoryValue = phoneInventoryValue + accessoryInventoryValue;
    const capitalReturnAmount = Number((profitRow as any).capitalReturnAmount) || 0;
    const ownerGainAmount = Number((profitRow as any).ownerGainAmount) || 0;
    const sharedProfitAmount = Number((profitRow as any).sharedProfitAmount) || 0;
    const recognizedProfit = Number((profitRow as any).totalAmount) || 0;
    const settlementEntitlement = capitalReturnAmount + ownerGainAmount + sharedProfitAmount;
    return {
      storePartnerId,
      partnerName: partner.partnerName,
      colorTag: partner.colorTag || null,
      phoneInventoryValue,
      accessoryInventoryValue,
      inventoryValue,
      capitalReturnAmount,
      ownerGainAmount,
      sharedProfitAmount,
      recognizedProfit,
      settlementEntitlement,
      targetPercent: shareLines.find((line) => Number(line.storePartnerId) === storePartnerId)?.sharePercent || 0,
      settlementBalance: settlementEntitlement,
      settlementStatus: settlementEntitlement > 0.5 ? 'creditor' : settlementEntitlement < -0.5 ? 'debtor' : 'settled',
    };
  });

  const transactions = await listPartnerSettlementTransactionsFromDb(range);
  type SettlementAggregation = {
    paidAmount: number;
    receivedAmount: number;
    netSettledAmount: number;
    phoneSpecificReceivedAmount: number;
    phoneSpecificSettlementCount: number;
  };
  const emptySettlementAggregation = (): SettlementAggregation => ({
    paidAmount: 0,
    receivedAmount: 0,
    netSettledAmount: 0,
    phoneSpecificReceivedAmount: 0,
    phoneSpecificSettlementCount: 0,
  });
  const recalcSettlementNet = (item: SettlementAggregation) => {
    item.netSettledAmount = item.receivedAmount - item.paidAmount;
  };
  const transactionMap = new Map<number, SettlementAggregation>();
  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.fromStorePartnerId) {
      const prev = transactionMap.get(Number(tx.fromStorePartnerId)) || emptySettlementAggregation();
      prev.paidAmount += amount;
      recalcSettlementNet(prev);
      transactionMap.set(Number(tx.fromStorePartnerId), prev);
    }
    if (tx.destinationKind === 'partner' && tx.toStorePartnerId) {
      const prev = transactionMap.get(Number(tx.toStorePartnerId)) || emptySettlementAggregation();
      prev.receivedAmount += amount;
      recalcSettlementNet(prev);
      transactionMap.set(Number(tx.toStorePartnerId), prev);
    }
  }

  // Existing phone-based partner settlements are stored in partner_ledger because PartnerDetail
  // attaches each payment to the sold phone. Reconcile those entries into the central partner
  // settlement report instead of creating a second, disconnected settlement source.
  try {
    if (await tableExists('partner_ledger') && await tableExists('store_partner_legacy_links')) {
      const ledgerDateFilter = buildDateRangeSql('pl.transactionDate', range);
      const phoneLedgerRows = await allAsync(
        `SELECT spl.storePartnerId,
                SUM(COALESCE(pl.debit, 0)) as receivedAmount,
                COUNT(*) as settlementCount
           FROM partner_ledger pl
           JOIN store_partner_legacy_links spl ON spl.legacyPartnerId = pl.partnerId AND spl.linkType = 'owner'
          WHERE pl.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
            AND COALESCE(pl.debit, 0) > 0${ledgerDateFilter.sql}
          GROUP BY spl.storePartnerId`,
        ledgerDateFilter.params
      );
      for (const entry of phoneLedgerRows as any[]) {
        const storePartnerId = Number(entry.storePartnerId || 0);
        if (!storePartnerId) continue;
        const amount = Number(entry.receivedAmount) || 0;
        const count = Number(entry.settlementCount) || 0;
        const prev = transactionMap.get(storePartnerId) || emptySettlementAggregation();
        prev.receivedAmount += amount;
        prev.phoneSpecificReceivedAmount += amount;
        prev.phoneSpecificSettlementCount += count;
        recalcSettlementNet(prev);
        transactionMap.set(storePartnerId, prev);
      }
    }
  } catch (error) {
    console.warn('Phone-specific partner settlement reconciliation skipped:', (error as any)?.message || error);
  }

  for (const row of rows) {
    const tx = transactionMap.get(Number(row.storePartnerId)) || emptySettlementAggregation();
    row.paidSettlementAmount = tx.paidAmount;
    row.receivedSettlementAmount = tx.receivedAmount;
    row.netSettledAmount = tx.netSettledAmount;
    row.phoneSpecificSettlementAmount = tx.phoneSpecificReceivedAmount;
    row.phoneSpecificSettlementCount = tx.phoneSpecificSettlementCount;
    row.remainingSettlementBalance = row.settlementEntitlement + tx.paidAmount - tx.receivedAmount;
    row.remainingSettlementStatus = row.remainingSettlementBalance > 0.5 ? 'creditor' : row.remainingSettlementBalance < -0.5 ? 'debtor' : 'settled';
  }

  const reconciliationTolerance = 1;
  const settlementAuditIssues: any[] = [];
  const settlementAuditChecks: any[] = [];
  const settlementAuditActionMap: Record<string, { recommendedAction: string; actionPath: string; actionLabel: string; affectedArea: string }> = {
    missing_legacy_link: {
      recommendedAction: 'این شریک را در ساختار شرکا به همکار قدیمی دارای سوابق گوشی یا لوازم وصل کن تا PartnerDetail و گزارش مرکزی از یک منبع بخوانند.',
      actionPath: '/settings/store-ownership?tab=partners#partners-bootstrap',
      actionLabel: 'رفتن به اتصال شرکا',
      affectedArea: 'Settings → ساختار شرکا',
    },
    orphan_phone_settlement_ledger: {
      recommendedAction: 'پرداخت گوشی‌محور در ledger به همکار قدیمی وصل است، اما آن همکار هنوز در ساختار شرکا لینک نشده؛ از بخش اتصال شرکا همان همکار را به شریک فروشگاه وصل کن.',
      actionPath: '/settings/store-ownership?tab=partners#partners-bootstrap',
      actionLabel: 'رفع لینک همکار قدیمی',
      affectedArea: 'Settings → شرکا',
    },
    phone_ledger_delta: {
      recommendedAction: 'لینک همکارهای قدیمی و پرداخت‌های گوشی‌محور همین شریک را کنترل کن؛ اختلاف معمولاً از لینک اشتباه، پرداخت خارج از بازه یا ثبت دوباره پرداخت ایجاد می‌شود.',
      actionPath: '/settings/store-ownership?tab=partners#partners-list',
      actionLabel: 'بررسی لینک‌های شریک',
      affectedArea: 'PartnerDetail / partner_ledger',
    },
    remaining_formula_delta: {
      recommendedAction: 'گزارش را بازخوانی کن و سپس تسویه‌های ثبت‌شده، دریافتی‌ها و پرداخت‌های گوشی‌محور این شریک را کنترل کن؛ مانده باید از فرمول استحقاق + پرداختی - دریافتی به‌دست بیاید.',
      actionPath: '/reports/partners-performance?tab=settlement',
      actionLabel: 'بازگشت به گزارش تسویه',
      affectedArea: 'گزارش تسویه شرکا',
    },
    reconciliation_audit_skipped: {
      recommendedAction: 'ابتدا جدول‌های ساختار شرکا و partner_ledger را بررسی کن و گزارش را دوباره بازخوانی کن؛ این هشدار یعنی Audit کامل اجرا نشده است.',
      actionPath: '/settings/store-ownership?tab=overview',
      actionLabel: 'بررسی سلامت ساختار',
      affectedArea: 'Audit سیستم شرکا',
    },
  };

  const pushSettlementAuditIssue = (storePartnerId: number | null, partnerName: string, severity: 'ok' | 'warning' | 'error', code: string, title: string, expectedAmount?: number, actualAmount?: number) => {
    const diffAmount = Math.abs((Number(expectedAmount) || 0) - (Number(actualAmount) || 0));
    const action = settlementAuditActionMap[code] || {
      recommendedAction: 'این مورد را در همان بخش ثبت اطلاعات‌شده بررسی کن و پس از اصلاح، گزارش شرکا را دوباره بازخوانی کن.',
      actionPath: '/reports/partners-performance?tab=settlement',
      actionLabel: 'بررسی گزارش',
      affectedArea: 'سیستم شرکا',
    };
    settlementAuditIssues.push({
      storePartnerId,
      partnerName,
      severity,
      code,
      title,
      expectedAmount: Number(expectedAmount) || 0,
      actualAmount: Number(actualAmount) || 0,
      diffAmount,
      recommendedAction: action.recommendedAction,
      actionPath: action.actionPath,
      actionLabel: action.actionLabel,
      affectedArea: action.affectedArea,
    });
  };

  try {
    const linkedLegacyRows = await allAsync(
      `SELECT sp.id as storePartnerId,
              sp.name as partnerName,
              COUNT(DISTINCT spl.legacyPartnerId) as linkedLegacyPartnersCount,
              GROUP_CONCAT(DISTINCT p.partnerName) as linkedLegacyPartnerNames
         FROM store_partners sp
         LEFT JOIN store_partner_legacy_links spl ON spl.storePartnerId = sp.id AND spl.linkType = 'owner'
         LEFT JOIN partners p ON p.id = spl.legacyPartnerId
        WHERE sp.isActive = 1
        GROUP BY sp.id, sp.name`,
      []
    ).catch(() => [] as any[]);

    const rangePhoneLedgerFilter = buildDateRangeSql('pl.transactionDate', range);
    const rangePhoneLedgerRows = await allAsync(
      `SELECT spl.storePartnerId,
              SUM(COALESCE(pl.debit, 0)) as phoneSpecificSettlementAmount,
              COUNT(*) as phoneSpecificSettlementCount
         FROM partner_ledger pl
         JOIN store_partner_legacy_links spl ON spl.legacyPartnerId = pl.partnerId AND spl.linkType = 'owner'
        WHERE pl.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
          AND COALESCE(pl.debit, 0) > 0${rangePhoneLedgerFilter.sql}
        GROUP BY spl.storePartnerId`,
      rangePhoneLedgerFilter.params
    ).catch(() => [] as any[]);

    const lifetimeLedgerRows = await allAsync(
      `SELECT spl.storePartnerId,
              SUM(COALESCE(pl.credit, 0) - COALESCE(pl.debit, 0)) as partnerDetailCurrentBalance,
              SUM(CASE WHEN pl.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL} THEN COALESCE(pl.debit, 0) ELSE 0 END) as partnerDetailPhonePaidAmount,
              COUNT(CASE WHEN pl.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL} AND COALESCE(pl.debit, 0) > 0 THEN 1 END) as partnerDetailPhonePaymentCount
         FROM store_partner_legacy_links spl
         LEFT JOIN partner_ledger pl ON pl.partnerId = spl.legacyPartnerId
        WHERE spl.linkType = 'owner'
        GROUP BY spl.storePartnerId`,
      []
    ).catch(() => [] as any[]);

    const lifetimePhoneRows = await allAsync(
      `SELECT spl.storePartnerId,
              COUNT(ph.id) as soldPhonesCount,
              SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) as soldPhonesCurrentPurchaseAmount,
              SUM(COALESCE(ph.purchasePrice, 0)) as soldPhonesInitialPurchaseAmount
         FROM store_partner_legacy_links spl
         JOIN phones ph ON ph.supplierId = spl.legacyPartnerId
        WHERE spl.linkType = 'owner'
          AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')
        GROUP BY spl.storePartnerId`,
      []
    ).catch(() => [] as any[]);

    const orphanPhoneLedgerRow = await getAsync(
      `SELECT COUNT(*) as count,
              SUM(COALESCE(pl.debit, 0)) as amount
         FROM partner_ledger pl
         LEFT JOIN store_partner_legacy_links spl ON spl.legacyPartnerId = pl.partnerId AND spl.linkType = 'owner'
        WHERE pl.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
          AND COALESCE(pl.debit, 0) > 0
          AND spl.storePartnerId IS NULL`,
      []
    ).catch(() => ({ count: 0, amount: 0 } as any));

    const linkedMap = new Map((linkedLegacyRows as any[]).map((entry) => [Number(entry.storePartnerId), entry]));
    const rangeLedgerMap = new Map((rangePhoneLedgerRows as any[]).map((entry) => [Number(entry.storePartnerId), entry]));
    const lifetimeLedgerMap = new Map((lifetimeLedgerRows as any[]).map((entry) => [Number(entry.storePartnerId), entry]));
    const lifetimePhoneMap = new Map((lifetimePhoneRows as any[]).map((entry) => [Number(entry.storePartnerId), entry]));

    for (const row of rows) {
      const storePartnerId = Number(row.storePartnerId || 0);
      const partnerName = String(row.partnerName || 'شریک');
      const linked = linkedMap.get(storePartnerId) || {};
      const rangeLedger = rangeLedgerMap.get(storePartnerId) || {};
      const lifetimeLedger = lifetimeLedgerMap.get(storePartnerId) || {};
      const lifetimePhones = lifetimePhoneMap.get(storePartnerId) || {};
      const centralPhoneAmount = Number(row.phoneSpecificSettlementAmount) || 0;
      const rangeLedgerPhoneAmount = Number((rangeLedger as any).phoneSpecificSettlementAmount) || 0;
      const formulaRemaining = (Number(row.settlementEntitlement) || 0) + (Number(row.paidSettlementAmount) || 0) - (Number(row.receivedSettlementAmount) || 0);
      const remainingDelta = Math.abs(formulaRemaining - (Number(row.remainingSettlementBalance) || 0));
      const phoneLedgerDelta = Math.abs(centralPhoneAmount - rangeLedgerPhoneAmount);
      const lifetimeSoldPhoneCurrentPurchase = Number((lifetimePhones as any).soldPhonesCurrentPurchaseAmount) || 0;
      const lifetimePhonePaid = Number((lifetimeLedger as any).partnerDetailPhonePaidAmount) || 0;
      const lifetimePhoneBalance = lifetimeSoldPhoneCurrentPurchase - lifetimePhonePaid;

      const check = {
        storePartnerId,
        partnerName,
        linkedLegacyPartnersCount: Number((linked as any).linkedLegacyPartnersCount) || 0,
        linkedLegacyPartnerNames: String((linked as any).linkedLegacyPartnerNames || '').split(',').filter(Boolean),
        rangeCentralPhoneSettlementAmount: centralPhoneAmount,
        rangeLedgerPhoneSettlementAmount: rangeLedgerPhoneAmount,
        rangePhoneSettlementDelta: centralPhoneAmount - rangeLedgerPhoneAmount,
        formulaRemainingBalance: formulaRemaining,
        reportedRemainingBalance: Number(row.remainingSettlementBalance) || 0,
        remainingBalanceDelta: formulaRemaining - (Number(row.remainingSettlementBalance) || 0),
        partnerDetailLifetime: {
          soldPhonesCount: Number((lifetimePhones as any).soldPhonesCount) || 0,
          soldPhonesCurrentPurchaseAmount: lifetimeSoldPhoneCurrentPurchase,
          soldPhonesInitialPurchaseAmount: Number((lifetimePhones as any).soldPhonesInitialPurchaseAmount) || 0,
          phoneSettlementPaidAmount: lifetimePhonePaid,
          phoneSettlementPaymentCount: Number((lifetimeLedger as any).partnerDetailPhonePaymentCount) || 0,
          phoneSettlementBalance: lifetimePhoneBalance,
          currentLedgerBalance: Number((lifetimeLedger as any).partnerDetailCurrentBalance) || 0,
        },
        status: 'ok',
        notes: [] as string[],
      };

      if (!check.linkedLegacyPartnersCount) {
        check.status = 'warning';
        check.notes.push('این شریک به همکار قدیمی وصل نیست؛ بنابراین PartnerDetail و گزارش مرکزی نمی‌توانند کامل با هم reconcile شوند.');
        pushSettlementAuditIssue(storePartnerId, partnerName, 'warning', 'missing_legacy_link', 'لینک همکار قدیمی برای این شریک تعریف نشده است.');
      }
      if (phoneLedgerDelta > reconciliationTolerance) {
        check.status = 'error';
        check.notes.push('مبلغ تسویه گوشی‌محور در گزارش مرکزی با دفتر partner_ledger یکسان نیست.');
        pushSettlementAuditIssue(storePartnerId, partnerName, 'error', 'phone_ledger_delta', 'اختلاف بین گزارش مرکزی و ledger در تسویه گوشی‌محور', rangeLedgerPhoneAmount, centralPhoneAmount);
      }
      if (remainingDelta > reconciliationTolerance) {
        check.status = 'error';
        check.notes.push('فرمول مانده نهایی با مقدار گزارش‌شده یکسان نیست.');
        pushSettlementAuditIssue(storePartnerId, partnerName, 'error', 'remaining_formula_delta', 'اختلاف فرمول مانده نهایی تسویه', formulaRemaining, Number(row.remainingSettlementBalance) || 0);
      }
      settlementAuditChecks.push(check);
    }

    const orphanPhoneSettlementCount = Number((orphanPhoneLedgerRow as any)?.count) || 0;
    const orphanPhoneSettlementAmount = Number((orphanPhoneLedgerRow as any)?.amount) || 0;
    if (orphanPhoneSettlementCount > 0) {
      pushSettlementAuditIssue(null, 'بدون لینک شریک', 'warning', 'orphan_phone_settlement_ledger', 'پرداخت گوشی‌محور در ledger وجود دارد اما به ساختار شرکای فروشگاه وصل نیست.', orphanPhoneSettlementAmount, 0);
    }
  } catch (error) {
    pushSettlementAuditIssue(null, 'سیستم', 'warning', 'reconciliation_audit_skipped', `کنترل عددی شرکا کامل اجرا نشد: ${(error as any)?.message || error}`);
  }

  if (!rows.length || rows.every((row) => !(Number(row.settlementEntitlement) || 0) && !(Number(row.inventoryValue) || 0) && !(Number(row.capitalReturnAmount) || 0) && !(Number(row.recognizedProfit) || 0))) {
    return buildLegacySettlementReportFromDb(range);
  }

  const totals = {
    totalSettlementEntitlement: rows.reduce((sum, row) => sum + (Number(row.settlementEntitlement) || 0), 0),
    totalCapitalReturnAmount: rows.reduce((sum, row) => sum + (Number(row.capitalReturnAmount) || 0), 0),
    totalOwnerGainAmount: rows.reduce((sum, row) => sum + (Number(row.ownerGainAmount) || 0), 0),
    totalSharedProfitAmount: rows.reduce((sum, row) => sum + (Number(row.sharedProfitAmount) || 0), 0),
    totalRecognizedProfit: rows.reduce((sum, row) => sum + (Number(row.recognizedProfit) || 0), 0),
    totalInventoryValue: rows.reduce((sum, row) => sum + (Number(row.inventoryValue) || 0), 0),
    totalPhoneInventoryValue: rows.reduce((sum, row) => sum + (Number(row.phoneInventoryValue) || 0), 0),
    totalAccessoryInventoryValue: rows.reduce((sum, row) => sum + (Number(row.accessoryInventoryValue) || 0), 0),
    totalPaidSettlements: rows.reduce((sum, row) => sum + (Number(row.paidSettlementAmount) || 0), 0),
    totalReceivedSettlements: rows.reduce((sum, row) => sum + (Number(row.receivedSettlementAmount) || 0), 0),
    totalPhoneSpecificSettlements: rows.reduce((sum, row) => sum + (Number(row.phoneSpecificSettlementAmount) || 0), 0),
  };

  const reconciliation = {
    status: settlementAuditIssues.some((issue) => issue.severity === 'error') ? 'error' : settlementAuditIssues.some((issue) => issue.severity === 'warning') ? 'warning' : 'ok',
    tolerance: reconciliationTolerance,
    checkedPartnersCount: settlementAuditChecks.length,
    issueCount: settlementAuditIssues.length,
    warningCount: settlementAuditIssues.filter((issue) => issue.severity === 'warning').length,
    errorCount: settlementAuditIssues.filter((issue) => issue.severity === 'error').length,
    phoneLedgerRangeAmount: settlementAuditChecks.reduce((sum, row) => sum + (Number(row.rangeLedgerPhoneSettlementAmount) || 0), 0),
    phoneLedgerCentralAmount: settlementAuditChecks.reduce((sum, row) => sum + (Number(row.rangeCentralPhoneSettlementAmount) || 0), 0),
    phoneLedgerDeltaAmount: settlementAuditChecks.reduce((sum, row) => sum + Math.abs(Number(row.rangePhoneSettlementDelta) || 0), 0),
    checks: settlementAuditChecks,
    issues: settlementAuditIssues,
  };

  const settlements = rows
    .sort((a, b) => Math.abs(Number(b.remainingSettlementBalance) || 0) - Math.abs(Number(a.remainingSettlementBalance) || 0))
    .map((row) => ({
      ...row,
      settlementBalance: Number(row.settlementBalance) || 0,
      paidSettlementAmount: Number(row.paidSettlementAmount) || 0,
      receivedSettlementAmount: Number(row.receivedSettlementAmount) || 0,
      netSettledAmount: Number(row.netSettledAmount) || 0,
      remainingSettlementBalance: Number(row.remainingSettlementBalance) || 0,
    }));

  return {
    profile: defaultProfile ? { id: Number(defaultProfile.id), title: defaultProfile.title } : { id: null, title: 'تقسیم مساوی بین شرکای فعال' },
    partners,
    settlements,
    transactions,
    totals,
    reconciliation,
  };
};


export const getPartnerPhonesReportFromDb = async (range: PartnerReportRange & { partnerId: number }): Promise<any> => {
  const hasCore = await hasStoreOwnershipCoreTables();
  if (!hasCore) return buildLegacyPhonesReportFromDb(range);
  const partnerId = Number(range.partnerId) || 0;
  const partner = await getAsync(`SELECT id, name, colorTag, notes FROM store_partners WHERE id = ?`, [partnerId]);
  if (!partner) return buildLegacyPhonesReportFromDb(range);

  const purchaseFilter = buildDateRangeSql('ph.purchaseDate', range);
  const purchaseRows = await allAsync(
    `SELECT ph.id as phoneId, ph.purchaseDate, ph.saleDate, ph.model, ph.imei, ph.purchasePrice, ph.status,
            COALESCE(opi.sharePercent, 0) as sharePercent
       FROM phones ph
       JOIN ownership_profile_items opi ON opi.ownershipProfileId = ph.ownershipProfileId AND opi.storePartnerId = ?
      WHERE 1 = 1${purchaseFilter.sql}
      ORDER BY ph.purchaseDate DESC, ph.id DESC`,
    [partnerId].concat(purchaseFilter.params as any)
  );

  const purchases = (purchaseRows as any[]).map((row) => {
    const purchasePrice = Number(row.purchasePrice) || 0;
    const sharePercent = Number(row.sharePercent) || 0;
    return {
      phoneId: Number(row.phoneId),
      purchaseDate: row.purchaseDate,
      saleDate: row.saleDate,
      model: row.model,
      imei: row.imei,
      purchasePrice,
      sharePercent,
      attributedPurchaseAmount: purchasePrice * (sharePercent / 100),
      status: row.status,
      documentKey: `PH-${row.phoneId}`,
    };
  });

  const salesFilter = buildDateRangeSql('sps.saleDate', range);
  const salesRows = await allAsync(
    `SELECT sps.id as snapshotId, sps.saleDate, sps.sourceKind, sps.sourceId, sps.sourceItemId,
            sps.itemId as phoneId, sps.itemDescription, sps.quantity, sps.saleAmount,
            sps.initialCostAmount, sps.marketCostAmount, sps.ownerGainAmount as snapshotOwnerGainAmount,
            sps.sharedProfitAmount as snapshotSharedProfitAmount, sps.totalProfitAmount,
            ph.model, ph.imei,
            COALESCE(opi.sharePercent, 0) as ownershipSharePercent,
            SUM(CASE WHEN spa.allocationType = 'owner_gain' THEN spa.amount ELSE 0 END) as partnerOwnerGainAmount,
            SUM(CASE WHEN spa.allocationType = 'shared_profit' THEN spa.amount ELSE 0 END) as partnerSharedProfitAmount,
            SUM(spa.amount) as partnerTotalProfitAmount
       FROM sale_profit_snapshots sps
       JOIN sale_profit_allocations spa ON spa.snapshotId = sps.id AND spa.storePartnerId = ? AND spa.sourceStatus = 'active'
       LEFT JOIN phones ph ON ph.id = sps.itemId
       LEFT JOIN ownership_profile_items opi ON opi.ownershipProfileId = sps.ownershipProfileId AND opi.storePartnerId = ?
      WHERE sps.sourceStatus = 'active'
        AND sps.itemType = 'phone'${salesFilter.sql}
      GROUP BY sps.id, sps.saleDate, sps.sourceKind, sps.sourceId, sps.sourceItemId, sps.itemId, sps.itemDescription,
               sps.quantity, sps.saleAmount, sps.initialCostAmount, sps.marketCostAmount, sps.ownerGainAmount,
               sps.sharedProfitAmount, sps.totalProfitAmount, ph.model, ph.imei, opi.sharePercent
      ORDER BY sps.saleDate DESC, sps.id DESC`,
    [partnerId, partnerId].concat(salesFilter.params as any)
  );

  const sales = (salesRows as any[]).map((row) => {
    const saleAmount = Number(row.saleAmount) || 0;
    const ownershipSharePercent = Number(row.ownershipSharePercent) || 0;
    return {
      snapshotId: Number(row.snapshotId),
      saleDate: row.saleDate,
      sourceKind: row.sourceKind,
      sourceId: Number(row.sourceId),
      sourceItemId: Number(row.sourceItemId),
      phoneId: Number(row.phoneId) || null,
      model: row.model || row.itemDescription,
      imei: row.imei || '-',
      grossSaleAmount: saleAmount,
      initialCostAmount: Number(row.initialCostAmount) || 0,
      marketCostAmount: Number(row.marketCostAmount) || 0,
      ownershipSharePercent,
      attributedSaleAmount: saleAmount * (ownershipSharePercent / 100),
      capitalReturnAmount: (Number(row.initialCostAmount) || 0) * (ownershipSharePercent / 100),
      ownerGainAmount: Number(row.partnerOwnerGainAmount) || 0,
      sharedProfitAmount: Number(row.partnerSharedProfitAmount) || 0,
      totalProfitAmount: Number(row.partnerTotalProfitAmount) || 0,
      settlementEntitlementAmount: ((Number(row.initialCostAmount) || 0) * (ownershipSharePercent / 100)) + (Number(row.partnerTotalProfitAmount) || 0),
      documentKey: row.sourceKind === 'sales_order' ? `INV-${row.sourceId}` : `INS-${row.sourceId}`,
    };
  });

  const currentInventoryRows = await allAsync(
    `SELECT ph.id as phoneId, ph.model, ph.imei, COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) as purchasePrice, ph.status, COALESCE(opi.sharePercent, 0) as sharePercent
       FROM phones ph
       JOIN ownership_profile_items opi ON opi.ownershipProfileId = ph.ownershipProfileId AND opi.storePartnerId = ?
      WHERE ph.status IN ('in_stock', 'pending', 'reserved')
      ORDER BY ph.registerDate DESC, ph.id DESC`,
    [partnerId]
  );

  const currentInventory = (currentInventoryRows as any[]).map((row) => {
    const purchasePrice = Number(row.purchasePrice) || 0;
    const sharePercent = Number(row.sharePercent) || 0;
    return {
      phoneId: Number(row.phoneId),
      model: row.model,
      imei: row.imei,
      purchasePrice,
      sharePercent,
      attributedValue: purchasePrice * (sharePercent / 100),
      status: row.status,
    };
  });

  const summary = {
    purchasesCount: purchases.length,
    purchasesGrossAmount: purchases.reduce((sum, row) => sum + (Number(row.purchasePrice) || 0), 0),
    purchasesAttributedAmount: purchases.reduce((sum, row) => sum + (Number(row.attributedPurchaseAmount) || 0), 0),
    salesCount: sales.length,
    salesGrossAmount: sales.reduce((sum, row) => sum + (Number(row.grossSaleAmount) || 0), 0),
    salesAttributedAmount: sales.reduce((sum, row) => sum + (Number(row.attributedSaleAmount) || 0), 0),
    capitalReturnAmount: sales.reduce((sum, row) => sum + (Number(row.capitalReturnAmount) || 0), 0),
    ownerGainAmount: sales.reduce((sum, row) => sum + (Number(row.ownerGainAmount) || 0), 0),
    sharedProfitAmount: sales.reduce((sum, row) => sum + (Number(row.sharedProfitAmount) || 0), 0),
    totalProfitAmount: sales.reduce((sum, row) => sum + (Number(row.totalProfitAmount) || 0), 0),
    settlementEntitlementAmount: sales.reduce((sum, row) => sum + (Number(row.settlementEntitlementAmount) || 0), 0),
    currentInventoryCount: currentInventory.length,
    currentInventoryValue: currentInventory.reduce((sum, row) => sum + (Number(row.attributedValue) || 0), 0),
  };

  const shouldFallback = !purchases.length && !sales.length && !currentInventory.length;
  if (shouldFallback) return buildLegacyPhonesReportFromDb(range);
  return { partner: { storePartnerId: Number(partner.id), partnerName: partner.name, colorTag: partner.colorTag || null }, summary, purchases, sales, currentInventory };
};
