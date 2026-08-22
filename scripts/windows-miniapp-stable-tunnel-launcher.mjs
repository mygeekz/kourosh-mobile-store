#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ensureCloudflaredExecutable,
  waitForKouroshTunnelSyncPreflight,
  waitForMiniAppGateway,
} from "./windows-miniapp-tunnel-launcher.mjs";

const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_TARGET_URL = "http://127.0.0.1:4180";
const TUNNEL_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HOST_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const boundedMs = (value, fallback, min = 500, max = 30_000) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
};
const chmodBestEffort = (target, mode) => { try { fs.chmodSync(target, mode); } catch {} };

export const normalizeStableLiveOriginUrl = (value) => {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:" || url.username || url.password || url.hash || url.search) return null;
    if (!HOST_RE.test(url.hostname) || (url.pathname !== "/" && url.pathname !== "/miniapp.html")) return null;
    return `${url.origin}/`;
  } catch { return null; }
};

const yamlSingleQuote = (value) => `'${String(value).replace(/'/g, "''")}'`;

export const buildCloudflareNamedTunnelConfig = ({ tunnelId, credentialsFile, liveOriginUrl, targetUrl = DEFAULT_TARGET_URL }) => {
  const normalizedTunnelId = String(tunnelId || "").trim().toLowerCase();
  const normalizedLiveOrigin = normalizeStableLiveOriginUrl(liveOriginUrl);
  const credentials = path.resolve(String(credentialsFile || "").trim());
  if (!TUNNEL_UUID_RE.test(normalizedTunnelId)) throw Object.assign(new Error("CLOUDFLARE_TUNNEL_ID_INVALID"), { code: "CLOUDFLARE_TUNNEL_ID_INVALID" });
  if (!normalizedLiveOrigin) throw Object.assign(new Error("MINIAPP_LIVE_ORIGIN_INVALID"), { code: "MINIAPP_LIVE_ORIGIN_INVALID" });
  if (String(targetUrl) !== DEFAULT_TARGET_URL) throw Object.assign(new Error("MINIAPP_NAMED_TUNNEL_TARGET_FORBIDDEN"), { code: "MINIAPP_NAMED_TUNNEL_TARGET_FORBIDDEN" });
  if (/\r|\n/.test(credentials)) throw Object.assign(new Error("CLOUDFLARE_CREDENTIAL_PATH_INVALID"), { code: "CLOUDFLARE_CREDENTIAL_PATH_INVALID" });
  const hostname = new URL(normalizedLiveOrigin).hostname.toLowerCase();
  return [
    `tunnel: ${normalizedTunnelId}`,
    `credentials-file: ${yamlSingleQuote(credentials)}`,
    "no-autoupdate: true",
    "ingress:",
    `  - hostname: ${yamlSingleQuote(hostname)}`,
    `    service: ${DEFAULT_TARGET_URL}`,
    "  - service: http_status:404",
    "",
  ].join("\n");
};

const assertRegularCredentialFile = (file, tunnelId, options = {}) => {
  const lstat = options.lstatSync || fs.lstatSync;
  const readFile = options.readFileSync || fs.readFileSync;
  let stat;
  try { stat = lstat(file); } catch { throw Object.assign(new Error("CLOUDFLARE_TUNNEL_CREDENTIALS_MISSING"), { code: "CLOUDFLARE_TUNNEL_CREDENTIALS_MISSING" }); }
  if (stat.isSymbolicLink() || !stat.isFile()) throw Object.assign(new Error("CLOUDFLARE_TUNNEL_CREDENTIALS_UNSAFE"), { code: "CLOUDFLARE_TUNNEL_CREDENTIALS_UNSAFE" });
  if (Number(stat.size || 0) < 16 || Number(stat.size || 0) > 64 * 1024) throw Object.assign(new Error("CLOUDFLARE_TUNNEL_CREDENTIALS_INVALID"), { code: "CLOUDFLARE_TUNNEL_CREDENTIALS_INVALID" });
  let parsed;
  try { parsed = JSON.parse(readFile(file, "utf8")); } catch { throw Object.assign(new Error("CLOUDFLARE_TUNNEL_CREDENTIALS_INVALID"), { code: "CLOUDFLARE_TUNNEL_CREDENTIALS_INVALID" }); }
  const credentialTunnelId = String(parsed?.TunnelID || parsed?.TunnelId || "").trim().toLowerCase();
  if (credentialTunnelId && credentialTunnelId !== String(tunnelId).trim().toLowerCase()) throw Object.assign(new Error("CLOUDFLARE_TUNNEL_CREDENTIALS_MISMATCH"), { code: "CLOUDFLARE_TUNNEL_CREDENTIALS_MISMATCH" });
  if (!String(parsed?.TunnelSecret || "").trim()) throw Object.assign(new Error("CLOUDFLARE_TUNNEL_CREDENTIALS_INVALID"), { code: "CLOUDFLARE_TUNNEL_CREDENTIALS_INVALID" });
  return true;
};

export const resolveCloudflareNamedTunnelRuntime = (preflight, options = {}) => {
  const env = options.env || process.env;
  const stable = preflight?.stableTunnel || {};
  if (preflight?.startupAction !== "stable_tunnel" || stable.provider !== "cloudflare_named" || stable.configured !== true) {
    throw Object.assign(new Error("STABLE_TUNNEL_PREFLIGHT_NOT_READY"), { code: "STABLE_TUNNEL_PREFLIGHT_NOT_READY" });
  }
  const tunnelId = String(env.KOUROSH_CLOUDFLARE_TUNNEL_ID || "").trim().toLowerCase();
  if (!TUNNEL_UUID_RE.test(tunnelId)) throw Object.assign(new Error("CLOUDFLARE_TUNNEL_ID_NOT_CONFIGURED"), { code: "CLOUDFLARE_TUNNEL_ID_NOT_CONFIGURED" });
  const userHome = String(env.USERPROFILE || env.HOME || os.homedir()).trim();
  const credentialsFile = path.resolve(String(env.KOUROSH_CLOUDFLARE_TUNNEL_CREDENTIALS_FILE || path.join(userHome, ".cloudflared", `${tunnelId}.json`)).trim());
  const runtimeRoot = path.resolve(String(env.KOUROSH_STORE_RUNTIME_DIR || path.join(userHome, ".kourosh", "runtime", "store")).trim());
  const configFile = path.resolve(String(env.KOUROSH_CLOUDFLARE_TUNNEL_CONFIG_PATH || path.join(runtimeRoot, "cloudflare-named-tunnel.yml")).trim());
  const liveOriginUrl = normalizeStableLiveOriginUrl(stable.liveOriginUrl);
  if (!liveOriginUrl) throw Object.assign(new Error("MINIAPP_LIVE_ORIGIN_NOT_CONFIGURED"), { code: "MINIAPP_LIVE_ORIGIN_NOT_CONFIGURED" });
  return { tunnelId, credentialsFile, configFile, liveOriginUrl, targetUrl: DEFAULT_TARGET_URL };
};

export const writeCloudflareNamedTunnelRuntimeConfig = (runtime, options = {}) => {
  (options.assertCredentials || assertRegularCredentialFile)(runtime.credentialsFile, runtime.tunnelId, options);
  const body = buildCloudflareNamedTunnelConfig(runtime);
  if (/127\.0\.0\.1:3001|localhost:3001/i.test(body)) throw Object.assign(new Error("MINIAPP_BACKEND_DIRECT_EXPOSURE_FORBIDDEN"), { code: "MINIAPP_BACKEND_DIRECT_EXPOSURE_FORBIDDEN" });
  fs.mkdirSync(path.dirname(runtime.configFile), { recursive: true, mode: 0o700 });
  chmodBestEffort(path.dirname(runtime.configFile), 0o700);
  const tmp = `${runtime.configFile}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, body, { encoding: "utf8", mode: 0o600, flag: "wx" });
  chmodBestEffort(tmp, 0o600);
  fs.renameSync(tmp, runtime.configFile);
  chmodBestEffort(runtime.configFile, 0o600);
  return { configFile: runtime.configFile, hostname: new URL(runtime.liveOriginUrl).hostname.toLowerCase() };
};

export const isExpectedCloudflaredNamedTunnelProcess = (processInfo, tunnelId) => {
  const commandLine = String(processInfo?.commandLine || "").toLowerCase();
  const id = String(tunnelId || "").toLowerCase();
  return Boolean(id && commandLine.includes("cloudflared") && commandLine.includes("tunnel") && commandLine.includes("run") && commandLine.includes(id) && !commandLine.includes("--url"));
};

const inspectExistingCloudflared = (options = {}) => {
  const result = (options.spawnSyncImpl || spawnSync)("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", `
$items = Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
  [pscustomobject]@{ pid = [int]$_.ProcessId; commandLine = [string]$_.CommandLine }
}
@($items) | ConvertTo-Json -Compress
`], { encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0) return [];
  const text = String(result.stdout || "").trim();
  if (!text) return [];
  try { const value = JSON.parse(text); return Array.isArray(value) ? value : [value]; } catch { return []; }
};

export const waitForStableLiveOrigin = async (liveOriginUrl, options = {}) => {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") return false;
  const timeoutMs = Number(options.timeoutMs || 15_000);
  const intervalMs = Number(options.intervalMs || 750);
  const deadline = Date.now() + timeoutMs;
  const target = new URL("/miniapp.html", liveOriginUrl).toString();
  do {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(2500, Math.max(500, deadline - Date.now())));
    try {
      const response = await fetchImpl(target, { method: "GET", redirect: "follow", cache: "no-store", signal: controller.signal, headers: { accept: "text/html" } });
      const type = String(response.headers?.get?.("content-type") || "").toLowerCase();
      try { await response.body?.cancel?.(); } catch {}
      if (response.status === 200 && type.includes("text/html")) return true;
    } catch {} finally { clearTimeout(timer); }
    if (Date.now() >= deadline) break;
    await (options.sleepImpl || sleep)(intervalMs);
  } while (true);
  return false;
};

export const startOrReuseWindowsStableTunnel = async (preflight, options = {}) => {
  if (process.platform !== "win32" && options.allowNonWindows !== true) throw Object.assign(new Error("WINDOWS_STABLE_TUNNEL_LAUNCHER_REQUIRES_WINDOWS"), { code: "WINDOWS_STABLE_TUNNEL_LAUNCHER_REQUIRES_WINDOWS" });
  const ready = await (options.waitForGateway || waitForMiniAppGateway)({ host: "127.0.0.1", port: 4180, timeoutMs: boundedMs(options.gatewayTimeoutMs ?? process.env.KOUROSH_STABLE_TUNNEL_GATEWAY_WAIT_MS, 5_000) });
  if (!ready) throw Object.assign(new Error("MINIAPP_GATEWAY_NOT_READY"), { code: "MINIAPP_GATEWAY_NOT_READY" });
  const runtime = (options.resolveRuntime || resolveCloudflareNamedTunnelRuntime)(preflight, options);
  const processes = await (options.inspectExisting || inspectExistingCloudflared)(options);
  const existing = processes.find((item) => isExpectedCloudflaredNamedTunnelProcess(item, runtime.tunnelId));
  if (existing) return { action: "reuse", pid: Number(existing.pid) || null, liveOriginUrl: runtime.liveOriginUrl, tunnelId: runtime.tunnelId };
  const config = (options.writeConfig || writeCloudflareNamedTunnelRuntimeConfig)(runtime, options);
  const cloudflared = await (options.ensureCloudflared || ensureCloudflaredExecutable)({ rootDir: options.rootDir || defaultRootDir, allowNonWindows: options.allowNonWindows });
  const args = ["tunnel", "--config", runtime.configFile, "run", runtime.tunnelId];
  const child = (options.spawnImpl || spawn)(cloudflared.path, args, {
    cwd: options.rootDir || defaultRootDir,
    env: options.env || process.env,
    detached: false,
    stdio: options.stdio || "inherit",
    windowsHide: false,
  });
  child.once?.("error", (error) => (options.stderr || process.stderr).write(`[MINI APP STABLE TUNNEL] START_FAILED: ${String(error?.message || error)}\n`));
  child.unref?.();
  return { action: "started", pid: child.pid || null, liveOriginUrl: runtime.liveOriginUrl, tunnelId: runtime.tunnelId, configFile: config.configFile, source: cloudflared.source };
};

const main = async () => {
  process.stdout.write("\n============================================================\n");
  process.stdout.write("  KOUROSH MINI APP - STABLE PRODUCTION TUNNEL\n");
  process.stdout.write("============================================================\n\n");
  process.stdout.write("[INFO] Production stable tunnel exposes only 127.0.0.1:4180.\n");
  process.stdout.write("[INFO] Port 3001 is never a tunnel origin.\n");
  process.stdout.write("[INFO] Tunnel credentials remain local and are never printed.\n\n");
  const preflight = await waitForKouroshTunnelSyncPreflight({ timeoutMs: boundedMs(process.env.KOUROSH_STABLE_TUNNEL_PREFLIGHT_WAIT_MS, 5_000) });
  if (preflight?.startupAction !== "stable_tunnel") {
    process.stdout.write(`[STABLE TUNNEL] Skipped: startup action is ${String(preflight?.startupAction || "none")}.\n`);
    return;
  }
  const result = await startOrReuseWindowsStableTunnel(preflight);
  process.stdout.write(`[STABLE TUNNEL] ${result.action === "reuse" ? "Reusing" : "Started"} Cloudflare Named Tunnel${result.pid ? ` PID ${result.pid}` : ""}.\n`);
  process.stdout.write(`[LIVE ORIGIN] ${result.liveOriginUrl}\n`);
  const healthy = await waitForStableLiveOrigin(result.liveOriginUrl, { timeoutMs: boundedMs(process.env.KOUROSH_STABLE_TUNNEL_HEALTH_WAIT_MS, 8_000) });
  process.stdout.write(healthy ? "[STABLE TUNNEL] Live Origin is READY.\n" : "[STABLE TUNNEL] Live Origin health is not ready yet; Local Kourosh remains available.\n");
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`[MINI APP STABLE TUNNEL] ${String(error?.code || "START_FAILED")}: ${String(error?.message || "Stable tunnel failed.")}\n`);
    process.stderr.write("[MINI APP STABLE TUNNEL] Local Kourosh remains available.\n");
    process.exitCode = 1;
  });
}
