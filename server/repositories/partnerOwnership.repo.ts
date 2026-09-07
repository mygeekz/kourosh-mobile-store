import {
  getPartnerAccessoriesReportFromDb,
  getPartnerPhonesReportFromDb,
  getPartnerProfitReportFromDb,
  getPartnerSettlementReportFromDb,
  listPartnerSettlementTransactionsFromDb,
  createPartnerSettlementTransactionFromDb,
  cancelPartnerSettlementTransactionFromDb,
} from "../database";
import {
  applyStoreOwnershipBackfillForOwnershipBoundary,
  assignStoreOwnershipReviewItemsForOwnershipBoundary,
  bootstrapStoreOwnershipCoreForOwnershipBoundary,
  createOwnershipProfileForOwnershipBoundary,
  createProfitShareProfileForOwnershipBoundary,
  createStorePartnerForOwnershipBoundary,
  getLegacyPartnerCandidatesForOwnershipBoundary,
  getStoreOwnershipCoverageForOwnershipBoundary,
  listOwnershipProfilesForOwnershipBoundary,
  listProfitShareProfilesForOwnershipBoundary,
  listStoreOwnershipReviewQueueForOwnershipBoundary,
  listStorePartnersForOwnershipBoundary,
  previewStoreOwnershipBackfillForOwnershipBoundary,
  saveStoreOwnershipConfigurationForOwnershipBoundary,
  updateStorePartnerForOwnershipBoundary,
} from "./ownership";

export type PartnerReportDateRange = {
  fromDateIso?: string;
  toDateIso?: string;
};

export const partnerOwnershipRepo = {
  getPartnerProfitReport: (params: PartnerReportDateRange & { partnerId?: number }) =>
    getPartnerProfitReportFromDb(params),

  getPartnerAccessoriesReport: (
    params: PartnerReportDateRange & { partnerId: number },
  ) => getPartnerAccessoriesReportFromDb(params),

  getPartnerPhonesReport: (params: PartnerReportDateRange & { partnerId: number }) =>
    getPartnerPhonesReportFromDb(params),

  getPartnerSettlementReport: (params: PartnerReportDateRange) =>
    getPartnerSettlementReportFromDb(params),

  listPartnerSettlementTransactions: (params: PartnerReportDateRange) =>
    listPartnerSettlementTransactionsFromDb(params),

  createPartnerSettlementTransaction: (payload: Record<string, any>) =>
    createPartnerSettlementTransactionFromDb(payload),

  cancelPartnerSettlementTransaction: (id: number) =>
    cancelPartnerSettlementTransactionFromDb(id),

  getLegacyPartnerCandidates: () =>
    getLegacyPartnerCandidatesForOwnershipBoundary(),

  listStorePartners: () => listStorePartnersForOwnershipBoundary(),

  createStorePartner: (payload: Record<string, any>) =>
    createStorePartnerForOwnershipBoundary(payload as any),

  updateStorePartner: (id: number, payload: Record<string, any>) =>
    updateStorePartnerForOwnershipBoundary(id, payload as any),

  bootstrapStoreOwnershipCore: (legacyPartnerIds: number[]) =>
    bootstrapStoreOwnershipCoreForOwnershipBoundary(legacyPartnerIds),

  saveStoreOwnershipConfiguration: (payload: Record<string, any>) =>
    saveStoreOwnershipConfigurationForOwnershipBoundary(payload as any),

  listProfitShareProfiles: () => listProfitShareProfilesForOwnershipBoundary(),

  createProfitShareProfile: (payload: Record<string, any>) =>
    createProfitShareProfileForOwnershipBoundary(payload as any),

  listOwnershipProfiles: () => listOwnershipProfilesForOwnershipBoundary(),

  createOwnershipProfile: (payload: Record<string, any>) =>
    createOwnershipProfileForOwnershipBoundary(payload as any),

  getStoreOwnershipCoverage: () => getStoreOwnershipCoverageForOwnershipBoundary(),

  previewStoreOwnershipBackfill: () =>
    previewStoreOwnershipBackfillForOwnershipBoundary(),

  applyStoreOwnershipBackfill: () =>
    applyStoreOwnershipBackfillForOwnershipBoundary(),

  listStoreOwnershipReviewQueue: () =>
    listStoreOwnershipReviewQueueForOwnershipBoundary(),

  assignStoreOwnershipReviewItems: (payload: Record<string, any>) =>
    assignStoreOwnershipReviewItemsForOwnershipBoundary(payload as any),
};
