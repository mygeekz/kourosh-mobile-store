import { getDbInstance } from "../database";
import {
  addCustomerFollowupToDb as addCustomerFollowupToRepo,
  addCustomerLedgerEntryToDb as addCustomerLedgerEntryToRepo,
  addCustomerToDb as addCustomerToRepo,
  closeCustomerFollowupInDb as closeCustomerFollowupInRepo,
  deleteCustomerFromDb as deleteCustomerFromRepo,
  deleteCustomerLedgerEntryFromDb as deleteCustomerLedgerEntryFromRepo,
  getAllCustomersWithBalanceFromDb as getAllCustomersWithBalanceFromRepo,
  searchCustomersWithBalanceFromDb as searchCustomersWithBalanceFromRepo,
  listCustomersDirectoryFromDb as listCustomersDirectoryFromRepo,
  type CustomerSearchFilters,
  type CustomerDirectoryQuery,
  getCustomerByIdFromDb as getCustomerByIdFromRepo,
  getCustomerDeleteDependenciesFromDb as getCustomerDeleteDependenciesFromRepo,
  getCustomerLedgerInsightsFromDb as getCustomerLedgerInsightsFromRepo,
  getLedgerForCustomerFromDb as getLedgerForCustomerFromRepo,
  listCustomerLedgerDirectoryFromDb as listCustomerLedgerDirectoryFromRepo,
  type CustomerLedgerDirectoryQuery,
  listCustomerFollowupsFromDb as listCustomerFollowupsFromRepo,
  updateCustomerFollowupInDb as updateCustomerFollowupInRepo,
  updateCustomerLedgerEntryInDb as updateCustomerLedgerEntryFromRepo,
  recalcCustomerBalances as recalcCustomerBalancesFromRepo,
  updateCustomerInDb as updateCustomerInRepo,
  updateCustomerTagsInDb as updateCustomerTagsInRepo,
  createCustomerManagerNoteInRepo,
  deleteCustomerManagerNoteInRepo,
  listCustomerManagerNotesFromRepo,
  listInstallmentHistoryFromRepo,
  listLegacyPurchaseHistoryFromRepo,
  listSalesOrderHistoryFromRepo,
} from "./customer";
import {
  addCustomerAuditLogToRepo,
  addCustomerLedgerAuditLogToRepo,
  type CustomerAuditLogInput,
} from "./customerAuditLogs.repo";

const withCustomerDb = async <T>(operation: () => Promise<T>): Promise<T> => {
  await getDbInstance();
  return await operation();
};

const getCustomerByIdWithDb = (id: number) =>
  withCustomerDb(() => getCustomerByIdFromRepo(id));

const recalcCustomerBalancesWithDb = (customerId: number) =>
  withCustomerDb(() => recalcCustomerBalancesFromRepo(customerId));

export const customersRepo = {
  createCustomer: (payload: any) =>
    withCustomerDb(() => addCustomerToRepo(payload)),

  updateCustomer: (id: number, payload: any) =>
    withCustomerDb(() =>
      updateCustomerInRepo(id, payload, {
        getCustomerById: getCustomerByIdWithDb,
      }),
    ),

  updateCustomerTags: (id: number, tags: string[]) =>
    withCustomerDb(() =>
      updateCustomerTagsInRepo(id, tags, {
        getCustomerById: getCustomerByIdWithDb,
      }),
    ),

  deleteCustomer: (id: number) =>
    withCustomerDb(() => deleteCustomerFromRepo(id)),

  listCustomersWithBalance: () =>
    withCustomerDb(() => getAllCustomersWithBalanceFromRepo()),

  searchCustomersWithBalance: (filters: CustomerSearchFilters) =>
    withCustomerDb(() => searchCustomersWithBalanceFromRepo(filters)),

  listCustomersDirectory: (query: CustomerDirectoryQuery) =>
    withCustomerDb(() => listCustomersDirectoryFromRepo(query)),

  getCustomerById: (id: number) => getCustomerByIdWithDb(id),

  getCustomerDeleteDependencies: (id: number) =>
    withCustomerDb(() => getCustomerDeleteDependenciesFromRepo(id)),

  getCustomerLedger: (id: number) =>
    withCustomerDb(() => getLedgerForCustomerFromRepo(id)),

  listCustomerLedgerDirectory: (id: number, query: CustomerLedgerDirectoryQuery) =>
    withCustomerDb(() => listCustomerLedgerDirectoryFromRepo(id, query)),

  listCustomerFollowups: (id: number) =>
    withCustomerDb(() => listCustomerFollowupsFromRepo(id)),

  getCustomerLedgerInsights: (id: number) =>
    withCustomerDb(() => getCustomerLedgerInsightsFromRepo(id)),

  listCustomerManagerNotes: (id: number) =>
    listCustomerManagerNotesFromRepo(id),

  createCustomerFollowup: (customerId: number, payload: any) =>
    withCustomerDb(() => addCustomerFollowupToRepo(customerId, payload)),

  closeCustomerFollowup: (customerId: number, followupId: number) =>
    withCustomerDb(() => closeCustomerFollowupInRepo(customerId, followupId)),

  updateCustomerFollowup: (
    customerId: number,
    followupId: number,
    payload: any,
  ) =>
    withCustomerDb(() =>
      updateCustomerFollowupInRepo(customerId, followupId, payload || {}),
    ),

  createCustomerManagerNote: (input: {
    customerId: number;
    context: string;
    note: string;
    userId?: number | null;
    username?: string | null;
    roleName?: string | null;
  }) => createCustomerManagerNoteInRepo(input),

  deleteCustomerManagerNote: (customerId: number, noteId: number) =>
    deleteCustomerManagerNoteInRepo(customerId, noteId),

  addCustomerLedgerEntry: (customerId: number, payload: any) =>
    withCustomerDb(() => addCustomerLedgerEntryToRepo(customerId, payload)),

  updateCustomerLedgerEntry: (customerId: number, entryId: number, payload: any) =>
    withCustomerDb(() =>
      updateCustomerLedgerEntryFromRepo(customerId, entryId, payload, {
        recalcCustomerBalances: recalcCustomerBalancesWithDb,
      }),
    ),

  deleteCustomerLedgerEntry: (customerId: number, entryId: number) =>
    withCustomerDb(() =>
      deleteCustomerLedgerEntryFromRepo(customerId, entryId, {
        recalcCustomerBalances: recalcCustomerBalancesWithDb,
      }),
    ),

  addCustomerLedgerAuditLog: (input: CustomerAuditLogInput) =>
    addCustomerLedgerAuditLogToRepo(input),

  addCustomerAuditLog: (input: CustomerAuditLogInput) =>
    addCustomerAuditLogToRepo(input),

  listLegacyPurchaseHistory: (id: number) => listLegacyPurchaseHistoryFromRepo(id),

  listSalesOrderHistory: (id: number) => listSalesOrderHistoryFromRepo(id),

  listInstallmentHistory: (id: number) => listInstallmentHistoryFromRepo(id),
};
