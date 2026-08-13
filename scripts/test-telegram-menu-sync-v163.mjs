import assert from "node:assert/strict";
import { createTelegramMenuSyncService } from "../server/services/telegramMenuSync.service.ts";

const publicUrl = "https://current-v163-host.example.test/miniapp.html";
const baseSettings = {
  telegram_transport_mode: "direct",
  telegram_bot_token: "secret-token-not-for-output",
  miniapp_public_access_mode: "external_tunnel",
  telegram_miniapp_public_url: publicUrl,
};
const verifiedMenu = (url = publicUrl) => ({
  success: true,
  data: { ok: true, result: { type: "web_app", text: "پنل کوروش", web_app: { url } } },
});

let disabledCalls = 0;
let disabledConfigureCalls = 0;
const disabledSync = createTelegramMenuSyncService({
  configureTransport: () => { disabledConfigureCalls += 1; },
  callApi: async () => { disabledCalls += 1; return { success: true }; },
  sleep: async () => undefined,
});
const disabled = await disabledSync({ ...baseSettings, telegram_transport_mode: "disabled" });
assert.equal(disabled.state, "pending");
assert.equal(disabled.attempts, 0);
assert.equal(disabledCalls, 0, "Disabled Telegram transport must perform zero Bot API calls");
assert.equal(disabledConfigureCalls, 0, "Disabled Telegram transport must not configure a hidden Direct transport");

let directConfigureCalls = 0;
const directCalls = [];
const directSync = createTelegramMenuSyncService({
  configureTransport: (settings) => {
    directConfigureCalls += 1;
    assert.equal(settings.telegram_transport_mode, "direct");
  },
  callApi: async (_token, method, payload) => {
    directCalls.push({ method, payload });
    return method === "getChatMenuButton" ? verifiedMenu() : { success: true };
  },
  sleep: async () => undefined,
});
const direct = await directSync(baseSettings);
assert.equal(direct.state, "synced");
assert.equal(direct.attempts, 1);
assert.equal(directConfigureCalls, 1);
assert.equal(directCalls.length, 2);
assert.equal(directCalls[0].method, "setChatMenuButton");
assert.equal(directCalls[0].payload.menu_button.web_app.url, publicUrl, "Menu Button must use the current canonical Mini App URL");
assert.equal(directCalls[1].method, "getChatMenuButton", "Menu sync must read back Telegram's current default Menu Button");

let transientWrites = 0;
let transientReads = 0;
const transientSync = createTelegramMenuSyncService({
  configureTransport: () => undefined,
  callApi: async (_token, method) => {
    if (method === "getChatMenuButton") {
      transientReads += 1;
      return verifiedMenu();
    }
    transientWrites += 1;
    if (transientWrites < 3) return { success: false, message: "ETIMEDOUT temporary network failure" };
    return { success: true };
  },
  sleep: async () => undefined,
});
const transient = await transientSync({ ...baseSettings, telegram_transport_mode: "proxy", telegram_proxy: "http://127.0.0.1:9876" });
assert.equal(transient.state, "synced");
assert.equal(transient.attempts, 3);
assert.equal(transientWrites, 3, "Transient Telegram Menu failures must use bounded write retry");
assert.equal(transientReads, 1, "Read-back is required after the successful write");

let permanentCalls = 0;
const permanentSync = createTelegramMenuSyncService({
  configureTransport: () => undefined,
  callApi: async () => {
    permanentCalls += 1;
    return { success: false, message: "Bad Request" };
  },
  sleep: async () => undefined,
});
const permanent = await permanentSync({ ...baseSettings, telegram_transport_mode: "relay" });
assert.equal(permanent.state, "error");
assert.equal(permanent.attempts, 1);
assert.equal(permanentCalls, 1, "Permanent Menu failure must not spam Telegram API");

const staleReads = [];
const staleSync = createTelegramMenuSyncService({
  configureTransport: () => undefined,
  callApi: async (_token, method, payload) => {
    staleReads.push({ method, payload });
    return method === "getChatMenuButton"
      ? verifiedMenu("https://old.example.test/miniapp.html")
      : { success: true };
  },
  sleep: async () => undefined,
});
const staleResult = await staleSync(baseSettings);
assert.equal(staleResult.state, "error", "A stale Telegram read-back must never be reported as synced");
assert.equal(staleResult.attempts, 3, "Read-back mismatch should receive only bounded retries");
assert.equal(staleReads.filter((call) => call.method === "setChatMenuButton").length, 3);
assert.equal(staleReads.filter((call) => call.method === "getChatMenuButton").length, 3);

console.log(JSON.stringify({
  status: "PASS",
  disabledApiCalls: disabledCalls,
  directMenuUrl: directCalls[0].payload.menu_button.web_app.url,
  directReadBackMethod: directCalls[1].method,
  transientWriteAttempts: transientWrites,
  staleReadBackAttempts: staleReads.filter((call) => call.method === "getChatMenuButton").length,
}, null, 2));
