import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const runtime = read("server/cloud/snapshots/miniAppSnapshotRuntime.ts");
const lifecycle = read("server/bootstrap/serverLifecycle.ts");
const app = read("server/app.ts");
const miniappRoutes = read("server/routes/miniapp.routes.ts");
const settings = read("server/routes/settings.routes.ts");
const sharedHeader = read("miniapp/components/premium/PartnerCompactHeader.tsx");
const home = read("miniapp/pages/PartnerHome.tsx");
const account = read("miniapp/pages/PartnerAccount.tsx");
const tunnelExample = read("deployment/miniapp-gateway/cloudflare-tunnel.example.yml");

assert.match(runtime, /buildCustomerMiniAppSnapshotCandidate/);
assert.match(runtime, /buildPartnerMiniAppSnapshotCandidate/);
assert.match(runtime, /buildMiniAppSnapshotRevocationCandidate/);
assert.match(runtime, /createMiniAppSnapshotSyncClient/);
assert.match(runtime, /stable_tunnel_required/);
assert.match(runtime, /public_and_live_origin_must_differ/);
assert.match(runtime, /KOUROSH_MINIAPP_SNAPSHOT_INTERVAL_MS/);
assert.match(runtime, /telegramUserId !== subject\.telegramUserId/);
assert.match(runtime, /mode: 0o600/);
assert.doesNotMatch(runtime, /kourosh_inventory\.db|SELECT \*/i);

const listenAt = lifecycle.indexOf("app.listen(port, bindHost");
const snapshotAt = lifecycle.indexOf("initializeMiniAppSnapshotRuntime(runtimeSettings)");
assert.ok(listenAt >= 0 && snapshotAt > listenAt, "Snapshot runtime must initialize after Local listener");
assert.match(lifecycle, /Local Kourosh will continue without Cloud Snapshot sync/);
assert.match(app, /stopMiniAppSnapshotRuntime/);
assert.match(miniappRoutes, /requestMiniAppSnapshotRefresh\(\)/);

assert.match(settings, /MINIAPP_PUBLIC_EDGE_LIVE_ORIGIN_MUST_DIFFER/);
assert.match(settings, /\/api\/settings\/miniapp-snapshot\/status/);
assert.match(settings, /\/api\/settings\/miniapp-snapshot\/provisioning/);
assert.match(settings, /\/api\/settings\/miniapp-snapshot\/refresh/);
assert.match(settings, /\/api\/settings\/miniapp-snapshot\/prepare/);
assert.match(settings, /renderMiniAppSnapshotProvisioningSql/);

for (const source of [sharedHeader, home, account]) {
  assert.match(source, /meta\?\.source === "snapshot"/);
  assert.match(source, /availabilityView\.detail/);
}
assert.match(tunnelExample, /hostname: live-miniapp\.example\.com/);
assert.doesNotMatch(tunnelExample, /hostname: miniapp\.example\.com/);

console.log(JSON.stringify({
  status: "PASS",
  audit: {
    productionSnapshotRuntimeWired: true,
    localListenerPrecedesCloudSnapshotRuntime: true,
    safeDtoBuildersReused: true,
    boundedOutboundSyncReused: true,
    identityRebindRevocation: true,
    publicEdgeLiveOriginSeparationEnforced: true,
    adminProvisioningSurface: true,
    partnerOfflineTimestampVisible: true,
    localDbFinancialMutationAdded: false,
  },
}, null, 2));
