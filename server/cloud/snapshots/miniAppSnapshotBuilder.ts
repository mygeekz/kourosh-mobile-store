import type {
  CustomerAccountData,
  CustomerHomeData,
  CustomerInstallmentDetail,
  CustomerInstallmentSummary,
  CustomerInvoiceDetail,
  CustomerPurchase,
  PartnerAccountData,
  PartnerHomeData,
  PartnerLedgerData,
  PartnerPhoneData,
  PartnerPurchasesData,
} from "../../../miniapp/types";
import {
  MINIAPP_MANAGER_SNAPSHOT_AUTHORIZATION_LEASE_MS,
  MINIAPP_SNAPSHOT_AUTHORIZATION_LEASE_MS,
  MINIAPP_SNAPSHOT_LIMITS,
  MINIAPP_SNAPSHOT_SCHEMA_VERSION,
  type CustomerOfflineSnapshotV1,
  type MiniAppSnapshotCandidateV1,
  type MiniAppStoredSnapshotV1,
  type ManagerOfflineSnapshotV1,
  type PartnerOfflinePhoneV1,
  type PartnerOfflinePurchaseV1,
  type PartnerOfflineSnapshotV1,
} from "./miniAppSnapshotContracts";
import {
  assertValidMiniAppSnapshotCandidate,
  assertValidStoredMiniAppSnapshot,
  validateMiniAppSnapshotCandidate,
  computeStoredMiniAppSnapshotContentHash,
  isValidSnapshotSubjectKey,
} from "./miniAppSnapshotValidation";

export type CustomerSnapshotService = {
  getHome: (customerId: number) => Promise<CustomerHomeData | null>;
  getAccount: (customerId: number) => Promise<CustomerAccountData | null>;
  listInstallments: (customerId: number) => Promise<CustomerInstallmentSummary[]>;
  getInstallmentDetail: (customerId: number, saleId: number) => Promise<CustomerInstallmentDetail | null>;
  listPurchases: (customerId: number, limit?: number) => Promise<CustomerPurchase[] | null>;
  listInvoices: (customerId: number, limit?: number) => Promise<CustomerPurchase[] | null>;
  getInvoiceDetail: (customerId: number, invoiceRef: string) => Promise<CustomerInvoiceDetail | null>;
};

export type PartnerSnapshotService = {
  getHome: (partnerId: number) => Promise<PartnerHomeData | null>;
  getAccount: (partnerId: number) => Promise<PartnerAccountData | null>;
  listLedger: (partnerId: number, page?: number, pageSize?: number) => Promise<PartnerLedgerData>;
  listPurchases: (partnerId: number, page?: number, pageSize?: number) => Promise<PartnerPurchasesData>;
  listPhones: (partnerId: number, page?: number, pageSize?: number) => Promise<PartnerPhoneData>;
};

export type SnapshotBuildContext = {
  tenantId: string;
  installationId: string;
  telegramUserId: string;
  snapshotVersion: number;
  now?: Date;
  authorizationLeaseMs?: number;
};

const iso = (date: Date): string => date.toISOString();

const candidateEnvelope = (
  context: SnapshotBuildContext,
  subjectKind: "customer" | "partner" | "manager",
  localSubjectId: number,
) => {
  const generatedAt = context.now ? new Date(context.now) : new Date();
  const leaseMs = Number.isFinite(context.authorizationLeaseMs)
    ? Math.min(MINIAPP_SNAPSHOT_AUTHORIZATION_LEASE_MS, Math.max(60_000, Number(context.authorizationLeaseMs)))
    : MINIAPP_SNAPSHOT_AUTHORIZATION_LEASE_MS;
  return {
    schemaVersion: MINIAPP_SNAPSHOT_SCHEMA_VERSION,
    tenantId: context.tenantId,
    installationId: context.installationId,
    subjectKind,
    localSubjectId,
    telegramUserId: context.telegramUserId,
    snapshotVersion: context.snapshotVersion,
    generatedAt: iso(generatedAt),
    authorizationValidUntil: iso(new Date(generatedAt.getTime() + leaseMs)),
    state: "active" as const,
  };
};

const getDefaultCustomerService = async (): Promise<CustomerSnapshotService> =>
  (await import("../../services/miniAppCustomer.service")).miniAppCustomerService;

const getDefaultPartnerService = async (): Promise<PartnerSnapshotService> =>
  (await import("../../services/miniAppPartner.service")).miniAppPartnerService;

const isClosedInstallment = (item: CustomerInstallmentSummary): boolean =>
  ["تکمیل شده", "فسخ شده"].includes(String(item.status || ""));

const bySaleDateNewest = (left: CustomerInstallmentSummary, right: CustomerInstallmentSummary): number =>
  String(right.saleDate || "").localeCompare(String(left.saleDate || "")) || Number(right.id) - Number(left.id);

const maskPartnerIdentifier = (value: string | null | undefined): string | null => {
  const compact = String(value || "").replace(/\s+/g, "").trim();
  if (!compact) return null;
  const last4 = compact.slice(-4);
  return `****${last4}`;
};

const mapPartnerPurchase = (item: PartnerPurchasesData["items"][number]): PartnerOfflinePurchaseV1 => ({
  ref: String(item.ref || ""),
  type: item.type === "phone" ? "phone" : "product",
  name: String(item.name || ""),
  quantity: Math.max(0, Number(item.quantity || 0)),
  unit: String(item.unit || "عدد"),
  supplyAmount: Math.max(0, Number(item.supplyAmount || 0)),
  purchaseDate: item.purchaseDate ? String(item.purchaseDate) : null,
  identifierMasked: maskPartnerIdentifier(item.identifier),
  status: item.status ? String(item.status) : null,
  settlement: item.settlement ? {
    code: item.settlement.code,
    label: String(item.settlement.label || ""),
    amount: Math.max(0, Number(item.settlement.amount || 0)),
    paidAmount: Math.max(0, Number(item.settlement.paidAmount || 0)),
    remainingAmount: Math.max(0, Number(item.settlement.remainingAmount || 0)),
    lastPaymentDate: item.settlement.lastPaymentDate ? String(item.settlement.lastPaymentDate) : null,
  } : null,
});

const mapPartnerPhone = (item: PartnerPhoneData["items"][number]): PartnerOfflinePhoneV1 => ({
  ref: String(item.ref || ""),
  name: String(item.name || ""),
  identifierMasked: maskPartnerIdentifier(item.identifier),
  status: item.status ? String(item.status) : null,
  purchaseDate: item.purchaseDate ? String(item.purchaseDate) : null,
  settlement: {
    code: item.settlement.code,
    label: String(item.settlement.label || ""),
    amount: Math.max(0, Number(item.settlement.amount || 0)),
    paidAmount: Math.max(0, Number(item.settlement.paidAmount || 0)),
    remainingAmount: Math.max(0, Number(item.settlement.remainingAmount || 0)),
    lastPaymentDate: item.settlement.lastPaymentDate ? String(item.settlement.lastPaymentDate) : null,
  },
});

export const buildCustomerMiniAppSnapshotCandidate = async (
  customerId: number,
  context: SnapshotBuildContext,
  service?: CustomerSnapshotService,
): Promise<MiniAppSnapshotCandidateV1<CustomerOfflineSnapshotV1> | null> => {
  const customerService = service || await getDefaultCustomerService();
  const [home, account, installmentSummaries, purchases, invoiceSummaries] = await Promise.all([
    customerService.getHome(customerId),
    customerService.getAccount(customerId),
    customerService.listInstallments(customerId),
    customerService.listPurchases(customerId, MINIAPP_SNAPSHOT_LIMITS.customerPurchases),
    customerService.listInvoices(customerId, MINIAPP_SNAPSHOT_LIMITS.customerInvoices),
  ]);
  if (!home || !account || !purchases || !invoiceSummaries) return null;

  const active = installmentSummaries
    .filter((item) => !isClosedInstallment(item))
    .sort(bySaleDateNewest)
    .slice(0, MINIAPP_SNAPSHOT_LIMITS.customerActiveInstallments);
  const recentClosed = installmentSummaries
    .filter(isClosedInstallment)
    .sort(bySaleDateNewest)
    .slice(0, MINIAPP_SNAPSHOT_LIMITS.customerRecentClosedInstallments);
  const selectedInstallments = [...active, ...recentClosed];

  const details = (await Promise.all(
    selectedInstallments.map((item) => customerService.getInstallmentDetail(customerId, Number(item.id))),
  )).filter((item): item is CustomerInstallmentDetail => Boolean(item));

  const invoices = (await Promise.all(
    invoiceSummaries.slice(0, MINIAPP_SNAPSHOT_LIMITS.customerInvoices).map(async (summary) => {
      if (!summary.invoiceRef) return null;
      const detail = await customerService.getInvoiceDetail(customerId, summary.invoiceRef);
      return detail ? { ref: summary.invoiceRef, summary, detail } : null;
    }),
  )).filter((item): item is NonNullable<typeof item> => Boolean(item));

  const data: CustomerOfflineSnapshotV1 = {
    profile: { displayName: String(home.customer.fullName || "مشتری کوروش") },
    account: {
      signedBalance: Number(account.account.signedBalance || 0),
      code: account.account.code,
      label: account.account.label,
      amount: Math.max(0, Number(account.account.amount || 0)),
      totalDebit: Math.max(0, Number(account.totalDebit || 0)),
      totalCredit: Math.max(0, Number(account.totalCredit || 0)),
      recentEntries: account.entries.slice(0, MINIAPP_SNAPSHOT_LIMITS.customerLedgerEntries).map((entry) => ({
        id: Number(entry.id || 0),
        transactionDate: String(entry.transactionDate || ""),
        description: String(entry.description || ""),
        debit: Math.max(0, Number(entry.debit || 0)),
        credit: Math.max(0, Number(entry.credit || 0)),
        balance: Number(entry.balance || 0),
      })),
    },
    installments: { active, recentClosed, details },
    purchases: purchases.slice(0, MINIAPP_SNAPSHOT_LIMITS.customerPurchases),
    invoices,
  };

  return assertValidMiniAppSnapshotCandidate({
    ...candidateEnvelope(context, "customer", customerId),
    data,
  });
};

export const buildPartnerMiniAppSnapshotCandidate = async (
  partnerId: number,
  context: SnapshotBuildContext,
  service?: PartnerSnapshotService,
): Promise<MiniAppSnapshotCandidateV1<PartnerOfflineSnapshotV1> | null> => {
  const partnerService = service || await getDefaultPartnerService();
  const [home, account, ledger, purchases, phones] = await Promise.all([
    partnerService.getHome(partnerId),
    partnerService.getAccount(partnerId),
    partnerService.listLedger(partnerId, 1, MINIAPP_SNAPSHOT_LIMITS.partnerLedgerEntries),
    partnerService.listPurchases(partnerId, 1, MINIAPP_SNAPSHOT_LIMITS.partnerPurchases),
    partnerService.listPhones(partnerId, 1, MINIAPP_SNAPSHOT_LIMITS.partnerPhones),
  ]);
  if (!home || !account) return null;

  const data: PartnerOfflineSnapshotV1 = {
    profile: {
      displayName: String(home.partner.name || "همکار کوروش"),
      type: home.partner.type ? String(home.partner.type) : null,
    },
    account: {
      signedBalance: Number(account.account.signedBalance || 0),
      code: account.account.code,
      label: account.account.label,
      amount: Math.max(0, Number(account.account.amount || 0)),
      totalDebit: Math.max(0, Number(account.totalDebit || 0)),
      totalCredit: Math.max(0, Number(account.totalCredit || 0)),
    },
    ledger: {
      recent: ledger.items.slice(0, MINIAPP_SNAPSHOT_LIMITS.partnerLedgerEntries),
    },
    supplied: {
      total: Math.max(0, Number(account.supplied.total || 0)),
      phones: Math.max(0, Number(account.supplied.phones || 0)),
      products: Math.max(0, Number(account.supplied.products || 0)),
      totalSupplyAmount: Math.max(0, Number(account.supplied.totalSupplyAmount || 0)),
    },
    phoneSettlement: {
      total: Math.max(0, Number(account.phoneSettlement.total || 0)),
      open: Math.max(0, Number(account.phoneSettlement.open || 0)),
      settled: Math.max(0, Number(account.phoneSettlement.settled || 0)),
      amount: Math.max(0, Number(account.phoneSettlement.amount || 0)),
      paidAmount: Math.max(0, Number(account.phoneSettlement.paidAmount || 0)),
      remainingAmount: Math.max(0, Number(account.phoneSettlement.remainingAmount || 0)),
    },
    purchases: purchases.items.slice(0, MINIAPP_SNAPSHOT_LIMITS.partnerPurchases).map(mapPartnerPurchase),
    phones: {
      recent: phones.items.slice(0, MINIAPP_SNAPSHOT_LIMITS.partnerPhones).map(mapPartnerPhone),
      summary: {
        total: Math.max(0, Number(phones.summary.total || 0)),
        amount: Math.max(0, Number(phones.summary.amount || 0)),
        paidAmount: Math.max(0, Number(phones.summary.paidAmount || 0)),
        remainingAmount: Math.max(0, Number(phones.summary.remainingAmount || 0)),
      },
    },
  };

  return assertValidMiniAppSnapshotCandidate({
    ...candidateEnvelope(context, "partner", partnerId),
    data,
  });
};


const MANAGER_SNAPSHOT_STRIP_KEYS = new Set([
  // PII / business-sensitive values. Keep this list at least as strict as
  // miniAppSnapshotValidation.FORBIDDEN_DATA_KEYS so a newly returned field
  // cannot make the entire manager snapshot refresh fail.
  "password", "passwordHash", "password_hash",
  "botToken", "bot_token", "initData", "init_data", "sessionToken", "session_token",
  "privateKey", "private_key", "relayCredential", "relayCredentials",
  "proxyCredential", "proxyCredentials",
  "phoneNumber", "phone_number", "email", "contactName", "contact_name",
  "telegramUserId", "telegram_user_id", "localSubjectId", "local_subject_id",
  "nationalCode", "national_code", "address", "identifier", "identifierMasked",
  "imei", "imei2", "serialNumber", "serial_number",
  "purchasePrice", "purchase_price", "currentPurchasePrice", "current_purchase_price",
  "internalProfit", "internal_profit",
]);

const sanitizeManagerSnapshotValue = (value: unknown): any => {
  if (Array.isArray(value)) return value.map(sanitizeManagerSnapshotValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !MANAGER_SNAPSHOT_STRIP_KEYS.has(key))
    .map(([key, child]) => [key, sanitizeManagerSnapshotValue(child)]));
};

const compactPagedManagerValue = (value: any, limit: number): any => {
  const sanitized = sanitizeManagerSnapshotValue(value);
  if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) return sanitized;
  if (!Array.isArray(sanitized.items)) return sanitized;
  return { ...sanitized, items: sanitized.items.slice(0, Math.max(0, limit)) };
};

const compactManagerAccountingValue = (value: any): any => {
  const sanitized = sanitizeManagerSnapshotValue(value);
  if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) return sanitized;
  return {
    ...sanitized,
    ...(Array.isArray(sanitized.profitAllocations)
      ? { profitAllocations: sanitized.profitAllocations.slice(0, MINIAPP_SNAPSHOT_LIMITS.managerAccountingAllocations) }
      : {}),
  };
};


const compactRecordEntries = (value: Record<string, unknown> | undefined, limit: number): Record<string, unknown> =>
  Object.fromEntries(Object.entries(value || {}).slice(0, Math.max(0, limit)));

const compactManagerSnapshotForEdge = (data: ManagerOfflineSnapshotV1, aggressive = false): ManagerOfflineSnapshotV1 => {
  const directoryLimit = aggressive ? 6 : 12;
  const detailLimit = aggressive ? 4 : 8;
  const listLimit = aggressive ? 8 : 16;
  const compactDirectory = (value: any) => {
    const sanitized = sanitizeManagerSnapshotValue(value);
    if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) return sanitized;
    return Array.isArray(sanitized.items) ? { ...sanitized, items: sanitized.items.slice(0, directoryLimit) } : sanitized;
  };
  const compactPaged = (value: any) => {
    const sanitized = sanitizeManagerSnapshotValue(value);
    if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) return sanitized;
    return Array.isArray(sanitized.items) ? { ...sanitized, items: sanitized.items.slice(0, listLimit) } : sanitized;
  };

  return {
    profile: data.profile,
    permissions: data.permissions,
    ...(data.dashboard !== undefined ? { dashboard: sanitizeManagerSnapshotValue(data.dashboard) } : {}),
    sales: sanitizeManagerSnapshotValue(data.sales || {}),
    dues: Object.fromEntries(Object.entries(data.dues || {}).map(([key, value]) => [key, compactPaged(value)])),
    installmentDetails: compactRecordEntries(data.installmentDetails, aggressive ? 4 : 8),
    ...(data.customers ? { customers: {
      directory: compactDirectory(data.customers.directory),
      details: compactRecordEntries(data.customers.details, detailLimit),
      ledger: compactRecordEntries(data.customers.ledger, detailLimit),
      purchases: compactRecordEntries(data.customers.purchases, detailLimit),
      installments: compactRecordEntries(data.customers.installments, detailLimit),
    } } : {}),
    ...(data.partners ? { partners: {
      directory: compactDirectory(data.partners.directory),
      details: compactRecordEntries(data.partners.details, detailLimit),
      ledger: compactRecordEntries(data.partners.ledger, detailLimit),
      purchases: compactRecordEntries(data.partners.purchases, detailLimit),
      settlements: compactRecordEntries(data.partners.settlements, detailLimit),
      accounting: compactRecordEntries(data.partners.accounting, detailLimit),
    } } : {}),
    ...(data.repairs !== undefined ? { repairs: compactPaged(data.repairs) } : {}),
    ...(data.inventoryPhones !== undefined ? { inventoryPhones: compactPaged(data.inventoryPhones) } : {}),
    ...(data.notifications !== undefined ? { notifications: compactPaged(data.notifications) } : {}),
  };
};

const managerCandidateWithSafeFallback = (
  envelope: Omit<MiniAppSnapshotCandidateV1<ManagerOfflineSnapshotV1>, "data">,
  data: ManagerOfflineSnapshotV1,
): MiniAppSnapshotCandidateV1<ManagerOfflineSnapshotV1> => {
  const attempts: ManagerOfflineSnapshotV1[] = [
    data,
    compactManagerSnapshotForEdge(data, false),
    compactManagerSnapshotForEdge(data, true),
    {
      profile: data.profile,
      permissions: data.permissions,
      ...(data.dashboard !== undefined ? { dashboard: sanitizeManagerSnapshotValue(data.dashboard) } : {}),
      sales: sanitizeManagerSnapshotValue(data.sales || {}),
      dues: {},
      installmentDetails: {},
    },
  ];

  for (const attempt of attempts) {
    const candidate = { ...envelope, data: attempt } as MiniAppSnapshotCandidateV1<ManagerOfflineSnapshotV1>;
    const validation = validateMiniAppSnapshotCandidate(candidate);
    if (validation.ok) return candidate;
    // Only payload-shape/size problems are eligible for a compact fallback.
    // Authorization/identity/permission failures remain fail-closed.
    if (validation.issues.some((issue) =>
      !issue.startsWith("forbidden_data_key:") && issue !== "snapshot_size_limit_exceeded"
    )) return assertValidMiniAppSnapshotCandidate(candidate) as MiniAppSnapshotCandidateV1<ManagerOfflineSnapshotV1>;
  }

  return assertValidMiniAppSnapshotCandidate({ ...envelope, data: attempts.at(-1)! }) as MiniAppSnapshotCandidateV1<ManagerOfflineSnapshotV1>;
};

export const buildManagerMiniAppSnapshotCandidate = async (
  userId: number,
  context: SnapshotBuildContext,
): Promise<MiniAppSnapshotCandidateV1<ManagerOfflineSnapshotV1> | null> => {
  const [{ getAsync }, { resolveUserTenantAuthorization }, { miniAppManagerService }, notificationsDb] = await Promise.all([
    import("../../db/query"),
    import("../../db/domains/accessControl.db"),
    import("../../services/miniAppManager.service"),
    import("../../db/domains/managerNotifications.db"),
  ]);
  const authorization = await resolveUserTenantAuthorization(userId);
  if (!authorization || authorization.status !== "active" || !authorization.permissions?.length) return null;
  const permissions = [...new Set((authorization.permissions || []).map(String))];
  const snapshotPermissions = permissions.filter((permission) => permission.endsWith(".read"));
  if (!snapshotPermissions.length) return null;
  const user: any = await getAsync(`SELECT u.id,u.username,u.firstName,u.lastName,r.name AS roleName
    FROM users u JOIN roles r ON r.id=u.roleId WHERE u.id=? LIMIT 1`, [userId]);
  if (!user?.id) return null;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "مدیر کوروش";
  const has = (permission: string) => permissions.includes(permission);
  const data: ManagerOfflineSnapshotV1 = {
    profile: { displayName: String(displayName), roleName: user.roleName ? String(user.roleName) : null },
    permissions: snapshotPermissions,
    sales: {},
    dues: {},
    installmentDetails: {},
  };

  if (has("dashboard.read")) data.dashboard = sanitizeManagerSnapshotValue(await miniAppManagerService.getDashboard(permissions));
  if (has("sales.read") || has("profits.read")) {
    for (const period of ["today", "week", "month"] as const) {
      data.sales[period] = sanitizeManagerSnapshotValue(await miniAppManagerService.getSalesSummary(period, permissions));
    }
  }

  if (has("customers.read")) {
    const directory: any = await miniAppManagerService.listCustomers({ page: 1, pageSize: MINIAPP_SNAPSHOT_LIMITS.managerCustomers, q: "" }, permissions);
    const items = (directory?.items || []).slice(0, MINIAPP_SNAPSHOT_LIMITS.managerCustomers);
    const details: Record<string, unknown> = {}, ledger: Record<string, unknown> = {}, purchases: Record<string, unknown> = {}, installments: Record<string, unknown> = {};
    for (const row of items) {
      const id = Number(row?.id || 0); if (!id) continue;
      const detail = await miniAppManagerService.getCustomer(id, permissions);
      if (detail) details[String(id)] = sanitizeManagerSnapshotValue(detail);
      if (has("customers.ledger.read")) {
        const value = await miniAppManagerService.listCustomerLedger(id, { page: 1, pageSize: MINIAPP_SNAPSHOT_LIMITS.managerLedgerEntries });
        if (value) ledger[String(id)] = compactPagedManagerValue(value, MINIAPP_SNAPSHOT_LIMITS.managerLedgerEntries);
      }
      if (has("sales.read")) {
        const value = await miniAppManagerService.listCustomerPurchases(id, { page: 1, pageSize: MINIAPP_SNAPSHOT_LIMITS.managerPurchases });
        if (value) purchases[String(id)] = compactPagedManagerValue(value, MINIAPP_SNAPSHOT_LIMITS.managerPurchases);
      }
      if (has("installments.read")) {
        const value = await miniAppManagerService.listCustomerInstallments(id);
        if (value) installments[String(id)] = sanitizeManagerSnapshotValue((value as any[]).slice(0, MINIAPP_SNAPSHOT_LIMITS.managerInstallments));
      }
    }
    data.customers = { directory: sanitizeManagerSnapshotValue({ ...directory, items }), details, ledger, purchases, installments };
  }

  if (has("partners.read")) {
    const directory: any = await miniAppManagerService.listPartners({ page: 1, pageSize: MINIAPP_SNAPSHOT_LIMITS.managerPartners, q: "" }, permissions);
    const items = (directory?.items || []).slice(0, MINIAPP_SNAPSHOT_LIMITS.managerPartners);
    const details: Record<string, unknown> = {}, ledger: Record<string, unknown> = {}, purchases: Record<string, unknown> = {}, settlements: Record<string, unknown> = {}, accounting: Record<string, unknown> = {};
    for (const row of items) {
      const id = Number(row?.id || 0); if (!id) continue;
      const detail = await miniAppManagerService.getPartner(id, permissions);
      if (detail) details[String(id)] = sanitizeManagerSnapshotValue(detail);
      const p = await miniAppManagerService.listPartnerPurchases(id, { page: 1, pageSize: MINIAPP_SNAPSHOT_LIMITS.managerPurchases });
      if (p) purchases[String(id)] = compactPagedManagerValue(p, MINIAPP_SNAPSHOT_LIMITS.managerPurchases);
      if (has("partners.ledger.read")) {
        const l = await miniAppManagerService.listPartnerLedger(id, { page: 1, pageSize: MINIAPP_SNAPSHOT_LIMITS.managerLedgerEntries });
        if (l) ledger[String(id)] = compactPagedManagerValue(l, MINIAPP_SNAPSHOT_LIMITS.managerLedgerEntries);
        const st = await miniAppManagerService.listPartnerSettlements(id, { page: 1, pageSize: MINIAPP_SNAPSHOT_LIMITS.managerPurchases });
        if (st) settlements[String(id)] = compactPagedManagerValue(st, MINIAPP_SNAPSHOT_LIMITS.managerPurchases);
        if (has("profits.read")) {
          const a = await miniAppManagerService.getPartnerAccountingBreakdown(id);
          if (a) accounting[String(id)] = compactManagerAccountingValue(a);
        }
      }
    }
    data.partners = { directory: sanitizeManagerSnapshotValue({ ...directory, items }), details, ledger, purchases, settlements, accounting };
  }

  if (has("installments.read")) {
    const saleIds = new Set<number>();
    for (const scope of ["overdue", "today", "next7"] as const) {
      const due: any = await miniAppManagerService.listDueInstallments({ scope, page: 1, pageSize: 50 });
      data.dues[scope] = compactPagedManagerValue(due, MINIAPP_SNAPSHOT_LIMITS.managerDueItems);
      for (const item of (due?.items || []).slice(0, MINIAPP_SNAPSHOT_LIMITS.managerDueItems)) { const saleId = Number(item?.saleId || 0); if (saleId > 0) saleIds.add(saleId); }
    }
    for (const saleId of [...saleIds].slice(0, MINIAPP_SNAPSHOT_LIMITS.managerDueItems)) {
      const detail = await miniAppManagerService.getInstallmentDetail(saleId);
      if (detail) data.installmentDetails[String(saleId)] = sanitizeManagerSnapshotValue(detail);
    }
  }
  if (has("repairs.read")) data.repairs = sanitizeManagerSnapshotValue(await miniAppManagerService.listRepairs({ page: 1, pageSize: MINIAPP_SNAPSHOT_LIMITS.managerRepairs, q: "" }));
  if (has("inventory.read")) data.inventoryPhones = sanitizeManagerSnapshotValue(await miniAppManagerService.listInventoryPhones({ page: 1, limit: MINIAPP_SNAPSHOT_LIMITS.managerInventoryPhones, q: "" }));
  try {
    const inbox = await notificationsDb.listManagerInAppNotifications(userId, { limit: MINIAPP_SNAPSHOT_LIMITS.managerNotifications, unreadOnly: false });
    data.notifications = sanitizeManagerSnapshotValue(inbox);
  } catch {}

  const managerContext = { ...context, authorizationLeaseMs: MINIAPP_MANAGER_SNAPSHOT_AUTHORIZATION_LEASE_MS };
  const envelope = candidateEnvelope(managerContext, "manager", userId) as Omit<MiniAppSnapshotCandidateV1<ManagerOfflineSnapshotV1>, "data">;
  return managerCandidateWithSafeFallback(envelope, data);
};

export const buildMiniAppSnapshotRevocationCandidate = (
  subjectKind: "customer" | "partner" | "manager",
  localSubjectId: number,
  context: SnapshotBuildContext,
): MiniAppSnapshotCandidateV1 => assertValidMiniAppSnapshotCandidate({
  ...candidateEnvelope(subjectKind === "manager"
    ? { ...context, authorizationLeaseMs: MINIAPP_MANAGER_SNAPSHOT_AUTHORIZATION_LEASE_MS }
    : context, subjectKind, localSubjectId),
  state: "revoked",
  data: null,
});

/**
 * Phase-5 local materializer used by tests/in-memory storage only. In production,
 * subjectKey must be derived by the authenticated Cloud Edge and not trusted from a browser.
 */
export const materializeStoredMiniAppSnapshot = (
  candidate: MiniAppSnapshotCandidateV1,
  input: { subjectKey: string; receivedAt?: Date },
): MiniAppStoredSnapshotV1 => {
  assertValidMiniAppSnapshotCandidate(candidate);
  if (!isValidSnapshotSubjectKey(input.subjectKey)) {
    throw Object.assign(new Error("MINIAPP_SNAPSHOT_SUBJECT_KEY_INVALID"), { code: "MINIAPP_SNAPSHOT_SUBJECT_KEY_INVALID" });
  }
  const withoutHash: Omit<MiniAppStoredSnapshotV1, "contentHash"> = {
    schemaVersion: candidate.schemaVersion,
    tenantId: candidate.tenantId,
    installationId: candidate.installationId,
    subjectKind: candidate.subjectKind,
    subjectKey: input.subjectKey,
    snapshotVersion: candidate.snapshotVersion,
    generatedAt: candidate.generatedAt,
    receivedAt: iso(input.receivedAt ? new Date(input.receivedAt) : new Date()),
    authorizationValidUntil: candidate.authorizationValidUntil,
    state: candidate.state,
    data: candidate.data,
  };
  const stored: MiniAppStoredSnapshotV1 = {
    ...withoutHash,
    contentHash: computeStoredMiniAppSnapshotContentHash(withoutHash),
  };
  return assertValidStoredMiniAppSnapshot(stored);
};
