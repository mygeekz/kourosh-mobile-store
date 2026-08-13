import type { Express } from "express";
import { getAllSettingsAsObject } from "../database";
import { sendMeliPayamakPatternSms } from "../smsService";

type AuthorizeRole = (roles: string[]) => any;

type RegisterSmsDiagnosticsDeps = {
  authorizeRole: AuthorizeRole;
  insertSmsLog: (payload: any) => Promise<any>;
  makeCorrId: () => string;
};

export const registerSmsDiagnosticsRoutes = (
  app: Express,
  { authorizeRole, insertSmsLog, makeCorrId }: RegisterSmsDiagnosticsDeps,
): void => {
// ارسال بررسی پیامک (Pattern) - برای بررسی سریع تنظیمات
// فعلاً فقط ملی پیامک (SendByBaseNumber2) به صورت پترن اجباری پشتیبانی می‌شود.
app.post(
  "/api/sms/check-pattern",
  authorizeRole(["Admin", "Manager"]),
  async (req, res, next) => {
    try {
      const { bodyId, to, tokens } = req.body || {};
      const bid = Number(bodyId);
      const recipient = String(to || "").trim();
      const tokenArr: string[] = Array.isArray(tokens)
        ? tokens.map((x) => String(x ?? ""))
        : [];
      if (!bid || isNaN(bid) || bid <= 0) {
        return res.status(400).json({
          success: false,
          message: "شناسه پترن (BodyId) نامعتبر است.",
        });
      }
      if (!recipient || recipient.length < 10) {
        return res
          .status(400)
          .json({ success: false, message: "شماره گیرنده نامعتبر است." });
      }
      const settings = await getAllSettingsAsObject();
      const provider: string = (
        settings.sms_provider || "meli_payamak"
      ).toLowerCase();
      if (provider !== "meli_payamak") {
        return res.status(400).json({
          success: false,
          message: "ارسال بررسی در حال حاضر فقط برای «ملی پیامک» فعال است.",
        });
      }
      const username = settings.meli_payamak_username;
      const password = settings.meli_payamak_password;
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "نام کاربری/رمز عبور ملی پیامک در تنظیمات وارد نشده است.",
        });
      }
      const correlationId = makeCorrId();
      const smsResult = await sendMeliPayamakPatternSms(
        recipient,
        bid,
        tokenArr,
        username,
        password,
      );
      const d: any = (smsResult as any)?.details || {};
      await insertSmsLog({
        correlationId,
        reqUser: req.user,
        provider,
        eventType: "TEST_PATTERN",
        entityType: "settings",
        entityId: undefined,
        recipient,
        patternId: String(bid),
        tokens: tokenArr,
        success: !!smsResult?.success,
        request: {
          provider,
          endpoint:
            d.endpoint || "https://api.payamak-panel.com/post/send.asmx",
          method: "SendByBaseNumber2",
          bodyId: String(bid),
          to: recipient,
          tokensCount: tokenArr.length,
        },
        httpStatus: typeof d.httpStatus === "number" ? d.httpStatus : undefined,
        rawResponseText: d.rawResponseText || undefined,
        durationMs: typeof d.durationMs === "number" ? d.durationMs : undefined,
        response: smsResult,
        error: smsResult?.success ? undefined : smsResult?.message,
      });
      if (smsResult?.success) {
        return res.json({
          success: true,
          message: "پیامک بررسی ارسال شد.",
          data: smsResult,
        });
      }
      // خطا در عملیاتهای برگشتی از سرویس پیامک (مثل BodyId نامعتبر، خطا در عملیاتی اعتبارسنجی، ...) خطا در عملیاتی سرور ما نیست.
      // برای جلوگیری از نمایش «500» در مرورگر، همیشه 200 برگردانیم و success=false را اعلام کنیم.
      return res.json({
        success: false,
        message: smsResult?.message || "خطا در ارسال پیامک بررسی",
        data: smsResult,
      });
    } catch (e) {
      next(e);
    }
  },
);
// بررسی سلامت پیکربندی سرویس پیامک فعال.
// این endpoint فقط تنظیمات ذخیره‌شده را ارزیابی می‌کند و درخواست خارجی ارسال نمی‌کند.
app.get(
  "/api/sms/health-check",
  authorizeRole(["Admin", "Manager"]),
  async (_req, res, next) => {
    try {
      const settings = await getAllSettingsAsObject();
      const provider = String(settings.sms_provider || "meli_payamak").toLowerCase();
      const providerDefinitions: Record<string, {
        title: string;
        credentialKeys: Array<{ key: string; label: string; aliases?: string[] }>;
        items: Array<{ key: string; label: string; category: string }>;
        supportsLivePatternTest: boolean;
      }> = {
        meli_payamak: {
          title: "ملی‌پیامک",
          credentialKeys: [
            { key: "meli_payamak_username", label: "نام کاربری" },
            { key: "meli_payamak_password", label: "رمز عبور" },
          ],
          supportsLivePatternTest: true,
          items: [
            { key: "meli_payamak_installment_settlement_pattern_id", label: "تسویه اقساط", category: "اقساط" },
            { key: "meli_payamak_installment_overdue_pattern_id", label: "اطلاع‌رسانی دیرکرد اقساط", category: "اقساط" },
            { key: "meli_payamak_installment_sale_created_pattern_id", label: "ثبت فروش اقساطی", category: "اقساط" },
            { key: "meli_payamak_installment_due_notice_pattern_id", label: "سررسید قسط", category: "اقساط" },
            { key: "meli_payamak_payment_confirmation_pattern_id", label: "تأیید دریافت قسط", category: "اقساط" },
            { key: "meli_payamak_repair_received_pattern_id", label: "تأیید پذیرش گوشی تعمیری", category: "تعمیرات" },
            { key: "meli_payamak_repair_cost_notice_pattern_id", label: "اعلام هزینه", category: "تعمیرات" },
            { key: "meli_payamak_repair_ready_pattern_id", label: "گوشی تعمیری آماده تحویل", category: "تعمیرات" },
            { key: "meli_payamak_repair_delivered_pattern_id", label: "تحویل گوشی تعمیری", category: "تعمیرات" },
            { key: "meli_payamak_repair_status_pattern_id", label: "وضعیت تعمیرات", category: "تعمیرات" },
            { key: "meli_payamak_account_balance_pattern_id", label: "بدهی/طلب", category: "حساب" },
            { key: "meli_payamak_check_failed_pattern_id", label: "چک برگشتی", category: "چک‌ها" },
            { key: "meli_payamak_invoice_created_pattern_id", label: "ثبت فاکتور", category: "فاکتورها" },
            { key: "meli_payamak_invoice_payment_received_pattern_id", label: "پرداخت فاکتور", category: "فاکتورها" },
          ],
        },
        kavenegar: {
          title: "کاوه‌نگار",
          credentialKeys: [{ key: "kavenegar_api_key", label: "کلید API" }],
          supportsLivePatternTest: false,
          items: [
            { key: "kavenegar_installment_due_7_template", label: "قسط — ۷ روز قبل", category: "اقساط" },
            { key: "kavenegar_installment_due_3_template", label: "قسط — ۳ روز قبل", category: "اقساط" },
            { key: "kavenegar_installment_due_today_template", label: "قسط — روز سررسید", category: "اقساط" },
            { key: "kavenegar_installment_template", label: "یادآوری عمومی قسط", category: "اقساط" },
            { key: "kavenegar_installment_completed_template", label: "تسویه کامل اقساط", category: "اقساط" },
            { key: "kavenegar_check_due_7_template", label: "چک — ۷ روز قبل", category: "چک‌ها" },
            { key: "kavenegar_check_due_3_template", label: "چک — ۳ روز قبل", category: "چک‌ها" },
            { key: "kavenegar_check_due_today_template", label: "چک — روز سررسید", category: "چک‌ها" },
            { key: "kavenegar_repair_received_template", label: "پذیرش تعمیر", category: "تعمیرات" },
            { key: "kavenegar_repair_cost_estimated_template", label: "برآورد هزینه تعمیر", category: "تعمیرات" },
            { key: "kavenegar_repair_ready_template", label: "آماده تحویل تعمیر", category: "تعمیرات" },
          ],
        },
        sms_ir: {
          title: "SMS.ir",
          credentialKeys: [{ key: "sms_ir_api_key", label: "کلید API" }],
          supportsLivePatternTest: false,
          items: [
            { key: "sms_ir_installment_due_7_template_id", label: "قسط — ۷ روز قبل", category: "اقساط" },
            { key: "sms_ir_installment_due_3_template_id", label: "قسط — ۳ روز قبل", category: "اقساط" },
            { key: "sms_ir_installment_due_today_template_id", label: "قسط — روز سررسید", category: "اقساط" },
            { key: "sms_ir_installment_template_id", label: "یادآوری عمومی قسط", category: "اقساط" },
            { key: "sms_ir_installment_completed_template_id", label: "تسویه کامل اقساط", category: "اقساط" },
            { key: "sms_ir_check_due_7_template_id", label: "چک — ۷ روز قبل", category: "چک‌ها" },
            { key: "sms_ir_check_due_3_template_id", label: "چک — ۳ روز قبل", category: "چک‌ها" },
            { key: "sms_ir_check_due_today_template_id", label: "چک — روز سررسید", category: "چک‌ها" },
            { key: "sms_ir_repair_received_template_id", label: "پذیرش تعمیر", category: "تعمیرات" },
            { key: "sms_ir_repair_cost_estimated_template_id", label: "برآورد هزینه تعمیر", category: "تعمیرات" },
            { key: "sms_ir_repair_ready_template_id", label: "آماده تحویل تعمیر", category: "تعمیرات" },
          ],
        },
        ippanel: {
          title: "IPPanel",
          credentialKeys: [
            { key: "ippanel_token", label: "توکن", aliases: ["ippanel_api_key"] },
            { key: "ippanel_from_number", label: "شماره فرستنده", aliases: ["ippanel_from", "ippanel_sender"] },
          ],
          supportsLivePatternTest: false,
          items: [
            { key: "ippanel_installment_due_7_pattern_code", label: "قسط — ۷ روز قبل", category: "اقساط" },
            { key: "ippanel_installment_due_3_pattern_code", label: "قسط — ۳ روز قبل", category: "اقساط" },
            { key: "ippanel_installment_due_today_pattern_code", label: "قسط — روز سررسید", category: "اقساط" },
            { key: "ippanel_installment_pattern_code", label: "یادآوری عمومی قسط", category: "اقساط" },
            { key: "ippanel_installment_completed_pattern_code", label: "تسویه کامل اقساط", category: "اقساط" },
            { key: "ippanel_check_due_7_pattern_code", label: "چک — ۷ روز قبل", category: "چک‌ها" },
            { key: "ippanel_check_due_3_pattern_code", label: "چک — ۳ روز قبل", category: "چک‌ها" },
            { key: "ippanel_check_due_today_pattern_code", label: "چک — روز سررسید", category: "چک‌ها" },
            { key: "ippanel_repair_received_pattern_code", label: "پذیرش تعمیر", category: "تعمیرات" },
            { key: "ippanel_repair_cost_estimated_pattern_code", label: "برآورد هزینه تعمیر", category: "تعمیرات" },
            { key: "ippanel_repair_ready_pattern_code", label: "آماده تحویل تعمیر", category: "تعمیرات" },
          ],
        },
      };
      const definition = providerDefinitions[provider] || providerDefinitions.meli_payamak;
      const getSetting = (key: string, aliases: string[] = []) => {
        for (const candidate of [key, ...aliases]) {
          const value = String(settings[candidate] || "").trim();
          if (value) return value;
        }
        return "";
      };
      const credentialItems = definition.credentialKeys.map((item) => ({
        key: item.key,
        label: item.label,
        configured: Boolean(getSetting(item.key, item.aliases)),
      }));
      const items = definition.items.map((item) => {
        const raw = getSetting(item.key);
        const numeric = /(?:_id|pattern_id)$/.test(item.key);
        const configured = numeric ? Number.isFinite(Number(raw)) && Number(raw) > 0 : Boolean(raw);
        return {
          ...item,
          configured,
          identifier: configured ? raw : null,
          bodyId: numeric && configured ? Number(raw) : null,
        };
      });
      res.setHeader("Cache-Control", "no-store");
      return res.json({
        success: true,
        provider,
        providerTitle: definition.title,
        credsOk: credentialItems.every((item) => item.configured),
        credentialItems,
        supportsLivePatternTest: definition.supportsLivePatternTest,
        items,
        checkedAt: new Date().toISOString(),
      });
    } catch (e) {
      next(e);
    }
  },
);
// بررسی گروهی چند پترن انتخابی (Bulk Check)
app.post(
  "/api/sms/bulk-check",
  authorizeRole(["Admin", "Manager"]),
  async (req, res, next) => {
    try {
      const settings = await getAllSettingsAsObject();
      const provider: string = (
        settings.sms_provider || "meli_payamak"
      ).toLowerCase();
      if (provider !== "meli_payamak") {
        return res.status(400).json({
          success: false,
          message: "بررسی گروهی فعلاً فقط برای «ملی پیامک» فعال است.",
        });
      }
      const username = settings.meli_payamak_username;
      const password = settings.meli_payamak_password;
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "نام کاربری/رمز عبور ملی پیامک در تنظیمات وارد نشده است.",
        });
      }
      const { to, checks } = req.body || {};
      const recipient = String(to || "").trim();
      if (!recipient || recipient.length < 10) {
        return res
          .status(400)
          .json({ success: false, message: "شماره گیرنده نامعتبر است." });
      }
      const arr: any[] = Array.isArray(checks) ? checks : [];
      if (!arr.length) {
        return res.status(400).json({
          success: false,
          message: "هیچ پیامکی برای بررسی انتخاب نشده است.",
        });
      }
      const results: any[] = [];
      for (const t of arr) {
        const bodyId = Number(t?.bodyId);
        const key = String(t?.key || "").trim();
        const label = String(t?.label || key || "پیامک");
        const tokenArr: string[] = Array.isArray(t?.tokens)
          ? t.tokens.map((x: any) => String(x ?? ""))
          : [];
        if (!bodyId || isNaN(bodyId) || bodyId <= 0) {
          results.push({
            key,
            label,
            bodyId,
            success: false,
            message: "BodyId نامعتبر است.",
          });
          continue;
        }
        const smsResult = await sendMeliPayamakPatternSms(
          recipient,
          bodyId,
          tokenArr,
          username,
          password,
        );
        await insertSmsLog({
          reqUser: req.user,
          provider,
          eventType: "TEST_BULK",
          entityType: "settings",
          recipient,
          patternId: String(bodyId),
          tokens: tokenArr,
          success: !!smsResult?.success,
          response: smsResult,
          error: smsResult?.success ? undefined : smsResult?.message,
        });
        results.push({
          key,
          label,
          bodyId,
          success: !!smsResult?.success,
          message: smsResult?.success
            ? "ارسال شد"
            : smsResult?.message || "عملیات ناعملیات با موفقیت انجام شد بود",
          data: smsResult,
        });
      }
      return res.json({ success: true, provider, to: recipient, results });
    } catch (e) {
      next(e);
    }
  },
);
};
