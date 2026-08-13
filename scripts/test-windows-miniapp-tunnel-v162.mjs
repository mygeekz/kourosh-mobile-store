import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";

import {
  createQuickTunnelOutputParser,
  ensureCloudflaredExecutable,
  isExpectedCloudflaredQuickTunnelProcess,
  isTransientQuickTunnelFailure,
  normalizeQuickTunnelMiniAppUrl,
  resolveCloudflaredExecutable,
  runCloudflaredQuickTunnel,
  startOrReuseWindowsMiniAppTunnel,
  waitForMiniAppGateway,
} from "./windows-miniapp-tunnel-launcher.mjs";
import {
  ensureWindowsMiniAppGateway,
  isExpectedKouroshMiniAppGatewayProcess,
} from "./windows-miniapp-gateway-launcher.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "kourosh-v162-tunnel-correction2-"));
const silent = { write() {} };

const fakeCloudflared = ({ stderrText = "", stdoutText = "", stderrChunks = null, stdoutChunks = null, exitCode = 0 }) => {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  queueMicrotask(() => {
    const writeChunks = (stream, chunks, text) => {
      const items = chunks || (text ? [text] : []);
      for (const item of items) stream.write(item);
      stream.end();
    };
    writeChunks(child.stdout, stdoutChunks, stdoutText);
    writeChunks(child.stderr, stderrChunks, stderrText);
    setImmediate(() => {
      child.emit("exit", exitCode, null);
      child.emit("close", exitCode, null);
    });
  });
  return child;
};

const REAL_WINDOWS_FAILURE = [
  "2026-08-13T10:09:09Z INF Requesting new quick Tunnel on trycloudflare.com...",
  'failed to request quick Tunnel: Post "https://api.trycloudflare.com/tunnel": context deadline exceeded (Client.Timeout exceeded while awaiting headers)',
  "",
].join("\n");

const REAL_SUCCESS = [
  "2026 INF Your quick Tunnel has been created!",
  "2026 INF | https://example-random-host.trycloudflare.com |",
  "",
].join("\n");

try {
  // Candidate normalization rejects Cloudflare API/control URLs while preserving generated hosts.
  assert.equal(normalizeQuickTunnelMiniAppUrl("https://Alpha-Bravo.trycloudflare.com"), "https://alpha-bravo.trycloudflare.com/miniapp.html");
  assert.equal(normalizeQuickTunnelMiniAppUrl("https://alpha-bravo.trycloudflare.com/miniapp.html"), "https://alpha-bravo.trycloudflare.com/miniapp.html");
  assert.equal(normalizeQuickTunnelMiniAppUrl("https://alpha-bravo.trycloudflare.com/miniapp.html/miniapp.html"), "https://alpha-bravo.trycloudflare.com/miniapp.html");
  assert.equal(normalizeQuickTunnelMiniAppUrl("https://api.trycloudflare.com/tunnel"), null);
  assert.equal(normalizeQuickTunnelMiniAppUrl("https://api.trycloudflare.com/"), null);
  assert.equal(normalizeQuickTunnelMiniAppUrl("https://api.trycloudflare.com"), null);
  assert.equal(normalizeQuickTunnelMiniAppUrl(REAL_WINDOWS_FAILURE), null);
  assert.equal(normalizeQuickTunnelMiniAppUrl("https://example.com"), null);

  // Stateful parser requires Cloudflare's confirmed-creation marker before publishing a generated hostname.
  const parser = createQuickTunnelOutputParser();
  assert.equal(parser.push("2026 INF unrelated https://not-confirmed.trycloudflare.com\n", "stderr"), null);
  assert.equal(parser.push("2026 INF Your quick Tun", "stderr"), null);
  assert.equal(parser.push("nel has been created!\n2026 INF | https://chunk-bound", "stderr"), null);
  assert.equal(parser.push("ary-host.trycloudflare.com |\n", "stderr"), "https://chunk-boundary-host.trycloudflare.com/miniapp.html");

  // Discovery order: local tools first, then PATH, then the official Windows x64 download helper.
  const localExe = path.join(temp, "tools", "cloudflared", "cloudflared.exe");
  fs.mkdirSync(path.dirname(localExe), { recursive: true }); fs.writeFileSync(localExe, "local");
  assert.deepEqual(resolveCloudflaredExecutable({ rootDir: temp, lookupPath: () => { throw new Error("PATH must not run when local tool exists"); } }), { path: localExe, source: "local_tools" });
  fs.rmSync(localExe, { force: true });
  const pathExe = path.join(temp, "path-cloudflared.exe"); fs.writeFileSync(pathExe, "path");
  assert.deepEqual(resolveCloudflaredExecutable({ rootDir: temp, lookupPath: () => pathExe }), { path: pathExe, source: "path" });
  fs.rmSync(pathExe, { force: true });
  let downloadUrl = "";
  const downloaded = await ensureCloudflaredExecutable({
    allowNonWindows: true, rootDir: temp, lookupPath: () => null,
    downloadImpl: async (url, destination) => { downloadUrl = url; fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, "downloaded"); },
  });
  assert.equal(downloaded.source, "downloaded_official_windows_x64");
  assert.match(downloadUrl, /cloudflare\/cloudflared\/releases\/latest\/download\/cloudflared-windows-amd64[.]exe$/);
  fs.rmSync(downloaded.path, { force: true });

  // Gateway readiness is bounded; a dead Gateway never causes an infinite wait.
  assert.equal(await waitForMiniAppGateway({ timeoutMs: 8, intervalMs: 1, probe: async () => false }), false);

  // Confirmed success: informational stderr is fine and public URL side effects occur exactly once.
  const urlFile = path.join(temp, "miniapp_public_url.txt");
  const logFile = path.join(temp, "cloudflared.log");
  let successClipboard = 0;
  let successOnUrl = 0;
  const success = await runCloudflaredQuickTunnel({
    rootDir: temp,
    cloudflaredExe: "cloudflared.exe",
    urlFile,
    logFile,
    spawnImpl: () => fakeCloudflared({ stderrText: REAL_SUCCESS, exitCode: 0 }),
    stdout: silent, stderr: silent,
    copyClipboard: () => { successClipboard += 1; return true; },
    onPublicUrl: () => { successOnUrl += 1; },
  });
  assert.equal(success.exitCode, 0);
  assert.equal(success.publicUrl, "https://example-random-host.trycloudflare.com/miniapp.html");
  assert.equal(fs.readFileSync(urlFile, "ascii").trim(), success.publicUrl);
  assert.equal(successClipboard, 1);
  assert.equal(successOnUrl, 1);
  assert.match(fs.readFileSync(logFile, "utf8"), /Your quick Tunnel has been created!/);

  // Real Windows failure regression: API endpoint must never become the public URL and no side effects may occur.
  const failedUrlFile = path.join(temp, "failed-url.txt");
  fs.writeFileSync(failedUrlFile, "https://stale-old-host.trycloudflare.com/miniapp.html\r\n", "ascii");
  let failedClipboard = 0;
  let failedOnUrl = 0;
  await assert.rejects(
    runCloudflaredQuickTunnel({
      rootDir: temp,
      cloudflaredExe: "cloudflared.exe",
      urlFile: failedUrlFile,
      logFile: path.join(temp, "real-windows-failure.log"),
      spawnImpl: () => fakeCloudflared({ stderrText: REAL_WINDOWS_FAILURE, exitCode: 1 }),
      stdout: silent, stderr: silent,
      copyClipboard: () => { failedClipboard += 1; return true; },
      onPublicUrl: () => { failedOnUrl += 1; },
    }),
    (error) => error?.code === "CLOUDFLARED_EXITED" && error?.exitCode === 1 && error?.publicUrl === null && error?.retryable === true,
  );
  assert.equal(fs.existsSync(failedUrlFile), false);
  assert.equal(failedClipboard, 0);
  assert.equal(failedOnUrl, 0);
  assert.equal(isTransientQuickTunnelFailure(REAL_WINDOWS_FAILURE), true);

  // Chunk-boundary success works against the real runner, not only the parser unit.
  const chunkUrlFile = path.join(temp, "chunk-url.txt");
  const chunkSuccess = await runCloudflaredQuickTunnel({
    rootDir: temp,
    cloudflaredExe: "cloudflared.exe",
    urlFile: chunkUrlFile,
    logFile: path.join(temp, "chunk.log"),
    spawnImpl: () => fakeCloudflared({
      stderrChunks: [
        "2026 INF Your quick Tun",
        "nel has been created!\n2026 INF | https://split-generated-",
        "host.trycloudflare.com |\n",
      ],
      exitCode: 0,
    }),
    stdout: silent, stderr: silent, copyClipboard: () => false,
  });
  assert.equal(chunkSuccess.publicUrl, "https://split-generated-host.trycloudflare.com/miniapp.html");

  // A real non-transient non-zero exit code is propagated and is not marked retryable.
  await assert.rejects(
    runCloudflaredQuickTunnel({
      rootDir: temp,
      cloudflaredExe: "cloudflared.exe",
      urlFile: path.join(temp, "failed-nontransient-url.txt"),
      logFile: path.join(temp, "failed-nontransient.log"),
      spawnImpl: () => fakeCloudflared({ stderrText: "ERR invalid command configuration\n", exitCode: 37 }),
      stdout: silent, stderr: silent, copyClipboard: () => false,
    }),
    (error) => error?.code === "CLOUDFLARED_EXITED" && error?.exitCode === 37 && error?.retryable === false,
  );

  // Bounded transient retry: exactly three serial attempts, 2s/4s schedule injectable in tests, then success.
  let retryAttempts = 0;
  let activeAttempts = 0;
  let maxActiveAttempts = 0;
  const delays = [];
  const retryResult = await startOrReuseWindowsMiniAppTunnel({
    allowNonWindows: true,
    rootDir: temp,
    urlFile: path.join(temp, "retry-url.txt"),
    waitForGateway: async () => true,
    inspectExisting: async () => [],
    ensureCloudflared: async () => ({ path: "cloudflared.exe", source: "test" }),
    retryDelaysMs: [2_000, 4_000],
    sleepImpl: async (ms) => { delays.push(ms); },
    stderr: silent,
    runTunnel: async () => {
      retryAttempts += 1;
      activeAttempts += 1;
      maxActiveAttempts = Math.max(maxActiveAttempts, activeAttempts);
      await new Promise((resolve) => setImmediate(resolve));
      activeAttempts -= 1;
      if (retryAttempts < 3) {
        const error = Object.assign(new Error("CLOUDFLARED_EXITED"), { code: "CLOUDFLARED_EXITED", exitCode: 1, retryable: true, publicUrl: null });
        throw error;
      }
      return { exitCode: 0, publicUrl: "https://retry-success.trycloudflare.com/miniapp.html", urlFile: path.join(temp, "retry-url.txt") };
    },
  });
  assert.equal(retryResult.attempts, 3);
  assert.equal(retryAttempts, 3);
  assert.equal(maxActiveAttempts, 1);
  assert.deepEqual(delays, [2_000, 4_000]);

  // Exhausted transient retries remain failure and leave no stale URL artifact.
  const exhaustedUrlFile = path.join(temp, "exhausted-url.txt");
  fs.writeFileSync(exhaustedUrlFile, "https://stale.trycloudflare.com/miniapp.html\n", "ascii");
  let exhaustedAttempts = 0;
  await assert.rejects(
    startOrReuseWindowsMiniAppTunnel({
      allowNonWindows: true,
      rootDir: temp,
      urlFile: exhaustedUrlFile,
      waitForGateway: async () => true,
      inspectExisting: async () => [],
      ensureCloudflared: async () => ({ path: "cloudflared.exe", source: "test" }),
      retryDelaysMs: [0, 0],
      stderr: silent,
      runTunnel: async () => {
        exhaustedAttempts += 1;
        throw Object.assign(new Error("transient"), { code: "CLOUDFLARED_EXITED", exitCode: 28, retryable: true, publicUrl: null });
      },
    }),
    (error) => error?.exitCode === 28 && error?.quickTunnelAttemptsExhausted === true && error?.attempts === 3,
  );
  assert.equal(exhaustedAttempts, 3);
  assert.equal(fs.existsSync(exhaustedUrlFile), false);

  // Non-transient errors are never retried.
  let nonTransientAttempts = 0;
  await assert.rejects(
    startOrReuseWindowsMiniAppTunnel({
      allowNonWindows: true,
      rootDir: temp,
      urlFile: path.join(temp, "nontransient-retry-url.txt"),
      waitForGateway: async () => true,
      inspectExisting: async () => [],
      ensureCloudflared: async () => ({ path: "cloudflared.exe", source: "test" }),
      stderr: silent,
      runTunnel: async () => {
        nonTransientAttempts += 1;
        throw Object.assign(new Error("bad config"), { code: "CLOUDFLARED_EXITED", exitCode: 2, retryable: false });
      },
    }),
  );
  assert.equal(nonTransientAttempts, 1);

  // Existing matching Quick Tunnel can be reused only when its saved URL is valid.
  const reuseFile = path.join(temp, "reuse-url.txt");
  fs.writeFileSync(reuseFile, "https://reuse-safe.trycloudflare.com/miniapp.html\r\n", "ascii");
  const reuse = await startOrReuseWindowsMiniAppTunnel({
    allowNonWindows: true,
    rootDir: temp,
    urlFile: reuseFile,
    waitForGateway: async () => true,
    inspectExisting: async () => [{ pid: 8123, commandLine: "cloudflared.exe tunnel --no-autoupdate --url http://127.0.0.1:4180" }],
    stdout: silent, copyClipboard: () => false,
    ensureCloudflared: async () => { throw new Error("must not resolve cloudflared when reusing"); },
  });
  assert.equal(reuse.action, "reuse"); assert.equal(reuse.pid, 8123);
  assert.equal(isExpectedCloudflaredQuickTunnelProcess({ commandLine: "cloudflared.exe tunnel --url http://127.0.0.1:4180" }), true);

  // Existing tunnel without a trustworthy URL file fails closed rather than creating a duplicate.
  await assert.rejects(
    startOrReuseWindowsMiniAppTunnel({
      allowNonWindows: true,
      rootDir: temp,
      urlFile: path.join(temp, "missing-existing-url.txt"),
      waitForGateway: async () => true,
      inspectExisting: async () => [{ pid: 8124, commandLine: "cloudflared.exe tunnel --url http://127.0.0.1:4180" }],
    }),
    (error) => error?.code === "MINIAPP_TUNNEL_ALREADY_RUNNING_URL_UNKNOWN" && error?.ownerPid === 8124,
  );

  // Gateway ownership behavior from v162 remains unchanged: reuse Kourosh, reject unknown, never spawn a second instance.
  const expectedGatewayCommand = `node "${path.join(root, "scripts", "serve-miniapp-gateway.mjs")}"`;
  assert.equal(isExpectedKouroshMiniAppGatewayProcess({ commandLine: expectedGatewayCommand }), true);
  let gatewaySpawns = 0;
  const gatewayReuse = await ensureWindowsMiniAppGateway({
    allowNonWindows: true,
    inspectPortOwner: async () => ({ listening: true, pid: 4200, name: "node.exe", commandLine: expectedGatewayCommand }),
    spawnGateway: () => { gatewaySpawns += 1; throw new Error("must not spawn"); },
  });
  assert.equal(gatewayReuse.action, "reuse"); assert.equal(gatewaySpawns, 0);
  await assert.rejects(
    ensureWindowsMiniAppGateway({
      allowNonWindows: true,
      inspectPortOwner: async () => ({ listening: true, pid: 4300, name: "other.exe", commandLine: "other.exe --port 4180" }),
      spawnGateway: () => { gatewaySpawns += 1; throw new Error("must not spawn"); },
    }),
    (error) => error?.code === "MINIAPP_GATEWAY_PORT_IN_USE" && error?.ownerPid === 4300,
  );
  assert.equal(gatewaySpawns, 0);

  console.log(JSON.stringify({
    ok: true,
    apiTrycloudflareRejected: true,
    realWindowsFailureNoFalseSuccess: true,
    falseSuccessSideEffectsBlocked: true,
    failedUrlFileCleanup: true,
    successMarkerRequired: true,
    chunkBoundarySafe: true,
    successUrlExtraction: true,
    miniappHtmlAppendedExactlyOnce: true,
    transientRetryAttempts: 3,
    transientRetrySerial: maxActiveAttempts === 1,
    transientRetryBackoffMs: delays,
    nonTransientNoRetry: true,
    existingTunnelReuseSafe: true,
    existingTunnelUnknownUrlFailClosed: true,
    gatewayReusePreserved: true,
    unknownGatewayOwnerNotKilled: true,
    discoveryOrder: ["local_tools", "path", "downloaded_official_windows_x64"],
    gatewayReadinessBounded: true,
  }, null, 2));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
