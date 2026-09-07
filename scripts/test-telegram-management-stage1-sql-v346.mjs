import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const source = fs.readFileSync("server/db/schema/accessControl.schema.ts", "utf8");
const statements = [];
for (const match of source.matchAll(/await runAsync\((`[\s\S]*?`|"(?:[^"\\]|\\.)*")\);/g)) {
  const literal = match[1];
  if (literal.startsWith("`")) {
    const sql = literal.slice(1, -1);
    assert.equal(sql.includes("${"), false, "Access-control schema SQL must stay static for this contract test");
    statements.push(sql);
  } else {
    statements.push(JSON.parse(literal));
  }
}
assert.ok(statements.length >= 9, "Expected access-control schema statements were not found");

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys=ON");
db.exec(`CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE
)`);
for (const sql of statements) db.exec(sql);

const u1 = Number(db.prepare("INSERT INTO users(username) VALUES(?)").run("manager_a").lastInsertRowid);
const u2 = Number(db.prepare("INSERT INTO users(username) VALUES(?)").run("manager_b").lastInsertRowid);
const u3 = Number(db.prepare("INSERT INTO users(username) VALUES(?)").run("manager_c").lastInsertRowid);

db.prepare("INSERT INTO access_permissions(permission_key,name) VALUES(?,?)").run("dashboard.read", "Dashboard");
const roleA = Number(db.prepare("INSERT INTO access_roles(tenant_id,role_key,name,is_system) VALUES(?,?,?,1)").run("tenant_a", "full_manager", "Full",).lastInsertRowid);
const roleB = Number(db.prepare("INSERT INTO access_roles(tenant_id,role_key,name,is_system) VALUES(?,?,?,1)").run("tenant_b", "full_manager", "Full",).lastInsertRowid);
db.prepare("INSERT INTO access_role_permissions(role_id,permission_key) VALUES(?,?)").run(roleA, "dashboard.read");

const membershipA = Number(db.prepare("INSERT INTO tenant_memberships(tenant_id,user_id) VALUES(?,?)").run("tenant_a", u1).lastInsertRowid);
const membershipB = Number(db.prepare("INSERT INTO tenant_memberships(tenant_id,user_id) VALUES(?,?)").run("tenant_b", u2).lastInsertRowid);
const membershipManual = Number(db.prepare("INSERT INTO tenant_memberships(tenant_id,user_id) VALUES(?,?)").run("tenant_a", u3).lastInsertRowid);

// Same-tenant role grants are valid.
db.prepare("INSERT INTO tenant_membership_roles(membership_id,role_id,grant_source) VALUES(?,?,'legacy_role')").run(membershipA, roleA);

// Cross-tenant grant must fail at the database boundary.
assert.throws(
  () => db.prepare("INSERT INTO tenant_membership_roles(membership_id,role_id,grant_source) VALUES(?,?,'manual')").run(membershipB, roleA),
  /ACCESS_ROLE_TENANT_MISMATCH/,
);

// Manual and compatibility grants may coexist and deleting legacy must preserve manual access.
db.prepare("INSERT INTO tenant_membership_roles(membership_id,role_id,grant_source) VALUES(?,?,'legacy_role')").run(membershipManual, roleA);
db.prepare("INSERT INTO tenant_membership_roles(membership_id,role_id,grant_source) VALUES(?,?,'manual')").run(membershipManual, roleA);
assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM tenant_membership_roles WHERE membership_id=?").get(membershipManual).count), 2);
db.prepare("DELETE FROM tenant_membership_roles WHERE membership_id=? AND grant_source='legacy_role'").run(membershipManual);
assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM tenant_membership_roles WHERE membership_id=? AND grant_source='manual'").get(membershipManual).count), 1);

// Membership status remains constrained.
assert.throws(
  () => db.prepare("UPDATE tenant_memberships SET status='unknown' WHERE id=?").run(membershipA),
  /CHECK constraint failed/,
);

// Referenced permissions are FK protected.
assert.throws(
  () => db.prepare("INSERT INTO access_role_permissions(role_id,permission_key) VALUES(?,?)").run(roleB, "unknown.permission"),
  /FOREIGN KEY constraint failed/,
);

db.close();
console.log("Telegram Management Center Stage 1 v346 SQLite contract passed");
