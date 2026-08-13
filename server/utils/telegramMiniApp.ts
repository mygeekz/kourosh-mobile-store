import {
  isMiniAppStartParamShapeValid,
  parseMiniAppStartParam,
} from "../../miniapp/startParam";
import {
  auditTelegramMiniAppPublicConfiguration,
  normalizeTelegramBotUsername,
  resolveTelegramMiniAppUrl,
  resolveTelegramPublicAccessMode,
  validateTelegramMiniAppPublicUrl,
  type TelegramPublicAccessMode,
} from "../connectivity/telegramPublicAccess";

type Settings = Record<string, unknown>;

export {
  auditTelegramMiniAppPublicConfiguration,
  normalizeTelegramBotUsername,
  resolveTelegramMiniAppUrl,
  resolveTelegramPublicAccessMode,
  validateTelegramMiniAppPublicUrl,
};
export type { TelegramPublicAccessMode };


export const buildTelegramMiniAppWebAppUrl = (settings: Settings, startParam: unknown): string | null => {
  const raw = String(startParam ?? "");
  if (!isMiniAppStartParamShapeValid(raw) || !parseMiniAppStartParam(raw)) return null;
  const currentPublicUrl = resolveTelegramMiniAppUrl(settings);
  if (!currentPublicUrl) return null;
  try {
    const url = new URL(currentPublicUrl);
    url.searchParams.set("kourosh_start", raw);
    return url.toString();
  } catch {
    return null;
  }
};

// Legacy Main Mini App deep link. Telegram resolves this through the bot's Main Mini App
// configuration (BotFather), so rotating temporary tunnel workflows must not use it
// for bot-generated action buttons. Keep only for explicit compatibility callers.
export const buildTelegramMiniAppLaunchLink = (settings: Settings, startParam: unknown): string | null => {
  const username = normalizeTelegramBotUsername(settings.telegram_bot_username);
  const raw = String(startParam ?? "");
  if (!username || !isMiniAppStartParamShapeValid(raw) || !parseMiniAppStartParam(raw)) return null;
  if (!resolveTelegramMiniAppUrl(settings)) return null;
  return `https://t.me/${username}?startapp=${encodeURIComponent(raw)}`;
};

export const buildTelegramMiniAppLaunchButton = (
  settings: Settings,
  startParam: unknown,
  text = "باز کردن در پنل کوروش",
) => {
  const webAppUrl = buildTelegramMiniAppWebAppUrl(settings, startParam);
  return webAppUrl ? { text, web_app: { url: webAppUrl } } : null;
};

export const telegramMenuButtonPayload = (settings: Settings) => {
  const miniAppUrl = resolveTelegramMiniAppUrl(settings);
  return miniAppUrl
    ? {
        mode: "web_app" as const,
        payload: { menu_button: { type: "web_app", text: "پنل کوروش", web_app: { url: miniAppUrl } } },
      }
    : {
        mode: "default" as const,
        payload: { menu_button: { type: "default" } },
      };
};

export const createTelegramMenuButtonEnsurer = (
  callApi: (botToken: string, method: string, payload: Record<string, unknown>) => Promise<any>,
) => {
  let lastSuccessfulFingerprint = "";
  let pending: Promise<any> | null = null;
  const ensure = async (botToken: string, settings: Settings) => {
    const desired = telegramMenuButtonPayload(settings);
    const fingerprint = `${botToken.slice(-8)}:${JSON.stringify(desired.payload)}`;
    if (fingerprint === lastSuccessfulFingerprint) {
      return { success: true, skipped: true, mode: desired.mode };
    }
    if (pending) return pending;
    pending = callApi(botToken, "setChatMenuButton", desired.payload)
      .then((result) => {
        if (result?.success) lastSuccessfulFingerprint = fingerprint;
        return { ...result, mode: desired.mode };
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };
  return {
    ensure,
    reset: () => {
      lastSuccessfulFingerprint = "";
      pending = null;
    },
  };
};
