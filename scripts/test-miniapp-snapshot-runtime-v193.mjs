import assert from "node:assert/strict";
import fs from "node:fs";

const runtime = fs.readFileSync("server/cloud/snapshots/miniAppSnapshotRuntime.ts", "utf8");
const schema = fs.readFileSync("server/db/schema/telegramIdentity.schema.ts", "utf8");
const routes = fs.readFileSync("server/routes/settings.routes.ts", "utf8");

assert.match(schema, /CREATE TABLE IF NOT EXISTS user_telegram_links[\s\S]*user_id INTEGER PRIMARY KEY/);
assert.doesNotMatch(schema, /CREATE TABLE IF NOT EXISTS user_telegram_links[\s\S]{0,500}\bid\s+INTEGER\s+PRIMARY KEY/);

assert.match(runtime, /FROM user_telegram_links[\s\S]{0,180}ORDER BY user_id ASC/);
assert.doesNotMatch(runtime, /FROM user_telegram_links[\s\S]{0,180}ORDER BY id ASC/);
assert.match(runtime, /MINIAPP_SNAPSHOT_IDENTITY_DISCOVERY_FAILED/);
assert.match(runtime, /stage:[\s\S]{0,180}identity_discovery/);

assert.match(routes, /result\.state === "degraded" \? 503/);
assert.match(routes, /const success = result\.state === "idle"/);
assert.match(routes, /result\.lastErrorCode \|\| "MINIAPP_SNAPSHOT_RECONCILIATION_FAILED"/);

console.log(JSON.stringify({
  status: "PASS",
  regression: {
    staffTelegramLinkSchemaUsesUserIdPrimaryKey: true,
    snapshotIdentityDiscoveryOrdersByUserId: true,
    identityDiscoveryFailureGetsStableDiagnosticCode: true,
    degradedManualRefreshReturnsFailure: true,
  },
}, null, 2));
