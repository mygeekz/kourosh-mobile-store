/* eslint-disable @typescript-eslint/no-explicit-any -- Focused test doubles intentionally model legacy untyped service rows and Express response fragments. */
import assert from "node:assert/strict";
import { miniAppSubjectIdFromSession, requireMiniAppIdentityKind } from "../miniapp/miniAppAuthorization";
import { createMiniAppIdentityRepository } from "../repositories/miniAppIdentity.repo";
import { createMiniAppCustomerService } from "../services/miniAppCustomer.service";
import {
  createMiniAppPartnerService,
  partnerAccountState,
} from "../services/miniAppPartner.service";

const databaseLocked = Object.assign(new Error("database is locked"), { code: "SQLITE_BUSY" });
const failingIdentityRepo = createMiniAppIdentityRepository({
  ensureDatabase: async () => undefined,
  readRows: async () => { throw databaseLocked; },
});
await assert.rejects(
  failingIdentityRepo.findCustomerIdentities("99200123"),
  (error: unknown) => error === databaseLocked,
  "database failures must propagate instead of becoming an unlinked identity",
);

const legacyIdentityRepo = createMiniAppIdentityRepository({
  ensureDatabase: async () => undefined,
  readRows: async (sql) => {
    if (sql.includes("telegram_user_id") || sql.includes("telegram_chat_id")) {
      throw Object.assign(new Error("SQLITE_ERROR: no such column: telegram_user_id"), { code: "SQLITE_ERROR" });
    }
    return [{ id: 17, displayName: "همکار قدیمی" }];
  },
});
assert.deepEqual(
  await legacyIdentityRepo.findCustomerIdentities("99200123"),
  [],
  "legacy Chat ID columns are delivery-only and must not resolve a Mini App identity",
);

const customerDependencies = {
  getCustomerById: async () => ({ id: 17 }),
  getCustomerProfileBundle: async () => ({ profile: { id: 17 }, purchaseHistory: [] }),
  listCustomerLedgerDirectory: async () => ({ items: [], summary: {} }),
  listInstallmentSalesForCustomer: async () => [{ id: 222, customerId: 18, actualSalePrice: 987_654_321 }],
  getInstallmentSaleById: async () => ({
    id: 222,
    customerId: 18,
    actualSalePrice: 987_654_321,
    remainingAmount: 876_543_210,
    payments: [],
    checks: [],
  }),
  fetchSalesOrderInvoice: async () => ({
    customerDetails: { id: 18 },
    financialSummary: { grandTotal: 765_432_109 },
  }),
  fetchLegacyInvoice: async () => ({
    customerDetails: { id: 18 },
    financialSummary: { grandTotal: 765_432_109 },
  }),
};
const customerService = createMiniAppCustomerService(customerDependencies);
assert.equal(await customerService.getInstallmentDetail(17, 222), null);
assert.equal(await customerService.getInvoiceDetail(17, "order-222"), null);
assert.deepEqual(
  await customerService.listInstallments(17),
  [],
  "a cross-customer row injected into the scoped list must be dropped",
);

assert.deepEqual(partnerAccountState(500), {
  code: "creditor",
  label: "بستانکار از فروشگاه",
  amount: 500,
});
assert.deepEqual(partnerAccountState(-500), {
  code: "debtor",
  label: "بدهکار به فروشگاه",
  amount: 500,
});
assert.deepEqual(partnerAccountState(0), {
  code: "settled",
  label: "تسویه کامل",
  amount: 0,
});

const partnerBalanceSemanticsService = createMiniAppPartnerService({
  getPartnerProfileShell: async () => ({
    profile: { id: 17, partnerName: "Partner A", currentBalance: 500 },
    ledgerPreview: [],
    ledgerSummary: { latestBalance: 500, total: 0, totalDebit: 0, totalCredit: 0 },
    purchaseSummary: {},
    soldPhoneSettlementSummary: {},
  }),
  listPartnerLedgerDirectory: async () => ({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
    summary: { latestBalance: 500 },
  }),
  listPartnerPurchaseDirectory: async () => ({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 }),
  listPartnerPhoneSettlementDirectory: async () => ({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1, filteredSummary: {} }),
});
const canonicalPositivePartnerAccount = {
  signedBalance: 500,
  code: "creditor",
  label: "بستانکار از فروشگاه",
  amount: 500,
};
assert.deepEqual(
  (await partnerBalanceSemanticsService.getHome(17))?.account,
  canonicalPositivePartnerAccount,
  "Partner Home must use the canonical positive-balance creditor semantics",
);
assert.deepEqual(
  (await partnerBalanceSemanticsService.getAccount(17))?.account,
  canonicalPositivePartnerAccount,
  "Partner Account must use the canonical positive-balance creditor semantics",
);
assert.deepEqual(
  (await partnerBalanceSemanticsService.listLedger(17)).account,
  canonicalPositivePartnerAccount,
  "Partner Ledger must use the canonical positive-balance creditor semantics",
);

const partnerService = createMiniAppPartnerService({
  getPartnerProfileShell: async () => ({ profile: { id: 18, partnerName: "Partner B" } }),
  listPartnerLedgerDirectory: async () => ({
    items: [{ id: 1, partnerId: 18, description: "B only", debit: 0, credit: 90, balance: 90 }],
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
    summary: { latestBalance: 90 },
  }),
  listPartnerPurchaseDirectory: async () => ({
    items: [{
      id: 3,
      type: "phone",
      supplierId: 18,
      name: "Secret B phone",
      purchasePrice: 10,
      sellingPrice: 999,
      profit: 989,
      saleCustomerPhone: "09120000000",
    }],
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  }),
  listPartnerPhoneSettlementDirectory: async () => ({
    items: [{ id: 3, type: "phone", supplierId: 18, name: "Secret B phone" }],
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
    filteredSummary: {},
  }),
});
assert.equal(await partnerService.getHome(17), null, "Partner A must not receive Partner B's profile");
assert.deepEqual((await partnerService.listLedger(17)).items, []);
assert.deepEqual((await partnerService.listPurchases(17)).items, []);
assert.deepEqual((await partnerService.listPhones(17)).items, []);

const safePartnerService = createMiniAppPartnerService({
  getPartnerProfileShell: async () => ({ profile: { id: 17, partnerName: "Partner A", currentBalance: 0 }, ledgerPreview: [], ledgerSummary: {}, purchaseSummary: {}, soldPhoneSettlementSummary: {} }),
  listPartnerLedgerDirectory: async () => ({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1, summary: {} }),
  listPartnerPurchaseDirectory: async () => ({
    items: [{
      id: 7,
      type: "phone",
      supplierId: 17,
      name: "Owned phone",
      identifier: "IMEI-OWNED",
      purchasePrice: 123,
      phoneSettlementPaidAmount: 23,
      phoneSettlementBalance: 100,
      sellingPrice: 999,
      profit: 876,
      notes: "internal",
      telegramChatId: "99200123",
      saleCustomerName: "Private customer",
    }],
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  }),
  listPartnerPhoneSettlementDirectory: async () => ({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1, filteredSummary: {} }),
});
const safePartnerPurchases = await safePartnerService.listPurchases(17);
assert.equal(safePartnerPurchases.items.length, 1);
assert.doesNotMatch(
  JSON.stringify(safePartnerPurchases),
  /sellingPrice|profit|notes|telegramChatId|saleCustomerName|Private customer|internal/,
  "safe Partner DTO must not serialize raw internal, customer, Telegram, sale, or profit fields",
);

const runKindGuard = (required: "customer" | "partner", actual: "customer" | "partner") => {
  let status = 200;
  let payload: any = null;
  let nextCalled = false;
  const middleware = requireMiniAppIdentityKind(required);
  const response: any = { locals: { requestId: "cross-role-test" } };
  response.status = (nextStatus: number) => { status = nextStatus; return response; };
  response.json = (body: any) => { payload = body; return response; };
  middleware(
    { miniAppIdentity: { kind: actual, subjectId: 17 } } as any,
    response,
    () => { nextCalled = true; },
  );
  return { status, payload, nextCalled };
};
const customerToPartner = runKindGuard("partner", "customer");
assert.equal(customerToPartner.status, 403);
assert.equal(customerToPartner.payload.code, "MINIAPP_PARTNER_ACCESS_REQUIRED");
assert.equal(customerToPartner.nextCalled, false);
const partnerToCustomer = runKindGuard("customer", "partner");
assert.equal(partnerToCustomer.status, 403);
assert.equal(partnerToCustomer.payload.code, "MINIAPP_CUSTOMER_ACCESS_REQUIRED");
assert.equal(partnerToCustomer.nextCalled, false);
assert.equal(miniAppSubjectIdFromSession({ subjectId: 17 }), 17);

console.log("Mini App v145 service ownership, DB failure propagation, safe DTO, and cross-role authorization unit tests passed.");
