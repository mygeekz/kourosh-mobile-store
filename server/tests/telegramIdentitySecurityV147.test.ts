import assert from "node:assert/strict";
import crypto from "node:crypto";
import sqlite3 from "sqlite3";
import { createTelegramUpdateHandler } from "../bootstrap/telegram/telegramUpdateHandlerCore";
import { setActiveDb } from "../db/connection";
import { allAsync, execAsync, getAsync, runAsync } from "../db/query";
import { createTelegramIdentitySecuritySchema } from "../db/schema/telegramIdentity.schema";
import {
  issuePartnerTelegramLink, issueStaffTelegramLink,
  redeemPartnerTelegramLink, redeemStaffTelegramLink,
  loadFreshStaffAuthorization,
} from "../services/telegramIdentitySecurity.service";
import { createMiniAppIdentityResolver } from "../miniapp/miniAppIdentityResolver";
import { createMiniAppSessionStore, MINIAPP_SESSION_DURATION_MS, STAFF_MINIAPP_SESSION_DURATION_MS } from "../miniapp/miniAppSession";

const db = new sqlite3.Database(":memory:");
setActiveDb(db);
await execAsync(`
  PRAGMA foreign_keys=ON;
  CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);
  CREATE TABLE roles(id INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL);
  CREATE TABLE users(id INTEGER PRIMARY KEY,username TEXT,passwordHash TEXT,roleId INTEGER,firstName TEXT,lastName TEXT);
  CREATE TABLE partners(id INTEGER PRIMARY KEY,partnerName TEXT,phoneNumber TEXT,telegramChatId TEXT,telegram_linked_at TEXT);
  CREATE TABLE customers(id INTEGER PRIMARY KEY,fullName TEXT,phoneNumber TEXT,telegramChatId TEXT,telegram_chat_id TEXT,telegram_user_id TEXT,telegram_linked_at TEXT,telegram_opted_out INTEGER DEFAULT 0,telegram_invalid INTEGER DEFAULT 0,telegram_invalid_reason TEXT,telegram_invalid_at TEXT);
  CREATE TABLE audit_logs(id INTEGER PRIMARY KEY,userId INTEGER,username TEXT,role TEXT,action TEXT,entityType TEXT,entityId INTEGER,description TEXT,createdAt TEXT DEFAULT CURRENT_TIMESTAMP);
`);
await createTelegramIdentitySecuritySchema();
await runAsync("INSERT INTO roles(id,name) VALUES(1,'Admin'),(2,'Manager'),(3,'Salesperson'),(4,'Warehouse'),(5,'Technician'),(6,'Marketer')");
await runAsync("INSERT INTO users(id,username,passwordHash,roleId,firstName,lastName) VALUES(1,'admin','x',1,'A','One'),(2,'manager','x',2,'M','Two'),(3,'sales','x',3,'S','Three')");
await runAsync("INSERT INTO partners(id,partnerName) VALUES(10,'Partner Ten'),(11,'Partner Eleven'),(12,'Partner Twelve')");
const actor = { id: 1, username: "admin", roleName: "Admin" };

// Real update-handler fixtures: legacy guessed IDs never reach a repository.
const messages: string[] = [];
let redemptionCalls = 0;
const handler = createTelegramUpdateHandler({
  trySendSmsNow: async () => ({}),
  securityLinking: {
    redeemPartner: async (_token, _from, _chat, isPrivate) => { redemptionCalls += 1; return { ok: isPrivate }; },
    redeemStaff: async (_token, _from, _chat, isPrivate) => { redemptionCalls += 1; return { ok: isPrivate }; },
  },
  sendSecurityMessage: async (_chat, text) => { messages.push(text); },
});
await handler({ message: { chat: { id: 90, type: "private" }, from: { id: 900 }, text: "/start partner_10" } });
assert.equal(redemptionCalls, 0);
assert.equal(messages.at(-1)?.includes("10"), false);
assert.match(messages.at(-1) || "", /معتبر نیست/);
const failingHandler = createTelegramUpdateHandler({
  trySendSmsNow: async () => ({}),
  securityLinking: { redeemPartner: async () => { throw new Error("database offline"); }, redeemStaff: async () => { throw new Error("database offline"); } },
  sendSecurityMessage: async (_chat, text) => { messages.push(text); },
});
await failingHandler({ message: { chat: { id: 91, type: "private" }, from: { id: 901 }, text: `/start plink_${"B".repeat(43)}` } });
assert.match(messages.at(-1) || "", /انجام نشد/);
assert.equal(messages.at(-1)?.includes("database"), false, "database errors remain generic");
await handler({ message: { chat: { id: -90, type: "group" }, from: { id: 900 }, text: `/start staff_${"A".repeat(43)}` } });
assert.equal(redemptionCalls, 1);
assert.match(messages.at(-1) || "", /معتبر نیست/);

// Partner tokens: opaque, hashed at rest, default 10m, one-use and collision safe.
const p10 = await issuePartnerTelegramLink(10, actor);
assert.ok(p10 && /^[A-Za-z0-9_-]{43}$/.test(p10.token));
const stored: any = await getAsync("SELECT token_hash,expires_at FROM telegram_partner_link_tokens WHERE partner_id=10");
assert.notEqual(stored.token_hash, p10!.token);
assert.equal(stored.token_hash, crypto.createHash("sha256").update(p10!.token).digest("hex"));
const ttl = Date.parse(stored.expires_at) - Date.now();
assert.ok(ttl > 9 * 60_000 && ttl <= 10 * 60_000);
assert.equal((await redeemPartnerTelegramLink(p10!.token, "tg-10", "chat-10", true)).ok, true);
assert.equal((await redeemPartnerTelegramLink(p10!.token, "tg-10", "chat-10", true)).ok, false);
const mapped10: any = await getAsync("SELECT telegram_user_id,telegram_chat_id,telegramChatId FROM partners WHERE id=10");
assert.deepEqual(mapped10, { telegram_user_id: "tg-10", telegram_chat_id: "chat-10", telegramChatId: "chat-10" });
assert.equal((await redeemPartnerTelegramLink("A".repeat(43), "x", "x", true)).ok, false);
assert.equal((await redeemPartnerTelegramLink(p10!.token.slice(0, -1) + "Z", "x", "x", true)).ok, false);

const p11 = await issuePartnerTelegramLink(11, actor);
assert.equal((await redeemPartnerTelegramLink(p11!.token, "tg-10", "chat-x", true)).ok, false, "partner Telegram collision rejected");
const p10Rebind = await issuePartnerTelegramLink(10, actor);
assert.equal((await redeemPartnerTelegramLink(p10Rebind!.token, "different-user", "different-chat", true)).ok, false, "silent rebind rejected");
const expired = await issuePartnerTelegramLink(12, actor, 1);
await runAsync("UPDATE telegram_partner_link_tokens SET expires_at='2000-01-01T00:00:00.000Z' WHERE partner_id=12");
assert.equal((await redeemPartnerTelegramLink(expired!.token, "tg-12", "chat-12", true)).code, "EXPIRED");

const concurrent = await issuePartnerTelegramLink(11, actor);
const double = await Promise.all([
  redeemPartnerTelegramLink(concurrent!.token, "tg-11", "chat-11", true),
  redeemPartnerTelegramLink(concurrent!.token, "tg-11", "chat-11", true),
]);
assert.equal(double.filter((item) => item.ok).length, 1);

// Staff is self-owned, current-role gated, private-chat only, and independently unique.
assert.equal(await issueStaffTelegramLink(3, { id: 3, username: "sales", roleName: "Salesperson" }), null);
const s1 = await issueStaffTelegramLink(1, actor);
assert.ok(s1 && Date.parse(s1.expiresAt) - Date.now() <= 5 * 60_000);
assert.equal((await redeemStaffTelegramLink(s1!.token, "staff-tg-1", "staff-chat-1", false)).ok, false);
assert.equal((await redeemStaffTelegramLink(s1!.token, "staff-tg-1", "staff-chat-1", true)).ok, true);
const staffMap: any = await getAsync("SELECT user_id,telegram_user_id FROM user_telegram_links WHERE user_id=1");
assert.deepEqual(staffMap, { user_id: 1, telegram_user_id: "staff-tg-1" });
assert.ok(await loadFreshStaffAuthorization(1, "staff-tg-1"));
assert.equal(await loadFreshStaffAuthorization(1, "wrong-telegram"), null, "session/mapping mismatch rejected");
const s2Collision = await issueStaffTelegramLink(2, { id: 2, username: "manager", roleName: "Manager" });
assert.equal((await redeemStaffTelegramLink(s2Collision!.token, "staff-tg-1", "other", true)).ok, false);
const s2Downgrade = await issueStaffTelegramLink(2, { id: 2, username: "manager", roleName: "Manager" });
await runAsync("UPDATE users SET roleId=3 WHERE id=2");
assert.equal((await redeemStaffTelegramLink(s2Downgrade!.token, "staff-tg-2", "chat", true)).code, "ROLE_FORBIDDEN");
assert.equal(await loadFreshStaffAuthorization(2, "staff-tg-2"), null, "role downgrade immediately blocks staff access");

// Staff precedence and customer/partner regression behavior.
const resolve = createMiniAppIdentityResolver({
  findStaffIdentities: async () => [{ id: 1, displayName: "Admin", roleName: "Admin" }],
  findCustomerIdentities: async () => [{ id: 50, displayName: "Customer" }],
  findPartnerIdentities: async () => [{ id: 60, displayName: "Partner" }],
});
assert.equal((await resolve("staff-tg-1"))?.kind, "staff");
const downgradedStaff = createMiniAppIdentityResolver({
  findStaffIdentities: async () => [{ id: 2, roleName: "Salesperson" }],
  findCustomerIdentities: async () => [{ id: 50 }],
  findPartnerIdentities: async () => [],
});
assert.equal(await downgradedStaff("staff-tg-2"), null, "staff mapping remains authoritative after role downgrade");
const customerOnly = createMiniAppIdentityResolver({ findCustomerIdentities: async () => [{ id: 50 }], findPartnerIdentities: async () => [] });
const partnerOnly = createMiniAppIdentityResolver({ findCustomerIdentities: async () => [], findPartnerIdentities: async () => [{ id: 60 }] });
assert.equal((await customerOnly("c"))?.kind, "customer");
assert.equal((await partnerOnly("p"))?.kind, "partner");

// Session behavior: customer/partner stay 4h; staff is 30m, rotates and revokes.
let now = 1_000_000;
const sessionStore = createMiniAppSessionStore(() => now);
const staffIdentity = { kind: "staff" as const, subjectId: 1, displayName: "Admin", telegramUserId: "staff-tg-1", roleName: "Admin" as const, capabilities: ["staff:identity:verify"] };
const staffSession1 = sessionStore.create(staffIdentity);
assert.equal(Date.parse(staffSession1.expiresAt) - now, STAFF_MINIAPP_SESSION_DURATION_MS);
const staffSession2 = sessionStore.create(staffIdentity);
assert.equal(sessionStore.get(staffSession1.token), null, "rotation revokes prior staff session");
assert.ok(sessionStore.get(staffSession2.token));
assert.equal(sessionStore.revokeStaff(1), 1);
const customerSession = sessionStore.create({ kind: "customer", subjectId: 50, displayName: "C", telegramUserId: "c", capabilities: [] });
assert.equal(Date.parse(customerSession.expiresAt) - now, MINIAPP_SESSION_DURATION_MS);
now += MINIAPP_SESSION_DURATION_MS + 1;
assert.equal(sessionStore.get(customerSession.token), null);

const auditRows = await allAsync("SELECT action,description FROM audit_logs");
assert.ok(auditRows.some((row: any) => row.action === "TELEGRAM_PARTNER_LINK_ISSUED"));
assert.equal(auditRows.some((row: any) => /plink_|staff_|[A-Za-z0-9_-]{43}/.test(String(row.description))), false, "audit contains no token material");

await new Promise<void>((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
setActiveDb(null);
console.log("telegram identity security v147 behavior tests passed");
