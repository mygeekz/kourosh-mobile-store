import moment from "jalali-moment";
import {
  partnerOwnershipRepo,
  type PartnerReportDateRange,
} from "../repositories/partnerOwnership.repo";

const toIsoDayRange = (fromDate?: string, toDate?: string): PartnerReportDateRange => ({
  fromDateIso: fromDate
    ? moment.from(fromDate, "fa", "YYYY/MM/DD").startOf("day").toISOString()
    : undefined,
  toDateIso: toDate
    ? moment.from(toDate, "fa", "YYYY/MM/DD").endOf("day").toISOString()
    : undefined,
});

const toSettlementDateIso = (settlementDate: unknown) => {
  const normalized = typeof settlementDate === "string" ? settlementDate : "";
  return normalized
    ? moment.from(normalized, "fa", "YYYY/MM/DD").startOf("day").toISOString()
    : normalized;
};

export const partnerOwnershipService = {
  getPartnerProfitReport: (params: {
    fromDate?: string;
    toDate?: string;
    partnerId?: number;
  }) =>
    partnerOwnershipRepo.getPartnerProfitReport({
      ...toIsoDayRange(params.fromDate, params.toDate),
      partnerId: params.partnerId,
    }),

  getPartnerAccessoriesReport: (params: {
    partnerId: number;
    fromDate?: string;
    toDate?: string;
  }) =>
    partnerOwnershipRepo.getPartnerAccessoriesReport({
      ...toIsoDayRange(params.fromDate, params.toDate),
      partnerId: params.partnerId,
    }),

  getPartnerPhonesReport: (params: {
    partnerId: number;
    fromDate?: string;
    toDate?: string;
  }) =>
    partnerOwnershipRepo.getPartnerPhonesReport({
      ...toIsoDayRange(params.fromDate, params.toDate),
      partnerId: params.partnerId,
    }),

  getPartnerSettlementReport: (params: { fromDate?: string; toDate?: string }) =>
    partnerOwnershipRepo.getPartnerSettlementReport(
      toIsoDayRange(params.fromDate, params.toDate),
    ),

  listPartnerSettlementTransactions: (params: {
    fromDate?: string;
    toDate?: string;
  }) =>
    partnerOwnershipRepo.listPartnerSettlementTransactions(
      toIsoDayRange(params.fromDate, params.toDate),
    ),


  createPartnerSettlementTransaction: (params: {
    body: Record<string, any>;
    createdByUserId: number | null;
  }) =>
    partnerOwnershipRepo.createPartnerSettlementTransaction({
      ...(params.body || {}),
      settlementDate: toSettlementDateIso(params.body?.settlementDate),
      createdByUserId: params.createdByUserId,
    }),

  cancelPartnerSettlementTransaction: (id: number) =>
    partnerOwnershipRepo.cancelPartnerSettlementTransaction(id),

  getLegacyPartnerCandidates: () => partnerOwnershipRepo.getLegacyPartnerCandidates(),

  listStorePartners: () => partnerOwnershipRepo.listStorePartners(),

  createStorePartner: (payload: Record<string, any>) =>
    partnerOwnershipRepo.createStorePartner(payload || {}),

  updateStorePartner: (id: number, payload: Record<string, any>) =>
    partnerOwnershipRepo.updateStorePartner(id, payload || {}),

  bootstrapStoreOwnershipCore: (body: Record<string, any>) => {
    const legacyPartnerIds = Array.isArray(body?.legacyPartnerIds)
      ? Array.from(new Set(body.legacyPartnerIds
          .map((value: any) => Number(value))
          .filter((value: number) => Number.isInteger(value) && value > 0)))
      : [];
    if (!legacyPartnerIds.length) throw new Error("حداقل یک همکار قدیمی را انتخاب کنید.");
    if (legacyPartnerIds.length > 100) throw new Error("در هر مرحله حداکثر ۱۰۰ همکار قابل راه‌اندازی است.");
    return partnerOwnershipRepo.bootstrapStoreOwnershipCore(legacyPartnerIds);
  },

  saveStoreOwnershipConfiguration: (payload: Record<string, any>) =>
    partnerOwnershipRepo.saveStoreOwnershipConfiguration(payload || {}),

  listProfitShareProfiles: () => partnerOwnershipRepo.listProfitShareProfiles(),

  createProfitShareProfile: (payload: Record<string, any>) =>
    partnerOwnershipRepo.createProfitShareProfile(payload || {}),

  listOwnershipProfiles: () => partnerOwnershipRepo.listOwnershipProfiles(),

  createOwnershipProfile: (payload: Record<string, any>) =>
    partnerOwnershipRepo.createOwnershipProfile(payload || {}),

  getStoreOwnershipCoverage: () => partnerOwnershipRepo.getStoreOwnershipCoverage(),

  previewStoreOwnershipBackfill: () =>
    partnerOwnershipRepo.previewStoreOwnershipBackfill(),

  applyStoreOwnershipBackfill: () =>
    partnerOwnershipRepo.applyStoreOwnershipBackfill(),

  listStoreOwnershipReviewQueue: () =>
    partnerOwnershipRepo.listStoreOwnershipReviewQueue(),

  assignStoreOwnershipReviewItems: (payload: Record<string, any>) =>
    partnerOwnershipRepo.assignStoreOwnershipReviewItems(payload || {}),
};
