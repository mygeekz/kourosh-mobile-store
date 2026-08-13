import type { Express } from "express";
import moment from "jalali-moment";
import {
  allAsync,
  getAllSettingsAsObject,
  getAsync,
  runAsync,
} from "../database";
import { callTelegramBotApi, configureTelegramTransport, getTelegramBotInfo, setTelegramProxy } from "../telegramService";

type AuthorizeRole = (roles: string[]) => any;


const redactProxyForStatus = (value: string): string | null => {
  try {
    const url = new URL(String(value || "").trim());
    url.username = ""; url.password = "";
    return `${url.protocol}//${url.host}`;
  } catch { return null; }
};

type RegisterTelegramControlDeps = {
  authorizeRole: AuthorizeRole;
  ensureTelegramInboxTable: () => Promise<void>;
  ensureNotificationOutboxTables: () => Promise<void>;
  ensureCustomerTelegramColumns: () => Promise<void>;
  getExistingCustomerColumns: () => Promise<Set<string>>;
  buildCustomerTelegramLinkedWhereSql: (cols: Set<string>) => string;
  getTelegramProxyAgentFromSettings: (settings: any) => any;
  insertSmsLog: (payload: any) => Promise<any>;
};

export const registerTelegramControlRoutes = (
  app: Express,
  {
    authorizeRole,
    ensureTelegramInboxTable,
    ensureNotificationOutboxTables,
    ensureCustomerTelegramColumns,
    getExistingCustomerColumns,
    buildCustomerTelegramLinkedWhereSql,
    insertSmsLog,
  }: RegisterTelegramControlDeps,
): void => {
  // بررسی اتصال ربات تلگرام (getMe)
  app.get(
    "/api/telegram/health",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        res.setHeader("Cache-Control", "no-store");
        const settings = await getAllSettingsAsObject();
        const transportMode = configureTelegramTransport(settings as any);
        setTelegramProxy((settings as any).telegram_proxy);
        const botToken = String(settings.telegram_bot_token || "").trim();
        if (!botToken)
          return res.status(400).json({
            success: false,
            message: "توکن ربات تلگرام تنظیم نشده است.",
          });
        const result = await getTelegramBotInfo(botToken);
        // audit log (in sms_logs for unified viewer)
        try {
          await insertSmsLog({
            reqUser: (req as any).user,
            provider: "telegram",
            eventType: "HEALTH_CHECK",
            entityType: "telegram",
            entityId: null as any,
            recipient: "telegram:getMe",
            patternId: "TELEGRAM_GETME",
            tokens: [],
            success: !!result?.success,
            response: result,
            error: result?.success ? undefined : result?.message,
          });
        } catch {}
        if (result?.success) {
          const bot = (result as any)?.data?.result;
          return res.json({
            success: true,
            message: "اتصال تلگرام برقرار است.",
            data: {
              bot,
              transportMode,
            },
          });
        }
        return res.json({
          success: false,
          message: result?.message || "خطا در بررسی اتصال تلگرام",
          data: result,
        });
      } catch (e) {
        next(e);
      }
    },
  );

  // دریافت آخرین Chat IDهایی که ربات با آن‌ها تعامل داشته است
  app.get(
    "/api/telegram/recent-chats",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        res.setHeader("Cache-Control", "no-store");
        await ensureTelegramInboxTable();
        const settings = await getAllSettingsAsObject();
        const botToken = String(
          (settings as any).telegram_bot_token || "",
        ).trim();
        if (!botToken) {
          return res.status(400).json({
            success: false,
            message: "ابتدا توکن ربات تلگرام را ذخیره کنید.",
          });
        }

        const normalizeChat = (raw: any, source: "updates" | "inbox") => {
          const msg =
            raw?.message ||
            raw?.edited_message ||
            raw?.callback_query?.message ||
            raw?.my_chat_member ||
            raw?.chat_member ||
            raw ||
            {};
          const chat = msg?.chat || raw?.chat || {};
          const from = raw?.callback_query?.from || msg?.from || raw?.from || {};
          const chatId = String(
            chat?.id || raw?.chatId || raw?.chat_id || "",
          ).trim();
          if (!chatId) return null;
          const title = String(
            chat?.title ||
              chat?.first_name ||
              from?.first_name ||
              raw?.title ||
              raw?.customerName ||
              "",
          ).trim();
          const username = String(
            chat?.username || from?.username || raw?.username || "",
          ).trim();
          const firstName = String(from?.first_name || "").trim();
          const lastName = String(from?.last_name || "").trim();
          const displayName =
            title ||
            [firstName, lastName].filter(Boolean).join(" ") ||
            username ||
            `Chat ${chatId}`;
          return {
            chatId,
            title: displayName,
            username,
            type: String(chat?.type || raw?.type || "private"),
            source,
            text: String(msg?.text || raw?.text || raw?.kind || "").slice(0, 120),
            at:
              raw?.createdAt ||
              (msg?.date
                ? new Date(Number(msg.date) * 1000).toISOString()
                : null),
          };
        };

        const collected: any[] = [];

        // ۱) اول از پیام‌های ذخیره‌شده در Inbox داخلی استفاده می‌کنیم؛ این مسیر با polling/webhook سازگارتر است.
        try {
          const inboxRows = await allAsync(
            `SELECT chatId, fromId, kind, text, payloadJson, createdAt
             FROM telegram_inbox
            WHERE TRIM(COALESCE(chatId,'')) <> ''
            ORDER BY id DESC
            LIMIT 30`,
            [],
          );
          for (const row of (inboxRows || []) as any[]) {
            let payload: any = null;
            try {
              payload = row?.payloadJson ? JSON.parse(row.payloadJson) : null;
            } catch {
              payload = null;
            }
            const normalized = normalizeChat({ ...row, ...(payload || {}) }, "inbox");
            if (normalized) collected.push(normalized);
          }
        } catch {
          // inbox هنوز ساخته نشده یا خالی است؛ از getUpdates استفاده می‌کنیم.
        }

        // ۲) سپس از Telegram getUpdates می‌خوانیم؛ اگر webhook فعال باشد ممکن است تلگرام 409 بدهد.
        let updatesError = "";
        try {
          const result = await callTelegramBotApi(botToken, "getUpdates", { timeout: 0, limit: 25 });
          if (!result?.success) throw new Error(result?.message || "خواندن getUpdates انجام نشد.");
          const updates: any[] = Array.isArray((result as any)?.data?.result) ? (result as any).data.result : [];
          for (const upd of updates) {
            const normalized = normalizeChat(upd, "updates");
            if (normalized) collected.push(normalized);
          }
        } catch (e: any) {
          updatesError =
            e?.message || updatesError || "خواندن getUpdates انجام نشد.";
        }

        const seen = new Set<string>();
        const chats = collected
          .filter((item) => {
            if (!item?.chatId || seen.has(item.chatId)) return false;
            seen.add(item.chatId);
            return true;
          })
          .slice(0, 12);

        return res.json({
          success: true,
          data: {
            chats,
            updatesError,
            hint: chats.length
              ? "Chat ID موردنظر را انتخاب کنید و سپس تنظیمات تلگرام را ذخیره کنید."
              : "در تلگرام ربات را Start کنید یا یک پیام برای ربات بفرستید، سپس دوباره دریافت Chat ID را بزنید.",
          },
        });
      } catch (e) {
        next(e);
      }
    },
  );

  // -----------------------------------------------------
  // Telegram Control Center (Settings dashboard)
  //  - Health: Bot API / Proxy / last send+receive / queue lag
  //  - Coverage: linked customers / opt-out / invalid chat estimates
  //  - Queue: pending/failed + bulk actions
  // -----------------------------------------------------
  app.get(
    "/api/telegram/control-center",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        res.setHeader("Cache-Control", "no-store");
        await ensureNotificationOutboxTables();
        await ensureCustomerTelegramColumns();
        const settings = await getAllSettingsAsObject();
        const transportMode = configureTelegramTransport(settings as any);
        const botToken = String(
          (settings as any).telegram_bot_token || "",
        ).trim();
        const proxy = String((settings as any).telegram_proxy || "").trim();
        // Health is evaluated through the selected transport. Proxy diagnostics apply only in Proxy mode.
        let botApiOk = false;
        let botApiMessage: string | undefined;
        let botInfo: any = null;
        try {
          setTelegramProxy(proxy);
          if (botToken) {
            const r = await getTelegramBotInfo(botToken);
            botApiOk = !!(r as any)?.success;
            botApiMessage = String((r as any)?.message || "");
            botInfo = (r as any)?.data?.result || null;
          } else {
            botApiOk = false;
            botApiMessage = "توکن ربات تلگرام تنظیم نشده است.";
          }
        } catch (e: any) {
          botApiOk = false;
          botApiMessage = e?.message || "خطا در بررسی Bot API";
        }
        const proxyConfigured = transportMode === "proxy" && !!proxy;
        // Proxy OK is only meaningful when Proxy is the selected transport; Direct/Relay do not consume app proxy config.
        const proxyOk: boolean | null = transportMode === "proxy" ? (proxyConfigured ? botApiOk : false) : null;
        // Last send (from sms_logs)
        const lastSendRow: any = await getAsync(
          `SELECT createdAt, eventType, success FROM sms_logs 
         WHERE provider='telegram' AND IFNULL(eventType,'') <> 'HEALTH_CHECK'
         ORDER BY id DESC LIMIT 1`,
          [],
        );
        const lastSentAt = lastSendRow?.createdAt || null;
        // Last receive: webhook timestamp or latest internal inbox event (polling/webhook).
        const inboxReceiveRow: any = await getAsync(
          `SELECT MAX(createdAt) AS lastReceivedAt FROM telegram_inbox`,
          [],
        ).catch(() => null);
        const receiveCandidates = [
          String((settings as any).telegram_last_webhook_at || "").trim(),
          String(inboxReceiveRow?.lastReceivedAt || "").trim(),
        ].filter(Boolean);
        const lastReceivedAt = receiveCandidates
          .map((value) => ({ value, ts: moment.utc(value).valueOf() }))
          .filter((item) => Number.isFinite(item.ts))
          .sort((a, b) => b.ts - a.ts)[0]?.value || null;
        // Coverage (customers)
        const customerCols = await getExistingCustomerColumns();
        const linkedWhere = buildCustomerTelegramLinkedWhereSql(customerCols);
        const linkedRow: any = await getAsync(
          `SELECT COUNT(1) AS cnt FROM customers WHERE ${linkedWhere}`,
          [],
        );
        const optoutRow: any = await getAsync(
          `SELECT COUNT(1) AS cnt FROM customers WHERE IFNULL(telegram_opted_out,0) = 1`,
          [],
        );
        let linkedPartners = 0;
        try {
          const partnerCols: any[] = await allAsync(
            `PRAGMA table_info(partners)`,
          );
          const partnerNames = new Set(
            (partnerCols || []).map((c: any) => String(c?.name || "")),
          );
          const partnerChatCol = partnerNames.has("telegram_chat_id")
            ? "telegram_chat_id"
            : partnerNames.has("telegramChatId")
              ? "telegramChatId"
              : "";
          if (partnerChatCol) {
            const linkedPartnerRow: any = await getAsync(
              `SELECT COUNT(1) AS cnt FROM partners WHERE TRIM(COALESCE(${partnerChatCol}, '')) <> ''`,
              [],
            );
            linkedPartners = Number(linkedPartnerRow?.cnt || 0);
          }
        } catch {}
        const routeValues = [
          String((settings as any).telegram_chat_id || "").trim(),
          String((settings as any).telegram_chat_ids_reports || "").trim(),
          String((settings as any).telegram_chat_ids_installments || "").trim(),
          String((settings as any).telegram_chat_ids_sales || "").trim(),
          String((settings as any).telegram_chat_ids_notifications || "").trim(),
        ].filter(Boolean);
        const destinationChats = Array.from(
          new Set(
            routeValues
              .join("\n")
              .split(/[\r\n,؛;\s]+/)
              .map((x) => String(x || "").trim())
              .filter(Boolean),
          ),
        ).length;
        // Invalid chat estimate (last 30 days failed telegram logs mentioning 403 / blocked / chat not found)
        const since30 = moment().subtract(30, "days").toISOString();
        const invalidRow: any = await getAsync(
          `SELECT COUNT(DISTINCT recipient) AS cnt
           FROM sms_logs
          WHERE provider='telegram'
            AND IFNULL(success,0)=0
            AND createdAt >= ?
            AND (
              IFNULL(errorText,'') LIKE '%403%'
              OR IFNULL(errorText,'') LIKE '%blocked%'
              OR IFNULL(errorText,'') LIKE '%chat%'
              OR IFNULL(responseJson,'') LIKE '%403%'
              OR IFNULL(responseJson,'') LIKE '%blocked%'
              OR IFNULL(responseJson,'') LIKE '%chat%'
            )`,
          [since30],
        );
        // Queue stats
        const pendingRow: any = await getAsync(
          `SELECT COUNT(1) AS cnt FROM notification_outbox WHERE channel='telegram' AND status IN ('pending','processing')`,
          [],
        );
        const failedRow: any = await getAsync(
          `SELECT COUNT(1) AS cnt FROM notification_outbox WHERE channel='telegram' AND status='failed'`,
          [],
        );
        const oldestPending: any = await getAsync(
          `SELECT createdAt AS oldest FROM notification_outbox WHERE channel='telegram' AND status='pending' ORDER BY id ASC LIMIT 1`,
          [],
        );
        let queueLagSeconds: number | null = null;
        if (oldestPending?.oldest) {
          try {
            queueLagSeconds = Math.max(
              0,
              moment.utc().diff(moment.utc(String(oldestPending.oldest)), "seconds"),
            );
          } catch {
            queueLagSeconds = null;
          }
        }
        return res.json({
          success: true,
          data: {
            health: {
              transportMode,
              botApi: {
                ok: botApiOk,
                message: botApiMessage || undefined,
                bot: botInfo,
              },
              proxy: {
                configured: proxyConfigured,
                ok: proxyOk,
                value: proxyConfigured ? redactProxyForStatus(proxy) : null,
              },
              lastSentAt,
              lastReceivedAt,
              queueLagSeconds,
            },
            coverage: {
              linkedCustomers: Number(linkedRow?.cnt || 0),
              linkedPartners,
              optedOutCustomers: Number(optoutRow?.cnt || 0),
              invalidChatsEstimate: Number(invalidRow?.cnt || 0),
              destinationChats,
            },
            queue: {
              pending: Number(pendingRow?.cnt || 0),
              failed: Number(failedRow?.cnt || 0),
            },
          },
        });
      } catch (e) {
        next(e);
      }
    },
  );
  app.post(
    "/api/telegram/outbox/retry-all",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        await ensureNotificationOutboxTables();
        const nowIso = moment().toISOString();
        await runAsync(
          `UPDATE notification_outbox
            SET status='pending', nextAttemptAt=?, lastError=NULL,
                updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')
          WHERE channel='telegram' AND status='failed'`,
          [nowIso],
        );
        const row: any = await getAsync(
          `SELECT COUNT(1) AS cnt FROM notification_outbox WHERE channel='telegram' AND status='failed'`,
          [],
        );
        return res.json({
          success: true,
          message: "Retry all انجام شد.",
          data: { remainingFailed: Number(row?.cnt || 0) },
        });
      } catch (e) {
        next(e);
      }
    },
  );
  app.post(
    "/api/telegram/outbox/cleanup-failed",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        await ensureNotificationOutboxTables();
        const days = Math.max(
          1,
          Math.min(365, Number(req.body?.olderThanDays || 30)),
        );
        const cutoffIso = moment().subtract(days, "days").toISOString();
        await runAsync(
          `DELETE FROM notification_outbox
          WHERE channel='telegram' AND status='failed' AND createdAt < ?`,
          [cutoffIso],
        );
        return res.json({
          success: true,
          message: `Failedهای قدیمی‌تر از ${days} روز پاک شد.`,
        });
      } catch (e) {
        next(e);
      }
    },
  );
};
