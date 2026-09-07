import assert from "node:assert/strict";
import {
  beginMiniAppAvailabilityRequest,
  clearMiniAppAvailability,
  finishMiniAppAvailabilityRequest,
  MINIAPP_DATA_AVAILABILITY_INITIAL_STATE,
  reportMiniAppAvailabilityMeta,
} from "../miniapp/dataAvailability/miniAppAvailabilityState.ts";

const liveMeta = Object.freeze({
  source: "live",
  snapshotVersion: null,
  snapshotGeneratedAt: null,
  snapshotReceivedAt: null,
});
const snapshotMeta = Object.freeze({
  source: "snapshot",
  snapshotVersion: 17,
  snapshotGeneratedAt: "2026-08-29T08:00:00.000Z",
  snapshotReceivedAt: "2026-08-29T08:00:01.000Z",
});

let state = { ...MINIAPP_DATA_AVAILABILITY_INITIAL_STATE, meta: liveMeta };
state = beginMiniAppAvailabilityRequest(state, "/api/miniapp/customer/home", true);
assert.equal(state.meta, liveMeta, "refresh must keep the last valid provenance metadata");
assert.equal(state.pending, true);
assert.equal(state.requestPath, "/api/miniapp/customer/home");

const secondary = beginMiniAppAvailabilityRequest(state, "/api/miniapp/customer/purchases?page=2", false);
assert.equal(secondary, state, "secondary/load-more requests must not take control of global availability");

const late = reportMiniAppAvailabilityMeta(state, "/api/miniapp/old-screen", snapshotMeta);
assert.equal(late, state, "late response from a previous primary path must be ignored");

state = finishMiniAppAvailabilityRequest(state, "/api/miniapp/customer/home");
assert.equal(state.meta, liveMeta, "transient refresh failure must retain the last valid provenance");
assert.equal(state.pending, false);

state = beginMiniAppAvailabilityRequest(state, "/api/miniapp/customer/home", true);
state = reportMiniAppAvailabilityMeta(state, "/api/miniapp/customer/home", snapshotMeta);
assert.equal(state.meta, snapshotMeta);
assert.equal(state.pending, false);

const wrongClear = clearMiniAppAvailability(state, "/api/miniapp/other");
assert.equal(wrongClear, state, "an unrelated request may not clear the current availability");
const cleared = clearMiniAppAvailability(state, "/api/miniapp/customer/home");
assert.deepEqual(cleared, MINIAPP_DATA_AVAILABILITY_INITIAL_STATE);

console.log(JSON.stringify({
  status: "PASS",
  refreshPreservesMeta: true,
  transientFailurePreservesMeta: true,
  secondaryRequestIgnored: true,
  latePrimaryResponseIgnored: true,
  explicitClearStillWorks: true,
}, null, 2));
