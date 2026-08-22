import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = process.cwd();
const pollingModule = await import(pathToFileURL(path.join(root, "server/utils/telegramPollingRuntime.ts")).href);
const phoneModule = await import(pathToFileURL(path.join(root, "server/utils/iranPhone.ts")).href);
const { createTelegramPollingRuntime, telegramPollingRetryDelayMs } = pollingModule;
const { normalizeIranPhone } = phoneModule;

const waitFor = async (predicate, timeoutMs = 1000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("waitFor timeout");
};

assert.equal(telegramPollingRetryDelayMs(1, [1, 2, 3]), 1);
assert.equal(telegramPollingRetryDelayMs(3, [1, 2, 3]), 3);
assert.equal(telegramPollingRetryDelayMs(20, [1, 2, 3]), 3);

// Transient timeout must self-recover without the admin "enable local polling" button.
{
  let runtime;
  let getUpdatesCalls = 0;
  let handled = 0;
  const settings = {
    telegram_transport_mode: "direct",
    telegram_update_mode: "polling",
    telegram_polling_enabled: "1",
    telegram_bot_token: "TEST_TOKEN",
  };
  runtime = createTelegramPollingRuntime({
    getAllSettingsAsObject: async () => ({ ...settings }),
    setTelegramProxy: () => undefined,
    callTelegramBotApi: async (_token, method) => {
      if (method !== "getUpdates") return { success: true, data: { ok: true, result: true } };
      getUpdatesCalls += 1;
      if (getUpdatesCalls === 1) return { success: false, message: "Telegram request timeout after 40000ms" };
      return { success: true, data: { ok: true, result: [{ update_id: 77, message: { text: "/start" } }] } };
    },
    resetTelegramCommandMenu: async () => undefined,
    updateSetting: async () => undefined,
    telegramLog: () => undefined,
    getTelegramProxyAgentFromSettings: () => undefined,
    handleTelegramUpdate: async () => {
      handled += 1;
      runtime.resetPollingStarted();
    },
    retryDelaysMs: [1, 2, 3],
  });
  await runtime.startTelegramPolling();
  await waitFor(() => handled === 1);
  assert.equal(getUpdatesCalls, 2, "polling must reconnect after transient timeout");
  assert.equal(runtime.getPollingState().started, false);
}

// Reset/start while an old long-poll is still in flight must never create two concurrent getUpdates calls.
{
  let runtime;
  let getUpdatesCalls = 0;
  let activeCalls = 0;
  let maxActiveCalls = 0;
  let releaseFirst;
  const firstGate = new Promise((resolve) => { releaseFirst = resolve; });
  const settings = {
    telegram_transport_mode: "direct",
    telegram_update_mode: "polling",
    telegram_polling_enabled: "1",
    telegram_bot_token: "TEST_TOKEN",
  };
  runtime = createTelegramPollingRuntime({
    getAllSettingsAsObject: async () => ({ ...settings }),
    setTelegramProxy: () => undefined,
    callTelegramBotApi: async (_token, method) => {
      if (method !== "getUpdates") return { success: true, data: { ok: true, result: true } };
      getUpdatesCalls += 1;
      activeCalls += 1;
      maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
      if (getUpdatesCalls === 1) await firstGate;
      activeCalls -= 1;
      if (getUpdatesCalls >= 2) {
        queueMicrotask(() => runtime.resetPollingStarted());
      }
      return { success: true, data: { ok: true, result: [] } };
    },
    resetTelegramCommandMenu: async () => undefined,
    updateSetting: async () => undefined,
    telegramLog: () => undefined,
    getTelegramProxyAgentFromSettings: () => undefined,
    handleTelegramUpdate: async () => undefined,
    retryDelaysMs: [1, 2, 3],
  });
  await runtime.startTelegramPolling();
  await waitFor(() => getUpdatesCalls === 1);
  runtime.resetPollingStarted();
  await runtime.startTelegramPolling();
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(getUpdatesCalls, 1, "new generation must wait for old in-flight getUpdates");
  releaseFirst();
  await waitFor(() => getUpdatesCalls >= 2);
  assert.equal(maxActiveCalls, 1, "only one getUpdates request may be active at a time");
}

// Phone normalization must match the formats Telegram and store records commonly use.
assert.equal(normalizeIranPhone("+98 912 123 4567"), "09121234567");
assert.equal(normalizeIranPhone("0098-912-123-4567"), "09121234567");
assert.equal(normalizeIranPhone("۰۹۱۲۱۲۳۴۵۶۷"), "09121234567");

const handlerSource = await readFile(path.join(root, "server/bootstrap/telegram/telegramUpdateHandlerCore.ts"), "utf8");
const identitySource = await readFile(path.join(root, "server/services/telegramIdentitySecurity.service.ts"), "utf8");
const diagnosticsSource = await readFile(path.join(root, "pages/settings/settingsTelegramDiagnosticsViewModels.ts"), "utf8");
assert.match(handlerSource, /findPartnersByNormalizedPhone/);
assert.match(handlerSource, /linkPartnerTelegramIdentityByPhone\(phone, fromId, chatId\)/);
assert.doesNotMatch(handlerSource, /CONTACT_LINK_FORBIDDEN/);
assert.match(identitySource, /export const linkPartnerTelegramIdentityByPhone/);
assert.match(identitySource, /Partner Telegram identity linked through verified Telegram self-contact/);
assert.match(diagnosticsSource, /has_main_web_app/);
assert.match(diagnosticsSource, /Main Mini App \/ Launch App/);

console.log(JSON.stringify({
  pass: true,
  timeoutReconnect: true,
  duplicateLongPollPrevention: true,
  partnerPhoneLookupEnabled: true,
  mainMiniAppDiagnostics: true,
}, null, 2));
