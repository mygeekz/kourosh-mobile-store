import React from 'react';

export interface NavItem {
  id: string;
  name: string; // Persian label
  /** FontAwesome class (optional for children) */
  icon?: string;
  /** Route path (optional for purely-collapsible groups) */
  path?: string;
  /** Optional commercial module key used by feature-flag gating */
  featureKey?: string;
  /** Tree children for grouped menus */
  /** Allowed roles (optional). If omitted, visible to all authenticated roles. */
  roles?: string[];
  children?: NavItem[];
}

export interface StatCardData {
  title: string; // Persian
  value: string; // Persian
  icon: string;
  iconBgColor: string;
  iconTextColor: string;
  trendPercentage?: number; // Made optional
  trendDirection?: 'up' | 'down'; // Made optional
  trendText: string; // Persian - Can be a static description or dynamic
}

export type TransactionStatus = 'تکمیل شده' | 'در حال پردازش' | 'در انتظار';

export interface Transaction {
  id: number;
  customer: string; // Persian - This might be deprecated or re-evaluated for dashboard
  product: string; // Persian
  amount: string; // Persian
  date: string;
  status: TransactionStatus; // Persian
}

export interface SalesDataPoint {
  name: string; // e.g., 'شنبه', 'هفته ۱', 'ژانویه' (Can be Persian)
  sales: number;
}

export interface ChartTimeframe {
  key: 'weekly' | 'monthly' | 'yearly'; // Keys remain English
  label: string; // Persian
}

export interface Category {
  id: number;
  name: string;
}

// Represents items from the 'products' table, used as "inventory"
export interface Product { 
  id: number;
  name: string; 
  purchasePrice: number;
  sellingPrice: number;      // This is the sale price for inventory items
  stock_quantity: number;
  saleCount?: number;         // Tracks number of times this product type was sold
  categoryId?: number | null;
  categoryName?: string | null; 
  date_added: string;
  supplierId?: number | null; 
  supplierName?: string | null; 
  sku?: string | null;
  barcode?: string | null;
  unit?: string | null;
}

export interface NewProduct {
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  stock_quantity: number;
  categoryId?: number | string | null;
  supplierId?: number | string | null; 
  unit?: string | null;
}

export interface NotificationMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  text: string;
  title?: string;
  detail?: string;
  nextStep?: string;
  badges?: string[];
  actionLabel?: string;
  actionIcon?: string;
  onAction?: () => void | Promise<void>;
  actionVariant?: 'primary' | 'secondary' | 'ghost';
  persistent?: boolean;
  countdownSeconds?: number;
  countdownLabel?: string;
  feedActionLabel?: string;
  onFeedAction?: () => void | Promise<void>;
}

/**
 * انواع اعلان‌هایی که در صفحه «نوتیفیکیشن‌ها» نمایش داده می‌شوند.
 * - InstallmentDue: مربوط به اقساط سررسید شده یا در شرف سررسید
 * - CheckDue: مربوط به چک‌های موعددار
 */
export type DueNotificationType = 'InstallmentDue' | 'CheckDue';

/**
 * ساختار یک آیتم اعلان که از سرور برمی‌گردد. این آیتم‌ها علاوه بر اطلاعات
 * نمایشی (عنوان، توضیح) شامل شناسه هدف (targetId) و eventType هستند تا بتوان
 * با فشردن دکمه «ارسال پیامک» رویداد مربوطه را اجرا کرد.
 */
export interface DueNotificationItem {
  /** شناسه یکتا برای رندر لیست در React (مثلاً 'installment-123-7') */
  id: string;
  /** نوع اعلان: قسط یا چک */
  type: DueNotificationType;
  /** تعداد روزهای باقی مانده تا سررسید (۰، ۳ یا ۷) */
  daysRemaining: number;
  /** عنوان کوتاه برای نمایش */
  title: string;
  /** توضیح تکمیلی شامل نام مشتری، مبلغ، شماره چک و تاریخ */
  description: string;
  /** شناسه رکورد در جدول مربوطه (paymentId یا checkId) */
  targetId: number;
  /** نام نوع رویداد برای ارسال SMS، طبق قرارداد سرور (مثلاً 'INSTALLMENT_DUE_7') */
  eventType: string;
}

/**
 * نوع اعلان‌های یکپارچه برای صفحه «نوتیفیکیشن‌ها». این نوع علاوه بر دسته‌بندی‌های مرتبط با مرکز اقدام
 * (StockAlert, StagnantStock, OverdueInstallment, RepairReady) شامل نوع‌های یادآوری قسط و چک نیز هست.
 */
export type UnifiedNotificationItemType =
  | 'StockAlert'
  | 'StagnantStock'
  | 'OverdueInstallment'
  | 'RepairReady'
  | 'InstallmentDue'
  | 'CheckDue';

/**
 * ساختار یک اعلان یکپارچه که هم اعلان‌های مرکز اقدام و هم یادآوری‌های اقساط و چک را پوشش می‌دهد.
 * در حالت ActionItem، فیلدهای priority, actionText و actionLink مقدار خواهند داشت. در حالت یادآوری، فیلدهای
 * daysRemaining، targetId و eventType مقدار خواهند داشت. Frontend می‌تواند بر اساس نوع اعلان (type) و موجود بودن
 * این فیلدها نحوهٔ نمایش و تعامل را مشخص کند.
 */
export interface UnifiedNotificationItem {
  id: string;
  /** دسته‌بندی اعلان */
  type: UnifiedNotificationItemType;
  /** عنوان کوتاه برای نمایش */
  title: string;
  /** توضیح کامل‌تر */
  description: string;
  /** تعداد روزهای باقی‌مانده برای یادآوری قسط یا چک (۰، ۳ یا ۷)؛ فقط برای نوع‌های InstallmentDue و CheckDue استفاده می‌شود */
  daysRemaining?: number;
  /** شناسه رکورد در جدول مربوطه (paymentId یا checkId)؛ فقط برای نوع‌های یادآوری استفاده می‌شود */
  targetId?: number;
  /** نام نوع رویداد برای ارسال SMS، طبق قرارداد سرور؛ فقط برای یادآوری‌ها */
  eventType?: string;
  /** اولویت اعلان؛ برای اعلان‌های مرکز اقدام استفاده می‌شود */
  priority?: 'High' | 'Medium' | 'Low';
  /** متن دکمه اقدام؛ برای اعلان‌های مرکز اقدام استفاده می‌شود */
  actionText?: string;
  /** لینک اقدام؛ برای اعلان‌های مرکز اقدام استفاده می‌شود */
  actionLink?: string;
}

// --- Old Mobile Phone Specific Types (related to products table & mobile_phone_details) ---
export interface MobilePhoneDetails {
  mobileDetailId: number; 
  brand: string;
  model: string;
  color?: string | null;
  storage?: number | null; 
  ram?: number | null;    
  imei: string;
}

export interface MobilePhone extends Product, MobilePhoneDetails {
  productName: string; 
}

export interface NewMobilePhoneData { // Used for frontend form for old structure, if any
  purchasePrice: number;
  sellingPrice: number;
  brand: string;
  model: string;
  color?: string;
  storage?: number | string; 
  ram?: number | string;     
  imei: string;
}

// --- New Standalone Phone Entry Types for the 'phones' table ---
// وضعیت‌های ممکن یک گوشی در سیستم. به وضعیت «مرجوعی اقساطی» نیز اجازه فروش مجدد داده می‌شود،
// بنابراین این مقدار جدید به نوع PhoneStatus اضافه شده است.
export type PhoneStatus =
  | "موجود در انبار"
  | "فروخته شده"
  | "مرجوعی"
  | "فروخته شده (قسطی)"
  | "مرجوعی اقساطی";

export interface PhoneEntry { // For frontend display from GET /api/phones
  id: number;
  model: string;
  color?: string | null;
  storage?: string | null; 
  ram?: string | null;     
  imei: string;
  batteryHealth?: number | null;
  condition?: string | null; 
  purchasePrice: number;
  currentPurchasePrice?: number | null; // قیمت خرید روز / قیمت جایگزینی برای سود واقعی و سهم شریک
  currentPurchasePriceUpdatedAt?: string | null;
  salePrice?: number | null;    // This is the sale price for individual phones
  sellerName?: string | null; 
  buyerName?: string | null; 
  purchaseDate?: string | null; // ISO Date string YYYY-MM-DD from DB
  saleDate?: string | null;     // ISO Date string YYYY-MM-DD from DB
  registerDate: string;  // ISO DateTime string from DB
  status: PhoneStatus;
  notes?: string | null;
  supplierId?: number | null; 
  supplierName?: string | null; 
  /**
   * تاریخ مرجوعی (شمسی). این فیلد زمانی پر می‌شود که گوشی از فروش اقساطی یا نقدی برگشت داده شود.
   * مقدار می‌تواند به‌صورت رشته‌ای از نوع جلالی مانند "1404/07/14" ذخیره شود.
   */
  returnDate?: string | null;
}

export interface NewPhoneEntryData { // For frontend form for new 'phones' table
  model: string;
  color?: string;
  storage?: string;
  ram?: string;
  imei: string;
  batteryHealth?: number | string; 
  condition?: string;
  purchasePrice: number | string; 
  currentPurchasePrice?: number | string;
  salePrice?: number | string;   
  sellerName?: string; 
  buyerName?: string; 
  purchaseDate?: string; // Shamsi date string from DatePicker initially
  // saleDate is removed as per user request
  status?: PhoneStatus; 
  notes?: string;
  supplierId?: number | string | null; 
  unit?: string | null;
}

// Payload for POSTing a new phone to backend
export interface PhoneEntryPayload {
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
  purchaseDate?: string | null; // Expected as ISO Date string (YYYY-MM-DD) by backend
  saleDate?: string | null;     // Expected as ISO Date string (YYYY-MM-DD) by backend, now always null/undefined from form
  registerDate?: string; // ISO DateTime string (usually set by backend)
  status?: PhoneStatus | string; // Allow string for flexibility from form
  notes?: string | null;
  supplierId?: number | null;
  sku?: string | null;
  barcode?: string | null;
}

// Payload for PUTting an existing phone to backend (all fields optional for partial updates)
export interface PhoneEntryUpdatePayload {
  model?: string;
  color?: string | null;
  storage?: string | null;
  ram?: string | null;
  imei?: string;
  batteryHealth?: number | string | null; // Allow string for form input, then parse
  condition?: string | null;
  purchasePrice?: number | string | null; // Allow string for form input, then parse
  currentPurchasePrice?: number | string | null; // قیمت خرید روز / جایگزینی
  salePrice?: number | string | null;     // Allow string for form input, then parse
  sellerName?: string | null;
  purchaseDate?: string | null; // Shamsi from DatePicker or ISO if not changed from existing
  status?: PhoneStatus | string;
  notes?: string | null;
  supplierId?: number | string | null; // Allow string for form input, then parse
}

export interface PhoneInventoryEvent {
  id: number;
  phoneId?: number | null;
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
  actorUserId?: number | null;
  actorUsername?: string | null;
  actorDisplayName?: string | null;
  metadata?: any;
  createdAt: string;
}



export interface PhoneInventoryChangeReport {
  windowDays: number;
  hasCustomRange?: boolean;
  startDate?: string;
  endDate?: string;
  totalEvents: number;
  statusChanges: number;
  priceChanges: number;
  purchasePriceChanges: number;
  salePriceChanges: number;
  criticalEvents: number;
  recentEvents: PhoneInventoryEvent[];
}


export type PhoneHistoryEventClass = 'all' | 'price' | 'status' | 'critical' | 'audit';

export interface PhoneInventoryExplorerEvent extends PhoneInventoryEvent {
  phoneModel?: string | null;
  phoneImei?: string | null;
  currentStatus?: string | null;
  eventClass?: Exclude<PhoneHistoryEventClass, 'all'>;
}

export interface PhoneHistoryTopModel {
  model: string;
  totalChanges: number;
  priceChanges: number;
  statusChanges: number;
  criticalEvents: number;
}

export interface PhoneHistoryTopActor {
  actor: string;
  totalChanges: number;
}



export interface PhoneInventoryDashboardBucket {
  key: string;
  label: string;
  count: number;
}

export interface PhoneInventoryPricingTrend {
  saleIncrease: number;
  saleDecrease: number;
  purchaseIncrease: number;
  purchaseDecrease: number;
  netSaleDelta: number;
  netPurchaseDelta: number;
}

export interface PhoneInventoryHeatmapRow {
  name: string;
  total: number;
  staleCount: number;
  missingSalePriceCount: number;
  lowBatteryCount: number;
  potentialMargin: number;
  avgPurchasePrice?: number;
  avgSalePrice?: number;
  criticalEvents?: number;
}

export interface PhoneInventoryDailyActivityPoint {
  date: string;
  label: string;
  total: number;
  price: number;
  status: number;
  critical: number;
}

export interface PhoneInventoryDashboardReport {
  windowDays: number;
  hasCustomRange?: boolean;
  startDate?: string;
  endDate?: string;
  totalInventory: number;
  sellableInventory: number;
  totalPotentialMargin: number;
  staleBuckets: PhoneInventoryDashboardBucket[];
  pricingTrend: PhoneInventoryPricingTrend;
  supplierHeatmap: PhoneInventoryHeatmapRow[];
  modelHeatmap: PhoneInventoryHeatmapRow[];
  dailyActivity: PhoneInventoryDailyActivityPoint[];
}
export interface PhoneInventoryEnterpriseReport {
  windowDays: number;
  hasCustomRange?: boolean;
  startDate?: string;
  endDate?: string;
  totalEvents: number;
  filteredEvents: number;
  priceChanges: number;
  statusChanges: number;
  criticalEvents: number;
  eventClassCounts: Array<{ key: Exclude<PhoneHistoryEventClass, 'all'>; label: string; count: number }>;
  topModels: PhoneHistoryTopModel[];
  topActors: PhoneHistoryTopActor[];
  recentCriticalEvents: PhoneInventoryExplorerEvent[];
}
// --- Types for Sales Section ---
export interface SellablePhoneItem {
  id: number;           // Phone ID from 'phones' table
  type: 'phone';
  name: string;         // e.g., "iPhone 13 Pro (IMEI: 123...)"
  price: number;        // salePrice from 'phones' table
  stock: 1;             // Always 1 for individual phones
  imei: string;         // To display and potentially use
  purchasePrice?: number; // قیمت خرید اولیه / پیش‌فرض مبنا
  currentPurchasePrice?: number | null; // قیمت خرید روز / جایگزینی
  buyPrice?: number | null; // مبنای سود در زمان فروش
  initialPurchasePrice?: number | null;
  ownershipProfileId?: number | null;
  ownershipTitle?: string | null;
  ownershipType?: 'personal' | 'store' | 'shared' | null;
  profitShareProfileId?: number | null;
  profitShareProfileTitle?: string | null;
}

export interface SellableInventoryItem { // "inventory" refers to items from the 'products' table
  id: number;           // Product ID from 'products' table
  type: 'inventory';
  name: string;         // name from 'products' table
  price: number;        // sellingPrice from 'products' table
  stock: number;        // stock_quantity from 'products' table
  purchasePrice?: number; // قیمت خرید اولیه / پیش‌فرض مبنا
  buyPrice?: number | null;
  initialPurchasePrice?: number | null;
  ownershipProfileId?: number | null;
  ownershipTitle?: string | null;
  ownershipType?: 'personal' | 'store' | 'shared' | null;
  profitShareProfileId?: number | null;
  profitShareProfileTitle?: string | null;
}

// A service can also be sold.
export interface SellableServiceItem {
  id: number;
  type: 'service';
  name: string;
  price: number;
  stock: number;
  purchasePrice?: number;
  currentPurchasePrice?: number | null;
  buyPrice?: number | null;
  initialPurchasePrice?: number | null;
  ownershipProfileId?: number | null;
  ownershipTitle?: string | null;
  ownershipType?: 'personal' | 'store' | 'shared' | null;
  profitShareProfileId?: number | null;
  profitShareProfileTitle?: string | null;
}

export type SellableItem = SellablePhoneItem | SellableInventoryItem | SellableServiceItem;

export interface SellableItemsResponse {
  phones: SellablePhoneItem[];
  inventory: SellableInventoryItem[];
  services: Service[];
}

export interface SalesTransactionEntry {
  id: number;
  transactionDate: string; // ISO date string YYYY-MM-DD as stored/returned by DB
  itemType: 'phone' | 'inventory' | 'service'; // Added 'service'
  itemId: number;
  itemName: string;        // Name of the item at the time of sale
  quantity: number;
  pricePerItem: number;
  discount?: number;       // Discount amount applied
  totalPrice: number;      // Final price after discount
  notes?: string | null;
  customerId?: number | null; 
  customerFullName?: string | null; 
  paymentMethod?: 'cash' | 'credit' | 'installment'; // Added
  imei?: string | null;
  purchaseType?: 'cash' | 'credit' | 'installment';
  purchaseTypeLabel?: string;
  cleanName?: string;
}

export interface NewSaleData { // For frontend form
  itemType: 'phone' | 'inventory' | 'service'; // Added 'service'
  itemId: number;
  quantity: number;
  transactionDate: string; // Shamsi date string YYYY/MM/DD from form
  notes?: string;
  discount?: number | string; // Allow string for input
  customerId?: number | string | null; // Allow string for form
  paymentMethod: 'cash' | 'credit'; // Added
}

// --- Types for the new Sales Cart ---
export interface CartItem {
    cartItemId: string; // A client-side-only ID for React keys
    itemId: number;
    itemType: 'phone' | 'inventory' | 'service';
    name: string; // For display in the cart
    description: string; // For the invoice
    quantity: number;
    unitPrice: number;
    discountPerItem: number;
    buyPrice?: number; // قیمت خرید روز / مبنای سود در زمان فروش
    initialPurchasePrice?: number; // قیمت خرید اولیه / بهای ثبت‌شده اولیه
    ownershipProfileId?: number | null;
    ownershipTitle?: string | null;
    ownershipType?: 'personal' | 'store' | 'shared' | null;
    profitShareProfileId?: number | null;
    profitShareProfileTitle?: string | null;
    stock: number; // To check against when updating quantity
}

export type CartAction =
  | { type: 'ADD_ITEM'; payload: SellableItem }
  | { type: 'REMOVE_ITEM'; payload: { cartItemId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { cartItemId: string; quantity: number } }
  | { type: 'UPDATE_ITEM_DISCOUNT'; payload: { cartItemId: string; discount: number } }
  | { type: 'UPDATE_BUY_PRICE'; payload: { cartItemId: string; buyPrice: number } }
  | { type: 'SET_CUSTOMER'; payload: { customerId: number | null } }
  | { type: 'SET_PAYMENT_METHOD'; payload: { method: 'cash' | 'credit' } }
  | { type: 'SET_GLOBAL_DISCOUNT'; payload: { discount: number } }
  | { type: 'SET_NOTES'; payload: { notes: string } }
  | { type: 'CLEAR_CART' };

// The complete payload sent from frontend to create a new sales order
export interface SalesOrderPayload {
    customerId: number | null;
    paymentMethod: 'cash' | 'credit' | 'installment';
    discount: number; // Global discount amount
    tax: number; // Global tax percentage (e.g., 9 for 9%)
    /** تاریخ فروش انتخابی؛ می‌تواند جلالی (jYYYY/jMM/jDD) یا ISO (YYYY-MM-DD) باشد */
    transactionDate?: string;
    notes?: string;
    items: Omit<CartItem, 'cartItemId' | 'name' | 'stock'>[]; // Backend only needs the core data for invoice_items
}


// --- Types for Customer Management ---
export interface Customer {
  id: number;
  fullName: string;
  phoneNumber: string | null;
  address: string | null;
  notes: string | null;
  /** CRM tags stored as JSON string in DB; UI should normalize to string[] */
  tags?: string[] | string | null;
  dateAdded: string; // ISO date string
  currentBalance?: number; 
}

export interface NewCustomerData { // For frontend form
  fullName: string;
  phoneNumber?: string;
  address?: string;
  notes?: string;
}

export interface CustomerLedgerEntry {
  id: number;
  customerId: number;
  transactionDate: string; // ISO date string from DB
  createdAt?: string;
  updatedAt?: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  referenceType?: string | null;
  referenceId?: number | null;
  sourceKind?: 'installment_sale' | 'sales_order' | 'repair' | 'manual' | null;
  sourceId?: number | null;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  sourceIcon?: string | null;
  sourceResolved?: boolean;
}

export interface NewLedgerEntryData { // Used for both customer and partner manual ledger entries (frontend form)
  description: string;
  debit?: number | string;  // Allow string for input
  credit?: number | string; // Allow string for input
  transactionDate?: string; // Shamsi from DatePicker, converted to ISO before backend for ledgers.
  referenceType?: string | null;
  referenceId?: number | null;
  settlementBatchId?: string | null;
  changeHistoryJson?: string | null;
}

export type CustomerLedgerInsights = {
  customerId: number;
  currentBalance: number;
  totalDebit: number;
  totalCredit: number;
  lastPaymentDate: string | null;
  daysSinceLastPayment: number | null;
  overdueInstallmentsCount: number;
  overdueChecksCount: number;
  riskLevel: 'low' | 'medium' | 'high';
  score: number; // 0..100
  suggestedActions: string[];
};

export interface CustomerDetailsPageData {
  profile: Customer;
  ledger: CustomerLedgerEntry[];
  purchaseHistory: SalesTransactionEntry[];
}

// --- Types for Partner (Supplier) Management ---
export type PartnerType = "Supplier" | "Service Provider" | "Technician" | "Other"; // Added Technician

export interface Partner {
  id: number;
  partnerName: string;
  partnerType: PartnerType | string; // Allow string for flexibility, but define common types
  contactPerson?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  dateAdded: string; // ISO date string
  currentBalance?: number; // Calculated: positive means we owe them.
  totalPhonesSupplied?: number;
  phonesSoldCount?: number;
  phonesInstallmentSoldCount?: number;
  openInstallmentSalesCount?: number;
  unsoldPhonesCount?: number;
  accessoriesPayableAmount?: number;
  phoneSalesReceivableAmount?: number;
  soldPhonesCurrentPurchaseAmount?: number;
  soldPhonesInitialPurchaseAmount?: number;
  soldPhonesCurrentPurchaseBalance?: number;
  soldPhonesProductSettlementPaidAmount?: number;
  soldPhonesProductSettlementBalance?: number;
  unallocatedPartnerPaymentAmount?: number;
  soldPhoneCurrentDeltaAmount?: number;
  totalReceivableAmount?: number;
}

export interface NewPartnerData { // For frontend form
  partnerName: string;
  partnerType: PartnerType | string;
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface PartnerLedgerEntry {
  id: number;
  partnerId: number;
  transactionDate: string; // ISO date string from DB
  createdAt?: string;
  updatedAt?: string;
  description: string;
  debit: number;  // We paid the partner (reduces what we owe)
  credit: number; // We received goods/services from partner (increases what we owe)
  balance: number; // Running balance: positive means we owe partner.
  referenceType?: string | null;
  referenceId?: number | null;
  settlementBatchId?: string | null;
}

// Interface for items purchased from a partner, for display in partner detail
export interface PurchasedItemFromPartner {
  id: number; // product.id or phone.id
  type: 'product' | 'phone' | 'purchase_receipt'; // Distinguish between general products, phones and receipt-based purchases
  name: string; // product.name or phone.model
  identifier?: string; // e.g., phone.imei
  quantityPurchased?: number; // For products (batch stock_quantity at time of purchase)
  unit?: string | null; // عدد / کارتن / بسته / ...
  purchasePrice: number; // unit price
  totalPrice?: number; // quantityPurchased * purchasePrice
  purchaseDate: string; // date_added for products, purchaseDate for phones if available, or transactionDate from ledger
  status?: string | null; // phone status or purchase status if available
  soldAt?: string | null; // when the phone was sold, if known
  purchaseType?: 'cash' | 'credit' | 'installment';
  purchaseTypeLabel?: string;
  cleanName?: string;
  initialPurchasePrice?: number;
  currentPurchasePrice?: number | null;
  currentPurchasePriceUpdatedAt?: string | null;
  soldDailyPurchasePrice?: number;
  settlementPurchasePrice?: number;
  settlementPriceSource?: 'sales_order' | 'legacy_sale' | 'installment_sale' | 'phone_current' | 'initial_purchase';
  settlementPriceSourceLabel?: string;
  saleSourceType?: 'sales_order' | 'legacy_sale' | 'installment_sale' | null;
  saleSourceId?: number | null;
  saleReferenceLabel?: string | null;
  saleUnitPrice?: number | null;
  saleTotalPrice?: number | null;
  salePaymentMethod?: string | null;
  phoneSettlementPaidAmount?: number;
  phoneSettlementBalance?: number;
  phoneSettlementPaymentCount?: number;
  phoneSettlementLastPaymentDate?: string | null;
}

export interface PartnerDetailsPageData {
  profile: Partner;
  ledger: PartnerLedgerEntry[];
  purchaseHistory: PurchasedItemFromPartner[]; // List of products/phones bought from this partner
}


// --- Types for Reporting Section ---
export interface ReportCardItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
}

export interface DailySalesPoint {
  date: string; // ISO date YYYY-MM-DD (from backend after change)
  totalSales: number;
}

export interface TopSellingItem {
  id: number; // itemId
  itemType: 'phone' | 'inventory';
  itemName: string;
  totalRevenue: number;
  quantitySold: number;
}

export interface SalesSummaryData {
  totalRevenue: number;
  grossProfit: number;
  totalTransactions: number;
  averageSaleValue: number;
  dailySales: DailySalesPoint[];
  topSellingItems: TopSellingItem[];
}

export interface DebtorReportItem {
  id: number; // customerId
  fullName: string;
  phoneNumber: string | null;
  balance: number; // Positive value, amount customer owes
  sourceKind?: string | null;
  sourceId?: number | null;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  sourceIcon?: string | null;
  sourceResolved?: boolean;
}

export interface CreditorReportItem {
  id: number; // partnerId
  partnerName: string;
  partnerType: string;
  balance: number; // Positive value, amount we owe partner
  sourceKind?: string | null;
  sourceId?: number | null;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  sourceIcon?: string | null;
  sourceResolved?: boolean;
}

export interface TopCustomerReportItem {
  customerId: number;
  fullName: string;
  totalSpent: number;
  transactionCount: number;
}

export interface TopSupplierReportItem {
  partnerId: number;
  partnerName: string;
  totalPurchaseValue: number; // Total value of goods/services received from them
  transactionCount: number;
}

export interface PhoneSaleProfitReportItem {
  transactionId: number;
  transactionDate: string;
  customerFullName: string | null;
  phoneModel: string;
  imei: string;
  purchasePrice: number;
  totalPrice: number; // Final sale price from sales_transactions
  profit: number;
}

export interface PhoneInstallmentSaleProfitReportItem {
  saleId: number;
  dateCreated: string;
  customerFullName: string;
  phoneModel: string;
  imei: string;
  purchasePrice: number;
  actualSalePrice: number; // Final sale price from installment_sales
  totalProfit: number;
}

// --- Types for Invoice Generation ---
export interface BusinessDetails {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  cityStateZip: string;
  phone?: string;
  email?: string;
  logoUrl?: string; 
}

export interface InvoiceLineItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPerItem: number; // New
  totalPrice: number; // This is (qty * unitPrice) - discountPerItem
}

export interface InvoiceFinancialSummary {
  subtotal: number; // Sum of (quantity * unitPrice) for all items
  itemsDiscount: number; // Sum of all discountPerItem
  globalDiscount: number; // The overall discount on the order
  taxableAmount: number; // subtotal - itemsDiscount - globalDiscount
  taxAmount: number; // (taxableAmount * tax%) / 100
  taxPercentage: number; // The tax rate that was applied
  grandTotal: number; // taxableAmount + taxAmount
}

export interface InvoiceData {
  businessDetails: BusinessDetails; // Now dynamic
  customerDetails: Partial<Customer> | null; 
  invoiceMetadata: {
    invoiceNumber: string; 
    transactionDate: string; // Shamsi date YYYY/MM/DD (formatted for display from ISO)
    dueDate?: string; 
  };
  lineItems: InvoiceLineItem[]; 
  financialSummary: InvoiceFinancialSummary;
  notes?: string | null; 
}

// --- Types for Settings ---
export interface SettingItem {
  key: string;
  value: string;
}

export interface BusinessInformationSettings {
  store_name?: string;
  store_address_line1?: string;
  store_address_line2?: string;
  store_city_state_zip?: string;
  store_phone?: string;
  store_email?: string;
  currency_unit?: 'toman' | 'rial';
  /**
   * Public base URL used to generate QR codes on invoices/receipts.
   * Example: https://your-public-site.com
   */
  qr_public_base_url?: string;
  /**
   * Local-only hostname used inside the shop network.
   * Example: kourosh
   */
  local_hostname?: string;
  /**
   * Local-only suffix used to avoid internet-domain conflicts.
   * Example: localhost, home.arpa, internal, lan
   */
  local_domain_suffix?: string;
  /**
   * Optional explicit local base URL (computed from hostname + suffix when empty).
   */
  local_base_url?: string;
  /** Detected LAN IP used for hosts setup and local domain onboarding. */
  local_hosts_ip?: string;
  /** Cached suggested hosts line. */
  local_hosts_line?: string;
  store_logo_path?: string;

  // Backup settings
  backup_enabled?: string;
  backup_cron?: string;
  backup_timezone?: string;
  backup_retention?: string;
  backup_schedule_mode?: string;
  backup_schedule_time?: string;
  backup_schedule_weekdays?: string;
  backup_schedule_interval_hours?: string;
  meli_payamak_username?: string;
  meli_payamak_password?: string;
  // Refactored SMS Pattern IDs
  meli_payamak_installment_reminder_pattern_id?: string;
  meli_payamak_payment_confirmation_pattern_id?: string;
  meli_payamak_overdue_notice_pattern_id?: string;
  meli_payamak_completion_congrats_pattern_id?: string;
  // New Repair Module SMS Pattern IDs
  meli_payamak_repair_received_pattern_id?: string;
  meli_payamak_repair_cost_estimated_pattern_id?: string;
  meli_payamak_repair_ready_pattern_id?: string;

  /** Pattern ID for "installment fully settled" notification (final payment) in MeliPayamak */
  meli_payamak_installment_completed_pattern_id?: string;

  /** Alias/new pattern ID for installment settlement notice */
  meli_payamak_installment_settlement_pattern_id?: string;
  meli_payamak_installment_overdue_pattern_id?: string;
  meli_payamak_installment_sale_created_pattern_id?: string;
  meli_payamak_installment_due_notice_pattern_id?: string;
  meli_payamak_installment_payment_received_pattern_id?: string;
  meli_payamak_repair_delivered_pattern_id?: string;
  meli_payamak_repair_cost_notice_pattern_id?: string;
  meli_payamak_repair_status_pattern_id?: string;
  meli_payamak_account_balance_pattern_id?: string;
  meli_payamak_check_failed_pattern_id?: string;
  meli_payamak_invoice_payment_received_pattern_id?: string;
  meli_payamak_invoice_created_pattern_id?: string;

  // ---------------------------------------------------------------------------
  // Telegram linking OTP (SMS template identifiers)
  // These keys are used by the Telegram bot linking flow to send an OTP via SMS.
  // They intentionally live in Settings so they can be configured from the UI.

  /** Enable SMS OTP verification for Telegram account linking. Defaults to '1'. */
  telegram_link_otp_enabled?: string;

  /** OTP BodyId (Pattern) for MeliPayamak */
  sms_otp_meli_body_id?: string;
  /** OTP template name for Kavenegar */
  sms_otp_kavenegar_template?: string;
  /** OTP template id for SMS.ir */
  sms_otp_sms_ir_template_id?: string;
  /** OTP pattern code for IPPanel */
  sms_otp_ippanel_pattern_code?: string;

  /**
   * SMS provider identifier. Supported values:
   * - meli_payamak (default)
   * - kavenegar
   * - sms_ir
   * - ippanel
   * - telegram (use Telegram Bot API to send messages)
   */
  sms_provider?: string;

  // ---------------------------------------------------------------------------
  //  Additional credentials and template identifiers for other SMS providers
  //  These fields allow the application to send templated transactional SMS
  //  messages through a provider other than MeliPayamak. Each provider has its
  //  own authentication mechanism and template identifiers. When adding a new
  //  provider here please also update the corresponding UI and server logic.

  // === Kavenegar ===
  /** API key for Kavenegar REST API */
  kavenegar_api_key?: string;
  /** Template name for installment reminder in Kavenegar */
  kavenegar_installment_template?: string;
  /** Template name for repair received notification in Kavenegar */
  kavenegar_repair_received_template?: string;
  /** Template name for repair cost estimated notification in Kavenegar */
  kavenegar_repair_cost_estimated_template?: string;
  /** Template name for repair ready for pickup notification in Kavenegar */
  kavenegar_repair_ready_template?: string;

  /** Template name for "installment fully settled" notification (final payment) in Kavenegar */
  kavenegar_installment_completed_template?: string;

  // === SMS.ir ===
  /** API key for SMS.ir REST API */
  sms_ir_api_key?: string;
  /** Template ID for installment reminder in SMS.ir */
  sms_ir_installment_template_id?: string;
  /** Template ID for repair received notification in SMS.ir */
  sms_ir_repair_received_template_id?: string;
  /** Template ID for repair cost estimated notification in SMS.ir */
  sms_ir_repair_cost_estimated_template_id?: string;
  /** Template ID for repair ready for pickup notification in SMS.ir */
  sms_ir_repair_ready_template_id?: string;

  /** Template ID for "installment fully settled" notification (final payment) in SMS.ir */
  sms_ir_installment_completed_template_id?: string;

  // === IPPANEL ===
  /** API token for IPPanel Edge API */
  ippanel_token?: string;
  /** Sender number in E.164 format for IPPanel */
  ippanel_from_number?: string;
  /** Pattern code for installment reminder in IPPanel */
  ippanel_installment_pattern_code?: string;
  /** Pattern code for repair received notification in IPPanel */
  ippanel_repair_received_pattern_code?: string;
  /** Pattern code for repair cost estimated notification in IPPanel */
  ippanel_repair_cost_estimated_pattern_code?: string;
  /** Pattern code for repair ready for pickup notification in IPPanel */
  ippanel_repair_ready_pattern_code?: string;

  /** Pattern code for "installment fully settled" notification (final payment) in IPPanel */
  ippanel_installment_completed_pattern_code?: string;

  // === Installment payment due reminders ===
  // Each of these templates or codes is used to send a reminder about an installment payment
  // that is due exactly 7 days, 3 days, or on the same day. The tokens passed will typically be
  // (customer name, amount due, due date) depending on provider implementation.

  // --- MeliPayamak pattern IDs ---
  /** Pattern ID for 7-days-before installment payment reminder in MeliPayamak */
  meli_payamak_installment_due_7_pattern_id?: string;
  /** Pattern ID for 3-days-before installment payment reminder in MeliPayamak */
  meli_payamak_installment_due_3_pattern_id?: string;
  /** Pattern ID for same-day installment payment reminder in MeliPayamak */
  meli_payamak_installment_due_today_pattern_id?: string;

  // --- Kavenegar templates ---
  /** Template name for 7-days-before installment payment reminder in Kavenegar */
  kavenegar_installment_due_7_template?: string;
  /** Template name for 3-days-before installment payment reminder in Kavenegar */
  kavenegar_installment_due_3_template?: string;
  /** Template name for same-day installment payment reminder in Kavenegar */
  kavenegar_installment_due_today_template?: string;

  // --- SMS.ir template IDs ---
  /** Template ID for 7-days-before installment payment reminder in SMS.ir */
  sms_ir_installment_due_7_template_id?: string;
  /** Template ID for 3-days-before installment payment reminder in SMS.ir */
  sms_ir_installment_due_3_template_id?: string;
  /** Template ID for same-day installment payment reminder in SMS.ir */
  sms_ir_installment_due_today_template_id?: string;

  // --- IPPanel pattern codes ---
  /** Pattern code for 7-days-before installment payment reminder in IPPanel */
  ippanel_installment_due_7_pattern_code?: string;
  /** Pattern code for 3-days-before installment payment reminder in IPPanel */
  ippanel_installment_due_3_pattern_code?: string;
  /** Pattern code for same-day installment payment reminder in IPPanel */
  ippanel_installment_due_today_pattern_code?: string;

  // === Check due reminders ===
  // For check reminders, tokens will generally include (customer name, check number, due date).

  // --- MeliPayamak pattern IDs ---
  meli_payamak_check_due_7_pattern_id?: string;
  meli_payamak_check_due_3_pattern_id?: string;
  meli_payamak_check_due_today_pattern_id?: string;

  // --- Kavenegar templates ---
  kavenegar_check_due_7_template?: string;
  kavenegar_check_due_3_template?: string;
  kavenegar_check_due_today_template?: string;

  // --- SMS.ir template IDs ---
  sms_ir_check_due_7_template_id?: string;
  sms_ir_check_due_3_template_id?: string;
  sms_ir_check_due_today_template_id?: string;

  // --- IPPanel pattern codes ---
  ippanel_check_due_7_pattern_code?: string;
  ippanel_check_due_3_pattern_code?: string;
  ippanel_check_due_today_pattern_code?: string;

  // === Telegram Bot Settings ===
  /**
   * Bot token issued by BotFather. When provided, the application can send
   * messages via the Telegram Bot API. According to the Telegram Bot API
   * documentation, messages are sent to a chat using the bot token and a
   * chat identifier using the sendMessage method【616386538948696†L4327-L4346】.  
   */
  telegram_bot_token?: string;
  /** Username of the Telegram bot without @, used for t.me deep links like https://t.me/<username>?start=... */
  telegram_bot_username?: string;
  /**
   * Default chat identifier or username (e.g. @channelusername) where the bot
   * should send notifications. The chat_id parameter must be supplied when
   * calling the sendMessage endpoint【616386538948696†L4327-L4346】.
   */
  telegram_chat_id?: string;
  /**
   * Message template for a 7‑days‑before installment payment reminder. Placeholders
   * like {name}, {amount} and {dueDate} will be replaced with actual values.
   * For example: "سلام {name}! فقط ۷ روز تا موعد پرداخت قسط باقی مانده. مبلغ {amount} را
   * تا تاریخ {dueDate} پرداخت کنید."
   */
  telegram_installment_due_7_message?: string;
  /** Template for a 3‑days‑before installment payment reminder. */
  telegram_installment_due_3_message?: string;
  /** Template for a same‑day installment payment reminder. */
  telegram_installment_due_today_message?: string;

  /** Template for generic installment reminder (used in manual notifications). Placeholders: {name}, {amount}, {dueDate}. */
  telegram_installment_reminder_message?: string;

  /** Template for "installment fully settled" notification. Placeholders: {name}, {saleId}, {total}. */
  telegram_installment_completed_message?: string;

  /** Template for a 7‑days‑before check due reminder. Placeholders: {name}, {checkNumber}, {dueDate}. */
  telegram_check_due_7_message?: string;
  /** Template for a 3‑days‑before check due reminder. */
  telegram_check_due_3_message?: string;
  /** Template for a same‑day check due reminder. */
  telegram_check_due_today_message?: string;

  // --- Repair / Service templates ---
  /** Template for "repair received" notification. Placeholders: {name}, {deviceModel}, {repairId}. */
  telegram_repair_received_message?: string;
  /** Template for "repair cost estimated" notification. Placeholders: {name}, {deviceModel}, {repairId}, {estimatedCost}. */
  telegram_repair_cost_estimated_message?: string;
  /** Template for "repair ready for pickup" notification. Placeholders: {name}, {deviceModel}, {repairId}, {finalCost}. */
  telegram_repair_ready_message?: string;

  telegram_installment_settlement_message?: string;
  telegram_installment_overdue_message?: string;
  telegram_installment_sale_created_message?: string;
  telegram_installment_due_notice_message?: string;
  telegram_installment_payment_received_message?: string;
  telegram_repair_delivered_message?: string;
  telegram_repair_cost_notice_message?: string;
  telegram_repair_status_message?: string;
  telegram_account_balance_message?: string;
  telegram_check_failed_message?: string;
  telegram_invoice_payment_received_message?: string;
  telegram_invoice_created_message?: string;
}

// === Reporting types ===
/**
 * Represents a single row in an RFM analysis report. Each customer is ranked by recency,
 * frequency and monetary metrics. Recency is the number of days since the most recent purchase,
 * frequency is the total count of sales orders, and monetary is the total sum spent. Scores are
 * assigned from 1–3 based on tertiles of the recency, frequency and monetary distributions.
 * The concatenated `rfm` string is a three‑digit code (e.g. "332") for quick grouping.
 */
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
 * Represents one cohort row for cohort analysis. Each row groups customers by the month
 * of their first purchase (`cohortMonth`) and stores the size of the cohort (`customersCount`)
 * as well as an array of counts where index i represents how many customers from that cohort
 * made a repeat purchase in the i‑th month after their first purchase. Use this model to
 * render retention tables or heatmaps.
 */
export interface CohortRow {
  cohortMonth: string;
  customersCount: number;
  counts: number[];
}

/**
 * Represents a single audit log entry retrieved from the server. Each entry records
 * who did what to which entity and when. Some fields may be null when the action is
 * system‑generated (e.g. scheduled tasks).
 */
export interface AuditLogEntry {
  id: number;
  userId: number | null;
  username: string | null;
  role: string | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  description: string | null;
  createdAt: string;
}

export interface Role {
  id: number;
  name: string;
}

export interface UserForDisplay {
  id: number;
  username: string;
  roleId: number;
  roleName: string;
  dateAdded: string;
  avatarUrl?: string | null;
}

export interface NewUserFormData {
  username: string;
  password?: string; 
  confirmPassword?: string;
  roleId: number | string; 
}

export interface EditUserFormData {
  id: number;
  username: string;
  roleId: number | string;
}


// --- Backend specific Payloads ---
export interface ProductPayload { // For POST/PUT /api/products
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  stock_quantity: number;
  categoryId: number | null;
  supplierId: number | null;
  sku?: string | null;
  barcode?: string | null;
  unit?: string | null;
}

export interface UpdateProductPayload { // For PUT /api/products/:id
  name?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  stock_quantity?: number;
  categoryId?: number | null;
  unit?: string | null;
  supplierId?: number | null;
  sku?: string | null;
  barcode?: string | null;
}


export interface SaleDataPayload { // For POST /api/sales
  itemType: 'phone' | 'inventory' | 'service'; // Added 'service'
  itemId: number;
  quantity: number;
  transactionDate: string; // Shamsi date YYYY/MM/DD from frontend, will be converted to ISO by backend
  customerId?: number | null;
  notes?: string | null;
  discount?: number;
  paymentMethod: 'cash' | 'credit'; // Added
}

export interface CustomerPayload { // For POST/PUT /api/customers
  fullName: string;
  phoneNumber?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface LedgerEntryPayload { // For POST /api/customers/:id/ledger and /api/partners/:id/ledger
    description: string;
    debit?: number;
    credit?: number;
    transactionDate: string; // ISO DateTime string
    referenceType?: string | null;
    referenceId?: number | null;
    changeHistoryJson?: string | null;
}
export interface PartnerPayload { // For POST/PUT /api/partners
  partnerName: string;
  partnerType: string;
  contactPerson?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface OldMobilePhonePayload { // For old endpoint, if used
    purchasePrice: number;
    sellingPrice: number;
    brand: string;
    model: string;
    color?: string;
    storage?: number;
    ram?: number;
    imei: string;
}

// --- Types for Installment Sales ---
export type CheckStatus = "نزد فروشنده" | "در جریان وصول" | "نقد شد" | "برگشت خورد" | "به مشتری برگشت داده شده";
export type InstallmentPaymentStatus = "پرداخت نشده" | "پرداخت جزئی" | "پرداخت شده" | "دیرکرد";
export type OverallInstallmentStatus = "در حال پرداخت" | "تکمیل شده" | "معوق";

export interface InstallmentCheckInfo {
  id?: number; // Optional for new checks before saving
  checkNumber: string;
  bankName: string;
  dueDate: string; // Shamsi Date YYYY/MM/DD from DatePicker, stored as Shamsi
  amount: number;
  status: CheckStatus;
  /** مبلغی که بعد از برگشت/عودت چک، نقدی وصول شده است */
  cashPaid?: number;
  /** مانده قابل دریافت نقدی بابت چک برگشتی/عودت‌شده */
  cashRemaining?: number;
  /** تاریخچه دریافت‌های نقدی متصل به همین چک */
  cashTransactions?: Array<{
    id?: number;
    amount_paid?: number;
    amountPaid?: number;
    payment_date?: string;
    paymentDate?: string;
    notes?: string;
  }>;
}

export interface InstallmentPaymentRecord {
  id?: number; // Optional
  installmentNumber: number;
  dueDate: string; // Shamsi Date YYYY/MM/DD
  amountDue: number;
  paymentDate?: string | null; // Shamsi Date YYYY/MM/DD
  status: InstallmentPaymentStatus;
  sourceType?: 'installment' | 'check_recovery' | string | null;
  sourceId?: number | null;
  transactions?: any[];
  computedPaid?: number;
  computedRemaining?: number;
}

export interface InstallmentSale {
  id: number;
  customerId: number;
  customerFullName?: string; // For display in list
  phoneId?: number | null;
  phoneModel?: string; // For display
  phoneImei?: string;  // For display
  phonePurchaseDate?: string | null;
  phoneRegisterDate?: string | null;
  phoneSaleDate?: string | null;
  saleType?: 'installment' | 'check';
  itemsSummary?: string | null;
  items?: Array<{ itemType: 'phone' | 'inventory' | 'service'; itemId?: number | null; description: string; quantity: number; unitPrice: number; buyPrice?: number; totalPrice: number }>;
  actualSalePrice: number;
  downPayment: number;
  numberOfInstallments: number;
  installmentAmount: number;
  installmentsStartDate: string; // Shamsi Date YYYY/MM/DD
  totalInstallmentPrice?: number; // Calculated: (numberOfInstallments * installmentAmount) + downPayment
  saleDate?: string | null; // تاریخ واقعی فروش/خرید اقساطی
  remainingAmount?: number;
  checks: InstallmentCheckInfo[];
  payments: InstallmentPaymentRecord[];
  overallStatus: OverallInstallmentStatus;
  nextDueDate?: string | null; // Shamsi Date YYYY/MM/DD or null if completed
  notes?: string | null;
  dateCreated: string; // ISO Date
}

export interface NewInstallmentSaleData { // For frontend form
  customerId: number | string | null;
  phoneId: number | string | null;
  actualSalePrice: number | string;
  downPayment: number | string;
  numberOfInstallments: number | string;
  installmentAmount: number | string;
  installmentsStartDate: string; // Shamsi date string from form
  saleDate?: string; // تاریخ واقعی انجام فروش/خرید اقساطی توسط مشتری
  checks: Omit<InstallmentCheckInfo, 'id' | 'status'>[]; // Checks start without ID and default status
  notes?: string;

  // نسل جدید: فروش اقساطی خدمات/لوازم (بدون اجبار گوشی)
  saleType?: 'installment' | 'check';
  phones?: Array<{ phoneId: number; sellPrice: number; buyPrice?: number; title?: string; imei?: string }>;
  accessories?: Array<{ productId: number; qty: number; sellPrice: number; buyPrice?: number; name?: string }>;
  services?: Array<{ serviceId: number; qty: number; sellPrice: number; name?: string }>;
  phoneIds?: number[];
  meta?: any;
}

// Payload for POSTing a new installment sale
export interface InstallmentSalePayload extends Omit<NewInstallmentSaleData, 'customerId' | 'phoneId' | 'actualSalePrice' | 'downPayment' | 'numberOfInstallments' | 'installmentAmount' | 'checks'> {
  customerId: number;
  phoneId?: number | null;
  actualSalePrice: number;
  downPayment: number;
  numberOfInstallments: number;
  installmentAmount: number;
  checks: InstallmentCheckInfo[]; // Submitted checks will have status 'در جریان وصول' or 'نزد فروشنده' initially
}

export interface InstallmentSaleDetailData extends InstallmentSale {
  // any additional fields for detail view if needed
}

// --- Types for Dashboard ---
export interface DashboardKPIs {
  totalSalesMonth: number;
  revenueToday: number;
  phoneSalesRevenueMonth: number; // درآمد فروش نقدی گوشی (ماه جاری)
  installmentSalesRevenueMonth: number; // درآمد فروش اقساطی (ماه جاری)
  repairRevenueMonth: number; // درآمد تعمیرات نهایی‌شده (ماه جاری)
  repairCostsMonth: number; // مجموع هزینه‌های تعمیرات (قطعات + اجرت)
  repairProfitMonth: number; // سود تعمیرات (درآمد - هزینه)
  repairCountMonth: number; // تعداد تعمیرات نهایی‌شده در ماه جاری
  activeProductsCount: number;
  totalCustomersCount: number;
  totalSalesAllTime?: number;
}

export interface ActivityItem {
  id: string; // Unique ID, e.g., "sale-123", "product-45"
  typeDescription: string; // e.g., "فروش جدید", "محصول جدید"
  details: string; // e.g., "آیفون ۱۴ به علی رضایی", "کابل شارژ USB-C اضافه شد"
  timestamp: string; // ISO date string
  icon: string; // FontAwesome icon class
  color?: string; // Tailwind background color class, e.g., "bg-green-500"
  link?: string; // Optional path for navigation
}

export interface DashboardAPIData {
  kpis: DashboardKPIs;
  salesChartData: SalesDataPoint[];
  recentActivities: ActivityItem[];
}

// --- Authentication Types ---
export interface AuthUser {
  id: number;
  username: string;
  roleName: string;
  firstName?: string | null;
  lastName?: string | null;
  lastLogin?: string | null;
  dateAdded?: string;
  avatarUrl?: string | null;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  message?: string;
}

export interface LoginFormData {
  username: string;
  password?: string; // Password might be handled separately from form for security, but included for type
}

export interface ChangePasswordPayload {
    oldPassword: string;
    newPassword: string;
}

// --- Smart Analysis Types ---
export interface ProfitabilityAnalysisItem {
  itemId: number;
  itemType: 'phone' | 'inventory';
  itemName: string;
  totalQuantitySold: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
}

export type ItemClassification = 'پرفروش (داغ)' | 'عادی' | 'کم‌فروش (راکد)';

export interface VelocityItem {
  itemId: number;
  itemType: 'phone' | 'inventory';
  itemName: string;
  salesPerDay: number;
  classification: ItemClassification;
}

export interface InventoryVelocityAnalysis {
  hotItems: VelocityItem[];
  staleItems: VelocityItem[];
  normalItems: VelocityItem[];
}

export interface PurchaseSuggestionItem {
  itemId: number;
  itemType: 'phone' | 'inventory';
  itemName: string;
  currentStock: number;
  salesPerDay: number;
  daysOfStockLeft: number;
  suggestedPurchaseQuantity: number;
}


// --- Repair Center Types ---
export type RepairStatus = "پذیرش شده" | "در حال بررسی" | "منتظر قطعه" | "در حال تعمیر" | "آماده تحویل" | "تحویل داده شده" | "تعمیر نشد" | "مرجوع شد";export interface RepairPart {
    id: number;
    repairId: number;
    productId: number;
    productName: string;
    quantityUsed: number;
    pricePerItem?: number; // Fetched for display
}

export interface Repair {
    id: number;
    customerId: number;
    customerFullName?: string;
    deviceModel: string;
    deviceColor?: string | null;
    serialNumber?: string | null;
    problemDescription: string;
    technicianNotes?: string | null;
    status: RepairStatus;
    estimatedCost?: number | null;
    finalCost?: number | null;
    dateReceived: string; // ISO DateTime
    dateCompleted?: string | null; // ISO DateTime
    technicianId?: number | null;
    technicianName?: string | null;
    laborFee?: number | null;
}

export interface NewRepairData { // For frontend form
    customerId: number | string | null;
    deviceModel: string;
    deviceColor?: string;
    serialNumber?: string;
    problemDescription: string;
    estimatedCost?: number | string;
}

export interface RepairDetailsPageData {
    repair: Repair;
    parts: RepairPart[];
}

export interface FinalizeRepairPayload {
    finalCost: number;
    laborFee: number;
    technicianId: number;
}

// --- Types for Action Center ---
export interface ActionItem {
  id: string; // e.g., 'stock-alert-12' or 'overdue-payment-5'
  type: 'StockAlert' | 'StagnantStock' | 'OverdueInstallment' | 'RepairReady';
  priority: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  actionText: string;
  actionLink: string;
  timestamp?: string; // Optional timestamp for sorting within priorities
}

export type ActionCenterData = ActionItem[];

// --- Services Module Types ---
export interface Service {
  id: number;
  name: string;
  description: string | null;
  price: number;
}

export interface NewServiceData {
  name: string;
  description?: string;
  price: number | string;
}

// --- P1 Reports ---
export type InstallmentCalendarItem = {
  type: 'payment' | 'check';
  id: number;
  saleId: number;
  dueDate: string; // Shamsi jYYYY/jMM/jDD
  amount: number;
  status: string;
  customerId: number;
  customerFullName: string;
  customerPhoneNumber?: string | null;
  checkNumber?: string;
  bankName?: string;
};

export interface FinancialOverviewData {
  range: { from: string; to: string; fromISO: string; toISO: string };
  sales: {
    ordersCount: number;
    subtotal: number;
    discounts: number;
    netSalesBeforeTax: number;
    taxAmount: number;
    totalSales: number;
    refundsTotal: number;
    productSalesTotal: number; // فقط فروش غیرگوشی (لوازم + خدمات)
  };
  profit: { grossProfit: number; cogs: number };
  repairs: {
    count: number;
    revenue: number;
    partsCost: number;
    laborFee: number;
    costs: number;
    profit: number;
  };
  purchases: { total: number };
  workingCapital: { receivables: number; payables: number };
  inventory: { inventoryValue: number };
  top: { debtors: any[]; creditors: any[] };
}