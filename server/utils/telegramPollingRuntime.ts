type SettingsObject = Record<string, any>;

const isTelegramTransportDisabled = (settings: SettingsObject) =>
  String((settings as any).telegram_transport_mode || "direct").trim().toLowerCase() === "disabled";

type TimerHandle = ReturnType<typeof setTimeout>;

type TelegramPollingRuntimeDeps = {
  getAllSettingsAsObject: () => Promise<SettingsObject>;
  setTelegramProxy: (proxy?: string | null) => void;
  callTelegramBotApi: (
    botToken: string,
    method: string,
    payload?: Record<string, any>,
    transportOptions?: { timeoutMs?: number },
  ) => Promise<any>;
  resetTelegramCommandMenu: (botToken: string) => Promise<any>;
  updateSetting: (key: string, value: string) => Promise<any>;
  telegramLog: (message: string, meta?: Record<string, any>) => void;
  getTelegramProxyAgentFromSettings: (settings: SettingsObject) => any;
  handleTelegramUpdate: (update: any) => Promise<void>;
  shouldLogExternalErrors?: boolean;
  setTimeoutFn?: (fn: () => void, ms: number) => TimerHandle;
  clearTimeoutFn?: (handle: TimerHandle) => void;
  retryDelaysMs?: readonly number[];
};

const DEFAULT_RETRY_DELAYS_MS = [1_200, 2_500, 5_000, 10_000, 15_000] as const;
const LONG_POLL_HTTP_TIMEOUT_MS = 40_000;

export const telegramPollingRetryDelayMs = (
  consecutiveFailures: number,
  delays: readonly number[] = DEFAULT_RETRY_DELAYS_MS,
) => {
  const safeDelays = delays.length ? delays : DEFAULT_RETRY_DELAYS_MS;
  const index = Math.min(Math.max(0, Math.floor(consecutiveFailures) - 1), safeDelays.length - 1);
  return Math.max(0, Number(safeDelays[index]) || 0);
};

export const isTelegramWebhookUrlPublic = (urlRaw: string) => {
  const url = String(urlRaw || "")
    .trim()
    .toLowerCase();
  if (!url) return false;
  if (!url.startsWith("https://")) return false;
  return !(
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("0.0.0.0") ||
    url.includes("192.168.") ||
    url.includes("10.0.") ||
    url.includes("172.16.") ||
    url.includes("172.17.") ||
    url.includes("172.18.") ||
    url.includes("172.19.") ||
    url.includes("172.20.") ||
    url.includes("172.21.") ||
    url.includes("172.22.") ||
    url.includes("172.23.") ||
    url.includes("172.24.") ||
    url.includes("172.25.") ||
    url.includes("172.26.") ||
    url.includes("172.27.") ||
    url.includes("172.28.") ||
    url.includes("172.29.") ||
    url.includes("172.30.") ||
    url.includes("172.31.")
  );
};

export const createTelegramPollingRuntime = (deps: TelegramPollingRuntimeDeps) => {
  let telegramPollingStarted = false;
  let telegramPollingOffset: number | null = null;
  let pollingGeneration = 0;
  let pollingTimer: TimerHandle | null = null;
  let pollingInFlight = false;
  let consecutiveFailures = 0;
  let lastSuccessAt: string | null = null;
  let lastErrorAt: string | null = null;
  let lastErrorMessage = "";
  let nextRetryDelayMs = 0;
  const shouldLogExternalErrors = Boolean(deps.shouldLogExternalErrors);
  const setTimeoutFn = deps.setTimeoutFn || ((fn, ms) => setTimeout(fn, ms));
  const clearTimeoutFn = deps.clearTimeoutFn || ((handle) => clearTimeout(handle));
  const retryDelaysMs = deps.retryDelaysMs?.length ? deps.retryDelaysMs : DEFAULT_RETRY_DELAYS_MS;

  const clearScheduledLoop = () => {
    if (!pollingTimer) return;
    clearTimeoutFn(pollingTimer);
    pollingTimer = null;
  };

  const invalidatePollingGeneration = () => {
    pollingGeneration += 1;
    clearScheduledLoop();
  };

  const shouldUseTelegramPolling = async () => {
    const settings = await deps.getAllSettingsAsObject();
    const mode = String((settings as any).telegram_update_mode || "")
      .trim()
      .toLowerCase();
    const enabled = String(
      (settings as any).telegram_polling_enabled ?? "",
    ).trim();
    return (
      mode === "polling" ||
      enabled === "1" ||
      String(process.env.TELEGRAM_MODE || "").toLowerCase() === "polling" ||
      String(process.env.TELEGRAM_POLLING || "").trim() === "1"
    );
  };

  const autoConfigureTelegramUpdateMode = async () => {
    const settings = await deps
      .getAllSettingsAsObject()
      .catch(() => ({}) as any);
    if (isTelegramTransportDisabled(settings)) return { changed: false, mode: "disabled", reason: "transport-disabled" };
    deps.setTelegramProxy((settings as any).telegram_proxy);
    const botToken = String((settings as any).telegram_bot_token || "").trim();
    if (!botToken)
      return { changed: false, mode: "disabled", reason: "missing-token" };

    const explicitMode = String((settings as any).telegram_update_mode || "")
      .trim()
      .toLowerCase();
    const explicitPolling =
      String((settings as any).telegram_polling_enabled || "").trim() === "1";
    if (explicitMode === "webhook")
      return { changed: false, mode: "webhook", reason: "explicit-webhook" };
    if (explicitMode === "polling" || explicitPolling)
      return { changed: false, mode: "polling", reason: "explicit-polling" };

    const webhookInfo: any = await deps
      .callTelegramBotApi(botToken, "getWebhookInfo", {})
      .catch((e: any) => ({
        success: false,
        message: e?.message || String(e || "webhook-check-failed"),
      }));
    const webhookUrl = String(webhookInfo?.data?.result?.url || webhookInfo?.result?.url || "").trim();
    if (isTelegramWebhookUrlPublic(webhookUrl)) {
      return {
        changed: false,
        mode: "webhook",
        reason: "public-webhook",
        webhookUrl,
      };
    }

    await deps
      .callTelegramBotApi(botToken, "deleteWebhook", {
        drop_pending_updates: false,
      })
      .catch(() => null);
    await deps.updateSetting("telegram_update_mode", "polling").catch(() => null);
    await deps.updateSetting("telegram_polling_enabled", "1").catch(() => null);
    await deps.resetTelegramCommandMenu(botToken).catch(() => null);
    deps.telegramLog("auto update mode: polling enabled", {
      webhookUrl: webhookUrl || null,
    });
    return {
      changed: true,
      mode: "polling",
      reason: webhookUrl ? "non-public-webhook" : "empty-webhook",
      webhookUrl,
    };
  };

  const startTelegramPolling = async () => {
    if (telegramPollingStarted) return;
    const settings = await deps.getAllSettingsAsObject();
    if (isTelegramTransportDisabled(settings)) return;
    const botToken = String((settings as any).telegram_bot_token || "").trim();
    if (!botToken) return;
    const usePolling = await shouldUseTelegramPolling();
    if (!usePolling) return;

    telegramPollingStarted = true;
    consecutiveFailures = 0;
    nextRetryDelayMs = 0;
    lastErrorMessage = "";
    const generation = ++pollingGeneration;
    clearScheduledLoop();
    try {
      if (shouldLogExternalErrors) console.log("[Telegram] polling started");
    } catch {}

    const savedOffset = Number((settings as any).telegram_polling_offset || 0);
    if (!Number.isNaN(savedOffset) && savedOffset > 0)
      telegramPollingOffset = savedOffset;

    const schedule = (delayMs: number) => {
      if (!telegramPollingStarted || generation !== pollingGeneration) return;
      clearScheduledLoop();
      nextRetryDelayMs = Math.max(0, delayMs);
      pollingTimer = setTimeoutFn(() => {
        pollingTimer = null;
        void loop();
      }, nextRetryDelayMs);
    };

    const markFailure = (message: string) => {
      consecutiveFailures += 1;
      lastErrorAt = new Date().toISOString();
      lastErrorMessage = String(message || "Telegram polling failed");
      nextRetryDelayMs = telegramPollingRetryDelayMs(consecutiveFailures, retryDelaysMs);
      deps.telegramLog("polling reconnect scheduled", {
        consecutiveFailures,
        retryDelayMs: nextRetryDelayMs,
        message: lastErrorMessage,
      });
    };

    const markSuccess = () => {
      consecutiveFailures = 0;
      nextRetryDelayMs = 1_200;
      lastSuccessAt = new Date().toISOString();
      lastErrorMessage = "";
    };

    const loop = async () => {
      if (!telegramPollingStarted || generation !== pollingGeneration) return;
      // A reset/start may happen while the previous long poll is still resolving.
      // Never create two concurrent getUpdates calls; the newer generation waits
      // until the old in-flight request has fully completed.
      if (pollingInFlight) {
        schedule(250);
        return;
      }

      pollingInFlight = true;
      let cycleSucceeded = false;
      try {
        const s = await deps.getAllSettingsAsObject();
        if (!telegramPollingStarted || generation !== pollingGeneration) return;
        if (isTelegramTransportDisabled(s)) {
          telegramPollingStarted = false;
          return;
        }
        deps.setTelegramProxy((s as any).telegram_proxy);
        const token = String((s as any).telegram_bot_token || "").trim();
        if (!token) {
          telegramPollingStarted = false;
          return;
        }
        const response: any = await deps.callTelegramBotApi(token, "getUpdates", {
          timeout: 25,
          ...(telegramPollingOffset ? { offset: telegramPollingOffset } : {}),
        }, { timeoutMs: LONG_POLL_HTTP_TIMEOUT_MS });
        if (!telegramPollingStarted || generation !== pollingGeneration) return;

        const j: any = response?.data || {};
        if (!response?.success || j?.ok === false) {
          const desc = String(response?.message || j?.description || j?.message || "Telegram getUpdates rejected").trim();
          deps.telegramLog("polling getUpdates rejected", { description: desc });
          if (desc.includes("409") || desc.toLowerCase().includes("webhook")) {
            await deps
              .callTelegramBotApi(token, "deleteWebhook", {
                drop_pending_updates: false,
              })
              .catch(() => null);
            await deps.updateSetting("telegram_update_mode", "polling").catch(() => null);
            await deps.updateSetting("telegram_polling_enabled", "1").catch(() => null);
          }
          markFailure(desc);
          return;
        }

        const updates: any[] = Array.isArray(j?.result) ? j.result : [];
        for (const upd of updates) {
          const id = Number(upd?.update_id);
          if (!Number.isNaN(id)) telegramPollingOffset = id + 1;
          await deps.handleTelegramUpdate(upd);
        }
        if (telegramPollingOffset && updates.length) {
          try {
            await deps.updateSetting(
              "telegram_polling_offset",
              String(telegramPollingOffset),
            );
          } catch {}
        }
        cycleSucceeded = true;
        markSuccess();
      } catch (e: any) {
        const message = String(e?.message || e || "Telegram polling loop error");
        markFailure(message);
        try {
          if (shouldLogExternalErrors)
            console.error("[Telegram] polling loop error:", message);
        } catch {}
      } finally {
        pollingInFlight = false;
        if (telegramPollingStarted && generation === pollingGeneration) {
          schedule(cycleSucceeded ? 1_200 : nextRetryDelayMs || telegramPollingRetryDelayMs(consecutiveFailures, retryDelaysMs));
        }
      }
    };

    schedule(0);
  };

  return {
    autoConfigureTelegramUpdateMode,
    startTelegramPolling,
    getPollingState: () => ({
      started: telegramPollingStarted,
      offset: telegramPollingOffset,
      inFlight: pollingInFlight,
      generation: pollingGeneration,
      consecutiveFailures,
      nextRetryDelayMs,
      lastSuccessAt,
      lastErrorAt,
      lastErrorMessage,
    }),
    resetPollingStarted: () => {
      telegramPollingStarted = false;
      invalidatePollingGeneration();
      consecutiveFailures = 0;
      nextRetryDelayMs = 0;
      // Do not force pollingInFlight=false here. An old long-poll may still be
      // resolving; the next generation waits for it and therefore cannot create
      // a second concurrent getUpdates request / Telegram 409 conflict.
    },
  };
};
