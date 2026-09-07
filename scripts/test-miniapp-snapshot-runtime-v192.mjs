import assert from "node:assert/strict";
import {
  renderMiniAppSnapshotProvisioningSql,
  resolveMiniAppSnapshotRuntimeConfig,
} from "../server/cloud/snapshots/miniAppSnapshotRuntime.ts";

const installationId = "inst_abcdefghijklmnopqrstuvwx";
const readySettings = {
  miniapp_public_access_mode: "stable_tunnel",
  telegram_miniapp_public_url: "https://miniapp.example/miniapp.html",
  miniapp_live_origin_url: "https://live-miniapp.example/",
  installation_id: installationId,
  telegram_bot_token: "123456789:fake-token-used-only-for-id",
  kourosh_cloud_credential_version: "3",
};

const ready = resolveMiniAppSnapshotRuntimeConfig(readySettings, { NODE_ENV: "production" });
assert.equal(ready.enabled, true);
assert.equal(ready.reason, "ready");
assert.equal(ready.installationId, installationId);
assert.equal(ready.tenantId, "tenant_abcdefghijklmnopqrstuvwx");
assert.equal(ready.botId, "123456789");
assert.equal(ready.credentialVersion, 3);
assert.equal(ready.publicHost, "miniapp.example");
assert.equal(ready.liveOrigin, "https://live-miniapp.example/");
assert.equal(ready.syncEndpoint, "https://miniapp.example");

const directTunnel = resolveMiniAppSnapshotRuntimeConfig({ ...readySettings, miniapp_public_access_mode: "external_tunnel" }, { NODE_ENV: "production" });
assert.equal(directTunnel.enabled, false);
assert.equal(directTunnel.reason, "stable_tunnel_required");

const sameOrigin = resolveMiniAppSnapshotRuntimeConfig({
  ...readySettings,
  miniapp_live_origin_url: "https://miniapp.example/",
}, { NODE_ENV: "production" });
assert.equal(sameOrigin.enabled, false);
assert.equal(sameOrigin.reason, "public_and_live_origin_must_differ");

const missingBot = resolveMiniAppSnapshotRuntimeConfig({ ...readySettings, telegram_bot_token: "", telegram_bot_id: "" }, { NODE_ENV: "production" });
assert.equal(missingBot.enabled, false);
assert.equal(missingBot.reason, "telegram_bot_id_required");

const sql = renderMiniAppSnapshotProvisioningSql({
  ready: true,
  config: ready,
  publicKeyPem: "-----BEGIN PUBLIC KEY-----\nFAKE-PUBLIC-ONLY\n-----END PUBLIC KEY-----\n",
  publicKeyFingerprint: "ed25519_fake",
});
assert.match(sql, /INSERT INTO tenant_installations/);
assert.match(sql, /miniapp\.example/);
assert.match(sql, /live-miniapp\.example/);
assert.match(sql, /FAKE-PUBLIC-ONLY/);
assert.doesNotMatch(sql, /PRIVATE KEY|fake-token-used-only-for-id/);

console.log(JSON.stringify({
  status: "PASS",
  runtime: {
    stableTunnelRequired: true,
    publicEdgeAndLiveOriginSeparated: true,
    tenantDerivedFromInstallation: true,
    botIdDerivedLocallyWithoutSyncingToken: true,
    d1ProvisioningUsesPublicKeyOnly: true,
  },
}, null, 2));
