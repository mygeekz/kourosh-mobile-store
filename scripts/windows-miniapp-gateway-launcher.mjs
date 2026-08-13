#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gatewayScript = path.join(rootDir, "scripts", "serve-miniapp-gateway.mjs");
const gatewayPort = Number(process.env.KOUROSH_MINIAPP_GATEWAY_PORT || 4180);

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

export const ensureWindowsMiniAppGateway = async (options = {}) => {
  if (process.platform !== "win32" && options.allowNonWindows !== true) {
    const error = new Error("WINDOWS_MINIAPP_GATEWAY_LAUNCHER_REQUIRES_WINDOWS");
    error.code = "WINDOWS_MINIAPP_GATEWAY_LAUNCHER_REQUIRES_WINDOWS";
    throw error;
  }

  const inspect = options.inspectPortOwner || inspectWindowsGatewayPortOwner;
  const current = await inspect(gatewayPort);
  if (current?.listening) {
    if (isExpectedKouroshMiniAppGatewayProcess(current)) {
      return { action: "reuse", pid: Number(current.pid) || null };
    }
    const error = new Error(`MINIAPP_GATEWAY_PORT_IN_USE: port ${gatewayPort} is owned by PID ${Number(current?.pid) || "unknown"} (${String(current?.name || "unknown")}).`);
    error.code = "MINIAPP_GATEWAY_PORT_IN_USE";
    error.ownerPid = Number(current?.pid) || null;
    error.ownerName = String(current?.name || "unknown");
    throw error;
  }

  const child = (options.spawnGateway || spawn)(process.execPath, [gatewayScript], {
    cwd: rootDir,
    env: {
      ...process.env,
      // A fresh Store may start the Gateway before Public Access is configured.
      // Runtime config, once written by Settings, takes precedence and is read live.
      KOUROSH_MINIAPP_GATEWAY_MODE: process.env.KOUROSH_MINIAPP_GATEWAY_MODE || "disabled",
    },
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref?.();

  const listening = await (options.waitForPort || waitForPort)(gatewayPort);
  if (!listening) {
    const error = new Error("MINIAPP_GATEWAY_START_TIMEOUT");
    error.code = "MINIAPP_GATEWAY_START_TIMEOUT";
    throw error;
  }

  const owner = await inspect(gatewayPort);
  if (!owner?.listening || !isExpectedKouroshMiniAppGatewayProcess(owner)) {
    const error = new Error(`MINIAPP_GATEWAY_PORT_IN_USE: port ${gatewayPort} became owned by an unexpected process.`);
    error.code = "MINIAPP_GATEWAY_PORT_IN_USE";
    error.ownerPid = Number(owner?.pid) || null;
    error.ownerName = String(owner?.name || "unknown");
    throw error;
  }
  return { action: "started", pid: Number(owner.pid) || child.pid || null };
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
