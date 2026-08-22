import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [
  "server/cloud/snapshots/miniAppSnapshotContracts.ts",
  "server/cloud/snapshots/miniAppSnapshotValidation.ts",
  "server/cloud/snapshots/miniAppSnapshotBuilder.ts",
  "server/cloud/snapshots/inMemoryMiniAppSnapshotStore.ts",
];
for (const file of files) assert(fs.existsSync(path.join(root, file)), `missing ${file}`);
const source = files.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");

assert.match(source, /MiniAppSnapshotCandidateV1/);
assert.match(source, /MiniAppStoredSnapshotV1/);
assert.match(source, /CustomerOfflineSnapshotV1/);
assert.match(source, /PartnerOfflineSnapshotV1/);
assert.match(source, /512 \* 1024/);
assert.match(source, /state: "active" \| "revoked"|MiniAppSnapshotState = "active" \| "revoked"/);
assert.match(source, /identifierMasked/);
assert.match(source, /version_conflict_rejected/);
assert.doesNotMatch(source, /miniAppStaff\.service|StaffOfflineSnapshot|buildStaffMiniAppSnapshot/);
assert.doesNotMatch(source, /wrangler|D1Database|\.prepare\(|cloudflare\.com|pages\.dev/i);
assert.doesNotMatch(source, /fetch\s*\(/, "Phase 5 contract must not perform network writes");

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
assert(packageJson.scripts?.["test:miniapp-snapshot-contract-v165"]);
assert(packageJson.scripts?.["audit:miniapp-snapshot-contract-v165"]);

console.log(JSON.stringify({
  status: "PASS",
  phase: 5,
  customerContract: true,
  partnerContract: true,
  staffContract: false,
  inMemoryOnly: true,
  d1Integration: false,
  workerIntegration: false,
  networkSync: false,
}, null, 2));
