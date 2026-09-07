import crypto from "crypto";

export const TG_OTP_TTL_MIN_DEFAULT = 10;
export const TG_OTP_MAX_ATTEMPTS = 5;

type SettingsProvider = () => Promise<Record<string, any>>;
type SmsSender = (payload: any) => Promise<any>;

export function createTelegramOtpHelpers(deps: {
  getAllSettingsAsObject: SettingsProvider;
  trySendSmsNow: SmsSender;
}) {
  const getOtpTtlMinutes = async () => {
    try {
      const s = await deps.getAllSettingsAsObject();
      const v = Number((s as any).sms_otp_exp_minutes ?? TG_OTP_TTL_MIN_DEFAULT);
      if (Number.isFinite(v) && v >= 1 && v <= 60) return Math.floor(v);
    } catch {}
    return TG_OTP_TTL_MIN_DEFAULT;
  };

  const isTelegramLinkOtpEnabled = async () => {
    try {
      const s = await deps.getAllSettingsAsObject();
      return String((s as any).telegram_link_otp_enabled ?? "1").trim() !== "0";
    } catch {}
    return true;
  };

  const hashOtp = (code: string) => {
    const salt = String(process.env.TG_OTP_SALT || "korush-tg-otp");
    return crypto.createHash("sha256").update(`${salt}:${code}`).digest("hex");
  };

  const generateOtp = () => {
    const n = Math.floor(100000 + Math.random() * 900000);
    return String(n);
  };

  const sendOtpSms = async (phone: string, code: string) => {
    const settings = await deps.getAllSettingsAsObject();
    const provider = String(
      (settings as any).sms_provider || "meli_payamak",
    ).toLowerCase();

    if (provider === "meli_payamak") {
      const bodyId = Number((settings as any).sms_otp_meli_body_id || 0);
      if (!bodyId)
        return { success: false, message: "BodyId پیامک OTP تنظیم نشده است." };
      return await deps.trySendSmsNow({
        provider: "meli_payamak",
        recipient: phone,
        meliBodyId: bodyId,
        tokens: [code],
      });
    }

    if (provider === "kavenegar") {
      const template = String(
        (settings as any).sms_otp_kavenegar_template || "",
      ).trim();
      if (!template)
        return { success: false, message: "قالب OTP کاوه‌نگار تنظیم نشده است." };
      return await deps.trySendSmsNow({
        provider: "kavenegar",
        recipient: phone,
        kavenegarTemplate: template,
        tokens: [code],
      });
    }

    if (provider === "sms_ir") {
      const templateId = Number(
        (settings as any).sms_otp_sms_ir_template_id || 0,
      );
      if (!templateId)
        return {
          success: false,
          message: "TemplateId OTP SMS.ir تنظیم نشده است.",
        };
      return await deps.trySendSmsNow({
        provider: "sms_ir",
        recipient: phone,
        smsIrTemplateId: templateId,
        tokens: [code],
      });
    }

    if (provider === "ippanel") {
      const patternCode = String(
        (settings as any).sms_otp_ippanel_pattern_code || "",
      ).trim();
      if (!patternCode)
        return {
          success: false,
          message: "PatternCode OTP آی‌پنل تنظیم نشده است.",
        };
      return await deps.trySendSmsNow({
        provider: "ippanel",
        recipient: phone,
        ippanelPatternCode: patternCode,
        tokens: [code],
      });
    }

    return { success: false, message: "سرویس پیامک ناشناخته است." };
  };

  return {
    getOtpTtlMinutes,
    isTelegramLinkOtpEnabled,
    hashOtp,
    generateOtp,
    sendOtpSms,
  };
}
