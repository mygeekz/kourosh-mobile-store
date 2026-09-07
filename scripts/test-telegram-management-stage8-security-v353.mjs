import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createManagementRateLimiter } from '../server/middleware/managementRateLimiter.ts';

const makeResponse = () => {
  const headers = new Map();
  return {
    statusCode: 200,
    body: null,
    setHeader(name, value) { headers.set(String(name).toLowerCase(), String(value)); },
    getHeader(name) { return headers.get(String(name).toLowerCase()); },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
};

let now = 1_000_000;
const limiter = createManagementRateLimiter({ scope: 'test', windowMs: 60_000, maxRequests: 3, now: () => now });
const requestFor = (userId) => ({
  user: { id: userId },
  ip: '127.0.0.1',
  socket: { remoteAddress: '127.0.0.1' },
});
for (let i = 0; i < 3; i += 1) {
  const res = makeResponse();
  let nextCalled = false;
  limiter(requestFor(10), res, () => { nextCalled = true; });
  assert.equal(nextCalled, true, `request ${i + 1} should pass`);
}
{
  const res = makeResponse();
  let nextCalled = false;
  limiter(requestFor(10), res, () => { nextCalled = true; });
  assert.equal(nextCalled, false, 'fourth request must be limited');
  assert.equal(res.statusCode, 429);
  assert.equal(res.body?.code, 'MANAGEMENT_RATE_LIMITED');
  assert.ok(Number(res.getHeader('retry-after')) >= 1);
}
{
  const res = makeResponse();
  let nextCalled = false;
  limiter(requestFor(11), res, () => { nextCalled = true; });
  assert.equal(nextCalled, true, 'rate limit must be principal-isolated');
}
now += 60_001;
{
  const res = makeResponse();
  let nextCalled = false;
  limiter(requestFor(10), res, () => { nextCalled = true; });
  assert.equal(nextCalled, true, 'window expiry must reset rate limiter');
}

const schemaSource = fs.readFileSync('server/db/schema/managementAuditHardening.schema.ts', 'utf8');
const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    username TEXT,
    role TEXT,
    action TEXT NOT NULL,
    entityType TEXT,
    entityId INTEGER,
    description TEXT,
    createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
  );
`);
const alters = [...schemaSource.matchAll(/ALTER TABLE audit_logs ADD COLUMN [A-Za-z]+ TEXT/g)].map((match) => match[0]);
assert.equal(alters.length, 6, 'all six structured audit columns must be migratable');
for (const sql of alters) db.exec(sql);
for (const triggerName of ['trg_management_audit_no_update', 'trg_management_audit_no_delete']) {
  const pattern = new RegExp(`CREATE TRIGGER IF NOT EXISTS ${triggerName}[\\s\\S]*?END;`);
  const match = schemaSource.match(pattern);
  assert.ok(match, `${triggerName} source SQL missing`);
  db.exec(match[0]);
}
const columns = db.prepare(`PRAGMA table_info(audit_logs)`).all().map((row) => row.name);
for (const column of ['tenantId', 'source', 'requestId', 'beforeJson', 'afterJson', 'metadataJson']) assert.ok(columns.includes(column), `missing ${column}`);

db.prepare(`INSERT INTO audit_logs(action,description) VALUES('legacy','legacy')`).run();
const legacyId = Number(db.prepare(`SELECT last_insert_rowid() AS id`).get().id);
db.prepare(`UPDATE audit_logs SET description='legacy-updated' WHERE id=?`).run(legacyId);
assert.equal(db.prepare(`SELECT description FROM audit_logs WHERE id=?`).get(legacyId).description, 'legacy-updated', 'legacy audit rows must remain compatible');

db.prepare(`INSERT INTO audit_logs(action,tenantId,source,beforeJson,afterJson) VALUES('secure','tenant_A','management','{}','{}')`).run();
const secureId = Number(db.prepare(`SELECT last_insert_rowid() AS id`).get().id);
assert.throws(() => db.prepare(`UPDATE audit_logs SET description='tamper' WHERE id=?`).run(secureId), /append-only/);
assert.throws(() => db.prepare(`DELETE FROM audit_logs WHERE id=?`).run(secureId), /append-only/);
assert.ok(db.prepare(`SELECT id FROM audit_logs WHERE id=?`).get(secureId), 'structured audit row must remain after tamper attempts');

db.close();
console.log('PASS test-telegram-management-stage8-security-v353');
