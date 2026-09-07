import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { runPendingMigrations } from '../utils/migrationRunner.ts';

const adapter = (sync) => ({
  exec(sql, cb) { try { sync.exec(sql); cb?.(null); } catch (e) { cb?.(e); } },
  run(sql, params, cb) {
    if (typeof params === 'function') { cb=params; params=[]; }
    try { sync.prepare(sql).run(...(params || [])); cb?.(null); } catch (e) { cb?.(e); }
  },
  get(sql, params, cb) {
    if (typeof params === 'function') { cb=params; params=[]; }
    try { cb?.(null, sync.prepare(sql).get(...(params || []))); } catch (e) { cb?.(e); }
  },
});

const dir = fs.mkdtempSync(path.join(os.tmpdir(),'kourosh-v343-migrations-'));
fs.writeFileSync(path.join(dir,'001-create.sql'),`CREATE TABLE test_rows(id INTEGER PRIMARY KEY, value TEXT); INSERT INTO test_rows(value) VALUES('a'); INSERT INTO test_rows(value) VALUES('b');\n`);
fs.writeFileSync(path.join(dir,'002-update.sql'),`UPDATE test_rows SET value='done' WHERE id=1;\n`);
const sync = new DatabaseSync(':memory:');
let safetyCalls=0;
const result = await runPendingMigrations(adapter(sync), dir, {
  beforeApplyBatch: async ({pendingFiles}) => {
    safetyCalls += 1;
    assert.deepEqual(pendingFiles,['001-create.sql','002-update.sql']);
    return { backupFileName:'pre-migration_test.db', backupSha256:'a'.repeat(64), checksumVerified:true };
  },
});
assert.equal(safetyCalls,1);
assert.equal(result.applied.length,2);
const registry=sync.prepare(`SELECT id,sha256,affectedRows,result,backupFileName,backupSha256 FROM schema_migrations ORDER BY id`).all();
assert.equal(registry.length,2);
assert.ok(registry.every((row)=>/^[a-f0-9]{64}$/.test(row.sha256)));
assert.ok(registry.every((row)=>row.result==='applied'));
assert.ok(registry.every((row)=>row.backupFileName==='pre-migration_test.db'));
assert.ok(registry.every((row)=>row.backupSha256==='a'.repeat(64)));
assert.equal(sync.prepare(`SELECT COUNT(*) c FROM test_rows`).get().c,2);

const dir2=fs.mkdtempSync(path.join(os.tmpdir(),'kourosh-v343-migrations-fail-'));
fs.writeFileSync(path.join(dir2,'001-blocked.sql'),`CREATE TABLE must_not_exist(id INTEGER);\n`);
const sync2=new DatabaseSync(':memory:');
await assert.rejects(
  runPendingMigrations(adapter(sync2),dir2,{beforeApplyBatch:async()=>({backupFileName:'bad.db',backupSha256:'nope',checksumVerified:false})}),
  /safety backup/i,
);
assert.equal(sync2.prepare(`SELECT COUNT(*) c FROM sqlite_master WHERE type='table' AND name='must_not_exist'`).get().c,0);
console.log(JSON.stringify({ok:true,safetyCalls,registry:registry.map(({id,affectedRows,result})=>({id,affectedRows,result}))},null,2));
