import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { DirectTelegramTransport } from "../server/telegram/DirectTelegramTransport.ts";
import { ProxyTelegramTransport } from "../server/telegram/ProxyTelegramTransport.ts";
import {
  readMiniAppGatewayRuntimeConfig,
  writeMiniAppGatewayRuntimeConfigFromSettings,
} from "../server/miniapp/miniAppGatewayRuntimeConfig.mjs";
import { ensureGatewayRelaySecret, writeGatewayRelayAssignment } from "../server/cloud/gatewayRelayRuntimeFiles.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = "123456789:abcdefghijklmnopqrstuvwxyzABCDE";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const listen = (server, port = 0) => new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => server.close(() => resolve()));
const request = (port, host, pathname = "/miniapp.html", headers = {}) => new Promise((resolve, reject) => {
  const req = http.request({ host: "127.0.0.1", port, path: pathname, method: "GET", headers: { Host: host, ...headers }, agent: false }, (res) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    res.on("end", () => resolve({ status: res.statusCode || 0, text: Buffer.concat(chunks).toString("utf8") }));
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
    if (child.exitCode !== null) throw new Error(`Child exited before ready (${child.exitCode}): ${text}`);
    if (Date.now() > deadline) throw new Error(`Timed out waiting for child output ${pattern}: ${text}`);
    await sleep(20);
  }
  return () => { child.stdout.off("data", onData); child.stderr.off("data", onData); };
};
const waitExit = (child, timeoutMs = 5000) => new Promise((resolve) => {
  if (child.exitCode !== null) return resolve(child.exitCode);
  const timer = setTimeout(() => { child.kill("SIGKILL"); resolve(child.exitCode); }, timeoutMs);
  child.once("exit", (code) => { clearTimeout(timer); resolve(code); });
});
const spawnNode = (nodeBin, args, env) => spawn(nodeBin, args, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
const nodeVersion = (nodeBin) => new Promise((resolve, reject) => {
  const child = spawn(nodeBin, ["-v"], { stdio: ["ignore", "pipe", "pipe"] });
  let out = ""; child.stdout.on("data", (d) => out += String(d)); child.stderr.on("data", (d) => out += String(d));
  child.once("error", reject); child.once("exit", (code) => code === 0 ? resolve(out.trim()) : reject(new Error(out)));
});

if (process.argv[2] === "--direct-worker") {
  const direct = new DirectTelegramTransport({ apiBaseUrl: process.argv[3], environment: "test" });
  const result = await direct.request({ botToken: TOKEN, method: "getMe", httpMethod: "GET" });
  console.log(JSON.stringify({ result }));
  process.exit(result.success ? 0 : 1);
}

process.env.NODE_ENV = "test";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "kourosh-v160-runtime-"));
try {
  // ---- Node ENV proxy trap: prove the selected Node runtime honors ENV proxy for global fetch,
  // then prove DirectTelegramTransport bypasses it deterministically.
  let proxyTrapRequests = 0;
  const proxyTrap = http.createServer((_req, res) => {
    proxyTrapRequests += 1;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, result: { via: "env-proxy-trap" } }));
  });
  const trapPort = await listen(proxyTrap);
  let telegramOriginRequests = 0;
  let lastContentType = "";
  const telegramOrigin = http.createServer((req, res) => {
    telegramOriginRequests += 1;
    lastContentType = String(req.headers["content-type"] || "");
    req.resume();
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, result: { direct: true } }));
  });
  const telegramPort = await listen(telegramOrigin);
  const telegramBase = `http://127.0.0.1:${telegramPort}`;
  const envProxy = `http://127.0.0.1:${trapPort}`;
  const requestedNode = String(process.env.KOUROSH_NODE_ENV_PROXY_TEST_NODE || "").trim();
  const candidateNode = requestedNode || process.execPath;
  const candidateVersion = await nodeVersion(candidateNode);
  const candidateMajor = Number(candidateVersion.match(/^v(\d+)/)?.[1] || 0);
  const proxyEnv = {
    ...process.env,
    NODE_USE_ENV_PROXY: "1",
    HTTP_PROXY: envProxy,
    HTTPS_PROXY: envProxy,
    http_proxy: envProxy,
    https_proxy: envProxy,
    NO_PROXY: "",
    no_proxy: "",
  };

  let envProxyFeatureObserved = false;
  if (candidateMajor >= 24) {
    // --use-env-proxy is the canonical CLI equivalent of NODE_USE_ENV_PROXY=1 and
    // gives us a positive control even on bundled Node builds that do not expose
    // proxyEnv from the environment variable alone.
    const control = spawnNode(candidateNode, ["--use-env-proxy", "-e", `require("node:http").get(${JSON.stringify(`${telegramBase}/control`)},r=>{r.resume();r.on("end",()=>process.exit(0))}).on("error",e=>{console.error(e);process.exit(2)})`], proxyEnv);
    const controlCode = await waitExit(control);
    assert.equal(controlCode, 0, `Node ${candidateVersion} env-proxy control should complete`);
    envProxyFeatureObserved = proxyTrapRequests > 0;
    assert.equal(envProxyFeatureObserved, true, `Node ${candidateVersion} --use-env-proxy control must hit the proxy trap`);
    proxyTrapRequests = 0;
    telegramOriginRequests = 0;
  }

  const workerArgs = [
    ...(candidateMajor >= 24 ? ["--use-env-proxy"] : []),
    "--experimental-strip-types", "--experimental-loader", path.join(root, "scripts/ts-extension-loader.mjs"), fileURLToPath(import.meta.url), "--direct-worker", telegramBase,
  ];
  const worker = spawnNode(candidateNode, workerArgs, proxyEnv);
  let workerText = ""; worker.stdout.on("data", (d) => workerText += String(d)); worker.stderr.on("data", (d) => workerText += String(d));
  const workerCode = await waitExit(worker);
  assert.equal(workerCode, 0, `Direct worker failed: ${workerText}`);
  assert.equal(telegramOriginRequests, 1, "Direct request must reach Telegram origin exactly once with --use-env-proxy enabled");
  assert.equal(proxyTrapRequests, 0, "Direct request must never reach Node ENV proxy trap");

  // Also execute with NODE_USE_ENV_PROXY=1 and no CLI flag; regardless of whether
  // this exact Node build activates the feature from ENV, Direct must remain direct.
  const envOnlyWorker = spawnNode(candidateNode, ["--experimental-strip-types", "--experimental-loader", path.join(root, "scripts/ts-extension-loader.mjs"), fileURLToPath(import.meta.url), "--direct-worker", telegramBase], proxyEnv);
  let envOnlyText = ""; envOnlyWorker.stdout.on("data", (d) => envOnlyText += String(d)); envOnlyWorker.stderr.on("data", (d) => envOnlyText += String(d));
  assert.equal(await waitExit(envOnlyWorker), 0, `NODE_USE_ENV_PROXY Direct worker failed: ${envOnlyText}`);
  assert.equal(telegramOriginRequests, 2, "Direct request must reach origin under NODE_USE_ENV_PROXY=1");
  assert.equal(proxyTrapRequests, 0, "NODE_USE_ENV_PROXY must not hijack Direct");

  // Multipart still uses the deterministic direct client.
  const direct = new DirectTelegramTransport({ apiBaseUrl: telegramBase, environment: "test" });
  const multipartResult = await direct.request({ botToken: TOKEN, method: "sendPhoto", multipart: { fields: { chat_id: "1" }, attachment: { fieldName: "photo", filename: "a.jpg", mimeType: "image/jpeg", data: new Uint8Array([1,2,3,4]) } } });
  assert.equal(multipartResult.success, true);
  assert.match(lastContentType, /^multipart\/form-data; boundary=/);

  // Proxy mode remains explicit and proxy-only under the same hostile system ENV.
  class ProxyProbeTransport extends ProxyTelegramTransport {
    attempts = [];
    fail = false;
    async requestWithNetwork(req, options = {}) {
      this.attempts.push({ method: req.method, proxyUrl: options.proxyUrl, envProxy: process.env.HTTP_PROXY });
      return this.fail ? { success: false, errorCode: "TELEGRAM_NETWORK_ERROR", message: "proxy-down" } : { success: true, data: { ok: true } };
    }
  }
  Object.assign(process.env, proxyEnv);
  const explicitProxy = new ProxyProbeTransport({ apiBaseUrl: telegramBase, environment: "test" });
  explicitProxy.setProxy("http://127.0.0.1:19090");
  assert.equal((await explicitProxy.request({ botToken: TOKEN, method: "getMe" })).success, true);
  assert.equal(explicitProxy.attempts[0].proxyUrl, "http://127.0.0.1:19090");
  explicitProxy.fail = true;
  assert.equal((await explicitProxy.request({ botToken: TOKEN, method: "getUpdates" })).success, false);
  assert.equal(explicitProxy.attempts.length, 2, "Proxy failure must not retry Direct");

  // ---- Settings-owned Mini App Gateway runtime config + actual standalone Gateway process.
  const gatewayConfigPath = path.join(temp, "store-runtime", "miniapp-gateway.json");
  const dist = path.join(temp, "dist-miniapp");
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, "miniapp.html"), "<!doctype html><title>v160</title>");
  const api = http.createServer((_req, res) => { res.writeHead(200, { "content-type": "application/json" }); res.end('{"ok":true}'); });
  const apiPort = await listen(api);
  const portProbe = http.createServer(); const gatewayPort = await listen(portProbe); await close(portProbe);
  const runtimeSettings = { telegram_transport_mode: "direct", relay_provider: "managed_kourosh", local_hostname: "untouched", app_base_url: "https://app.example.invalid", qr_public_base_url: "https://qr.example.invalid" };
  const selfSettings = { ...runtimeSettings, miniapp_public_access_mode: "self_hosted", telegram_miniapp_public_url: "https://self.example.invalid/miniapp.html" };
  const selfSnapshot = JSON.stringify(selfSettings);
  const selfWrite = writeMiniAppGatewayRuntimeConfigFromSettings(selfSettings, { configPath: gatewayConfigPath });
  assert.equal(JSON.stringify(selfSettings), selfSnapshot, "Runtime config writer must not mutate Settings object");
  assert.equal(selfWrite.expectedPublicHost, "self.example.invalid");
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(gatewayConfigPath, "utf8"))).sort(), ["expectedPublicHost", "mode", "updatedAt", "version"]);

  const gatewayEnv = {
    ...process.env,
    NODE_ENV: "test",
    KOUROSH_MINIAPP_DIST_DIR: dist,
    KOUROSH_API_HOST: "127.0.0.1",
    KOUROSH_API_PORT: String(apiPort),
    KOUROSH_MINIAPP_GATEWAY_HOST: "127.0.0.1",
    KOUROSH_MINIAPP_GATEWAY_PORT: String(gatewayPort),
    KOUROSH_MINIAPP_GATEWAY_RUNTIME_CONFIG_PATH: gatewayConfigPath,
    KOUROSH_MINIAPP_RELAY_SECRET_PATH: path.join(temp, "relay-secret"),
    KOUROSH_MINIAPP_RELAY_ASSIGNMENT_PATH: path.join(temp, "relay-assignment.json"),
  };
  delete gatewayEnv.KOUROSH_MINIAPP_PUBLIC_HOST;
  delete gatewayEnv.KOUROSH_MINIAPP_GATEWAY_MODE;
  const gateway = spawnNode(process.execPath, [path.join(root, "scripts/serve-miniapp-gateway.mjs")], gatewayEnv);
  const detach = await waitForOutput(gateway, /Mini App Gateway listening/);
  assert.equal((await request(gatewayPort, "self.example.invalid")).status, 200, "Settings-driven SelfHosted Host must be accepted by actual standalone Gateway");
  assert.equal((await request(gatewayPort, "wrong.example.invalid")).status, 421, "Wrong SelfHosted Host must be rejected");

  writeMiniAppGatewayRuntimeConfigFromSettings({ ...runtimeSettings, miniapp_public_access_mode: "external_tunnel", telegram_miniapp_public_url: "https://tunnel.example.invalid/miniapp.html" }, { configPath: gatewayConfigPath });
  assert.equal((await request(gatewayPort, "tunnel.example.invalid")).status, 200, "Tunnel Host must live-reconcile from runtime config");
  assert.equal((await request(gatewayPort, "self.example.invalid")).status, 421, "Previous SelfHosted Host must stop being active after Tunnel change");

  writeMiniAppGatewayRuntimeConfigFromSettings({ ...runtimeSettings, miniapp_public_access_mode: "disabled", telegram_miniapp_public_url: "https://stale.example.invalid/miniapp.html" }, { configPath: gatewayConfigPath });
  const disabledResult = await request(gatewayPort, "tunnel.example.invalid");
  assert.equal(disabledResult.status, 503, "Disabled Mini App must fail closed even while Gateway process stays running");
  const disabledConfigResult = readMiniAppGatewayRuntimeConfig({ configPath: gatewayConfigPath });
  assert.equal(disabledConfigResult.state, "valid");
  assert.equal(disabledConfigResult.config.mode, "disabled"); assert.equal(disabledConfigResult.config.expectedPublicHost, null);

  // Relay runtime config never uses SelfHosted/Tunnel Host and still requires relay auth + assigned Host.
  const relaySecret = ensureGatewayRelaySecret({ secretPath: gatewayEnv.KOUROSH_MINIAPP_RELAY_SECRET_PATH });
  writeGatewayRelayAssignment("https://relay-assigned.example.invalid/miniapp.html", { assignmentPath: gatewayEnv.KOUROSH_MINIAPP_RELAY_ASSIGNMENT_PATH });
  writeMiniAppGatewayRuntimeConfigFromSettings({ ...runtimeSettings, miniapp_public_access_mode: "relay", telegram_miniapp_public_url: "https://must-not-win.example.invalid/miniapp.html" }, { configPath: gatewayConfigPath });
  assert.equal((await request(gatewayPort, "relay-assigned.example.invalid", "/miniapp.html", { "x-kourosh-relay-auth": relaySecret })).status, 200);
  assert.equal((await request(gatewayPort, "must-not-win.example.invalid", "/miniapp.html", { "x-kourosh-relay-auth": relaySecret })).status, 421, "Relay assignment must override stale SelfHosted/Tunnel URL");
  assert.equal((await request(gatewayPort, "relay-assigned.example.invalid")).status, 403, "Relay Gateway still requires internal auth secret");

  detach(); gateway.kill("SIGTERM"); await waitExit(gateway); await close(api); await close(proxyTrap); await close(telegramOrigin);

  // Legacy ENV remains a compatibility fallback only when runtime config is absent.
  const legacyDist = path.join(temp, "legacy-dist"); fs.mkdirSync(legacyDist, { recursive: true }); fs.writeFileSync(path.join(legacyDist, "miniapp.html"), "legacy");
  const legacyProbe = http.createServer(); const legacyPort = await listen(legacyProbe); await close(legacyProbe);
  const missingRuntimeConfig = path.join(temp, "missing-runtime", "miniapp-gateway.json");
  const legacyEnv = {
    ...process.env, NODE_ENV: "test", KOUROSH_MINIAPP_DIST_DIR: legacyDist, KOUROSH_API_HOST: "127.0.0.1", KOUROSH_API_PORT: String(apiPort),
    KOUROSH_MINIAPP_GATEWAY_HOST: "127.0.0.1", KOUROSH_MINIAPP_GATEWAY_PORT: String(legacyPort),
    KOUROSH_MINIAPP_GATEWAY_RUNTIME_CONFIG_PATH: missingRuntimeConfig, KOUROSH_MINIAPP_PUBLIC_HOST: "legacy.example.invalid", KOUROSH_MINIAPP_GATEWAY_MODE: "self_hosted",
  };
  const legacyGateway = spawnNode(process.execPath, [path.join(root, "scripts/serve-miniapp-gateway.mjs")], legacyEnv);
  const detachLegacy = await waitForOutput(legacyGateway, /Mini App Gateway listening/);
  assert.equal((await request(legacyPort, "legacy.example.invalid")).status, 200, "Legacy ENV public Host must remain a compatibility fallback when runtime config is absent");
  detachLegacy(); legacyGateway.kill("SIGTERM"); await waitExit(legacyGateway);

  console.log(JSON.stringify({
    ok: true,
    nodeEnvProxyTestVersion: candidateVersion,
    nodeEnvProxyFeatureObserved: envProxyFeatureObserved,
    directProxyTrapRequests: proxyTrapRequests,
    directOriginRequests: telegramOriginRequests,
    explicitProxyAttempts: explicitProxy.attempts.length,
    proxyFailureDirectFallbackAttempts: 0,
    settingsDrivenSelfHostedGateway: true,
    settingsDrivenTunnelGateway: true,
    gatewayLiveReconciliation: true,
    disabledFailsClosed: true,
    relayGatewayAuthenticated: true,
    runtimeConfigKeys: ["version", "mode", "expectedPublicHost", "updatedAt"],
    platformNeutralRuntimeConfig: true,
  }, null, 2));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
