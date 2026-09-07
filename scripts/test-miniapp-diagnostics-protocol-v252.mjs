import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  MINIAPP_DIAGNOSTICS_PATH,
  buildMiniAppDiagnosticsCanonicalRequest,
  createSignedMiniAppDiagnosticsRequest,
  sha256DiagnosticBody,
} from "../server/cloud/snapshots/miniAppDiagnosticsProtocol.ts";

const keys = generateKeyPairSync("ed25519");
const installationId = "inst_abcdefghijklmnopqrstuvwx";
const request = createSignedMiniAppDiagnosticsRequest({
  installationId,
  credentialVersion: 3,
  botId: "123456789",
  subjectKind: "partner",
  telegramUserId: "778899",
  requestId: "diagrequest1234567890",
  now: new Date("2026-08-29T08:00:00.000Z"),
  signCanonical: (canonical) => sign(null, Buffer.from(canonical, "utf8"), keys.privateKey).toString("base64url"),
});

assert.equal(request.method, "POST");
assert.equal(request.path, MINIAPP_DIAGNOSTICS_PATH);
assert.equal(request.headers["x-kourosh-installation-id"], installationId);
assert.equal(request.headers["x-kourosh-credential-version"], "3");
assert.equal(request.headers["x-kourosh-body-sha256"], sha256DiagnosticBody(request.body));
const body = JSON.parse(request.body);
assert.deepEqual(body, { protocolVersion: 1, botId: "123456789", subjectKind: "partner", telegramUserId: "778899" });
const canonical = buildMiniAppDiagnosticsCanonicalRequest({
  installationId,
  credentialVersion: 3,
  requestId: "diagrequest1234567890",
  timestamp: "2026-08-29T08:00:00.000Z",
  bodySha256: request.headers["x-kourosh-body-sha256"],
});
assert.match(canonical, /^KOUROSH-MINIAPP-DIAGNOSTICS-V1\nPOST\n\/cloud\/v1\/miniapp\/diagnostics\n/);
assert.throws(() => createSignedMiniAppDiagnosticsRequest({ ...body, installationId, credentialVersion: 3, signCanonical: () => "bad" }), /signature/i);
assert.throws(() => createSignedMiniAppDiagnosticsRequest({ ...body, telegramUserId: "bad", installationId, credentialVersion: 3, signCanonical: () => "x".repeat(86) }), /Telegram user id/i);

console.log(JSON.stringify({ status: "PASS", path: MINIAPP_DIAGNOSTICS_PATH, signedMetadataOnlyProbe: true }, null, 2));
