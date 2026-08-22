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
  MINIAPP_SNAPSHOT_AUTHORIZATION_LEASE_MS,
  MINIAPP_SNAPSHOT_LIMITS,
  MINIAPP_SNAPSHOT_SCHEMA_VERSION,
  type CustomerOfflineSnapshotV1,
  type MiniAppSnapshotCandidateV1,
  type MiniAppStoredSnapshotV1,
  type PartnerOfflinePhoneV1,
  type PartnerOfflinePurchaseV1,
  type PartnerOfflineSnapshotV1,
} from "./miniAppSnapshotContracts";
import {
  assertValidMiniAppSnapshotCandidate,
  assertValidStoredMiniAppSnapshot,
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
  subjectKind: "customer" | "partner",
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

export const buildMiniAppSnapshotRevocationCandidate = (
  subjectKind: "customer" | "partner",
  localSubjectId: number,
  context: SnapshotBuildContext,
): MiniAppSnapshotCandidateV1 => assertValidMiniAppSnapshotCandidate({
  ...candidateEnvelope(context, subjectKind, localSubjectId),
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
