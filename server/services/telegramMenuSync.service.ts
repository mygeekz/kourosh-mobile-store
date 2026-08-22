import { resolveTelegramTransportMode } from "../telegram/TelegramTransport";
import { configureTelegramTransportRuntime } from "../telegram/telegramTransportRuntime";
import { callTelegramBotApi } from "../telegramService";
import { telegramMenuButtonPayload } from "../utils/telegramMiniApp";

export type TelegramMenuSyncResult = {
  state: "pending" | "synced" | "error";
  attempts: number;
  message?: string;
};

export type TelegramMenuSyncScope = {
  chatId?: string | number | null;
};

type TelegramApiResult = {
  success?: boolean;
  message?: string;
  rawText?: string;
  errorCode?: string;
  data?: unknown;
};

type TelegramMenuSyncDeps = {
  configureTransport: (settings: Record<string, unknown>) => unknown;
  callApi: (botToken: string, method: string, payload: Record<string, unknown>) => Promise<TelegramApiResult>;
  sleep: (ms: number) => Promise<void>;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const transientFailure = /(timeout|timed out|socket hang up|econnreset|etimedout|429|rate limit|temporar|unavailable|network)/i;
const delays = [0, 1_000, 2_000];

const verifiedMenuButtonUrl = (result: TelegramApiResult): string | null => {
  const data = result?.data;
  if (!data || typeof data !== "object") return null;
  const root = data as { result?: unknown };
  const menu = root.result;
  if (!menu || typeof menu !== "object") return null;
  const typed = menu as { type?: unknown; web_app?: { url?: unknown } };
  if (String(typed.type || "") !== "web_app") return null;
  const rawUrl = String(typed.web_app?.url || "").trim();
  if (!rawUrl) return null;
  try { return new URL(rawUrl).toString(); } catch { return null; }
};

export const createTelegramMenuSyncService = (overrides: Partial<TelegramMenuSyncDeps> = {}) => {
  const deps: TelegramMenuSyncDeps = {
    configureTransport: configureTelegramTransportRuntime,
    callApi: callTelegramBotApi,
    sleep,
    ...overrides,
  };

  return async (settings: Record<string, unknown>, scope: TelegramMenuSyncScope = {}): Promise<TelegramMenuSyncResult> => {
    const transportMode = resolveTelegramTransportMode(settings);
    if (transportMode === "disabled") return { state: "pending", attempts: 0, message: "Telegram transport is disabled." };
    const botToken = String(settings.telegram_bot_token || "").trim();
    if (!botToken) return { state: "pending", attempts: 0, message: "Telegram Bot Token is not configured." };

    const desired = telegramMenuButtonPayload(settings);
    if (desired.mode === "unavailable" || !desired.payload) {
      return {
        state: "pending",
        attempts: 0,
        message: "Mini App public URL is not ready; the existing Telegram Menu Button was preserved.",
      };
    }
    deps.configureTransport(settings);
    const rawChatId = scope.chatId == null ? "" : String(scope.chatId).trim();
    const scopedChatId = /^-?\d+$/.test(rawChatId) ? rawChatId : "";
    const setPayload = scopedChatId ? { ...desired.payload, chat_id: scopedChatId } : desired.payload;
    const getPayload = scopedChatId ? { chat_id: scopedChatId } : {};
    let lastMessage = "Telegram Menu sync failed.";
    let attempts = 0;
    for (let attempt = 0; attempt < delays.length; attempt += 1) {
      attempts = attempt + 1;
      if (delays[attempt] > 0) await deps.sleep(delays[attempt]);
      try {
        const result = await deps.callApi(botToken, "setChatMenuButton", setPayload);
        if (result?.success) {
          const verification = await deps.callApi(botToken, "getChatMenuButton", getPayload);
          const expectedUrl = String((desired.payload.menu_button as { web_app?: { url?: unknown } })?.web_app?.url || "").trim();
          const verifiedUrl = verification?.success ? verifiedMenuButtonUrl(verification) : null;
          let canonicalExpected: string | null = null;
          try { canonicalExpected = expectedUrl ? new URL(expectedUrl).toString() : null; } catch { canonicalExpected = null; }
          if (canonicalExpected && verifiedUrl === canonicalExpected) return { state: "synced", attempts: attempt + 1 };
          lastMessage = String(verification?.message || verification?.rawText || verification?.errorCode || "Telegram Menu read-back did not match the requested Mini App URL.");
          if (!verification?.success) {
            if (!transientFailure.test(lastMessage)) break;
          }
          // Telegram accepted the write but did not expose the requested value yet.
          // Retry through the same explicitly configured transport; never fall back.
          continue;
        }
        lastMessage = String(result?.message || result?.rawText || result?.errorCode || lastMessage);
        if (!transientFailure.test(lastMessage)) break;
      } catch (error) {
        lastMessage = error instanceof Error ? error.message : String(error || lastMessage);
        if (!transientFailure.test(lastMessage)) break;
      }
    }
    return { state: "error", attempts, message: lastMessage };
  };
};

export const syncTelegramMenuButton = createTelegramMenuSyncService();
