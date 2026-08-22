#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ensureMiniAppBuild } from "./ensure-miniapp-build.mjs";
import { ensureWindowsMiniAppGateway } from "./windows-miniapp-gateway-launcher.mjs";
import { waitForKouroshTunnelSyncPreflight } from "./windows-miniapp-tunnel-launcher.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const quickTunnelLauncher = path.join(rootDir, "scripts", "windows-miniapp-tunnel-launcher.mjs");
const stableTunnelLauncher = path.join(rootDir, "scripts", "windows-miniapp-stable-tunnel-launcher.mjs");
const tunnelBat = path.join(rootDir, "start_tunnel.bat");
const DEFAULT_BACKEND_PORT_WAIT_MS = 30_000;
const DEFAULT_PREFLIGHT_WAIT_MS = 5_000;

const parsePositiveMs = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const probeLoopbackTcp = ({ host = "127.0.0.1", port = 3001, timeoutMs = 750 } = {}) => new Promise((resolve) => {
  const socket = net.createConnection({ host, port });
  let settled = false;
  const finish = (ready) => {
    if (settled) return;
    settled = true;
    socket.destroy();
    resolve(Boolean(ready));
  };
  socket.setTimeout(timeoutMs, () => finish(false));
  socket.once("connect", () => finish(true));
  socket.once("error", () => finish(false));
});

export const waitForLoopbackBackendPort = async (options = {}) => {
  const timeoutMs = parsePositiveMs(options.timeoutMs, DEFAULT_BACKEND_PORT_WAIT_MS);
  const intervalMs = parsePositiveMs(options.intervalMs, 300);
  const probe = options.probe || probeLoopbackTcp;
  const sleepImpl = options.sleepImpl || sleep;
  const deadline = Date.now() + timeoutMs;
  do {
    if (await probe({ host: options.host || "127.0.0.1", port: Number(options.port || 3001) })) return true;
    if (Date.now() >= deadline) break;
    await sleepImpl(intervalMs);
  } while (true);
  const error = new Error("KOUROSH_BACKEND_PORT_NOT_READY");
  error.code = "KOUROSH_BACKEND_PORT_NOT_READY";
  throw error;
};

const describeError = (error) => {
  const primary = String(error?.code || error?.message || "UNKNOWN");
  const cause = error?.cause ? String(error.cause?.message || error.cause?.code || error.cause) : "";
  return cause && !primary.includes(cause) ? `${primary} (${cause})` : primary;
};

export const coordinateWindowsMiniAppStartup = async (options = {}) => {
  const out = options.stdout || process.stdout;
  const err = options.stderr || process.stderr;
  const waitForPort = options.waitForBackendPort || waitForLoopbackBackendPort;
  const waitForPreflight = options.waitForPreflight || options.waitForBackend || waitForKouroshTunnelSyncPreflight;
  const ensureBuild = options.ensureMiniAppBuild || ensureMiniAppBuild;
  const ensureGateway = options.ensureGateway || ensureWindowsMiniAppGateway;
  const exists = options.existsSync || fs.existsSync;
  const spawnImpl = options.spawnImpl || spawn;
  const portWaitMs = parsePositiveMs(
    options.backendPortWaitMs ?? options.backendWaitMs ?? process.env.KOUROSH_MINIAPP_BACKEND_WAIT_MS,
    DEFAULT_BACKEND_PORT_WAIT_MS,
  );
  const preflightWaitMs = parsePositiveMs(
    options.preflightWaitMs ?? process.env.KOUROSH_MINIAPP_PREFLIGHT_WAIT_MS,
    DEFAULT_PREFLIGHT_WAIT_MS,
  );

  out.write(`[MINI APP] Waiting for Local Backend port 3001 (max ${Math.round(portWaitMs / 1000)}s)...\n`);
  try {
    await waitForPort({ timeoutMs: portWaitMs, host: "127.0.0.1", port: 3001 });
  } catch (error) {
    err.write(`[MINI APP] Local Backend port did not become ready: ${describeError(error)}\n`);
    err.write("[MINI APP] Local Dashboard/PWA continues; Gateway/Tunnel auto-start was skipped.\n");
    return { backendReady: false, preflightReady: false, gateway: "skipped", tunnel: "skipped" };
  }

  out.write(`[MINI APP] Backend port is ready. Checking public-URL sync service (max ${Math.round(preflightWaitMs / 1000)}s)...\n`);
  let preflight;
  try {
    preflight = await waitForPreflight({ timeoutMs: preflightWaitMs });
  } catch (error) {
    err.write(`[MINI APP] Backend sync service check failed: ${describeError(error)}\n`);
    err.write("[MINI APP] Local Dashboard/PWA continues; Gateway/Tunnel auto-start was skipped.\n");
    return { backendReady: true, preflightReady: false, gateway: "skipped", tunnel: "skipped" };
  }

  out.write("[MINI APP] Backend sync service is ready. Checking standalone Mini App production bundle...\n");
  let buildResult;
  try {
    buildResult = ensureBuild({ stdout: out, stderr: err });
    if (buildResult?.action === "error") throw Object.assign(new Error("MINIAPP_PRODUCTION_BUNDLE_NOT_READY"), { code: "MINIAPP_PRODUCTION_BUNDLE_NOT_READY" });
  } catch (error) {
    err.write(`[MINI APP] Production bundle preparation failed: ${describeError(error)}\n`);
    err.write("[MINI APP] Local Dashboard/PWA continues; Gateway/Tunnel auto-start was skipped.\n");
    return { backendReady: true, preflightReady: true, miniAppBuild: "error", gateway: "skipped", tunnel: "skipped" };
  }

  out.write("[MINI APP] Production bundle is ready. Ensuring Gateway on 127.0.0.1:4180...\n");
  let gatewayResult;
  try {
    gatewayResult = await ensureGateway(options.gatewayOptions || {});
    out.write(`[MINI APP GATEWAY] ${String(gatewayResult?.action || "ready").toUpperCase()}${gatewayResult?.pid ? ` PID ${gatewayResult.pid}` : ""}\n`);
  } catch (error) {
    err.write(`[MINI APP GATEWAY] ${String(error?.code || "START_FAILED")}: ${String(error?.message || "Gateway startup failed.")}\n`);
    err.write("[MINI APP] Local Dashboard/PWA continues; external Tunnel was not started.\n");
    return { backendReady: true, preflightReady: true, miniAppBuild: buildResult?.action || "ready", gateway: "error", tunnel: "skipped" };
  }

  if (String((options.skipTunnel ?? process.env.KOUROSH_SKIP_MINIAPP_TUNNEL) || "") === "1") {
    out.write("[MINI APP TUNNEL] Skipped by KOUROSH_SKIP_MINIAPP_TUNNEL=1.\n");
    return { backendReady: true, preflightReady: true, miniAppBuild: buildResult?.action || "ready", gateway: gatewayResult?.action || "ready", tunnel: "skipped" };
  }

  const startupAction = String(preflight?.startupAction || (preflight?.allowed === true ? "quick_tunnel" : "none"));
  if (startupAction === "none") {
    out.write(`[MINI APP TUNNEL] Skipped: Mini App mode ${String(preflight?.protectedMode || "protected")} does not require Kourosh-managed tunnel startup.\n`);
    return { backendReady: true, preflightReady: true, miniAppBuild: buildResult?.action || "ready", gateway: gatewayResult?.action || "ready", tunnel: preflight?.protectedMode ? "protected" : "skipped" };
  }

  const selectedLauncher = startupAction === "stable_tunnel" ? stableTunnelLauncher : quickTunnelLauncher;
  const selectedLabel = startupAction === "stable_tunnel" ? "stable production" : "temporary diagnostic";
  if ((startupAction === "quick_tunnel" && !exists(tunnelBat)) || !exists(selectedLauncher)) {
    out.write(`[MINI APP TUNNEL] ${selectedLabel} Tunnel helper not found; Local runtime continues without Tunnel.\n`);
    return { backendReady: true, preflightReady: true, miniAppBuild: buildResult?.action || "ready", gateway: gatewayResult?.action || "ready", tunnel: "missing" };
  }

  out.write(`[MINI APP TUNNEL] Starting ${selectedLabel} HTTPS Tunnel after Backend/Gateway readiness...\n`);
  const child = spawnImpl(process.execPath, [selectedLauncher], {
    cwd: rootDir,
    env: {
      ...process.env,
      KOUROSH_STABLE_TUNNEL_PREFLIGHT_WAIT_MS: process.env.KOUROSH_STABLE_TUNNEL_PREFLIGHT_WAIT_MS || "5000",
      KOUROSH_STABLE_TUNNEL_GATEWAY_WAIT_MS: process.env.KOUROSH_STABLE_TUNNEL_GATEWAY_WAIT_MS || "5000",
      KOUROSH_STABLE_TUNNEL_HEALTH_WAIT_MS: process.env.KOUROSH_STABLE_TUNNEL_HEALTH_WAIT_MS || "8000",
    },
    detached: false,
    stdio: "inherit",
    windowsHide: false,
  });
  child.once?.("error", (error) => {
    err.write(`[MINI APP TUNNEL] START_FAILED: ${String(error?.message || error)}\n`);
  });
  child.unref?.();
  return { backendReady: true, preflightReady: true, miniAppBuild: buildResult?.action || "ready", gateway: gatewayResult?.action || "ready", tunnel: startupAction === "stable_tunnel" ? "stable_started" : "started", pid: child.pid || null };
};

const main = async () => {
  if (process.platform !== "win32") {
    process.stderr.write("[MINI APP] windows-miniapp-startup-coordinator requires Windows.\n");
    process.exitCode = 1;
    return;
  }
  await coordinateWindowsMiniAppStartup();
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`[MINI APP] STARTUP_COORDINATOR_FAILED: ${String(error?.message || error)}\n`);
    process.exitCode = 1;
  });
}
