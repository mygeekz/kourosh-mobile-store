import type {
  CustomerAccountState,
  CustomerInstallmentDetail,
  CustomerInstallmentSummary,
  CustomerInvoiceDetail,
  CustomerPurchase,
  PartnerAccountState,
  PartnerLedgerEntry,
  PartnerSettlementSummary,
  PartnerSupplySummary,
} from "../../../miniapp/types";

export const MINIAPP_SNAPSHOT_SCHEMA_VERSION = "1" as const;
export const MINIAPP_SNAPSHOT_MAX_BYTES = 512 * 1024;
export const MINIAPP_MANAGER_SNAPSHOT_AUTHORIZATION_LEASE_MS = 60 * 60 * 1000;
export const MINIAPP_SNAPSHOT_AUTHORIZATION_LEASE_MS = 72 * 60 * 60 * 1000;

export const MINIAPP_SNAPSHOT_LIMITS = Object.freeze({
  customerLedgerEntries: 25,
  customerActiveInstallments: 50,
  customerRecentClosedInstallments: 12,
  customerPurchases: 50,
  customerInvoices: 50,
  partnerLedgerEntries: 50,
  partnerPurchases: 50,
  partnerPhones: 50,
  managerCustomers: 24,
  managerPartners: 24,
  managerLedgerEntries: 8,
  managerPurchases: 6,
  managerInstallments: 10,
  managerDueItems: 20,
  managerAccountingAllocations: 8,
  managerRepairs: 40,
  managerInventoryPhones: 40,
  managerNotifications: 30,
});

export type MiniAppSnapshotSubjectKind = "customer" | "partner" | "manager";
export type MiniAppSnapshotState = "active" | "revoked";

export type CustomerOfflineInvoiceV1 = {
  ref: string;
  summary: CustomerPurchase;
  detail: CustomerInvoiceDetail;
};

export type CustomerOfflineSnapshotV1 = {
  profile: {
    displayName: string;
  };
  account: CustomerAccountState & {
    totalDebit: number;
    totalCredit: number;
    recentEntries: Array<{
      id: number;
      transactionDate: string;
      description: string;
      debit: number;
      credit: number;
      balance: number;
    }>;
  };
  installments: {
    active: CustomerInstallmentSummary[];
    recentClosed: CustomerInstallmentSummary[];
    details: CustomerInstallmentDetail[];
  };
  purchases: CustomerPurchase[];
  invoices: CustomerOfflineInvoiceV1[];
};

export type PartnerOfflinePurchaseV1 = {
  ref: string;
  type: "phone" | "product";
  name: string;
  quantity: number;
  unit: string;
  supplyAmount: number;
  purchaseDate: string | null;
  identifierMasked: string | null;
  status: string | null;
  settlement: null | {
    code: "open" | "settled";
    label: string;
    amount: number;
    paidAmount: number;
    remainingAmount: number;
    lastPaymentDate: string | null;
  };
};

export type PartnerOfflinePhoneV1 = {
  ref: string;
  name: string;
  identifierMasked: string | null;
  status: string | null;
  purchaseDate: string | null;
  settlement: NonNullable<PartnerOfflinePurchaseV1["settlement"]>;
};

export type PartnerOfflineSnapshotV1 = {
  profile: {
    displayName: string;
    type: string | null;
  };
  account: PartnerAccountState & {
    totalDebit: number;
    totalCredit: number;
  };
  ledger: {
    recent: PartnerLedgerEntry[];
  };
  supplied: PartnerSupplySummary;
  phoneSettlement: PartnerSettlementSummary;
  purchases: PartnerOfflinePurchaseV1[];
  phones: {
    recent: PartnerOfflinePhoneV1[];
    summary: {
      total: number;
      amount: number;
      paidAmount: number;
      remainingAmount: number;
    };
  };
};


export type ManagerOfflineSnapshotV1 = {
  profile: {
    displayName: string;
    roleName: string | null;
  };
  permissions: string[];
  dashboard?: unknown;
  sales: Partial<Record<"today" | "week" | "month", unknown>>;
  customers?: {
    directory: unknown;
    details: Record<string, unknown>;
    ledger: Record<string, unknown>;
    purchases: Record<string, unknown>;
    installments: Record<string, unknown>;
  };
  partners?: {
    directory: unknown;
    details: Record<string, unknown>;
    ledger: Record<string, unknown>;
    purchases: Record<string, unknown>;
    settlements: Record<string, unknown>;
    accounting: Record<string, unknown>;
  };
  dues: Partial<Record<"overdue" | "today" | "next7", unknown>>;
  installmentDetails: Record<string, unknown>;
  repairs?: unknown;
  inventoryPhones?: unknown;
  notifications?: unknown;
};

export type MiniAppSnapshotDataV1 = CustomerOfflineSnapshotV1 | PartnerOfflineSnapshotV1 | ManagerOfflineSnapshotV1;

/**
 * Local-only candidate. telegramUserId/localSubjectId are routing inputs for the future
 * authenticated outbound sync and MUST NOT be persisted in cloud snapshot storage.
 */
export type MiniAppSnapshotCandidateV1<TData extends MiniAppSnapshotDataV1 = MiniAppSnapshotDataV1> = {
  schemaVersion: typeof MINIAPP_SNAPSHOT_SCHEMA_VERSION;
  tenantId: string;
  installationId: string;
  subjectKind: MiniAppSnapshotSubjectKind;
  localSubjectId: number;
  telegramUserId: string;
  snapshotVersion: number;
  generatedAt: string;
  authorizationValidUntil: string;
  state: MiniAppSnapshotState;
  data: TData | null;
};

/**
 * Cloud-safe storage document. It intentionally contains neither telegramUserId nor
 * localSubjectId. subjectKey is an opaque edge-derived key (for example HMAC output).
 */
export type MiniAppStoredSnapshotV1<TData extends MiniAppSnapshotDataV1 = MiniAppSnapshotDataV1> = {
  schemaVersion: typeof MINIAPP_SNAPSHOT_SCHEMA_VERSION;
  tenantId: string;
  installationId: string;
  subjectKind: MiniAppSnapshotSubjectKind;
  subjectKey: string;
  snapshotVersion: number;
  generatedAt: string;
  receivedAt: string;
  authorizationValidUntil: string;
  state: MiniAppSnapshotState;
  data: TData | null;
  contentHash: string;
};
