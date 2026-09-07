import assert from "node:assert/strict";
import { createMiniAppPublicUrlSyncService } from "../server/services/miniAppPublicUrlSync.service.ts";

const nextUrl = "https://new-v163-public.example.test/miniapp.html";
const nextHost = "new-v163-public.example.test";

const makeHarness = ({ initialMode = "disabled", health = [{ ok: true, status: 200, contentType: "text/html" }], menuState = "pending" } = {}) => {
  let settings = {
    miniapp_public_access_mode: initialMode,
    telegram_miniapp_public_url: initialMode === "self_hosted" ? "https://manual.example.test/miniapp.html" : "",
    telegram_transport_mode: "disabled",
  };
  const persistCalls = [];
  const runtimeCalls = [];
  const menuCalls = [];
  const sleepCalls = [];
  let healthIndex = 0;

  const service = createMiniAppPublicUrlSyncService({
    getSettings: async () => ({ ...settings }),
    persistSettings: async (patch) => {
      persistCalls.push({ ...patch });
      settings = Object.fromEntries(Object.entries({ ...settings, ...patch }).map(([key, value]) => [key, value == null ? "" : String(value)]));
    },
    writeRuntimeConfig: (saved) => {
      runtimeCalls.push({ ...saved });
      const mode = String(saved.miniapp_public_access_mode || "disabled");
      const url = String(saved.telegram_miniapp_public_url || "");
      return { mode, expectedPublicHost: url ? new URL(url).hostname : null };
    },
    healthCheck: async () => health[Math.min(healthIndex++, health.length - 1)],
    sleep: async (ms) => { sleepCalls.push(ms); },
    syncMenu: async (saved) => {
      menuCalls.push({ ...saved });
      return { state: menuState, attempts: menuState === "pending" ? 0 : 1, message: menuState === "error" ? "temporary Telegram failure" : undefined };
    },
  });
  return { service, get settings() { return { ...settings }; }, persistCalls, runtimeCalls, menuCalls, sleepCalls };
};

const normal = makeHarness({
  health: [
    { ok: false, status: 503, contentType: "text/html" },
    { ok: false, status: 200, contentType: "application/json" },
    { ok: true, status: 200, contentType: "text/html; charset=utf-8" },
  ],
  menuState: "pending",
});
const result = await normal.service.sync({ provider: "temporary_test_provider", publicUrl: nextUrl });
assert.equal(result.success, true);
assert.equal(result.ready, true);
assert.equal(result.publicUrl, nextUrl);
assert.equal(result.hostname, nextHost);
assert.equal(normal.settings.miniapp_public_access_mode, "external_tunnel");
assert.equal(normal.settings.telegram_miniapp_public_url, nextUrl);
assert.equal(normal.runtimeCalls.length, 1);
assert.equal(normal.runtimeCalls[0].miniapp_public_access_mode, "external_tunnel");
assert.deepEqual(normal.sleepCalls, [1000, 2000], "Public propagation retry must remain bounded and ordered");
assert.equal(normal.menuCalls.length, 1);
assert.equal(result.menuSync, "pending");

const menuFailure = makeHarness({ menuState: "error" });
const menuFailureResult = await menuFailure.service.sync({ provider: "temporary_test_provider", publicUrl: nextUrl });
assert.equal(menuFailureResult.success, true, "Telegram Menu failure must not roll back a healthy public Mini App");
assert.equal(menuFailureResult.ready, true);
assert.equal(menuFailure.settings.telegram_miniapp_public_url, nextUrl);
assert.equal(menuFailureResult.status.telegramMenu, "error");

const selfHosted = makeHarness({ initialMode: "self_hosted" });
const protectedResult = await selfHosted.service.sync({ provider: "temporary_test_provider", publicUrl: nextUrl });
assert.equal(protectedResult.skipped, true);
assert.equal(protectedResult.protectedMode, "self_hosted");
assert.equal(selfHosted.persistCalls.length, 0, "Auto temporary tunnel must not overwrite Self-Hosted settings");
assert.equal(selfHosted.runtimeCalls.length, 0);
assert.equal(selfHosted.menuCalls.length, 0);

const relay = makeHarness({ initialMode: "relay" });
const relayPreflight = await relay.service.preflight();
assert.equal(relayPreflight.allowed, false);
assert.equal(relayPreflight.protectedMode, "relay");

const unhealthy = makeHarness({ health: [{ ok: false, status: 503, contentType: "text/html" }] });
const unhealthyResult = await unhealthy.service.sync({ provider: "temporary_test_provider", publicUrl: nextUrl });
assert.equal(unhealthyResult.success, false);
assert.equal(unhealthyResult.ready, false);
assert.equal(unhealthy.menuCalls.length, 0, "Telegram Menu must not sync before public health is READY");
assert.equal(unhealthy.settings.telegram_miniapp_public_url, nextUrl, "Validated canonical Settings remain the Source of Truth while health is pending");

console.log(JSON.stringify({
  status: "PASS",
  canonicalMode: normal.settings.miniapp_public_access_mode,
  expectedPublicHost: nextHost,
  healthRetrySleeps: normal.sleepCalls,
  menuFailureKeepsPublicReady: menuFailureResult.ready,
  selfHostedProtected: protectedResult.skipped,
  relayProtected: relayPreflight.allowed === false,
  unhealthyBlocksMenuSync: unhealthy.menuCalls.length === 0,
}, null, 2));
