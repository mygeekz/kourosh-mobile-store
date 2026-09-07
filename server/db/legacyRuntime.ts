// Phase 1J: final compatibility surface for historical direct imports from server/db/legacyRuntime.ts.
// Runtime implementation now lives in core/domain modules; this file intentionally contains no DB logic.

export { DB_PATH } from "./connection";
export { allAsync, execAsync, getAsync, runAsync } from "./query";
export { fromShamsiStringToISO } from "./date";
export type { PhoneCostBasisSource } from "./phoneCostBasis";
export {
  resolvePhoneCostBasis,
  resolvePhoneCostBasisAmount,
  syncPhoneCostBasisSnapshots,
  toAccountingNumber,
} from "./phoneCostBasis";
export { normalizeIranPhone } from "../utils/iranPhone";
export { safeJsonStringify, safeJsonParse, normalizeMoney } from "./core/json";
export {
  resolvePhoneHistoryActor,
  resolveHistoryWindow,
  getPhoneHistoryEventClass,
} from "./domains/phoneHistory.db";
export { ensureReportSavedFiltersTable } from "./domains/reportSavedFilters.db";
export { getDashboardSalesChartData } from "./domains/dashboardReports.db";
export type {
  ProductPayload,
  UpdateProductPayload,
  PhoneEntryPayload,
  PhoneEntryUpdatePayload,
  PhoneHistoryActor,
  PhoneInventoryEventPayload,
  SaleDataPayload,
  CustomerPayload,
  LedgerEntryPayload,
  PartnerPayload,
  OldMobilePhonePayload,
  UserUpdatePayload,
  UserForDb,
  RfmItem,
  CohortRow,
  DashboardLayoutsPayload,
  OverallStatus,
  SavedFilterRow,
  InventoryTurnoverReport,
  DeadStockItem,
  AbcItem,
  AgingBucket,
  AgingReceivableRow,
  CashflowDay,
  CashflowReport,
} from "./core/types";
export { normalizeCheckStatus } from "./domains/installmentTypes";
export type {
  CheckStatus,
  InstallmentPaymentStatus,
  InstallmentCheckInfo,
  InstallmentSalePayload,
} from "./domains/installmentTypes";
export {
  getInstallmentPaymentDetailsForSms,
  getInstallmentPaymentLedgerMeta,
  syncInstallmentTransactionCustomerLedger,
  deleteInstallmentTransactionCustomerLedger,
  _toNumber,
  assertInstallmentPaymentAmountIsValid,
} from "./domains/installmentLedger.db";
export type { SettingItem } from "../repositories/settings.repo";
export type { StockCountCreatePayload } from "../repositories/stockCounts.repo";
export type { PurchaseReceiptPayload, PurchaseReceiptItemPayload } from "../repositories/purchaseReceipts.repo";
export type { AdjustStockPayload } from "../repositories/productStockAdjustments.repo";
export type { CustomerFollowupPayload } from "../repositories/customer";
export type { CustomerLedgerInsights } from "../repositories/customer";
export {
  MOBILE_PHONE_CATEGORY_NAME,
  DEFAULT_CATEGORIES,
  ADMIN_ROLE_NAME,
  SALESPERSON_ROLE_NAME,
  MANAGER_ROLE_NAME,
  WAREHOUSE_ROLE_NAME,
  TECHNICIAN_ROLE_NAME,
  MARKETER_ROLE_NAME,
  getOrCreateMobilePhoneCategory,
  seedDefaultCategories,
  seedInitialRoles,
  ensureDefaultBusinessSettings,
  initializeDatabaseInternal,
  getDbInstance,
  closeDbConnection,
} from "./core/initRuntime";
export {
  backfillCustomerLedgerReferences,
  LEGACY_LEDGER_BACKFILL_KEY,
  backfillLegacyHistoryAndLedgers,
  PHONE_PURCHASE_LEDGER_COLLAPSE_KEY,
  normalizePhonePurchaseLedgers,
} from "./core/maintenance";
export {
  ensureFts5UnifiedSearch,
  rebuildSearchIndexInternal,
  initSearchIndexIfNeeded,
} from "./core/searchIndex";
export {
  addPartnerLedgerEntryInternal,
  PHONE_PURCHASE_LEDGER_REFERENCE_TYPES,
  PRODUCT_PURCHASE_LEDGER_REFERENCE_TYPES,
  PURCHASE_LEDGER_REFERENCE_TYPE_SET,
  parseLedgerChangeHistory,
  stringifyLedgerChangeHistory,
  buildPhonePurchaseDescription,
  fetchLatestPurchaseLedgerRowForReference,
} from "./domains/ledgerSupport.db";
export type { LedgerChangeHistoryEntry } from "./domains/ledgerSupport.db";
export {
  getAllSettingsAsObject,
  updateMultipleSettings,
  updateSetting,
} from "./domains/settings.db";
export {
  getAllServicesFromDb,
  addServiceToDb,
  updateServiceInDb,
  deleteServiceFromDb,
  addCategoryToDb,
  getAllCategoriesFromDb,
  updateCategoryInDb,
  deleteCategoryFromDb,
} from "./domains/products.db";
export {
  addExpenseToDb,
  updateExpenseInDb,
  deleteExpenseFromDb,
  listExpensesFromDb,
  getExpensesSummaryFromDb,
  addRecurringExpenseToDb,
  listRecurringExpensesFromDb,
  updateRecurringExpenseInDb,
  deleteRecurringExpenseFromDb,
  getRecurringExpenseByIdFromDb,
  advanceRecurringExpenseNextRunDateInDb,
  markRecurringExpenseRunInDb,
  addRecurringExpensePaymentToDb,
} from "./domains/expenses.db";
export {
  adjustProductStockInDb,
  createStockCountInDb,
  getAllStockCountsFromDb,
  getStockCountByIdFromDb,
  upsertStockCountItemInDb,
  completeStockCountInDb,
  recordInventoryInDb,
  computeFifoCogsForProduct,
  getInventoryFifoAgingForAllProducts,
  getMonthlyProfitByProductFifo,
  createInventoryAdjustmentInDb,
  getInventoryAgingBucketsFromDb,
  listSalesProfitRowsFifo,
  getRealProfitPerProductFifo,
} from "./domains/inventory.db";
export {
  createPurchaseReceiptInDb,
  getAllPurchasesFromDb,
  getPurchaseByIdFromDb,
} from "./domains/purchases.db";
export {
  addCustomerLedgerEntryToDb,
  addCustomerLedgerEntryInternal,
  addCustomerToDb,
  getAllCustomersWithBalanceFromDb,
  getCustomerByIdFromDb,
  updateCustomerInDb,
  updateCustomerTagsInDb,
  deleteCustomerFromDb,
  getLedgerForCustomerFromDb,
  addCustomerFollowupToDb,
  listCustomerFollowupsFromDb,
  closeCustomerFollowupInDb,
  updateCustomerFollowupInDb,
  setCustomerRiskOverrideInDb,
  getCustomerLedgerInsightsFromDb,
  updateCustomerLedgerEntryInDb,
  deleteCustomerLedgerEntryFromDb,
  recalcCustomerBalances,
  recalcCustomerBalancesInternal,
} from "./domains/customers.db";
export {
  SOLD_PHONE_DAILY_BUY_PRICE_SQL,
  PHONE_SETTLEMENT_LEDGER_TYPES_SQL,
  PHONE_SETTLEMENT_MANUAL_PAID_SQL,
  PHONE_SETTLEMENT_PAID_SQL,
  tableExists,
  getColumnNamesSafe,
  hasStoreOwnershipCoreTables,
  getProfileItems,
  normalizePercent,
  replaceProfitShareProfileItems,
  replaceOwnershipProfileItems,
  addPartnerToDb,
  getAllPartnersWithBalanceFromDb,
  getPartnerByIdFromDb,
  updatePartnerInDb,
  deletePartnerFromDb,
  addPartnerLedgerEntryToDb,
  getLedgerForPartnerFromDb,
  getPurchasedItemsFromPartnerDb,
  updatePartnerLedgerEntryInDb,
  deletePartnerLedgerEntryFromDb,
  recalcPartnerBalances,
  getLegacyPartnerCandidatesFromDb,
  listStorePartnersFromDb,
  createStorePartnerFromDb,
  updateStorePartnerFromDb,
  listProfitShareProfilesFromDb,
  createProfitShareProfileFromDb,
  listOwnershipProfilesFromDb,
  createOwnershipProfileFromDb,
  saveStoreOwnershipConfigurationFromDb,
  createDefaultOwnershipCore,
  getStoreOwnershipCoverageFromDb,
  previewStoreOwnershipBackfillFromDb,
  applyStoreOwnershipBackfillFromDb,
  listStoreOwnershipReviewQueueFromDb,
  assignStoreOwnershipReviewItemsFromDb,
  listPartnerSettlementTransactionsFromDb,
  createPartnerSettlementTransactionFromDb,
  cancelPartnerSettlementTransactionFromDb,
} from "./domains/partners.db";
export type { ShareInput } from "./domains/partners.db";
export {
  getRepairFinancialSummary,
  createRepairInDb,
  getAllRepairsFromDb,
  getRepairByIdFromDb,
  updateRepairInDb,
  finalizeRepairInDb,
  addPartToRepairInDb,
  deletePartFromRepairInDb,
  getRepairDetailsForSms,
  getRepairsReadyForPickupFromDb,
} from "./domains/repairs.db";
export type { RepairFinancialSummary } from "./domains/repairs.db";
export type {
  ChangePasswordPayload,
  NewRepairData,
  FinalizeRepairPayload,
  Service,
} from "./core/types";
export type {
  TelegramLinkRequestStatus,
  TelegramLinkRequestRow,
} from "./domains/messages.db";
export {
  upsertTelegramLinkRequest,
  getPendingTelegramLinkRequestByChatId,
  bumpTelegramLinkRequestAttempt,
  markTelegramLinkRequestVerified,
  linkCustomerTelegramByPhone,
  getLinkedPartnerByChatId,
  linkPartnerTelegramByPhone,
  unlinkPartnerTelegram,
  createTelegramLinkToken,
  getTelegramLinkTokenByPlainToken,
  getPendingTelegramLinkTokenByChatId,
  markTelegramLinkTokenStatus,
  linkCustomerTelegramById,
} from "./domains/messages.db";
export type {
  ExpenseCategory,
  ExpensePayload,
  RecurringExpensePayload,
  RecurringExpensePaymentPayload,
} from "../repositories/expenseRecords.repo";
export {
  normalizeShareLines,
  getDefaultProfitShareProfileFromDb,
  getDefaultOwnershipProfileFromDb,
  getProfitShareLinesByProfileId,
  getOwnershipLinesByProfileId,
  resolveOwnershipContextByProfileId,
  allocateAmountAcrossShares,
  purgeProfitSnapshotsForSource,
  updateSaleProfitSnapshotSourceStatus,
  persistSaleProfitSnapshotItem,
  snapshotInstallmentSaleProfitAllocations,
  buildSaleProfitSnapshotResponse,
  getLegacySaleRowsForReports,
  buildLegacyComputedSales,
  summarizeLegacyProfitRows,
  getPartnerProfitReportFromDb,
  buildLegacyAccessoriesReportFromDb,
  buildLegacyPhonesReportFromDb,
  buildLegacySettlementReportFromDb,
} from "./domains/profitSnapshots.db";
export type {
  ProfitShareLine,
  ResolvedOwnershipContext,
  SaleProfitSnapshotItemInput,
} from "./domains/profitSnapshots.db";
