import assert from "node:assert/strict";

import {
  buildCustomerMiniAppSnapshotCandidate,
  buildMiniAppSnapshotRevocationCandidate,
  buildPartnerMiniAppSnapshotCandidate,
  materializeStoredMiniAppSnapshot,
} from "../server/cloud/snapshots/miniAppSnapshotBuilder.ts";
import { createInMemoryMiniAppSnapshotStore } from "../server/cloud/snapshots/inMemoryMiniAppSnapshotStore.ts";
import {
  computeStoredMiniAppSnapshotContentHash,
  validateMiniAppSnapshotCandidate,
  validateStoredMiniAppSnapshot,
} from "../server/cloud/snapshots/miniAppSnapshotValidation.ts";
import { MINIAPP_SNAPSHOT_MAX_BYTES } from "../server/cloud/snapshots/miniAppSnapshotContracts.ts";

const installationId = "inst_abcdefghijklmnopqrstuvwx";
const tenantId = "tenant_store_001";
const telegramUserId = "123456789";
const customerSubjectKey = `sub_${"A".repeat(43)}`;
const partnerSubjectKey = `sub_${"B".repeat(43)}`;
const now = new Date("2026-08-14T12:30:00.000Z");

const customerService = {
  getHome: async () => ({
    customer: { id: 7, fullName: "مشتری نمونه", phoneNumber: "09120000000" },
    account: { signedBalance: 9000, code: "debtor", label: "بدهکار", amount: 9000 },
    installments: { activeCount: 1, overdueCount: 0, next: null },
    lastPurchase: null,
  }),
  getAccount: async () => ({
    account: { signedBalance: 9000, code: "debtor", label: "بدهکار", amount: 9000 },
    totalDebit: 12000,
    totalCredit: 3000,
    entries: [{ id: 1, transactionDate: "1405/05/23", description: "خرید", debit: 12000, credit: 0, balance: 12000 }],
    purchasePrice: 777,
  }),
  listInstallments: async () => [
    { id: 11, saleType: "installment", itemsSummary: "گوشی", saleDate: "1405/05/20", totalAmount: 20000, downPayment: 5000, collectedAmount: 5000, remainingAmount: 15000, installmentCount: 3, paidInstallmentCount: 1, remainingInstallmentCount: 2, nextDueDate: "1405/06/20", nextDueAmount: 7500, overdueCount: 0, status: "در حال پرداخت" },
    { id: 10, saleType: "installment", itemsSummary: "کالا", saleDate: "1405/04/20", totalAmount: 10000, downPayment: 10000, collectedAmount: 10000, remainingAmount: 0, installmentCount: 1, paidInstallmentCount: 1, remainingInstallmentCount: 0, nextDueDate: null, nextDueAmount: 0, overdueCount: 0, status: "تکمیل شده" },
  ],
  getInstallmentDetail: async (_customerId, saleId) => ({
    id: saleId,
    saleType: "installment",
    itemsSummary: "گوشی",
    saleDate: "1405/05/20",
    totalAmount: 20000,
    downPayment: 5000,
    collectedAmount: 5000,
    remainingAmount: 15000,
    installmentCount: 3,
    paidInstallmentCount: 1,
    remainingInstallmentCount: 2,
    nextDueDate: "1405/06/20",
    nextDueAmount: 7500,
    overdueCount: 0,
    status: saleId === 10 ? "تکمیل شده" : "در حال پرداخت",
    items: [{ description: "گوشی", quantity: 1, unitPrice: 20000, totalPrice: 20000 }],
    timeline: [{ id: 1, installmentNumber: 1, dueDate: "1405/05/20", amount: 5000, paidAmount: 5000, remainingAmount: 0, paymentDate: "1405/05/20", state: "paid" }],
    checks: [{ id: 1, dueDate: "1405/06/20", amount: 7500, bankName: "بانک نمونه", status: "نزد فروشنده" }],
  }),
  listPurchases: async () => [{ ref: "sales_order-9", source: "sales_order", id: 9, transactionDate: "1405/05/20", itemsSummary: "گوشی", quantity: 1, totalAmount: 20000, purchaseType: "cash", purchaseTypeLabel: "نقدی", invoiceRef: "order-9" }],
  listInvoices: async () => [{ ref: "sales_order-9", source: "sales_order", id: 9, transactionDate: "1405/05/20", itemsSummary: "گوشی", quantity: 1, totalAmount: 20000, purchaseType: "cash", purchaseTypeLabel: "نقدی", invoiceRef: "order-9" }],
  getInvoiceDetail: async () => ({
    business: { name: "فروشگاه کوروش", logoUrl: "/logo.png" }, invoiceNumber: "9", transactionDate: "1405/05/20", paymentMethod: "cash", paymentMethodLabel: "نقدی", status: "تکمیل", items: [{ id: 1, description: "گوشی", quantity: 1, unitPrice: 20000, discountAmount: 0, totalPrice: 20000 }], totals: { subtotal: 20000, itemsDiscount: 0, globalDiscount: 0, taxAmount: 0, grandTotal: 20000 },
  }),
};

const partnerService = {
  getHome: async () => ({
    partner: { id: 5, name: "همکار نمونه", type: "تامین‌کننده", contactName: "محرمانه", phoneNumber: "09121111111", email: "private@example.com" },
    account: { signedBalance: 250000, code: "creditor", label: "بستانکار از فروشگاه", amount: 250000 },
    ledger: { total: 1, lastActivity: "1405/05/23", recent: [] },
    supplied: { total: 2, phones: 1, products: 1, totalSupplyAmount: 500000 },
    phoneSettlement: { total: 1, open: 1, settled: 0, amount: 300000, paidAmount: 50000, remainingAmount: 250000 },
  }),
  getAccount: async () => ({
    partner: { id: 5, name: "همکار نمونه", type: "تامین‌کننده", contactName: "محرمانه", phoneNumber: "09121111111", email: "private@example.com" },
    account: { signedBalance: 250000, code: "creditor", label: "بستانکار از فروشگاه", amount: 250000 },
    totalDebit: 100000,
    totalCredit: 350000,
    supplied: { total: 2, phones: 1, products: 1, totalSupplyAmount: 500000 },
    phoneSettlement: { total: 1, open: 1, settled: 0, amount: 300000, paidAmount: 50000, remainingAmount: 250000 },
  }),
  listLedger: async () => ({ items: [{ id: 3, transactionDate: "1405/05/23", description: "تسویه", debit: 0, credit: 50000, balance: 250000 }], page: 1, pageSize: 50, total: 1, totalPages: 1, account: { signedBalance: 250000, code: "creditor", label: "بستانکار از فروشگاه", amount: 250000 } }),
  listPurchases: async () => ({ items: [{ ref: "phone-3", type: "phone", name: "Phone X", quantity: 1, unit: "عدد", supplyAmount: 300000, purchaseDate: "1405/05/20", identifier: "123456789012345", status: "موجود", settlement: { code: "open", label: "تسویه‌نشده", amount: 300000, paidAmount: 50000, remainingAmount: 250000, lastPaymentDate: "1405/05/23" }, purchasePrice: 999999 }], page: 1, pageSize: 50, total: 1, totalPages: 1 }),
  listPhones: async () => ({ items: [{ ref: "phone-3", name: "Phone X", identifier: "123456789012345", status: "موجود", purchaseDate: "1405/05/20", settlement: { code: "open", label: "تسویه‌نشده", amount: 300000, paidAmount: 50000, remainingAmount: 250000, lastPaymentDate: "1405/05/23" } }], page: 1, pageSize: 50, total: 1, totalPages: 1, summary: { total: 1, amount: 300000, paidAmount: 50000, remainingAmount: 250000 } }),
};

const customerCandidate = await buildCustomerMiniAppSnapshotCandidate(7, { tenantId, installationId, telegramUserId, snapshotVersion: 1, now }, customerService);
assert(customerCandidate);
assert.equal(customerCandidate.subjectKind, "customer");
assert.equal(customerCandidate.data.profile.displayName, "مشتری نمونه");
assert.equal(customerCandidate.data.account.recentEntries.length, 1);
assert.equal(customerCandidate.data.installments.active.length, 1);
assert.equal(customerCandidate.data.installments.recentClosed.length, 1);
assert.equal(customerCandidate.data.invoices.length, 1);
assert.equal(validateMiniAppSnapshotCandidate(customerCandidate).ok, true);


const longLeaseCandidate = await buildCustomerMiniAppSnapshotCandidate(7, { tenantId, installationId, telegramUserId, snapshotVersion: 3, now, authorizationLeaseMs: 30 * 24 * 60 * 60 * 1000 }, customerService);
assert(longLeaseCandidate);
assert.equal(Date.parse(longLeaseCandidate.authorizationValidUntil) - Date.parse(longLeaseCandidate.generatedAt), 72 * 60 * 60 * 1000, "authorization lease must be capped at 72 hours");

const partnerCandidate = await buildPartnerMiniAppSnapshotCandidate(5, { tenantId, installationId, telegramUserId: "987654321", snapshotVersion: 1, now }, partnerService);
assert(partnerCandidate);
assert.equal(partnerCandidate.subjectKind, "partner");
assert.equal(partnerCandidate.data.account.signedBalance, 250000);
assert.equal(partnerCandidate.data.account.code, "creditor");
assert.equal(partnerCandidate.data.account.label, "بستانکار از فروشگاه");
assert.equal(partnerCandidate.data.purchases[0].identifierMasked, "****2345");
assert.equal(partnerCandidate.data.phones.recent[0].identifierMasked, "****2345");
const partnerJson = JSON.stringify(partnerCandidate.data);
assert.doesNotMatch(partnerJson, /09121111111|private@example\.com|123456789012345|purchasePrice|contactName|phoneNumber/);

const customerStored = materializeStoredMiniAppSnapshot(customerCandidate, { subjectKey: customerSubjectKey, receivedAt: new Date("2026-08-14T12:30:10.000Z") });
assert.equal(validateStoredMiniAppSnapshot(customerStored).ok, true);
const customerStoredJson = JSON.stringify(customerStored);
assert.doesNotMatch(customerStoredJson, new RegExp(telegramUserId));
assert.doesNotMatch(customerStoredJson, /localSubjectId/);
assert.match(customerStored.contentHash, /^[a-f0-9]{64}$/);

const partnerStored = materializeStoredMiniAppSnapshot(partnerCandidate, { subjectKey: partnerSubjectKey, receivedAt: new Date("2026-08-14T12:30:11.000Z") });
assert.equal(validateStoredMiniAppSnapshot(partnerStored).ok, true);

const retriedReceipt = materializeStoredMiniAppSnapshot(customerCandidate, { subjectKey: customerSubjectKey, receivedAt: new Date("2026-08-14T12:31:00.000Z") });
assert.equal(retriedReceipt.contentHash, customerStored.contentHash, "receivedAt must not change idempotency/content identity");

const forbidden = structuredClone(customerStored);
forbidden.data.purchasePrice = 123;
forbidden.contentHash = computeStoredMiniAppSnapshotContentHash(forbidden);
assert(validateStoredMiniAppSnapshot(forbidden).issues.some((issue) => issue.includes("forbidden_data_key")));

const oversized = structuredClone(customerStored);
oversized.data.profile.displayName = "x".repeat(MINIAPP_SNAPSHOT_MAX_BYTES + 1024);
oversized.contentHash = computeStoredMiniAppSnapshotContentHash(oversized);
assert(validateStoredMiniAppSnapshot(oversized).issues.includes("snapshot_size_limit_exceeded"));

const revoked = buildMiniAppSnapshotRevocationCandidate("customer", 7, { tenantId, installationId, telegramUserId, snapshotVersion: 2, now: new Date("2026-08-14T13:00:00.000Z") });
assert.equal(revoked.state, "revoked");
assert.equal(revoked.data, null);

const store = createInMemoryMiniAppSnapshotStore();
assert.equal(store.upsert(customerStored).status, "inserted");
assert.equal(store.upsert(retriedReceipt).status, "idempotent");

const conflicting = structuredClone(customerStored);
conflicting.data.profile.displayName = "نسخه متناقض";
conflicting.contentHash = computeStoredMiniAppSnapshotContentHash(conflicting);
assert.equal(store.upsert(conflicting).status, "version_conflict_rejected");

const staleCandidate = structuredClone(customerCandidate);
staleCandidate.snapshotVersion = 1;
const staleStored = materializeStoredMiniAppSnapshot(staleCandidate, { subjectKey: customerSubjectKey, receivedAt: new Date("2026-08-14T12:32:00.000Z") });
assert.equal(store.upsert(staleStored).status, "idempotent");

const v2Candidate = structuredClone(customerCandidate);
v2Candidate.snapshotVersion = 2;
v2Candidate.generatedAt = "2026-08-14T13:00:00.000Z";
v2Candidate.authorizationValidUntil = "2026-08-17T13:00:00.000Z";
v2Candidate.data.profile.displayName = "مشتری نمونه بروزشده";
const v2Stored = materializeStoredMiniAppSnapshot(v2Candidate, { subjectKey: customerSubjectKey, receivedAt: new Date("2026-08-14T13:00:05.000Z") });
assert.equal(store.upsert(v2Stored).status, "updated");
assert.equal(store.get(tenantId, "customer", customerSubjectKey)?.snapshotVersion, 2);
assert.equal(store.get("tenant_other", "customer", customerSubjectKey), null, "tenant scope must be part of the storage key");


const otherInstallation = structuredClone(v2Stored);
otherInstallation.installationId = "inst_zyxwvutsrqponmlkjihgfedc";
otherInstallation.snapshotVersion = 3;
otherInstallation.contentHash = computeStoredMiniAppSnapshotContentHash(otherInstallation);
assert.equal(store.upsert(otherInstallation).status, "installation_conflict_rejected");

const oldVersionCandidate = structuredClone(customerCandidate);
const oldVersionStored = materializeStoredMiniAppSnapshot(oldVersionCandidate, { subjectKey: customerSubjectKey, receivedAt: new Date("2026-08-14T13:01:00.000Z") });
assert.equal(store.upsert(oldVersionStored).status, "stale_rejected");

console.log(JSON.stringify({
  status: "PASS",
  schemaVersion: customerStored.schemaVersion,
  maxEncodedBytes: MINIAPP_SNAPSHOT_MAX_BYTES,
  customerSnapshot: true,
  partnerSnapshot: true,
  staffSnapshot: false,
  partnerPositiveBalanceSemantics: "creditor_store_owes_partner",
  fullPartnerIdentifierCloudStored: false,
  partnerContactCloudStored: false,
  telegramUserIdCloudStored: false,
  localSubjectIdCloudStored: false,
  contentHashStableAcrossReceiptRetry: true,
  tenantScopedStorageKey: true,
  monotonicVersioning: true,
  tombstoneContract: true,
  authorizationLeaseCappedAt72h: true,
  installationConflictRejected: true,
  networkWrites: false,
  d1Writes: false,
}, null, 2));
