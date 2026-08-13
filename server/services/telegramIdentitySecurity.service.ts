import crypto from "crypto";
import { getAsync, runAsync, allAsync } from "../db/query";
import { addAuditLog } from "../db/domains/audit.db";
import { getAllSettingsAsObject, updateSetting } from "../db/domains/settings.db";
import { getTelegramBotInfo } from "../telegramService";
import { revokeMiniAppIdentitySessions, revokeMiniAppStaffSessions } from "../miniapp/miniAppSession";
import { normalizeIranPhone } from "../utils/iranPhone";

export const STAFF_TELEGRAM_ROLES = ["Admin", "Manager"] as const;
const PARTNER_TTL_MINUTES = 10;
const STAFF_TTL_MINUTES = 5;

const digest = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");
const newOpaqueToken = (): string => crypto.randomBytes(32).toString("base64url");
const validToken = (value: string): boolean => /^[A-Za-z0-9_-]{43}$/.test(value);
const isoAfterMinutes = (minutes: number): string => new Date(Date.now() + minutes * 60_000).toISOString();
const isStaffRole = (role: unknown): role is "Admin" | "Manager" => STAFF_TELEGRAM_ROLES.includes(role as any);
let redemptionQueue: Promise<void> = Promise.resolve();
const withRedemptionLock = async <T>(operation: () => Promise<T>): Promise<T> => {
  const previous = redemptionQueue;
  let release!: () => void;
  redemptionQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try { return await operation(); } finally { release(); }
};

type Actor = { id: number; username?: string | null; roleName?: string | null };
type Redemption = { ok: boolean; code: string; displayName?: string; roleName?: string };

const audit = async (actor: Actor | null, action: string, entityType: string, entityId: number | null, description: string) =>
  addAuditLog(actor?.id ?? null, actor?.username ?? "telegram", actor?.roleName ?? "Telegram", action, entityType, entityId, description);

const issueLatest = async (table: "telegram_partner_link_tokens" | "telegram_staff_link_tokens", ownerColumn: "partner_id" | "user_id", ownerId: number, ttlMinutes: number): Promise<{ token: string; expiresAt: string; canceled: number }> => withRedemptionLock(async () => {
  const expiresAt = isoAfterMinutes(ttlMinutes);
  await runAsync("BEGIN IMMEDIATE");
  try {
    const canceled = await runAsync(`UPDATE ${table} SET status='canceled',last_error='superseded' WHERE ${ownerColumn}=? AND status='issued'`, [ownerId]);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const token = newOpaqueToken();
      try {
        await runAsync(`INSERT INTO ${table} (token_hash,${ownerColumn},expires_at,status) VALUES (?,?,?,'issued')`, [digest(token), ownerId, expiresAt]);
        await runAsync("COMMIT");
        return { token, expiresAt, canceled: canceled.changes };
      } catch (error) {
        if (!/unique/i.test(String((error as any)?.message || error))) throw error;
      }
    }
    throw new Error("TELEGRAM_TOKEN_COLLISION");
  } catch (error) {
    await runAsync("ROLLBACK").catch(() => undefined);
    throw error;
  }
});

export const getTelegramBotUsername = async (): Promise<string> => {
  const settings = await getAllSettingsAsObject();
  let username = String((settings as any).telegram_bot_username || "").trim().replace(/^@+/, "");
  const botToken = String((settings as any).telegram_bot_token || "").trim();
  if (!username && botToken) {
    const me = await getTelegramBotInfo(botToken);
    username = String((me as any)?.result?.username || (me as any)?.data?.result?.username || (me as any)?.data?.username || "").trim().replace(/^@+/, "");
    if (username) await updateSetting("telegram_bot_username", username);
  }
  if (!username) throw new Error("TELEGRAM_BOT_USERNAME_MISSING");
  return username;
};

export const issuePartnerTelegramLink = async (partnerId: number, actor: Actor, requestedMinutes?: number) => {
  const partner: any = await getAsync("SELECT id, partnerName, telegram_user_id FROM partners WHERE id=? LIMIT 1", [partnerId]);
  if (!partner?.id) return null;
  const ttl = Math.min(30, Math.max(1, Number(requestedMinutes) || PARTNER_TTL_MINUTES));
  const created = await issueLatest("telegram_partner_link_tokens", "partner_id", partnerId, ttl);
  if (created.canceled) await audit(actor, "TELEGRAM_PARTNER_LINK_TOKEN_CANCELED", "partner", partnerId, "Older pending Partner Telegram link tokens canceled.");
  await audit(actor, "TELEGRAM_PARTNER_LINK_ISSUED", "partner", partnerId, "Secure one-time Telegram partner link issued.");
  return { ...created, partnerName: String(partner.partnerName || ""), linked: !!partner.telegram_user_id };
};

export const issueStaffTelegramLink = async (userId: number, actor: Actor) => {
  const user: any = await getAsync(`SELECT u.id,u.username,u.firstName,u.lastName,r.name AS roleName FROM users u JOIN roles r ON r.id=u.roleId WHERE u.id=? LIMIT 1`, [userId]);
  if (!user?.id || !isStaffRole(user.roleName)) return null;
  const created = await issueLatest("telegram_staff_link_tokens", "user_id", userId, STAFF_TTL_MINUTES);
  if (created.canceled) await audit(actor, "TELEGRAM_STAFF_LINK_TOKEN_CANCELED", "user", userId, "Older pending Staff Telegram link tokens canceled.");
  await audit(actor, "TELEGRAM_STAFF_LINK_ISSUED", "user", userId, "Secure self-service Telegram staff link issued.");
  return { ...created, roleName: user.roleName };
};

const reject = async (kind: "partner" | "staff", ownerId: number | null, code: string): Promise<Redemption> => {
  await audit(null, `TELEGRAM_${kind.toUpperCase()}_LINK_REJECTED`, kind === "staff" ? "user" : "partner", ownerId, `Telegram link redemption rejected: ${code}.`);
  return { ok: false, code };
};

const redeemPartnerTelegramLinkUnlocked = async (token: string, telegramUserId: string, chatId: string, isPrivate: boolean): Promise<Redemption> => {
  if (!isPrivate || !telegramUserId || !chatId) return reject("partner", null, "PRIVATE_CHAT_REQUIRED");
  if (!validToken(token)) return reject("partner", null, "INVALID");
  await runAsync("BEGIN IMMEDIATE");
  try {
    const row: any = await getAsync(`SELECT t.*,p.partnerName,p.telegram_user_id AS current_user FROM telegram_partner_link_tokens t LEFT JOIN partners p ON p.id=t.partner_id WHERE t.token_hash=? LIMIT 1`, [digest(token)]);
    if (!row?.id || !row.partnerName) { await runAsync("ROLLBACK"); return reject("partner", row?.partner_id || null, "INVALID"); }
    if (row.status !== "issued") { await runAsync("ROLLBACK"); return reject("partner", row.partner_id, "NOT_ACTIVE"); }
    if (Date.parse(row.expires_at) <= Date.now()) {
      await runAsync("UPDATE telegram_partner_link_tokens SET status='expired',last_error='expired' WHERE id=? AND status='issued'", [row.id]);
      await runAsync("COMMIT"); return reject("partner", row.partner_id, "EXPIRED");
    }
    if (row.current_user && String(row.current_user) !== telegramUserId) { await runAsync("ROLLBACK"); return reject("partner", row.partner_id, "REBIND_REJECTED"); }
    const collision: any = await getAsync("SELECT id FROM partners WHERE telegram_user_id=? AND id<>? LIMIT 1", [telegramUserId, row.partner_id]);
    if (collision?.id) { await runAsync("ROLLBACK"); return reject("partner", row.partner_id, "IDENTITY_COLLISION"); }
    const claimed = await runAsync(`UPDATE telegram_partner_link_tokens SET status='used',used_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'),telegram_user_id=?,chat_id=? WHERE id=? AND status='issued'`, [telegramUserId, chatId, row.id]);
    if (claimed.changes !== 1) { await runAsync("ROLLBACK"); return reject("partner", row.partner_id, "ALREADY_USED"); }
    await runAsync(`UPDATE partners SET telegram_user_id=?,telegram_chat_id=?,telegramChatId=?,telegram_linked_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`, [telegramUserId, chatId, chatId, row.partner_id]);
    await runAsync("COMMIT");
    revokeMiniAppIdentitySessions("partner", Number(row.partner_id));
    await audit(null, "TELEGRAM_PARTNER_LINKED", "partner", row.partner_id, "Partner Telegram identity linked through a one-time token.");
    return { ok: true, code: "LINKED", displayName: String(row.partnerName) };
  } catch (error) {
    await runAsync("ROLLBACK").catch(() => undefined);
    throw error;
  }
};
export const redeemPartnerTelegramLink = (token: string, telegramUserId: string, chatId: string, isPrivate: boolean): Promise<Redemption> =>
  withRedemptionLock(() => redeemPartnerTelegramLinkUnlocked(token, telegramUserId, chatId, isPrivate));

const redeemStaffTelegramLinkUnlocked = async (token: string, telegramUserId: string, chatId: string, isPrivate: boolean): Promise<Redemption> => {
  if (!isPrivate || !telegramUserId || !chatId) return reject("staff", null, "PRIVATE_CHAT_REQUIRED");
  if (!validToken(token)) return reject("staff", null, "INVALID");
  await runAsync("BEGIN IMMEDIATE");
  try {
    const row: any = await getAsync(`SELECT t.*,u.username,u.firstName,u.lastName,r.name AS roleName,l.telegram_user_id AS current_user FROM telegram_staff_link_tokens t LEFT JOIN users u ON u.id=t.user_id LEFT JOIN roles r ON r.id=u.roleId LEFT JOIN user_telegram_links l ON l.user_id=t.user_id WHERE t.token_hash=? LIMIT 1`, [digest(token)]);
    if (!row?.id || !row.username) { await runAsync("ROLLBACK"); return reject("staff", row?.user_id || null, "INVALID"); }
    if (row.status !== "issued") { await runAsync("ROLLBACK"); return reject("staff", row.user_id, "NOT_ACTIVE"); }
    if (Date.parse(row.expires_at) <= Date.now()) {
      await runAsync("UPDATE telegram_staff_link_tokens SET status='expired',last_error='expired' WHERE id=? AND status='issued'", [row.id]);
      await runAsync("COMMIT"); return reject("staff", row.user_id, "EXPIRED");
    }
    if (!isStaffRole(row.roleName)) { await runAsync("ROLLBACK"); return reject("staff", row.user_id, "ROLE_FORBIDDEN"); }
    if (row.current_user && String(row.current_user) !== telegramUserId) { await runAsync("ROLLBACK"); return reject("staff", row.user_id, "REBIND_REJECTED"); }
    const collision: any = await getAsync("SELECT user_id FROM user_telegram_links WHERE telegram_user_id=? AND user_id<>? LIMIT 1", [telegramUserId, row.user_id]);
    if (collision?.user_id) { await runAsync("ROLLBACK"); return reject("staff", row.user_id, "IDENTITY_COLLISION"); }
    const claimed = await runAsync(`UPDATE telegram_staff_link_tokens SET status='used',used_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'),telegram_user_id=?,chat_id=? WHERE id=? AND status='issued'`, [telegramUserId, chatId, row.id]);
    if (claimed.changes !== 1) { await runAsync("ROLLBACK"); return reject("staff", row.user_id, "ALREADY_USED"); }
    await runAsync(`INSERT INTO user_telegram_links(user_id,telegram_user_id,chat_id) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET telegram_user_id=excluded.telegram_user_id,chat_id=excluded.chat_id,updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')`, [row.user_id, telegramUserId, chatId]);
    await runAsync("COMMIT");
    revokeMiniAppStaffSessions(Number(row.user_id));
    await audit(null, "TELEGRAM_STAFF_LINKED", "user", row.user_id, "Staff Telegram identity linked through a one-time token.");
    const name = [row.firstName, row.lastName].filter(Boolean).join(" ") || row.username;
    return { ok: true, code: "LINKED", displayName: String(name), roleName: row.roleName };
  } catch (error) {
    await runAsync("ROLLBACK").catch(() => undefined);
    throw error;
  }
};
export const redeemStaffTelegramLink = (token: string, telegramUserId: string, chatId: string, isPrivate: boolean): Promise<Redemption> =>
  withRedemptionLock(() => redeemStaffTelegramLinkUnlocked(token, telegramUserId, chatId, isPrivate));

export const getStaffTelegramStatus = async (userId: number) => {
  const row: any = await getAsync("SELECT telegram_user_id,chat_id,linked_at FROM user_telegram_links WHERE user_id=? LIMIT 1", [userId]);
  return row ? { state: "linked", linkedAt: row.linked_at, telegramUserId: String(row.telegram_user_id) } : { state: "not_linked" };
};

export const unlinkStaffTelegram = async (userId: number, actor: Actor): Promise<boolean> => {
  const result = await runAsync("DELETE FROM user_telegram_links WHERE user_id=?", [userId]);
  await runAsync("UPDATE telegram_staff_link_tokens SET status='canceled' WHERE user_id=? AND status='issued'", [userId]);
  revokeMiniAppStaffSessions(userId);
  if (result.changes) await audit(actor, "TELEGRAM_STAFF_UNLINKED", "user", userId, "Staff Telegram identity unlinked and Mini App sessions revoked.");
  return result.changes > 0;
};

export const loadFreshStaffAuthorizationResult = async (userId: number, telegramUserId: string) => {
  const row: any = await getAsync(`SELECT u.id,u.username,u.firstName,u.lastName,r.name AS roleName,l.telegram_user_id FROM users u JOIN roles r ON r.id=u.roleId JOIN user_telegram_links l ON l.user_id=u.id WHERE u.id=? AND l.telegram_user_id=? LIMIT 1`, [userId, telegramUserId]);
  if (!row) return { authorization: null, reason: "binding_invalid" as const };
  if (!isStaffRole(row.roleName)) return { authorization: null, reason: "role_denied" as const };
  return { authorization: row, reason: null };
};

export const loadFreshStaffAuthorization = async (userId: number, telegramUserId: string) =>
  (await loadFreshStaffAuthorizationResult(userId, telegramUserId)).authorization;

export type CustomerLinkResult = { ok: true; customerId: number } | { ok: false; reason: "not_found" | "ambiguous" | "identity_collision" | "rebind_rejected" };

export const linkCustomerTelegramIdentityById = async (customerId: number, telegramUserId: string, chatId: string): Promise<CustomerLinkResult> => withRedemptionLock(async () => {
  if (!customerId || !telegramUserId || !chatId) return { ok: false, reason: "not_found" };
  await runAsync("BEGIN IMMEDIATE");
  try {
    const customer: any = await getAsync("SELECT id,telegram_user_id FROM customers WHERE id=? LIMIT 1", [customerId]);
    if (!customer?.id) { await runAsync("ROLLBACK"); return { ok: false, reason: "not_found" }; }
    if (customer.telegram_user_id && String(customer.telegram_user_id) !== telegramUserId) { await runAsync("ROLLBACK"); return { ok: false, reason: "rebind_rejected" }; }
    const collision: any = await getAsync("SELECT id FROM customers WHERE telegram_user_id=? AND id<>? LIMIT 1", [telegramUserId, customerId]);
    if (collision?.id) { await runAsync("ROLLBACK"); return { ok: false, reason: "identity_collision" }; }
    // telegram_user_id is authentication identity; chat ids are delivery only.
    await runAsync(`UPDATE customers SET telegram_user_id=?,telegram_chat_id=?,telegramChatId=?,telegram_linked_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'),telegram_opted_out=0,telegram_invalid=0,telegram_invalid_reason=NULL,telegram_invalid_at=NULL WHERE id=?`, [telegramUserId, chatId, chatId, customerId]);
    await runAsync("COMMIT");
    revokeMiniAppIdentitySessions("customer", customerId);
    await audit(null, "TELEGRAM_CUSTOMER_LINKED", "customer", customerId, "Customer Telegram identity linked through verified ownership.");
    return { ok: true, customerId };
  } catch (error) { await runAsync("ROLLBACK").catch(() => undefined); throw error; }
});

export const linkCustomerTelegramIdentityByPhone = async (phone: string, telegramUserId: string, chatId: string): Promise<CustomerLinkResult> => {
  const normalized = normalizeIranPhone(phone);
  if (!normalized) return { ok: false, reason: "not_found" };
  const rows = await allAsync("SELECT id,phoneNumber FROM customers WHERE COALESCE(phoneNumber,'')<>''", []);
  const matches = rows.filter((row: any) => normalizeIranPhone(String(row.phoneNumber || "")) === normalized);
  if (!matches.length) return { ok: false, reason: "not_found" };
  if (matches.length !== 1) return { ok: false, reason: "ambiguous" };
  return linkCustomerTelegramIdentityById(Number((matches[0] as any).id), telegramUserId, chatId);
};

export const updateCustomerTelegramDelivery = async (customerId: number, chatId: string): Promise<void> => {
  await runAsync("UPDATE customers SET telegramChatId=?,telegram_chat_id=? WHERE id=?", [chatId || null, chatId || null, customerId]);
};
export const updatePartnerTelegramDelivery = async (partnerId: number, chatId: string): Promise<void> => {
  await runAsync("UPDATE partners SET telegramChatId=?,telegram_chat_id=? WHERE id=?", [chatId || null, chatId || null, partnerId]);
};

export const unlinkCustomerTelegramIdentity = async (customerId: number, actor: Actor | null = null): Promise<boolean> => withRedemptionLock(async () => {
  await runAsync("BEGIN IMMEDIATE");
  try {
    const result = await runAsync(`UPDATE customers SET telegramChatId=NULL,telegram_chat_id=NULL,telegram_user_id=NULL,telegram_linked_at=NULL,telegram_opted_out=1 WHERE id=?`, [customerId]);
    await runAsync("UPDATE telegram_link_tokens SET status='canceled',last_error='identity unlinked' WHERE customer_id=? AND status IN ('issued','await_contact','await_otp')", [customerId]);
    await runAsync("COMMIT");
    revokeMiniAppIdentitySessions("customer", customerId);
    if (result.changes) await audit(actor, "CUSTOMER_TELEGRAM_UNLINKED", "customer", customerId, "Customer Telegram identity, delivery mapping, and active sessions revoked.");
    return result.changes > 0;
  } catch (error) { await runAsync("ROLLBACK").catch(() => undefined); throw error; }
});

export const unlinkPartnerTelegramIdentity = async (partnerId: number, actor: Actor | null = null): Promise<boolean> => withRedemptionLock(async () => {
  await runAsync("BEGIN IMMEDIATE");
  try {
    const canceled = await runAsync("UPDATE telegram_partner_link_tokens SET status='canceled',last_error='identity unlinked' WHERE partner_id=? AND status='issued'", [partnerId]);
    const result = await runAsync("UPDATE partners SET telegramChatId=NULL,telegram_chat_id=NULL,telegram_user_id=NULL,telegram_linked_at=NULL WHERE id=?", [partnerId]);
    await runAsync("COMMIT");
    revokeMiniAppIdentitySessions("partner", partnerId);
    if (canceled.changes) await audit(actor, "TELEGRAM_PARTNER_LINK_TOKEN_CANCELED", "partner", partnerId, "Pending Partner Telegram link tokens canceled during unlink.");
    if (result.changes) await audit(actor, "TELEGRAM_PARTNER_UNLINKED", "partner", partnerId, "Partner Telegram identity, delivery mapping, and active sessions revoked.");
    return result.changes > 0;
  } catch (error) { await runAsync("ROLLBACK").catch(() => undefined); throw error; }
});

export const loadFreshMiniAppIdentityBinding = async (kind: "customer" | "partner", subjectId: number, telegramUserId: string) => {
  const table = kind === "customer" ? "customers" : "partners";
  return getAsync(`SELECT id FROM ${table} WHERE id=? AND telegram_user_id=? LIMIT 1`, [subjectId, telegramUserId]);
};

export const auditLegacyTelegramAuthRejected = (kind: "customer" | "partner", reason: string) =>
  audit(null, `TELEGRAM_${kind.toUpperCase()}_LEGACY_AUTH_REJECTED`, kind, null, `Legacy Telegram authentication rejected: ${reason}.`);
