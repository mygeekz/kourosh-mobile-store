import type { Express } from "express";
import {
  allAsync,
  getAsync,
  getAllSettingsAsObject,
  getInstallmentCheckDetailsForSms,
  getInstallmentPaymentDetailsForSms,
  getInstallmentSaleDetailsForSms,
  getRepairDetailsForSms,
} from "../database";
import {
  getTelegramBotInfo,
  sendTelegramMessage,
  setTelegramProxy,
} from "../telegramService";

type AuthorizeRole = (roles: string[]) => any;

type RegisterTelegramRuntimeDeps = {
  authorizeRole: AuthorizeRole;
  insertSmsLog: (payload: any) => Promise<any>;
  inferEntityTypeFromEvent: (eventType?: string) => string | undefined;
  formatPriceForSms: (price: number) => string;
  sanitizeTelegramHtml: (html: string) => string;
  renderTplHtml: (tpl: string, vars: Record<string, any>) => string;
  markdownishToHtml: (template: string) => string;
  telegramCard: (title: string, icon: string, lines: string[], footer?: string) => string;
  stripTags: (txt: string) => string;
  makeCorrId: () => string;
};

export const registerTelegramRuntimeRoutes = (
  app: Express,
  {
    authorizeRole,
    insertSmsLog,
    inferEntityTypeFromEvent,
    formatPriceForSms,
    sanitizeTelegramHtml,
    renderTplHtml,
    markdownishToHtml,
    telegramCard,
    stripTags,
    makeCorrId,
  }: RegisterTelegramRuntimeDeps,
): void => {
app.post(
  "/api/telegram/check-message",
  authorizeRole(["Admin", "Manager"]),
  async (req, res, next) => {
    try {
      const { text, parseMode } = req.body || {};
      const settings = await getAllSettingsAsObject();
      setTelegramProxy((settings as any).telegram_proxy);
      const botToken = String(settings.telegram_bot_token || "").trim();
      const chatId = String(settings.telegram_chat_id || "").trim();
      if (!botToken || !chatId)
        return res.status(400).json({
          success: false,
          message: "توکن ربات یا Chat ID تلگرام تنظیم نشده است.",
        });
      const correlationId = makeCorrId();
      const pmRaw = String(parseMode || "").trim();
      const pm =
        pmRaw === "HTML" || pmRaw === "Markdown" || pmRaw === "MarkdownV2"
          ? (pmRaw as any)
          : undefined;
      let msg = String(text || "").trim();
      if (!msg)
        return res
          .status(400)
          .json({ success: false, message: "متن پیام خالی است." });
      if (pm === "HTML") msg = sanitizeTelegramHtml(msg);
      // for Markdown modes, at least drop raw tags
      if (pm === "Markdown" || pm === "MarkdownV2") msg = stripTags(msg);
      const result = await sendTelegramMessage(botToken, chatId, msg, {
        parseMode: pm,
      });
      // log like sms_logs for uniform audit
      try {
        await insertSmsLog({
          reqUser: req.user,
          provider: "telegram",
          eventType: "TEST_MESSAGE",
          entityType: "telegram",
          entityId: null as any,
          recipient: chatId,
          patternId: `TELEGRAM_${pm || "TEXT"}`,
          tokens: [msg],
          success: !!result?.success,
          response: result,
          correlationId,
          request: {
            action: "sendMessage",
            chatId,
            parseMode: pm || "TEXT",
            textLength: msg.length,
          },
          httpStatus:
            (result as any)?.details?.httpStatus ?? (result as any)?.status,
          rawResponseText:
            (result as any)?.details?.rawResponseText ??
            (result as any)?.rawText,
          durationMs: (result as any)?.details?.durationMs,
          error: result?.success ? undefined : result?.message,
        });
      } catch {}
      if (result?.success)
        return res.json({
          success: true,
          message: "پیام تلگرام ارسال شد.",
          data: result,
        });
      return res.json({
        success: false,
        message: result?.message || "خطا در ارسال تلگرام",
        data: result,
      });
    } catch (e) {
      next(e);
    }
  },
);

app.get(
  "/api/telegram/logs",
  authorizeRole(["Admin", "Manager"]),
  async (req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      const limit = Math.max(1, Math.min(parseInt(String(req.query.limit || "10"), 10) || 10, 100));
      const offset = Math.max(parseInt(String(req.query.offset || "0"), 10) || 0, 0);
      const success = typeof req.query.success === "string" ? String(req.query.success) : undefined;
      const eventType = typeof req.query.eventType === "string" ? String(req.query.eventType) : undefined;
      const recipient = typeof req.query.recipient === "string" ? String(req.query.recipient).trim() : "";

      const where: string[] = ["provider = ?"];
      const params: any[] = ["telegram"];
      if (success === "true") where.push("success = 1");
      if (success === "false") where.push("success = 0");
      if (eventType && eventType !== "ALL") {
        where.push("eventType = ?");
        params.push(eventType);
      }
      if (recipient) {
        where.push("recipient LIKE ?");
        params.push(`%${recipient}%`);
      }

      const whereSql = where.join(" AND ");
      const rows = await allAsync(
        `SELECT * FROM sms_logs WHERE ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      );
      const statsRow: any = await getAsync(
        `SELECT
           COUNT(1) AS total,
           SUM(CASE WHEN IFNULL(success,0)=1 THEN 1 ELSE 0 END) AS successful,
           SUM(CASE WHEN IFNULL(success,0)=1 THEN 0 ELSE 1 END) AS failed,
           AVG(CASE WHEN durationMs > 0 THEN durationMs END) AS avgDuration,
           MAX(createdAt) AS lastSentAt
         FROM sms_logs
        WHERE ${whereSql}`,
        params,
      );

      const normalizeLogRow = (row: any) => {
        let response: any = null;
        try {
          response = row?.responseJson ? JSON.parse(String(row.responseJson)) : null;
        } catch {}
        const details = response?.details || {};
        return {
          ...row,
          correlationId: row?.correlationId || `tg-${String(row?.id || "").padStart(6, "0")}`,
          httpStatus: typeof row?.httpStatus === "number"
            ? row.httpStatus
            : typeof details?.httpStatus === "number"
              ? details.httpStatus
              : null,
          rawResponseText: row?.rawResponseText || details?.rawResponseText || response?.rawText || null,
          durationMs: typeof row?.durationMs === "number"
            ? row.durationMs
            : typeof details?.durationMs === "number"
              ? details.durationMs
              : null,
        };
      };

      const total = Number(statsRow?.total || 0);
      return res.json({
        success: true,
        data: {
          rows: (rows || []).map(normalizeLogRow),
          pagination: { limit, offset, total },
          stats: {
            total,
            successful: Number(statsRow?.successful || 0),
            failed: Number(statsRow?.failed || 0),
            avgDuration: Math.round(Number(statsRow?.avgDuration || 0)),
            lastSentAt: statsRow?.lastSentAt || null,
          },
        },
      });
    } catch (e) {
      next(e);
    }
  },
);

app.post(
  "/api/telegram/logs/:id/retry",
  authorizeRole(["Admin", "Manager", "Salesperson"]),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!id || isNaN(id))
        return res
          .status(400)
          .json({ success: false, message: "شناسه لاگ تلگرام نامعتبر است." });

      const log = (await getAsync(
        "SELECT * FROM sms_logs WHERE id = ? AND provider = ?",
        [id, "telegram"],
      )) as any;
      if (!log)
        return res
          .status(404)
          .json({ success: false, message: "لاگ تلگرام یافت نشد." });

      const parseSafeJson = (value: any, fallback: any) => {
        try {
          if (value === null || value === undefined || value === "")
            return fallback;
          return JSON.parse(String(value));
        } catch {
          return fallback;
        }
      };

      const settings = await getAllSettingsAsObject();
      setTelegramProxy((settings as any).telegram_proxy);
      const botToken = String(
        (settings as any).telegram_bot_token || "",
      ).trim();
      if (!botToken)
        return res.status(400).json({
          success: false,
          message: "توکن ربات تلگرام تنظیم نشده است.",
        });

      const eventType = String(log.eventType || "RETRY");
      const recipient = String(log.recipient || "").trim();
      const tokens = parseSafeJson(log.tokensJson, []);
      const requestJson = parseSafeJson(log.requestJson, {});
      const correlationId = makeCorrId();
      let result: any;
      let requestForLog: any = { retryOfLogId: id, eventType, recipient };

      if (eventType === "HEALTH_CHECK" || recipient === "telegram:getMe") {
        result = await getTelegramBotInfo(botToken);
        requestForLog = { ...requestForLog, action: "getMe" };
      } else {
        const chatId = String(
          recipient ||
            requestJson?.chatId ||
            requestJson?.recipient ||
            (settings as any).telegram_chat_id ||
            "",
        ).trim();
        if (!chatId)
          return res.status(400).json({
            success: false,
            message: "گیرنده تلگرام در لاگ یا تنظیمات پیدا نشد.",
          });

        const rawText = String(
          requestJson?.text ||
            requestJson?.message ||
            requestJson?.body ||
            requestJson?.caption ||
            (Array.isArray(tokens) ? tokens[0] : "") ||
            "",
        ).trim();
        if (!rawText) {
          return res.status(400).json({
            success: false,
            message:
              "این لاگ متن قابل ارسال مجدد ندارد. برای این نوع پیام باید رویداد اصلی دوباره اجرا شود.",
          });
        }

        const parseModeRaw = String(
          requestJson?.parseMode || requestJson?.parse_mode || "",
        ).trim();
        const inferredParseMode = String(log.patternId || "").includes("HTML")
          ? "HTML"
          : undefined;
        const parseMode =
          parseModeRaw === "HTML" ||
          parseModeRaw === "Markdown" ||
          parseModeRaw === "MarkdownV2"
            ? (parseModeRaw as any)
            : (inferredParseMode as any);
        let text = rawText;
        if (parseMode === "HTML") text = sanitizeTelegramHtml(text);
        if (parseMode === "Markdown" || parseMode === "MarkdownV2")
          text = stripTags(text);
        result = await sendTelegramMessage(botToken, chatId, text, {
          parseMode,
        });
        requestForLog = {
          ...requestForLog,
          chatId,
          parseMode: parseMode || "TEXT",
          textLength: text.length,
        };
      }

      await insertSmsLog({
        reqUser: req.user,
        provider: "telegram",
        eventType,
        entityType:
          log.entityType || inferEntityTypeFromEvent(eventType) || "telegram",
        entityId: log.entityId ? Number(log.entityId) : (null as any),
        recipient:
          recipient ||
          String((settings as any).telegram_chat_id || "telegram:getMe"),
        patternId: String(log.patternId || "TELEGRAM_RETRY"),
        tokens: Array.isArray(tokens) ? tokens : [],
        success: !!result?.success,
        response: result,
        request: requestForLog,
        httpStatus: (result as any)?.details?.httpStatus,
        rawResponseText: (result as any)?.details?.rawResponseText,
        durationMs: (result as any)?.details?.durationMs,
        correlationId,
        error: result?.success ? undefined : result?.message,
        relatedLogId: id,
      });

      if (result?.success)
        return res.json({
          success: true,
          message: "ارسال مجدد تلگرام انجام شد.",
          data: result,
        });
      return res.status(500).json({
        success: false,
        message: result?.message || "ارسال مجدد تلگرام ناموفق بود.",
        data: result,
      });
    } catch (e) {
      next(e);
    }
  },
);

app.post(
  "/api/telegram/trigger-event",
  authorizeRole(["Admin", "Manager", "Salesperson"]),
  async (req, res, next) => {
    try {
      const { targetId, eventType } = req.body || {};
      const correlationId = makeCorrId();
      if (!targetId || isNaN(Number(targetId)))
        return res
          .status(400)
          .json({ success: false, message: "شناسه هدف نامعتبر است." });
      if (!eventType)
        return res
          .status(400)
          .json({ success: false, message: "نوع رویداد نامعتبر است." });
      const settings = await getAllSettingsAsObject();
      setTelegramProxy((settings as any).telegram_proxy);
      const botToken = String(settings.telegram_bot_token || "").trim();
      const chatId = String(settings.telegram_chat_id || "").trim();
      if (!botToken || !chatId)
        return res.status(400).json({
          success: false,
          message: "توکن ربات یا Chat ID تلگرام تنظیم نشده است.",
        });
      let tokens: string[] = [];
      let template: string | undefined;
      if (eventType === "INSTALLMENT_REMINDER") {
        const p = await getInstallmentPaymentDetailsForSms(targetId);
        if (!p) throw new Error("اطلاعات قسط یافت نشد.");
        tokens = [
          p.customerFullName,
          formatPriceForSms(p.amountDue),
          p.dueDate,
        ];
        template = settings.telegram_installment_reminder_message;
      } else if (eventType === "INSTALLMENT_COMPLETED") {
        const s = await getInstallmentSaleDetailsForSms(targetId);
        if (!s) throw new Error("اطلاعات فروش اقساطی یافت نشد.");
        tokens = [
          s.customerFullName,
          String(s.saleId),
          formatPriceForSms(s.totalPrice),
        ];
        template = settings.telegram_installment_completed_message;
      } else if (eventType === "INSTALLMENT_DUE_7") {
        const p = await getInstallmentPaymentDetailsForSms(targetId);
        if (!p) throw new Error("اطلاعات قسط یافت نشد.");
        tokens = [
          p.customerFullName,
          formatPriceForSms(p.amountDue),
          p.dueDate,
        ];
        template = settings.telegram_installment_due_7_message;
      } else if (eventType === "INSTALLMENT_DUE_3") {
        const p = await getInstallmentPaymentDetailsForSms(targetId);
        if (!p) throw new Error("اطلاعات قسط یافت نشد.");
        tokens = [
          p.customerFullName,
          formatPriceForSms(p.amountDue),
          p.dueDate,
        ];
        template = settings.telegram_installment_due_3_message;
      } else if (eventType === "INSTALLMENT_DUE_TODAY") {
        const p = await getInstallmentPaymentDetailsForSms(targetId);
        if (!p) throw new Error("اطلاعات قسط یافت نشد.");
        tokens = [
          p.customerFullName,
          formatPriceForSms(p.amountDue),
          p.dueDate,
        ];
        template =
          (settings as any).telegram_installment_due_notice_message ||
          settings.telegram_installment_due_today_message;
      } else if (eventType === "CHECK_DUE_7") {
        const c = await getInstallmentCheckDetailsForSms(targetId);
        if (!c) throw new Error("اطلاعات چک یافت نشد.");
        tokens = [
          c.customerFullName,
          c.checkNumber,
          c.dueDate,
          formatPriceForSms(c.amount),
        ];
        template = settings.telegram_check_due_7_message;
      } else if (eventType === "CHECK_DUE_3") {
        const c = await getInstallmentCheckDetailsForSms(targetId);
        if (!c) throw new Error("اطلاعات چک یافت نشد.");
        tokens = [
          c.customerFullName,
          c.checkNumber,
          c.dueDate,
          formatPriceForSms(c.amount),
        ];
        template = settings.telegram_check_due_3_message;
      } else if (eventType === "CHECK_DUE_TODAY") {
        const c = await getInstallmentCheckDetailsForSms(targetId);
        if (!c) throw new Error("اطلاعات چک یافت نشد.");
        tokens = [
          c.customerFullName,
          c.checkNumber,
          c.dueDate,
          formatPriceForSms(c.amount),
        ];
        template = settings.telegram_check_due_today_message;
      } else if (eventType === "REPAIR_RECEIVED") {
        const r = await getRepairDetailsForSms(targetId);
        if (!r) throw new Error("اطلاعات تعمیر یافت نشد.");
        tokens = [r.customerFullName, r.deviceModel, String(r.id)];
        template = settings.telegram_repair_received_message;
      } else if (eventType === "REPAIR_COST_ESTIMATED") {
        const r = await getRepairDetailsForSms(targetId);
        if (!r || r.estimatedCost == null)
          throw new Error("اطلاعات هزینه تخمینی یافت نشد.");
        tokens = [
          r.customerFullName,
          r.deviceModel,
          String(r.id),
          formatPriceForSms(r.estimatedCost),
        ];
        template =
          (settings as any).telegram_repair_cost_notice_message ||
          settings.telegram_repair_cost_estimated_message;
      } else if (eventType === "REPAIR_READY_FOR_PICKUP") {
        const r = await getRepairDetailsForSms(targetId);
        if (!r || r.finalCost == null)
          throw new Error("اطلاعات هزینه نهایی یافت نشد.");
        tokens = [
          r.customerFullName,
          r.deviceModel,
          String(r.id),
          formatPriceForSms(r.finalCost),
        ];
        template = settings.telegram_repair_ready_message;
      } else {
        throw new Error("نوع رویداد نامعتبر است.");
      }
      // Default templates (fallback) if admin hasn't set one yet
      if (!template) {
        switch (eventType) {
          case "INSTALLMENT_REMINDER":
            template = telegramCard(
              "یادآوری قسط",
              "🔔",
              [
                `👤 مشتری: <b>{name}</b>`,
                `💰 مبلغ: <b>{amount} تومان</b>`,
                `📅 سررسید: <b>{dueDate}</b>`,
              ],
              "🧾 جزئیات اقساط: /installments",
            );
            break;
          case "INSTALLMENT_COMPLETED":
            template = telegramCard(
              "تسویه اقساط",
              "✅",
              [
                `👤 مشتری: <b>{name}</b>`,
                `🧾 شماره فروش: <b>{saleId}</b>`,
                `💰 مبلغ کل: <b>{total} تومان</b>`,
              ],
              "سپاس از همراهی شما",
            );
            break;
          case "INSTALLMENT_DUE_7":
            template = telegramCard(
              "۷ روز مانده تا سررسید قسط",
              "⏳",
              [
                `👤 مشتری: <b>{name}</b>`,
                `💰 مبلغ: <b>{amount} تومان</b>`,
                `📅 سررسید: <b>{dueDate}</b>`,
              ],
              "🧾 جزئیات اقساط: /installments",
            );
            break;
          case "INSTALLMENT_DUE_3":
            template = telegramCard(
              "۳ روز مانده تا سررسید قسط",
              "⏳",
              [
                `👤 مشتری: <b>{name}</b>`,
                `💰 مبلغ: <b>{amount} تومان</b>`,
                `📅 سررسید: <b>{dueDate}</b>`,
              ],
              "🧾 جزئیات اقساط: /installments",
            );
            break;
          case "INSTALLMENT_DUE_TODAY":
            template = telegramCard(
              "سررسید امروز",
              "⏰",
              [
                `👤 مشتری: <b>{name}</b>`,
                `💰 مبلغ: <b>{amount} تومان</b>`,
                `📅 سررسید امروز: <b>{dueDate}</b>`,
              ],
              "🧾 جزئیات اقساط: /installments",
            );
            break;
          case "CHECK_DUE_7":
            template = telegramCard(
              "سررسید چک - ۷ روز",
              "🧾",
              [
                `👤 مشتری: <b>{name}</b>`,
                `🔢 شماره چک: <b>{checkNumber}</b>`,
                `📅 تاریخ: <b>{dueDate}</b>`,
                `💰 مبلغ: <b>{amount} تومان</b>`,
              ],
              "برای پیگیری، از پرونده مالی استفاده کنید.",
            );
            break;
          case "CHECK_DUE_3":
            template = telegramCard(
              "سررسید چک - ۳ روز",
              "🧾",
              [
                `👤 مشتری: <b>{name}</b>`,
                `🔢 شماره چک: <b>{checkNumber}</b>`,
                `📅 تاریخ: <b>{dueDate}</b>`,
                `💰 مبلغ: <b>{amount} تومان</b>`,
              ],
              "برای پیگیری، از پرونده مالی استفاده کنید.",
            );
            break;
          case "CHECK_DUE_TODAY":
            template = telegramCard(
              "سررسید چک امروز",
              "🧾",
              [
                `👤 مشتری: <b>{name}</b>`,
                `🔢 شماره چک: <b>{checkNumber}</b>`,
                `📅 تاریخ: <b>{dueDate}</b>`,
                `💰 مبلغ: <b>{amount} تومان</b>`,
              ],
              "برای پیگیری، از پرونده مالی استفاده کنید.",
            );
            break;
          case "REPAIR_RECEIVED":
            template = telegramCard(
              "پذیرش تعمیر",
              "📥",
              [
                `👤 مشتری: <b>{name}</b>`,
                `📱 دستگاه: <b>{deviceModel}</b>`,
                `🧾 کد تعمیر: <b>{repairId}</b>`,
              ],
              "وضعیت از بخش تعمیرات قابل پیگیری است.",
            );
            break;
          case "REPAIR_COST_ESTIMATED":
            template = telegramCard(
              "برآورد هزینه تعمیر",
              "🧮",
              [
                `👤 مشتری: <b>{name}</b>`,
                `📱 دستگاه: <b>{deviceModel}</b>`,
                `🧾 کد تعمیر: <b>{repairId}</b>`,
                `💰 هزینه: <b>{estimatedCost} تومان</b>`,
              ],
              "برای تأیید و ادامه، پیگیری انجام شود.",
            );
            break;
          case "REPAIR_READY_FOR_PICKUP":
            template = telegramCard(
              "آماده تحویل",
              "📦",
              [
                `👤 مشتری: <b>{name}</b>`,
                `📱 دستگاه: <b>{deviceModel}</b>`,
                `🧾 کد تعمیر: <b>{repairId}</b>`,
                `💰 هزینه نهایی: <b>{finalCost} تومان</b>`,
              ],
              "لطفاً جهت تحویل هماهنگ شود.",
            );
            break;
        }
      }
      const values: Record<string, string> = {
        name: tokens[0] ?? "",
        amount: tokens[1] ?? "",
        dueDate: tokens[2] ?? "",
        saleId: tokens[1] ?? "",
        total: tokens[2] ?? "",
        checkNumber: tokens[1] ?? "",
        deviceModel: tokens[1] ?? "",
        repairId: tokens[2] ?? "",
        estimatedCost: tokens[3] ?? "",
        finalCost: tokens[3] ?? "",
      };
      const text = sanitizeTelegramHtml(
        renderTplHtml(markdownishToHtml(String(template)), values),
      );
      const result = await sendTelegramMessage(botToken, chatId, text, {
        parseMode: "HTML",
      });
      try {
        await insertSmsLog({
          reqUser: req.user,
          provider: "telegram",
          eventType,
          entityType: inferEntityTypeFromEvent(eventType) as any,
          entityId: Number(targetId),
          recipient: chatId,
          patternId: "TELEGRAM_TEMPLATE",
          tokens,
          success: !!result?.success,
          response: result,
          error: result?.success ? undefined : result?.message,
        });
      } catch {}
      if (result?.success)
        return res.json({
          success: true,
          message: "تلگرام ارسال شد.",
          data: result,
        });
      return res.json({
        success: false,
        message: result?.message || "خطا در ارسال تلگرام",
        data: result,
      });
    } catch (e) {
      next(e);
    }
  },
);

};
