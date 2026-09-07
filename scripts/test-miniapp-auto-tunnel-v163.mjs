import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  normalizeQuickTunnelMiniAppUrl,
  startOrReuseWindowsMiniAppTunnel,
  syncValidatedPublicUrlWithKourosh,
  waitForKouroshTunnelSyncPreflight,
} from "./windows-miniapp-tunnel-launcher.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kourosh-v163-auto-tunnel-"));
try {
  let preflightCalls = 0;
  const preflight = await waitForKouroshTunnelSyncPreflight({
    timeoutMs: 100,
    intervalMs: 0,
    sleepImpl: async () => undefined,
    requestJson: async () => {
      preflightCalls += 1;
      if (preflightCalls < 3) throw Object.assign(new Error("ECONNREFUSED"), { code: "ECONNREFUSED" });
      return { status: 200, body: { success: true, data: { allowed: true, protectedMode: null } } };
    },
  });
  assert.equal(preflight.allowed, true);
  assert.equal(preflightCalls, 3);

  const protectedPreflight = await waitForKouroshTunnelSyncPreflight({
    timeoutMs: 20,
    requestJson: async () => ({ status: 200, body: { success: true, data: { allowed: false, protectedMode: "self_hosted" } } }),
  });
  assert.equal(protectedPreflight.allowed, false);
  assert.equal(protectedPreflight.protectedMode, "self_hosted");

  const generated = "https://v163-generated-host.trycloudflare.com/miniapp.html";
  let syncBody = null;
  const syncResult = await syncValidatedPublicUrlWithKourosh(generated, {
    requestJson: async (method, route, body) => {
      assert.equal(method, "POST");
      assert.equal(route, "/api/local-runtime/miniapp-public-url-sync");
      syncBody = body;
      return { status: 200, body: { success: true, data: { ready: true, publicUrl: generated, menuSync: "pending" } } };
    },
  });
  assert.equal(syncBody.provider, "cloudflare_quick_tunnel");
  assert.equal(syncBody.publicUrl, generated);
  assert.equal(syncResult.ready, true);
  assert.equal(normalizeQuickTunnelMiniAppUrl("https://api.trycloudflare.com/tunnel"), null);

  const urlFile = path.join(tmp, "miniapp_public_url.txt");
  fs.writeFileSync(urlFile, generated, "ascii");
  let reuseSyncCalls = 0;
  const reuse = await startOrReuseWindowsMiniAppTunnel({
    allowNonWindows: true,
    rootDir: tmp,
    urlFile,
    waitForGateway: async () => true,
    inspectExisting: async () => [{ pid: 444, commandLine: "cloudflared tunnel --no-autoupdate --url http://127.0.0.1:4180" }],
    syncPublicUrl: async (publicUrl) => { reuseSyncCalls += 1; assert.equal(publicUrl, generated); },
    stdout: { write() {} },
    stderr: { write() {} },
    copyClipboard: () => false,
  });
  assert.equal(reuse.action, "reuse");
  assert.equal(reuseSyncCalls, 1, "Restart/reuse must reconcile the current public URL automatically");

  let newSyncCalls = 0;
  let forwardedOnPublicUrl = null;
  const started = await startOrReuseWindowsMiniAppTunnel({
    allowNonWindows: true,
    rootDir: tmp,
    urlFile: path.join(tmp, "new-url.txt"),
    waitForGateway: async () => true,
    inspectExisting: async () => [],
    ensureCloudflared: async () => ({ path: "cloudflared.exe", source: "test" }),
    runTunnel: async (options) => {
      forwardedOnPublicUrl = options.onPublicUrl;
      await options.onPublicUrl("https://new-v163-host.trycloudflare.com/miniapp.html");
      return { exitCode: 0, publicUrl: "https://new-v163-host.trycloudflare.com/miniapp.html" };
    },
    syncPublicUrl: async (publicUrl) => { newSyncCalls += 1; assert.equal(publicUrl, "https://new-v163-host.trycloudflare.com/miniapp.html"); },
    retryDelaysMs: [0, 0],
  });
  assert.equal(started.action, "started");
  assert.equal(typeof forwardedOnPublicUrl, "function");
  assert.equal(newSyncCalls, 1, "New generated URL must hand off automatically without manual copy/save");

  console.log(JSON.stringify({
    status: "PASS",
    preflightRetries: preflightCalls,
    protectedMode: protectedPreflight.protectedMode,
    reuseSyncCalls,
    newSyncCalls,
    apiTrycloudflareRejected: true,
  }, null, 2));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
