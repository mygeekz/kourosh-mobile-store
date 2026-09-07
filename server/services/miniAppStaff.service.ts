/* eslint-disable @typescript-eslint/no-explicit-any -- Existing read models are untyped; every outbound DTO is explicitly whitelisted here. */
import moment from "jalali-moment";
import { miniAppStaffRepo } from "../repositories/miniAppStaff.repo";
import { miniAppStaffReadModels } from "./miniAppStaffReadModels";
import type { MiniAppStaffCapability } from "../security/miniAppStaffAccessPolicy";

type StaffRepo = typeof miniAppStaffRepo;
type StaffReadModels = typeof miniAppStaffReadModels;

export type MiniAppStaffServiceDependencies = {
  repo: StaffRepo;
  readModels: StaffReadModels;
  now?: () => moment.Moment;
};

const number = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;
const money = (value: unknown): number => Math.max(0, number(value));

export const normalizeMiniAppStaffSearchQuery = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/[۰-۹]/g, (digit) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(digit)] || digit)
    .replace(/[٠-٩]/g, (digit) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(digit)] || digit)
    .replace(/[أإآ]/g, "ا")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200d]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

export const mapMiniAppCustomerAccountState = (balanceValue: unknown) => {
  const balance = number(balanceValue);
  if (balance > 0) return { balance, accountState: "debtor" as const, accountStateLabel: "بدهکار" as const };
  if (balance < 0) return { balance, accountState: "creditor" as const, accountStateLabel: "بستانکار" as const };
  return { balance: 0, accountState: "settled" as const, accountStateLabel: "تسویه" as const };
};

const dueState = (row: any, today: moment.Moment) => {
  const dueDate = String(row?.dueDate || "");
  const parsed = moment(dueDate, "jYYYY/jMM/jDD", true);
  if (!parsed.isValid()) return null;
  const todayStart = today.clone().startOf("day");
  const dueStart = parsed.clone().startOf("day");
  const delta = dueStart.diff(todayStart, "days");
  return {
    delta,
    status: delta < 0 ? "overdue" as const : delta === 0 ? "today" as const : "upcoming" as const,
    overdueDays: delta < 0 ? Math.abs(delta) : 0,
  };
};

const mapDue = (row: any, today: moment.Moment) => {
  const state = dueState(row, today);
  const remainingAmount = money(row?.effectiveRemaining ?? row?.amountDue ?? row?.physicalRemaining);
  if (!state || remainingAmount <= 0.00001) return null;
  return {
    paymentId: number(row?.paymentId ?? row?.id),
    saleId: number(row?.saleId),
    customerId: number(row?.customerId),
    customerName: String(row?.customerFullName || row?.customerName || "مشتری کوروش"),
    customerPhone: String(row?.customerPhoneNumber || row?.customerPhone || ""),
    dueDate: String(row?.dueDate || ""),
    remainingAmount,
    status: state.status,
    overdueDays: state.overdueDays,
    delta: state.delta,
  };
};

const safeInvoice = (invoiceRef: string, invoice: any) => ({
  ref: invoiceRef,
  customer: invoice?.customerDetails ? {
    id: number(invoice.customerDetails.id),
    fullName: String(invoice.customerDetails.fullName || "مهمان"),
    phoneNumber: String(invoice.customerDetails.phoneNumber || ""),
  } : null,
  date: String(invoice?.invoiceMetadata?.transactionDate || ""),
  paymentMethod: String(invoice?.invoiceMetadata?.paymentMethod || ""),
  paymentMethodLabel: String(invoice?.invoiceMetadata?.paymentMethodLabel || "فروش"),
  subtotal: money(invoice?.financialSummary?.subtotal),
  discount: money(
    number(invoice?.financialSummary?.itemsDiscount ?? invoice?.financialSummary?.discountAmount) +
    number(invoice?.financialSummary?.globalDiscount),
  ),
  total: money(invoice?.financialSummary?.grandTotal),
  items: (invoice?.lineItems || []).map((item: any) => ({
    id: number(item?.id),
    description: String(item?.description || "کالا/خدمت"),
    quantity: money(item?.quantity),
    unitPrice: money(item?.unitPrice),
    discount: money(item?.discountPerItem),
    total: money(item?.totalPrice),
  })),
  status: String(invoice?.invoiceMetadata?.status || "active"),
});

export const createMiniAppStaffService = (
  dependencies: MiniAppStaffServiceDependencies = {
    repo: miniAppStaffRepo,
    readModels: miniAppStaffReadModels,
  },
) => {
  const current = () => (dependencies.now ? dependencies.now() : moment());
  const todayJalali = () => current().locale("en").format("jYYYY/jMM/jDD");

  return {
    getHome: async () => {
      const today = current();
      const day = today.clone().locale("en").format("jYYYY/jMM/jDD");
      const [sales, dashboard, receivables, unpaid] = await Promise.all([
        dependencies.readModels.getSalesSummaryAndProfit(day, day),
        dependencies.readModels.getDashboardKPIs(),
        dependencies.repo.getReceivablesSummary(),
        dependencies.readModels.listUnpaidInstallments(),
      ]);
      const dues = (unpaid || []).map((row: any) => mapDue(row, today)).filter(Boolean) as Array<NonNullable<ReturnType<typeof mapDue>>>;
      const todayDues = dues.filter((item) => item.status === "today");
      const overdue = dues.filter((item) => item.status === "overdue");
      return {
        today: {
          sales: money(sales.totalRevenue),
          grossProfit: number(sales.grossProfit),
          transactions: Math.max(0, number(sales.totalTransactions)),
          averageSaleValue: money(sales.averageSaleValue),
        },
        financialPosition: {
          totalReceivables: money(receivables?.totalReceivables),
          debtorsCount: Math.max(0, number(receivables?.debtorsCount)),
        },
        installments: {
          dueTodayCount: todayDues.length,
          dueTodayAmount: todayDues.reduce((sum, item) => sum + item.remainingAmount, 0),
          overdueCount: overdue.length,
          overdueAmount: overdue.reduce((sum, item) => sum + item.remainingAmount, 0),
        },
        inventory: { activeItemsCount: Math.max(0, number(dashboard.activeProductsCount)) },
        month: {
          totalSales: money(dashboard.totalSalesMonth),
          phoneCashSales: money(dashboard.phoneSalesRevenueMonth),
          installmentSales: money(dashboard.installmentSalesRevenueMonth),
        },
      };
    },

    getSalesSummary: async (period: unknown) => {
      const normalized = ["today", "week", "month"].includes(String(period)) ? String(period) : "today";
      const toMoment = current();
      const fromMoment = normalized === "month"
        ? toMoment.clone().startOf("jMonth")
        : normalized === "week"
          ? toMoment.clone().subtract(6, "days")
          : toMoment.clone();
      const from = fromMoment.locale("en").format("jYYYY/jMM/jDD");
      const to = toMoment.locale("en").format("jYYYY/jMM/jDD");
      const data = await dependencies.readModels.getSalesSummaryAndProfit(from, to);
      return {
        period: normalized,
        from,
        to,
        totalRevenue: money(data.totalRevenue),
        grossProfit: number(data.grossProfit),
        totalTransactions: Math.max(0, number(data.totalTransactions)),
        averageSaleValue: money(data.averageSaleValue),
        topSellingItems: (data.topSellingItems || []).slice(0, 5).map((item: any) => ({
          id: number(item?.id),
          itemType: String(item?.itemType || ""),
          itemName: String(item?.itemName || "کالا/خدمت"),
          totalRevenue: money(item?.totalRevenue),
          quantitySold: money(item?.quantitySold),
        })),
      };
    },

    listDueInstallments: async (query: { scope?: unknown; page?: unknown; pageSize?: unknown }) => {
      const scope = ["overdue", "today", "next7"].includes(String(query.scope)) ? String(query.scope) : "overdue";
      const page = Math.max(1, Math.floor(number(query.page) || 1));
      const pageSize = Math.min(50, Math.max(1, Math.floor(number(query.pageSize) || 20)));
      const now = current();
      const all = (await dependencies.readModels.listUnpaidInstallments())
        .map((row: any) => mapDue(row, now))
        .filter(Boolean) as Array<NonNullable<ReturnType<typeof mapDue>>>;
      const scoped = all
        .filter((item) => scope === "overdue" ? item.delta < 0 : scope === "today" ? item.delta === 0 : item.delta > 0 && item.delta <= 7)
        .sort((left, right) => left.delta - right.delta || left.paymentId - right.paymentId);
      const offset = (page - 1) * pageSize;
      return {
        scope,
        page,
        pageSize,
        total: scoped.length,
        totalPages: Math.max(1, Math.ceil(scoped.length / pageSize)),
        items: scoped.slice(offset, offset + pageSize).map(({ delta: _delta, ...item }) => item),
      };
    },

    getInstallmentDetail: async (saleId: number) => {
      const sale: any = await dependencies.readModels.getInstallmentSaleById(saleId);
      if (!sale) return null;
      const payments = (sale.payments || []).filter((payment: any) => String(payment?.sourceType || "installment") !== "check_recovery");
      return {
        saleId: number(sale.id),
        customer: {
          id: number(sale.customerId),
          fullName: String(sale.customerFullName || "مشتری کوروش"),
        },
        saleDate: String(sale.saleDate || sale.saleDateISO || sale.dateCreated || ""),
        itemSummary: String(sale.itemsSummary || sale.phoneModel || "قرارداد اقساطی"),
        items: (sale.items || []).map((item: any) => ({
          description: String(item?.description || "کالا/خدمت"),
          quantity: money(item?.quantity),
          unitPrice: money(item?.unitPrice),
          total: money(item?.totalPrice),
        })),
        actualSalePrice: money(sale.actualSalePrice),
        downPayment: money(sale.downPayment),
        totalInstallmentCount: Math.max(0, number(sale.numberOfInstallments || payments.length)),
        paidAmount: money(sale.collectedAmount),
        remainingAmount: money(sale.remainingAmount),
        paymentTimeline: payments.map((payment: any) => ({
          paymentId: number(payment?.id),
          installmentNumber: number(payment?.installmentNumber),
          dueDate: String(payment?.dueDate || ""),
          amount: money(payment?.amountDue),
          paidAmount: money(payment?.computedPaid),
          remainingAmount: money(payment?.computedRemaining),
          paymentDate: payment?.paymentDate ? String(payment.paymentDate) : null,
          status: money(payment?.computedRemaining) <= 0.00001 ? "paid" : dueState(payment, current())?.status || "upcoming",
        })),
        checks: (sale.checks || []).map((check: any) => ({
          checkId: number(check?.id),
          bankName: String(check?.bankName || ""),
          dueDate: String(check?.dueDate || ""),
          amount: money(check?.amount),
          status: String(check?.status || "نزد فروشنده"),
        })),
        status: String(sale.overallStatus || "در حال پرداخت"),
      };
    },

    search: async (
      queryValue: unknown,
      limitValue: unknown,
      allowedCapabilities: readonly MiniAppStaffCapability[],
    ) => {
      const query = normalizeMiniAppStaffSearchQuery(queryValue);
      const limit = Math.min(20, Math.max(1, Math.floor(number(limitValue) || 12)));
      if (!query) return { query, groups: { customers: [], phones: [], invoices: [], installments: [] } };
      const perGroup = Math.min(limit, 8);
      const capabilities = new Set(allowedCapabilities);
      const [customers, phones, invoices, installments] = await Promise.all([
        capabilities.has("staff:customer_lookup:read") ? dependencies.repo.searchCustomers(query, perGroup) : Promise.resolve([]),
        capabilities.has("staff:inventory_lookup:read") ? dependencies.repo.searchPhones(query, perGroup) : Promise.resolve([]),
        capabilities.has("staff:invoice_lookup:read") ? dependencies.repo.searchInvoices(query, perGroup) : Promise.resolve([]),
        capabilities.has("staff:installments:read") ? dependencies.repo.searchInstallments(query, perGroup) : Promise.resolve([]),
      ]);
      let remaining = limit;
      const take = <T,>(rows: T[]) => {
        const result = rows.slice(0, remaining);
        remaining -= result.length;
        return result;
      };
      return {
        query,
        groups: {
          customers: take(customers.map((row: any) => ({
            customerId: number(row.customerId),
            fullName: String(row.fullName || "مشتری کوروش"),
            phoneNumber: String(row.phoneNumber || ""),
            ...mapMiniAppCustomerAccountState(row.currentBalance),
          }))),
          phones: take(phones.map((row: any) => ({
            id: number(row.id), model: String(row.model || "گوشی"), imei: String(row.imei || ""),
            color: String(row.color || ""), storage: String(row.storage || ""), ram: String(row.ram || ""),
            status: String(row.status || ""), salePrice: money(row.salePrice),
          }))),
          invoices: take(invoices.map((row: any) => ({
            invoiceRef: `${row.source}-${row.invoiceId}`, source: row.source === "legacy" ? "legacy" : "order",
            customer: String(row.customerName || "مهمان"), date: String(row.invoiceDate || ""), total: money(row.total),
            paymentMethod: String(row.paymentMethod || ""), itemSummary: String(row.itemSummary || "فاکتور فروش"),
          }))),
          installments: take(installments.map((row: any) => ({
            saleId: number(row.saleId), customerId: number(row.customerId), customerName: String(row.customerName || "مشتری کوروش"),
            customerPhone: String(row.customerPhone || ""), itemSummary: String(row.itemSummary || "قرارداد اقساطی"),
            saleDate: String(row.saleDate || ""), actualSalePrice: money(row.actualSalePrice), status: String(row.status || "active"),
          }))),
        },
      };
    },

    getCustomerDetail: async (customerId: number) => {
      const [customer, ledger, purchases, installments] = await Promise.all([
        dependencies.repo.getCustomerBasic(customerId),
        dependencies.repo.listCustomerRecentLedger(customerId, 10),
        dependencies.repo.listCustomerRecentPurchases(customerId, 5),
        dependencies.readModels.listInstallmentsForCustomer(customerId),
      ]);
      if (!customer) return null;
      const active = (installments || []).filter((sale: any) => !["تکمیل شده", "فسخ شده"].includes(String(sale?.overallStatus || "")));
      const nextDue = active.filter((sale: any) => sale?.nextDueDate).sort((left: any, right: any) => String(left.nextDueDate).localeCompare(String(right.nextDueDate)) || number(left.id) - number(right.id))[0] || null;
      return {
        customer: {
          customerId: number(customer.customerId), fullName: String(customer.fullName || "مشتری کوروش"),
          phoneNumber: String(customer.phoneNumber || ""), ...mapMiniAppCustomerAccountState(customer.currentBalance),
        },
        installments: {
          activeCount: active.length,
          overdueCount: active.filter((sale: any) => number(sale?.overdueInstallmentsCount) > 0 || String(sale?.overallStatus || "") === "معوق").length,
          nextDue: nextDue ? { saleId: number(nextDue.id), dueDate: String(nextDue.nextDueDate), amount: money(nextDue.nextDueAmount) } : null,
        },
        recentPurchases: purchases.map((row: any) => ({
          date: String(row.purchaseDate || ""), type: String(row.purchaseType || "cash"),
          itemSummary: String(row.itemSummary || "خرید از کوروش"), total: money(row.total),
          invoiceRef: row.source === "order" || row.source === "legacy" ? `${row.source}-${row.purchaseId}` : `installment-${row.purchaseId}`,
        })),
        recentLedger: ledger.map((row: any) => ({
          date: String(row.transactionDate || ""), description: String(row.description || "گردش حساب"),
          debit: money(row.debit), credit: money(row.credit), runningBalance: number(row.balance),
        })),
      };
    },

    listPhones: async (query: { q?: unknown; page?: unknown; offset?: unknown; limit?: unknown }) => {
      const q = normalizeMiniAppStaffSearchQuery(query.q);
      const page = Math.max(1, Math.floor(number(query.page) || 1));
      const limit = Math.min(50, Math.max(1, Math.floor(number(query.limit) || 20)));
      const requestedOffset = Math.max(0, Math.floor(number(query.offset)));
      const offset = query.offset === undefined ? (page - 1) * limit : requestedOffset;
      const rows = await dependencies.readModels.listPhones({ q, limit, offset });
      return {
        query: q, page, offset, limit,
        items: (rows || []).map((row: any) => ({
          id: number(row.id), model: String(row.model || "گوشی"), imei: String(row.imei || ""),
          color: String(row.color || ""), storage: String(row.storage || ""), ram: String(row.ram || ""),
          status: String(row.status || ""), salePrice: money(row.salePrice),
        })),
      };
    },

    getPhoneDetail: async (phoneId: number) => {
      const [rows, relation] = await Promise.all([
        dependencies.readModels.listPhones({ phoneId, limit: 1, offset: 0 }),
        dependencies.repo.getPhoneSaleRelation(phoneId),
      ]);
      const row: any = rows?.[0];
      if (!row) return null;
      return {
        id: number(row.id), model: String(row.model || "گوشی"), imei: String(row.imei || ""),
        color: String(row.color || ""), storage: String(row.storage || ""), ram: String(row.ram || ""),
        condition: String(row.condition || ""), status: String(row.status || ""),
        purchasePrice: money(row.purchasePrice), currentPurchasePrice: money(row.currentPurchasePrice), salePrice: money(row.salePrice),
        supplierName: String(row.supplierName || ""), purchaseDate: String(row.purchaseDate || ""),
        sale: relation ? {
          source: String(relation.source), ref: `${relation.source}-${relation.saleRef}`, date: String(relation.saleDate || ""),
          customer: relation.customerId ? { id: number(relation.customerId), fullName: String(relation.customerName || "مشتری کوروش"), phoneNumber: String(relation.customerPhone || "") } : null,
        } : null,
      };
    },

    getInvoiceDetail: async (invoiceRef: string) => {
      const match = String(invoiceRef || "").match(/^(order|legacy)-(\d+)$/);
      if (!match || number(match[2]) <= 0) return null;
      const invoice = match[1] === "order"
        ? await dependencies.readModels.getOrderInvoice(number(match[2]))
        : await dependencies.readModels.getLegacyInvoice(number(match[2]));
      return invoice ? safeInvoice(`${match[1]}-${number(match[2])}`, invoice) : null;
    },

    todayJalali,
  };
};

export const miniAppStaffService = createMiniAppStaffService();
