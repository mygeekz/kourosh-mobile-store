import { resolveTelegramTransportMode } from "../telegram/TelegramTransport";
import { configureTelegramTransportRuntime } from "../telegram/telegramTransportRuntime";
import { callTelegramBotApi } from "../telegramService";
import { telegramMenuButtonPayload } from "../utils/telegramMiniApp";

export type TelegramMenuSyncResult = {
  state: "pending" | "synced" | "error";
  attempts: number;
  message?: string;
};

type TelegramMenuSyncDeps = {
  configureTransport: (settings: Record<string, unknown>) => unknown;
  callApi: (botToken: string, method: string, payload: Record<string, unknown>) => Promise<{ success?: boolean; message?: string; rawText?: string; errorCode?: string }>;
  sleep: (ms: number) => Promise<void>;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const transientFailure = /(timeout|timed out|socket hang up|econnreset|etimedout|429|rate limit|temporar|unavailable|network)/i;
const delays = [0, 1_000, 2_000];

export const createTelegramMenuSyncService = (overrides: Partial<TelegramMenuSyncDeps> = {}) => {
  const deps: TelegramMenuSyncDeps = {
    configureTransport: configureTelegramTransportRuntime,
    callApi: callTelegramBotApi,
    sleep,
    ...overrides,
  };

  return async (settings: Record<string, unknown>): Promise<TelegramMenuSyncResult> => {
    const transportMode = resolveTelegramTransportMode(settings);
    if (transportMode === "disabled") return { state: "pending", attempts: 0, message: "Telegram transport is disabled." };
    const botToken = String(settings.telegram_bot_token || "").trim();
    if (!botToken) return { state: "pending", attempts: 0, message: "Telegram Bot Token is not configured." };

    deps.configureTransport(settings);
    const desired = telegramMenuButtonPayload(settings);
    let lastMessage = "Telegram Menu sync failed.";
    let attempts = 0;
    for (let attempt = 0; attempt < delays.length; attempt += 1) {
      attempts = attempt + 1;
      if (delays[attempt] > 0) await deps.sleep(delays[attempt]);
      try {
        const result = await deps.callApi(botToken, "setChatMenuButton", desired.payload);
        if (result?.success) return { state: "synced", attempts: attempt + 1 };
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
