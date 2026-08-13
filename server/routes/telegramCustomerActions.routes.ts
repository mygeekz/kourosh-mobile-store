import type { Express } from "express";
import moment from "jalali-moment";
import { getAllSettingsAsObject, getAsync, runAsync } from "../database";
import {
  finalizePrivateUpload,
  resolvePrivateUploadReference,
  SafeUploadError,
} from "../upload";

type AuthorizeRole = (roles: string[]) => any;

type RegisterTelegramCustomerActionsDeps = {
  authorizeRole: AuthorizeRole;
  ensureNotificationOutboxTables: () => Promise<void>;
  ensureCustomerTelegramColumns: () => Promise<void>;
  tryDeliverQueuedTelegramNow: (queued: any, payload: any, chatId: string) => Promise<any>;
  enqueueOutbox: (payload: any) => Promise<any>;
  addAuditLog: (
    userId: any,
    username: any,
    roleName: any,
    action: string,
    entityType: string,
    entityId: any,
    description: string,
  ) => any;
  sanitizeTelegramHtml: (html: string) => string;
  stripTags: (text: string) => string;
  telegramCard: (title: string, icon: string, lines: string[], footer?: string) => string;
  markdownishToHtml: (text: string) => string;
  upload: any;
};

const safeReplaceTemplate = (
  tpl: string,
  vars: Record<string, any>,
): string => {
  const raw = String(tpl || "");
  return raw.replace(/\{(\w+)\}/g, (_m, key) => {
    const v = vars[key];
    if (v === undefined || v === null) return "";
    return String(v);
  });
};

const escapeHtml = (s: any) => {
  const t = String(s ?? "");
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const esc = escapeHtml;

export const registerTelegramCustomerActionsRoutes = (
  app: Express,
  {
    authorizeRole,
    ensureNotificationOutboxTables,
    ensureCustomerTelegramColumns,
    tryDeliverQueuedTelegramNow,
    enqueueOutbox,
    addAuditLog,
    sanitizeTelegramHtml,
    stripTags,
    telegramCard,
    markdownishToHtml,
    upload,
  }: RegisterTelegramCustomerActionsDeps,
): void => {
// =====================================================
// Customer Telegram Actions (Customer Card)
// =====================================================
app.post(
  "/api/telegram/customer-actions/retry-outbox",
  authorizeRole(["Admin", "Manager"]),
  async (req, res, next) => {
    try {
      await ensureNotificationOutboxTables();
      const outboxIdRaw = String(req.body?.outboxId || "")
        .trim()
        .replace(/^out_/, "");
      const outboxId = Number(outboxIdRaw || 0);
      if (!outboxId)
        return res
          .status(400)
          .json({ success: false, message: "شناسه پیام نامعتبر است." });

      const row = (await getAsync(
        `SELECT id, channel, entityType, entityId, recipient, payloadJson, status, attempts, lastError
         FROM notification_outbox
        WHERE id=? AND channel='telegram'
        LIMIT 1`,
        [outboxId],
      )) as any;
      if (!row)
        return res
          .status(404)
          .json({ success: false, message: "پیام تلگرام یافت نشد." });

      const safeJson = (s: any) => {
        try {
          return s ? JSON.parse(String(s)) : null;
        } catch {
          return null;
        }
      };
      const payload = safeJson(row.payloadJson) || {};
      const chatId = String(row.recipient || payload.chatId || "").trim();
      if (!chatId)
        return res.status(400).json({
          success: false,
          message: "Chat ID برای ارسال مجدد موجود نیست.",
        });

      await runAsync(
        `UPDATE notification_outbox
          SET status='pending', attempts=0, nextAttemptAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'), lastError=NULL, updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')
        WHERE id=?`,
        [outboxId],
      );

      const delivered = await tryDeliverQueuedTelegramNow(
        { id: outboxId, queued: true },
        payload,
        chatId,
      );
      try {
        addAuditLog(
          req.user?.id,
          req.user?.username,
          req.user?.roleName,
          "retry",
          "telegram_outbox",
          outboxId,
          "ارسال مجدد پیام تلگرام",
        );
      } catch {}

      res.json({ success: true, data: delivered });
    } catch (e) {
      next(e);
    }
  },
);

app.post(
  "/api/telegram/customer-actions/send-manual",
  authorizeRole(["Admin", "Manager"]),
  async (req, res, next) => {
    try {
      await ensureNotificationOutboxTables();
      await ensureCustomerTelegramColumns();
      const customerId = Number(req.body?.customerId || 0);
      const textRaw = String(req.body?.text || "").trim();
      const parseModeRaw = String(req.body?.parseMode || "").trim();
      const parseMode =
        parseModeRaw === "HTML" ||
        parseModeRaw === "Markdown" ||
        parseModeRaw === "MarkdownV2"
          ? (parseModeRaw as any)
          : "HTML";
      const attachment = (req.body as any)?.attachment || null;
      const replyToMessageId =
        Number((req.body as any)?.replyToMessageId || 0) || 0;
      if (!customerId)
        return res
          .status(400)
          .json({ success: false, message: "customerId نامعتبر است." });
      if (!textRaw && !attachment)
        return res.status(400).json({
          success: false,
          message: "متن پیام یا فایل باید ارسال شود.",
        });
      const c = (await getAsync(
        `SELECT id, fullName, phoneNumber,
              COALESCE(telegram_opted_out,0) AS telegram_opted_out,
              COALESCE(telegram_chat_id, telegramChatId) AS tg_chat_id
       FROM customers WHERE id=? LIMIT 1`,
        [customerId],
      )) as any;
      if (!c)
        return res
          .status(404)
          .json({ success: false, message: "مشتری یافت نشد." });
      if (Number(c.telegram_opted_out || 0) === 1)
        return res.status(400).json({
          success: false,
          message: "این مشتری از تلگرام opt-out کرده است.",
        });
      const chatId = String(c?.tg_chat_id || "").trim();
      if (!chatId)
        return res.status(400).json({
          success: false,
          message: "این مشتری به تلگرام لینک نشده است.",
        });
      let text = textRaw;
      if (parseMode === "HTML") text = sanitizeTelegramHtml(text);
      if (parseMode === "Markdown" || parseMode === "MarkdownV2")
        text = stripTags(text);
      // Attachment support (photo/document) + reply-to
      const hasAtt = attachment && typeof attachment === "object";
      const attType = hasAtt ? String(attachment.type || "").toLowerCase() : "";
      const attRelPath = hasAtt
        ? String(attachment.relPath || attachment.path || "").trim()
        : "";
      const attMime = hasAtt ? String(attachment.mimeType || "").trim() : "";
      const attOriginal = hasAtt
        ? String(attachment.originalName || "").trim()
        : "";
      const payload: any = {
        chatId,
        parseMode,
        capCustomerId: customerId,
        replyToMessageId: replyToMessageId || undefined,
      };
      if (hasAtt) {
        if (!(attType === "photo" || attType === "document")) {
          return res
            .status(400)
            .json({ success: false, message: "نوع فایل نامعتبر است." });
        }
        if (!attRelPath) {
          return res
            .status(400)
            .json({ success: false, message: "مسیر فایل ارسال نشده است." });
        }
        const resolvedAttachmentPath = await resolvePrivateUploadReference(attRelPath);
        if (!resolvedAttachmentPath) {
          return res
            .status(400)
            .json({ success: false, message: "شناسه فایل پیوست معتبر نیست یا فایل منقضی شده است." });
        }
        payload.type = attType;
        payload.fileRelPath = resolvedAttachmentPath;
        payload.mimeType = attMime || undefined;
        payload.originalName = attOriginal || undefined;
        payload.caption = text || "";
      } else {
        payload.type = "message";
        payload.text = text;
      }
      const queued = await enqueueOutbox({
        channel: "telegram",
        provider: "telegram",
        eventType: "CUSTOMER_MANUAL",
        entityType: "customer",
        entityId: customerId,
        recipient: chatId,
        payload,
        dedupeToday: false,
        maxAttempts: 6,
        skipCustomerRateLimit: true,
        skipInvalidChatCheck: true,
      });
      const delivered = await tryDeliverQueuedTelegramNow(
        queued,
        payload,
        chatId,
      );
      return res.json({ success: true, data: delivered });
    } catch (e) {
      next(e);
    }
  },
);
// Upload attachment for Telegram (used in Conversation View)
app.post(
  "/api/telegram/upload",
  authorizeRole(["Admin", "Manager"]),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const f: any = (req as any).file;
      if (!f)
        return res
          .status(400)
          .json({ success: false, message: "فایلی ارسال نشده است." });
      const finalized = await finalizePrivateUpload(f);
      res.json({
        success: true,
        data: {
          filename: finalized.filename,
          originalName: finalized.originalName,
          mimeType: finalized.mimeType,
          size: finalized.size,
          relPath: finalized.filename,
          url: `/api/uploads/${finalized.filename}`,
        },
      });
    } catch (e) {
      if (e instanceof SafeUploadError) {
        return res.status(e.statusCode).json({
          success: false,
          message: "محتوای فایل پیوست معتبر نیست. فقط JPEG، PNG، WebP و PDF مجاز است.",
        });
      }
      next(e);
    }
  },
);
app.post(
  "/api/telegram/customer-actions/send-menu",
  authorizeRole(["Admin", "Manager"]),
  async (req, res, next) => {
    try {
      await ensureNotificationOutboxTables();
      await ensureCustomerTelegramColumns();
      const customerId = Number(req.body?.customerId || 0);
      if (!customerId)
        return res
          .status(400)
          .json({ success: false, message: "customerId نامعتبر است." });
      const c = (await getAsync(
        `SELECT id, fullName, phoneNumber,
              telegram_user_id,
              COALESCE(telegram_opted_out,0) AS telegram_opted_out,
              COALESCE(telegram_chat_id, telegramChatId) AS tg_chat_id
       FROM customers WHERE id=? LIMIT 1`,
        [customerId],
      )) as any;
      if (!c)
        return res
          .status(404)
          .json({ success: false, message: "مشتری یافت نشد." });
      if (Number(c.telegram_opted_out || 0) === 1)
        return res.status(400).json({
          success: false,
          message: "این مشتری از تلگرام opt-out کرده است.",
        });
      const chatId = String(c?.tg_chat_id || "").trim();
      const telegramUserId = String(c?.telegram_user_id || "").trim();
      if (!telegramUserId)
        return res.status(409).json({
          success: false,
          message: "برای ارسال منوی تعاملی، اتصال امن مشتری باید دوباره تأیید شود.",
        });
      if (!chatId)
        return res.status(400).json({
          success: false,
          message: "این مشتری به تلگرام لینک نشده است.",
        });
      const settings = await getAllSettingsAsObject();
      const baseUrl = String((settings as any).app_base_url || "").trim();
      const tpl = String(
        (settings as any).telegram_customer_bot_menu_message || "",
      ).trim();
      const defaultText = telegramCard(
        "منوی مشتری",
        "🤖",
        [
          `سلام ${esc(c.fullName || "")} 👋`,
          "از این منو می‌توانید سریع به اطلاعات مهم حساب خود دسترسی داشته باشید.",
          "",
          "📌 وضعیت حساب",
          "🧾 اقساط من",
          "🛠 تعمیرات",
          "🧾 خریدهای اخیر من",
        ],
        baseUrl
          ? `🔗 لینک برنامه: <a href="${escapeHtml(baseUrl)}">${escapeHtml(baseUrl)}</a>`
          : "ℹ️ از دکمه‌های پایین برای ادامه استفاده کنید.",
      );
      const rawText = tpl
        ? safeReplaceTemplate(tpl, {
            name: c.fullName || "",
            phone: c.phoneNumber || "",
            link: baseUrl,
            now: moment().locale("fa").format("jYYYY/jMM/jDD HH:mm"),
          })
        : defaultText;
      const text = sanitizeTelegramHtml(markdownishToHtml(rawText));
      const payload = {
        text,
        chatId,
        parseMode: "HTML",
        capCustomerId: customerId,
      };
      const queued = await enqueueOutbox({
        channel: "telegram",
        provider: "telegram",
        eventType: "CUSTOMER_BOT_MENU",
        entityType: "customer",
        entityId: customerId,
        recipient: chatId,
        payload,
        dedupeToday: false,
        maxAttempts: 6,
        skipCustomerRateLimit: true,
        skipInvalidChatCheck: true,
      });
      const delivered = await tryDeliverQueuedTelegramNow(
        queued,
        payload,
        chatId,
      );
      return res.json({ success: true, data: delivered });
    } catch (e) {
      next(e);
    }
  },
);
app.post(
  "/api/telegram/customer-actions/send-account-status",
  authorizeRole(["Admin", "Manager"]),
  async (req, res, next) => {
    try {
      await ensureNotificationOutboxTables();
      await ensureCustomerTelegramColumns();
      const customerId = Number(req.body?.customerId || 0);
      if (!customerId)
        return res
          .status(400)
          .json({ success: false, message: "customerId نامعتبر است." });
      // NOTE: بعضی دیتابیس‌ها ستون currentBalance داخل customers ندارند.
      // برای سازگاری، موجودی را از آخرین رکورد customer_ledger می‌خوانیم.
      const c = (await getAsync(
        `SELECT id, fullName, phoneNumber,
              COALESCE((SELECT balance FROM customer_ledger WHERE customerId=? ORDER BY id DESC LIMIT 1), 0) AS currentBalance,
              COALESCE(telegram_opted_out,0) AS telegram_opted_out,
              COALESCE(telegram_chat_id, telegramChatId) AS tg_chat_id
       FROM customers WHERE id=? LIMIT 1`,
        [customerId, customerId],
      )) as any;
      if (!c)
        return res
          .status(404)
          .json({ success: false, message: "مشتری یافت نشد." });
      if (Number(c.telegram_opted_out || 0) === 1)
        return res.status(400).json({
          success: false,
          message: "این مشتری از تلگرام opt-out کرده است.",
        });
      const chatId = String(c?.tg_chat_id || "").trim();
      if (!chatId)
        return res.status(400).json({
          success: false,
          message: "این مشتری به تلگرام لینک نشده است.",
        });
      // installments overview
      const agg = (await getAsync(
        `SELECT COUNT(*) AS openCount,
              MIN(p.dueDate) AS nextDueDate,
              SUM(p.amountDue) AS openTotal
       FROM installment_payments p
       JOIN installment_sales s ON s.id=p.saleId
       WHERE s.customerId=? AND COALESCE(s.status,'active') = 'active' AND (p.status IS NULL OR p.status!='پرداخت شده')`,
        [customerId],
      )) as any;
      const nextRow = (await getAsync(
        `SELECT p.dueDate AS dueDate, p.amountDue AS amountDue
       FROM installment_payments p
       JOIN installment_sales s ON s.id=p.saleId
       WHERE s.customerId=? AND COALESCE(s.status,'active') = 'active' AND (p.status IS NULL OR p.status!='پرداخت شده')
       ORDER BY p.dueDate ASC
       LIMIT 1`,
        [customerId],
      )) as any;
      const openCount = Number(agg?.openCount || 0);
      const nextDueDate = String(
        nextRow?.dueDate || agg?.nextDueDate || "",
      ).trim();
      const nextAmount = Number(nextRow?.amountDue || 0);
      const openTotal = Number(agg?.openTotal || 0);
      const bal = Number(c?.currentBalance || 0);
      const fmtMoney = (v: number) =>
        Math.round(v).toLocaleString("fa-IR") + " تومان";
      const settings = await getAllSettingsAsObject();
      const tpl = String(
        (settings as any).telegram_customer_account_status_message || "",
      ).trim();
      const defaultText = telegramCard(
        "وضعیت حساب",
        "📌",
        [
          `👤 <b>مشتری:</b> {name}`,
          `💳 <b>موجودی دفتری:</b> {balance}`,
          `🧾 <b>اقساط باز:</b> {openCount}`,
          nextDueDate
            ? `⏳ <b>نزدیک‌ترین سررسید:</b> {nextDueDate} — {nextAmount}`
            : "",
          openCount ? `📊 <b>جمع اقساط باز:</b> {openTotal}` : "",
        ],
        "این پیام به‌صورت خودکار تولید شده است.",
      );
      const vars = {
        name: String(c.fullName || ""),
        phone: String(c.phoneNumber || ""),
        balance: fmtMoney(bal),
        openCount: String(openCount),
        nextDueDate: nextDueDate || "",
        nextAmount: fmtMoney(nextAmount || 0),
        openTotal: fmtMoney(openTotal || 0),
        now: moment().locale("fa").format("jYYYY/jMM/jDD HH:mm"),
      };
      const rawText = safeReplaceTemplate(tpl || defaultText, vars);
      const text = sanitizeTelegramHtml(markdownishToHtml(rawText));
      const payload = {
        text,
        chatId,
        parseMode: "HTML",
        capCustomerId: customerId,
      };
      const queued = await enqueueOutbox({
        channel: "telegram",
        provider: "telegram",
        eventType: "CUSTOMER_ACCOUNT_STATUS",
        entityType: "customer",
        entityId: customerId,
        recipient: chatId,
        payload,
        dedupeToday: false,
        maxAttempts: 6,
        skipCustomerRateLimit: true,
        skipInvalidChatCheck: true,
      });
      const delivered = await tryDeliverQueuedTelegramNow(
        queued,
        payload,
        chatId,
      );
      return res.json({ success: true, data: delivered });
    } catch (e) {
      next(e);
    }
  },
);


};
