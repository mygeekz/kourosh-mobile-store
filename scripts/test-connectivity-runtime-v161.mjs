import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  readMiniAppGatewayRuntimeConfig,
  writeMiniAppGatewayRuntimeConfig,
} from "../server/miniapp/miniAppGatewayRuntimeConfig.mjs";
import { ensureGatewayRelaySecret, writeGatewayRelayAssignment } from "../server/cloud/gatewayRelayRuntimeFiles.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
const getFreePort = async () => { const s = http.createServer(); const p = await listen(s); await close(s); return p; };
const waitExit = (child, timeoutMs = 6000) => new Promise((resolve) => {
  if (child.exitCode !== null) return resolve(child.exitCode);
  const timer = setTimeout(() => { child.kill("SIGKILL"); resolve(child.exitCode); }, timeoutMs);
  child.once("exit", (code) => { clearTimeout(timer); resolve(code); });
});
const waitForOutput = async (child, pattern, timeoutMs = 8000) => {
  let text = "";
  const onData = (chunk) => { text += String(chunk); };
  child.stdout.on("data", onData); child.stderr.on("data", onData);
  const deadline = Date.now() + timeoutMs;
  while (!pattern.test(text)) {
    if (child.exitCode !== null) throw new Error(`Gateway exited before ready (${child.exitCode}): ${text}`);
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${pattern}: ${text}`);
    await sleep(20);
  }
  return { text: () => text, detach: () => { child.stdout.off("data", onData); child.stderr.off("data", onData); } };
};
const spawnGateway = async ({ runtimePath, dist, apiPort, legacyHost = "legacy.example.invalid", legacyMode = "self_hosted", relaySecretPath, relayAssignmentPath }) => {
  const port = await getFreePort();
  const env = {
    ...process.env,
    NODE_ENV: "test",
    KOUROSH_MINIAPP_DIST_DIR: dist,
    KOUROSH_API_HOST: "127.0.0.1",
    KOUROSH_API_PORT: String(apiPort),
    KOUROSH_MINIAPP_GATEWAY_HOST: "127.0.0.1",
    KOUROSH_MINIAPP_GATEWAY_PORT: String(port),
    KOUROSH_MINIAPP_GATEWAY_RUNTIME_CONFIG_PATH: runtimePath,
    KOUROSH_MINIAPP_PUBLIC_HOST: legacyHost,
    KOUROSH_MINIAPP_GATEWAY_MODE: legacyMode,
    KOUROSH_MINIAPP_RELAY_SECRET_PATH: relaySecretPath,
    KOUROSH_MINIAPP_RELAY_ASSIGNMENT_PATH: relayAssignmentPath,
  };
  const child = spawn(process.execPath, [path.join(root, "scripts/serve-miniapp-gateway.mjs")], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  return { child, port, env };
};
const stopGateway = async (child) => { if (child.exitCode === null) child.kill("SIGTERM"); await waitExit(child); };
const expectStartupInvalid = async (params, reasonPattern) => {
  const { child } = await spawnGateway(params);
  let text = ""; child.stdout.on("data", (d) => text += String(d)); child.stderr.on("data", (d) => text += String(d));
  const code = await waitExit(child);
  assert.notEqual(code, 0, `Invalid runtime config must prevent Gateway startup: ${text}`);
  assert.match(text, /MINIAPP_GATEWAY_RUNTIME_CONFIG_INVALID/);
  if (reasonPattern) assert.match(text, reasonPattern);
  return text;
};

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "kourosh-v161-runtime-"));
try {
  const dist = path.join(temp, "dist-miniapp");
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, "miniapp.html"), "<!doctype html><title>v161</title>");
  const api = http.createServer((_req, res) => { res.writeHead(200, { "content-type": "application/json" }); res.end('{"ok":true}'); });
  const apiPort = await listen(api);
  const runtimePath = path.join(temp, "runtime", "miniapp-gateway.json");
  const relaySecretPath = path.join(temp, "relay-secret");
  const relayAssignmentPath = path.join(temp, "relay-assignment.json");
  const common = { runtimePath, dist, apiPort, relaySecretPath, relayAssignmentPath };

  // 1) ABSENT is the only state allowed to use legacy ENV compatibility.
  assert.deepEqual(readMiniAppGatewayRuntimeConfig({ configPath: runtimePath }), { state: "absent" });
  {
    const { child, port } = await spawnGateway(common);
    const output = await waitForOutput(child, /Mini App Gateway listening/);
    assert.equal((await request(port, "legacy.example.invalid")).status, 200);
    output.detach(); await stopGateway(child);
  }

  // 2) Valid SelfHosted runtime config wins over legacy ENV.
  fs.mkdirSync(path.dirname(runtimePath), { recursive: true });
  writeMiniAppGatewayRuntimeConfig({ mode: "self_hosted", expectedPublicHost: "self.example.invalid" }, { configPath: runtimePath });
  {
    const result = readMiniAppGatewayRuntimeConfig({ configPath: runtimePath });
    assert.equal(result.state, "valid"); assert.equal(result.config.mode, "self_hosted");
    const { child, port } = await spawnGateway(common); const output = await waitForOutput(child, /Mini App Gateway listening/);
    assert.equal((await request(port, "self.example.invalid")).status, 200);
    assert.equal((await request(port, "legacy.example.invalid")).status, 421);
    output.detach(); await stopGateway(child);
  }

  // 3) Valid Tunnel runtime config wins over legacy ENV.
  writeMiniAppGatewayRuntimeConfig({ mode: "external_tunnel", expectedPublicHost: "tunnel.example.invalid" }, { configPath: runtimePath });
  {
    const { child, port } = await spawnGateway(common); const output = await waitForOutput(child, /Mini App Gateway listening/);
    assert.equal((await request(port, "tunnel.example.invalid")).status, 200);
    assert.equal((await request(port, "legacy.example.invalid")).status, 421);
    output.detach(); await stopGateway(child);
  }

  // 4) Disabled remains fail-closed despite legacy ENV.
  writeMiniAppGatewayRuntimeConfig({ mode: "disabled", expectedPublicHost: null }, { configPath: runtimePath });
  {
    const { child, port } = await spawnGateway(common); const output = await waitForOutput(child, /Mini App Gateway listening/);
    assert.equal((await request(port, "legacy.example.invalid")).status, 503);
    output.detach(); await stopGateway(child);
  }

  // 5) Existing malformed JSON must never resurrect legacy ENV.
  fs.writeFileSync(runtimePath, "{broken-json", { mode: 0o600 });
  assert.deepEqual(readMiniAppGatewayRuntimeConfig({ configPath: runtimePath }), { state: "invalid", reasonCode: "RUNTIME_CONFIG_MALFORMED_JSON" });
  await expectStartupInvalid(common, /MINIAPP_GATEWAY_RUNTIME_CONFIG_INVALID/);

  // 6) Unsupported version is INVALID, never absent.
  fs.writeFileSync(runtimePath, JSON.stringify({ version: 999, mode: "self_hosted", expectedPublicHost: "legacy.example.invalid", updatedAt: new Date().toISOString() }));
  assert.equal(readMiniAppGatewayRuntimeConfig({ configPath: runtimePath }).reasonCode, "RUNTIME_CONFIG_VERSION_UNSUPPORTED");
  await expectStartupInvalid(common);

  // 7) Invalid mode is INVALID, never normalized to disabled/legacy.
  fs.writeFileSync(runtimePath, JSON.stringify({ version: 1, mode: "something_else", expectedPublicHost: null, updatedAt: new Date().toISOString() }));
  assert.equal(readMiniAppGatewayRuntimeConfig({ configPath: runtimePath }).reasonCode, "RUNTIME_CONFIG_MODE_INVALID");
  await expectStartupInvalid(common);

  // 8) Invalid Host is INVALID and never falls back.
  fs.writeFileSync(runtimePath, JSON.stringify({ version: 1, mode: "self_hosted", expectedPublicHost: "https://bad.example.invalid/path", updatedAt: new Date().toISOString() }));
  assert.equal(readMiniAppGatewayRuntimeConfig({ configPath: runtimePath }).reasonCode, "RUNTIME_CONFIG_HOST_INVALID");
  await expectStartupInvalid(common);

  // 9) Symlink config is unsafe; target must not be followed or modified.
  const target = path.join(temp, "symlink-target.json");
  const targetBody = JSON.stringify({ version: 1, mode: "self_hosted", expectedPublicHost: "legacy.example.invalid", updatedAt: new Date().toISOString() });
  fs.writeFileSync(target, targetBody);
  fs.rmSync(runtimePath, { force: true });
  let symlinkSupported = true;
  try { fs.symlinkSync(target, runtimePath, "file"); } catch { symlinkSupported = false; }
  if (symlinkSupported) {
    assert.equal(readMiniAppGatewayRuntimeConfig({ configPath: runtimePath }).reasonCode, "RUNTIME_CONFIG_SYMLINK_UNSAFE");
    await expectStartupInvalid(common);
    assert.equal(fs.readFileSync(target, "utf8"), targetBody, "Symlink target must remain untouched");
    fs.rmSync(runtimePath, { force: true });
  }

  // Non-regular path is invalid as well.
  fs.rmSync(runtimePath, { recursive: true, force: true }); fs.mkdirSync(runtimePath, { recursive: true });
  assert.equal(readMiniAppGatewayRuntimeConfig({ configPath: runtimePath }).reasonCode, "RUNTIME_CONFIG_NOT_REGULAR_FILE");
  fs.rmSync(runtimePath, { recursive: true, force: true });

  // 10) Live valid -> malformed transition fails closed with 503 and no legacy resurrection.
  writeMiniAppGatewayRuntimeConfig({ mode: "self_hosted", expectedPublicHost: "live.example.invalid" }, { configPath: runtimePath });
  {
    const { child, port } = await spawnGateway(common); const output = await waitForOutput(child, /Mini App Gateway listening/);
    assert.equal((await request(port, "live.example.invalid")).status, 200);
    fs.writeFileSync(runtimePath, "{broken-live-json", { mode: 0o600 });
    assert.equal((await request(port, "legacy.example.invalid")).status, 503);
    assert.equal((await request(port, "live.example.invalid")).status, 503);
    const deadline = Date.now() + 3000;
    while (!/gateway_runtime_config_invalid/.test(output.text()) && Date.now() < deadline) await sleep(20);
    assert.match(output.text(), /gateway_runtime_config_invalid/);
    assert.doesNotMatch(output.text(), /broken-live-json/, "Runtime log must not expose raw invalid file content");
    output.detach(); await stopGateway(child);
  }

  // 11) Relay remains authenticated/internal and runtime Host cannot override assigned Host.
  const relaySecret = ensureGatewayRelaySecret({ secretPath: relaySecretPath });
  writeGatewayRelayAssignment("https://relay-assigned.example.invalid/miniapp.html", { assignmentPath: relayAssignmentPath });
  writeMiniAppGatewayRuntimeConfig({ mode: "relay", expectedPublicHost: null }, { configPath: runtimePath });
  {
    const { child, port } = await spawnGateway(common); const output = await waitForOutput(child, /Mini App Gateway listening/);
    assert.equal((await request(port, "relay-assigned.example.invalid", "/miniapp.html", { "x-kourosh-relay-auth": relaySecret })).status, 200);
    assert.equal((await request(port, "relay-assigned.example.invalid")).status, 403);
    assert.equal((await request(port, "legacy.example.invalid", "/miniapp.html", { "x-kourosh-relay-auth": relaySecret })).status, 421);
    output.detach(); await stopGateway(child);
  }

  await close(api);
  console.log(JSON.stringify({
    ok: true,
    absentLegacyFallback: true,
    runtimeWinsLegacy: true,
    malformedFailsClosed: true,
    unsupportedVersionFailsClosed: true,
    invalidModeFailsClosed: true,
    invalidHostFailsClosed: true,
    symlinkFailsClosed: symlinkSupported,
    nonRegularFailsClosed: true,
    liveCorruptionStatus: 503,
    relayAuthenticatedInternal: true,
  }, null, 2));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
