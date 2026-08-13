# Phase 1B Decomposition Notes

## Export inventory audit
- `server/db/legacyDatabase.ts` original public export entries: 268 (223 value exports, 45 type exports).
- `server/database.ts` remains a compatibility barrel: `export * from "./db/legacyDatabase"`.

### Value exports preserved
- `DB_PATH`
- `allAsync`
- `execAsync`
- `getAsync`
- `runAsync`
- `fromShamsiStringToISO`
- `resolvePhoneCostBasis`
- `resolvePhoneCostBasisAmount`
- `syncPhoneCostBasisSnapshots`
- `toAccountingNumber`
- `normalizeIranPhone`
- `bumpTelegramLinkRequestAttempt`
- `createTelegramLinkToken`
- `getLinkedPartnerByChatId`
- `getPendingTelegramLinkRequestByChatId`
- `getPendingTelegramLinkTokenByChatId`
- `getTelegramLinkTokenByPlainToken`
- `linkCustomerTelegramById`
- `linkCustomerTelegramByPhone`
- `linkPartnerTelegramByPhone`
- `markTelegramLinkRequestVerified`
- `markTelegramLinkTokenStatus`
- `unlinkPartnerTelegram`
- `upsertTelegramLinkRequest`
- `getDbInstance`
- `closeDbConnection`
- `addAuditLog`
- `getAuditLogs`
- `getRfmReport`
- `getCohortReport`
- `getProfitPerSaleMapFromDb`
- `addPartnerLedgerEntryInternal`
- `getAllServicesFromDb`
- `addServiceToDb`
- `updateServiceInDb`
- `deleteServiceFromDb`
- `addCategoryToDb`
- `getAllCategoriesFromDb`
- `updateCategoryInDb`
- `deleteCategoryFromDb`
- `addProductToDb`
- `getAllProductsFromDb`
- `updateProductInDb`
- `deleteProductFromDb`
- `addPhoneInventoryEventToDb`
- `listPhoneInventoryEventsFromDb`
- `getPhoneInventoryChangeReportFromDb`
- `searchPhoneInventoryEventsFromDb`
- `getPhoneInventoryEnterpriseReportFromDb`
- `addPhoneEntryToDb`
- `updatePhoneEntryInDb`
- `deletePhoneEntryFromDb`
- `getAllPhoneModelsFromDb`
- `addPhoneModelToDb`
- `getAllPhoneColorsFromDb`
- `addPhoneColorToDb`
- `getAllPhoneEntriesFromDb`
- `getSellableItemsFromDb`
- `getAllSalesTransactionsFromDb`
- `getAllSalesOrdersFromDb`
- `addCustomerLedgerEntryToDb`
- `addCustomerLedgerEntryInternal`
- `recordSaleTransactionInDb`
- `addCustomerToDb`
- `getAllCustomersWithBalanceFromDb`
- `getCustomerByIdFromDb`
- `updateCustomerInDb`
- `updateCustomerTagsInDb`
- `deleteCustomerFromDb`
- `getLedgerForCustomerFromDb`
- `addCustomerFollowupToDb`
- `listCustomerFollowupsFromDb`
- `closeCustomerFollowupInDb`
- `updateCustomerFollowupInDb`
- `setCustomerRiskOverrideInDb`
- `getCustomerLedgerInsightsFromDb`
- `addPartnerToDb`
- `getAllPartnersWithBalanceFromDb`
- `getPartnerByIdFromDb`
- `updatePartnerInDb`
- `deletePartnerFromDb`
- `addPartnerLedgerEntryToDb`
- `getLedgerForPartnerFromDb`
- `getPurchasedItemsFromPartnerDb`
- `getSalesSummaryAndProfit`
- `getDebtorsList`
- `getCreditorsList`
- `getTopCustomersBySales`
- `getTopSuppliersByPurchaseValue`
- `getPhoneSalesDateBounds`
- `getPhoneInstallmentSalesDateBounds`
- `getPhoneSalesReport`
- `getPhoneInstallmentSalesReport`
- `getInvoiceDataById`
- `getInvoiceDataForSaleIds`
- `createInvoice`
- `getAllSettingsAsObject`
- `updateMultipleSettings`
- `updateSetting`
- `getAllRoles`
- `addUserToDb`
- `updateUserInDb`
- `deleteUserFromDb`
- `getAllUsersWithRoles`
- `findUserByUsername`
- `changePasswordInDb`
- `resetUserPasswordInDb`
- `updateAvatarPathInDb`
- `getRepairFinancialSummary`
- `getDashboardKPIs`
- `getDashboardSalesChartData`
- `getDashboardRecentActivities`
- `getUserDashboardLayoutFromDb`
- `upsertUserDashboardLayoutInDb`
- `deleteUserDashboardLayoutFromDb`
- `addInstallmentSaleToDb`
- `deleteInstallmentSaleFromDb`
- `getAllInstallmentSalesFromDb`
- `getInstallmentSaleByIdFromDb`
- `updateInstallmentPaymentStatusInDb`
- `updateCheckStatusInDb`
- `addCheckRecoveryPaymentToDb`
- `getInstallmentPaymentDetailsForSms`
- `getInstallmentSaleDetailsForSms`
- `getInstallmentCheckDetailsForSms`
- `getProfitabilityReportFromDb`
- `getInventoryVelocityReportFromDb`
- `getPurchaseSuggestionsReportFromDb`
- `createRepairInDb`
- `getAllRepairsFromDb`
- `getRepairByIdFromDb`
- `updateRepairInDb`
- `finalizeRepairInDb`
- `addPartToRepairInDb`
- `deletePartFromRepairInDb`
- `getRepairDetailsForSms`
- `getOverdueInstallmentsFromDb`
- `getPendingInstallmentPaymentsWithCustomer`
- `getPendingInstallmentChecksWithCustomer`
- `getRepairsReadyForPickupFromDb`
- `addInstallmentTransactionToDb`
- `getPaymentIdByTransactionIdFromDb`
- `recalcInstallmentPaymentStatusInDb`
- `updateInstallmentTransactionInDb`
- `deleteInstallmentTransactionFromDb`
- `rebuildSearchIndex`
- `updatePartnerLedgerEntryInDb`
- `deletePartnerLedgerEntryFromDb`
- `recalcPartnerBalances`
- `updateCustomerLedgerEntryInDb`
- `deleteCustomerLedgerEntryFromDb`
- `recalcCustomerBalances`
- `adjustProductStockInDb`
- `createPurchaseReceiptInDb`
- `getAllPurchasesFromDb`
- `getPurchaseByIdFromDb`
- `createStockCountInDb`
- `getAllStockCountsFromDb`
- `getStockCountByIdFromDb`
- `upsertStockCountItemInDb`
- `completeStockCountInDb`
- `addAuditLogEntry`
- `dismissNotificationForUserInDb`
- `listDismissedNotificationIdsForUserFromDb`
- `addExpenseToDb`
- `updateExpenseInDb`
- `deleteExpenseFromDb`
- `listExpensesFromDb`
- `getExpensesSummaryFromDb`
- `addRecurringExpenseToDb`
- `listRecurringExpensesFromDb`
- `updateRecurringExpenseInDb`
- `deleteRecurringExpenseFromDb`
- `getRecurringExpenseByIdFromDb`
- `advanceRecurringExpenseNextRunDateInDb`
- `markRecurringExpenseRunInDb`
- `addRecurringExpensePaymentToDb`
- `upsertDebtSnapshotInDb`
- `listDebtSnapshotsFromDb`
- `recordInventoryInDb`
- `computeFifoCogsForProduct`
- `getInventoryFifoAgingForAllProducts`
- `getMonthlyProfitByProductFifo`
- `createInventoryAdjustmentInDb`
- `getInventoryAgingBucketsFromDb`
- `listSalesProfitRowsFifo`
- `getRealProfitPerProductFifo`
- `listReportSavedFilters`
- `createOrReplaceReportSavedFilter`
- `deleteReportSavedFilter`
- `getInventoryTurnoverReport`
- `getDeadStockReport`
- `getAbcReport`
- `getAgingReceivablesReport`
- `getCashflowReport`
- `getPhoneInventoryDashboardReportFromDb`
- `getLegacyPartnerCandidatesFromDb`
- `listStorePartnersFromDb`
- `createStorePartnerFromDb`
- `updateStorePartnerFromDb`
- `listProfitShareProfilesFromDb`
- `createProfitShareProfileFromDb`
- `listOwnershipProfilesFromDb`
- `createOwnershipProfileFromDb`
- `saveStoreOwnershipConfigurationFromDb`
- `bootstrapStoreOwnershipCoreFromDb`
- `getStoreOwnershipCoverageFromDb`
- `previewStoreOwnershipBackfillFromDb`
- `applyStoreOwnershipBackfillFromDb`
- `listStoreOwnershipReviewQueueFromDb`
- `assignStoreOwnershipReviewItemsFromDb`
- `updateSaleProfitSnapshotSourceStatus`
- `snapshotSalesOrderProfitAllocations`
- `snapshotInstallmentSaleProfitAllocations`
- `getSalesOrderProfitSnapshotFromDb`
- `getInstallmentSaleProfitSnapshotFromDb`
- `getPartnerProfitReportFromDb`
- `getPartnerAccessoriesReportFromDb`
- `listPartnerSettlementTransactionsFromDb`
- `createPartnerSettlementTransactionFromDb`
- `cancelPartnerSettlementTransactionFromDb`
- `getPartnerSettlementReportFromDb`
- `getPartnerPhonesReportFromDb`

### Type exports preserved
- `PhoneCostBasisSource`
- `SettingItem`
- `StockCountCreatePayload`
- `PurchaseReceiptItemPayload`
- `PurchaseReceiptPayload`
- `AdjustStockPayload`
- `CustomerFollowupPayload`
- `CustomerLedgerInsights`
- `ChangePasswordPayload`
- `FinalizeRepairPayload`
- `NewRepairData`
- `Service`
- `ProductPayload`
- `UpdateProductPayload`
- `PhoneEntryPayload`
- `PhoneEntryUpdatePayload`
- `PhoneHistoryActor`
- `PhoneInventoryEventPayload`
- `SaleDataPayload`
- `CustomerPayload`
- `LedgerEntryPayload`
- `PartnerPayload`
- `OldMobilePhonePayload`
- `CheckStatus`
- `InstallmentPaymentStatus`
- `InstallmentCheckInfo`
- `InstallmentSalePayload`
- `UserUpdatePayload`
- `UserForDb`
- `TelegramLinkRequestRow`
- `TelegramLinkRequestStatus`
- `RfmItem`
- `CohortRow`
- `RepairFinancialSummary`
- `ExpenseCategory`
- `ExpensePayload`
- `RecurringExpensePayload`
- `RecurringExpensePaymentPayload`
- `InventoryTurnoverReport`
- `DeadStockItem`
- `AbcItem`
- `AgingBucket`
- `AgingReceivableRow`
- `CashflowDay`
- `CashflowReport`

## Direct imports of `legacyDatabase.ts`
server/database.ts:4:export * from "./db/legacyDatabase";

## Imports of `database.ts`
server/bootstrap/telegramUpdateHandler.ts:36:} from "../database";
server/bootstrap/coreBusinessRuntime.ts:77:} from "../database";
server/bootstrap/messagingRuntimeDeps.ts:64:} from "../database";
server/bootstrap/appComposition.ts:21:import { getAllSettingsAsObject } from "../database";
server/intelligence/financial/financialBrain.service.ts:1:import { getAsync } from "../../database";
server/intelligence/financial/financialUtils.ts:2:import { fromShamsiStringToISO } from "../../database";
server/intelligence/predictive/collectionPressure.ts:2:import { getAsync } from "../../database";
server/intelligence/predictive/inventoryStockoutRisk.ts:2:import { allAsync } from "../../database";
server/intelligence/predictive/predictiveUtils.ts:2:import { fromShamsiStringToISO } from "../../database";
server/intelligence/predictive/salesForecast.ts:2:import { allAsync, getAsync } from "../../database";
server/intelligence/smartInsights/smartInsightCore.service.ts:2:import { allAsync, runAsync } from "../../database";
server/intelligence/smartInsights/smartInsightCustomer.service.ts:2:import { runAsync } from "../../database";
server/intelligence/smartInsights/smartInsightDecisionMemory.service.ts:1:import { runAsync } from "../../database";
server/intelligence/smartInsights/smartInsightProfitEngine.service.ts:1:import { runAsync } from "../../database";
server/reporting/mobileSalesAnalytics/mobileSalesAnalyticsCash.service.ts:1:import { allAsync } from "../../database";
server/reporting/mobileSalesAnalytics/mobileSalesAnalyticsInstallments.service.ts:1:import { allAsync } from "../../database";
server/reporting/mobileSalesAnalytics/mobileSalesAnalyticsPartnerCapital.service.ts:1:import { allAsync } from "../../database";
server/repositories/expenses.repo.ts:15:} from '../database';
server/repositories/installments.repo.ts:14:} from '../database';
server/repositories/inventory.repo.ts:11:} from "../database";
server/repositories/legacySales.repo.ts:5:} from '../database';
server/repositories/partnerOwnership.repo.ts:9:} from "../database";
server/repositories/phones.repo.ts:15:} from '../database';
server/repositories/phones.repo.ts:20:} from '../database';
server/repositories/products.repo.ts:13:} from "../database";
server/repositories/purchases.repo.ts:9:} from '../database';
server/repositories/salesInvoice.repo.ts:5:} from '../database';
server/repositories/salesRead.repo.ts:7:} from '../database';
server/repositories/customers.repo.ts:1:import { getDbInstance } from "../database";
server/repositories/partners.repo.ts:1:import { getDbInstance } from "../database";
server/routes/agingCashflowReports.routes.ts:2:import { getAgingReceivablesReport, getCashflowReport } from "../database";
server/routes/auditLog.routes.ts:2:import { getAuditLogs } from "../database";
server/routes/auth.routes.ts:16:} from "../database";
server/routes/backup.routes.ts:17:} from "../database";
server/routes/barcode.routes.ts:3:import { getAsync, getDbInstance } from '../database';
server/routes/collectionCenterReports.routes.ts:3:import { fromShamsiStringToISO } from "../database";
server/routes/dashboard.routes.ts:14:} from "../database";
server/routes/expenses.routes.ts:2:import { addAuditLog } from '../database';
server/routes/financialOverviewReports.routes.ts:3:import { fromShamsiStringToISO } from "../database";
server/routes/followupsInstallmentsReports.routes.ts:3:import { allAsync, fromShamsiStringToISO } from "../database";
server/routes/inventory.routes.ts:2:import { addAuditLog } from "../database";
server/routes/localSettings.routes.ts:9:} from "../database";
server/routes/notificationOutbox.routes.ts:28:} from "../database";
server/routes/notifications.routes.ts:14:} from "../database";
server/routes/productSalesReports.routes.ts:3:import { fromShamsiStringToISO } from "../database";
server/routes/products.routes.ts:2:import { addAuditLog } from "../database";
server/routes/reminderRules.routes.ts:9:} from "../database";
server/routes/reminderRuntime.routes.ts:10:} from "../database";
server/routes/repairs.routes.ts:13:} from '../database';
server/routes/repairs.routes.ts:14:import type { FinalizeRepairPayload, NewRepairData } from '../database';
server/routes/reportAnalytics.routes.ts:10:} from "../database";
server/routes/reportAudit.routes.ts:3:import { allAsync } from "../database";
server/routes/reportAutomation.routes.ts:15:} from "../database";
server/routes/reportExport.routes.ts:10:} from "../database";
server/routes/reportMobileSalesAnalytics.routes.ts:3:import { fromShamsiStringToISO } from "../database";
server/routes/reportSalesCore.routes.ts:13:} from "../database";
server/routes/salesOrderMutations.routes.ts:2:import { addAuditLog, getAllSettingsAsObject } from '../database';
server/routes/search.routes.ts:2:import { allAsync, getAsync } from '../database';
server/routes/services.routes.ts:8:} from "../database";
server/routes/settings.routes.ts:6:} from "../database";
server/routes/smartInsightActions.routes.ts:2:import { runAsync } from "../database";
server/routes/smartInsightReport.routes.ts:3:import { fromShamsiStringToISO } from "../database";
server/routes/smsDiagnostics.routes.ts:2:import { getAllSettingsAsObject } from "../database";
server/routes/telegramAdmin.routes.ts:9:} from "../database";
server/routes/telegramControl.routes.ts:9:} from "../database";
server/routes/telegramCustomerActions.routes.ts:3:import { getAllSettingsAsObject, getAsync, runAsync } from "../database";
server/routes/telegramInbox.routes.ts:2:import { allAsync, getAsync, runAsync } from "../database";
server/routes/telegramLinking.routes.ts:8:} from "../database";
server/routes/telegramRuntime.routes.ts:10:} from "../database";
server/routes/telegramTopicConfig.routes.ts:8:} from "../database";
server/routes/telegramWebhook.routes.ts:3:import { getAllSettingsAsObject, updateSetting } from "../database";
server/routes/users.routes.ts:10:} from "../database";
server/services/installments.service.ts:7:} from '../database';
server/services/phones.service.ts:11:} from '../database';
server/utils/collectionCenterHelpers.ts:2:import { allAsync, fromShamsiStringToISO } from "../database";
server/utils/notificationSchemaHelpers.ts:1:import { allAsync, runAsync } from "../database";
server/utils/productSalesReportHelpers.ts:2:import { allAsync, getAsync, fromShamsiStringToISO } from "../database";
server/utils/reminderRuntimeHelpers.ts:8:} from "../database";
server/utils/salesAdvisorHelpers.ts:2:import { allAsync } from "../database";
server/utils/smsLogHelpers.ts:1:import { runAsync } from "../database";
server/utils/telegramBotHelpers.ts:5:import { getAllSettingsAsObject } from "../database";
server/analysis.ts:5:} from './database';
server/app.ts:16:} from "./database";
server/auth.ts:4:import { db } from "./database";
server/inventory.ts:2:import { db } from "./database";
server/inventoryAlerts.ts:2:import { getDbInstance } from "./database";
server/inventoryService.ts:2:import { db } from "./database";
server/reports.ts:1:import { getDbInstance } from "./database";
server/salesOrders.ts:16:} from './database';

## Phase 1B safety note
The runtime implementation was moved unchanged into `server/db/legacyRuntime.ts`; new core/domain files provide compatibility-safe database API surfaces. This avoids SQL, schema, initialization-order, Persian-message, and calculation changes while replacing `legacyDatabase.ts` with a small compatibility barrel.

## Additional compatibility export
- `db` compatibility proxy is exported from `server/db/connection.ts` because existing files import `{ db }` from `server/database`; it forwards property access to the active SQLite connection and does not change schema or initialization order.


## Phase 1C extraction pass
Moved safely leaf/domain-level exported function bodies from `server/db/legacyRuntime.ts` into `server/db/domains/*.db.ts`. Functions that are referenced by retained runtime initialization/backfill/report-support code intentionally remain re-exported from `legacyRuntime.ts` to avoid circular dependency or behavior risk.

### Moved functions by domain

- `audit.db.ts`: 5 moved — addAuditLog, getAuditLogs, addAuditLogEntry, dismissNotificationForUserInDb, listDismissedNotificationIdsForUserFromDb
- `auth.db.ts`: 9 moved — getAllRoles, addUserToDb, updateUserInDb, deleteUserFromDb, getAllUsersWithRoles, findUserByUsername, changePasswordInDb, resetUserPasswordInDb, updateAvatarPathInDb
- `customers.db.ts`: 2 moved — upsertDebtSnapshotInDb, listDebtSnapshotsFromDb
- `installments.db.ts`: 17 moved — addInstallmentSaleToDb, deleteInstallmentSaleFromDb, getAllInstallmentSalesFromDb, getInstallmentSaleByIdFromDb, updateInstallmentPaymentStatusInDb, updateCheckStatusInDb, addCheckRecoveryPaymentToDb, getInstallmentSaleDetailsForSms, getInstallmentCheckDetailsForSms, getOverdueInstallmentsFromDb, getPendingInstallmentPaymentsWithCustomer, getPendingInstallmentChecksWithCustomer, addInstallmentTransactionToDb, getPaymentIdByTransactionIdFromDb, recalcInstallmentPaymentStatusInDb, updateInstallmentTransactionInDb, deleteInstallmentTransactionFromDb
- `partners.db.ts`: 1 moved — bootstrapStoreOwnershipCoreFromDb
- `phones.db.ts`: 14 moved — addPhoneInventoryEventToDb, listPhoneInventoryEventsFromDb, getPhoneInventoryChangeReportFromDb, searchPhoneInventoryEventsFromDb, getPhoneInventoryEnterpriseReportFromDb, addPhoneEntryToDb, updatePhoneEntryInDb, deletePhoneEntryFromDb, getAllPhoneModelsFromDb, addPhoneModelToDb, getAllPhoneColorsFromDb, addPhoneColorToDb, getAllPhoneEntriesFromDb, getPhoneInventoryDashboardReportFromDb
- `products.db.ts`: 5 moved — addProductToDb, getAllProductsFromDb, updateProductInDb, deleteProductFromDb, getSellableItemsFromDb
- `reports.db.ts`: 30 moved — getRfmReport, getCohortReport, getSalesSummaryAndProfit, getDebtorsList, getCreditorsList, getTopCustomersBySales, getTopSuppliersByPurchaseValue, getPhoneSalesDateBounds, getPhoneInstallmentSalesDateBounds, getPhoneSalesReport, getPhoneInstallmentSalesReport, getDashboardKPIs, getDashboardRecentActivities, getUserDashboardLayoutFromDb, upsertUserDashboardLayoutInDb, deleteUserDashboardLayoutFromDb, getProfitabilityReportFromDb, getInventoryVelocityReportFromDb, getPurchaseSuggestionsReportFromDb, listReportSavedFilters, createOrReplaceReportSavedFilter, deleteReportSavedFilter, getInventoryTurnoverReport, getDeadStockReport, getAbcReport, getAgingReceivablesReport, getCashflowReport, getPartnerAccessoriesReportFromDb, getPartnerSettlementReportFromDb, getPartnerPhonesReportFromDb
- `sales.db.ts`: 10 moved — getProfitPerSaleMapFromDb, getAllSalesTransactionsFromDb, getAllSalesOrdersFromDb, recordSaleTransactionInDb, getInvoiceDataById, getInvoiceDataForSaleIds, createInvoice, snapshotSalesOrderProfitAllocations, getSalesOrderProfitSnapshotFromDb, getInstallmentSaleProfitSnapshotFromDb
- `search.db.ts`: 1 moved — rebuildSearchIndex
