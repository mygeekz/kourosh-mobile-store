type SettingsObject = Record<string, any>;


const isTelegramTransportDisabled = (settings: SettingsObject) =>
  String((settings as any).telegram_transport_mode || "direct").trim().toLowerCase() === "disabled";

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
  const shouldLogExternalErrors = Boolean(deps.shouldLogExternalErrors);

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

    // Local Kourosh runs usually have no public HTTPS webhook. In that case
    // Telegram will never deliver /start to the server, even though outbound
    // sendMessage tests work. Auto-switch to polling unless a real public webhook
    // is already configured.
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
    try {
      if (shouldLogExternalErrors) console.log("[Telegram] polling started");
    } catch {}
    // restore offset from settings if present
    const savedOffset = Number((settings as any).telegram_polling_offset || 0);
    if (!Number.isNaN(savedOffset) && savedOffset > 0)
      telegramPollingOffset = savedOffset;
    const loop = async () => {
      try {
        const s = await deps.getAllSettingsAsObject();
        if (isTelegramTransportDisabled(s)) { telegramPollingStarted = false; return; }
        deps.setTelegramProxy((s as any).telegram_proxy);
        const token = String((s as any).telegram_bot_token || "").trim();
        if (!token) {
          telegramPollingStarted = false;
          return;
        }
        const response: any = await deps.callTelegramBotApi(token, "getUpdates", {
          timeout: 25,
          ...(telegramPollingOffset ? { offset: telegramPollingOffset } : {}),
        }, { timeoutMs: 30_000 });
        const j: any = response?.data || {};
        if (!response?.success || j?.ok === false) {
          const desc = String(response?.message || j?.description || j?.message || "").trim();
          deps.telegramLog("polling getUpdates rejected", { description: desc });
          // Telegram returns 409 when a webhook is still active. This is the most
          // common reason /start does nothing in local mode while sendMessage tests
          // still work. Remove webhook and continue polling automatically.
          if (desc.includes("409") || desc.toLowerCase().includes("webhook")) {
            await deps
              .callTelegramBotApi(token, "deleteWebhook", {
                drop_pending_updates: false,
              })
              .catch(() => null);
            await deps.updateSetting("telegram_update_mode", "polling").catch(
              () => null,
            );
            await deps.updateSetting("telegram_polling_enabled", "1").catch(
              () => null,
            );
          }
        }
        const updates: any[] = Array.isArray(j?.result) ? j.result : [];
        for (const upd of updates) {
          const id = Number(upd?.update_id);
          if (!Number.isNaN(id)) telegramPollingOffset = id + 1;
          await deps.handleTelegramUpdate(upd);
        }
        // persist offset sometimes (best-effort)
        if (telegramPollingOffset && updates.length) {
          try {
            await deps.updateSetting(
              "telegram_polling_offset",
              String(telegramPollingOffset),
            );
          } catch {}
        }
      } catch (e: any) {
        try {
          if (shouldLogExternalErrors)
            console.error("[Telegram] polling loop error:", e?.message || e);
        } catch {}
      } finally {
        if (telegramPollingStarted) setTimeout(loop, 1200);
      }
    };
    loop();
  };

  return {
    autoConfigureTelegramUpdateMode,
    startTelegramPolling,
    getPollingState: () => ({
      started: telegramPollingStarted,
      offset: telegramPollingOffset,
    }),
    resetPollingStarted: () => {
      telegramPollingStarted = false;
    },
  };
};
