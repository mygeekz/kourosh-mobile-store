import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const dbPath = path.resolve(process.argv[2] || 'server/kourosh_inventory.db');
const apply = process.argv.includes('--apply');
const confirmArg = process.argv.find(a => a.startsWith('--confirm='));
const confirmed = confirmArg?.slice('--confirm='.length) === 'QUARANTINE_LEGACY_SMS_BACKLOG';
const staleArg = process.argv.find(a => a.startsWith('--processing-stale-minutes='));
const staleMinutes = Math.max(5, Math.min(1440, Number(staleArg?.slice('--processing-stale-minutes='.length) || 30)));
const backupDirArg = process.argv.find(a => a.startsWith('--backup-dir='));
const reportDirArg = process.argv.find(a => a.startsWith('--report-dir='));
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const backupDir = path.resolve(backupDirArg ? backupDirArg.slice('--backup-dir='.length) : path.join(root, 'server', 'backups', 'sms-rule-production-cutover'));
const reportDir = path.resolve(reportDirArg ? reportDirArg.slice('--report-dir='.length) : path.join(root, 'reports'));
const FLAG = 'notification_sms_rule_cutover_enabled';
const enabledFlag = (v) => ['1','true','on','enabled'].includes(String(v ?? '').trim().toLowerCase());
const sha256 = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');

if (!fs.existsSync(dbPath)) {
  console.error(JSON.stringify({status:'FAILED',code:'DATABASE_NOT_FOUND',database:dbPath},null,2));
  process.exit(1);
}

const dbHashBefore = sha256(dbPath);
const findMatchingBackup = () => {
  if (!fs.existsSync(backupDir)) return null;
  const manifests = fs.readdirSync(backupDir)
    .filter(name => name.endsWith('.db.sha256.json'))
    .map(name => path.join(backupDir,name));
  const matches=[];
  for (const manifestPath of manifests) {
    try {
      const data=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
      if (String(data.sha256||'') !== dbHashBefore) continue;
      if (!data.backup || !fs.existsSync(data.backup)) continue;
      if (sha256(data.backup) !== dbHashBefore) continue;
      matches.push({manifestPath,backup:data.backup,createdAt:String(data.createdAt||'')});
    } catch {}
  }
  matches.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return matches[0] || null;
};

const matchingBackup = findMatchingBackup();
if (apply && !confirmed) {
  console.error(JSON.stringify({status:'NOT_CHANGED',code:'EXPLICIT_CONFIRMATION_REQUIRED',required:'--confirm=QUARANTINE_LEGACY_SMS_BACKLOG'},null,2));
  process.exit(2);
}
if (apply && !matchingBackup) {
  console.error(JSON.stringify({status:'NOT_CHANGED',code:'MATCHING_VERIFIED_BACKUP_REQUIRED',databaseSha256:dbHashBefore,backupDir},null,2));
  process.exit(2);
}

const db = new DatabaseSync(dbPath, { readOnly: !apply });
let result;
try {
  if (!apply) db.exec('PRAGMA query_only=ON;');
  const integrity = String(db.prepare('PRAGMA integrity_check').get()?.integrity_check || '');
  const foreignKeyErrors = db.prepare('PRAGMA foreign_key_check').all().length;
  if (integrity.toLowerCase() !== 'ok' || foreignKeyErrors !== 0) {
    throw Object.assign(new Error('DATABASE_INTEGRITY_NOT_READY'), {code:'DATABASE_INTEGRITY_NOT_READY'});
  }
  const settings = Object.fromEntries(db.prepare("SELECT key,value FROM settings WHERE key IN (?)").all(FLAG).map(r=>[String(r.key),r.value]));
  if (enabledFlag(settings[FLAG])) {
    throw Object.assign(new Error('CUTOVER_MUST_BE_DISABLED'), {code:'CUTOVER_MUST_BE_DISABLED'});
  }

  const candidateSql = `SELECT id,status,attempts,maxAttempts,nextAttemptAt,lastError,eventType,entityType,entityId,createdAt,updatedAt
    FROM notification_outbox
    WHERE channel='sms'
      AND payloadJson NOT LIKE '%notification_rule_cutover_v1%'
      AND (
        (status='pending' AND attempts < maxAttempts AND (nextAttemptAt IS NULL OR datetime(nextAttemptAt) <= datetime('now')))
        OR
        (status='processing' AND datetime(updatedAt) <= datetime('now', ?))
      )
    ORDER BY id`;
  const rows = db.prepare(candidateSql).all(`-${staleMinutes} minutes`).map(r=>({
    id:Number(r.id),status:String(r.status),attempts:Number(r.attempts||0),maxAttempts:Number(r.maxAttempts||0),
    nextAttemptAt:r.nextAttemptAt||null,lastError:r.lastError||null,eventType:String(r.eventType||'UNKNOWN'),
    entityType:r.entityType||null,entityId:r.entityId??null,createdAt:r.createdAt||null,updatedAt:r.updatedAt||null,
  }));
  const byStatus = Object.fromEntries([...new Set(rows.map(r=>r.status))].sort().map(s=>[s,rows.filter(r=>r.status===s).length]));
  const byEvent = Object.fromEntries([...new Set(rows.map(r=>r.eventType))].sort().map(e=>[e,rows.filter(r=>r.eventType===e).length]));

  if (!apply) {
    result={
      status:'PREVIEW',mode:'read_only',database:dbPath,databaseSha256:dbHashBefore,processingStaleMinutes:staleMinutes,
      matchingVerifiedBackup:Boolean(matchingBackup),backup:matchingBackup?.backup||null,
      candidates:rows.length,byStatus,byEvent,cutoverEnabled:false,
      willDeleteRows:false,willContactProvider:false,willPrintRecipients:false,secretsPrinted:false,databaseMutated:false,
    };
  } else {
    fs.mkdirSync(reportDir,{recursive:true});
    const stamp = new Date().toISOString().replace(/[:.]/g,'-');
    const reportPath = path.join(reportDir,`sms-legacy-backlog-quarantine-${stamp}.json`);
    db.exec('BEGIN IMMEDIATE;');
    try {
      const update = db.prepare(`UPDATE notification_outbox
        SET status='failed', attempts=maxAttempts, nextAttemptAt=NULL,
            lastError='QUARANTINED_LEGACY_SMS_BACKLOG:PHASE33',
            updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')
        WHERE id=? AND channel='sms' AND status=?`);
      let changed=0;
      for (const row of rows) changed += Number(update.run(row.id,row.status).changes||0);
      if (changed !== rows.length) throw new Error(`QUARANTINE_CHANGE_COUNT_MISMATCH:${changed}/${rows.length}`);
      db.exec('COMMIT;');
      const manifest={
        version:1,kind:'SMS_LEGACY_BACKLOG_QUARANTINE',createdAt:new Date().toISOString(),database:dbPath,
        databaseSha256Before:dbHashBefore,backup:matchingBackup.backup,backupManifest:matchingBackup.manifestPath,
        processingStaleMinutes:staleMinutes,count:rows.length,byStatus,byEvent,
        originalRows:rows,
        recipientsIncluded:false,payloadsIncluded:false,
      };
      fs.writeFileSync(reportPath,JSON.stringify(manifest,null,2));
      const activeAfter = Number(db.prepare(`SELECT COUNT(*) n FROM notification_outbox
        WHERE channel='sms' AND (
          (status='pending' AND attempts < maxAttempts AND (nextAttemptAt IS NULL OR datetime(nextAttemptAt) <= datetime('now')))
          OR (status='processing' AND datetime(updatedAt) <= datetime('now', ?))
        )`).get(`-${staleMinutes} minutes`)?.n||0);
      result={
        status:'PASS',mode:'applied',database:dbPath,processingStaleMinutes:staleMinutes,
        quarantined:rows.length,byStatus,byEvent,activeDueOrStaleAfter:activeAfter,
        backupVerified:true,backup:matchingBackup.backup,backupManifest:matchingBackup.manifestPath,
        quarantineManifest:reportPath,willDeleteRows:false,providerCalls:0,realSmsSent:false,
        recipientsPrinted:false,secretsPrinted:false,
      };
    } catch (e) {
      try { db.exec('ROLLBACK;'); } catch {}
      throw e;
    }
  }
} catch (error) {
  result={status:'FAILED',code:error?.code||'QUARANTINE_FAILED',message:String(error?.message||error),database:dbPath,secretsPrinted:false,recipientsPrinted:false};
  process.exitCode=1;
} finally {
  db.close();
}

const dbHashAfter = sha256(dbPath);
result.databaseSha256Before=dbHashBefore;
result.databaseSha256After=dbHashAfter;
result.databaseMutated=dbHashBefore!==dbHashAfter;
if (!apply && result.databaseMutated) {
  result.status='FAILED';result.code='PREVIEW_MUTATED_DATABASE';process.exitCode=1;
}
console.log(JSON.stringify(result,null,2));
