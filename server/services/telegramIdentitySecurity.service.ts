import crypto from "crypto";
import { getAsync, runAsync, allAsync } from "../db/query";
import { addManagementAuditLog } from "../security/managementAudit";
import { getAllSettingsAsObject, updateSetting } from "../db/domains/settings.db";
import { getTelegramBotInfo, sendTelegramMessage } from "../telegramService";
import { revokeMiniAppIdentitySessions, revokeMiniAppStaffSessions, revokeMiniAppTelegramUserSessions } from "../miniapp/miniAppSession";
import { normalizeIranPhone } from "../utils/iranPhone";
import { resolveUserTenantAuthorization } from "../db/domains/accessControl.db";
import { MANAGEMENT_PERMISSIONS, hasAnyManagementPermission } from "../security/managementAccessPolicy";

export const STAFF_TELEGRAM_ROLES = ["Admin", "Manager"] as const;
const PARTNER_TTL_MINUTES = 10;
const STAFF_TTL_MINUTES = 5;

const digest = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");
const newOpaqueToken = (): string => crypto.randomBytes(32).toString("base64url");
const validToken = (value: string): boolean => /^[A-Za-z0-9_-]{43}$/.test(value);
const escapeTelegramHtmlText = (value: unknown): string => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const isoAfterMinutes = (minutes: number): string => new Date(Date.now() + minutes * 60_000).toISOString();
const isStaffRole = (role: unknown): role is "Admin" | "Manager" => STAFF_TELEGRAM_ROLES.includes(role as any);

const isAccessControlSchemaMissing = (error: unknown): boolean => {
  const message = String((error as any)?.message || error || "");
  return message === "ACCESS_CONTROL_SCHEMA_UNAVAILABLE" ||
    /no such table:\s*(?:tenant_memberships|access_roles|access_role_permissions|tenant_membership_roles|access_permissions)/i.test(message);
};

const resolveStaffPermissionState = async (userId: number, legacyRoleName: unknown): Promise<{
  permissions: string[];
  source: "access_control" | "legacy_schema_fallback";
}> => {
  try {
    const authorization = await resolveUserTenantAuthorization(userId);
    return { permissions: authorization ? [...authorization.permissions] : [], source: "access_control" };
  } catch (error) {
    if (!isAccessControlSchemaMissing(error)) throw error;
    return {
      permissions: isStaffRole(legacyRoleName) ? [...MANAGEMENT_PERMISSIONS] : [],
      source: "legacy_schema_fallback",
    };
  }
};

// Telegram identity changes must be reflected at the public Mini App edge quickly.
// The snapshot runtime is loaded lazily here to avoid coupling the Telegram identity
// security service to snapshot startup. The committed DB identity is authoritative:
// Cloud/Edge synchronization is background-only and can never roll back the link.
const requestMiniAppSnapshotRefreshAfterIdentityChange = (
  kind: "customer" | "partner" | "manager",
  localSubjectId: number,
  expectedTelegramUserId: string | null,
): void => {
  void import("../cloud/snapshots/miniAppSnapshotRuntime")
    .then(({ requestMiniAppIdentitySnapshotSync }) => {
      requestMiniAppIdentitySnapshotSync({ kind, localSubjectId, expectedTelegramUserId });
    })
    .catch(() => undefined);
};

const requestMiniAppManagerAssociationRefresh = (
  userId: number,
  expectedTelegramUserId: string | null,
): void => {
  requestMiniAppSnapshotRefreshAfterIdentityChange("manager", userId, expectedTelegramUserId);
};
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

const audit = async (
  actor: Actor | null,
  action: string,
  entityType: string,
  entityId: number | null,
  description: string,
  details: { before?: unknown; after?: unknown; metadata?: unknown; source?: string } = {},
) => addManagementAuditLog({
  actor: actor ? { id: actor.id, username: actor.username ?? null, roleName: actor.roleName ?? null } : { username: "telegram", roleName: "Telegram" },
  action,
  entityType,
  entityId,
  description,
  source: details.source || "telegram_identity",
  before: details.before,
  after: details.after,
  metadata: details.metadata,
});

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
  if (String(partner.telegram_user_id || "").trim()) throw new Error("TELEGRAM_PARTNER_ALREADY_LINKED");
  const ttl = Math.min(30, Math.max(1, Number(requestedMinutes) || PARTNER_TTL_MINUTES));
  const created = await issueLatest("telegram_partner_link_tokens", "partner_id", partnerId, ttl);
  if (created.canceled) await audit(actor, "TELEGRAM_PARTNER_LINK_TOKEN_CANCELED", "partner", partnerId, "Older pending Partner Telegram link tokens canceled.");
  await audit(actor, "TELEGRAM_PARTNER_LINK_ISSUED", "partner", partnerId, "Secure one-time Telegram partner link issued.");
  return { ...created, partnerName: String(partner.partnerName || ""), linked: false, rebind: false };
};

export const issuePartnerTelegramRelink = async (partnerId: number, actor: Actor, requestedMinutes?: number) => {
  const partner: any = await getAsync("SELECT id, partnerName, telegram_user_id FROM partners WHERE id=? LIMIT 1", [partnerId]);
  if (!partner?.id) return null;
  const previousTelegramUserId = String(partner.telegram_user_id || "").trim();
  if (!previousTelegramUserId) throw new Error("TELEGRAM_PARTNER_NOT_LINKED");
  const ttl = Math.min(30, Math.max(1, Number(requestedMinutes) || PARTNER_TTL_MINUTES));
  const created = await issueLatest("telegram_partner_link_tokens", "partner_id", partnerId, ttl);
  await runAsync(
    "UPDATE telegram_partner_link_tokens SET allow_rebind=1,previous_telegram_user_id=? WHERE token_hash=? AND partner_id=? AND status='issued'",
    [previousTelegramUserId, digest(created.token), partnerId],
  );
  if (created.canceled) await audit(actor, "TELEGRAM_PARTNER_LINK_TOKEN_CANCELED", "partner", partnerId, "Older pending Partner Telegram link tokens canceled before secure re-link.");
  await audit(actor, "TELEGRAM_PARTNER_RELINK_ISSUED", "partner", partnerId, "Secure one-time Partner Telegram re-link issued; existing binding remains active until redemption.", {
    before: { telegramUserId: previousTelegramUserId },
    after: { state: "relink_pending", expiresAt: created.expiresAt },
    metadata: { ttlMinutes: ttl },
  });
  return { ...created, partnerName: String(partner.partnerName || ""), linked: true, rebind: true };
};

export const issueStaffTelegramLink = async (userId: number, actor: Actor) => {
  const user: any = await getAsync(`SELECT u.id,u.username,u.firstName,u.lastName,r.name AS roleName FROM users u JOIN roles r ON r.id=u.roleId WHERE u.id=? LIMIT 1`, [userId]);
  if (!user?.id) return null;
  const access = await resolveStaffPermissionState(userId, user.roleName);
  if (!hasAnyManagementPermission(access.permissions)) return null;
  const created = await issueLatest("telegram_staff_link_tokens", "user_id", userId, STAFF_TTL_MINUTES);
  if (created.canceled) await audit(actor, "TELEGRAM_STAFF_LINK_TOKEN_CANCELED", "user", userId, "Older pending Manager Telegram link tokens canceled.", { metadata: { canceledTokens: created.canceled } });
  await audit(actor, "TELEGRAM_STAFF_LINK_ISSUED", "user", userId, "Secure one-time Telegram Manager link issued.", {
    after: { state: "pending", expiresAt: created.expiresAt },
    metadata: { permissions: access.permissions, ttlMinutes: STAFF_TTL_MINUTES },
  });
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
  return { ...created, roleName: user.roleName, displayName: String(displayName), permissions: access.permissions };
};

export type TelegramManagerBindingSummary = {
  userId: number;
  username: string;
  displayName: string;
  legacyRoleName: string;
  membershipId: number | null;
  membershipStatus: "active" | "suspended" | "revoked" | "legacy";
  accessRoles: Array<{ key: string; name: string }>;
  permissions: string[];
  telegram: {
    state: "linked" | "pending" | "not_linked";
    linkedAt: string | null;
    telegramUserId: string | null;
    pendingExpiresAt: string | null;
  };
};

export const listTelegramManagers = async (): Promise<TelegramManagerBindingSummary[]> => {
  const users: any[] = await allAsync(`SELECT u.id,u.username,u.firstName,u.lastName,r.name AS roleName FROM users u JOIN roles r ON r.id=u.roleId ORDER BY u.id ASC`, []);
  const result: TelegramManagerBindingSummary[] = [];
  for (const user of users || []) {
    let authorization: Awaited<ReturnType<typeof resolveUserTenantAuthorization>> | null = null;
    let permissions: string[] = [];
    let membershipStatus: TelegramManagerBindingSummary["membershipStatus"] = "legacy";
    let accessRoles: Array<{ key: string; name: string }> = [];
    try {
      authorization = await resolveUserTenantAuthorization(Number(user.id));
      permissions = authorization ? [...authorization.permissions] : [];
      membershipStatus = authorization?.status || "revoked";
      accessRoles = authorization?.roles.map((role) => ({ key: role.key, name: role.name })) || [];
    } catch (error) {
      if (!isAccessControlSchemaMissing(error)) throw error;
      permissions = isStaffRole(user.roleName) ? [...MANAGEMENT_PERMISSIONS] : [];
      membershipStatus = "legacy";
      accessRoles = isStaffRole(user.roleName) ? [{ key: "legacy_manager", name: String(user.roleName) }] : [];
    }
    if (!hasAnyManagementPermission(permissions)) continue;
    const telegram = await getStaffTelegramStatus(Number(user.id));
    result.push({
      userId: Number(user.id),
      username: String(user.username || ""),
      displayName: String([user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || `#${user.id}`),
      legacyRoleName: String(user.roleName || ""),
      membershipId: authorization?.membershipId ?? null,
      membershipStatus,
      accessRoles,
      permissions,
      telegram: {
        state: telegram.state,
        linkedAt: telegram.linkedAt ?? null,
        telegramUserId: telegram.telegramUserId ?? null,
        pendingExpiresAt: telegram.pendingExpiresAt ?? null,
      },
    });
  }
  return result;
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
    const currentTelegramUserId = String(row.current_user || "").trim();
    const previousTelegramUserId = String(row.previous_telegram_user_id || "").trim();
    const isExplicitRebind = Number(row.allow_rebind || 0) === 1;
    if (currentTelegramUserId && currentTelegramUserId !== telegramUserId) {
      if (!isExplicitRebind) { await runAsync("ROLLBACK"); return reject("partner", row.partner_id, "REBIND_REJECTED"); }
      if (!previousTelegramUserId || previousTelegramUserId !== currentTelegramUserId) { await runAsync("ROLLBACK"); return reject("partner", row.partner_id, "REBIND_STALE"); }
    }
    const collision: any = await getAsync("SELECT id FROM partners WHERE telegram_user_id=? AND id<>? LIMIT 1", [telegramUserId, row.partner_id]);
    if (collision?.id) { await runAsync("ROLLBACK"); return reject("partner", row.partner_id, "IDENTITY_COLLISION"); }
    const claimed = await runAsync(`UPDATE telegram_partner_link_tokens SET status='used',used_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'),telegram_user_id=?,chat_id=? WHERE id=? AND status='issued'`, [telegramUserId, chatId, row.id]);
    if (claimed.changes !== 1) { await runAsync("ROLLBACK"); return reject("partner", row.partner_id, "ALREADY_USED"); }
    await runAsync(`UPDATE partners SET telegram_user_id=?,telegram_chat_id=?,telegramChatId=?,telegram_linked_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`, [telegramUserId, chatId, chatId, row.partner_id]);
    await runAsync("COMMIT");
    revokeMiniAppIdentitySessions("partner", Number(row.partner_id));
    if (isExplicitRebind && previousTelegramUserId && previousTelegramUserId !== telegramUserId) {
      revokeMiniAppTelegramUserSessions(previousTelegramUserId);
    }
    revokeMiniAppTelegramUserSessions(telegramUserId);
    requestMiniAppSnapshotRefreshAfterIdentityChange("partner", Number(row.partner_id), telegramUserId);
    await audit(null, isExplicitRebind ? "TELEGRAM_PARTNER_RELINKED" : "TELEGRAM_PARTNER_LINKED", "partner", row.partner_id, isExplicitRebind
      ? "Partner Telegram identity securely re-linked through an explicitly authorized one-time token."
      : "Partner Telegram identity linked through a one-time token.", {
        before: isExplicitRebind ? { telegramUserId: previousTelegramUserId || null } : undefined,
        after: { telegramUserId },
      });
    return { ok: true, code: isExplicitRebind ? "RELINKED" : "LINKED", displayName: String(row.partnerName) };
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
    const access = await resolveStaffPermissionState(Number(row.user_id), row.roleName);
    if (!hasAnyManagementPermission(access.permissions)) { await runAsync("ROLLBACK"); return reject("staff", row.user_id, "ROLE_FORBIDDEN"); }
    if (row.current_user && String(row.current_user) !== telegramUserId) { await runAsync("ROLLBACK"); return reject("staff", row.user_id, "REBIND_REJECTED"); }
    const collision: any = await getAsync("SELECT user_id FROM user_telegram_links WHERE telegram_user_id=? AND user_id<>? LIMIT 1", [telegramUserId, row.user_id]);
    if (collision?.user_id) { await runAsync("ROLLBACK"); return reject("staff", row.user_id, "IDENTITY_COLLISION"); }
    const claimed = await runAsync(`UPDATE telegram_staff_link_tokens SET status='used',used_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'),telegram_user_id=?,chat_id=? WHERE id=? AND status='issued'`, [telegramUserId, chatId, row.id]);
    if (claimed.changes !== 1) { await runAsync("ROLLBACK"); return reject("staff", row.user_id, "ALREADY_USED"); }
    await runAsync(`INSERT INTO user_telegram_links(user_id,telegram_user_id,chat_id) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET telegram_user_id=excluded.telegram_user_id,chat_id=excluded.chat_id,updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')`, [row.user_id, telegramUserId, chatId]);
    await runAsync("COMMIT");
    const revokedSessions = revokeMiniAppTelegramUserSessions(telegramUserId);
    requestMiniAppManagerAssociationRefresh(Number(row.user_id), telegramUserId);
    await audit(null, "TELEGRAM_STAFF_LINKED", "user", row.user_id, "Staff Telegram identity linked through a one-time token.", {
      after: { state: "linked", hasTelegramIdentity: true },
      metadata: { sessionsRevoked: revokedSessions, managerAssociationRefreshRequested: true },
    });
    const name = [row.firstName, row.lastName].filter(Boolean).join(" ") || row.username;
    return { ok: true, code: "LINKED", displayName: String(name), roleName: row.roleName };
  } catch (error) {
    await runAsync("ROLLBACK").catch(() => undefined);
    throw error;
  }
};
export const redeemStaffTelegramLink = (token: string, telegramUserId: string, chatId: string, isPrivate: boolean): Promise<Redemption> =>
  withRedemptionLock(() => redeemStaffTelegramLinkUnlocked(token, telegramUserId, chatId, isPrivate));

export const getStaffTelegramStatus = async (userId: number): Promise<{
  state: "linked" | "pending" | "not_linked";
  linkedAt?: string | null;
  telegramUserId?: string | null;
  pendingExpiresAt?: string | null;
}> => {
  const row: any = await getAsync("SELECT telegram_user_id,chat_id,linked_at FROM user_telegram_links WHERE user_id=? LIMIT 1", [userId]);
  const pending: any = await getAsync(
    `SELECT expires_at FROM telegram_staff_link_tokens
     WHERE user_id=? AND status='issued' AND datetime(expires_at)>datetime('now')
     ORDER BY id DESC LIMIT 1`,
    [userId],
  );
  if (row) {
    return {
      state: "linked",
      linkedAt: row.linked_at || null,
      telegramUserId: String(row.telegram_user_id),
      pendingExpiresAt: pending?.expires_at || null,
    };
  }
  if (pending?.expires_at) return { state: "pending", linkedAt: null, telegramUserId: null, pendingExpiresAt: pending.expires_at };
  return { state: "not_linked", linkedAt: null, telegramUserId: null, pendingExpiresAt: null };
};

export const revokeStaffTelegramBinding = async (userId: number, actor: Actor): Promise<{ unlinked: boolean; canceledTokens: number }> => {
  const before = await getStaffTelegramStatus(userId);
  await runAsync("BEGIN IMMEDIATE");
  try {
    const result = await runAsync("DELETE FROM user_telegram_links WHERE user_id=?", [userId]);
    const canceled = await runAsync("UPDATE telegram_staff_link_tokens SET status='canceled',last_error='revoked' WHERE user_id=? AND status='issued'", [userId]);
    await runAsync("COMMIT");
    const revokedSessions = before.telegramUserId
      ? revokeMiniAppTelegramUserSessions(before.telegramUserId)
      : revokeMiniAppStaffSessions(userId);
    if (result.changes) requestMiniAppManagerAssociationRefresh(userId, null);
    if (result.changes || canceled.changes || revokedSessions) {
      await audit(
        actor,
        "TELEGRAM_STAFF_LINK_REVOKED",
        "user",
        userId,
        `Manager Telegram access revoked; bindingRemoved=${result.changes > 0}; pendingTokensCanceled=${canceled.changes}; sessionsRevoked=${revokedSessions}.`,
        {
          before: { state: before.state, linkedAt: before.linkedAt || null, hasTelegramIdentity: Boolean(before.telegramUserId), pendingExpiresAt: before.pendingExpiresAt || null },
          after: { state: "not_linked", linkedAt: null, hasTelegramIdentity: false, pendingExpiresAt: null },
          metadata: { bindingRemoved: result.changes > 0, pendingTokensCanceled: canceled.changes, sessionsRevoked: revokedSessions },
        },
      );
    }
    return { unlinked: result.changes > 0, canceledTokens: canceled.changes };
  } catch (error) {
    await runAsync("ROLLBACK").catch(() => undefined);
    throw error;
  }
};

export const revokeManagerTelegramBinding = async (userId: number, actor: Actor): Promise<{ unlinked: boolean; canceledTokens: number }> => {
  const authorization = await resolveUserTenantAuthorization(userId);
  if (!authorization || !hasAnyManagementPermission(authorization.permissions)) {
    throw new Error("TELEGRAM_MANAGER_ACCESS_REVOKED");
  }
  return revokeStaffTelegramBinding(userId, actor);
};

export const unlinkStaffTelegram = async (userId: number, actor: Actor): Promise<boolean> =>
  (await revokeStaffTelegramBinding(userId, actor)).unlinked;

export const sendStaffTelegramTestMessage = async (userId: number, actor: Actor): Promise<{ sentAt: string; telegramUserId: string }> => {
  const user: any = await getAsync(`SELECT u.id,u.username,u.firstName,u.lastName,r.name AS roleName,l.telegram_user_id,l.chat_id FROM users u JOIN roles r ON r.id=u.roleId LEFT JOIN user_telegram_links l ON l.user_id=u.id WHERE u.id=? LIMIT 1`, [userId]);
  if (!user?.id) throw new Error("TELEGRAM_MANAGER_USER_NOT_FOUND");
  const access = await resolveStaffPermissionState(userId, user.roleName);
  if (!hasAnyManagementPermission(access.permissions)) throw new Error("TELEGRAM_MANAGER_ACCESS_REVOKED");
  if (!user.telegram_user_id || !user.chat_id) throw new Error("TELEGRAM_MANAGER_NOT_LINKED");
  const settings = await getAllSettingsAsObject();
  const botToken = String((settings as any).telegram_bot_token || "").trim();
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN_MISSING");
  const displayName = String([user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "مدیر");
  const sentAt = new Date().toISOString();
  const message = [
    "✅ <b>پیام آزمایشی مرکز مدیریت تلگرام</b>",
    "",
    `مدیر: <b>${escapeTelegramHtmlText(displayName)}</b>`,
    "اتصال این حساب به Telegram Management Center فعال است.",
  ].join("\n");
  try {
    const result = await sendTelegramMessage(botToken, String(user.chat_id), message, { parseMode: "HTML", disableWebPreview: true });
    if (!result?.success) throw new Error(String(result?.message || result?.errorCode || "TELEGRAM_API_ERROR"));
    await audit(actor, "TELEGRAM_STAFF_TEST_MESSAGE_SENT", "user", userId, "Telegram Manager test message delivered successfully.", {
      metadata: { sentAt, hasTelegramIdentity: true },
    });
    return { sentAt, telegramUserId: String(user.telegram_user_id) };
  } catch (error) {
    await audit(actor, "TELEGRAM_STAFF_TEST_MESSAGE_FAILED", "user", userId, `Telegram Manager test message failed: ${String((error as any)?.message || error || "unknown")}.`);
    throw new Error("TELEGRAM_MANAGER_TEST_SEND_FAILED");
  }
};

export const loadFreshStaffAuthorizationResult = async (userId: number, telegramUserId: string) => {
  const row: any = await getAsync(`SELECT u.id,u.username,u.firstName,u.lastName,r.name AS roleName,l.telegram_user_id FROM users u JOIN roles r ON r.id=u.roleId JOIN user_telegram_links l ON l.user_id=u.id WHERE u.id=? AND l.telegram_user_id=? LIMIT 1`, [userId, telegramUserId]);
  if (!row) return { authorization: null, reason: "binding_invalid" as const };
  const access = await resolveStaffPermissionState(userId, row.roleName);
  if (!hasAnyManagementPermission(access.permissions)) return { authorization: null, reason: "role_denied" as const };
  return { authorization: { ...row, permissions: access.permissions }, reason: null };
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
    requestMiniAppSnapshotRefreshAfterIdentityChange("customer", customerId, telegramUserId);
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

export type PartnerPhoneLinkResult = { ok: true; partnerId: number } | { ok: false; reason: "not_found" | "ambiguous" | "identity_collision" | "rebind_rejected" };

export const linkPartnerTelegramIdentityById = async (partnerId: number, telegramUserId: string, chatId: string): Promise<PartnerPhoneLinkResult> => withRedemptionLock(async () => {
  if (!partnerId || !telegramUserId || !chatId) return { ok: false, reason: "not_found" };
  await runAsync("BEGIN IMMEDIATE");
  try {
    const partner: any = await getAsync("SELECT id,telegram_user_id FROM partners WHERE id=? LIMIT 1", [partnerId]);
    if (!partner?.id) { await runAsync("ROLLBACK"); return { ok: false, reason: "not_found" }; }
    if (partner.telegram_user_id && String(partner.telegram_user_id) !== telegramUserId) { await runAsync("ROLLBACK"); return { ok: false, reason: "rebind_rejected" }; }
    const collision: any = await getAsync("SELECT id FROM partners WHERE telegram_user_id=? AND id<>? LIMIT 1", [telegramUserId, partnerId]);
    if (collision?.id) { await runAsync("ROLLBACK"); return { ok: false, reason: "identity_collision" }; }
    await runAsync(`UPDATE partners SET telegram_user_id=?,telegram_chat_id=?,telegramChatId=?,telegram_linked_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`, [telegramUserId, chatId, chatId, partnerId]);
    await runAsync("COMMIT");
    revokeMiniAppIdentitySessions("partner", partnerId);
    requestMiniAppSnapshotRefreshAfterIdentityChange("partner", partnerId, telegramUserId);
    await audit(null, "TELEGRAM_PARTNER_LINKED", "partner", partnerId, "Partner Telegram identity linked through verified Telegram self-contact and unique stored phone.");
    return { ok: true, partnerId };
  } catch (error) {
    await runAsync("ROLLBACK").catch(() => undefined);
    throw error;
  }
});

export const linkPartnerTelegramIdentityByPhone = async (phone: string, telegramUserId: string, chatId: string): Promise<PartnerPhoneLinkResult> => {
  const normalized = normalizeIranPhone(phone);
  if (!normalized) return { ok: false, reason: "not_found" };
  const rows = await allAsync("SELECT id,phoneNumber FROM partners WHERE COALESCE(phoneNumber,'')<>''", []);
  const matches = rows.filter((row: any) => normalizeIranPhone(String(row.phoneNumber || "")) === normalized);
  if (!matches.length) return { ok: false, reason: "not_found" };
  if (matches.length !== 1) return { ok: false, reason: "ambiguous" };
  return linkPartnerTelegramIdentityById(Number((matches[0] as any).id), telegramUserId, chatId);
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
    requestMiniAppSnapshotRefreshAfterIdentityChange("customer", customerId, null);
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
    requestMiniAppSnapshotRefreshAfterIdentityChange("partner", partnerId, null);
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
