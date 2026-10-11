import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(HERE, "manifest.json"), "utf8"));
const args = process.argv.slice(2);
const targetArg = args.find(a => !a.startsWith("--"));
const apply = args.includes("--apply");
const confirmArg = args.find(a => a.startsWith("--confirm="));
const confirmed = confirmArg === "--confirm=PHASE33_CODE_SYNC";
if (!targetArg) {
  console.error('Usage: node apply-phase33-code-sync.mjs "D:\\Kourosh\\Astra" [--apply --confirm=PHASE33_CODE_SYNC]');
  process.exit(2);
}
const target = path.resolve(targetArg);
const sha = p => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const exists = p => fs.existsSync(p) && fs.statSync(p).isFile();
const problems=[]; const checks=[];
for (const item of manifest.changed) {
  const dst=path.join(target,item.path);
  if (!exists(dst)) { problems.push({path:item.path,code:"BASELINE_FILE_MISSING"}); continue; }
  const h=sha(dst);
  const state=h===item.baselineSha256?"BASELINE":h===item.newSha256?"ALREADY_PATCHED":"DIVERGED";
  checks.push({path:item.path,state});
  if (state==="DIVERGED") problems.push({path:item.path,code:"TARGET_DIVERGED",sha256:h});
}
for (const item of manifest.added) {
  const dst=path.join(target,item.path);
  if (!exists(dst)) { checks.push({path:item.path,state:"ABSENT"}); continue; }
  const h=sha(dst);
  const state=h===item.newSha256?"ALREADY_PATCHED":"CONFLICT";
  checks.push({path:item.path,state});
  if (state==="CONFLICT") problems.push({path:item.path,code:"NEW_FILE_CONFLICT",sha256:h});
}
const dbPath=path.join(target,"server","kourosh_inventory.db");
const dbShaBefore=exists(dbPath)?sha(dbPath):null;
if (problems.length) {
  console.log(JSON.stringify({status:"BLOCKED",mode:"preview",target,problems,checks,databaseTouched:false,databaseSha256:dbShaBefore},null,2));
  process.exit(1);
}
if (!apply) {
  console.log(JSON.stringify({status:"PREVIEW_OK",mode:"read_only",target,changedFiles:manifest.changed.length,newFiles:manifest.added.length,checks,databaseTouched:false,databaseSha256:dbShaBefore,next:'Re-run with --apply --confirm=PHASE33_CODE_SYNC'},null,2));
  process.exit(0);
}
if (!confirmed) {
  console.log(JSON.stringify({status:"NOT_CHANGED",code:"EXPLICIT_CONFIRMATION_REQUIRED",required:"--confirm=PHASE33_CODE_SYNC",target,databaseTouched:false,databaseSha256:dbShaBefore},null,2));
  process.exit(3);
}
const stamp=new Date().toISOString().replace(/[:.]/g,"-");
const backupRoot=path.join(target,"backups","phase33-code-sync",stamp);
let copied=0, backedUp=0;
for (const item of [...manifest.changed,...manifest.added]) {
  const src=path.join(HERE,"payload",item.path);
  const dst=path.join(target,item.path);
  if (exists(dst) && sha(dst)===item.newSha256) continue;
  if (exists(dst)) {
    const b=path.join(backupRoot,item.path); fs.mkdirSync(path.dirname(b),{recursive:true}); fs.copyFileSync(dst,b); backedUp++;
  }
  fs.mkdirSync(path.dirname(dst),{recursive:true}); fs.copyFileSync(src,dst); copied++;
}
const verify=[];
for (const item of [...manifest.changed,...manifest.added]) {
  const dst=path.join(target,item.path); const h=exists(dst)?sha(dst):null;
  verify.push({path:item.path,ok:h===item.newSha256});
  if (h!==item.newSha256) problems.push({path:item.path,code:"POST_COPY_VERIFY_FAILED",sha256:h});
}
const dbShaAfter=exists(dbPath)?sha(dbPath):null;
if (dbShaBefore!==dbShaAfter) problems.push({path:"server/kourosh_inventory.db",code:"DATABASE_CHANGED_UNEXPECTEDLY",before:dbShaBefore,after:dbShaAfter});
const result={status:problems.length?"FAILED":"PASS",mode:"applied",target,copied,backedUp,backupRoot:backedUp?backupRoot:null,verifyOk:verify.every(v=>v.ok),databaseTouched:dbShaBefore!==dbShaAfter,databaseSha256Before:dbShaBefore,databaseSha256After:dbShaAfter,problems};
console.log(JSON.stringify(result,null,2));
process.exit(problems.length?1:0);
