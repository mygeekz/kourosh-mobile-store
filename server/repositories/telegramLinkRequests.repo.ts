import crypto from "crypto";
import moment from "jalali-moment";

import { getAsync, runAsync } from "../db/query";
import { normalizeIranPhone } from "../utils/iranPhone";
import {
  linkCustomerTelegramIdentityById,
  linkCustomerTelegramIdentityByPhone,
  unlinkPartnerTelegramIdentity,
} from "../services/telegramIdentitySecurity.service";

// -----------------------------
// Telegram Link Requests (Model A)
// -----------------------------
// Pending OTP-based linking requests.
// A customer is linked only after OTP verification.

export type TelegramLinkRequestStatus =
  | "pending"
  | "verified"
  | "expired"
  | "blocked";

export interface TelegramLinkRequestRow {
  id: number;
  phone: string;
  chat_id: string;
  telegram_user_id: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  status: TelegramLinkRequestStatus;
  created_at: string;
  verified_at?: string | null;
  last_error?: string | null;
}

// ==========================================
// Telegram Link Requests (Model A) helpers
// ==========================================

export const upsertTelegramLinkRequest = async (opts: {
  phone: string;
  chatId: string;
  telegramUserId: string;
  codeHash: string;
  expiresAtISO: string;
}): Promise<{ id: number }> => {
  const phone = normalizeIranPhone(opts.phone);
  const chatId = String(opts.chatId || "").trim();
  const telegramUserId = String(opts.telegramUserId || "").trim();
  if (!phone || !chatId || !telegramUserId)
    throw new Error("Invalid link request");

  // Upsert by chat_id
  await runAsync(
    `INSERT INTO telegram_link_requests (phone, chat_id, telegram_user_id, code_hash, expires_at, attempts, status, last_error)
     VALUES (?,?,?,?,?,0,'pending',NULL)
     ON CONFLICT(chat_id) DO UPDATE SET
       phone=excluded.phone,
       telegram_user_id=excluded.telegram_user_id,
       code_hash=excluded.code_hash,
       expires_at=excluded.expires_at,
       attempts=0,
       status='pending',
       last_error=NULL,
       verified_at=NULL`,
    [phone, chatId, telegramUserId, opts.codeHash, opts.expiresAtISO],
  );
  const row = await getAsync(
    `SELECT id FROM telegram_link_requests WHERE chat_id=? LIMIT 1`,
    [chatId],
  );
  return { id: Number(row?.id || 0) };
};

export const getPendingTelegramLinkRequestByChatId = async (
  chatId: string,
): Promise<TelegramLinkRequestRow | null> => {
  const id = String(chatId || "").trim();
  if (!id) return null;
  // expire old ones lazily
  await runAsync(
    `UPDATE telegram_link_requests SET status='expired'
     WHERE status='pending' AND expires_at < ?`,
    [moment().toISOString()],
  ).catch(() => {});

  const row = await getAsync(
    `SELECT * FROM telegram_link_requests WHERE chat_id=? AND status='pending' LIMIT 1`,
    [id],
  );
  return (row as any) || null;
};

export const bumpTelegramLinkRequestAttempt = async (
  id: number,
  errMsg?: string | null,
) => {
  await runAsync(
    `UPDATE telegram_link_requests
     SET attempts = attempts + 1,
         last_error = COALESCE(?, last_error)
     WHERE id=?`,
    [errMsg ?? null, Number(id)],
  );
};

export const markTelegramLinkRequestVerified = async (id: number) => {
  await runAsync(
    `UPDATE telegram_link_requests
     SET status='verified', verified_at=?
     WHERE id=?`,
    [moment().toISOString(), Number(id)],
  );
};

export const linkCustomerTelegramByPhone = async (opts: {
  phone: string;
  chatId: string;
  telegramUserId: string;
}) => {
  return linkCustomerTelegramIdentityByPhone(opts.phone, String(opts.telegramUserId || "").trim(), String(opts.chatId || "").trim());
};

export const getLinkedPartnerByChatId = async (
  chatId: string,
): Promise<any | null> => {
  const id = String(chatId || "").trim();
  if (!id) return null;
  try {
    return await getAsync(
      `SELECT id, partnerName, phoneNumber, telegramChatId, telegram_linked_at
       FROM partners
       WHERE telegramChatId=?
       LIMIT 1`,
      [id],
    );
  } catch {
    return await getAsync(
      `SELECT id, partnerName, phoneNumber, telegramChatId
       FROM partners
       WHERE telegramChatId=?
       LIMIT 1`,
      [id],
    );
  }
};

export const linkPartnerTelegramByPhone = async (opts: {
  phone: string;
  chatId: string;
}) => {
  void opts;
  return { ok: false as const, reason: "PARTNER_SECURE_LINK_REQUIRED" as const };
};

export const unlinkPartnerTelegram = async (partnerId: number) => {
  return unlinkPartnerTelegramIdentity(Number(partnerId));
};

const sha256Hex = (s: string) =>
  crypto.createHash("sha256").update(String(s)).digest("hex");

export const createTelegramLinkToken = async (opts: {
  customerId: number;
  expiresMinutes?: number;
}) => {
  const customerId = Number(opts.customerId || 0);
  if (!customerId) throw new Error("customerId is required");

  const c = await getAsync(
    `SELECT phoneNumber FROM customers WHERE id=? LIMIT 1`,
    [customerId],
  );
  const expectedPhone = c?.phoneNumber
    ? normalizeIranPhone(String(c.phoneNumber))
    : null;

  const tokenPlain = crypto.randomBytes(18).toString("base64url"); // URL-safe
  const tokenHash = sha256Hex(tokenPlain);

  const mins = Math.max(
    5,
    Math.min(24 * 60, Number(opts.expiresMinutes ?? 60)),
  );
  const expiresAtISO = moment().add(mins, "minutes").toISOString();

  await runAsync(
    `INSERT INTO telegram_link_tokens (token_hash, customer_id, expected_phone, expires_at, status)
     VALUES (?,?,?,?, 'issued')`,
    [tokenHash, customerId, expectedPhone, expiresAtISO],
  );

  const row = await getAsync(
    `SELECT id FROM telegram_link_tokens WHERE token_hash=? LIMIT 1`,
    [tokenHash],
  );
  return {
    id: Number(row?.id || 0),
    token: tokenPlain,
    expiresAtISO,
    expectedPhone,
  };
};

export const getTelegramLinkTokenByPlainToken = async (plainToken: string) => {
  const t = String(plainToken || "").trim();
  if (!t) return null;

  // expire old tokens lazily
  await runAsync(
    `UPDATE telegram_link_tokens SET status='expired'
     WHERE status IN ('issued','await_contact','await_otp') AND expires_at < ?`,
    [moment().toISOString()],
  ).catch(() => {});

  const hash = sha256Hex(t);
  const row = await getAsync(
    `SELECT * FROM telegram_link_tokens WHERE token_hash=? LIMIT 1`,
    [hash],
  );
  return (row as any) || null;
};

export const getPendingTelegramLinkTokenByChatId = async (chatId: string) => {
  const id = String(chatId || "").trim();
  if (!id) return null;
  const row = await getAsync(
    `SELECT * FROM telegram_link_tokens
     WHERE chat_id=? AND status IN ('await_contact','await_otp')
     ORDER BY id DESC LIMIT 1`,
    [id],
  );
  return (row as any) || null;
};

export const markTelegramLinkTokenStatus = async (
  id: number,
  status: string,
  extra?: { chatId?: string; telegramUserId?: string; err?: string | null },
) => {
  await runAsync(
    `UPDATE telegram_link_tokens
     SET status=?,
         chat_id=COALESCE(?, chat_id),
         telegram_user_id=COALESCE(?, telegram_user_id),
         used_at=CASE WHEN ? IN ('used','canceled','expired') THEN COALESCE(used_at, ?) ELSE used_at END,
         last_error=COALESCE(?, last_error)
     WHERE id=?`,
    [
      status,
      extra?.chatId ?? null,
      extra?.telegramUserId ?? null,
      status,
      moment().toISOString(),
      extra?.err ?? null,
      Number(id),
    ],
  );
};

export const linkCustomerTelegramById = async (opts: {
  customerId: number;
  chatId: string;
  telegramUserId: string;
}) => {
  return linkCustomerTelegramIdentityById(Number(opts.customerId || 0), String(opts.telegramUserId || "").trim(), String(opts.chatId || "").trim());
};
