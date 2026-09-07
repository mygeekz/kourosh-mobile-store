import fs from "fs";
import path from "path";
import { SocksProxyAgent } from "socks-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { getAllSettingsAsObject } from "../database";
import {
  sendTelegramMessage,
  sendTelegramPhoto,
  setTelegramProxy,
  callTelegramBotApi,
} from "../telegramService";
import { syncTelegramMenuButton } from "../services/telegramMenuSync.service";

export const buildContactKeyboard = () => ({
  keyboard: [
    [{ text: "📲 اتصال امن با شماره موبایل", request_contact: true }],
    [{ text: "ℹ️ راهنمای ورود" }, { text: "💬 ارتباط با فروشگاه" }],
    [{ text: "🌐 ورود به سایت فروشگاه" }, { text: "🔄 شروع دوباره" }],
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
  is_persistent: true,
  input_field_placeholder: "شماره‌تان را برای فعال‌سازی امن ارسال کنید…",
});

export const getTelegramProxyAgentFromSettings = (settings: any) => {
  // v159: app proxy is explicit. Direct mode never inherits TG_PROXY/HTTPS_PROXY/HTTP_PROXY.
  const proxy = String((settings as any)?.telegram_proxy || "").trim();
  if (!proxy) return undefined as any;
  if (proxy.startsWith("socks")) return new SocksProxyAgent(proxy) as any;
  return new HttpsProxyAgent(proxy) as any;
};

export const sendBotMessage = async (chatId: string, text: string, extra?: any) => {
  const settings = await getAllSettingsAsObject();
  setTelegramProxy((settings as any).telegram_proxy);
  const botToken = String((settings as any).telegram_bot_token || "").trim();
  if (!botToken) return;
  // use shared telegram service (supports proxy + parse_mode + reply_markup)
  try {
    const replyMarkup = extra?.reply_markup || extra?.replyMarkup;
    const hasParseMode =
      extra &&
      (Object.prototype.hasOwnProperty.call(extra, "parse_mode") ||
        Object.prototype.hasOwnProperty.call(extra, "parseMode"));
    const parseMode = hasParseMode
      ? extra?.parse_mode ?? extra?.parseMode
      : "HTML";
    await sendTelegramMessage(botToken, chatId, text, {
      parseMode,
      replyMarkup,
      disableWebPreview: true,
    });
  } catch (e: any) {
    try {
      console.error("Telegram sendMessage failed:", e?.message || e);
    } catch {}
  }
};

const getTelegramRichHeaderPath = () =>
  path.join(process.cwd(), "assets", "telegram", "kourosh-rich-header.png");

export const sendTelegramRichHeader = async (
  chatId: string,
  title: string,
  subtitle: string,
  replyMarkup?: any,
) => {
  const settings = await getAllSettingsAsObject().catch(() => ({}) as any);
  setTelegramProxy((settings as any).telegram_proxy);
  const botToken = String((settings as any).telegram_bot_token || "").trim();
  if (!botToken) return false;
  const filePath = getTelegramRichHeaderPath();
  if (!fs.existsSync(filePath)) return false;
  const caption = [
    `<b>${String(title || "دستیار هوشمند کوروش")}</b>`,
    `<i>${String(subtitle || "گزارش اختصاصی شما آماده است.")}</i>`,
  ].join("\n");
  try {
    const result = await sendTelegramPhoto(
      botToken,
      chatId,
      filePath,
      caption,
      {
        parseMode: "HTML",
        replyMarkup,
        mimeType: "image/png",
      },
    );
    if (!result?.success) {
      console.warn(
        "[TelegramBot] rich media header failed:",
        result?.message || result?.rawText || result?.status || "unknown",
      );
      return false;
    }
    return true;
  } catch (e: any) {
    try {
      console.warn("[TelegramBot] rich media header failed:", e?.message || e);
    } catch {}
    return false;
  }
};

export const sendBotRichCard = async (
  chatId: string,
  text: string,
  extra: any,
  media?: { title?: string; subtitle?: string; enabled?: boolean },
) => {
  const replyMarkup = extra?.reply_markup || extra?.replyMarkup;
  const wantsMedia = media?.enabled !== false;
  let mediaSent = false;
  if (wantsMedia) {
    mediaSent = await sendTelegramRichHeader(
      chatId,
      media?.title || "دستیار هوشمند کوروش",
      media?.subtitle || "گزارش اختصاصی شما آماده است.",
      replyMarkup,
    );
  }
  await sendBotMessage(
    chatId,
    text,
    mediaSent
      ? { ...extra, reply_markup: undefined, replyMarkup: undefined }
      : extra,
  );
};

export const telegramLog = (...args: any[]) => {
  try {
    console.log("[TelegramBot]", ...args);
  } catch {}
};

export const resetTelegramMenuEnsureCacheForTests = () => {
  // v163 menu reconciliation no longer keeps an in-memory success fingerprint.
  // Telegram state is read back on each reconciliation instead.
};

export const ensureTelegramMenuButton = async (
  botToken: string,
  settings: Record<string, any>,
  chatId?: string | number | null,
) => {
  const effectiveSettings = String((settings as any).telegram_bot_token || "").trim()
    ? settings
    : { ...settings, telegram_bot_token: botToken };
  return syncTelegramMenuButton(effectiveSettings, { chatId });
};

export const resetTelegramCommandMenu = async (botToken: string) => {
  const settings = await getAllSettingsAsObject().catch(() => ({}) as any);
  const attempts: Array<Promise<any>> = [
    // Delete commands with no language code. This is the one Telegram usually
    // shows in the blue bottom Menu sheet.
    callTelegramBotApi(botToken, "deleteMyCommands", {
      scope: { type: "default" },
    }),
    // Also clear localized command sets that older builds may have registered.
    callTelegramBotApi(botToken, "deleteMyCommands", {
      scope: { type: "default" },
      language_code: "fa",
    }),
    callTelegramBotApi(botToken, "deleteMyCommands", {
      scope: { type: "default" },
      language_code: "en",
    }),
    // The ReplyKeyboard remains intact; only Telegram's compact Menu Button is
    // switched between the configured Mini App and the safe default fallback.
    ensureTelegramMenuButton(botToken, settings),
  ];
  const results = await Promise.allSettled(attempts);
  return results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : {
          success: false,
          message: String(
            (r as any).reason?.message || (r as any).reason || "failed",
          ),
        },
  );
};

export const ensureTelegramPersistentMenu = async (chatId?: string | number | null) => {
  const settings = await getAllSettingsAsObject().catch(() => ({}) as any);
  setTelegramProxy((settings as any).telegram_proxy);
  const botToken = String((settings as any).telegram_bot_token || "").trim();
  if (!botToken) return;
  try {
    await ensureTelegramMenuButton(botToken, settings, chatId);
  } catch (e: any) {
    try {
      console.error("Telegram persistent menu setup failed:", e?.message || e);
    } catch {}
  }
};
