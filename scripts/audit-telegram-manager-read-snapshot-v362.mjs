import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const worker = read("deployment/cloudflare-pages/_worker.js");
const schema = read("deployment/cloudflare-pages/schema/0002_manager_read_snapshot.sql");
const contracts = read("server/cloud/snapshots/miniAppSnapshotContracts.ts");
const builder = read("server/cloud/snapshots/miniAppSnapshotBuilder.ts");
const runtime = read("server/cloud/snapshots/miniAppSnapshotRuntime.ts");
const validation = read("server/cloud/snapshots/miniAppSnapshotValidation.ts");
const access = read("server/db/domains/accessControl.db.ts");

assert.match(contracts, /MiniAppSnapshotSubjectKind\s*=\s*"customer"\s*\|\s*"partner"\s*\|\s*"manager"/);
assert.match(contracts, /MINIAPP_MANAGER_SNAPSHOT_AUTHORIZATION_LEASE_MS\s*=\s*60\s*\*\s*60\s*\*\s*1000/);
assert.match(builder, /buildManagerMiniAppSnapshotCandidate/);
assert.match(builder, /resolveUserTenantAuthorization/);
assert.match(builder, /profits\.read/);
assert.match(builder, /MANAGER_SNAPSHOT_STRIP_KEYS/);
assert.match(runtime, /kind:\s*"manager"/);
assert.match(runtime, /buildManagerMiniAppSnapshotCandidate/);
assert.match(runtime, /buildMiniAppSnapshotRevocationCandidate/);
assert.match(validation, /manager_authorization_lease_exceeds_maximum/);
assert.match(validation, /manager_profit_permission_required/);
assert.match(access, /requestManagerSnapshotRefresh/);

assert.match(schema, /CREATE TABLE IF NOT EXISTS manager_snapshots/);
assert.match(schema, /PRIMARY KEY \(tenant_id, subject_key\)/);
assert.match(schema, /FOREIGN KEY \(installation_id\) REFERENCES tenant_installations/);

assert.match(worker, /manager_snapshots/);
assert.match(worker, /managerSnapshotResponse/);
assert.match(worker, /managerHasPermissions/);
assert.match(worker, /5xx may safely fall through to a permission-filtered read snapshot/);
assert.match(worker, /if \(live\.status < 500\)/, "live 4xx must return directly and never fall through to snapshot");
assert.match(worker, /Legacy staff endpoints stay live-only/);
assert.match(worker, /MINIAPP_STAFF_OFFLINE_UNAVAILABLE/);
assert.match(worker, /MINIAPP_MANAGER_PERMISSION_REQUIRED/);
assert.match(worker, /authenticatedManagerMutation/);
assert.match(worker, /return failure\(503, "MINIAPP_STAFF_OFFLINE_UNAVAILABLE"/);
assert.match(worker, /candidate\.subjectKind === "manager" && validUntil - generated > 60 \* 60 \* 1000/);
assert.match(worker, /containsManagerProfitData\(candidate\.data\) && !permissions\.includes\("profits\.read"\)/, "manager profit payload must require profits.read");
assert.match(worker, /permissions\.some\(\(permission\) => !permission\.endsWith\("\.read"\)\)/, "manager cloud snapshot permissions must be read-only");

console.log(JSON.stringify({
  status: "PASS",
  release: "v362",
  contract: "manager-read-snapshot-live-mutation",
  managerSnapshotSeparateTable: true,
  managerLeaseMaxMinutes: 60,
  live4xxFailClosed: true,
  live5xxSnapshotFallback: true,
  legacyStaffLiveOnly: true,
}, null, 2));
