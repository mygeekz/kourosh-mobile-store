/* eslint-disable @typescript-eslint/no-explicit-any -- This boundary strictly maps legacy untyped repository rows into limited customer-safe response models. */
import moment from "jalali-moment";
import {
  ownsMiniAppCustomerInvoice,
  ownsMiniAppCustomerResource,
} from "../miniapp/miniAppOwnership";

type CustomerReadDependencies = {
  getCustomerById: (customerId: number) => Promise<any>;
  getCustomerProfileBundle: (customerId: number, options: { includeLedger?: boolean }) => Promise<any>;
  listCustomerLedgerDirectory: (customerId: number, query: any) => Promise<any>;
  listInstallmentSalesForCustomer: (customerId: number) => Promise<any[]>;
  getInstallmentSaleById: (saleId: number) => Promise<any | null>;
  fetchSalesOrderInvoice: (orderId: number) => Promise<any | null>;
  fetchLegacyInvoice: (saleId: number) => Promise<any | null>;
};

const loadRuntimeModule = (specifier: string): Promise<any> => import(specifier);

const defaultDependencies: CustomerReadDependencies = {
  getCustomerById: async (customerId) =>
    (await loadRuntimeModule("../repositories/customers.repo")).customersRepo.getCustomerById(customerId),
  getCustomerProfileBundle: async (customerId, options) =>
    (await loadRuntimeModule("./customers.service")).customersService.getCustomerProfileBundle(customerId, options),
  listCustomerLedgerDirectory: async (customerId, query) =>
    (await loadRuntimeModule("./customers.service")).customersService.listCustomerLedgerDirectory(customerId, query),
  listInstallmentSalesForCustomer: async (customerId) =>
    (await loadRuntimeModule("./installments.service")).installmentsService.listInstallmentSalesForCustomer(customerId),
  getInstallmentSaleById: async (saleId) =>
    (await loadRuntimeModule("./installments.service")).installmentsService.getInstallmentSaleById(saleId),
  fetchSalesOrderInvoice: async (orderId) =>
    (await loadRuntimeModule("../repositories/salesRead.repo")).fetchSalesOrderInvoice(orderId),
  fetchLegacyInvoice: async (saleId) =>
    (await loadRuntimeModule("../repositories/salesRead.repo")).fetchLegacyInvoice(saleId),
};

const accountState = (signedBalance: number) => {
  if (signedBalance > 0) return { code: "debtor" as const, label: "بدهکار", amount: signedBalance };
  if (signedBalance < 0) return { code: "creditor" as const, label: "بستانکار", amount: Math.abs(signedBalance) };
  return { code: "settled" as const, label: "تسویه", amount: 0 };
};

const normalizedSource = (row: any): "sales_order" | "installment_sale" | "legacy_sale" => {
  if (row?.sourceType === "sales_order") return "sales_order";
  if (row?.sourceType === "installment_sale") return "installment_sale";
  return "legacy_sale";
};

const purchaseType = (row: any) => {
  const raw = String(row?.purchaseType || row?.paymentMethod || "").toLowerCase();
  if (raw === "installment") return { code: "installment", label: "اقساطی" };
  if (raw === "credit") return { code: "credit", label: "اعتباری" };
  return { code: "cash", label: "نقدی" };
};

const mapPurchase = (row: any) => {
  const source = normalizedSource(row);
  const id = Math.max(0, Number(row?.id || 0));
  const kind = purchaseType(row);
  return {
    ref: `${source}-${id}`,
    source,
    id,
    transactionDate: String(row?.transactionDate || row?.saleDate || row?.dateCreated || ""),
    itemsSummary: String(row?.itemName || row?.itemsSummary || "خرید از کوروش"),
    quantity: Math.max(1, Number(row?.quantity || 1)),
    totalAmount: Math.max(0, Number(row?.totalPrice || row?.actualSalePrice || 0)),
    purchaseType: kind.code,
    purchaseTypeLabel: kind.label,
    invoiceRef: source === "sales_order"
      ? `order-${id}`
      : source === "legacy_sale"
        ? `legacy-${id}`
        : null,
  };
};

const mapInstallmentSummary = (sale: any, detail?: any) => {
  const payments = (detail?.payments || []).filter(
    (payment: any) => String(payment?.sourceType || "installment") !== "check_recovery",
  );
  const checks = detail?.checks || [];
  const checkSale = sale?.saleType === "check" || Number(sale?.numberOfInstallments || 0) === 0;
  const paidCount = checkSale
    ? checks.filter((check: any) => String(check?.status || "") === "نقد شد").length
    : payments.filter((payment: any) => Number(payment?.computedRemaining || 0) <= 0.00001).length;
  const totalCount = checkSale ? checks.length : Math.max(0, Number(sale?.numberOfInstallments || payments.length));
  return {
    id: Number(sale.id),
    saleType: checkSale ? "check" : "installment",
    itemsSummary: String(sale?.itemsSummary || sale?.phoneModel || "قرارداد اقساطی"),
    saleDate: String(sale?.saleDate || sale?.saleDateISO || sale?.dateCreated || ""),
    totalAmount: Math.max(0, Number(sale?.actualSalePrice || 0)),
    downPayment: Math.max(0, Number(sale?.downPayment || 0)),
    collectedAmount: Math.max(0, Number(sale?.collectedAmount || detail?.collectedAmount || 0)),
    remainingAmount: Math.max(0, Number(sale?.remainingAmount || detail?.remainingAmount || 0)),
    installmentCount: totalCount,
    paidInstallmentCount: paidCount,
    remainingInstallmentCount: Math.max(0, totalCount - paidCount),
    nextDueDate: sale?.nextDueDate || detail?.nextDueDate || null,
    nextDueAmount: Math.max(0, Number(sale?.nextDueAmount || 0)),
    overdueCount: Math.max(0, Number(sale?.overdueInstallmentsCount || 0)),
    status: String(sale?.overallStatus || detail?.overallStatus || "در حال پرداخت"),
  };
};

const paymentTimelineState = (payment: any, todayJalali: string) => {
  if (Number(payment?.computedRemaining || 0) <= 0.00001) return "paid";
  const dueDate = String(payment?.dueDate || "");
  if (dueDate && dueDate < todayJalali) return "overdue";
  if (dueDate === todayJalali) return "due";
  return "upcoming";
};

const safeInvoice = (invoice: any) => ({
  business: {
    name: String(invoice?.businessDetails?.name || "کوروش"),
    logoUrl: String(invoice?.businessDetails?.logoUrl || "/kourosh-logo.svg"),
  },
  invoiceNumber: String(invoice?.invoiceMetadata?.invoiceNumber || ""),
  transactionDate: String(invoice?.invoiceMetadata?.transactionDate || ""),
  paymentMethod: invoice?.invoiceMetadata?.paymentMethod || null,
  paymentMethodLabel: invoice?.invoiceMetadata?.paymentMethodLabel || null,
  status: invoice?.invoiceMetadata?.status || "active",
  items: (invoice?.lineItems || []).map((item: any) => ({
    id: Number(item?.id || 0),
    description: String(item?.description || "کالا/خدمت"),
    quantity: Math.max(0, Number(item?.quantity || 0)),
    unitPrice: Math.max(0, Number(item?.unitPrice || 0)),
    discountAmount: Math.max(0, Number(item?.discountPerItem || 0)),
    totalPrice: Math.max(0, Number(item?.totalPrice || 0)),
  })),
  totals: {
    subtotal: Math.max(0, Number(invoice?.financialSummary?.subtotal || 0)),
    itemsDiscount: Math.max(0, Number(invoice?.financialSummary?.itemsDiscount || invoice?.financialSummary?.discountAmount || 0)),
    globalDiscount: Math.max(0, Number(invoice?.financialSummary?.globalDiscount || 0)),
    taxAmount: Math.max(0, Number(invoice?.financialSummary?.taxAmount || 0)),
    grandTotal: Math.max(0, Number(invoice?.financialSummary?.grandTotal || 0)),
  },
});

export const createMiniAppCustomerService = (
  dependencies: CustomerReadDependencies = defaultDependencies,
) => ({
  getHome: async (customerId: number) => {
    const [profile, ledger, installments, bundle] = await Promise.all([
      dependencies.getCustomerById(customerId),
      dependencies.listCustomerLedgerDirectory(customerId, { page: 1, pageSize: 10, includeSummary: true }),
      dependencies.listInstallmentSalesForCustomer(customerId),
      dependencies.getCustomerProfileBundle(customerId, { includeLedger: false }),
    ]);
    if (!profile) return null;
    const signedBalance = Number(ledger?.summary?.currentBalance ?? profile?.currentBalance ?? 0);
    const active = (installments || []).filter(
      (sale: any) => !["تکمیل شده", "فسخ شده"].includes(String(sale?.overallStatus || "")),
    );
    const nextInstallment = active
      .filter((sale: any) => sale?.nextDueDate)
      .sort((left: any, right: any) =>
        String(left.nextDueDate).localeCompare(String(right.nextDueDate)) || Number(left.id) - Number(right.id))[0];
    return {
      customer: { id: Number(profile.id), fullName: String(profile.fullName || "مشتری کوروش") },
      account: { signedBalance, ...accountState(signedBalance) },
      installments: {
        activeCount: active.length,
        overdueCount: active.reduce((sum: number, sale: any) => sum + Math.max(0, Number(sale?.overdueInstallmentsCount || 0)), 0),
        next: nextInstallment ? {
          saleId: Number(nextInstallment.id),
          dueDate: String(nextInstallment.nextDueDate),
          amount: Math.max(0, Number(nextInstallment.nextDueAmount || 0)),
        } : null,
      },
      lastPurchase: bundle?.purchaseHistory?.[0] ? mapPurchase(bundle.purchaseHistory[0]) : null,
    };
  },

  getAccount: async (customerId: number) => {
    const [profile, ledger] = await Promise.all([
      dependencies.getCustomerById(customerId),
      dependencies.listCustomerLedgerDirectory(customerId, { page: 1, pageSize: 25, includeSummary: true }),
    ]);
    if (!profile) return null;
    const signedBalance = Number(ledger?.summary?.currentBalance ?? profile?.currentBalance ?? 0);
    return {
      account: { signedBalance, ...accountState(signedBalance) },
      totalDebit: Math.max(0, Number(ledger?.summary?.totalDebit || 0)),
      totalCredit: Math.max(0, Number(ledger?.summary?.totalCredit || 0)),
      entries: (ledger?.items || []).map((entry: any) => ({
        id: Number(entry.id),
        transactionDate: String(entry?.transactionDate || entry?.createdAt || ""),
        description: String(entry?.description || "گردش حساب"),
        debit: Math.max(0, Number(entry?.debit || 0)),
        credit: Math.max(0, Number(entry?.credit || 0)),
        balance: Number(entry?.balance || 0),
      })),
    };
  },

  listInstallments: async (customerId: number) => {
    const sales = await dependencies.listInstallmentSalesForCustomer(customerId);
    const summaries = await Promise.all((sales || []).map(async (sale: any) => {
      const detail = await dependencies.getInstallmentSaleById(Number(sale.id));
      if (!ownsMiniAppCustomerResource(detail, customerId)) return null;
      return mapInstallmentSummary(sale, detail);
    }));
    return summaries.filter((summary): summary is NonNullable<typeof summary> => summary !== null);
  },

  getInstallmentDetail: async (customerId: number, saleId: number) => {
    const detail = await dependencies.getInstallmentSaleById(saleId);
    if (!ownsMiniAppCustomerResource(detail, customerId)) return null;
    const todayJalali = moment().locale("en").format("jYYYY/jMM/jDD");
    return {
      ...mapInstallmentSummary(detail, detail),
      items: (detail.items || []).map((item: any) => ({
        description: String(item?.description || "کالا/خدمت"),
        quantity: Math.max(0, Number(item?.quantity || 0)),
        unitPrice: Math.max(0, Number(item?.unitPrice || 0)),
        totalPrice: Math.max(0, Number(item?.totalPrice || 0)),
      })),
      timeline: (detail.payments || [])
        .filter((payment: any) => String(payment?.sourceType || "installment") !== "check_recovery")
        .map((payment: any) => ({
          id: Number(payment.id),
          installmentNumber: Number(payment?.installmentNumber || 0),
          dueDate: String(payment?.dueDate || ""),
          amount: Math.max(0, Number(payment?.amountDue || 0)),
          paidAmount: Math.max(0, Number(payment?.computedPaid || 0)),
          remainingAmount: Math.max(0, Number(payment?.computedRemaining || 0)),
          paymentDate: payment?.paymentDate || null,
          state: paymentTimelineState(payment, todayJalali),
        })),
      checks: (detail.checks || []).map((check: any) => ({
        id: Number(check.id),
        dueDate: String(check?.dueDate || ""),
        amount: Math.max(0, Number(check?.amount || 0)),
        bankName: String(check?.bankName || ""),
        status: String(check?.status || "نزد فروشنده"),
      })),
    };
  },

  listPurchases: async (customerId: number, limit = 50) => {
    const bundle = await dependencies.getCustomerProfileBundle(customerId, { includeLedger: false });
    if (!bundle?.profile) return null;
    return (bundle.purchaseHistory || []).slice(0, Math.min(100, Math.max(1, limit))).map(mapPurchase);
  },

  listInvoices: async (customerId: number, limit = 50) => {
    const purchases = await dependencies.getCustomerProfileBundle(customerId, { includeLedger: false });
    if (!purchases?.profile) return null;
    return (purchases.purchaseHistory || [])
      .map(mapPurchase)
      .filter((purchase: any) => Boolean(purchase.invoiceRef))
      .slice(0, Math.min(100, Math.max(1, limit)));
  },

  getInvoiceDetail: async (customerId: number, invoiceRef: string) => {
    const match = String(invoiceRef || "").match(/^(order|legacy)-(\d+)$/);
    if (!match) return null;
    const id = Number(match[2]);
    const invoice = match[1] === "order"
      ? await dependencies.fetchSalesOrderInvoice(id)
      : await dependencies.fetchLegacyInvoice(id);
    if (!ownsMiniAppCustomerInvoice(invoice, customerId)) return null;
    return safeInvoice(invoice);
  },
});

export const miniAppCustomerService = createMiniAppCustomerService();
