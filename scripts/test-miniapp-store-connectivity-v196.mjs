import assert from "node:assert/strict";
import fs from "node:fs";

import {
  MINIAPP_STORE_ONLINE_GRACE_MS,
  resolveMiniAppStoreConnectivity,
} from "../miniapp/reference/miniAppConnectivity.ts";

const now = Date.parse("2026-08-17T14:30:00.000Z");
const isoBefore = (milliseconds) => new Date(now - milliseconds).toISOString();

assert.equal(MINIAPP_STORE_ONLINE_GRACE_MS, 7 * 60 * 1000);
assert.equal(resolveMiniAppStoreConnectivity("live", null, now), "online");
assert.equal(resolveMiniAppStoreConnectivity("snapshot", isoBefore(30_000), now), "online");
assert.equal(resolveMiniAppStoreConnectivity("snapshot", isoBefore(6 * 60_000 + 59_000), now), "online");
assert.equal(resolveMiniAppStoreConnectivity("snapshot", isoBefore(7 * 60_000 + 1), now), "offline");
assert.equal(resolveMiniAppStoreConnectivity("snapshot", isoBefore(24 * 60 * 60_000), now), "offline");
assert.equal(resolveMiniAppStoreConnectivity("snapshot", null, now), "unknown");
assert.equal(resolveMiniAppStoreConnectivity("snapshot", "invalid", now), "unknown");
assert.equal(resolveMiniAppStoreConnectivity("snapshot", new Date(now + 3 * 60_000).toISOString(), now), "unknown");

const availability = fs.readFileSync("miniapp/reference/miniAppDataAvailability.ts", "utf8");
const home = fs.readFileSync("miniapp/pages/PartnerHome.tsx", "utf8");
const account = fs.readFileSync("miniapp/pages/PartnerAccount.tsx", "utf8");
const compactHeader = fs.readFileSync("miniapp/components/premium/PartnerCompactHeader.tsx", "utf8");
const html = fs.readFileSync("miniapp.html", "utf8");
const worker = fs.readFileSync("deployment/cloudflare-pages/_worker.js", "utf8");

assert.match(availability, /tone: "synced"[\s\S]{0,160}title: "فروشگاه آنلاین است"[\s\S]{0,120}badge: "اطلاعات همگام‌شده"/);
assert.match(availability, /title: "فروشگاه آفلاین است"/);
for (const source of [home, account, compactHeader]) {
  assert.match(source, /isMiniAppAvailabilityOnlineTone/);
  assert.match(source, /text-premium-green/);
}
assert.match(html, /name="kourosh-release" content="v197"/);
assert.match(worker, /const EDGE_VERSION = "v197"/);
assert.match(worker, /X-Kourosh-Release/);

console.log(JSON.stringify({
  status: "PASS",
  release: "v197",
  snapshotSyncIntervalMinutes: 5,
  onlineGraceMinutes: 7,
  currentMinuteSnapshot: "online",
  expiredSnapshot: "offline",
  deploymentFingerprint: true,
}, null, 2));
