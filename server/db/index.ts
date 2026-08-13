// Public database API barrel for server/db.
// Compatibility files should re-export from here.
export { DB_PATH, db, beginDatabaseMaintenance } from "./core/connection";
export { allAsync, execAsync, getAsync, runAsync } from "./core/query";
export * from "./core/json";
export { fromShamsiStringToISO } from "./core/date";
export * from "./core/init";
export * from "./core/maintenance";
export * from "./core/searchIndex";
export * from "./core/types";
export * from "./domains/helpers.db";
export * from "./domains/phoneHistory.db";
export * from "./domains/reportSavedFilters.db";
export * from "./domains/dashboardReports.db";
export * from "./domains/ledgerSupport.db";
export * from "./domains/messages.db";
export * from "./domains/audit.db";
export * from "./domains/settings.db";
export * from "./domains/auth.db";
export * from "./domains/products.db";
export * from "./domains/phones.db";
export * from "./domains/sales.db";
export * from "./domains/customers.db";
export * from "./domains/partners.db";
export * from "./domains/installmentTypes";
export * from "./domains/installmentLedger.db";
export * from "./domains/installments.db";
export * from "./domains/installmentCancellation.db";
export * from "./domains/repairs.db";
export * from "./domains/expenses.db";
export * from "./domains/inventory.db";
export * from "./domains/purchases.db";
export * from "./domains/search.db";
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
export * from "./domains/reports.db";
// Phase 1F explicit type aliases resolve export-star collisions introduced by domain ownership/repair modules.
export type { ShareInput } from "./domains/partners.db";
export type { RepairFinancialSummary } from "./domains/repairs.db";
