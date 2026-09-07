/* eslint-disable @typescript-eslint/no-explicit-any -- This boundary safely normalizes legacy partner read models into explicit Mini App DTOs. */

type PartnerReadDependencies = {
  getPartnerProfileShell: (partnerId: number) => Promise<any | null>;
  listPartnerLedgerDirectory: (partnerId: number, query: any) => Promise<any>;
  listPartnerPurchaseDirectory: (partnerId: number, query: any) => Promise<any>;
  listPartnerPhoneSettlementDirectory: (partnerId: number, query: any) => Promise<any>;
};

const loadRuntimeModule = (specifier: string): Promise<any> => import(specifier);

const defaultDependencies: PartnerReadDependencies = {
  getPartnerProfileShell: async (partnerId) =>
    (await loadRuntimeModule("./partners.service")).partnersService.getPartnerProfileShell(partnerId),
  listPartnerLedgerDirectory: async (partnerId, query) =>
    (await loadRuntimeModule("./partners.service")).partnersService.listPartnerLedgerDirectory(partnerId, query),
  listPartnerPurchaseDirectory: async (partnerId, query) =>
    (await loadRuntimeModule("./partners.service")).partnersService.listPartnerPurchaseDirectory(partnerId, query),
  listPartnerPhoneSettlementDirectory: async (partnerId, query) =>
    (await loadRuntimeModule("./partners.service")).partnersService.listPartnerPhoneSettlementDirectory(partnerId, query),
};

const amount = (value: unknown): number => Math.max(0, Number(value || 0));
const signedAmount = (value: unknown): number => Number(value || 0);
const text = (value: unknown, fallback = ""): string => String(value || fallback).trim();
const optionalText = (value: unknown): string | null => {
  const normalized = text(value);
  return normalized || null;
};

const boundedPage = (value: unknown): number =>
  Math.max(1, Math.floor(Number(value || 1)));

const boundedPageSize = (value: unknown): number =>
  Math.min(25, Math.max(10, Math.floor(Number(value || 20))));

export const partnerAccountState = (signedBalance: number) => {
  // Canonical Partner contract: a positive balance means the store owes the
  // partner; a negative balance means the partner owes the store. This only
  // maps the existing signed balance to Partner-facing semantics.
  if (signedBalance > 0) {
    return { code: "creditor" as const, label: "بستانکار از فروشگاه", amount: signedBalance };
  }
  if (signedBalance < 0) {
    return { code: "debtor" as const, label: "بدهکار به فروشگاه", amount: Math.abs(signedBalance) };
  }
  return { code: "settled" as const, label: "تسویه کامل", amount: 0 };
};

const explicitOwnerIds = (row: any): number[] =>
  [row?.partnerId, row?.supplierId, row?.ownerPartnerId]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0);

export const belongsToMiniAppPartner = (row: any, partnerId: number): boolean => {
  if (!row) return false;
  const ownerIds = explicitOwnerIds(row);
  return ownerIds.length === 0 || ownerIds.every((ownerId) => ownerId === partnerId);
};

const safeLedgerEntry = (entry: any) => ({
  id: Number(entry?.id || 0),
  transactionDate: text(entry?.transactionDate || entry?.createdAt || entry?.updatedAt),
  description: text(entry?.description, "گردش حساب"),
  debit: amount(entry?.debit),
  credit: amount(entry?.credit),
  balance: signedAmount(entry?.balance),
});

const safePurchaseItem = (row: any) => {
  const type = text(row?.type || row?.assetType).toLowerCase() === "phone" ? "phone" : "product";
  const quantity = type === "phone"
    ? 1
    : Math.max(0, Number(row?.quantityPurchased ?? row?.quantity ?? 0));
  const supplyAmount = type === "phone"
    ? amount(row?.settlementPurchasePrice ?? row?.purchasePrice ?? row?.unitPrice)
    : amount(row?.totalPrice ?? (quantity * amount(row?.purchasePrice ?? row?.unitPrice)));
  const paidAmount = type === "phone" ? amount(row?.phoneSettlementPaidAmount) : 0;
  const remainingAmount = type === "phone"
    ? amount(row?.phoneSettlementBalance ?? Math.max(0, supplyAmount - paidAmount))
    : 0;
  return {
    ref: `${type}-${Number(row?.id || row?.assetId || 0)}`,
    type,
    name: text(row?.name || row?.model, type === "phone" ? "گوشی" : "کالا"),
    quantity,
    unit: text(row?.unit, "عدد"),
    supplyAmount,
    purchaseDate: optionalText(row?.purchaseDate || row?.registerDate),
    identifier: type === "phone" ? optionalText(row?.identifier || row?.imei) : null,
    status: type === "phone" ? optionalText(row?.status) : null,
    settlement: type === "phone" ? {
      code: remainingAmount > 0.00001 ? "open" as const : "settled" as const,
      label: remainingAmount > 0.00001 ? "تسویه‌نشده" : "تسویه‌شده",
      amount: supplyAmount,
      paidAmount,
      remainingAmount,
      lastPaymentDate: optionalText(row?.phoneSettlementLastPaymentDate),
    } : null,
  };
};

const safeSettlementPhone = (row: any) => {
  const mapped = safePurchaseItem({ ...row, type: "phone" });
  return {
    ref: mapped.ref,
    name: mapped.name,
    identifier: mapped.identifier,
    status: mapped.status,
    purchaseDate: mapped.purchaseDate,
    settlement: mapped.settlement!,
  };
};

const safePartnerProfile = (profile: any) => ({
  id: Number(profile?.id || 0),
  name: text(profile?.partnerName, "همکار کوروش"),
  type: optionalText(profile?.partnerType),
  contactName: optionalText(profile?.contactPerson),
  phoneNumber: optionalText(profile?.phoneNumber),
  email: optionalText(profile?.email),
});

const safeSummary = (shell: any) => {
  const purchases = shell?.purchaseSummary || {};
  const settlements = shell?.soldPhoneSettlementSummary || {};
  return {
    supplied: {
      total: Math.max(0, Number(purchases?.all || purchases?.total || 0)),
      phones: Math.max(0, Number(purchases?.phone || 0)),
      products: Math.max(0, Number(purchases?.product || 0)),
      totalSupplyAmount: amount(purchases?.totalValue),
    },
    phoneSettlement: {
      total: Math.max(0, Number(settlements?.total || 0)),
      open: Math.max(0, Number(settlements?.open || 0)),
      settled: Math.max(0, Number(settlements?.settled || 0)),
      amount: amount(settlements?.totalAmount),
      paidAmount: amount(settlements?.paidTotal),
      remainingAmount: amount(settlements?.balanceTotal),
    },
  };
};

const readOwnedShell = async (
  dependencies: PartnerReadDependencies,
  partnerId: number,
): Promise<any | null> => {
  const shell = await dependencies.getPartnerProfileShell(partnerId);
  if (!shell?.profile || Number(shell.profile.id) !== partnerId) return null;
  return shell;
};

export const createMiniAppPartnerService = (
  dependencies: PartnerReadDependencies = defaultDependencies,
) => ({
  getHome: async (partnerId: number) => {
    const shell = await readOwnedShell(dependencies, partnerId);
    if (!shell) return null;
    const signedBalance = signedAmount(
      shell?.profile?.currentBalance ?? shell?.ledgerSummary?.latestBalance,
    );
    const recentLedger = (shell?.ledgerPreview || [])
      .filter((entry: any) => belongsToMiniAppPartner(entry, partnerId))
      .slice(0, 5)
      .map(safeLedgerEntry);
    return {
      partner: safePartnerProfile(shell.profile),
      account: { signedBalance, ...partnerAccountState(signedBalance) },
      ledger: {
        total: Math.max(0, Number(shell?.ledgerSummary?.total || 0)),
        lastActivity: recentLedger[0]?.transactionDate || null,
        recent: recentLedger,
      },
      ...safeSummary(shell),
    };
  },

  getAccount: async (partnerId: number) => {
    const shell = await readOwnedShell(dependencies, partnerId);
    if (!shell) return null;
    const signedBalance = signedAmount(
      shell?.profile?.currentBalance ?? shell?.ledgerSummary?.latestBalance,
    );
    return {
      partner: safePartnerProfile(shell.profile),
      account: { signedBalance, ...partnerAccountState(signedBalance) },
      totalDebit: amount(shell?.ledgerSummary?.totalDebit),
      totalCredit: amount(shell?.ledgerSummary?.totalCredit),
      ...safeSummary(shell),
    };
  },

  listLedger: async (partnerId: number, page = 1, pageSize = 20) => {
    const result = await dependencies.listPartnerLedgerDirectory(partnerId, {
      page: boundedPage(page),
      pageSize: boundedPageSize(pageSize),
      direction: "all",
      includeMeta: true,
      includeRelated: false,
    });
    const items = (result?.items || [])
      .filter((entry: any) => belongsToMiniAppPartner(entry, partnerId))
      .map(safeLedgerEntry);
    const signedBalance = signedAmount(result?.summary?.latestBalance);
    return {
      items,
      page: boundedPage(result?.page || page),
      pageSize: boundedPageSize(result?.pageSize || pageSize),
      total: Math.max(0, Number(result?.total || 0)),
      totalPages: Math.max(1, Number(result?.totalPages || 1)),
      account: { signedBalance, ...partnerAccountState(signedBalance) },
    };
  },

  listPurchases: async (partnerId: number, page = 1, pageSize = 20) => {
    const result = await dependencies.listPartnerPurchaseDirectory(partnerId, {
      page: boundedPage(page),
      pageSize: boundedPageSize(pageSize),
      type: "all",
    });
    return {
      items: (result?.items || [])
        .filter((item: any) => belongsToMiniAppPartner(item, partnerId))
        .map(safePurchaseItem),
      page: boundedPage(result?.page || page),
      pageSize: boundedPageSize(result?.pageSize || pageSize),
      total: Math.max(0, Number(result?.total || 0)),
      totalPages: Math.max(1, Number(result?.totalPages || 1)),
    };
  },

  listPhones: async (partnerId: number, page = 1, pageSize = 20) => {
    const result = await dependencies.listPartnerPhoneSettlementDirectory(partnerId, {
      page: boundedPage(page),
      pageSize: boundedPageSize(pageSize),
      status: "all",
      sort: "newest",
      includeMeta: true,
    });
    const summary = result?.filteredSummary || {};
    return {
      items: (result?.items || [])
        .filter((item: any) => belongsToMiniAppPartner(item, partnerId))
        .map(safeSettlementPhone),
      page: boundedPage(result?.page || page),
      pageSize: boundedPageSize(result?.pageSize || pageSize),
      total: Math.max(0, Number(result?.total || 0)),
      totalPages: Math.max(1, Number(result?.totalPages || 1)),
      summary: {
        total: Math.max(0, Number(summary?.total || 0)),
        amount: amount(summary?.totalAmount),
        paidAmount: amount(summary?.paidTotal),
        remainingAmount: amount(summary?.balanceTotal),
      },
    };
  },
});

export const miniAppPartnerService = createMiniAppPartnerService();
