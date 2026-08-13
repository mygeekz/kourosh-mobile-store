import { getDashboardKPIs } from "../db/domains/reports/dashboardReports.db";
import { getSalesSummaryAndProfit } from "../db/domains/reports/salesSummaryProfitReports.db";
import {
  getInstallmentSaleByIdFromDb,
  getOverdueInstallmentsFromDb,
  listInstallmentSalesForCustomerFromDb,
} from "../db/domains/installments.db";
import { getAllPhoneEntriesFromDb } from "../db/domains/phones.db";
import {
  getLegacyInvoiceDataBySaleId,
  getSalesOrderInvoiceWithLegacyFallback,
} from "./salesInvoice.service";

export const miniAppStaffReadModels = {
  getDashboardKPIs,
  getSalesSummaryAndProfit,
  listUnpaidInstallments: getOverdueInstallmentsFromDb,
  getInstallmentSaleById: getInstallmentSaleByIdFromDb,
  listInstallmentsForCustomer: listInstallmentSalesForCustomerFromDb,
  listPhones: (filters: { status?: string; phoneId?: number; q?: string; limit?: number; offset?: number }) =>
    getAllPhoneEntriesFromDb(null, filters.status, filters.phoneId, filters.q, filters.limit, filters.offset),
  getOrderInvoice: getSalesOrderInvoiceWithLegacyFallback,
  getLegacyInvoice: getLegacyInvoiceDataBySaleId,
};
