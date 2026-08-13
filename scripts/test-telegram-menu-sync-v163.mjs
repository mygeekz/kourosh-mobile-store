import assert from "node:assert/strict";
import { createTelegramMenuSyncService } from "../server/services/telegramMenuSync.service.ts";

const publicUrl = "https://current-v163-host.example.test/miniapp.html";

let disabledCalls = 0;
let disabledConfigureCalls = 0;
const disabledSync = createTelegramMenuSyncService({
  configureTransport: () => { disabledConfigureCalls += 1; },
  callApi: async () => { disabledCalls += 1; return { success: true }; },
  sleep: async () => undefined,
});
const disabled = await disabledSync({
  telegram_transport_mode: "disabled",
  telegram_bot_token: "secret-token-not-for-output",
  miniapp_public_access_mode: "external_tunnel",
  telegram_miniapp_public_url: publicUrl,
});
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
    return { success: true };
  },
  sleep: async () => undefined,
});
const direct = await directSync({
  telegram_transport_mode: "direct",
  telegram_bot_token: "secret-token-not-for-output",
  miniapp_public_access_mode: "external_tunnel",
  telegram_miniapp_public_url: publicUrl,
});
assert.equal(direct.state, "synced");
assert.equal(direct.attempts, 1);
assert.equal(directConfigureCalls, 1);
assert.equal(directCalls.length, 1);
assert.equal(directCalls[0].method, "setChatMenuButton");
assert.equal(directCalls[0].payload.menu_button.web_app.url, publicUrl, "Menu Button must use the current canonical Mini App URL");

let transientCalls = 0;
const transientSync = createTelegramMenuSyncService({
  configureTransport: () => undefined,
  callApi: async () => {
    transientCalls += 1;
    if (transientCalls < 3) return { success: false, message: "ETIMEDOUT temporary network failure" };
    return { success: true };
  },
  sleep: async () => undefined,
});
const transient = await transientSync({
  telegram_transport_mode: "proxy",
  telegram_proxy: "http://127.0.0.1:9876",
  telegram_bot_token: "secret-token-not-for-output",
  miniapp_public_access_mode: "external_tunnel",
  telegram_miniapp_public_url: publicUrl,
});
assert.equal(transient.state, "synced");
assert.equal(transient.attempts, 3);
assert.equal(transientCalls, 3, "Transient Telegram Menu failures must use bounded retry");

let permanentCalls = 0;
const permanentSync = createTelegramMenuSyncService({
  configureTransport: () => undefined,
  callApi: async () => {
    permanentCalls += 1;
    return { success: false, message: "Bad Request" };
  },
  sleep: async () => undefined,
});
const permanent = await permanentSync({
  telegram_transport_mode: "relay",
  telegram_bot_token: "secret-token-not-for-output",
  miniapp_public_access_mode: "external_tunnel",
  telegram_miniapp_public_url: publicUrl,
});
assert.equal(permanent.state, "error");
assert.equal(permanent.attempts, 1);
assert.equal(permanentCalls, 1, "Permanent Menu failure must not spam Telegram API");

console.log(JSON.stringify({
  status: "PASS",
  disabledApiCalls: disabledCalls,
  directMenuUrl: directCalls[0].payload.menu_button.web_app.url,
  transientAttempts: transient.attempts,
  permanentAttempts: permanent.attempts,
}, null, 2));
