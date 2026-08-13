#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_TARGET_URL = "http://127.0.0.1:4180";
const CLOUDFLARED_WINDOWS_X64_URL = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe";
const QUICK_TUNNEL_URL_TOKEN_RE = /https:\/\/[^\s|"'<>]+/gi;
const QUICK_TUNNEL_SUCCESS_RE = /your quick tunnel has been created!/i;
const RESERVED_TRYCLOUDFLARE_HOSTS = new Set(["api.trycloudflare.com"]);
const TRANSIENT_QUICK_TUNNEL_FAILURE_RE = /(context deadline exceeded|client\.timeout|connection reset|connection refused|tls handshake timeout|i\/o timeout|temporary failure|temporarily unavailable|network is unreachable|unexpected eof)/i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const normalizeQuickTunnelMiniAppUrl = (value) => {
  const text = String(value || "");
  const candidates = text.match(QUICK_TUNNEL_URL_TOKEN_RE) || [];
  for (const token of candidates) {
    const cleaned = token.replace(/[),.;:!?]+$/g, "");
    try {
      const parsed = new URL(cleaned);
      const hostname = parsed.hostname.toLowerCase();
      if (parsed.protocol !== "https:") continue;
      if (!hostname.endsWith(".trycloudflare.com")) continue;
      if (hostname === "trycloudflare.com" || RESERVED_TRYCLOUDFLARE_HOSTS.has(hostname)) continue;
      if (!hostname.slice(0, -".trycloudflare.com".length)) continue;
      return `https://${hostname}/miniapp.html`;
    } catch {
      // Ignore malformed log tokens.
    }
  }
  return null;
};

export const isTransientQuickTunnelFailure = (value) => TRANSIENT_QUICK_TUNNEL_FAILURE_RE.test(String(value || ""));

export const createQuickTunnelOutputParser = () => {
  const buffers = { stdout: "", stderr: "" };
  let successMarkerSeen = false;
  let confirmedPublicUrl = null;

  const consumeLine = (line) => {
    if (QUICK_TUNNEL_SUCCESS_RE.test(line)) successMarkerSeen = true;
    if (!successMarkerSeen || confirmedPublicUrl) return confirmedPublicUrl;
    const candidate = normalizeQuickTunnelMiniAppUrl(line);
    if (candidate) confirmedPublicUrl = candidate;
    return confirmedPublicUrl;
  };

  const push = (chunk, stream = "stdout") => {
    const key = stream === "stderr" ? "stderr" : "stdout";
    buffers[key] += String(chunk || "");
    const lines = buffers[key].split(/\r?\n/);
    buffers[key] = lines.pop() || "";
    for (const line of lines) consumeLine(line);
    return confirmedPublicUrl;
  };

  const flush = (stream = "stdout") => {
    const key = stream === "stderr" ? "stderr" : "stdout";
    if (buffers[key]) consumeLine(buffers[key]);
    buffers[key] = "";
    return confirmedPublicUrl;
  };

  return {
    push,
    flush,
    get confirmedPublicUrl() { return confirmedPublicUrl; },
    get successMarkerSeen() { return successMarkerSeen; },
  };
};

export const isExpectedCloudflaredQuickTunnelProcess = (processInfo, targetUrl = DEFAULT_TARGET_URL) => {
  const commandLine = String(processInfo?.commandLine || "").toLowerCase();
  const normalizedTarget = String(targetUrl).toLowerCase();
  return Boolean(
    commandLine.includes("cloudflared")
    && commandLine.includes("tunnel")
    && commandLine.includes("--url")
    && commandLine.includes(normalizedTarget),
  );
};

const runPowerShellJson = (script, options = {}) => {
  const result = (options.spawnSyncImpl || spawnSync)(
    "powershell.exe",
    ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script],
    { cwd: options.rootDir || defaultRootDir, encoding: "utf8", windowsHide: true },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const error = new Error("WINDOWS_TUNNEL_PROCESS_INSPECTION_FAILED");
    error.code = "WINDOWS_TUNNEL_PROCESS_INSPECTION_FAILED";
    error.exitCode = result.status;
    throw error;
  }
  const text = String(result.stdout || "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    const error = new Error("WINDOWS_TUNNEL_PROCESS_INSPECTION_INVALID");
    error.code = "WINDOWS_TUNNEL_PROCESS_INSPECTION_INVALID";
    throw error;
  }
};

export const inspectExistingCloudflaredQuickTunnels = (options = {}) => runPowerShellJson(`
$items = Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
  [pscustomobject]@{
    pid = [int]$_.ProcessId
    name = [string]$_.Name
    commandLine = [string]$_.CommandLine
  }
}
@($items) | ConvertTo-Json -Compress
`, options);

const lookupCloudflaredOnPath = (options = {}) => {
  const result = (options.spawnSyncImpl || spawnSync)("where.exe", ["cloudflared.exe"], {
    cwd: options.rootDir || defaultRootDir,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error || result.status !== 0) return null;
  return String(result.stdout || "").split(/\r?\n/).map((line) => line.trim()).find(Boolean) || null;
};

export const resolveCloudflaredExecutable = (options = {}) => {
  const rootDir = options.rootDir || defaultRootDir;
  const exists = options.existsSync || fs.existsSync;
  const localExe = path.join(rootDir, "tools", "cloudflared", "cloudflared.exe");
  if (exists(localExe)) return { path: localExe, source: "local_tools" };
  const fromPath = (options.lookupPath || lookupCloudflaredOnPath)(options);
  if (fromPath && exists(fromPath)) return { path: fromPath, source: "path" };
  return null;
};

const downloadToFile = async (url, destination, options = {}) => {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw Object.assign(new Error("CLOUDFLARED_DOWNLOAD_FETCH_UNAVAILABLE"), { code: "CLOUDFLARED_DOWNLOAD_FETCH_UNAVAILABLE" });
  const response = await fetchImpl(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw Object.assign(new Error(`CLOUDFLARED_DOWNLOAD_FAILED: HTTP ${response.status}`), { code: "CLOUDFLARED_DOWNLOAD_FAILED", status: response.status });
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const tempPath = `${destination}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempPath, bytes, { mode: 0o700 });
  fs.renameSync(tempPath, destination);
};

export const ensureCloudflaredExecutable = async (options = {}) => {
  const resolved = resolveCloudflaredExecutable(options);
  if (resolved) return resolved;
  if (process.platform !== "win32" && options.allowNonWindows !== true) {
    throw Object.assign(new Error("WINDOWS_MINIAPP_TUNNEL_LAUNCHER_REQUIRES_WINDOWS"), { code: "WINDOWS_MINIAPP_TUNNEL_LAUNCHER_REQUIRES_WINDOWS" });
  }
  const rootDir = options.rootDir || defaultRootDir;
  const destination = path.join(rootDir, "tools", "cloudflared", "cloudflared.exe");
  await (options.downloadImpl || downloadToFile)(CLOUDFLARED_WINDOWS_X64_URL, destination, options);
  if (!(options.existsSync || fs.existsSync)(destination)) {
    throw Object.assign(new Error("CLOUDFLARED_DOWNLOAD_MISSING_OUTPUT"), { code: "CLOUDFLARED_DOWNLOAD_MISSING_OUTPUT" });
  }
  return { path: destination, source: "downloaded_official_windows_x64" };
};

export const waitForMiniAppGateway = async (options = {}) => {
  const host = options.host || "127.0.0.1";
  const port = Number(options.port || 4180);
  const timeoutMs = Number(options.timeoutMs || 30_000);
  const intervalMs = Number(options.intervalMs || 300);
  if (options.probe) {
    const deadline = Date.now() + timeoutMs;
    do {
      if (await options.probe(host, port)) return true;
      if (Date.now() >= deadline) return false;
      await sleep(intervalMs);
    } while (true);
  }
  const deadline = Date.now() + timeoutMs;
  do {
    const ready = await new Promise((resolve) => {
      const socket = net.createConnection({ host, port });
      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(ok);
      };
      socket.once("connect", () => done(true));
      socket.once("error", () => done(false));
      socket.setTimeout(700, () => done(false));
    });
    if (ready) return true;
    if (Date.now() >= deadline) return false;
    await sleep(intervalMs);
  } while (true);
};

const isValidSavedQuickTunnelUrl = (value) => normalizeQuickTunnelMiniAppUrl(value) === String(value || "").trim();

const copyToWindowsClipboard = (text, options = {}) => {
  try {
    const result = (options.spawnSyncImpl || spawnSync)("clip.exe", [], { input: String(text), windowsHide: true });
    return !result.error && result.status === 0;
  } catch {
    return false;
  }
};

const printPublicUrl = (publicUrl, urlFile, options = {}) => {
  const out = options.stdout || process.stdout;
  out.write("\n============================================================\n");
  out.write("  MINI APP PUBLIC HTTPS URL\n");
  out.write("============================================================\n\n");
  out.write(`${publicUrl}\n\n`);
  const copied = (options.copyClipboard || copyToWindowsClipboard)(publicUrl, options);
  out.write(copied ? "[OK] URL copied to clipboard.\n" : "[INFO] Clipboard copy was unavailable.\n");
  out.write(`[OK] URL saved to: ${urlFile}\n`);
  out.write("[ACTION] Paste this URL into Mini App Public HTTPS URL in Kourosh Settings.\n\n");
};

export const runCloudflaredQuickTunnel = (options = {}) => new Promise((resolve, reject) => {
  const rootDir = options.rootDir || defaultRootDir;
  const targetUrl = options.targetUrl || DEFAULT_TARGET_URL;
  const urlFile = options.urlFile || path.join(rootDir, "miniapp_public_url.txt");
  const logFile = options.logFile || path.join(rootDir, ".kourosh-runtime", "miniapp", "cloudflared-quick-tunnel.log");
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.rmSync(urlFile, { force: true });
  fs.rmSync(logFile, { force: true });

  const child = (options.spawnImpl || spawn)(options.cloudflaredExe, ["tunnel", "--no-autoupdate", "--url", targetUrl], {
    cwd: rootDir,
    windowsHide: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const parser = createQuickTunnelOutputParser();
  let publicUrl = null;
  let settled = false;
  let outputTail = "";

  const rememberOutput = (text) => {
    outputTail = `${outputTail}${text}`.slice(-32_768);
  };
  const publishConfirmedUrl = (candidate) => {
    if (!candidate || publicUrl) return;
    publicUrl = candidate;
    fs.writeFileSync(urlFile, `${publicUrl}\r\n`, { encoding: "ascii", mode: 0o600 });
    printPublicUrl(publicUrl, urlFile, options);
    options.onPublicUrl?.(publicUrl);
  };
  const consume = (chunk, stream) => {
    const text = String(chunk);
    fs.appendFileSync(logFile, text, "utf8");
    rememberOutput(text);
    (stream === "stderr" ? (options.stderr || process.stderr) : (options.stdout || process.stdout)).write(text);
    publishConfirmedUrl(parser.push(text, stream));
  };
  const flush = (stream) => publishConfirmedUrl(parser.flush(stream));

  child.stdout?.on("data", (chunk) => consume(chunk, "stdout"));
  child.stderr?.on("data", (chunk) => consume(chunk, "stderr"));
  child.stdout?.once("end", () => flush("stdout"));
  child.stderr?.once("end", () => flush("stderr"));
  child.once("error", (error) => {
    if (settled) return;
    settled = true;
    fs.rmSync(urlFile, { force: true });
    error.publicUrl = null;
    error.retryable = false;
    reject(error);
  });
  child.once("close", (code, signal) => {
    if (settled) return;
    settled = true;
    flush("stdout");
    flush("stderr");
    const exitCode = Number.isInteger(code) ? code : 1;
    if (exitCode !== 0) {
      fs.rmSync(urlFile, { force: true });
      const error = new Error(`CLOUDFLARED_EXITED: code ${exitCode}${signal ? ` signal ${signal}` : ""}`);
      error.code = "CLOUDFLARED_EXITED";
      error.exitCode = exitCode;
      error.publicUrl = null;
      error.retryable = isTransientQuickTunnelFailure(outputTail);
      reject(error);
      return;
    }
    if (!publicUrl) {
      fs.rmSync(urlFile, { force: true });
      const error = new Error("QUICK_TUNNEL_PUBLIC_URL_NOT_CONFIRMED");
      error.code = "QUICK_TUNNEL_PUBLIC_URL_NOT_CONFIRMED";
      error.exitCode = 1;
      error.publicUrl = null;
      error.retryable = isTransientQuickTunnelFailure(outputTail);
      reject(error);
      return;
    }
    resolve({ exitCode, publicUrl, urlFile, logFile });
  });
});

export const startOrReuseWindowsMiniAppTunnel = async (options = {}) => {
  if (process.platform !== "win32" && options.allowNonWindows !== true) {
    throw Object.assign(new Error("WINDOWS_MINIAPP_TUNNEL_LAUNCHER_REQUIRES_WINDOWS"), { code: "WINDOWS_MINIAPP_TUNNEL_LAUNCHER_REQUIRES_WINDOWS" });
  }
  const rootDir = options.rootDir || defaultRootDir;
  const targetUrl = options.targetUrl || DEFAULT_TARGET_URL;
  const urlFile = options.urlFile || path.join(rootDir, "miniapp_public_url.txt");
  const ready = await (options.waitForGateway || waitForMiniAppGateway)({ host: "127.0.0.1", port: 4180, timeoutMs: options.gatewayTimeoutMs || 30_000 });
  if (!ready) {
    throw Object.assign(new Error("MINIAPP_GATEWAY_NOT_READY: 127.0.0.1:4180"), { code: "MINIAPP_GATEWAY_NOT_READY" });
  }

  const processes = await (options.inspectExisting || inspectExistingCloudflaredQuickTunnels)({ rootDir });
  const existing = processes.find((item) => isExpectedCloudflaredQuickTunnelProcess(item, targetUrl));
  if (existing) {
    const savedUrl = fs.existsSync(urlFile) ? fs.readFileSync(urlFile, "utf8").trim() : "";
    if (isValidSavedQuickTunnelUrl(savedUrl)) {
      printPublicUrl(savedUrl, urlFile, options);
      return { action: "reuse", pid: Number(existing.pid) || null, publicUrl: savedUrl };
    }
    const error = new Error(`MINIAPP_TUNNEL_ALREADY_RUNNING_URL_UNKNOWN: PID ${Number(existing.pid) || "unknown"}`);
    error.code = "MINIAPP_TUNNEL_ALREADY_RUNNING_URL_UNKNOWN";
    error.ownerPid = Number(existing.pid) || null;
    throw error;
  }

  const cloudflared = await (options.ensureCloudflared || ensureCloudflaredExecutable)({ rootDir, allowNonWindows: options.allowNonWindows });
  const runTunnel = options.runTunnel || runCloudflaredQuickTunnel;
  const maxAttempts = Math.max(1, Math.min(3, Number(options.maxAttempts || 3)));
  const retryDelaysMs = Array.isArray(options.retryDelaysMs) ? options.retryDelaysMs : [2_000, 4_000];
  const sleepImpl = options.sleepImpl || sleep;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await runTunnel({
        rootDir,
        cloudflaredExe: cloudflared.path,
        targetUrl,
        urlFile,
        logFile: options.logFile,
        ...options.runOptions,
      });
      return { action: "started", source: cloudflared.source, attempts: attempt, ...result };
    } catch (error) {
      lastError = error;
      fs.rmSync(urlFile, { force: true });
      const retryable = error?.retryable === true;
      if (!retryable || attempt >= maxAttempts) {
        if (retryable && attempt >= maxAttempts) {
          error.attempts = attempt;
          error.quickTunnelAttemptsExhausted = true;
        }
        throw error;
      }
      const delayMs = Number(retryDelaysMs[attempt - 1] ?? retryDelaysMs.at(-1) ?? 0);
      (options.stderr || process.stderr).write(`[MINI APP TUNNEL] Transient Quick Tunnel failure on attempt ${attempt}/${maxAttempts}; retrying in ${Math.max(0, delayMs)}ms.\n`);
      if (delayMs > 0) await sleepImpl(delayMs);
    }
  }
  throw lastError || Object.assign(new Error("QUICK_TUNNEL_CREATION_FAILED"), { code: "QUICK_TUNNEL_CREATION_FAILED" });
};

const main = async () => {
  process.stdout.write("\n============================================================\n");
  process.stdout.write("  KOUROSH MINI APP - OPTIONAL CLOUDFLARE QUICK TUNNEL\n");
  process.stdout.write("============================================================\n\n");
  process.stdout.write(`[TARGET] ${DEFAULT_TARGET_URL}\n`);
  process.stdout.write("[INFO] Cloudflare Quick Tunnel is a Windows development/test helper only.\n");
  process.stdout.write("[INFO] Kourosh Core remains provider-independent and works without this helper.\n\n");
  const result = await startOrReuseWindowsMiniAppTunnel();
  if (result.action === "reuse") process.stdout.write(`[REUSE] Existing Quick Tunnel PID ${result.pid || "unknown"}.\n`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    if (error?.quickTunnelAttemptsExhausted) {
      process.stderr.write(`[MINI APP TUNNEL] Quick Tunnel creation failed after ${Number(error.attempts) || 3} attempts.\n`);
      process.stderr.write("[MINI APP TUNNEL] No public Mini App URL was created.\n");
      process.stderr.write("[MINI APP TUNNEL] Local Kourosh remains available.\n");
    }
    process.stderr.write(`[MINI APP TUNNEL] ${String(error?.code || "START_FAILED")}: ${String(error?.message || "Tunnel helper failed.")}\n`);
    if (error?.exitCode !== undefined) process.stderr.write(`[MINI APP TUNNEL] cloudflared exit code: ${error.exitCode}\n`);
    process.exitCode = Number.isInteger(error?.exitCode) && error.exitCode !== 0 ? error.exitCode : 1;
  });
}
