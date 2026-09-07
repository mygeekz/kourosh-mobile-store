import moment from "jalali-moment";
import {
  sendMeliPayamakPatternSms,
  sendKavenegarPatternSms,
  sendSmsIrPatternSms,
  sendIppanelPatternSms,
} from "../smsService";
import {
  sendTelegramMessage,
  sendTelegramPhoto,
  sendTelegramDocument,
  setTelegramProxy,
} from "../telegramService";

export type OutboxStatus = "pending" | "processing" | "done" | "failed";
export type OutboxChannel = "sms" | "telegram";

export type OutboxRow = {
  id: number;
  channel: OutboxChannel;
  provider?: string | null;
  eventType?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  recipient: string;
  payloadJson: string;
  eventKey?: string | null;
  status: OutboxStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
};

type RunAsync = (sql: string, params?: any[]) => Promise<any>;
type GetAsync = (sql: string, params?: any[]) => Promise<any>;

type NotificationOutboxRuntimeDeps = {
  ensureNotificationOutboxTables: () => Promise<any>;
  ensureReminderRulesTables: () => Promise<any>;
  getAllSettingsAsObject: () => Promise<Record<string, any>>;
  getAsync: GetAsync;
  runAsync: RunAsync;
  hasCustomerDailyCap: (channel: string, customerId: number) => Promise<boolean>;
  hasPendingCustomerCapInOutbox: (channel: string, customerId: number) => Promise<boolean>;
  ensureCustomerIsNotInvalid: (customerId: number) => Promise<boolean>;
  markCustomerTelegramInvalid: (customerId: number, reason: string) => Promise<any>;
  computeNextAllowedTelegramSendISOFromHours: (start?: any, end?: any) => string | null;
  computeNextAllowedTelegramSendISO: (silentHours?: any) => string | null;
  classifyTelegramError: (message?: any) => { code: string; label?: string };
  computeNextAttemptISO: (attempts: number) => string;
  lookupCustomerTelegramChatId: (customerId: number) => Promise<string>;
  lookupPartnerTelegramChatId: (partnerId: number) => Promise<string>;
};

export type EnqueueOutboxOptions = {
  channel: OutboxChannel;
  provider?: string | null;
  eventType?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  recipient: string;
  payload: any;
  dedupeToday?: boolean;
  maxAttempts?: number;
  dedupeEventWindowHours?: number;
  skipCustomerRateLimit?: boolean;
  skipInvalidChatCheck?: boolean;
};

const getDayKeyUtc = () => moment().utc().format("YYYY-MM-DD");

export function createNotificationOutboxRuntime({
  ensureNotificationOutboxTables,
  ensureReminderRulesTables,
  getAllSettingsAsObject,
  getAsync,
  runAsync,
  hasCustomerDailyCap,
  hasPendingCustomerCapInOutbox,
  ensureCustomerIsNotInvalid,
  markCustomerTelegramInvalid,
  computeNextAllowedTelegramSendISOFromHours,
  computeNextAllowedTelegramSendISO,
  classifyTelegramError,
  computeNextAttemptISO,
  lookupCustomerTelegramChatId,
  lookupPartnerTelegramChatId,
}: NotificationOutboxRuntimeDeps) {
  const didSendToday = async (row: {
    channel: OutboxChannel;
    eventType?: string | null;
    entityType?: string | null;
    entityId?: number | null;
    recipient?: string | null;
  }) => {
    await ensureNotificationOutboxTables();
    const dayKey = moment().format("YYYY-MM-DD");
    const exists = await getAsync(
      `SELECT id FROM notification_sent_log WHERE dayKey=? AND channel=? AND IFNULL(eventType,'')=? AND IFNULL(entityType,'')=? AND IFNULL(entityId,0)=? AND IFNULL(recipient,'')=? LIMIT 1`,
      [
        dayKey,
        row.channel,
        row.eventType ?? "",
        row.entityType ?? "",
        Number(row.entityId ?? 0),
        row.recipient ?? "",
      ],
    );
    return !!exists;
  };

  const markSentToday = async (row: {
    channel: OutboxChannel;
    eventType?: string | null;
    entityType?: string | null;
    entityId?: number | null;
    recipient?: string | null;
  }) => {
    await ensureNotificationOutboxTables();
    const dayKey = moment().format("YYYY-MM-DD");
    try {
      await runAsync(
        `INSERT OR IGNORE INTO notification_sent_log (dayKey, channel, eventType, entityType, entityId, recipient) VALUES (?,?,?,?,?,?)`,
        [
          dayKey,
          row.channel,
          row.eventType ?? null,
          row.entityType ?? null,
          row.entityId ?? null,
          row.recipient ?? null,
        ],
      );
    } catch (e: any) {
      try {
        console.error("Telegram sendMessage failed:", e?.message || e);
      } catch {}
    }
  };

  const enqueueOutbox = async (opts: EnqueueOutboxOptions) => {
    await ensureNotificationOutboxTables();
    const payloadObj: any = opts.payload ?? {};
    const capCustomerId =
      Number(payloadObj?.capCustomerId ?? payloadObj?.meta?.capCustomerId ?? 0) ||
      null;
    if (
      opts.channel === "telegram" &&
      capCustomerId &&
      !opts.skipInvalidChatCheck
    ) {
      const ok = await ensureCustomerIsNotInvalid(capCustomerId);
      if (!ok) return { queued: false, reason: "invalid_chat" as const };
    }
    if (opts.dedupeToday) {
      const already = await didSendToday({
        channel: opts.channel,
        eventType: opts.eventType,
        entityType: opts.entityType,
        entityId: opts.entityId,
        recipient: opts.recipient,
      });
      if (already) return { queued: false, reason: "deduped" as const };
    }
    const eventKey = `${opts.channel}|${String(opts.eventType ?? "")}|${String(opts.entityType ?? "")}|${String(opts.entityId ?? "")}|${String(opts.recipient ?? "")}`;
    const windowH = Number(opts.dedupeEventWindowHours ?? 0);
    if (Number.isFinite(windowH) && windowH > 0) {
      try {
        const since = moment().utc().subtract(windowH, "hours").toISOString();
        const row = await getAsync(
          `SELECT lastQueuedAt FROM notification_event_dedupe WHERE eventKey=? LIMIT 1`,
          [eventKey],
        ).catch(() => null);
        const lastQ = String(row?.lastQueuedAt || "").trim();
        if (lastQ && lastQ >= since) {
          return { queued: false, reason: "deduped_event" as const };
        }
        await runAsync(
          `INSERT INTO notification_event_dedupe (eventKey, lastQueuedAt, lastSentAt)
           VALUES (?,?,NULL)
           ON CONFLICT(eventKey) DO UPDATE SET lastQueuedAt=excluded.lastQueuedAt`,
          [eventKey, moment().utc().toISOString()],
        ).catch(() => {});
      } catch {
        // ignore
      }
    }
    if (
      opts.channel === "telegram" &&
      capCustomerId &&
      !opts.skipCustomerRateLimit
    ) {
      try {
        const settings = await getAllSettingsAsObject();
        const maxPerDay = Number(
          (settings as any).telegram_max_per_day_per_customer ?? 1,
        );
        if (Number.isFinite(maxPerDay) && maxPerDay > 0) {
          const sent = await hasCustomerDailyCap("telegram", capCustomerId);
          const pending = await hasPendingCustomerCapInOutbox(
            "telegram",
            capCustomerId,
          );
          if (sent || pending)
            return { queued: false, reason: "rate_limited" as const };
        }
      } catch {
        // ignore
      }
    }
    const payloadJson = JSON.stringify(payloadObj);
    const r = await runAsync(
      `INSERT INTO notification_outbox (channel, provider, eventType, entityType, entityId, recipient, payloadJson, eventKey, capCustomerId, status, attempts, maxAttempts, nextAttemptAt)
       VALUES (?,?,?,?,?,?,?,?,?,'pending',0,?,?)`,
      [
        opts.channel,
        opts.provider ?? null,
        opts.eventType ?? null,
        opts.entityType ?? null,
        opts.entityId ?? null,
        opts.recipient,
        payloadJson,
        eventKey,
        capCustomerId,
        Number(opts.maxAttempts ?? 6),
        moment().toISOString(),
      ],
    );
    return { queued: true, id: r?.lastID as number };
  };

  const trySendTelegramNow = async (
    text: string,
    chatIdOverride?: string | null,
    opts?: { replyMarkup?: any; parseMode?: "HTML" | "MarkdownV2" | "Markdown" },
  ) => {
    const settings = await getAllSettingsAsObject();
    setTelegramProxy((settings as any).telegram_proxy);
    const botToken = String((settings as any).telegram_bot_token || "").trim();
    const chatId = String(
      (chatIdOverride && String(chatIdOverride).trim()) ||
        (settings as any).telegram_chat_id ||
        "",
    ).trim();
    if (!botToken || !chatId)
      return {
        success: false,
        message: "توکن ربات یا Chat ID تلگرام تنظیم نشده است.",
      };
    return await sendTelegramMessage(botToken, chatId, text, {
      parseMode: opts?.parseMode || "HTML",
      replyMarkup: opts?.replyMarkup,
      disableWebPreview: true,
    });
  };

  const trySendTelegramMediaNow = async (
    type: "photo" | "document",
    fileRelPath: string,
    caption: string,
    chatIdOverride?: string | null,
    opts?: {
      replyMarkup?: any;
      parseMode?: "HTML" | "MarkdownV2" | "Markdown";
      replyToMessageId?: number;
      mimeType?: string;
    },
  ) => {
    const settings = await getAllSettingsAsObject();
    setTelegramProxy((settings as any).telegram_proxy);
    const botToken = String((settings as any).telegram_bot_token || "").trim();
    const chatId = String(
      (chatIdOverride && String(chatIdOverride).trim()) ||
        (settings as any).telegram_chat_id ||
        "",
    ).trim();
    if (!botToken || !chatId)
      return {
        success: false,
        message: "توکن ربات یا Chat ID تلگرام تنظیم نشده است.",
      };
    if (type === "photo") {
      return await sendTelegramPhoto(botToken, chatId, fileRelPath, caption, {
        parseMode: opts?.parseMode || "HTML",
        replyMarkup: opts?.replyMarkup,
        replyToMessageId: opts?.replyToMessageId,
        mimeType: opts?.mimeType,
      });
    }
    return await sendTelegramDocument(botToken, chatId, fileRelPath, caption, {
      parseMode: opts?.parseMode || "HTML",
      replyMarkup: opts?.replyMarkup,
      replyToMessageId: opts?.replyToMessageId,
      mimeType: opts?.mimeType,
    });
  };

  const trySendSmsNow = async (payload: any) => {
    const settings = await getAllSettingsAsObject();
    const provider: string = String(
      payload?.provider || settings.sms_provider || "meli_payamak",
    ).toLowerCase();
    const recipientNumber = String(payload?.recipient || "").trim();
    const tokens: string[] = Array.isArray(payload?.tokens)
      ? payload.tokens.map((x: any) => String(x ?? ""))
      : [];
    if (!recipientNumber)
      return { success: false, message: "شماره گیرنده نامعتبر است." };
    if (provider === "meli_payamak") {
      const username = settings.meli_payamak_username;
      const password = settings.meli_payamak_password;
      const bodyId = Number(payload?.meliBodyId || 0);
      if (!username || !password)
        return {
          success: false,
          message: "نام کاربری/رمز عبور ملی پیامک وارد نشده است.",
        };
      if (!bodyId || isNaN(bodyId))
        return { success: false, message: "BodyId الگو نامعتبر است." };
      return await sendMeliPayamakPatternSms(
        recipientNumber,
        bodyId,
        tokens,
        username,
        password,
      );
    }
    if (provider === "kavenegar") {
      const apiKey = String(settings.kavenegar_api_key || "").trim();
      const template = String(payload?.kavenegarTemplate || "").trim();
      if (!apiKey)
        return { success: false, message: "API Key کاوه‌نگار تنظیم نشده است." };
      if (!template)
        return { success: false, message: "نام قالب کاوه‌نگار تنظیم نشده است." };
      return await sendKavenegarPatternSms(
        recipientNumber,
        template,
        tokens,
        apiKey,
      );
    }
    if (provider === "sms_ir") {
      const apiKey = String(settings.sms_ir_api_key || "").trim();
      const templateId = Number(payload?.smsIrTemplateId || 0);
      if (!apiKey)
        return { success: false, message: "API Key SMS.ir تنظیم نشده است." };
      if (!templateId || isNaN(templateId))
        return { success: false, message: "شناسه قالب SMS.ir نامعتبر است." };
      return await sendSmsIrPatternSms(
        recipientNumber,
        templateId,
        tokens,
        apiKey,
      );
    }
    if (provider === "ippanel") {
      const tokenAuth = String(settings.ippanel_token || settings.ippanel_api_key || "").trim();
      const patternCode = String(payload?.ippanelPatternCode || "").trim();
      const fromNumber = String(settings.ippanel_from_number || settings.ippanel_sender || settings.ippanel_from || "").trim();
      if (!tokenAuth)
        return { success: false, message: "توکن IPPanel تنظیم نشده است." };
      if (!fromNumber)
        return { success: false, message: "شماره فرستنده IPPanel تنظیم نشده است." };
      if (!patternCode)
        return { success: false, message: "کد الگوی IPPanel تنظیم نشده است." };
      return await sendIppanelPatternSms(
        recipientNumber,
        patternCode,
        tokens,
        tokenAuth,
        fromNumber,
      );
    }
    return { success: false, message: "سرویس پیامک ناشناخته است." };
  };

  const tryDeliverQueuedTelegramNow = async (
    queued: any,
    payload: any,
    chatId: string,
  ) => {
    const queuedId = Number(queued?.id || 0);
    if (!queued?.queued || !queuedId) return queued;

    try {
      const msgType = String(payload?.type || "message");
      const text = String(
        payload?.text ||
          payload?.message ||
          payload?.body ||
          payload?.caption ||
          "",
      );
      const parseMode = payload?.parse_mode || payload?.parseMode || "HTML";
      const replyMarkup = payload?.reply_markup || payload?.replyMarkup || null;
      const replyToMessageId = Number(payload?.replyToMessageId || 0) || 0;
      let result: any;

      if (msgType === "photo" || msgType === "document") {
        const fileRelPath =
          payload?.fileRelPath || payload?.filePath || payload?.relPath || null;
        if (!fileRelPath) {
          result = {
            success: false,
            message: "fileRelPath not provided for telegram media",
          };
        } else {
          result = await trySendTelegramMediaNow(
            msgType as any,
            String(fileRelPath),
            text,
            chatId,
            {
              parseMode,
              replyMarkup,
              replyToMessageId: replyToMessageId || undefined,
              mimeType: payload?.mimeType || undefined,
            },
          );
        }
      } else {
        result = await trySendTelegramNow(text, chatId, {
          parseMode,
          replyMarkup,
        });
      }

      if (result?.success) {
        const telegramMessageId =
          Number((result as any)?.data?.result?.message_id || 0) || null;
        await runAsync(
          `UPDATE notification_outbox
              SET status='done', lastError=NULL, telegramMessageId=COALESCE(?, telegramMessageId), updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')
            WHERE id=?`,
          [telegramMessageId, queuedId],
        );
        return { ...queued, deliveredNow: true, result };
      }

      await runAsync(
        `UPDATE notification_outbox
            SET status='pending', attempts=0, nextAttemptAt=?, lastError=?, updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')
          WHERE id=?`,
        [
          moment().add(10, "seconds").toISOString(),
          String(
            result?.message ||
              "ارسال مستقیم انجام نشد؛ پیام در صف تلاش مجدد قرار گرفت.",
          ),
          queuedId,
        ],
      );
      return { ...queued, deliveredNow: false, result };
    } catch (e: any) {
      await runAsync(
        `UPDATE notification_outbox
            SET status='pending', attempts=0, nextAttemptAt=?, lastError=?, updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')
          WHERE id=?`,
        [
          moment().add(10, "seconds").toISOString(),
          String(
            e?.message ||
              "ارسال مستقیم انجام نشد؛ پیام در صف تلاش مجدد قرار گرفت.",
          ),
          queuedId,
        ],
      ).catch(() => {});
      return { ...queued, deliveredNow: false, error: String(e?.message || e) };
    }
  };

  const processOneOutboxRow = async () => {
    await ensureNotificationOutboxTables();
    const row = (await getAsync(
      `SELECT * FROM notification_outbox
        WHERE status IN ('pending','failed')
          AND (nextAttemptAt IS NULL OR nextAttemptAt <= ?)
        ORDER BY id ASC
        LIMIT 1`,
      [moment().toISOString()],
    )) as any as OutboxRow | undefined;
    if (!row) return false;
    await runAsync(
      `UPDATE notification_outbox SET status='processing', updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
      [row.id],
    );
    try {
      const payload = JSON.parse(String(row.payloadJson || "{}"));
      let result: any;
      if (row.channel === "telegram") {
        const msgType = String(payload?.type || "message");
        const text = String(
          payload?.text ||
            payload?.message ||
            payload?.body ||
            payload?.caption ||
            "",
        );
        const chatIdOverride = payload?.chatId || payload?.recipient || null;
        const replyToMessageId = Number(payload?.replyToMessageId || 0) || 0;
        const mimeType = payload?.mimeType || undefined;
        const fileRelPath =
          payload?.fileRelPath || payload?.filePath || payload?.relPath || null;
        try {
          const capCustomerId = Number(
            payload?.capCustomerId ?? payload?.meta?.capCustomerId ?? 0,
          );
          if (capCustomerId) {
            const ok = await ensureCustomerIsNotInvalid(capCustomerId);
            if (!ok) {
              await runAsync(
                `UPDATE notification_outbox SET status='failed', attempts=maxAttempts, nextAttemptAt=NULL, lastError=?, updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
                ["invalid chat (blocked/unknown)", row.id],
              );
              return true;
            }
          }
        } catch {}
        try {
          const settings = await getAllSettingsAsObject();
          const nextAllowed =
            computeNextAllowedTelegramSendISOFromHours(
              (settings as any).telegram_quiet_start_hour,
              (settings as any).telegram_quiet_end_hour,
            ) ||
            computeNextAllowedTelegramSendISO(
              (settings as any).telegram_silent_hours,
            );
          if (nextAllowed) {
            await runAsync(
              `UPDATE notification_outbox SET status='pending', nextAttemptAt=?, lastError=NULL, updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
              [nextAllowed, row.id],
            );
            return true;
          }
        } catch {
          // ignore quiet-hours errors
        }
        const replyMarkup = payload?.reply_markup || payload?.replyMarkup || null;
        const parseMode = payload?.parse_mode || payload?.parseMode || "HTML";
        let effectiveChatId = chatIdOverride ? String(chatIdOverride).trim() : "";
        if (!effectiveChatId && row.recipient === "telegram_chat") {
          const capCustomerId = Number(
            payload?.capCustomerId ?? payload?.meta?.capCustomerId ?? 0,
          );
          if (capCustomerId)
            effectiveChatId = await lookupCustomerTelegramChatId(capCustomerId);
        }
        if (!effectiveChatId && row.recipient === "telegram_partner_chat") {
          const partnerId = Number(
            payload?.partnerId ?? payload?.meta?.partnerId ?? row.entityId ?? 0,
          );
          if (partnerId)
            effectiveChatId = await lookupPartnerTelegramChatId(partnerId);
        }
        if (msgType === "photo" || msgType === "document") {
          if (!fileRelPath) {
            result = {
              success: false,
              message: "fileRelPath not provided for telegram media",
            } as any;
          } else {
            result = await trySendTelegramMediaNow(
              msgType as any,
              String(fileRelPath),
              text,
              effectiveChatId || null,
              {
                replyMarkup,
                parseMode,
                replyToMessageId: replyToMessageId || undefined,
                mimeType,
              },
            );
          }
        } else {
          result = await trySendTelegramNow(text, effectiveChatId || null, {
            replyMarkup,
            parseMode,
          });
        }
      } else {
        result = await trySendSmsNow(payload);
      }
      if (result?.success) {
        const telegramMessageId =
          Number((result as any)?.data?.result?.message_id || 0) || null;
        await runAsync(
          `UPDATE notification_outbox SET status='done', lastError=NULL, telegramMessageId=COALESCE(?, telegramMessageId), updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
          [telegramMessageId, row.id],
        );
        await markSentToday({
          channel: row.channel,
          eventType: row.eventType,
          entityType: row.entityType,
          entityId: row.entityId,
          recipient: row.recipient,
        });
        try {
          if (row.eventKey) {
            await runAsync(
              `INSERT INTO notification_event_dedupe (eventKey, lastQueuedAt, lastSentAt)
               VALUES (?,?,?)
               ON CONFLICT(eventKey) DO UPDATE SET lastSentAt=excluded.lastSentAt`,
              [
                String(row.eventKey),
                moment().utc().toISOString(),
                moment().utc().toISOString(),
              ],
            ).catch(() => {});
          }
        } catch {
          // ignore
        }
        try {
          const payload = JSON.parse(String(row.payloadJson || "{}"));
          const capCustomerId = Number(
            payload?.capCustomerId ?? payload?.meta?.capCustomerId ?? 0,
          );
          if (capCustomerId && Number.isFinite(capCustomerId)) {
            await ensureReminderRulesTables();
            const dayKey = getDayKeyUtc();
            await runAsync(
              `INSERT OR IGNORE INTO reminder_daily_cap (dayKey, channel, customerId) VALUES (?,?,?)`,
              [dayKey, row.channel, capCustomerId],
            ).catch(() => {});
          }
        } catch {
          // ignore
        }
        return true;
      }
      const attempts = Number(row.attempts || 0) + 1;
      const maxAttempts = Number(row.maxAttempts || 6);
      const nextAttemptAt =
        attempts >= maxAttempts ? null : computeNextAttemptISO(attempts);
      const status: OutboxStatus = attempts >= maxAttempts ? "failed" : "pending";
      if (row.channel === "telegram") {
        try {
          const c = classifyTelegramError(result?.message);
          const capCustomerId = Number(
            payload?.capCustomerId ?? payload?.meta?.capCustomerId ?? 0,
          );
          if (
            capCustomerId &&
            (c.code === "blocked" || c.code === "chat_not_found")
          ) {
            await markCustomerTelegramInvalid(capCustomerId, c.code);
          }
        } catch {
          // ignore
        }
      }
      await runAsync(
        `UPDATE notification_outbox SET status=?, attempts=?, nextAttemptAt=?, lastError=?, updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
        [
          status,
          attempts,
          nextAttemptAt,
          (() => {
            const c = classifyTelegramError(result?.message);
            return `${c.code}: ${String(result?.message || "خطا در ارسال")}`;
          })(),
          row.id,
        ],
      );
      return true;
    } catch (e: any) {
      const attempts = Number(row.attempts || 0) + 1;
      const maxAttempts = Number(row.maxAttempts || 6);
      const nextAttemptAt =
        attempts >= maxAttempts ? null : computeNextAttemptISO(attempts);
      const status: OutboxStatus = attempts >= maxAttempts ? "failed" : "pending";
      await runAsync(
        `UPDATE notification_outbox SET status=?, attempts=?, nextAttemptAt=?, lastError=?, updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
        [
          status,
          attempts,
          nextAttemptAt,
          String(e?.message || "خطا در عملیاتی ناشناخته"),
          row.id,
        ],
      );
      return true;
    }
  };

  let outboxWorkerStarted = false;
  const startOutboxWorker = () => {
    if (outboxWorkerStarted) return;
    outboxWorkerStarted = true;
    setInterval(async () => {
      try {
        for (let i = 0; i < 10; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          const did = await processOneOutboxRow();
          if (!did) break;
        }
      } catch (e) {
        console.error("Outbox worker error:", e);
      }
    }, 30_000);
  };

  return {
    didSendToday,
    markSentToday,
    enqueueOutbox,
    trySendTelegramNow,
    trySendTelegramMediaNow,
    trySendSmsNow,
    tryDeliverQueuedTelegramNow,
    processOneOutboxRow,
    startOutboxWorker,
  };
}
