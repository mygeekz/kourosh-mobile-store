import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys=ON;");
db.exec(fs.readFileSync("deployment/cloudflare-pages/schema/0001_edge_snapshot.sql", "utf8"));
db.exec(fs.readFileSync("deployment/cloudflare-pages/schema/0002_manager_read_snapshot.sql", "utf8"));
const now = new Date().toISOString();
const installationId = "inst_ABCDEFGHIJKLMNOPQRSTUVWX";
db.prepare(`INSERT INTO tenant_installations(installation_id,tenant_id,credential_version,installation_public_key_pem,bot_id,public_host,live_origin,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(
  installationId, "tenant-v362", 1, "pem", "123456789", "miniapp.example", "https://live.example", "active", now, now,
);
const insert = db.prepare(`INSERT INTO manager_snapshots(tenant_id,subject_key,installation_id,snapshot_version,schema_version,state,generated_at,received_at,authorization_valid_until,payload_json,content_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?)`);
insert.run("tenant-v362", "sub_abcdefghijklmnopqrstuvwxyzABCDEF", installationId, 1, "1", "active", now, now, new Date(Date.now()+1800000).toISOString(), "{}", "a".repeat(64));
assert.equal(db.prepare("SELECT COUNT(*) AS c FROM manager_snapshots").get().c, 1);
assert.throws(() => db.prepare(`INSERT INTO subject_snapshots(tenant_id,subject_kind,subject_key,installation_id,snapshot_version,schema_version,state,generated_at,received_at,authorization_valid_until,payload_json,content_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(
  "tenant-v362", "manager", "sub_abcdefghijklmnopqrstuvwxyzABCDEF", installationId, 1, "1", "active", now, now, new Date(Date.now()+1800000).toISOString(), "{}", "b".repeat(64)
));
assert.throws(() => insert.run("tenant-v362", "sub_abcdefghijklmnopqrstuvwxyzABCDEF", installationId, 2, "1", "active", now, now, new Date(Date.now()+1800000).toISOString(), "{}", "c".repeat(64)));
assert.throws(() => db.prepare("DELETE FROM tenant_installations WHERE installation_id=?").run(installationId), /FOREIGN KEY constraint failed/, "manager snapshots must preserve the same installation FK restrict behavior as legacy snapshots");
assert.equal(db.prepare("SELECT COUNT(*) AS c FROM manager_snapshots").get().c, 1);
console.log(JSON.stringify({ status: "PASS", release: "v362", separateManagerTable: true, legacySubjectCheckPreserved: true, tenantKeyed: true, installationForeignKeyRestricted: true }, null, 2));
