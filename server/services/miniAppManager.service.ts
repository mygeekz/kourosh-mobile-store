/* eslint-disable @typescript-eslint/no-explicit-any -- Manager API maps legacy read models into explicit allowlisted DTOs. */
import moment from "jalali-moment";
import type { ManagementPermission } from "../security/managementAccessPolicy";
import { customersService } from "./customers.service";
import { partnersService } from "./partners.service";
import { miniAppCustomerService } from "./miniAppCustomer.service";
import { miniAppPartnerService, partnerAccountState } from "./miniAppPartner.service";
import { miniAppStaffService } from "./miniAppStaff.service";
import { miniAppStaffReadModels } from "./miniAppStaffReadModels";
import { getAllRepairsFromDb, getRepairByIdFromDb } from "../db/domains/repairs.db";
import { getPartnerAccountingBreakdown } from "../accounting/accountingGovernance";

const asNumber = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;
const money = (value: unknown): number => Math.max(0, asNumber(value));
const signed = (value: unknown): number => asNumber(value);
const text = (value: unknown, fallback = ""): string => String(value ?? fallback).trim();
const optionalText = (value: unknown): string | null => {
  const normalized = text(value);
  return normalized || null;
};
const page = (value: unknown): number => Math.max(1, Math.floor(asNumber(value) || 1));
const pageSize = (value: unknown, fallback = 20): number => Math.min(50, Math.max(10, Math.floor(asNumber(value) || fallback)));
const queryText = (value: unknown): string => String(value ?? "").normalize("NFKC").trim().slice(0, 100);

const hasPermission = (permissions: readonly string[], permission: ManagementPermission): boolean =>
  permissions.includes(permission);

const safeCustomerDirectoryItem = (row: any, includeAccount: boolean) => ({
  id: asNumber(row?.id),
  fullName: text(row?.fullName, "مشتری کوروش"),
  phoneNumber: optionalText(row?.phoneNumber),
  nationalCode: optionalText(row?.nationalCode),
  tags: row?.tags ?? null,
  lastActivityAt: optionalText(row?.lastActivityAt),
  ...(includeAccount ? { currentBalance: signed(row?.currentBalance) } : {}),
});

const safePartnerDirectoryItem = (row: any, includeAccount: boolean) => {
  const currentBalance = signed(row?.currentBalance);
  return {
    id: asNumber(row?.id),
    name: text(row?.partnerName, "همکار کوروش"),
    type: optionalText(row?.partnerType),
    contactName: optionalText(row?.contactPerson),
    phoneNumber: optionalText(row?.phoneNumber),
    ...(includeAccount ? { currentBalance, account: partnerAccountState(currentBalance) } : {}),
  };
};

const safeCustomerLedgerItem = (row: any) => ({
  id: asNumber(row?.id),
  transactionDate: text(row?.transactionDate || row?.createdAt || row?.updatedAt),
  description: text(row?.description, "گردش حساب"),
  debit: money(row?.debit),
  credit: money(row?.credit),
  balance: signed(row?.balance),
  source: {
    kind: optionalText(row?.sourceKind),
    id: row?.sourceId == null ? null : asNumber(row.sourceId),
    label: optionalText(row?.sourceLabel),
    resolved: Boolean(row?.sourceResolved),
  },
});

const safePartnerAccountingBreakdown = (data: any) => data ? ({
  partner: {
    id: asNumber(data?.partner?.id),
    name: text(data?.partner?.partnerName, "همکار کوروش"),
  },
  summary: {
    canonicalBalance: signed(data?.summary?.canonicalBalance),
    supplierReceivable: signed(data?.summary?.supplierReceivable),
    supplierCredits: money(data?.summary?.supplierCredits),
    supplierDebits: money(data?.summary?.supplierDebits),
    totalPayments: money(data?.summary?.totalPayments),
    totalIncreases: money(data?.summary?.totalIncreases),
    profitShareAccrued: signed(data?.summary?.profitShareAccrued),
    sharedProfitAccrued: signed(data?.summary?.sharedProfitAccrued),
    ownerGainAccrued: signed(data?.summary?.ownerGainAccrued),
    explicitProfitLedger: signed(data?.summary?.explicitProfitLedger),
    ledgerEntryCount: Math.max(0, asNumber(data?.summary?.ledgerEntryCount)),
    profitAllocationCount: Math.max(0, asNumber(data?.summary?.profitAllocationCount)),
    legacyMovementIssueCount: Math.max(0, asNumber(data?.summary?.legacyMovementIssueCount)),
  },
  profitAllocations: (data?.profitAllocations || []).map((row: any) => ({
    id: asNumber(row?.id),
    allocationType: text(row?.allocationType),
    sharePercent: signed(row?.sharePercent),
    amount: signed(row?.amount),
    saleDate: optionalText(row?.saleDate),
    itemType: optionalText(row?.itemType),
    itemId: row?.itemId == null ? null : asNumber(row.itemId),
    itemDescription: optionalText(row?.itemDescription),
    totalProfitAmount: signed(row?.totalProfitAmount),
  })),
}) : null;

const repairAgeDays = (dateReceived: unknown): number => {
  const parsed = moment(String(dateReceived || ""));
  if (!parsed.isValid()) return 0;
  return Math.max(0, moment().startOf("day").diff(parsed.startOf("day"), "days"));
};

const safeRepair = (row: any) => ({
  id: asNumber(row?.id),
  customerId: asNumber(row?.customerId),
  customerName: text(row?.customerFullName, "مشتری کوروش"),
  deviceModel: text(row?.deviceModel, "دستگاه"),
  problemDescription: text(row?.problemDescription),
  status: text(row?.status),
  estimatedCost: row?.estimatedCost == null ? null : money(row.estimatedCost),
  finalCost: row?.finalCost == null ? null : money(row.finalCost),
  dateReceived: text(row?.dateReceived),
  dateCompleted: optionalText(row?.dateCompleted),
  technicianId: row?.technicianId == null ? null : asNumber(row.technicianId),
  technicianName: optionalText(row?.technicianName),
  ageDays: repairAgeDays(row?.dateReceived),
});

const safeRepairDetail = (payload: any) => {
  const repair = payload?.repair;
  if (!repair) return null;
  return {
    ...safeRepair(repair),
    customerPhoneNumber: optionalText(repair?.customerPhoneNumber),
    deviceColor: optionalText(repair?.deviceColor),
    serialNumber: optionalText(repair?.serialNumber),
    technicianNotes: optionalText(repair?.technicianNotes),
    laborFee: repair?.laborFee == null ? null : money(repair.laborFee),
    parts: (payload?.parts || []).map((part: any) => ({
      id: asNumber(part?.id),
      productId: asNumber(part?.productId),
      productName: text(part?.productName, "قطعه"),
      quantityUsed: Math.max(0, asNumber(part?.quantityUsed)),
      pricePerItem: part?.pricePerItem == null ? null : money(part.pricePerItem),
    })),
  };
};

const repairSummary = (rows: any[]) => {
  const open = rows.filter((row) => !["تحویل داده شده", "تعمیر نشد", "مرجوع شد"].includes(text(row?.status)));
  const ready = open.filter((row) => text(row?.status) === "آماده تحویل");
  const waitingPart = open.filter((row) => text(row?.status) === "منتظر قطعه");
  const oldest = [...open].sort((a, b) => repairAgeDays(b?.dateReceived) - repairAgeDays(a?.dateReceived))[0];
  return {
    openCount: open.length,
    readyForPickupCount: ready.length,
    waitingPartCount: waitingPart.length,
    oldestOpen: oldest ? {
      id: asNumber(oldest.id),
      customerName: text(oldest.customerFullName, "مشتری کوروش"),
      deviceModel: text(oldest.deviceModel, "دستگاه"),
      status: text(oldest.status),
      ageDays: repairAgeDays(oldest.dateReceived),
    } : null,
  };
};

export type ManagerDashboardResult = {
  generatedAt: string;
  widgets: Record<string, unknown>;
};

export const miniAppManagerService = {
  getDashboard: async (permissions: readonly string[]): Promise<ManagerDashboardResult> => {
    const widgets: Record<string, unknown> = {};
    const now = moment();
    const today = now.clone().locale("en").format("jYYYY/jMM/jDD");

    const needsSales = hasPermission(permissions, "sales.read") || hasPermission(permissions, "profits.read");
    const [sales, customerDirectory, partnerDirectory, unpaid, dashboard, repairs] = await Promise.all([
      needsSales ? miniAppStaffReadModels.getSalesSummaryAndProfit(today, today) : Promise.resolve(null),
      hasPermission(permissions, "customers.ledger.read")
        ? customersService.listCustomersDirectory({ page: 1, pageSize: 10, includeSummary: true })
        : Promise.resolve(null),
      hasPermission(permissions, "partners.ledger.read")
        ? partnersService.listPartnersDirectory({ page: 1, pageSize: 10, includeSummary: true })
        : Promise.resolve(null),
      hasPermission(permissions, "installments.read")
        ? miniAppStaffReadModels.listUnpaidInstallments()
        : Promise.resolve(null),
      hasPermission(permissions, "inventory.read")
        ? miniAppStaffReadModels.getDashboardKPIs()
        : Promise.resolve(null),
      hasPermission(permissions, "repairs.read")
        ? getAllRepairsFromDb()
        : Promise.resolve(null),
    ]);

    if (sales && hasPermission(permissions, "sales.read")) {
      widgets.sales = {
        todayAmount: money((sales as any).totalRevenue),
        todayTransactions: Math.max(0, asNumber((sales as any).totalTransactions)),
        averageSaleValue: money((sales as any).averageSaleValue),
      };
    }
    if (sales && hasPermission(permissions, "profits.read")) {
      widgets.profit = { todayGrossProfit: signed((sales as any).grossProfit) };
    }
    if (customerDirectory?.summary) {
      widgets.customerReceivables = {
        debtorsCount: Math.max(0, asNumber(customerDirectory.summary.debtors)),
        totalReceivables: money(customerDirectory.summary.totalDebt),
        creditorsCount: Math.max(0, asNumber(customerDirectory.summary.creditors)),
        totalCustomerCredit: money(customerDirectory.summary.totalCredit),
      };
    }
    if (partnerDirectory?.summary) {
      widgets.partnerAccounts = {
        totalPartners: Math.max(0, asNumber(partnerDirectory.summary.total)),
        positiveBalanceCount: Math.max(0, asNumber(partnerDirectory.summary.debtors)),
        positiveBalanceAmount: money(partnerDirectory.summary.totalDebt),
        negativeBalanceCount: Math.max(0, asNumber(partnerDirectory.summary.creditors)),
        negativeBalanceAmount: money(partnerDirectory.summary.totalCredit),
      };
    }
    if (Array.isArray(unpaid)) {
      const todayStart = now.clone().startOf("day");
      let overdueCount = 0;
      let overdueAmount = 0;
      let dueTodayCount = 0;
      let dueTodayAmount = 0;
      let next7Count = 0;
      let next7Amount = 0;
      for (const row of unpaid as any[]) {
        const dueDate = moment(String(row?.dueDate || ""), "jYYYY/jMM/jDD", true);
        if (!dueDate.isValid()) continue;
        const delta = dueDate.clone().startOf("day").diff(todayStart, "days");
        const remaining = money(row?.effectiveRemaining ?? row?.amountDue ?? row?.physicalRemaining);
        if (remaining <= 0.00001) continue;
        if (delta < 0) { overdueCount += 1; overdueAmount += remaining; }
        else if (delta === 0) { dueTodayCount += 1; dueTodayAmount += remaining; }
        else if (delta <= 7) { next7Count += 1; next7Amount += remaining; }
      }
      widgets.installments = { overdueCount, overdueAmount, dueTodayCount, dueTodayAmount, next7Count, next7Amount };
    }
    if (dashboard) {
      widgets.inventory = { activeItemsCount: Math.max(0, asNumber((dashboard as any).activeProductsCount)) };
    }
    if (Array.isArray(repairs)) widgets.repairs = repairSummary(repairs as any[]);

    return { generatedAt: new Date().toISOString(), widgets };
  },

  getSalesSummary: async (period: unknown, permissions: readonly string[]) => {
    const data = await miniAppStaffService.getSalesSummary(period);
    return {
      period: data.period,
      from: data.from,
      to: data.to,
      ...(hasPermission(permissions, "sales.read") ? {
        totalRevenue: data.totalRevenue,
        totalTransactions: data.totalTransactions,
        averageSaleValue: data.averageSaleValue,
        topSellingItems: data.topSellingItems,
      } : {}),
      ...(hasPermission(permissions, "profits.read") ? { grossProfit: data.grossProfit } : {}),
    };
  },

  listCustomers: async (query: any, permissions: readonly string[]) => {
    const includeAccount = hasPermission(permissions, "customers.ledger.read");
    const result = await customersService.listCustomersDirectory({
      page: page(query?.page),
      pageSize: pageSize(query?.pageSize),
      search: queryText(query?.q ?? query?.search),
      balance: includeAccount ? String(query?.balance || "all") as any : "all",
      sort: String(query?.sort || "name") as any,
      includeSummary: includeAccount,
    });
    return {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
      items: (result.items || []).map((row: any) => safeCustomerDirectoryItem(row, includeAccount)),
      ...(includeAccount && result.summary ? { summary: result.summary } : {}),
    };
  },

  getCustomer: async (customerId: number, permissions: readonly string[]) => {
    const bundle = await customersService.getCustomerProfileBundle(customerId, { includeLedger: false });
    if (!bundle?.profile) return null;
    const profile = bundle.profile;
    const result: Record<string, unknown> = {
      customer: {
        id: asNumber(profile?.id),
        fullName: text(profile?.fullName, "مشتری کوروش"),
        phoneNumber: optionalText(profile?.phoneNumber),
        nationalCode: optionalText(profile?.nationalCode),
        address: optionalText(profile?.address),
        tags: profile?.tags ?? null,
        dateAdded: optionalText(profile?.dateAdded),
      },
    };
    if (hasPermission(permissions, "customers.ledger.read")) {
      const account = await miniAppCustomerService.getAccount(customerId);
      if (account) result.account = account;
    }
    if (hasPermission(permissions, "sales.read")) {
      const purchases = (bundle.purchaseHistory || []).map((row: any) => ({
        id: asNumber(row?.id),
        transactionDate: text(row?.transactionDate || row?.saleDate || row?.dateCreated),
        itemSummary: text(row?.itemName || row?.itemsSummary, "خرید از کوروش"),
        quantity: Math.max(1, asNumber(row?.quantity) || 1),
        totalAmount: money(row?.totalPrice || row?.actualSalePrice),
        purchaseType: text(row?.purchaseType || row?.saleType),
      }));
      result.purchases = {
        count: purchases.length,
        totalAmount: purchases.reduce((sum: number, item: any) => sum + money(item.totalAmount), 0),
        recent: purchases.slice(0, 5),
      };
    }
    if (hasPermission(permissions, "installments.read")) {
      const installments = await miniAppCustomerService.listInstallments(customerId);
      result.installments = {
        activeCount: installments.filter((row: any) => !["تکمیل شده", "فسخ شده"].includes(text(row?.status))).length,
        overdueCount: installments.reduce((sum: number, row: any) => sum + Math.max(0, asNumber(row?.overdueCount)), 0),
      };
    }
    return result;
  },

  listCustomerLedger: async (customerId: number, query: any) => {
    const customer = await customersService.getCustomerProfileBundle(customerId, { includeLedger: false });
    if (!customer?.profile) return null;
    const result = await customersService.listCustomerLedgerDirectory(customerId, {
      page: page(query?.page),
      pageSize: pageSize(query?.pageSize, 25),
      search: queryText(query?.q ?? query?.search),
      direction: String(query?.direction || "all") as any,
      range: String(query?.range || "all") as any,
      includeSummary: true,
    });
    return {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
      summary: result.summary || null,
      items: (result.items || []).map(safeCustomerLedgerItem),
    };
  },

  listCustomerPurchases: async (customerId: number, query: any) => {
    const currentPage = page(query?.page);
    const size = pageSize(query?.pageSize, 20);
    const limit = Math.min(100, currentPage * size);
    const rows = await miniAppCustomerService.listPurchases(customerId, limit);
    if (!rows) return null;
    const offset = (currentPage - 1) * size;
    return {
      page: currentPage,
      pageSize: size,
      totalKnown: rows.length,
      hasMore: rows.length === limit && limit < 100,
      items: rows.slice(offset, offset + size),
    };
  },

  listCustomerInstallments: async (customerId: number) => {
    const customer = await customersService.getCustomerProfileBundle(customerId, { includeLedger: false });
    if (!customer?.profile) return null;
    return miniAppCustomerService.listInstallments(customerId);
  },

  listPartners: async (query: any, permissions: readonly string[]) => {
    const includeAccount = hasPermission(permissions, "partners.ledger.read");
    const result = await partnersService.listPartnersDirectory({
      page: page(query?.page),
      pageSize: pageSize(query?.pageSize),
      search: queryText(query?.q ?? query?.search),
      balance: includeAccount ? String(query?.balance || "all") as any : "all",
      sort: String(query?.sort || "name") as any,
      includeSummary: includeAccount,
    });
    return {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
      items: (result.items || []).map((row: any) => safePartnerDirectoryItem(row, includeAccount)),
      ...(includeAccount && result.summary ? { summary: result.summary } : {}),
    };
  },

  getPartner: async (partnerId: number, permissions: readonly string[]) => {
    const shell = await partnersService.getPartnerProfileShell(partnerId);
    if (!shell?.profile) return null;
    const profile = shell.profile;
    const result: Record<string, unknown> = {
      partner: {
        id: asNumber(profile?.id),
        name: text(profile?.partnerName, "همکار کوروش"),
        type: optionalText(profile?.partnerType),
        contactName: optionalText(profile?.contactPerson),
        phoneNumber: optionalText(profile?.phoneNumber),
        email: optionalText(profile?.email),
      },
      supplied: {
        total: Math.max(0, asNumber(shell?.purchaseSummary?.all || shell?.purchaseSummary?.total)),
        phones: Math.max(0, asNumber(shell?.purchaseSummary?.phone)),
        products: Math.max(0, asNumber(shell?.purchaseSummary?.product)),
        totalSupplyAmount: money(shell?.purchaseSummary?.totalValue),
      },
    };
    if (hasPermission(permissions, "partners.ledger.read")) {
      const account = await miniAppPartnerService.getAccount(partnerId);
      if (account) result.account = account;
      result.phoneSettlement = {
        total: Math.max(0, asNumber(shell?.soldPhoneSettlementSummary?.total)),
        open: Math.max(0, asNumber(shell?.soldPhoneSettlementSummary?.open)),
        settled: Math.max(0, asNumber(shell?.soldPhoneSettlementSummary?.settled)),
        amount: money(shell?.soldPhoneSettlementSummary?.totalAmount),
        paidAmount: money(shell?.soldPhoneSettlementSummary?.paidTotal),
        remainingAmount: money(shell?.soldPhoneSettlementSummary?.balanceTotal),
      };
    }
    return result;
  },

  listPartnerLedger: async (partnerId: number, query: any) => {
    const partner = await partnersService.getPartnerProfileShell(partnerId);
    if (!partner?.profile) return null;
    return miniAppPartnerService.listLedger(partnerId, page(query?.page), pageSize(query?.pageSize, 20));
  },

  listPartnerPurchases: async (partnerId: number, query: any) => {
    const partner = await partnersService.getPartnerProfileShell(partnerId);
    if (!partner?.profile) return null;
    return miniAppPartnerService.listPurchases(partnerId, page(query?.page), pageSize(query?.pageSize, 20));
  },

  listPartnerSettlements: async (partnerId: number, query: any) => {
    const partner = await partnersService.getPartnerProfileShell(partnerId);
    if (!partner?.profile) return null;
    return miniAppPartnerService.listPhones(partnerId, page(query?.page), pageSize(query?.pageSize, 20));
  },

  getPartnerAccountingBreakdown: async (partnerId: number) =>
    safePartnerAccountingBreakdown(await getPartnerAccountingBreakdown(partnerId)),

  listDueInstallments: (query: any) => miniAppStaffService.listDueInstallments({
    scope: query?.scope,
    page: query?.page,
    pageSize: query?.pageSize,
  }),

  getInstallmentDetail: (saleId: number) => miniAppStaffService.getInstallmentDetail(saleId),

  listRepairs: async (query: any) => {
    const status = text(query?.status);
    const q = queryText(query?.q ?? query?.search).toLowerCase();
    const currentPage = page(query?.page);
    const size = pageSize(query?.pageSize, 20);
    const rows = await getAllRepairsFromDb(status || undefined);
    const filtered = (rows || []).filter((row: any) => {
      if (!q) return true;
      return [row?.customerFullName, row?.deviceModel, row?.problemDescription, row?.status, row?.technicianName]
        .some((value) => text(value).toLowerCase().includes(q));
    });
    const offset = (currentPage - 1) * size;
    return {
      page: currentPage,
      pageSize: size,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / size)),
      summary: repairSummary(filtered),
      items: filtered.slice(offset, offset + size).map(safeRepair),
    };
  },

  getRepairDetail: async (repairId: number) => safeRepairDetail(await getRepairByIdFromDb(repairId)),

  listInventoryPhones: (query: any) => miniAppStaffService.listPhones({
    q: query?.q,
    page: query?.page,
    offset: query?.offset,
    limit: query?.limit ?? query?.pageSize,
  }),

  getInventoryPhone: (phoneId: number) => miniAppStaffService.getPhoneDetail(phoneId),

  getInvoice: (invoiceRef: string) => miniAppStaffService.getInvoiceDetail(invoiceRef),
};
