import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createVerifiedBackup,applySchema,configureShadowRules,schemaState,protectedFingerprint } from './lib/sms-rule-shadow-setup.mjs';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'astra-sms-schema-'));
const db=new DatabaseSync(':memory:');let passed=0;
const test=async(name,fn)=>{await fn();passed++;console.log('PASS '+name);};
try {
  db.exec(`CREATE TABLE reminder_rules(id INTEGER PRIMARY KEY,name TEXT,enabled INTEGER,channel TEXT,matchType TEXT,value INTEGER,template TEXT,installmentTemplate TEXT,checkTemplate TEXT,targetType TEXT,createdAt TEXT DEFAULT 'original-created',updatedAt TEXT DEFAULT 'original-updated');
    INSERT INTO reminder_rules VALUES(1,'original telegram',1,'telegram','days_until',3,'unchanged','unchanged','unchanged','both','created','updated');
    CREATE TABLE schema_migrations(id TEXT PRIMARY KEY,sha256 TEXT,affectedRows INTEGER,result TEXT,backupFileName TEXT,backupSha256 TEXT);
    CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);
    CREATE TABLE accounting_guard(id INTEGER PRIMARY KEY,amount INTEGER);INSERT INTO accounting_guard VALUES(1,12000000);
    CREATE TABLE notification_outbox(id INTEGER PRIMARY KEY,payloadJson TEXT);
    CREATE TABLE sms_logs(id INTEGER PRIMARY KEY);CREATE TABLE notification_sent_log(id INTEGER PRIMARY KEY);`);
  for(const [key,value] of Object.entries({sms_provider:'meli_payamak',meli_payamak_username:'fixture',meli_payamak_password:'fixture',meli_payamak_installment_due_notice_pattern_id:'123',meli_payamak_installment_overdue_pattern_id:'124'}))db.prepare('INSERT INTO settings VALUES(?,?)').run(key,value);
  let backup;
  await test('verified consistent backup before mutation',()=>{backup=createVerifiedBackup(db,path.join(dir,'before.db'));assert.equal(backup.integrity,'ok');assert.equal(backup.checksumVerified,true);});
  await test('unverified backup rejected without schema mutation',()=>{assert.throws(()=>applySchema(db,{...backup,checksumVerified:false}));assert.equal(schemaState(db).applied,false);});
  await test('transactional additive migration preserves old rule and protected tables',()=>{
    const fingerprint=protectedFingerprint(db);const r=applySchema(db,backup);assert.equal(r.beforeCount,1);assert.equal(r.afterCount,1);assert.deepEqual(protectedFingerprint(db),fingerprint);
    assert.equal(db.prepare('SELECT eventType FROM reminder_rules WHERE id=1').get().eventType,null);
  });
  await test('registry/checksum detects repeat migration',()=>{assert.equal(applySchema(db,backup).alreadyApplied,true);assert.equal(db.prepare('SELECT count(*) n FROM schema_migrations').get().n,1);});
  await test('missing binding rolls back entire intentional rule batch',async()=>{
    db.prepare("DELETE FROM settings WHERE key='meli_payamak_installment_overdue_pattern_id'").run();
    await assert.rejects(()=>configureShadowRules(db));assert.equal(db.prepare("SELECT count(*) n FROM reminder_rules WHERE channel='sms'").get().n,0);
    db.prepare('INSERT INTO settings VALUES(?,?)').run('meli_payamak_installment_overdue_pattern_id','124');
  });
  await test('same authoring service creates six active shadow rules, no financial/delivery writes',async()=>{
    const fingerprint=protectedFingerprint(db),r=await configureShadowRules(db);assert.equal(r.created.length,6);assert.deepEqual(protectedFingerprint(db),fingerprint);
    assert.ok(r.rules.every(x=>x.readiness.ready&&x.readiness.deliveryMode==='shadow_only'));
  });
  await test('repeat setup creates zero duplicate rules',async()=>{const r=await configureShadowRules(db);assert.equal(r.created.length,0);assert.equal(r.existing.length,6);});
  await test('equivalent DUE_DATE/0 does not create another same-day rule',async()=>{
    db.exec("UPDATE reminder_rules SET timingType='DUE_DATE' WHERE channel='sms' AND daysOffset=0");assert.equal((await configureShadowRules(db)).created.length,0);
  });
  await test('duplicate occurrence aborts without touching existing rows',async()=>{
    db.exec("INSERT INTO reminder_rules(name,enabled,channel,matchType,value,targetType,eventType,timingType,daysOffset,templateKey) SELECT name,enabled,channel,matchType,value,targetType,eventType,timingType,daysOffset,templateKey FROM reminder_rules WHERE channel='sms' AND daysOffset=0");
    const before=JSON.stringify(db.prepare('SELECT * FROM reminder_rules').all());await assert.rejects(()=>configureShadowRules(db));assert.equal(JSON.stringify(db.prepare('SELECT * FROM reminder_rules').all()),before);
  });
  await test('partial additive schema is rejected',()=>{const partial=new DatabaseSync(path.join(dir,'partial.db'));try{const source=new DatabaseSync(backup.path,{readOnly:true});try{partial.exec(source.prepare("SELECT sql FROM sqlite_schema WHERE name='reminder_rules'").get().sql);}finally{source.close();}partial.exec('ALTER TABLE reminder_rules ADD COLUMN eventType TEXT');assert.throws(()=>schemaState(partial));}finally{partial.close();}});
  console.log(`${passed}/10 isolated migration/setup checks passed; no application or provider loaded.`);
} finally {
  db.close();
  // Only this test-created temporary directory is removed, after checking its absolute boundary.
  const resolved=path.resolve(dir),tempRoot=path.resolve(os.tmpdir());assert.ok(resolved.startsWith(tempRoot+path.sep));assert.ok(path.basename(resolved).startsWith('astra-sms-schema-'));
  fs.rmSync(resolved,{recursive:true});
}
