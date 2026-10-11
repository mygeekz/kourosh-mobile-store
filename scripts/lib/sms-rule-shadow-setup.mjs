// Explicit maintenance tooling only; never imports application startup or a sender.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { compile, readSource, loadShadowModules } from './notification-rule-shadow-harness.mjs';

export const migrationId = '2026-09-15-reminder-sms-contract.sql';
const migrationSql = fs.readFileSync(new URL('../../server/migrations/proposals/' + migrationId,import.meta.url),'utf8');
const checksum = text => createHash('sha256').update(text).digest('hex');
const oldColumns = ['id','name','enabled','channel','matchType','value','template','installmentTemplate','checkTemplate','targetType','createdAt','updatedAt'];
const additions = { eventType:'TEXT', timingType:'TEXT', daysOffset:'INTEGER', templateKey:'TEXT' };
const quoted = value => '"' + value.replaceAll('"','""') + '"';
export const intendedRules = [
  ...[[7,'یادآوری قسط ۷ روز قبل'],[3,'یادآوری قسط ۳ روز قبل'],[0,'یادآوری قسط روز سررسید']].map(([daysOffset,name]) => ({ name, eventType:'INSTALLMENT_DUE', timingType:'BEFORE_DUE_DATE', daysOffset, templateKey:'installment_due_notice' })),
  ...[[3,'پیگیری قسط ۳ روز معوق'],[7,'پیگیری قسط ۷ روز معوق'],[30,'پیگیری قسط ۳۰ روز معوق']].map(([daysOffset,name]) => ({ name, eventType:'INSTALLMENT_OVERDUE', timingType:'AFTER_DUE_DATE', daysOffset, templateKey:'installment_overdue' })),
].map(rule => ({ ...rule, enabled:true, channel:'sms', targetType:'installment' }));

export function checkDatabase(db) {
  assert.deepEqual(db.prepare('PRAGMA integrity_check').all().map(r=>r.integrity_check), ['ok'], 'Integrity check failed');
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0, 'Foreign key check failed');
}
export function schemaState(db) {
  const columns = db.prepare('PRAGMA table_info(reminder_rules)').all();
  for (const key of oldColumns) assert.ok(columns.some(c=>c.name===key), 'Required legacy column missing: '+key);
  const present = Object.keys(additions).filter(key=>columns.some(c=>c.name===key));
  assert.ok(present.length===0 || present.length===4, 'Partial migration requires separate review');
  for (const key of present) {
    const col=columns.find(c=>c.name===key);
    assert.equal(col.type.toUpperCase(), additions[key]); assert.equal(col.notnull,0); assert.equal(col.dflt_value,null);
  }
  assert.equal(db.prepare("SELECT count(*) n FROM sqlite_schema WHERE type='trigger' AND tbl_name='reminder_rules'").get().n,0,'Rule triggers require review');
  return { applied:present.length===4, columns };
}
function legacyRows(db) { return db.prepare('SELECT '+oldColumns.map(quoted).join(',')+' FROM reminder_rules ORDER BY id').all(); }
export function protectedFingerprint(db) {
  const result={};
  const tables=db.prepare("SELECT name,sql FROM sqlite_schema WHERE type='table' AND name NOT IN ('reminder_rules','schema_migrations','sqlite_sequence') ORDER BY name").all();
  for (const table of tables) {
    if (/^CREATE VIRTUAL TABLE/i.test(table.sql||'')) continue; // Its persisted shadow tables are included below.
    const hash=createHash('sha256');
    for (const row of db.prepare('SELECT * FROM '+quoted(table.name)).iterate()) hash.update(JSON.stringify(row,(_k,v)=>typeof v==='bigint'?v.toString():v)+'\n');
    result[table.name]=hash.digest('hex');
  }
  return result;
}
export function createVerifiedBackup(db, destination) {
  assert.ok(!fs.existsSync(destination),'Refuse to overwrite backup');
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  // Same consistent SQLite snapshot + SHA256 sidecar convention as server/backup.ts.
  // No raw live-file copy, WAL deletion, checkpoint or application initialization.
  db.exec("VACUUM INTO '"+destination.replaceAll("'","''")+"'");
  const sha256=checksum(fs.readFileSync(destination));
  fs.writeFileSync(destination+'.sha256',sha256+'  '+path.basename(destination)+'\n',{flag:'wx'});
  const copy=new DatabaseSync(destination,{readOnly:true});
  try { checkDatabase(copy); schemaState(copy); } finally { copy.close(); }
  assert.equal(checksum(fs.readFileSync(destination)),sha256);
  return { path:destination,size:fs.statSync(destination).size,sha256,checksumVerified:true,integrity:'ok',foreignKeyViolations:0 };
}
export function applySchema(db, backup) {
  assert.equal(backup.checksumVerified,true);
  assert.equal(checksum(fs.readFileSync(backup.path)),backup.sha256,'Backup changed');
  const statements=migrationSql.replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean);
  assert.deepEqual(statements,Object.entries(additions).map(([key,type])=>'ALTER TABLE reminder_rules ADD COLUMN '+key+' '+type));
  db.exec('BEGIN IMMEDIATE');
  try {
    const state=schemaState(db), before=legacyRows(db), protectedBefore=protectedFingerprint(db);
    const registry=db.prepare('SELECT * FROM schema_migrations WHERE id=?').get(migrationId);
    if (registry) { assert.equal(registry.sha256,checksum(migrationSql)); assert.ok(state.applied); }
    else {
      assert.equal(state.applied,false,'Unregistered schema requires review');
      db.exec(migrationSql);
      db.prepare("INSERT INTO schema_migrations(id,sha256,affectedRows,result,backupFileName,backupSha256) VALUES (?,?,0,'applied',?,?)")
        .run(migrationId,checksum(migrationSql),path.basename(backup.path),backup.sha256);
    }
    assert.equal(schemaState(db).applied,true);
    assert.deepEqual(legacyRows(db),before);
    assert.deepEqual(protectedFingerprint(db),protectedBefore);
    checkDatabase(db);
    db.exec('COMMIT');
    return { applied:!registry,alreadyApplied:!!registry,beforeCount:before.length,afterCount:before.length,legacyRowsUnchanged:true,protectedTablesUnchanged:true };
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}
export async function configureShadowRules(db) {
  const modules=loadShadowModules();
  const authoring=compile(readSource('server/notifications/rules/smsReminderRuleAuthoring.ts'),{
    require(name) { assert.equal(name,'./smsReminderRuleReadiness'); return modules; },
  });
  const readers={
    getAsync:async(sql,args=[])=>{ assert.match(sql,/^SELECT\b/i); return db.prepare(sql).get(...args); },
    allAsync:async(sql,args=[])=>{ assert.match(sql,/^(SELECT\b|PRAGMA table_info\(reminder_rules\))/i); return db.prepare(sql).all(...args); },
    runAsync:async(sql,args=[])=>{
      assert.match(sql,/^INSERT INTO reminder_rules\b/i,'Only intentional new rules can be written');
      const result=db.prepare(sql).run(...args); return { lastID:Number(result.lastInsertRowid),changes:Number(result.changes) };
    },
  };
  db.exec('BEGIN IMMEDIATE');
  try {
    assert.ok(schemaState(db).applied);
    const before=legacyRows(db), protectedBefore=protectedFingerprint(db), created=[],existing=[];
    const settings=await authoring.readSmsReminderSettings(readers);
    // Validate all six before creating any row. No credentials or values enter reports.
    for (const rule of intendedRules) {
      const validation=await authoring.validateSmsReminderDraft(rule,readers);
      assert.equal(validation.valid,true,'Rule is not locally ready: '+validation.readiness.reasonCode);
    }
    for (const rule of intendedRules) {
      // Treat DUE_DATE/0 and BEFORE_DUE_DATE/0 as the same occurrence.
      const matches=db.prepare("SELECT * FROM reminder_rules WHERE channel='sms' AND targetType=? AND eventType=? AND daysOffset=? AND (timingType=? OR (?=0 AND timingType IN ('DUE_DATE','BEFORE_DUE_DATE')))")
        .all(rule.targetType,rule.eventType,rule.daysOffset,rule.timingType,rule.daysOffset);
      assert.ok(matches.length<=1,'Duplicate equivalent rules require review');
      if (matches.length) {
        const row=matches[0];
        assert.equal(row.enabled,1,'Existing disabled rule requires review'); assert.equal(row.templateKey,rule.templateKey);
        assert.equal(modules.getSmsReminderReadiness(row,settings).ready,true);
        existing.push(row.id);
      } else {
        const saved=await authoring.saveSmsReminderDraft(rule,null,readers);
        assert.equal(saved.status,200,'Authoring service rejected rule'); created.push(saved.body.data.id);
      }
    }
    const after=legacyRows(db);
    assert.deepEqual(after.filter(r=>before.some(b=>b.id===r.id)),before);
    assert.equal(after.length,before.length+created.length);
    assert.deepEqual(protectedFingerprint(db),protectedBefore);
    checkDatabase(db);
    const rules=db.prepare("SELECT * FROM reminder_rules WHERE channel='sms' ORDER BY id").all().map(row=>({id:row.id,eventType:row.eventType,timingType:row.timingType,daysOffset:row.daysOffset,
      channel:row.channel,templateKey:row.templateKey,enabled:row.enabled,readiness:modules.getSmsReminderReadiness(row,settings)}));
    db.exec('COMMIT');
    return { created,existing,rules,legacyRowsUnchanged:true,protectedTablesUnchanged:true };
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}
