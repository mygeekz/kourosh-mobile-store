import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { pickTelegramSettings } from "../server/connectivity/settingsScopes.ts";
import { resolveMiniAppPublicAccessMode, validateTelegramMiniAppPublicUrl } from "../server/connectivity/telegramPublicAccess.ts";
import {
  readMiniAppGatewayRuntimeConfig,
  writeMiniAppGatewayRuntimeConfigFromSettings,
} from "../server/miniapp/miniAppGatewayRuntimeConfig.mjs";
import {
  ensureWindowsMiniAppGateway,
  isExpectedKouroshMiniAppGatewayProcess,
} from "./windows-miniapp-gateway-launcher.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const listen = (server, port = 0) => new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => server.close(() => resolve()));
const request = (port, host) => new Promise((resolve, reject) => {
  const req = http.request({ host: "127.0.0.1", port, path: "/miniapp.html", headers: { Host: host }, agent: false }, (res) => {
    res.resume();
    res.on("end", () => resolve(res.statusCode || 0));
  });
  req.on("error", reject);
  req.end();
});
const waitForOutput = async (child, pattern, timeoutMs = 8000) => {
  let text = "";
  const onData = (chunk) => { text += String(chunk); };
  child.stdout.on("data", onData); child.stderr.on("data", onData);
  const deadline = Date.now() + timeoutMs;
  while (!pattern.test(text)) {
    if (child.exitCode !== null) throw new Error(`Gateway exited before ready (${child.exitCode}): ${text}`);
    if (Date.now() > deadline) throw new Error(`Timed out waiting for Gateway: ${text}`);
    await sleep(20);
  }
  return text;
};
const waitExit = (child, timeoutMs = 5000) => new Promise((resolve) => {
  if (child.exitCode !== null) return resolve(child.exitCode);
  const timer = setTimeout(() => { child.kill("SIGKILL"); resolve(child.exitCode); }, timeoutMs);
  child.once("exit", (code) => { clearTimeout(timer); resolve(code); });
});

process.env.NODE_ENV = "test";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "kourosh-v162-miniapp-"));
try {
  // Reproduce the Settings scope that was lost when the generic footer save path was used.
  const current = {
    telegram_transport_mode: "disabled",
    miniapp_public_access_mode: "disabled",
    telegram_miniapp_public_url: "",
    relay_provider: "managed_kourosh",
  };
  const requestPayload = {
    telegram_transport_mode: "disabled",
    miniapp_public_access_mode: "external_tunnel",
    telegram_miniapp_public_url: "https://jones-beijing-heart-understand.trycloudflare.com/miniapp.html",
  };
  const scoped = pickTelegramSettings(requestPayload);
  assert.equal(scoped.miniapp_public_access_mode, "external_tunnel", "Telegram settings scope must retain canonical Mini App access mode");
  assert.equal(resolveMiniAppPublicAccessMode({ ...current, ...scoped }), "external_tunnel");
  const normalizedUrl = validateTelegramMiniAppPublicUrl(scoped.telegram_miniapp_public_url, "production");
  assert.equal(normalizedUrl, "https://jones-beijing-heart-understand.trycloudflare.com/miniapp.html");

  const configPath = path.join(temp, "runtime", "miniapp-gateway.json");
  const committed = { ...current, ...scoped, telegram_miniapp_public_url: normalizedUrl };
  const written = writeMiniAppGatewayRuntimeConfigFromSettings(committed, { configPath });
  assert.equal(written.mode, "external_tunnel");
  assert.equal(written.expectedPublicHost, "jones-beijing-heart-understand.trycloudflare.com");
  const readBack = readMiniAppGatewayRuntimeConfig({ configPath });
  assert.equal(readBack.state, "valid");
  assert.equal(readBack.config.mode, "external_tunnel");
  assert.equal(readBack.config.expectedPublicHost, "jones-beijing-heart-understand.trycloudflare.com");

  // Actual standalone Gateway process: runtime config is the source, no duplicate ENV Host.
  const dist = path.join(temp, "dist-miniapp");
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, "miniapp.html"), "<!doctype html><title>v162</title>");
  const api = http.createServer((_req, res) => { res.writeHead(200, { "content-type": "application/json" }); res.end('{"ok":true}'); });
  const apiPort = await listen(api);
  const probe = http.createServer(); const gatewayPort = await listen(probe); await close(probe);
  const env = {
    ...process.env,
    NODE_ENV: "test",
    KOUROSH_MINIAPP_DIST_DIR: dist,
    KOUROSH_API_HOST: "127.0.0.1",
    KOUROSH_API_PORT: String(apiPort),
    KOUROSH_MINIAPP_GATEWAY_HOST: "127.0.0.1",
    KOUROSH_MINIAPP_GATEWAY_PORT: String(gatewayPort),
    KOUROSH_MINIAPP_GATEWAY_RUNTIME_CONFIG_PATH: configPath,
    KOUROSH_MINIAPP_RELAY_SECRET_PATH: path.join(temp, "relay-secret"),
    KOUROSH_MINIAPP_RELAY_ASSIGNMENT_PATH: path.join(temp, "relay-assignment.json"),
  };
  delete env.KOUROSH_MINIAPP_PUBLIC_HOST;
  delete env.KOUROSH_MINIAPP_GATEWAY_MODE;
  const gateway = spawn(process.execPath, [path.join(root, "scripts", "serve-miniapp-gateway.mjs")], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  await waitForOutput(gateway, /Mini App Gateway listening/);
  assert.equal(await request(gatewayPort, "jones-beijing-heart-understand.trycloudflare.com"), 200);
  assert.equal(await request(gatewayPort, "wrong.trycloudflare.com"), 421);

  const nextHost = "new-quick-tunnel.trycloudflare.com";
  writeMiniAppGatewayRuntimeConfigFromSettings({ ...committed, telegram_miniapp_public_url: `https://${nextHost}/miniapp.html` }, { configPath });
  assert.equal(await request(gatewayPort, nextHost), 200, "New Quick Tunnel Host must be accepted without manual file edit");
  assert.equal(await request(gatewayPort, "jones-beijing-heart-understand.trycloudflare.com"), 421, "Old Quick Tunnel Host must be rejected immediately");

  writeMiniAppGatewayRuntimeConfigFromSettings({ ...committed, miniapp_public_access_mode: "disabled" }, { configPath });
  assert.equal(await request(gatewayPort, nextHost), 503, "Disabled mode must fail closed");
  gateway.kill("SIGTERM"); await waitExit(gateway); await close(api);

  // Windows launcher ownership policy can be tested without executing PowerShell on Linux.
  const expectedGatewayCommand = `\"${process.execPath}\" \"${path.join(root, "scripts", "serve-miniapp-gateway.mjs")}\"`;
  assert.equal(isExpectedKouroshMiniAppGatewayProcess({ commandLine: expectedGatewayCommand }), true);

  let spawned = 0;
  const reused = await ensureWindowsMiniAppGateway({
    allowNonWindows: true,
    inspectPortOwner: async () => ({ listening: true, pid: 4242, name: "node.exe", commandLine: expectedGatewayCommand }),
    spawnGateway: () => { spawned += 1; throw new Error("must not spawn"); },
  });
  assert.equal(reused.action, "reuse"); assert.equal(spawned, 0, "Existing Kourosh Gateway must be reused, not duplicated");

  await assert.rejects(
    ensureWindowsMiniAppGateway({
      allowNonWindows: true,
      inspectPortOwner: async () => ({ listening: true, pid: 5252, name: "unknown.exe", commandLine: "unknown.exe --listen 4180" }),
      spawnGateway: () => { spawned += 1; throw new Error("must not spawn"); },
    }),
    (error) => error?.code === "MINIAPP_GATEWAY_PORT_IN_USE" && error?.ownerPid === 5252,
  );
  assert.equal(spawned, 0, "Unknown listener must never be killed or displaced by launcher");

  console.log(JSON.stringify({
    ok: true,
    externalTunnelSettingsScope: true,
    expectedPublicHost: "jones-beijing-heart-understand.trycloudflare.com",
    gatewayCorrectHost: 200,
    gatewayWrongHost: 421,
    quickTunnelHostRefresh: true,
    oldTunnelHostRejected: true,
    disabledFailsClosed: true,
    telegramDisabledIndependent: committed.telegram_transport_mode === "disabled",
    windowsGatewayReusePolicy: true,
    unknownPortOwnerFailClosed: true,
  }, null, 2));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
