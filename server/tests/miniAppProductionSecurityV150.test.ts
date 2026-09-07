import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import moment from "jalali-moment";
import { createKouroshServerStarter } from "../bootstrap/serverLifecycle";
import { registerTerminalApiHandlers } from "../middleware/terminalApiHandlers";
import {
  assertMiniAppMemorySessionDeployment,
  createMiniAppSessionStore,
} from "../miniapp/miniAppSession";
import { MINI_APP_STAFF_CAPABILITIES } from "../security/miniAppStaffAccessPolicy";
import { miniAppSecurityLog } from "../security/miniAppSecurityLogger";
import { createMiniAppStaffService } from "../services/miniAppStaff.service";
import { auditTelegramMiniAppPublicConfiguration } from "../utils/telegramMiniApp";

const calls = { customers: 0, phones: 0, invoices: 0, installments: 0 };
const repo = {
  searchCustomers: async () => { calls.customers += 1; return [{ customerId: 1, fullName: "کیان", phoneNumber: "0912", currentBalance: 0 }]; },
  searchPhones: async () => { calls.phones += 1; return [{ id: 2 }]; },
  searchInvoices: async () => { calls.invoices += 1; return [{ invoiceId: 3, source: "order" }]; },
  searchInstallments: async () => { calls.installments += 1; return [{ saleId: 4 }]; },
} as any;
const service = createMiniAppStaffService({ repo, readModels: {} as any, now: () => moment("2026-08-11", "YYYY-MM-DD") });

const customerOnly = await service.search("کیان", 20, ["staff:customer_lookup:read"]);
assert.equal(calls.customers, 1);
assert.equal(calls.phones, 0);
assert.equal(calls.invoices, 0);
assert.equal(calls.installments, 0);
assert.equal(customerOnly.groups.customers.length, 1);
assert.deepEqual(customerOnly.groups.phones, []);
assert.deepEqual(customerOnly.groups.invoices, []);
assert.deepEqual(customerOnly.groups.installments, []);

await service.search("1", 20, MINI_APP_STAFF_CAPABILITIES);
assert.deepEqual(calls, { customers: 2, phones: 1, invoices: 1, installments: 1 });

let now = 1_000;
const store = createMiniAppSessionStore(() => now);
const created = store.create({ kind: "customer", subjectId: 1, displayName: "Test", telegramUserId: "tg", capabilities: [] });
assert.ok(store.get(created.token));
assert.equal(store.size(), 1);
assert.equal(store.revokeIdentity("customer", 1), 1);
assert.equal(store.get(created.token), null);
const expiring = store.create({ kind: "partner", subjectId: 2, displayName: "Partner", telegramUserId: "tg2", capabilities: [] });
now += 5 * 60 * 60 * 1000;
store.cleanup();
assert.equal(store.get(expiring.token), null);
assert.doesNotThrow(() => assertMiniAppMemorySessionDeployment({ KOUROSH_BACKEND_INSTANCE_COUNT: "1" } as NodeJS.ProcessEnv));
assert.throws(() => assertMiniAppMemorySessionDeployment({ KOUROSH_BACKEND_INSTANCE_COUNT: "2" } as NodeJS.ProcessEnv), /SINGLE_BACKEND_INSTANCE/);

const lines: string[] = [];
miniAppSecurityLog("auth_success", {
  requestId: "safe-request-id-123",
  route: "/api/miniapp/auth\nforged",
  method: "POST",
  status: 200,
  identityKind: "staff",
  subjectId: 9,
  reasonCode: "AUTHENTICATED",
  authorization: "Bearer secret",
  initData: "secret",
} as any, (line) => lines.push(line));
assert.equal(lines.length, 1);
assert.doesNotMatch(lines[0], /Bearer|secret|initData|telegram|phone/i);
assert.doesNotMatch(lines[0], /\nforged/);
assert.match(lines[0], /"subjectId":9/);

const production = auditTelegramMiniAppPublicConfiguration({
  telegram_miniapp_public_url: "https://miniapp.example.com/miniapp.html",
  telegram_bot_username: "KouroshStoreBot",
}, "miniapp.example.com", "production");
assert.equal(production.hostMatches, true);
assert.equal(production.endpointIsCanonical, true);
assert.equal(production.menuButtonUrl, production.miniAppUrl);
assert.equal(production.botFatherStatus, "MANUAL_CHECK_REQUIRED");
assert.equal(auditTelegramMiniAppPublicConfiguration({ telegram_miniapp_public_url: "http://192.168.1.2/miniapp.html" }, "192.168.1.2", "production").miniAppUrl, null);
assert.equal(auditTelegramMiniAppPublicConfiguration({ telegram_miniapp_public_url: "https://[::ffff:192.168.1.2]/miniapp.html" }, "[::ffff:192.168.1.2]", "production").miniAppUrl, null);

let listenedHost = "";
const previousBindHost = process.env.KOUROSH_API_BIND_HOST;
delete process.env.KOUROSH_API_BIND_HOST;
const starter = createKouroshServerStarter({
  app: { listen: (_port: number, host: string, callback: () => void) => { listenedHost = host; callback(); } } as any,
  port: 3001,
  getDbInstance: async () => ({}),
  runPendingMigrations: async () => undefined,
  ensureReminderRulesTables: async () => undefined,
  startReportSchedulers: async () => undefined,
  startOutboxWorker: () => undefined,
  startAutoSendScheduler: () => undefined,
  startCustomerTelegramNotifyScheduler: () => undefined,
  autoConfigureTelegramUpdateMode: async () => undefined,
  startTelegramPolling: async () => undefined,
  getAllSettingsAsObject: async () => ({}),
  startDailyBackupJob: () => undefined,
});
starter();
await new Promise((resolve) => setImmediate(resolve));
assert.equal(listenedHost, "127.0.0.1");
if (previousBindHost === undefined) delete process.env.KOUROSH_API_BIND_HOST;
else process.env.KOUROSH_API_BIND_HOST = previousBindHost;

const errorApp = express();
errorApp.use((req, res, next) => { res.locals.requestId = "request-safe-123"; next(); });
errorApp.get("/api/miniapp/failure", () => { throw new Error("SQLITE_SECRET /private/database/path"); });
registerTerminalApiHandlers(errorApp);
const errorServer = http.createServer(errorApp);
await new Promise<void>((resolve) => errorServer.listen(0, "127.0.0.1", resolve));
const errorAddress = errorServer.address();
assert.ok(errorAddress && typeof errorAddress === "object");
const failureResponse = await fetch(`http://127.0.0.1:${errorAddress.port}/api/miniapp/failure`);
const failureBody = await failureResponse.json() as Record<string, unknown>;
assert.equal(failureResponse.status, 500);
assert.equal(failureBody.code, "MINIAPP_INTERNAL_ERROR");
assert.equal(failureBody.requestId, "request-safe-123");
assert.doesNotMatch(JSON.stringify(failureBody), /SQLITE_SECRET|private\/database|stack/i);
await new Promise<void>((resolve, reject) => errorServer.close((error) => error ? reject(error) : resolve()));

console.log("Mini App v150 domain-aware search, session-store, logging, URL and backend-bind tests passed");
