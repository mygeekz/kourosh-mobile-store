import assert from "node:assert/strict";
import fs from "node:fs";

import {
  createTelegramMenuButtonEnsurer,
  telegramMenuButtonPayload,
} from "../server/utils/telegramMiniApp.ts";
import { createTelegramMenuSyncService } from "../server/services/telegramMenuSync.service.ts";

const botToken = "test-token-never-log";
const unavailableSettings = {
  telegram_transport_mode: "direct",
  telegram_bot_token: botToken,
};

const missing = telegramMenuButtonPayload(unavailableSettings);
assert.equal(missing.mode, "unavailable");
assert.equal(missing.payload, null);

const invalid = telegramMenuButtonPayload({
  ...unavailableSettings,
  telegram_miniapp_public_url: "javascript:alert(1)",
});
assert.equal(invalid.mode, "unavailable");
assert.equal(invalid.payload, null);

let ensureApiCalls = 0;
const ensureMenuButton = createTelegramMenuButtonEnsurer(async () => {
  ensureApiCalls += 1;
  return { success: true };
});
const ensurePending = await ensureMenuButton.ensure(botToken, unavailableSettings);
assert.equal(ensurePending.pending, true);
assert.equal(ensurePending.skipped, true);
assert.equal(ensureApiCalls, 0, "Missing public URL must never remove the existing Telegram Menu Button");

let configureCalls = 0;
let syncApiCalls = 0;
const pendingSync = createTelegramMenuSyncService({
  configureTransport: () => { configureCalls += 1; },
  callApi: async () => {
    syncApiCalls += 1;
    return { success: true };
  },
  sleep: async () => undefined,
});
const globalPending = await pendingSync(unavailableSettings);
assert.equal(globalPending.state, "pending");
assert.equal(globalPending.attempts, 0);
assert.match(globalPending.message || "", /preserved/i);
assert.equal(configureCalls, 0);
assert.equal(syncApiCalls, 0);

const scopedPending = await pendingSync(unavailableSettings, { chatId: "672412513" });
assert.equal(scopedPending.state, "pending");
assert.equal(scopedPending.attempts, 0);
assert.equal(syncApiCalls, 0, "Chat-scoped reconciliation must also preserve the existing Menu Button");

const publicUrl = "https://kourosh-miniapp.example.test/miniapp.html";
const recoveryCalls = [];
const recoverySync = createTelegramMenuSyncService({
  configureTransport: () => undefined,
  callApi: async (_token, method, payload) => {
    recoveryCalls.push({ method, payload });
    if (method === "getChatMenuButton") {
      return {
        success: true,
        data: { ok: true, result: { type: "web_app", text: "پنل کوروش", web_app: { url: publicUrl } } },
      };
    }
    return { success: true };
  },
  sleep: async () => undefined,
});
const recovered = await recoverySync({
  ...unavailableSettings,
  miniapp_public_access_mode: "external_tunnel",
  telegram_miniapp_public_url: publicUrl,
}, { chatId: "672412513" });
assert.equal(recovered.state, "synced");
assert.equal(recovered.attempts, 1);
assert.equal(recoveryCalls[0].method, "setChatMenuButton");
assert.equal(recoveryCalls[0].payload.chat_id, "672412513");
assert.equal(recoveryCalls[0].payload.menu_button.type, "web_app");
assert.equal(recoveryCalls[0].payload.menu_button.web_app.url, publicUrl);
assert.equal(recoveryCalls[1].method, "getChatMenuButton");

const automaticMenuSource = fs.readFileSync("server/utils/telegramMiniApp.ts", "utf8");
assert.doesNotMatch(
  automaticMenuSource,
  /menu_button:\s*\{\s*type:\s*["']default["']/,
  "Automatic Menu reconciliation must not contain a destructive default-button fallback",
);

console.log(JSON.stringify({
  status: "PASS",
  release: "v197",
  unavailableApiCalls: syncApiCalls,
  existingButtonPreserved: true,
  chatScopedRecovery: recovered.state,
  recoveryUrl: recoveryCalls[0].payload.menu_button.web_app.url,
}, null, 2));
