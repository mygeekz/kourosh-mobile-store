import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import express from "express";
import sqlite3 from "sqlite3";
import { setActiveDb } from "../db/connection";
import { allAsync, execAsync, getAsync, runAsync } from "../db/query";
import { createTelegramIdentitySecuritySchema } from "../db/schema/telegramIdentity.schema";
import { createMiniAppSession } from "../miniapp/miniAppSession";
import { createMiniAppIdentityRepository } from "../repositories/miniAppIdentity.repo";
import { registerMiniAppRoutes } from "../routes/miniapp.routes";
import { registerTelegramAdminRoutes } from "../routes/telegramAdmin.routes";
import { registerTelegramInboxRoutes } from "../routes/telegramInbox.routes";
import {
  issuePartnerTelegramLink,
  issueStaffTelegramLink,
  linkCustomerTelegramIdentityById,
  linkCustomerTelegramIdentityByPhone,
  redeemPartnerTelegramLink,
  unlinkCustomerTelegramIdentity,
  unlinkPartnerTelegramIdentity,
  updateCustomerTelegramDelivery,
} from "../services/telegramIdentitySecurity.service";
import { TELEGRAM_IDENTITY_WRITE_POLICY } from "../security/telegramIdentityWritePolicy";

const db = new sqlite3.Database(":memory:");
setActiveDb(db);
await execAsync(`
  PRAGMA foreign_keys=ON;
  CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);
  CREATE TABLE roles(id INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL);
  CREATE TABLE users(id INTEGER PRIMARY KEY,username TEXT,passwordHash TEXT,roleId INTEGER,firstName TEXT,lastName TEXT);
  CREATE TABLE partners(id INTEGER PRIMARY KEY,partnerName TEXT,phoneNumber TEXT,telegramChatId TEXT,telegram_linked_at TEXT);
  CREATE TABLE customers(
    id INTEGER PRIMARY KEY,fullName TEXT,phoneNumber TEXT,telegramChatId TEXT,
    telegram_chat_id TEXT,telegram_user_id TEXT,telegram_linked_at TEXT,
    telegram_opted_out INTEGER DEFAULT 0,telegram_invalid INTEGER DEFAULT 0,
    telegram_invalid_reason TEXT,telegram_invalid_at TEXT
  );
  CREATE TABLE telegram_link_tokens(
    id INTEGER PRIMARY KEY AUTOINCREMENT,token_hash TEXT,customer_id INTEGER,
    expected_phone TEXT,expires_at TEXT,status TEXT,chat_id TEXT,
    telegram_user_id TEXT,used_at TEXT,last_error TEXT
  );
  CREATE TABLE audit_logs(
    id INTEGER PRIMARY KEY,userId INTEGER,username TEXT,role TEXT,action TEXT,
    entityType TEXT,entityId INTEGER,description TEXT,createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);
await createTelegramIdentitySecuritySchema();
await runAsync("INSERT INTO roles(id,name) VALUES(1,'Admin'),(2,'Manager')");
await runAsync("INSERT INTO users(id,username,passwordHash,roleId,firstName,lastName) VALUES(1,'admin','x',1,'A','One')");
await runAsync("INSERT INTO partners(id,partnerName,phoneNumber,telegramChatId) VALUES(10,'P10','09120000010','legacy-p10'),(11,'P11','09120000011','legacy-p11')");
await runAsync(`INSERT INTO customers(id,fullName,phoneNumber,telegramChatId,telegram_chat_id,telegram_user_id,telegram_linked_at) VALUES
  (1,'C1','09120000001','delivery-c1','delivery-c1','tg-c1','2026-01-01T00:00:00Z'),
  (2,'Legacy','09120000002','legacy-c2','legacy-c2',NULL,NULL),
  (3,'Duplicate A','09121111111',NULL,NULL,NULL,NULL),
  (4,'Duplicate B','+989121111111',NULL,NULL,NULL,NULL),
  (5,'Owner','09120000005','chat-owner','chat-owner','tg-owner','2026-01-01T00:00:00Z'),
  (6,'Collision','09120000006',NULL,NULL,NULL,NULL)`);

const actor = { id: 1, username: "admin", roleName: "Admin" };

// Customer ownership, duplicate-phone, collision and silent-rebind rules.
assert.deepEqual(await linkCustomerTelegramIdentityByPhone("09121111111", "tg-dup", "chat-dup"), { ok: false, reason: "ambiguous" });
assert.equal((await getAsync("SELECT COUNT(*) AS n FROM customers WHERE telegram_user_id='tg-dup'"))?.n, 0);
assert.deepEqual(await linkCustomerTelegramIdentityById(6, "tg-owner", "other-chat"), { ok: false, reason: "identity_collision" });
assert.deepEqual(await linkCustomerTelegramIdentityById(5, "tg-other", "other-chat"), { ok: false, reason: "rebind_rejected" });

// Delivery-only writes never create, clear, or replace an authentication identity.
await updateCustomerTelegramDelivery(1, "delivery-c1-new");
assert.deepEqual(await getAsync("SELECT telegram_user_id,telegram_chat_id,telegramChatId,telegram_linked_at FROM customers WHERE id=1"), {
  telegram_user_id: "tg-c1",
  telegram_chat_id: "delivery-c1-new",
  telegramChatId: "delivery-c1-new",
  telegram_linked_at: "2026-01-01T00:00:00Z",
});

// Latest-token-wins rotation for Partner and Staff.
const pFirst = await issuePartnerTelegramLink(10, actor);
const pLatest = await issuePartnerTelegramLink(10, actor);
assert.ok(pFirst && pLatest);
assert.deepEqual((await allAsync("SELECT status FROM telegram_partner_link_tokens WHERE partner_id=10 ORDER BY id")).map((row: any) => row.status), ["canceled", "issued"]);
assert.equal((await redeemPartnerTelegramLink(pFirst!.token, "tg-p10", "chat-p10", true)).ok, false);
assert.equal((await redeemPartnerTelegramLink(pLatest!.token, "tg-p10", "chat-p10", true)).ok, true);
const sFirst = await issueStaffTelegramLink(1, actor);
const sLatest = await issueStaffTelegramLink(1, actor);
assert.ok(sFirst && sLatest);
assert.deepEqual((await allAsync("SELECT status FROM telegram_staff_link_tokens WHERE user_id=1 ORDER BY id")).map((row: any) => row.status), ["canceled", "issued"]);

// Repository resolution is authoritative-user-only and never attempts Chat ID fallback.
const identityQueries: string[] = [];
const identityRepo = createMiniAppIdentityRepository({
  ensureDatabase: async () => undefined,
  readRows: async (sql) => { identityQueries.push(sql); return []; },
});
await identityRepo.findCustomerIdentities("legacy-c2");
await identityRepo.findPartnerIdentities("legacy-p11");
assert.equal(identityQueries.every((sql) => /telegram_user_id\s*=\s*\?/.test(sql)), true);
assert.equal(identityQueries.some((sql) => /telegramChatId|telegram_chat_id/.test(sql)), false);

const app = express();
app.use(express.json());
const authorize = () => (_req: any, _res: any, next: any) => next();
const fakeCustomerService = {
  getHome: async (id: number) => ({ id }), getAccount: async (id: number) => ({ id }),
  listInstallments: async () => [], getInstallmentDetail: async () => null,
  listPurchases: async () => [], listInvoices: async () => [], getInvoiceDetail: async () => null,
};
const fakePartnerService = {
  getHome: async (id: number) => ({ id }), getAccount: async (id: number) => ({ id }),
  listLedger: async () => ({ items: [] }), listPurchases: async () => ({ items: [] }), listPhones: async () => ({ items: [] }),
};
registerMiniAppRoutes(app, { customerService: fakeCustomerService, partnerService: fakePartnerService } as any);
registerTelegramInboxRoutes(app, {
  authorizeRole: authorize,
  ensureTelegramInboxTable: async () => undefined,
  ensureNotificationOutboxTables: async () => undefined,
  ensureCustomerTelegramColumns: async () => undefined,
});
const simulatedUpdates: any[] = [];
registerTelegramAdminRoutes(app, {
  authorizeRole: authorize,
  getPollingState: () => ({ started: false, offset: null }),
  resetPollingStarted: () => undefined,
  startTelegramPolling: async () => undefined,
  resetTelegramCommandMenu: async () => ({}),
  ensureTelegramPersistentMenu: async () => undefined,
  sendBotMessage: async () => ({}),
  telegramCard: (title: string) => title,
  buildContactKeyboard: () => ({}),
  handleTelegramUpdate: async (update: any) => { simulatedUpdates.push(update); },
});
app.use((_error: unknown, _req: any, res: any, _next: any) => res.status(500).json({ success: false }));

const server = http.createServer(app);
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const base = `http://127.0.0.1:${address.port}`;
const request = async (pathname: string, init: RequestInit = {}) => {
  const response = await fetch(`${base}${pathname}`, init);
  return { response, body: await response.json() as any };
};
const post = (pathname: string, body: unknown) => request(pathname, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

// The actual Inbox route ignores fromId and writes only the delivery destination.
let result = await post("/api/telegram/customers/link", { customerId: 1, chatId: "delivery-via-route", fromId: "evil-user" });
assert.equal(result.response.status, 200);
assert.equal(result.body.data.purpose, "delivery_only");
assert.deepEqual(await getAsync("SELECT telegram_user_id,telegram_linked_at FROM customers WHERE id=1"), { telegram_user_id: "tg-c1", telegram_linked_at: "2026-01-01T00:00:00Z" });

// Admin menu routes fail closed for legacy/mismatched destinations and use verified from.id.
result = await post("/api/telegram/admin/send-customer-menu", { customerId: 2, chatId: "legacy-c2" });
assert.equal(result.response.status, 409);
result = await post("/api/telegram/admin/send-customer-menu", { customerId: 1, chatId: "wrong-destination" });
assert.equal(result.response.status, 409);
result = await post("/api/telegram/admin/send-customer-menu", { customerId: 1, chatId: "delivery-via-route" });
assert.equal(result.response.status, 200);
assert.equal(String(simulatedUpdates.at(-1)?.message?.from?.id), "tg-c1");
assert.equal(String(simulatedUpdates.at(-1)?.message?.chat?.id), "delivery-via-route");
result = await post("/api/telegram/admin/send-real-menu", { chatId: "legacy-c2" });
assert.equal(result.response.status, 409);
result = await post("/api/telegram/admin/send-real-menu", { chatId: "delivery-via-route" });
assert.equal(result.response.status, 200);
assert.equal(String(simulatedUpdates.at(-1)?.message?.from?.id), "tg-c1");

// Real Mini App routes enforce fresh Customer and Partner bindings on every request.
const customerSession = createMiniAppSession({ kind: "customer", subjectId: 1, displayName: "C1", telegramUserId: "tg-c1", capabilities: [] });
result = await request("/api/miniapp/customer/home", { headers: { authorization: `Bearer ${customerSession.token}` } });
assert.equal(result.response.status, 200);
await runAsync("INSERT INTO telegram_link_tokens(token_hash,customer_id,expires_at,status) VALUES('pending-c1',1,'2099-01-01T00:00:00Z','issued')");
await unlinkCustomerTelegramIdentity(1, actor);
assert.equal((await getAsync("SELECT status FROM telegram_link_tokens WHERE token_hash='pending-c1'"))?.status, "canceled");
result = await request("/api/miniapp/customer/home", { headers: { authorization: `Bearer ${customerSession.token}` } });
assert.equal(result.response.status, 401);

const partnerSession = createMiniAppSession({ kind: "partner", subjectId: 10, displayName: "P10", telegramUserId: "tg-p10", capabilities: [] });
result = await request("/api/miniapp/partner/home", { headers: { authorization: `Bearer ${partnerSession.token}` } });
assert.equal(result.response.status, 200);
await runAsync("UPDATE partners SET telegram_user_id=NULL WHERE id=10");
result = await request("/api/miniapp/partner/home", { headers: { authorization: `Bearer ${partnerSession.token}` } });
assert.equal(result.response.status, 401);
await runAsync("UPDATE partners SET telegram_user_id='tg-p10',telegram_chat_id='chat-p10',telegramChatId='chat-p10' WHERE id=10");
const partnerUnlinkSession = createMiniAppSession({ kind: "partner", subjectId: 10, displayName: "P10", telegramUserId: "tg-p10", capabilities: [] });
await issuePartnerTelegramLink(10, actor);
await unlinkPartnerTelegramIdentity(10, actor);
assert.equal((await getAsync("SELECT COUNT(*) AS n FROM telegram_partner_link_tokens WHERE partner_id=10 AND status='issued'"))?.n, 0);
result = await request("/api/miniapp/partner/home", { headers: { authorization: `Bearer ${partnerUnlinkSession.token}` } });
assert.equal(result.response.status, 401);

await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

// Complete source writer audit: any persistent identity/delivery writer must be in the approved matrix modules.
const serverRoot = path.join(process.cwd(), "server");
const sourceFiles: string[] = [];
const walk = (directory: string) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.isFile() && entry.name.endsWith(".ts") && !target.includes(`${path.sep}tests${path.sep}`)) sourceFiles.push(target);
  }
};
walk(serverRoot);
const writerPattern = /(?:UPDATE\s+(?:customers|partners)\s+SET|INSERT\s+INTO\s+(?:customers|partners|user_telegram_links)\b)[\s\S]{0,700}(?:telegram_user_id|telegram_chat_id|telegramChatId|telegram_linked_at)/i;
const approvedWriterFiles = new Set([
  "server/services/telegramIdentitySecurity.service.ts",
  "server/repositories/customerMutations.repo.ts",
  "server/repositories/partnerMutations.repo.ts",
]);
const unexpectedWriters = sourceFiles.flatMap((file) => {
  const relative = path.relative(process.cwd(), file).split(path.sep).join("/");
  return writerPattern.test(fs.readFileSync(file, "utf8")) && !approvedWriterFiles.has(relative) ? [relative] : [];
});
assert.deepEqual(unexpectedWriters, []);
const handlerSource = fs.readFileSync(path.join(serverRoot, "bootstrap/telegram/telegramUpdateHandlerCore.ts"), "utf8");
assert.match(handlerSource, /const contactUserId = String\(contact\.user_id \?\? ""\)\.trim\(\);[\s\S]{0,80}if \(!contactUserId \|\| contactUserId !== fromId\)/);
assert.match(handlerSource, /msg\.chat\?\.type\s*&&\s*msg\.chat\.type\s*!==\s*"private"/);
assert.doesNotMatch(handlerSource, /findPartnerByNormalizedPhone|linkPartnerTelegramByPhone/);
assert.equal(TELEGRAM_IDENTITY_WRITE_POLICY.every((entry) => entry.allowed), true);
assert.deepEqual(
  TELEGRAM_IDENTITY_WRITE_POLICY.filter((entry) => entry.fieldClass === "authentication").map((entry) => entry.writer).sort(),
  [
    "telegramIdentitySecurity.linkCustomerTelegramIdentityById",
    "telegramIdentitySecurity.redeemPartnerTelegramLink",
    "telegramIdentitySecurity.redeemStaffTelegramLink",
  ],
);

const audits = await allAsync("SELECT action,description FROM audit_logs");
assert.ok(audits.some((row: any) => row.action === "TELEGRAM_PARTNER_LINK_TOKEN_CANCELED"));
assert.ok(audits.some((row: any) => row.action === "TELEGRAM_STAFF_LINK_TOKEN_CANCELED"));
assert.equal(audits.some((row: any) => /plink_|staff_|[A-Za-z0-9_-]{43}/.test(String(row.description || ""))), false);

await new Promise<void>((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
setActiveDb(null);
console.log("Telegram identity authorization v148 behavior tests passed");
