import type { Express } from "express";
import {
  allAsync,
  getAsync,
  getAllSettingsAsObject,
  getInstallmentPaymentDetailsForSms,
  getInstallmentSaleDetailsForSms,
  getRepairDetailsForSms,
  getInstallmentCheckDetailsForSms,
} from "../database";
import {
  sendMeliPayamakPatternSms,
  sendKavenegarPatternSms,
  sendSmsIrPatternSms,
  sendIppanelPatternSms,
} from "../smsService";
import {
  sendTelegramMessage,
  setTelegramProxy,
} from "../telegramService";

type RegisterReminderRuntimeDeps = {
  authorizeRole: (roles: string[]) => any;
  runAutoSendRulesOnce: () => Promise<any>;
  runCustomerTelegramNotificationsTick: () => Promise<any>;
  processOneOutboxRow: () => Promise<any>;
  insertSmsLog: (payload: any) => Promise<any>;
  inferEntityTypeFromEvent: (eventType?: string) => string | undefined;
  formatPriceForSms: (price: number) => string;
  sanitizeTelegramHtml: (html: string) => string;
  renderTplHtml: (tpl: string, vars: Record<string, any>) => string;
  markdownishToHtml: (template: string) => string;
  makeCorrId: () => string;
};

export const registerReminderRuntimeRoutes = (
  app: Express,
  {
    authorizeRole,
    runAutoSendRulesOnce,
    runCustomerTelegramNotificationsTick,
    processOneOutboxRow,
    insertSmsLog,
    inferEntityTypeFromEvent,
    formatPriceForSms,
    sanitizeTelegramHtml,
    renderTplHtml,
    markdownishToHtml,
    makeCorrId,
  }: RegisterReminderRuntimeDeps,
): void => {
app.post(
  "/api/automation/run-auto-send",
  authorizeRole(["Admin", "Manager"]),
  async (_req, res, next) => {
    try {
      await runAutoSendRulesOnce();
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },
);
app.post(
  "/api/reminders/run-now",
  authorizeRole(["Admin", "Manager"]),
  async (_req, res, next) => {
    try {
      await runCustomerTelegramNotificationsTick();
      try {
        for (let i = 0; i < 20; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          const did = await processOneOutboxRow();
          if (!did) break;
        }
      } catch {}
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },
);
// SMS Logs (آخرین ارسال‌ها) — صفحه‌بندی و خلاصه واقعی سمت سرور.
app.get(
  "/api/sms/logs",
  authorizeRole(["Admin", "Manager"]),
  async (req, res, next) => {
    try {
      const limit = Math.min(Math.max(parseInt(String(req.query.limit || "10"), 10) || 10, 1), 100);
      const offset = Math.max(parseInt(String(req.query.offset || "0"), 10) || 0, 0);
      const success = typeof req.query.success === "string" ? String(req.query.success) : undefined;
      const eventType = typeof req.query.eventType === "string" ? String(req.query.eventType) : undefined;
      const recipient = typeof req.query.recipient === "string" ? String(req.query.recipient) : undefined;
      const where: string[] = ["LOWER(COALESCE(provider, '')) <> 'telegram'"];
      const params: any[] = [];
      if (success === "true") where.push("success = 1");
      if (success === "false") where.push("success = 0");
      if (eventType && eventType !== "ALL") {
        where.push("eventType = ?");
        params.push(eventType);
      }
      if (recipient && recipient.trim()) {
        where.push("recipient LIKE ?");
        params.push(`%${recipient.trim()}%`);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const rows = await allAsync(
        `SELECT * FROM sms_logs ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      );
      const summary = await getAsync(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS successCount,
           SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failCount,
           AVG(CASE WHEN durationMs IS NOT NULL THEN durationMs END) AS avgDurationMs,
           MAX(createdAt) AS lastCreatedAt
         FROM sms_logs ${whereSql}`,
        params,
      );
      res.setHeader("Cache-Control", "no-store");
      res.json({
        success: true,
        data: rows,
        meta: {
          limit,
          offset,
          total: Number(summary?.total || 0),
          successCount: Number(summary?.successCount || 0),
          failCount: Number(summary?.failCount || 0),
          avgDurationMs: summary?.avgDurationMs === null || summary?.avgDurationMs === undefined
            ? null
            : Math.round(Number(summary.avgDurationMs)),
          lastCreatedAt: summary?.lastCreatedAt || null,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (e) {
      next(e);
    }
  },
);
// Retry a previous sms log entry (pattern re-send)
app.post(
  "/api/sms/logs/:id/retry",
  authorizeRole(["Admin", "Manager", "Salesperson"]),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const correlationId = makeCorrId();
      if (!id || isNaN(id))
        return res
          .status(400)
          .json({ success: false, message: "شناسه لاگ نامعتبر است." });
      const log = await getAsync("SELECT * FROM sms_logs WHERE id = ?", [id]);
      if (!log)
        return res
          .status(404)
          .json({ success: false, message: "لاگ یافت نشد." });
      const settings = await getAllSettingsAsObject();
      const provider: string = String(
        log.provider || settings.sms_provider || "meli_payamak",
      ).toLowerCase();
      const recipientNumber = String(log.recipient || "").trim();
      const tokens: string[] = log.tokensJson
        ? JSON.parse(String(log.tokensJson) || "[]")
        : [];
      const patternId = String(log.patternId || "").trim();
      if (!recipientNumber)
        return res
          .status(400)
          .json({ success: false, message: "شماره گیرنده در لاگ موجود نیست." });
      if (!patternId)
        return res
          .status(400)
          .json({ success: false, message: "شناسه پترن در لاگ موجود نیست." });
      let result: any;
      if (provider === "meli_payamak") {
        const username = settings.meli_payamak_username;
        const password = settings.meli_payamak_password;
        const bid = Number(patternId);
        if (!username || !password)
          return res.status(400).json({
            success: false,
            message: "نام کاربری/رمز عبور ملی پیامک در تنظیمات وارد نشده است.",
          });
        if (!bid || isNaN(bid))
          return res
            .status(400)
            .json({ success: false, message: "BodyId نامعتبر است." });
        result = await sendMeliPayamakPatternSms(
          recipientNumber,
          bid,
          tokens,
          username,
          password,
        );
      } else {
        return res.status(400).json({
          success: false,
          message: "ارسال مجدد فعلاً فقط برای ملی پیامک فعال است.",
        });
      }
      await insertSmsLog({
        correlationId,
        reqUser: req.user,
        provider,
        eventType: String(log.eventType || "RETRY"),
        entityType: log.entityType || inferEntityTypeFromEvent(log.eventType),
        entityId: log.entityId ? Number(log.entityId) : undefined,
        recipient: recipientNumber,
        patternId,
        tokens,
        success: !!result?.success,
        response: result,
        error: result?.success ? undefined : result?.message,
        relatedLogId: id,
      });
      if (result?.success)
        return res.json({
          success: true,
          message: "ارسال مجدد انجام شد.",
          data: result,
        });
      return res.status(500).json({
        success: false,
        message: result?.message || "خطا در ارسال مجدد",
        data: result,
      });
    } catch (e) {
      next(e);
    }
  },
);
app.post(
  "/api/sms/trigger-event",
  authorizeRole(["Admin", "Manager", "Salesperson"]),
  async (req, res, next) => {
    try {
      const { targetId, eventType } = req.body || {};
      const correlationId = makeCorrId();
      if (!targetId || isNaN(Number(targetId)))
        return res
          .status(400)
          .json({ success: false, message: "شناسه هدف نامعتبر است." });
      const settings = await getAllSettingsAsObject();
      // Determine which SMS provider to use. Default to MeliPayamak if none is set.
      const provider: string = (
        settings.sms_provider || "meli_payamak"
      ).toLowerCase();
      // Will hold common values across providers
      let recipientNumber = "";
      let tokens: string[] = [];
      let meliBodyId: number | undefined;
      let kavenegarTemplate: string | undefined;
      let smsIrTemplateId: number | undefined;
      let ippanelPatternCode: string | undefined;
      let telegramTemplate: string | undefined;
      // Prepare data based on event type
      if (eventType === "INSTALLMENT_REMINDER") {
        const p = await getInstallmentPaymentDetailsForSms(targetId);
        if (!p) throw new Error("اطلاعات قسط یافت نشد.");
        recipientNumber = p.customerPhoneNumber;
        // For all providers we build tokens in order: name, amount, due date
        tokens = [
          p.customerFullName,
          formatPriceForSms(p.amountDue),
          p.dueDate,
        ];
        // Provider-specific pattern/template identifiers
        // Default pattern for "یادآوری قسط (کلی)" if setting is empty
        meliBodyId =
          Number(
            settings.meli_payamak_installment_due_notice_pattern_id ||
              settings.meli_payamak_installment_reminder_pattern_id,
          ) || 341283;
        kavenegarTemplate = settings.kavenegar_installment_template;
        smsIrTemplateId = settings.sms_ir_installment_template_id
          ? Number(settings.sms_ir_installment_template_id)
          : undefined;
        ippanelPatternCode = settings.ippanel_installment_pattern_code;
      } else if (eventType === "INSTALLMENT_COMPLETED") {
        const s = await getInstallmentSaleDetailsForSms(targetId);
        if (!s) throw new Error("اطلاعات فروش اقساطی یافت نشد.");
        recipientNumber = s.customerPhoneNumber;
        // Tokens: name, sale id, total sale price
        tokens = [
          s.customerFullName,
          String(s.saleId),
          formatPriceForSms(s.totalPrice),
        ];
        meliBodyId =
          settings.meli_payamak_installment_settlement_pattern_id ||
          settings.meli_payamak_installment_completed_pattern_id
            ? Number(
                settings.meli_payamak_installment_settlement_pattern_id ||
                  settings.meli_payamak_installment_completed_pattern_id,
              )
            : undefined;
        kavenegarTemplate = settings.kavenegar_installment_completed_template;
        smsIrTemplateId = settings.sms_ir_installment_completed_template_id
          ? Number(settings.sms_ir_installment_completed_template_id)
          : undefined;
        ippanelPatternCode =
          settings.ippanel_installment_completed_pattern_code;
        telegramTemplate = settings.telegram_installment_completed_message;
      } else if (eventType === "REPAIR_RECEIVED") {
        const r = await getRepairDetailsForSms(targetId);
        if (!r) throw new Error("اطلاعات تعمیر یافت نشد.");
        recipientNumber = r.customerPhoneNumber;
        // Tokens: name, device model, repair ID
        tokens = [r.customerFullName, r.deviceModel, String(r.id)];
        meliBodyId = Number(settings.meli_payamak_repair_received_pattern_id);
        kavenegarTemplate = settings.kavenegar_repair_received_template;
        smsIrTemplateId = settings.sms_ir_repair_received_template_id
          ? Number(settings.sms_ir_repair_received_template_id)
          : undefined;
        ippanelPatternCode = settings.ippanel_repair_received_pattern_code;
      } else if (eventType === "REPAIR_COST_ESTIMATED") {
        const r = await getRepairDetailsForSms(targetId);
        if (!r || r.estimatedCost == null)
          throw new Error("اطلاعات هزینه تخمینی یافت نشد.");
        recipientNumber = r.customerPhoneNumber;
        tokens = [
          r.customerFullName,
          r.deviceModel,
          formatPriceForSms(r.estimatedCost),
        ];
        meliBodyId = Number(
          settings.meli_payamak_repair_cost_estimated_pattern_id,
        );
        kavenegarTemplate = settings.kavenegar_repair_cost_estimated_template;
        smsIrTemplateId = settings.sms_ir_repair_cost_estimated_template_id
          ? Number(settings.sms_ir_repair_cost_estimated_template_id)
          : undefined;
        ippanelPatternCode =
          settings.ippanel_repair_cost_estimated_pattern_code;
      } else if (eventType === "REPAIR_READY_FOR_PICKUP") {
        const r = await getRepairDetailsForSms(targetId);
        if (!r || r.finalCost == null)
          throw new Error("اطلاعات هزینه نهایی یافت نشد.");
        recipientNumber = r.customerPhoneNumber;
        tokens = [
          r.customerFullName,
          r.deviceModel,
          formatPriceForSms(r.finalCost),
        ];
        meliBodyId = Number(settings.meli_payamak_repair_ready_pattern_id);
        kavenegarTemplate = settings.kavenegar_repair_ready_template;
        smsIrTemplateId = settings.sms_ir_repair_ready_template_id
          ? Number(settings.sms_ir_repair_ready_template_id)
          : undefined;
        ippanelPatternCode = settings.ippanel_repair_ready_pattern_code;
      } else if (
        eventType === "INSTALLMENT_DUE_7" ||
        eventType === "INSTALLMENT_DUE_3" ||
        eventType === "INSTALLMENT_DUE_TODAY"
      ) {
        // Installment payment due reminders: 7 days, 3 days, or same-day
        const p = await getInstallmentPaymentDetailsForSms(targetId);
        if (!p) throw new Error("اطلاعات قسط یافت نشد.");
        recipientNumber = p.customerPhoneNumber;
        // Tokens: customer name, amount due, due date
        tokens = [
          p.customerFullName,
          formatPriceForSms(p.amountDue),
          p.dueDate,
        ];
        // Choose correct template/pattern based on days remaining
        if (eventType === "INSTALLMENT_DUE_7") {
          meliBodyId = Number(
            settings.meli_payamak_installment_due_7_pattern_id,
          );
          kavenegarTemplate = settings.kavenegar_installment_due_7_template;
          smsIrTemplateId = settings.sms_ir_installment_due_7_template_id
            ? Number(settings.sms_ir_installment_due_7_template_id)
            : undefined;
          ippanelPatternCode = settings.ippanel_installment_due_7_pattern_code;
          telegramTemplate = settings.telegram_installment_due_7_message;
        } else if (eventType === "INSTALLMENT_DUE_3") {
          meliBodyId = Number(
            settings.meli_payamak_installment_due_3_pattern_id,
          );
          kavenegarTemplate = settings.kavenegar_installment_due_3_template;
          smsIrTemplateId = settings.sms_ir_installment_due_3_template_id
            ? Number(settings.sms_ir_installment_due_3_template_id)
            : undefined;
          ippanelPatternCode = settings.ippanel_installment_due_3_pattern_code;
          telegramTemplate = settings.telegram_installment_due_3_message;
        } else {
          // Same-day reminder
          meliBodyId = Number(
            (settings as any).meli_payamak_installment_due_notice_pattern_id ||
              settings.meli_payamak_installment_due_today_pattern_id,
          );
          kavenegarTemplate = settings.kavenegar_installment_due_today_template;
          smsIrTemplateId = settings.sms_ir_installment_due_today_template_id
            ? Number(settings.sms_ir_installment_due_today_template_id)
            : undefined;
          ippanelPatternCode =
            settings.ippanel_installment_due_today_pattern_code;
          telegramTemplate =
            (settings as any).telegram_installment_due_notice_message ||
            settings.telegram_installment_due_today_message;
        }
      } else if (
        eventType === "CHECK_DUE_7" ||
        eventType === "CHECK_DUE_3" ||
        eventType === "CHECK_DUE_TODAY"
      ) {
        // Installment check due reminders: 7 days, 3 days, or same-day
        const c = await getInstallmentCheckDetailsForSms(targetId);
        if (!c) throw new Error("اطلاعات چک یافت نشد.");
        recipientNumber = c.customerPhoneNumber;
        // Tokens: customer name, check number, due date
        tokens = [
          c.customerFullName,
          c.checkNumber,
          c.dueDate,
          formatPriceForSms(c.amount),
        ];
        if (eventType === "CHECK_DUE_7") {
          meliBodyId = Number(settings.meli_payamak_check_due_7_pattern_id);
          kavenegarTemplate = settings.kavenegar_check_due_7_template;
          smsIrTemplateId = settings.sms_ir_check_due_7_template_id
            ? Number(settings.sms_ir_check_due_7_template_id)
            : undefined;
          ippanelPatternCode = settings.ippanel_check_due_7_pattern_code;
          telegramTemplate = settings.telegram_check_due_7_message;
        } else if (eventType === "CHECK_DUE_3") {
          meliBodyId = Number(settings.meli_payamak_check_due_3_pattern_id);
          kavenegarTemplate = settings.kavenegar_check_due_3_template;
          smsIrTemplateId = settings.sms_ir_check_due_3_template_id
            ? Number(settings.sms_ir_check_due_3_template_id)
            : undefined;
          ippanelPatternCode = settings.ippanel_check_due_3_pattern_code;
          telegramTemplate = settings.telegram_check_due_3_message;
        } else {
          meliBodyId = Number(settings.meli_payamak_check_due_today_pattern_id);
          kavenegarTemplate = settings.kavenegar_check_due_today_template;
          smsIrTemplateId = settings.sms_ir_check_due_today_template_id
            ? Number(settings.sms_ir_check_due_today_template_id)
            : undefined;
          ippanelPatternCode = settings.ippanel_check_due_today_pattern_code;
          telegramTemplate = settings.telegram_check_due_today_message;
        }
      } else {
        throw new Error("نوع رویداد نامعتبر است.");
      }
      if (!recipientNumber) throw new Error("شماره تماس گیرنده یافت نشد.");
      let smsResult;
      try {
        switch (provider) {
          case "meli_payamak": {
            const username = settings.meli_payamak_username;
            const password = settings.meli_payamak_password;
            if (!username || !password)
              throw new Error(
                "نام کاربری یا رمز عبور پنل ملی پیامک در تنظیمات وجود ندارد.",
              );
            if (!meliBodyId)
              throw new Error("شناسه الگوی پیامک ملی پیامک یافت نشد.");
            smsResult = await sendMeliPayamakPatternSms(
              recipientNumber,
              meliBodyId,
              tokens,
              username,
              password,
            );
            break;
          }
          case "kavenegar": {
            const apiKey = settings.kavenegar_api_key;
            if (!apiKey)
              throw new Error("کلید API کاوه‌نگار در تنظیمات وجود ندارد.");
            if (!kavenegarTemplate)
              throw new Error("نام قالب کاوه‌نگار یافت نشد.");
            smsResult = await sendKavenegarPatternSms(
              recipientNumber,
              kavenegarTemplate,
              tokens,
              apiKey,
            );
            break;
          }
          case "sms_ir": {
            const apiKey = settings.sms_ir_api_key;
            if (!apiKey)
              throw new Error("کلید API سرویس SMS.ir در تنظیمات وجود ندارد.");
            if (!smsIrTemplateId)
              throw new Error("شناسه قالب SMS.ir یافت نشد.");
            smsResult = await sendSmsIrPatternSms(
              recipientNumber,
              smsIrTemplateId,
              tokens,
              apiKey,
            );
            break;
          }
          case "ippanel": {
            const tokenAuth = settings.ippanel_token;
            const fromNumber = settings.ippanel_from_number;
            if (!tokenAuth || !fromNumber)
              throw new Error(
                "توکن یا شماره فرستنده IPPanel در تنظیمات وجود ندارد.",
              );
            if (!ippanelPatternCode)
              throw new Error("کد الگو برای IPPanel یافت نشد.");
            smsResult = await sendIppanelPatternSms(
              recipientNumber,
              ippanelPatternCode,
              tokens,
              tokenAuth,
              fromNumber,
            );
            break;
          }
          case "telegram": {
            setTelegramProxy((settings as any).telegram_proxy);
            const botToken = settings.telegram_bot_token;
            const chatId = settings.telegram_chat_id;
            if (!botToken || !chatId)
              throw new Error(
                "توکن ربات یا شناسه چت تلگرام در تنظیمات وجود ندارد.",
              );
            if (!telegramTemplate)
              throw new Error("قالب پیام تلگرام یافت نشد.");
            // Build message by replacing previews {name}, {amount}, {dueDate}, {checkNumber}
            const values: Record<string, string> = {
              name: tokens[0] ?? "",
              amount: tokens[1] ?? "",
              dueDate: tokens[2] ?? "",
              checkNumber: tokens[1] ?? "",
              saleId: tokens[1] ?? "",
              total: tokens[2] ?? "",
            };
            const text = sanitizeTelegramHtml(
              renderTplHtml(
                markdownishToHtml(String(telegramTemplate)),
                values,
              ),
            );
            smsResult = await sendTelegramMessage(botToken, chatId, text, {
              parseMode: "HTML",
            });
            break;
          }
          default:
            throw new Error("سرویس دهنده پیامک ناشناخته است.");
        }
      } catch (err) {
        // If provider-specific error thrown, wrap to unify error handling
        return next(err);
      }
      // Store sms log
      await insertSmsLog({
        reqUser: req.user,
        provider,
        eventType,
        entityType: inferEntityTypeFromEvent(eventType),
        entityId: Number(targetId),
        recipient: recipientNumber,
        patternId:
          provider === "meli_payamak"
            ? String(meliBodyId ?? "")
            : provider === "kavenegar"
              ? String(kavenegarTemplate ?? "")
              : provider === "sms_ir"
                ? String(smsIrTemplateId ?? "")
                : provider === "ippanel"
                  ? String(ippanelPatternCode ?? "")
                  : provider === "telegram"
                    ? "TELEGRAM"
                    : "",
        tokens,
        success: !!smsResult?.success,
        response: smsResult,
        request: {
          eventType,
          targetId: Number(targetId),
          provider,
          patternId: String(
            meliBodyId ?? kavenegarTemplate ?? smsIrTemplateId ?? "",
          ),
          recipient: recipientNumber,
          tokensCount: tokens.length,
        },
        httpStatus: (smsResult as any)?.details?.httpStatus,
        rawResponseText: (smsResult as any)?.details?.rawResponseText,
        durationMs: (smsResult as any)?.details?.durationMs,
        error: smsResult?.success ? undefined : smsResult?.message,
      });
      // Respond to client based on SMS result
      if (smsResult && smsResult.success) {
        res.status(200).json({
          success: true,
          message: "پیامک با موفقیت زمان‌بندی شد.",
          data: smsResult,
        });
      } else {
        const msg = smsResult?.message || "خطا در ارسال پیامک";
        res.status(500).json({
          success: false,
          message: `خطا در عملیات از سرویس پیامک: ${msg}`,
          data: smsResult,
        });
      }
    } catch (e) {
      next(e);
    }
  },
);
};
