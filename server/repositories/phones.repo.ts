import {
  addPhoneColorToDb,
  addPhoneEntriesBulkToDb,
  addPhoneEntryToDb,
  addPhoneModelToDb,
  deletePhoneEntryFromDb,
  getAllPhoneColorsFromDb,
  getAllPhoneEntriesFromDb,
  getAllPhoneModelsFromDb,
  getPhoneInventoryChangeReportFromDb,
  getPhoneInventoryDashboardReportFromDb,
  getPhoneInventoryEnterpriseReportFromDb,
  listPhoneInventoryEventsFromDb,
  searchPhoneInventoryEventsFromDb,
  updatePhoneEntryInDb,
} from '../database';
import type {
  PhoneBulkPurchasePayload,
  PhoneEntryPayload,
  PhoneEntryUpdatePayload,
  PhoneHistoryActor,
} from '../database';

export type PhoneListFilters = {
  status?: string;
  phoneId?: number;
  q?: string;
  limit?: number;
  offset?: number;
};

export type PhoneHistoryFilters = {
  days: number;
  startDate?: string;
  endDate?: string;
};

export type PhoneHistoryExplorerFilters = PhoneHistoryFilters & {
  q: string;
  eventClass: string;
  model: string;
  limit: number;
};

export const phonesRepo = {
  createPhone: (payload: PhoneEntryPayload, actor?: PhoneHistoryActor) =>
    addPhoneEntryToDb(payload, actor),

  createPhoneBulkPurchase: (payload: PhoneBulkPurchasePayload, actor?: PhoneHistoryActor) =>
    addPhoneEntriesBulkToDb(payload, actor),

  listPhones: ({ status, phoneId, q, limit, offset }: PhoneListFilters) =>
    getAllPhoneEntriesFromDb(null, status, phoneId, q, limit, offset),

  getHistoryReport: (filters: PhoneHistoryFilters) =>
    getPhoneInventoryChangeReportFromDb(filters),

  getHistoryAnalytics: (filters: PhoneHistoryFilters) =>
    getPhoneInventoryEnterpriseReportFromDb(filters),

  getDashboardReport: (filters: PhoneHistoryFilters) =>
    getPhoneInventoryDashboardReportFromDb(filters),

  searchHistoryEvents: (filters: PhoneHistoryExplorerFilters) =>
    searchPhoneInventoryEventsFromDb(filters),

  listPhoneHistory: (phoneId: number) => listPhoneInventoryEventsFromDb(phoneId),

  updatePhone: (
    phoneId: number,
    payload: PhoneEntryUpdatePayload,
    actor?: PhoneHistoryActor,
  ) => updatePhoneEntryInDb(phoneId, payload, actor),

  deletePhone: (phoneId: number, actor?: PhoneHistoryActor) =>
    deletePhoneEntryFromDb(phoneId, actor),

  listModels: () => getAllPhoneModelsFromDb(),

  createModel: (name: string) => addPhoneModelToDb(name),

  listColors: () => getAllPhoneColorsFromDb(),

  createColor: (name: string) => addPhoneColorToDb(name),
};
