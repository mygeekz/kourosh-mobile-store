import type { Express } from "express";
import { allAsync, getAsync, runAsync } from "../database";
import {
  unlinkCustomerTelegramIdentity,
  updateCustomerTelegramDelivery,
} from "../services/telegramIdentitySecurity.service";

type AuthorizeRole = (roles: string[]) => any;

type TelegramInboxRouteDeps = {
  authorizeRole: AuthorizeRole;
  ensureTelegramInboxTable: () => Promise<void>;
  ensureNotificationOutboxTables: () => Promise<void>;
  ensureCustomerTelegramColumns: () => Promise<void>;
};

export const registerTelegramInboxRoutes = (
  app: Express,
  deps: TelegramInboxRouteDeps,
): void => {
  const {
    authorizeRole,
    ensureTelegramInboxTable,
    ensureNotificationOutboxTables,
    ensureCustomerTelegramColumns,
  } = deps;

  // Telegram Inbox list
  app.get(
    "/api/telegram/inbox",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        await ensureTelegramInboxTable();
        await ensureCustomerTelegramColumns();
        res.setHeader("Cache-Control", "no-store");

        const limit = Math.min(Math.max(parseInt(String(req.query.limit || "12"), 10) || 12, 1), 100);
        const offset = Math.max(parseInt(String(req.query.offset || "0"), 10) || 0, 0);
        const chatId = String(req.query.chatId || "").trim();
        const from = String(req.query.from || "").trim();
        const to = String(req.query.to || "").trim();
        const q = String(req.query.q || "").trim().toLowerCase();
        const support = String(req.query.support || "ALL").trim().toLowerCase();
        const where: string[] = [];
        const args: any[] = [];
        if (chatId) {
          where.push(`ti.chatId=?`);
          args.push(chatId);
        }
        if (from) {
          where.push(`datetime(ti.createdAt) >= datetime(?)`);
          args.push(from);
        }
        if (to) {
          where.push(`datetime(ti.createdAt) <= datetime(?)`);
          args.push(to);
        }

        const rows: any[] = await allAsync(
          `SELECT
             ti.id, ti.chatId, ti.fromId, ti.kind, ti.text, ti.createdAt,
             c.id AS customerId,
             c.fullName AS customerName,
             c.phoneNumber AS customerPhone,
             COALESCE(c.telegram_opted_out,0) AS telegramOptedOut
           FROM telegram_inbox ti
           LEFT JOIN customers c
             ON (COALESCE(c.telegram_chat_id, c.telegramChatId) = ti.chatId)
           ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
           ORDER BY ti.id DESC
           LIMIT 5000`,
          args,
        );

        const scoped = (rows || []).filter((row: any) => {
          if (support === "open" && row.customerId) return false;
          if (support === "resolved" && !row.customerId) return false;
          if (!q) return true;
          const haystack = [
            row.id,
            row.chatId,
            row.fromId,
            row.kind,
            row.text,
            row.customerId,
            row.customerName,
            row.customerPhone,
          ].filter(Boolean).join(" ").toLowerCase();
          return haystack.includes(q);
        });

        const linked = scoped.filter((row: any) => Boolean(row.customerId)).length;
        const unlinked = scoped.length - linked;
        const data = scoped.slice(offset, offset + limit);
        res.json({
          success: true,
          data,
          meta: {
            pagination: { limit, offset, total: scoped.length },
            stats: { total: scoped.length, linked, unlinked },
            generatedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        next(error);
      }
    },
  );
  // Telegram Conversation (Inbox + Outbox merged) for a specific customer or partner
  app.get(
    "/api/telegram/conversation",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        await ensureTelegramInboxTable();
        await ensureNotificationOutboxTables();
        await ensureCustomerTelegramColumns();
        const customerId = Number(req.query.customerId || 0);
        const partnerId = Number(req.query.partnerId || 0);
        const limit = Math.min(
          parseInt(String(req.query.limit || "250"), 10) || 250,
          800,
        );
        if (!customerId && !partnerId)
          return res.status(400).json({
            success: false,
            message: "شناسه مشتری یا همکار نامعتبر است.",
          });

        let chatId = "";
        let c: any = null;
        let p: any = null;
        if (partnerId) {
          p = await getAsync(
            `SELECT id, partnerName, phoneNumber, telegramChatId
           FROM partners WHERE id=? LIMIT 1`,
            [partnerId],
          );
          if (!p)
            return res
              .status(404)
              .json({ success: false, message: "همکار پیدا نشد." });
          chatId = String(p?.telegramChatId || "").trim();
        } else {
          c = await getAsync(
            `SELECT id, fullName, phoneNumber,
                  COALESCE(telegram_chat_id, telegramChatId) AS telegramChatId,
                  COALESCE(telegram_opted_out,0) AS telegramOptedOut,
                  COALESCE(telegram_invalid,0) AS telegramInvalid,
                  telegram_invalid_reason AS telegramInvalidReason
           FROM customers WHERE id=? LIMIT 1`,
            [customerId],
          );
          if (!c)
            return res
              .status(404)
              .json({ success: false, message: "مشتری پیدا نشد." });
          chatId = String(c?.telegramChatId || "").trim();
        }
        const inboxRows: any[] = chatId
          ? await allAsync(
              `SELECT id, chatId, fromId, kind, text, payloadJson, createdAt
             FROM telegram_inbox
             WHERE chatId=?
             ORDER BY id DESC
             LIMIT ?`,
              [chatId, Math.floor(limit / 2)],
            )
          : [];
        const outboxRows: any[] = partnerId
          ? await allAsync(
              `SELECT id, channel, eventType, entityType, entityId, recipient, payloadJson, status, attempts, lastError, telegramMessageId, createdAt, updatedAt
             FROM notification_outbox
             WHERE channel='telegram' AND entityType='partner' AND entityId=?
             ORDER BY id DESC
             LIMIT ?`,
              [partnerId, Math.floor(limit / 2)],
            )
          : await allAsync(
              `SELECT id, channel, eventType, entityType, entityId, recipient, payloadJson, status, attempts, lastError, telegramMessageId, createdAt, updatedAt
             FROM notification_outbox
             WHERE channel='telegram' AND capCustomerId=?
             ORDER BY id DESC
             LIMIT ?`,
              [customerId, Math.floor(limit / 2)],
            );
        const safeJson = (s: any) => {
          try {
            return s ? JSON.parse(String(s)) : null;
          } catch {
            return null;
          }
        };
        const classifyError = (msg: string) => {
          const m = String(msg || "").toLowerCase();
          if (!m) return undefined;
          if (m.includes("blocked") || m.includes("bot was blocked"))
            return "blocked";
          if (m.includes("chat not found") || m.includes("user not found"))
            return "chat_not_found";
          if (
            m.includes("proxy") ||
            m.includes("socks") ||
            m.includes("econnrefused") ||
            m.includes("timeout")
          )
            return "proxy_error";
          return "other";
        };
        const inbox = (inboxRows || []).map((r) => {
          const p = safeJson(r.payloadJson);
          // Telegram update payload usually has update.message.message_id
          const messageId =
            Number(
              p?.message?.message_id ||
                p?.edited_message?.message_id ||
                p?.callback_query?.message?.message_id ||
                p?.message_id ||
                0,
            ) || null;
          const hasPhoto =
            Array.isArray(p?.message?.photo) && p.message.photo.length > 0;
          const hasDoc = !!p?.message?.document;
          const kind = hasPhoto
            ? "photo"
            : hasDoc
              ? "document"
              : r.kind || "message";
          return {
            id: `in_${r.id}`,
            direction: "in",
            kind,
            text: String(r.text || ""),
            telegramMessageId: messageId,
            createdAt: r.createdAt,
          };
        });
        const outbox = (outboxRows || []).map((r) => {
          const payload = safeJson(r.payloadJson) || {};
          const msgType = String(payload?.type || "message");
          const text = String(
            payload?.text ??
              payload?.caption ??
              payload?.message ??
              payload?.body ??
              payload?.tokens?.[0] ??
              "",
          );
          const parseMode = payload?.parse_mode || payload?.parseMode;
          const fileRelPath =
            payload?.fileRelPath || payload?.filePath || payload?.relPath || null;
          const mediaUrl = fileRelPath
            ? String(fileRelPath).startsWith("/")
              ? String(fileRelPath)
              : `/${String(fileRelPath)}`
            : null;
          return {
            id: `out_${r.id}`,
            direction: "out",
            kind:
              msgType === "photo" || msgType === "document" ? msgType : "message",
            text,
            mediaUrl,
            parseMode,
            telegramMessageId: Number(r.telegramMessageId || 0) || null,
            status: r.status,
            attempts: Number(r.attempts || 0),
            lastError: r.lastError || null,
            errorCategory: classifyError(r.lastError),
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          };
        });
        const merged = [...inbox, ...outbox]
          .filter((x) => x?.createdAt)
          .sort((a: any, b: any) => {
            const ta = +new Date(a.createdAt);
            const tb = +new Date(b.createdAt);
            if (ta === tb) return String(a.id).localeCompare(String(b.id));
            return ta - tb;
          });
        const summary = {
          total: merged.length,
          inbox: inbox.length,
          outbox: outbox.length,
          failed: outbox.filter((x: any) => String(x.status || "") === "failed")
            .length,
          pending: outbox.filter((x: any) =>
            ["pending", "processing"].includes(String(x.status || "")),
          ).length,
          lastInteractionAt: merged.length
            ? merged[merged.length - 1]?.createdAt
            : null,
        };

        res.json({
          success: true,
          meta: partnerId
            ? {
                partnerId,
                chatId,
                partnerName: p?.partnerName || "",
                phoneNumber: p?.phoneNumber || "",
                telegramOptedOut: false,
                telegramInvalid: false,
                telegramInvalidReason: null,
                summary,
              }
            : {
                customerId,
                chatId,
                telegramOptedOut: Number(c.telegramOptedOut || 0) === 1,
                telegramInvalid: Number(c.telegramInvalid || 0) === 1,
                telegramInvalidReason: c.telegramInvalidReason || null,
                summary,
              },
          data: merged,
        });
      } catch (e) {
        next(e);
      }
    },
  );
  /**
   * Telegram ↔ Customer quick actions (for Inbox support UX)
   * - link: save an outbound delivery destination only; never authenticate
   * - unlink: centrally revoke identity, delivery, active tokens and sessions
   * - optout: toggle opt-out flag
   */
  app.post(
    "/api/telegram/customers/link",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        await ensureCustomerTelegramColumns();
        const customerId = Number(req.body?.customerId || 0);
        const chatId = String(req.body?.chatId || "").trim();
        if (!customerId)
          return res
            .status(400)
            .json({ success: false, message: "customerId نامعتبر است." });
        if (!chatId)
          return res
            .status(400)
            .json({ success: false, message: "chatId خالی است." });
        // Ensure customer exists
        const c = await getAsync(`SELECT id FROM customers WHERE id=? LIMIT 1`, [
          customerId,
        ]);
        if (!c)
          return res
            .status(404)
            .json({ success: false, message: "مشتری پیدا نشد." });
        await updateCustomerTelegramDelivery(customerId, chatId);
        res.json({
          success: true,
          data: { purpose: "delivery_only" },
          message: "مقصد ارسال تلگرام ذخیره شد؛ این عملیات مجوز دسترسی ایجاد نمی‌کند.",
        });
      } catch (e) {
        next(e);
      }
    },
  );
  app.post(
    "/api/telegram/customers/unlink",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        await ensureCustomerTelegramColumns();
        const customerId = Number(req.body?.customerId || 0);
        if (!customerId)
          return res
            .status(400)
            .json({ success: false, message: "customerId نامعتبر است." });
        const unlinked = await unlinkCustomerTelegramIdentity(customerId);
        if (!unlinked)
          return res
            .status(404)
            .json({ success: false, message: "مشتری پیدا نشد." });
        res.json({ success: true, data: { sessionsRevoked: true } });
      } catch (e) {
        next(e);
      }
    },
  );
  app.post(
    "/api/telegram/customers/optout",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        await ensureCustomerTelegramColumns();
        const customerId = Number(req.body?.customerId || 0);
        const optedOut = Number(req.body?.optedOut ? 1 : 0);
        if (!customerId)
          return res
            .status(400)
            .json({ success: false, message: "customerId نامعتبر است." });
        await runAsync(`UPDATE customers SET telegram_opted_out=? WHERE id=?`, [
          optedOut,
          customerId,
        ]);
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    },
  );
};
