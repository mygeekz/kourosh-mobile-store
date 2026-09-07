import { phonesRepo } from '../repositories/phones.repo';
import type {
  PhoneHistoryExplorerFilters,
  PhoneHistoryFilters,
  PhoneListFilters,
} from '../repositories/phones.repo';
import type {
  PhoneBulkPurchasePayload,
  PhoneEntryPayload,
  PhoneEntryUpdatePayload,
  PhoneHistoryActor,
} from '../database';

export type { PhoneBulkPurchasePayload, PhoneEntryPayload, PhoneEntryUpdatePayload, PhoneHistoryActor };

export const phonesService = {
  createPhone: (payload: PhoneEntryPayload, actor?: PhoneHistoryActor) =>
    phonesRepo.createPhone(payload, actor),

  createPhoneBulkPurchase: (payload: PhoneBulkPurchasePayload, actor?: PhoneHistoryActor) =>
    phonesRepo.createPhoneBulkPurchase(payload, actor),

  listPhones: (filters: PhoneListFilters) => phonesRepo.listPhones(filters),

  getHistoryReport: (filters: PhoneHistoryFilters) =>
    phonesRepo.getHistoryReport(filters),

  getHistoryAnalytics: (filters: PhoneHistoryFilters) =>
    phonesRepo.getHistoryAnalytics(filters),

  getDashboardReport: (filters: PhoneHistoryFilters) =>
    phonesRepo.getDashboardReport(filters),

  searchHistoryEvents: (filters: PhoneHistoryExplorerFilters) =>
    phonesRepo.searchHistoryEvents(filters),

  listPhoneHistory: (phoneId: number) => phonesRepo.listPhoneHistory(phoneId),

  updatePhone: (
    phoneId: number,
    payload: PhoneEntryUpdatePayload,
    actor?: PhoneHistoryActor,
  ) => phonesRepo.updatePhone(phoneId, payload, actor),

  deletePhone: (phoneId: number, actor?: PhoneHistoryActor) =>
    phonesRepo.deletePhone(phoneId, actor),

  listModels: () => phonesRepo.listModels(),

  createModel: (name: string) => phonesRepo.createModel(name),

  listColors: () => phonesRepo.listColors(),

  createColor: (name: string) => phonesRepo.createColor(name),
};
