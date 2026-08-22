#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gatewayScript = path.join(rootDir, "scripts", "serve-miniapp-gateway.mjs");
const gatewayPort = Number(process.env.KOUROSH_MINIAPP_GATEWAY_PORT || 4180);
export const EXPECTED_MINIAPP_GATEWAY_RUNTIME_VERSION = "v197";

const normalizeWindowsPath = (value) => String(value || "")
  .trim()
  .replace(/\\/g, "/")
  .replace(/\"/g, "")
  .toLowerCase();

export const isExpectedKouroshMiniAppGatewayProcess = (processInfo, expectedScript = gatewayScript) => {
  const commandLine = normalizeWindowsPath(processInfo?.commandLine);
  const normalizedExpected = normalizeWindowsPath(expectedScript);
  return Boolean(commandLine && normalizedExpected && commandLine.includes(normalizedExpected));
};

const runPowerShellJson = (script) => {
  const result = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const error = new Error("WINDOWS_GATEWAY_PORT_INSPECTION_FAILED");
    error.code = "WINDOWS_GATEWAY_PORT_INSPECTION_FAILED";
    error.exitCode = result.status;
    throw error;
  }
  const text = String(result.stdout || "").trim();
  if (!text) return null;
  try { return JSON.parse(text); } catch {
    const error = new Error("WINDOWS_GATEWAY_PORT_INSPECTION_INVALID");
    error.code = "WINDOWS_GATEWAY_PORT_INSPECTION_INVALID";
    throw error;
  }
};

export const inspectWindowsGatewayPortOwner = (port = gatewayPort) => runPowerShellJson(`
$connection = Get-NetTCPConnection -State Listen -LocalPort ${Number(port)} -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -eq $connection) {
  [pscustomobject]@{ listening = $false } | ConvertTo-Json -Compress
  exit 0
}
$owner = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $connection.OwningProcess) -ErrorAction SilentlyContinue
[pscustomobject]@{
  listening = $true
  pid = [int]$connection.OwningProcess
  name = [string]$owner.Name
  commandLine = [string]$owner.CommandLine
} | ConvertTo-Json -Compress
`);

export const probeMiniAppGatewayRuntimeVersion = (port = gatewayPort, options = {}) => new Promise((resolve) => {
  const request = (options.httpRequest || http.request)({
    host: "127.0.0.1",
    port,
    path: "/healthz",
    method: "GET",
    timeout: Number(options.timeoutMs || 1_500),
    headers: { Host: `127.0.0.1:${port}`, Connection: "close" },
  }, (response) => {
    response.resume();
    response.once("end", () => resolve(String(response.headers["x-kourosh-gateway-version"] || "").trim() || null));
  });
  request.once("timeout", () => { request.destroy(); resolve(null); });
  request.once("error", () => resolve(null));
  request.end();
});

export const stopExpectedWindowsGatewayProcess = (pid, options = {}) => {
  if (!Number.isSafeInteger(Number(pid)) || Number(pid) <= 0) {
    const error = new Error("MINIAPP_GATEWAY_PROCESS_ID_INVALID");
    error.code = "MINIAPP_GATEWAY_PROCESS_ID_INVALID";
    throw error;
  }
  const runner = options.spawnSyncImpl || spawnSync;
  const result = runner("powershell.exe", [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-Command",
    `Stop-Process -Id ${Number(pid)} -Force -ErrorAction Stop`,
  ], { cwd: rootDir, encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0) {
    const error = new Error("MINIAPP_GATEWAY_INCOMPATIBLE_PROCESS_STOP_FAILED");
    error.code = "MINIAPP_GATEWAY_INCOMPATIBLE_PROCESS_STOP_FAILED";
    error.exitCode = result.status;
    throw error;
  }
};

const waitForPort = (port, timeoutMs = 8_000) => new Promise((resolve) => {
  const deadline = Date.now() + timeoutMs;
  const probe = () => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (ok || Date.now() >= deadline) resolve(ok);
      else setTimeout(probe, 120);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(500, () => finish(false));
  };
  probe();
});

const waitForPortRelease = (port, timeoutMs = 5_000) => new Promise((resolve) => {
  const deadline = Date.now() + timeoutMs;
  const probe = () => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    let settled = false;
    const finish = (listening) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (!listening) resolve(true);
      else if (Date.now() >= deadline) resolve(false);
      else setTimeout(probe, 120);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(500, () => finish(false));
  };
  probe();
});

export const ensureWindowsMiniAppGateway = async (options = {}) => {
  if (process.platform !== "win32" && options.allowNonWindows !== true) {
    const error = new Error("WINDOWS_MINIAPP_GATEWAY_LAUNCHER_REQUIRES_WINDOWS");
    error.code = "WINDOWS_MINIAPP_GATEWAY_LAUNCHER_REQUIRES_WINDOWS";
    throw error;
  }

  const port = Number(options.gatewayPort || gatewayPort);
  const expectedVersion = String(options.expectedVersion || EXPECTED_MINIAPP_GATEWAY_RUNTIME_VERSION);
  const inspect = options.inspectPortOwner || inspectWindowsGatewayPortOwner;
  const probeVersion = options.probeVersion || probeMiniAppGatewayRuntimeVersion;
  let restartReason = null;
  const current = await inspect(port);
  if (current?.listening) {
    if (isExpectedKouroshMiniAppGatewayProcess(current)) {
      const runningVersion = await probeVersion(port, options);
      if (runningVersion === expectedVersion) {
        return { action: "reuse", pid: Number(current.pid) || null, version: runningVersion };
      }
      // The command line proves this is Kourosh's own Gateway. A missing or old
      // version header means an already-running process still has pre-update
      // code loaded, so it is safe and necessary to replace only that PID.
      await (options.stopExpectedProcess || stopExpectedWindowsGatewayProcess)(Number(current.pid), options);
      const released = await (options.waitForPortRelease || waitForPortRelease)(port);
      if (!released) {
        const error = new Error("MINIAPP_GATEWAY_INCOMPATIBLE_PROCESS_DID_NOT_STOP");
        error.code = "MINIAPP_GATEWAY_INCOMPATIBLE_PROCESS_DID_NOT_STOP";
        throw error;
      }
      restartReason = runningVersion ? "version_mismatch" : "version_missing";
    } else {
      const error = new Error(`MINIAPP_GATEWAY_PORT_IN_USE: port ${port} is owned by PID ${Number(current?.pid) || "unknown"} (${String(current?.name || "unknown")}).`);
      error.code = "MINIAPP_GATEWAY_PORT_IN_USE";
      error.ownerPid = Number(current?.pid) || null;
      error.ownerName = String(current?.name || "unknown");
      throw error;
    }
  }

  const child = (options.spawnGateway || spawn)(process.execPath, [gatewayScript], {
    cwd: rootDir,
    env: {
      ...process.env,
      KOUROSH_MINIAPP_GATEWAY_PORT: String(port),
      // A fresh Store may start the Gateway before Public Access is configured.
      // Runtime config, once written by Settings, takes precedence and is read live.
      KOUROSH_MINIAPP_GATEWAY_MODE: process.env.KOUROSH_MINIAPP_GATEWAY_MODE || "disabled",
    },
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref?.();

  const listening = await (options.waitForPort || waitForPort)(port);
  if (!listening) {
    const error = new Error("MINIAPP_GATEWAY_START_TIMEOUT");
    error.code = "MINIAPP_GATEWAY_START_TIMEOUT";
    throw error;
  }

  const owner = await inspect(port);
  if (!owner?.listening || !isExpectedKouroshMiniAppGatewayProcess(owner)) {
    const error = new Error(`MINIAPP_GATEWAY_PORT_IN_USE: port ${port} became owned by an unexpected process.`);
    error.code = "MINIAPP_GATEWAY_PORT_IN_USE";
    error.ownerPid = Number(owner?.pid) || null;
    error.ownerName = String(owner?.name || "unknown");
    throw error;
  }
  const startedVersion = await probeVersion(port, options);
  if (startedVersion !== expectedVersion) {
    const error = new Error("MINIAPP_GATEWAY_RUNTIME_VERSION_MISMATCH");
    error.code = "MINIAPP_GATEWAY_RUNTIME_VERSION_MISMATCH";
    error.expectedVersion = expectedVersion;
    error.actualVersion = startedVersion;
    throw error;
  }
  return {
    action: restartReason ? "restarted_incompatible" : "started",
    pid: Number(owner.pid) || child.pid || null,
    version: startedVersion,
    restartReason,
  };
};

const main = async () => {
  const result = await ensureWindowsMiniAppGateway();
  const label = result.action === "reuse" ? "REUSE" : "STARTED";
  process.stdout.write(`[MINI APP GATEWAY] ${label}${result.pid ? ` PID ${result.pid}` : ""}\n`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`[MINI APP GATEWAY] ${String(error?.code || "START_FAILED")}: ${String(error?.message || "Gateway startup failed.")}\n`);
    process.exitCode = 1;
  });
}
