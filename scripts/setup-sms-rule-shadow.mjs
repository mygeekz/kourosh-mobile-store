// Operator-invoked Phase 2.5 maintenance; no application bootstrap or provider imports.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { checkDatabase,schemaState,createVerifiedBackup,applySchema,configureShadowRules } from './lib/sms-rule-shadow-setup.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(root,'server/kourosh_inventory.db');
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const auditedFiles=['server/utils/telegramEventNotificationRuntime.ts','server/utils/customerTelegramNotifications.ts',
  'server/utils/notificationOutboxRuntime.ts','server/routes/reminderRuntime.routes.ts',
  'server/notifications/rules/schedulerRuleShadow.ts','server/notifications/rules/evaluateNotificationRules.ts',
  'server/notifications/rules/notificationRuleShadow.ts','scripts/lib/sms-rule-shadow-setup.mjs'];
const evidenceHashes=()=>Object.fromEntries(auditedFiles.map(file=>[file,hash(path.join(root,file))]));
const open=(file,readOnly=false)=>{ const db=new DatabaseSync(file,{readOnly}); db.exec('PRAGMA busy_timeout=15000;PRAGMA foreign_keys=ON'); return db; };
let phase='arguments';
try {
  const [action,evidencePath]=process.argv.slice(2);
  assert.ok(action==='--prepare' || action==='--apply','Use --prepare or --apply evidence.json');
  if(action==='--prepare') {
    const db=open(source,true);
    let backup;
    try {
      phase='read-only-preflight';checkDatabase(db);schemaState(db);
      phase='backup';
      const stamp=new Date().toISOString().replace(/[:.]/g,'-');
      backup=createVerifiedBackup(db,path.join(root,'server/backups/sms-rule-phase25_'+stamp+'.db'));
    } finally {db.close();}
    phase='copied-database-test';
    const testPath=backup.path+'.test.db';fs.copyFileSync(backup.path,testPath,fs.constants.COPYFILE_EXCL);
    const copy=open(testPath);
    let migration,rules;
    try {
      migration=applySchema(copy,backup);
      assert.equal(applySchema(copy,backup).alreadyApplied,true);
      rules=await configureShadowRules(copy);
      const again=await configureShadowRules(copy);assert.equal(again.created.length,0);assert.equal(again.existing.length,6);
    } finally {copy.close();}
    const evidence={source,backup,testPath,migration,rules,copiedDatabaseTestsPassed:true,auditedFiles:evidenceHashes()};
    const reportPath=backup.path+'.preflight.json';fs.writeFileSync(reportPath,JSON.stringify(evidence,null,2),{flag:'wx'});
    console.log(JSON.stringify({phase:'PREPARED_ONLY',reportPath,source,backup,copiedDatabaseTestsPassed:true,testCreatedRules:rules.created.length}));
  } else {
    phase='verify-preflight';
    const evidence=JSON.parse(fs.readFileSync(evidencePath,'utf8'));
    assert.equal(evidence.source,source);assert.equal(evidence.copiedDatabaseTestsPassed,true);
    assert.deepEqual(evidence.auditedFiles,evidenceHashes(),'Audited source changed');
    const db=open(source);
    let migration,rules,repeat;
    try {
      phase='apply-migration';migration=applySchema(db,evidence.backup);
      phase='create-shadow-rules';rules=await configureShadowRules(db);
      phase='verify-idempotence';repeat=await configureShadowRules(db);assert.equal(repeat.created.length,0);
    } finally {db.close();}
    const result={source,backup:evidence.backup,migration,rules,rerunCreated:repeat.created.length,noSenderLoaded:true};
    const resultPath=evidencePath+'.applied-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
    fs.writeFileSync(resultPath,JSON.stringify(result,null,2),{flag:'wx'});
    console.log(JSON.stringify({resultPath,...result},null,2));
  }
} catch(error) {
  // Do not print raw DB rows/settings embedded in assertion diagnostics.
  console.error(JSON.stringify({code:'SMS_RULE_SETUP_ABORTED',phase,errorCode:error?.code||error?.name}));process.exitCode=1;
}
