// Public database payload/report types extracted from legacyRuntime in Phase 1I.

import type {
  InstallmentSale as FrontendInstallmentSale,
  ChangePasswordPayload,
  NewRepairData,
  FinalizeRepairPayload,
  Service,
} from "../../../types";

export type { PhoneCostBasisSource } from "../phoneCostBasis";
export type { SettingItem } from "../../repositories/settings.repo";
export type { StockCountCreatePayload } from "../../repositories/stockCounts.repo";
export type { PurchaseReceiptPayload, PurchaseReceiptItemPayload } from "../../repositories/purchaseReceipts.repo";
export type { AdjustStockPayload } from "../../repositories/productStockAdjustments.repo";
export type { CustomerFollowupPayload, CustomerLedgerInsights } from "../../repositories/customer";
export type {
  ExpenseCategory,
  ExpensePayload,
  RecurringExpensePayload,
  RecurringExpensePaymentPayload,
} from "../../repositories/expenseRecords.repo";
export type {
  CheckStatus,
  InstallmentPaymentStatus,
  InstallmentCheckInfo,
  InstallmentSalePayload,
} from "../domains/installmentTypes";
export type {
  TelegramLinkRequestRow,
  TelegramLinkRequestStatus,
} from "../domains/messages.db";
export type { LedgerChangeHistoryEntry } from "../domains/ledgerSupport.db";
export type { RepairFinancialSummary } from "../domains/repairs.db";
export type { ShareInput } from "../domains/partners.db";
export type {
  ProfitShareLine,
  ResolvedOwnershipContext,
  SaleProfitSnapshotItemInput,
} from "../domains/profitSnapshots.db";
export type {
  ChangePasswordPayload,
  NewRepairData,
  FinalizeRepairPayload,
  Service,
};

export interface ProductPayload {
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

export interface UpdateProductPayload {
  name?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  stock_quantity?: number;
  categoryId?: number | null;
  supplierId?: number | null;
  sku?: string | null;
  barcode?: string | null;
  unit?: string | null;
}

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
  purchaseDate?: string | null;
  saleDate?: string | null;
  registerDate?: string;
  status?: string;
  notes?: string | null;
  supplierId?: number | null;
}

export interface PhoneBulkPurchaseItemPayload {
  model: string;
  color?: string | null;
  storage?: string | null;
  ram?: string | null;
  imei: string;
  purchasePrice: number;
}

export interface PhoneBulkPurchasePayload {
  supplierId: number;
  purchaseDate: string;
  items: PhoneBulkPurchaseItemPayload[];
}

export interface PhoneEntryUpdatePayload {
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
  purchaseDate?: string | null;
  status?: string;
  notes?: string | null;
  supplierId?: number | string | null;
}

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
  itemType: "phone" | "inventory" | "service";
  itemId: number;
  quantity: number;
  transactionDate: string;
  customerId?: number | null;
  notes?: string | null;
  discount?: number;
  paymentMethod: "cash" | "credit";
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
  transactionDate: string;
  referenceType?: string | null;
  referenceId?: number | null;
  settlementBatchId?: string | null;
}

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

export interface OldMobilePhonePayload {
  purchasePrice: number;
  sellingPrice: number;
  brand: string;
  model: string;
  color?: string;
  storage?: number;
  ram?: number;
  imei: string;
}

export interface UserUpdatePayload {
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

export interface CohortRow {
  cohortMonth: string;
  counts: number[];
  totals: number;
}

export type DashboardLayoutsPayload = any;

export type OverallStatus = FrontendInstallmentSale["overallStatus"];

export type SavedFilterRow = {
  id: number;
  userId: number;
  reportKey: string;
  name: string;
  filtersJson: string;
  createdAt: string;
  updatedAt: string;
};

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
    cogsSource: 'sales_documents' | 'inventory_ledger' | 'none';
    productsWithStock: number;
    productsWithCost: number;
    productsWithSellingFallback: number;
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

export type AbcItem = {
  productId: number;
  name: string;
  categoryName?: string | null;
  sales: number;
  cogs: number;
  profit: number;
  share: number;
  cumShare: number;
  bucket: "A" | "B" | "C";
};

export type AgingBucket = {
  bucket: "0-30" | "31-60" | "61-90" | "90+";
  amount: number;
};

export type AgingReceivableRow = {
  customerId: number;
  fullName: string;
  phoneNumber?: string | null;
  totalOutstanding: number;
  buckets: AgingBucket[];
};

export type CashflowDay = {
  date: string;
  inflow: number;
  outflow: number;
  net: number;
};

export type CashflowReport = {
  days: CashflowDay[];
  totals: { inflow: number; outflow: number; net: number };
  forecast: CashflowDay[];
};
