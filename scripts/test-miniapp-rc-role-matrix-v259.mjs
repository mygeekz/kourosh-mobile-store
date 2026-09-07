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
  RC_IDS,
} from "./lib/miniapp-rc-v259-harness.mjs";

const db = new RcFakeD1();
const env = makeRcEnv(db);
const customerUserId = "810001";
const partnerUserId = "820001";
const staffUserId = "830001";
const customerSubjectKey = installSnapshot({ env, db, kind: "customer", telegramUserId: customerUserId, displayName: "Customer RC" });
const partnerSubjectKey = installSnapshot({ env, db, kind: "partner", telegramUserId: partnerUserId, displayName: "Partner RC", version: 256002 });
const customerToken = await makeSessionToken({ env, kind: "customer", telegramUserId: customerUserId, subjectKey: customerSubjectKey });
const partnerToken = await makeSessionToken({ env, kind: "partner", telegramUserId: partnerUserId, subjectKey: partnerSubjectKey });
const staffToken = await makeSessionToken({ env, kind: "staff", telegramUserId: staffUserId });
const scenarios = [];
const record = (name, result) => scenarios.push({ name, ...result });

// Customer live: live data must win and be labeled live.
await withFetch(liveSuccess({ customer: { id: 1001, fullName: "Customer Live" }, marker: "live-customer" }), async () => {
  const { response, body } = await jsonBody(await rcRead("/api/miniapp/customer/home", customerToken, { env }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-kourosh-data-source"), "live");
  assert.equal(body.data.marker, "live-customer");
  record("customer_live", { status: "PASS", dataSource: "live" });
});

// Customer offline: 5xx must fall back to the customer's own snapshot.
await withFetch(liveFailure(503), async () => {
  const { response, body } = await jsonBody(await rcRead("/api/miniapp/customer/home", customerToken, { env }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-kourosh-data-source"), "snapshot");
  assert.equal(body.data.customer.fullName, "Customer RC");
  record("customer_offline_snapshot", { status: "PASS", dataSource: "snapshot" });
});

// Partner live.
await withFetch(liveSuccess({ partner: { id: 2001, name: "Partner Live" }, marker: "live-partner" }), async () => {
  const { response, body } = await jsonBody(await rcRead("/api/miniapp/partner/home", partnerToken, { env }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-kourosh-data-source"), "live");
  assert.equal(body.data.marker, "live-partner");
  record("partner_live", { status: "PASS", dataSource: "live" });
});

// Partner offline snapshot.
await withFetch(liveFailure(503), async () => {
  const { response, body } = await jsonBody(await rcRead("/api/miniapp/partner/home", partnerToken, { env }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-kourosh-data-source"), "snapshot");
  assert.equal(body.data.partner.name, "Partner RC");
  record("partner_offline_snapshot", { status: "PASS", dataSource: "snapshot" });
});

// Staff live is allowed.
await withFetch(liveSuccess({ marker: "live-staff", metrics: { ok: true } }), async () => {
  const { response, body } = await jsonBody(await rcRead("/api/miniapp/staff/home", staffToken, { env }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-kourosh-data-source"), "live");
  assert.equal(body.data.marker, "live-staff");
  record("staff_live", { status: "PASS", dataSource: "live" });
});

// Staff must never fall back to a snapshot.
await withFetch(liveFailure(503), async () => {
  const { response, body } = await jsonBody(await rcRead("/api/miniapp/staff/home", staffToken, { env }));
  assert.equal(response.status, 503);
  assert.equal(body.code, "MINIAPP_STAFF_OFFLINE_UNAVAILABLE");
  assert.notEqual(response.headers.get("x-kourosh-data-source"), "snapshot");
  record("staff_offline_denied", { status: "PASS", code: body.code });
});

// Cross-role access remains denied even with a valid session.
await withFetch(liveSuccess({ marker: "should-not-run" }), async () => {
  const { response, body } = await jsonBody(await rcRead("/api/miniapp/partner/home", customerToken, { env }));
  assert.equal(response.status, 403);
  assert.equal(body.code, "MINIAPP_PARTNER_ACCESS_REQUIRED");
  record("customer_cannot_read_partner", { status: "PASS", code: body.code });
});
await withFetch(liveSuccess({ marker: "should-not-run" }), async () => {
  const { response, body } = await jsonBody(await rcRead("/api/miniapp/customer/home", partnerToken, { env }));
  assert.equal(response.status, 403);
  assert.equal(body.code, "MINIAPP_CUSTOMER_ACCESS_REQUIRED");
  record("partner_cannot_read_customer", { status: "PASS", code: body.code });
});

// Reconnect: same customer session goes snapshot -> live without stale snapshot winning.
await withFetch(liveFailure(503), async () => {
  const first = await rcRead("/api/miniapp/customer/home", customerToken, { env });
  assert.equal(first.headers.get("x-kourosh-data-source"), "snapshot");
});
await withFetch(liveSuccess({ marker: "customer-reconnected" }), async () => {
  const { response, body } = await jsonBody(await rcRead("/api/miniapp/customer/home", customerToken, { env }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-kourosh-data-source"), "live");
  assert.equal(body.data.marker, "customer-reconnected");
  record("customer_reconnect", { status: "PASS", transition: "snapshot->live" });
});

// Reconnect: same partner session.
await withFetch(liveFailure(503), async () => {
  const first = await rcRead("/api/miniapp/partner/home", partnerToken, { env });
  assert.equal(first.headers.get("x-kourosh-data-source"), "snapshot");
});
await withFetch(liveSuccess({ marker: "partner-reconnected" }), async () => {
  const { response, body } = await jsonBody(await rcRead("/api/miniapp/partner/home", partnerToken, { env }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-kourosh-data-source"), "live");
  assert.equal(body.data.marker, "partner-reconnected");
  record("partner_reconnect", { status: "PASS", transition: "snapshot->live" });
});

// Staff reconnect: denial while offline must recover to live without introducing staff snapshot behavior.
await withFetch(liveFailure(503), async () => {
  const first = await rcRead("/api/miniapp/staff/home", staffToken, { env });
  assert.equal(first.status, 503);
});
await withFetch(liveSuccess({ marker: "staff-reconnected" }), async () => {
  const { response, body } = await jsonBody(await rcRead("/api/miniapp/staff/home", staffToken, { env }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-kourosh-data-source"), "live");
  assert.equal(body.data.marker, "staff-reconnected");
  record("staff_reconnect", { status: "PASS", transition: "offline-denied->live" });
});

assert.equal(scenarios.length, 11);
console.log(JSON.stringify({
  status: "PASS",
  release: "v259",
  matrix: "role-and-reconnect",
  publicHost: RC_IDS.publicHost,
  scenarios,
}, null, 2));
