import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const worker = read("deployment", "cloudflare-pages", "_worker.js");
const schema = read("deployment", "cloudflare-pages", "schema", "0001_edge_snapshot.sql");
const wrangler = read("deployment", "cloudflare-pages", "wrangler.toml.example");
const protocol = read("server", "cloud", "snapshots", "miniAppSnapshotSyncProtocol.ts");
const prepare = read("scripts", "prepare-miniapp-cloudflare-pages-v167.mjs");

assert.match(worker, /KOUROSH-MINIAPP-SNAPSHOT-SYNC-V1/);
assert.match(protocol, /KOUROSH-MINIAPP-SNAPSHOT-SYNC-V1/);
assert.match(worker, /\/cloud\/v1\/miniapp\/snapshots/);
assert.match(protocol, /\/cloud\/v1\/miniapp\/snapshots/);
assert.match(worker, /KOUROSH_EDGE_DB/);
assert.match(worker, /env\.ASSETS\.fetch/);
assert.match(worker, /MINIAPP_READ_ONLY/);
assert.match(worker, /MINIAPP_STAFF_OFFLINE_UNAVAILABLE/);
assert.match(worker, /X-Kourosh-Data-Source/);
assert.match(worker, /"snapshot"/);
assert.match(worker, /"live"/);
assert.match(worker, /1500, 500, 3000/);
assert.match(worker, /authorizationValidUntil/);
assert.match(worker, /snapshotVersion/);
assert.match(worker, /contentHash/);
assert.match(worker, /deriveTelegramSubjectKey/);
assert.match(worker, /AES-GCM/);
assert.match(worker, /createPublicKey/);
assert.match(worker, /verifySignature/);
assert.doesNotMatch(worker, /api\.telegram\.org/);
assert.doesNotMatch(worker, /127\.0\.0\.1:3001|localhost:3001/);
assert.doesNotMatch(worker, /trycloudflare\.com/);
assert.doesNotMatch(worker, /KOUROSH_BOT_TOKEN|TELEGRAM_BOT_TOKEN/);

assert.match(schema, /CREATE TABLE IF NOT EXISTS tenant_installations/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS subject_snapshots/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS snapshot_sync_replays/);
assert.match(schema, /PRIMARY KEY \(tenant_id, subject_kind, subject_key\)/);
assert.doesNotMatch(schema, /telegram_user_id|local_subject_id|bot_token|private_key/i);
assert.match(schema, /CHECK \(subject_kind IN \('customer', 'partner'\)\)/);

assert.match(wrangler, /binding = "KOUROSH_EDGE_DB"/);
assert.match(wrangler, /compatibility_flags = \["nodejs_compat"\]/);
assert.match(wrangler, /pages_build_output_dir = "\.\.\/\.\.\/dist-miniapp"/);
assert.doesNotMatch(wrangler, /REPLACE_WITH_[A-Z_]+\s*=\s*"[^"]{8,}"/);
assert.match(prepare, /buildTriggered: false/);
assert.doesNotMatch(prepare, /vite|npm run build|execSync|spawnSync/);

console.log("audit-miniapp-edge-v167: PASS");
