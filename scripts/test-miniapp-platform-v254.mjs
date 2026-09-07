import assert from "node:assert/strict";

const styles = new Map();
const root = {
  style: { setProperty: (key, value) => styles.set(key, value) },
  dataset: {},
  classList: { toggle: () => undefined },
};
globalThis.document = { documentElement: root };

const calls = { expand: 0, ready: 0, fullscreen: 0, header: 0, background: 0 };
const backButton = { show() {}, hide() {}, onClick() {}, offClick() {} };
const webApp = {
  initData: "",
  version: "9.0",
  platform: "android",
  isFullscreen: false,
  viewportHeight: 672.4,
  viewportStableHeight: 701.6,
  colorScheme: "light",
  themeParams: { bg_color: "#ffffff", secondary_bg_color: "#f6f7f8" },
  safeAreaInset: { top: 3, bottom: 11, left: 5, right: 7 },
  contentSafeAreaInset: { top: 42, bottom: 15, left: 9, right: 13 },
  BackButton: backButton,
  expand() { calls.expand += 1; },
  ready() { calls.ready += 1; },
  requestFullscreen() { calls.fullscreen += 1; },
  isVersionAtLeast() { return true; },
  setHeaderColor() { calls.header += 1; },
  setBackgroundColor() { calls.background += 1; },
  onEvent() {},
  offEvent() {},
};
globalThis.window = { Telegram: { WebApp: webApp } };

const module = await import(`../miniapp/telegram.ts?test=${Date.now()}`);
const initialized = module.initializeTelegramWebApp();
assert.equal(initialized, webApp);
assert.equal(calls.expand, 1, "standard expanded mode must remain automatic");
assert.equal(calls.ready, 1, "Telegram ready must still be called");
assert.equal(calls.fullscreen, 0, "fullscreen must not be requested during bootstrap");
assert.equal(styles.get("--tg-viewport-height"), "672px");
assert.equal(styles.get("--tg-viewport-stable-height"), "702px");
assert.equal(styles.get("--tg-content-safe-area-inset-top"), "42px");
assert.equal(styles.get("--tg-content-safe-area-inset-right"), "13px");
assert.equal(root.dataset.telegramPlatform, "android");
assert.equal(root.dataset.telegramFullscreen, "false");

assert.equal(module.requestTelegramFullscreenFromUserGesture(), true);
assert.equal(calls.fullscreen, 1, "explicit opt-in helper should request fullscreen exactly once");
webApp.isFullscreen = true;
assert.equal(module.requestTelegramFullscreenFromUserGesture(), false);
assert.equal(calls.fullscreen, 1, "already-fullscreen clients must not receive duplicate requests");

webApp.isFullscreen = false;
webApp.isVersionAtLeast = () => false;
assert.equal(module.requestTelegramFullscreenFromUserGesture(), false);
assert.equal(calls.fullscreen, 1, "Telegram clients below 8.0 must not receive fullscreen requests");

console.log(JSON.stringify({
  status: "PASS",
  expandAutomatic: true,
  fullscreenAutomatic: false,
  fullscreenExplicitOnly: true,
  viewportVariables: true,
  safeAreaVariables: true,
}, null, 2));
