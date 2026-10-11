import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(scriptDir,'..');
const source=path.resolve(process.argv[2]||path.join(root,'server','kourosh_inventory.db'));
if(!fs.existsSync(source)) throw new Error(`fixture DB missing: ${source}`);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kourosh-quarantine-'));
const dbPath=path.join(tmp,'kourosh_inventory.db');
const backupDir=path.join(tmp,'backups');
const reportDir=path.join(tmp,'reports');
fs.mkdirSync(backupDir,{recursive:true});fs.mkdirSync(reportDir,{recursive:true});
fs.copyFileSync(source,dbPath);
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const before=hash(dbPath);
const backup=path.join(backupDir,'verified.db');fs.copyFileSync(dbPath,backup);
fs.writeFileSync(`${backup}.sha256.json`,JSON.stringify({status:'PASS',source:dbPath,backup,sha256:before,integrity:'ok',foreignKeyErrors:0,createdAt:new Date().toISOString()},null,2));

const run=(args)=>spawnSync(process.execPath,[path.join(scriptDir,'quarantine-legacy-sms-outbox.mjs'),dbPath,`--backup-dir=${backupDir}`,`--report-dir=${reportDir}`,...args],{encoding:'utf8'});
const preview=run([]);if(preview.status!==0) throw new Error(preview.stderr||preview.stdout);
const pj=JSON.parse(preview.stdout);if(pj.status!=='PREVIEW'||pj.databaseMutated!==false) throw new Error('preview contract failed');
if(hash(dbPath)!==before) throw new Error('preview mutated DB');
const apply=run(['--apply','--confirm=QUARANTINE_LEGACY_SMS_BACKLOG']);if(apply.status!==0) throw new Error(apply.stderr||apply.stdout);
const aj=JSON.parse(apply.stdout);if(aj.status!=='PASS'||aj.providerCalls!==0||aj.realSmsSent!==false) throw new Error('apply contract failed');
const db=new DatabaseSync(dbPath,{readOnly:true});
try{
  const active=Number(db.prepare(`SELECT COUNT(*) n FROM notification_outbox WHERE channel='sms' AND ((status='pending' AND attempts < maxAttempts AND (nextAttemptAt IS NULL OR datetime(nextAttemptAt)<=datetime('now'))) OR (status='processing' AND datetime(updatedAt)<=datetime('now','-30 minutes')))` ).get()?.n||0);
  if(active!==0) throw new Error(`active legacy backlog remains: ${active}`);
  const q=Number(db.prepare("SELECT COUNT(*) n FROM notification_outbox WHERE channel='sms' AND lastError='QUARANTINED_LEGACY_SMS_BACKLOG:PHASE33' AND status='failed' AND attempts=maxAttempts AND nextAttemptAt IS NULL").get()?.n||0);
  if(q!==aj.quarantined) throw new Error(`quarantine count mismatch ${q}/${aj.quarantined}`);
} finally {db.close();}
if(!fs.existsSync(aj.quarantineManifest)) throw new Error('quarantine manifest missing');
const manifest=JSON.parse(fs.readFileSync(aj.quarantineManifest,'utf8'));
if(manifest.recipientsIncluded!==false||manifest.payloadsIncluded!==false) throw new Error('manifest privacy contract failed');
console.log(`PASS SMS backlog quarantine: preview read-only, verified-backup gate, ${aj.quarantined} legacy rows quarantined transactionally, provider calls 0`);
