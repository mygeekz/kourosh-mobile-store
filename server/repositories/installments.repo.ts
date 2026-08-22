import {
  addCheckRecoveryPaymentToDb,
  addInstallmentTransactionToDb,
  deleteInstallmentTransactionFromDb,
  addInstallmentSaleToDb,
  deleteInstallmentSaleFromDb,
  getAllInstallmentSalesFromDb,
  listInstallmentSalesDirectoryFromDb,
  listInstallmentSalesForCustomerFromDb,
  listInstallmentCustomerDueOverviewFromDb,
  getInstallmentSaleByIdFromDb,
  prepareInstallmentSaleContractForPrintInDb,
  getInstallmentSaleProfitSnapshotFromDb,
  updateCheckStatusInDb,
  updateCheckContractIdentityInDb,
  updateInstallmentPaymentStatusInDb,
  updateInstallmentTransactionInDb,
  getAsync,
  getInstallmentCancellationPreviewFromDb,
  cancelInstallmentSaleFromDb,
  getInstallmentCancellationRefundStateFromDb,
  addInstallmentCancellationRefundFromDb,
} from '../database';
import type { InstallmentSalePayload } from '../db/domains/installmentTypes';
import { getInstallmentSaleReceivableState } from '../db/domains/installmentAccounting.db';

export const installmentsRepo = {
  listInstallmentSales: () => getAllInstallmentSalesFromDb(),
  listInstallmentSalesDirectory: (query: Parameters<typeof listInstallmentSalesDirectoryFromDb>[0]) =>
    listInstallmentSalesDirectoryFromDb(query),
  listInstallmentSalesForCustomer: (customerId: number) =>
    listInstallmentSalesForCustomerFromDb(customerId),
  listInstallmentCustomerDueOverview: (customerIds?: number[]) =>
    listInstallmentCustomerDueOverviewFromDb(customerIds),
  getInstallmentSaleById: (id: number) => getInstallmentSaleByIdFromDb(id),
  prepareInstallmentSaleContractForPrint: (id: number) => prepareInstallmentSaleContractForPrintInDb(id),
  getInstallmentSaleProfitSnapshot: (id: number) =>
    getInstallmentSaleProfitSnapshotFromDb(id),
  createInstallmentSale: (payload: InstallmentSalePayload) =>
    addInstallmentSaleToDb(payload),
  deleteInstallmentSale: (id: number) => deleteInstallmentSaleFromDb(id),
  getCancellationPreview: (id: number, mode: any) => getInstallmentCancellationPreviewFromDb(id, mode),
  cancelInstallmentSale: (id: number, payload: any) => cancelInstallmentSaleFromDb(id, payload),
  getCancellationRefundState: (id: number) => getInstallmentCancellationRefundStateFromDb(id),
  addCancellationRefund: (id: number, payload: any) => addInstallmentCancellationRefundFromDb(id, payload),
  updateInstallmentPaymentStatus: (id: number, paid: boolean, paymentDate?: any) =>
    updateInstallmentPaymentStatusInDb(id, paid, paymentDate),
  updateInstallmentCheckStatus: (id: number, status: any) =>
    updateCheckStatusInDb(id, status),
  updateInstallmentCheckContractIdentity: (
    id: number,
    input: {
      checkNumber: string;
      bankName: string;
      ownershipType: 'buyer' | 'third_party';
      issuerName: string;
      issuerNationalCode: string;
      sayadiId: string;
      dueDate: string;
    },
  ) => updateCheckContractIdentityInDb(id, input),
  addCheckRecoveryPayment: (checkId: number, amount: number, date: string, notes?: any) =>
    addCheckRecoveryPaymentToDb(checkId, amount, date, notes),
  getInstallmentPaymentSaleId: async (paymentId: number): Promise<number | null> => {
    const row = await getAsync('SELECT saleId FROM installment_payments WHERE id = ?', [paymentId]);
    return row?.saleId ? Number(row.saleId) : null;
  },
  countUnpaidInstallmentPayments: async (saleId: number): Promise<number> => {
    const state = await getInstallmentSaleReceivableState(saleId);
    return state.remaining > 0.00001 ? 1 : 0;
  },
  addInstallmentTransaction: (paymentId: number, amount: number, date: string, notes?: any) =>
    addInstallmentTransactionToDb(paymentId, amount, date, notes),
  updateInstallmentTransaction: (txId: number, amount: number, date: string, notes?: any) =>
    updateInstallmentTransactionInDb(txId, amount, date, notes),
  deleteInstallmentTransaction: (txId: number) => deleteInstallmentTransactionFromDb(txId),
};
