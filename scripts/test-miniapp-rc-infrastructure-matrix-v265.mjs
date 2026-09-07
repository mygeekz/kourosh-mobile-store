import assert from "node:assert/strict";
import {
  RcFakeD1,
  makeRcEnv,
  installSnapshot,
  makeSessionToken,
  rcRead,
  jsonBody,
  withFetch,
  liveSuccess,
  liveFailure,
  liveUnavailable,
  RC_IDS,
} from "./lib/miniapp-rc-v265-harness.mjs";

const scenarios = [];
const record = (name, details) => scenarios.push({ name, status: "PASS", ...details });

const customerFixture = async (snapshotOptions = {}) => {
  const db = new RcFakeD1();
  const env = makeRcEnv(db);
  const telegramUserId = snapshotOptions.telegramUserId || "840001";
  let subjectKey = null;
  if (snapshotOptions.install !== false) subjectKey = installSnapshot({ env, db, kind: "customer", telegramUserId, displayName: "Infra RC", ...snapshotOptions });
  const token = await makeSessionToken({ env, kind: "customer", telegramUserId, subjectKey });
  return { db, env, token, telegramUserId, subjectKey };
};

// Live origin unavailable -> valid snapshot fallback.
{
  const fx = await customerFixture();
  await withFetch(liveUnavailable, async () => {
    const { response, body } = await jsonBody(await rcRead("/api/miniapp/customer/home", fx.token, { env: fx.env }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-kourosh-data-source"), "snapshot");
    assert.equal(body.success, true);
    record("live_unavailable_snapshot_present", { result: "snapshot" });
  });
}

// Cloudflare/tunnel HTML masquerading as 200 is not accepted as a live API response.
{
  const fx = await customerFixture({ telegramUserId: "840002" });
  await withFetch(async () => new Response("<!doctype html><title>origin offline</title>", { status: 200, headers: { "content-type": "text/html" } }), async () => {
    const response = await rcRead("/api/miniapp/customer/home", fx.token, { env: fx.env });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-kourosh-data-source"), "snapshot");
    record("invalid_live_html", { result: "snapshot" });
  });
}

// Missing snapshot while origin is down -> explicit unavailable, not fake online.
{
  const fx = await customerFixture({ install: false, telegramUserId: "840003" });
  await withFetch(liveFailure(503), async () => {
    const { response, body } = await jsonBody(await rcRead("/api/miniapp/customer/home", fx.token, { env: fx.env }));
    assert.equal(response.status, 503);
    assert.equal(body.code, "MINIAPP_OFFLINE_SNAPSHOT_UNAVAILABLE");
    record("snapshot_missing", { code: body.code });
  });
}

// Expired authorization window -> stale snapshot is refused.
{
  const fx = await customerFixture({ telegramUserId: "840004", generatedOffsetMs: -2 * 60 * 60 * 1000, validForMs: 30 * 60 * 1000 });
  await withFetch(liveFailure(503), async () => {
    const { response, body } = await jsonBody(await rcRead("/api/miniapp/customer/home", fx.token, { env: fx.env }));
    assert.equal(response.status, 503);
    assert.equal(body.code, "MINIAPP_OFFLINE_SNAPSHOT_EXPIRED");
    assert.equal(response.headers.get("x-kourosh-data-source"), "snapshot");
    record("snapshot_expired", { code: body.code });
  });
}

// Revoked subject snapshot must revoke offline access immediately.
{
  const fx = await customerFixture({ telegramUserId: "840005", state: "revoked" });
  await withFetch(liveFailure(503), async () => {
    const { response, body } = await jsonBody(await rcRead("/api/miniapp/customer/home", fx.token, { env: fx.env }));
    assert.equal(response.status, 403);
    assert.equal(body.code, "MINIAPP_ACCOUNT_UNLINKED");
    record("identity_unlinked_revoked", { code: body.code });
  });
}

// Snapshot from another installation cannot be used.
{
  const otherInstallation = "inst_ABCDEFGHIJKLMNOPQRSTUVWX";
  const fx = await customerFixture({ telegramUserId: "840006", installationId: otherInstallation });
  await withFetch(liveFailure(503), async () => {
    const { response, body } = await jsonBody(await rcRead("/api/miniapp/customer/home", fx.token, { env: fx.env }));
    assert.equal(response.status, 403);
    assert.equal(body.code, "MINIAPP_SNAPSHOT_INSTALLATION_MISMATCH");
    record("snapshot_installation_mismatch", { code: body.code });
  });
}

// Edge storage failure is explicit and retryable; it is never converted to empty data.
{
  const fx = await customerFixture({ telegramUserId: "840007" });
  fx.db.failSnapshotRead = true;
  await withFetch(liveFailure(503), async () => {
    const { response, body } = await jsonBody(await rcRead("/api/miniapp/customer/home", fx.token, { env: fx.env }));
    assert.equal(response.status, 503);
    assert.equal(body.code, "MINIAPP_EDGE_STORAGE_UNAVAILABLE");
    assert.equal(response.headers.get("retry-after"), "2");
    record("edge_snapshot_storage_failure", { code: body.code, retryAfter: 2 });
  });
}

// Revoked/deactivated installation blocks fallback.
{
  const fx = await customerFixture({ telegramUserId: "840008" });
  fx.db.tenant.status = "revoked";
  await withFetch(liveFailure(503), async () => {
    const { response, body } = await jsonBody(await rcRead("/api/miniapp/customer/home", fx.token, { env: fx.env }));
    assert.equal(response.status, 403);
    assert.equal(body.code, "MINIAPP_EDGE_INSTALLATION_REVOKED");
    record("installation_revoked", { code: body.code });
  });
}

// A live authorization rejection (<500) must not silently fall back to snapshot.
{
  const fx = await customerFixture({ telegramUserId: "840009" });
  await withFetch(liveFailure(403, "LIVE_AUTH_REJECTED"), async () => {
    const { response, body } = await jsonBody(await rcRead("/api/miniapp/customer/home", fx.token, { env: fx.env }));
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("x-kourosh-data-source"), "live");
    assert.equal(body.code, "LIVE_AUTH_REJECTED");
    record("live_4xx_no_snapshot_bypass", { code: body.code, dataSource: "live" });
  });
}

// Same session recovers from unavailable/snapshot to live when origin returns.
{
  const fx = await customerFixture({ telegramUserId: "840010" });
  await withFetch(liveFailure(503), async () => {
    const response = await rcRead("/api/miniapp/customer/home", fx.token, { env: fx.env });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-kourosh-data-source"), "snapshot");
  });
  await withFetch(liveSuccess({ marker: "origin-restored" }), async () => {
    const { response, body } = await jsonBody(await rcRead("/api/miniapp/customer/home", fx.token, { env: fx.env }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-kourosh-data-source"), "live");
    assert.equal(body.data.marker, "origin-restored");
    record("origin_recovery", { transition: "snapshot->live" });
  });
}

// Same-origin request policy remains enforced before any live/snapshot data is served.
{
  const fx = await customerFixture({ telegramUserId: "840011" });
  await withFetch(liveSuccess({ marker: "should-not-run" }), async () => {
    const request = new Request(`https://${RC_IDS.publicHost}/api/miniapp/customer/home`, {
      headers: { authorization: `Bearer ${fx.token}`, origin: "https://evil.example" },
    });
    const { response, body } = await jsonBody(await (await import("../deployment/cloudflare-pages/_worker.js")).default.fetch(request, fx.env));
    assert.equal(response.status, 403);
    assert.equal(body.code, "MINIAPP_EDGE_ORIGIN_MISMATCH");
    record("cross_origin_rejected", { code: body.code });
  });
}

assert.equal(scenarios.length, 11);
console.log(JSON.stringify({
  status: "PASS",
  release: "v265",
  matrix: "infrastructure-failure-recovery",
  scenarios,
}, null, 2));
