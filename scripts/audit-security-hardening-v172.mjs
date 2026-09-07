import assert from "node:assert/strict";
import fs from "node:fs";

const worker = fs.readFileSync("deployment/cloudflare-pages/_worker.js", "utf8");
const routes = fs.readFileSync("server/routes/miniapp.routes.ts", "utf8");
const gateway = fs.readFileSync("server/miniapp/miniAppGatewayPolicy.mjs", "utf8");
const syncReceiver = fs.readFileSync("server/cloud/snapshots/miniAppSnapshotSyncReceiver.ts", "utf8");

const edgeVersion = Number(worker.match(/const EDGE_VERSION = "v(\d+)"/)?.[1] || 0);
assert.ok(edgeVersion >= 172, "Edge runtime must preserve or advance the v172 security baseline");
assert.match(worker, /publicHost: tenant\.publicHost/);
assert.match(worker, /MINIAPP_EDGE_HOST_MISMATCH/);
assert.match(worker, /host !== session\.publicHost/);
assert.match(worker, /safePublicHost\(new URL\(request\.url\)\.hostname\)/);
assert.doesNotMatch(worker, /x-forwarded-host/i);
assert.match(worker, /MINIAPP_EDGE_ORIGIN_MISMATCH/);
assert.match(worker, /reauth\.status < 500/);
assert.match(worker, /validateLiveIdentity\(reauth\.json\?\.data\?\.identity, liveSession\.telegramUserId, liveSession\.identity\.kind\)/);
assert.match(worker, /String\(identity\.telegramUserId \|\| ""\) !== String\(telegramUserId \|\| ""\)/);
assert.match(worker, /\["Admin", "Manager"\]\.includes\(identity\.roleName\)/);
assert.match(worker, /MINIAPP_LIVE_IDENTITY_INVALID/);
assert.match(worker, /MINIAPP_SNAPSHOT_SYNC_REPLAY_REJECTED/);
assert.match(worker, /credentialVersion !== tenant\.credentialVersion/);
assert.match(worker, /candidate\.tenantId !== tenant\.tenantId/);
assert.match(worker, /candidate\.installationId !== tenant\.installationId/);
assert.match(worker, /MINIAPP_SNAPSHOT_SYNC_SIGNATURE_INVALID/);
assert.match(worker, /MINIAPP_SNAPSHOT_SYNC_QUERY_NOT_ALLOWED/);
assert.match(worker, /MINIAPP_SNAPSHOT_SYNC_CONTENT_TYPE_REQUIRED/);
assert.match(worker, /MINIAPP_SNAPSHOT_SYNC_BODY_TOO_LARGE/);
assert.match(worker, /MINIAPP_AUTH_QUERY_NOT_ALLOWED/);
assert.match(worker, /MINIAPP_CONTENT_TYPE_REQUIRED/);
assert.match(worker, /MINIAPP_READ_ONLY/);
assert.match(worker, /MINIAPP_API_ROUTE_NOT_FOUND/);
assert.match(worker, /MINIAPP_CLOUD_ROUTE_NOT_FOUND/);
assert.match(worker, /MINIAPP_STATIC_METHOD_NOT_ALLOWED/);
assert.match(worker, /return await serveAsset\(request, env\)/);
assert.match(worker, /console\.error\("kourosh_edge_request_failed", \{ edgeVersion: EDGE_VERSION, requestId: reqId, code:/);
assert.doesNotMatch(worker, /console\.log\(/);

assert.match(routes, /loadFreshMiniAppIdentityBinding\(identity\.kind, identity\.subjectId, identity\.telegramUserId\)/);
assert.match(routes, /loadFreshStaffAuthorizationResult\(identity\.subjectId, identity\.telegramUserId\)/);
assert.match(routes, /revokeCurrentMiniAppSession\(req\)/);
assert.match(routes, /requireStaffCapability/);
assert.match(gateway, /API_PATH_NOT_ALLOWED/);
assert.match(gateway, /pathname === "\/api\/miniapp\/auth" \? "POST" : "GET"/);
assert.match(syncReceiver, /MINIAPP_SNAPSHOT_SYNC_CREDENTIAL_VERSION_MISMATCH/);
assert.match(syncReceiver, /MINIAPP_SNAPSHOT_SYNC_TENANT_MISMATCH/);
assert.match(syncReceiver, /MINIAPP_SNAPSHOT_SYNC_REPLAY_REJECTED/);

console.log(JSON.stringify({
  status: "PASS",
  phase: 12,
  controls: {
    hostBoundSessions: true,
    forwardedHostIgnored: true,
    liveIdentityBinding: true,
    authoritative4xx: true,
    replayProtection: true,
    credentialVersionEnforced: true,
    tenantIsolation: true,
    readOnlyBoundary: true,
    apiNamespaceFailClosed: true,
    boundedBodies: true,
    safeTopLevelErrorBoundary: true,
    localFreshAuthorization: true,
  },
}, null, 2));
