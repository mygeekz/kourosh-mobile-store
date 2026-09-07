import assert from "node:assert/strict";
import fs from "node:fs";
import { KOUROSH_RELEASE } from "./lib/kourosh-release.mjs";

const read = (file) => fs.readFileSync(file, "utf8");
const pkg = JSON.parse(read("package.json"));
const manifest = JSON.parse(read("config/quality/miniapp-release-gate-v256.json"));
const roleMatrix = read("scripts/test-miniapp-rc-role-matrix-v256.mjs");
const infraMatrix = read("scripts/test-miniapp-rc-infrastructure-matrix-v256.mjs");
const evidenceVerifier = read("scripts/verify-miniapp-rc-evidence-v256.mjs");
const evidenceTemplate = JSON.parse(read("config/quality/miniapp-rc-evidence-v256.example.json"));

assert.equal(KOUROSH_RELEASE, "v256");
assert.equal(manifest.release, "v256");
assert.equal(manifest.releaseCandidate, true);
assert.equal(pkg.scripts["verify:miniapp:rc:automated"], "npm run verify:miniapp:source");
assert.equal(pkg.scripts["verify:miniapp:rc"], "npm run verify:miniapp && npm run verify:miniapp:rc:evidence-v256");
for (const script of ["test:miniapp-rc-evidence-verifier-v256", "test:miniapp-rc-role-matrix-v256", "test:miniapp-rc-infrastructure-matrix-v256"]) {
  assert.ok(manifest.sourceGate.some((entry) => entry.script === script), `RC source gate missing ${script}`);
}
assert.ok(manifest.externalEvidenceGate.some((entry) => entry.script === "verify:miniapp:rc:evidence-v256"));
for (const marker of ["customer_live", "partner_live", "staff_offline_denied", "customer_reconnect", "partner_reconnect", "staff_reconnect"]) assert.match(roleMatrix, new RegExp(marker));
for (const marker of ["snapshot_missing", "snapshot_expired", "identity_unlinked_revoked", "edge_snapshot_storage_failure", "origin_recovery"]) assert.match(infraMatrix, new RegExp(marker));
assert.match(evidenceVerifier, /RC_EVIDENCE_FILE_MISSING/);
assert.match(evidenceVerifier, /partner-newly-linked/);
assert.match(evidenceVerifier, /expectedAliases/);
assert.equal(evidenceTemplate.release, "v256");
assert.ok(evidenceTemplate.checks.every((item) => item.status === "PENDING"), "example evidence must never ship as fake PASS evidence");
assert.equal(fs.existsSync("config/quality/miniapp-rc-evidence-v256.json"), false, "repository must not ship fabricated production RC evidence");
assert.match(read(".gitignore"), /^config\/quality\/miniapp-rc-evidence-v256\.json$/m, "local RC evidence must stay uncommitted");

console.log(JSON.stringify({
  status: "PASS",
  release: KOUROSH_RELEASE,
  automatedRoleMatrix: true,
  automatedInfrastructureMatrix: true,
  externalEvidenceFailClosed: true,
  fabricatedEvidencePrevented: true,
}, null, 2));
