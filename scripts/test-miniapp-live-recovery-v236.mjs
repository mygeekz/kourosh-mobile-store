import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const protocol = read("server", "cloud", "snapshots", "miniAppSnapshotSyncProtocol.ts");
const client = read("server", "cloud", "snapshots", "miniAppSnapshotSyncClient.ts");
const runtime = read("server", "cloud", "snapshots", "miniAppSnapshotRuntime.ts");
const worker = read("deployment", "cloudflare-pages", "_worker.js");
const wrangler = read("deployment", "cloudflare-pages", "wrangler.toml.example");
const availability = read("miniapp", "reference", "miniAppDataAvailability.ts");
const release = read("miniapp", "reference", "miniAppRelease.ts");
const settings = read("pages", "settings", "SettingsTelegramPanel.tsx");

assert.match(protocol, /liveOrigin\?: string/);
assert.match(protocol, /MINIAPP_SNAPSHOT_SYNC_LIVE_ORIGIN_INVALID/);
assert.match(client, /liveOrigin: options\.liveOrigin/);
assert.match(runtime, /liveOrigin: config\.liveOrigin \|\| undefined/);
assert.match(runtime, /schedulePeriodicReconciliation/);
assert.doesNotMatch(runtime, /setInterval\(/);
assert.doesNotMatch(runtime, /periodicTimer\.unref/);
assert.match(worker, /getInstallationForSync/);
assert.match(worker, /UPDATE tenant_installations SET live_origin = \?, updated_at = \?/);
assert.match(worker, /liveOriginUpdated/);
assert.match(worker, /5000, 1000, 10000/);
assert.match(wrangler, /KOUROSH_EDGE_LIVE_TIMEOUT_MS = "5000"/);
assert.match(release, /MINIAPP_DISPLAY_VERSION = "1\.24\.02"/);
assert.match(availability, /نسخه \$\{MINIAPP_DISPLAY_VERSION\}/);
assert.doesNotMatch(availability, /snapshotVersion\.toLocaleString/);
assert.match(settings, /text-slate-700 dark:text-slate-300/);
assert.match(settings, /\/api\/settings\/miniapp-snapshot\/status/);
assert.match(settings, /همگام‌سازی اطلاعات:/);

console.log("test-miniapp-live-recovery-v236: PASS");
