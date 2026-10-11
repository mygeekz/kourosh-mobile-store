import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const source = path.resolve(process.argv[2] || 'server/kourosh_inventory.db');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const targetDirArg = process.argv.find(a => a.startsWith('--out-dir='));
const rawTargetDir = targetDirArg ? targetDirArg.slice('--out-dir='.length) : path.join(root, 'server', 'backups', 'sms-rule-production-cutover');
const targetDir = path.isAbsolute(rawTargetDir) ? path.normalize(rawTargetDir) : path.resolve(rawTargetDir);
const sha256 = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

if (!fs.existsSync(source)) {
  console.error(JSON.stringify({status:'FAILED',code:'DATABASE_NOT_FOUND',source},null,2));
  process.exit(1);
}

fs.mkdirSync(targetDir,{recursive:true});
const target = path.join(targetDir, `kourosh_inventory_before_rule6_cutover_${stamp}.db`);
fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);
const sourceHash=sha256(source), backupHash=sha256(target);
if(sourceHash!==backupHash){ fs.rmSync(target,{force:true}); throw new Error('BACKUP_HASH_MISMATCH'); }

const db=new DatabaseSync(target,{readOnly:true});
let integrity,foreignKeyErrors;
try{
  db.exec('PRAGMA query_only=ON;');
  integrity=String(db.prepare('PRAGMA integrity_check').get()?.integrity_check||'');
  foreignKeyErrors=db.prepare('PRAGMA foreign_key_check').all().length;
} finally { db.close(); }
if(integrity.toLowerCase()!=='ok'||foreignKeyErrors!==0) throw new Error('BACKUP_INTEGRITY_FAILED');

const manifest={
  status:'PASS',
  source,
  backup:target,
  sizeBytes:fs.statSync(target).size,
  sha256:backupHash,
  integrity,
  foreignKeyErrors,
  createdAt:new Date().toISOString(),
};
const manifestPath=`${target}.sha256.json`;
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
console.log(JSON.stringify({...manifest,manifestPath},null,2));
