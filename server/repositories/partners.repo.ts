import { getDbInstance } from "../database";
import {
  addPartnerLedgerEntryToDb as addPartnerLedgerEntryToRepo,
  addPartnerToDb as addPartnerToRepo,
  deletePartnerFromDb as deletePartnerFromRepo,
  deletePartnerLedgerEntryFromDb as deletePartnerLedgerEntryFromRepo,
  getAllPartnersWithBalanceFromDb as getAllPartnersWithBalanceFromRepo,
  listPartnersDirectoryFromDb as listPartnersDirectoryFromRepo,
  type PartnerDirectoryQuery,
  getLedgerForPartnerFromDb as getLedgerForPartnerFromRepo,
  listPartnerLedgerDirectoryFromDb as listPartnerLedgerDirectoryFromRepo,
  getPartnerLedgerProfileSnapshotFromDb as getPartnerLedgerProfileSnapshotFromRepo,
  type PartnerLedgerDirectoryQuery,
  getPartnerByIdFromDb as getPartnerByIdFromRepo,
  getPartnerDeleteDependenciesFromDb as getPartnerDeleteDependenciesFromRepo,
  getPurchasedItemsFromPartnerDb as getPurchasedItemsFromRepo,
  type PartnerPurchasedItemsScope,
  listPartnerPurchaseDirectoryFromDb as listPartnerPurchaseDirectoryFromRepo,
  getPartnerPurchaseSummaryFromDb as getPartnerPurchaseSummaryFromRepo,
  getSoldPhoneSettlementItemsFromPartnerDb as getSoldPhoneSettlementItemsFromRepo,
  getPartnerPhoneSettlementProfileDataFromDb as getPartnerPhoneSettlementProfileDataFromRepo,
  listPartnerPhoneSettlementDirectoryFromDb as listPartnerPhoneSettlementDirectoryFromRepo,
  getPartnerPhoneSettlementTimelineFromDb as getPartnerPhoneSettlementTimelineFromRepo,
  type PartnerPhoneSettlementDirectoryQuery,
  type PartnerPhoneSettlementTimelineQuery,
  type PartnerPurchaseDirectoryQuery,
  listPhoneInventoryEventsForPartnerProfileFromRepo,
  listPhoneInventoryEventsForPartnerProfileBatchFromRepo,
  listProductPricingHistoryForPartnerProfileFromRepo,
  recalcPartnerBalances as recalcPartnerBalancesFromRepo,
  updatePartnerInDb as updatePartnerInRepo,
  updatePartnerLedgerEntryInDb as updatePartnerLedgerEntryFromRepo,
  type PartnerLedgerEntryPayload,
  type PartnerPayload,
} from "./partner";

export type { PartnerPayload };
export type LedgerEntryPayload = PartnerLedgerEntryPayload;

const withPartnerDb = async <T>(operation: () => Promise<T>): Promise<T> => {
  await getDbInstance();
  return await operation();
};

const getPartnerByIdWithDb = (id: number) =>
  withPartnerDb(() => getPartnerByIdFromRepo(id));

const recalcPartnerBalancesWithDb = (partnerId: number) =>
  withPartnerDb(() => recalcPartnerBalancesFromRepo(partnerId));

export const partnersRepo = {
  listPartnersWithBalance: (partnerType?: string) =>
    withPartnerDb(() => getAllPartnersWithBalanceFromRepo(partnerType)),

  listPartnersDirectory: (query: PartnerDirectoryQuery) =>
    withPartnerDb(() => listPartnersDirectoryFromRepo(query)),

  getPartnerById: (id: number) => getPartnerByIdWithDb(id),

  createPartner: (payload: PartnerPayload) =>
    withPartnerDb(() => addPartnerToRepo(payload)),

  updatePartner: (id: number, payload: PartnerPayload) =>
    withPartnerDb(() =>
      updatePartnerInRepo(id, payload, {
        getPartnerById: getPartnerByIdWithDb,
      }),
    ),

  deletePartner: (id: number) =>
    withPartnerDb(() => deletePartnerFromRepo(id)),

  getPartnerDeleteDependencies: (id: number) =>
    withPartnerDb(() => getPartnerDeleteDependenciesFromRepo(id)),

  addPartnerLedgerEntry: (partnerId: number, payload: LedgerEntryPayload) =>
    withPartnerDb(() => addPartnerLedgerEntryToRepo(partnerId, payload)),

  updatePartnerLedgerEntry: (
    partnerId: number,
    entryId: number,
    payload: Partial<LedgerEntryPayload>,
  ) =>
    withPartnerDb(() =>
      updatePartnerLedgerEntryFromRepo(partnerId, entryId, payload, {
        recalcPartnerBalances: recalcPartnerBalancesWithDb,
      }),
    ),

  deletePartnerLedgerEntry: (partnerId: number, entryId: number) =>
    withPartnerDb(() =>
      deletePartnerLedgerEntryFromRepo(partnerId, entryId, {
        recalcPartnerBalances: recalcPartnerBalancesWithDb,
      }),
    ),

  getPartnerLedger: (id: number) =>
    withPartnerDb(() => getLedgerForPartnerFromRepo(id)),

  listPartnerLedgerDirectory: (id: number, query: PartnerLedgerDirectoryQuery) =>
    withPartnerDb(() => listPartnerLedgerDirectoryFromRepo(id, query)),

  getPartnerLedgerProfileSnapshot: (id: number, previewSize = 10) =>
    withPartnerDb(() => getPartnerLedgerProfileSnapshotFromRepo(id, previewSize)),

  getPurchasedItems: (id: number) =>
    withPartnerDb(() => getPurchasedItemsFromRepo(id)),

  getPurchasedItemsScoped: (id: number, scope: PartnerPurchasedItemsScope) =>
    withPartnerDb(() => getPurchasedItemsFromRepo(id, scope)),

  listPartnerPurchaseDirectory: (id: number, query: PartnerPurchaseDirectoryQuery) =>
    withPartnerDb(() => listPartnerPurchaseDirectoryFromRepo(id, query)),

  getPartnerPurchaseSummary: (id: number) =>
    withPartnerDb(() => getPartnerPurchaseSummaryFromRepo(id)),

  getSoldPhoneSettlementItems: (id: number) =>
    withPartnerDb(() => getSoldPhoneSettlementItemsFromRepo(id)),

  getPartnerPhoneSettlementProfileData: (id: number) =>
    withPartnerDb(() => getPartnerPhoneSettlementProfileDataFromRepo(id)),

  listPartnerPhoneSettlementDirectory: (id: number, query: PartnerPhoneSettlementDirectoryQuery) =>
    withPartnerDb(() => listPartnerPhoneSettlementDirectoryFromRepo(id, query)),

  getPartnerPhoneSettlementTimeline: (id: number, phoneId: number, query: PartnerPhoneSettlementTimelineQuery) =>
    withPartnerDb(() => getPartnerPhoneSettlementTimelineFromRepo(id, phoneId, query)),

  listProductPricingHistory: (productIds: number[]) =>
    withPartnerDb(() =>
      listProductPricingHistoryForPartnerProfileFromRepo(productIds),
    ),

  listPhoneInventoryEvents: (phoneId: number) =>
    withPartnerDb(() =>
      listPhoneInventoryEventsForPartnerProfileFromRepo(phoneId),
    ),

  listPhoneInventoryEventsBatch: (phoneIds: number[]) =>
    withPartnerDb(() =>
      listPhoneInventoryEventsForPartnerProfileBatchFromRepo(phoneIds),
    ),
};
