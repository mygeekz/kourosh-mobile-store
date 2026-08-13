import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync, backup as sqliteBackup } from "node:sqlite";
import { CLOUD_CONTROL_SCHEMA_VERSION } from "../control-plane/cloudControlSchema.mjs";
import { acquireCloudRuntimeLock, readCloudRuntimeLock } from "../runtime/cloudRuntimeState.mjs";

const privateFile=(file)=>{try{fs.chmodSync(file,0o600);}catch{}};
const timestamp=()=>new Date().toISOString().replace(/[:.]/g,"-");
const within=(child,parent)=>{const c=path.resolve(child),p=path.resolve(parent);return c===p||c.startsWith(`${p}${path.sep}`);};
const tableExists=(db,name)=>Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(String(name)));

export const validateControlDatabaseFile=(file,{expectedSchemaVersion=CLOUD_CONTROL_SCHEMA_VERSION}={})=>{
  const resolved=path.resolve(file);if(!fs.existsSync(resolved))throw Object.assign(new Error("Control database file does not exist."),{code:"CONTROL_DB_NOT_FOUND"});
  const db=new DatabaseSync(`${pathToFileURL(resolved).href}?immutable=1`,{readOnly:true});
  try{
    const quick=String(Object.values(db.prepare("PRAGMA quick_check").get()||{})[0]||"");if(quick.toLowerCase()!=="ok")throw Object.assign(new Error("Control database integrity check failed."),{code:"CONTROL_DB_INTEGRITY_FAILED"});
    const version=Number(db.prepare("PRAGMA user_version").get().user_version||0);if(version!==expectedSchemaVersion)throw Object.assign(new Error(`Unexpected Cloud schema version ${version}.`),{code:"CONTROL_DB_SCHEMA_VERSION_INVALID"});
    const table=tableExists(db,"cloud_tenants");if(!table)throw Object.assign(new Error("Cloud tenant schema missing."),{code:"CONTROL_DB_SCHEMA_INVALID"});
    const tenantCount=Number(db.prepare("SELECT COUNT(*) AS count FROM cloud_tenants").get().count||0);
    return {ok:true,quickCheck:quick,schemaVersion:version,tenantCount};
  }finally{db.close();}
};

const rotateRetention=(backupDir,retention)=>{
  const entries=fs.readdirSync(backupDir,{withFileTypes:true}).filter(e=>e.isFile()&&/^(?:control|pre-restore|pre-migrate)-\d{4}-.*\.db$/.test(e.name)).map(e=>({name:e.name,file:path.join(backupDir,e.name),mtime:fs.statSync(path.join(backupDir,e.name)).mtimeMs})).sort((a,b)=>b.mtime-a.mtime);
  for(const item of entries.slice(Math.max(1,Number(retention)||7))){try{fs.unlinkSync(item.file);}catch{}}
};

export const createControlDatabaseBackup=async({dbPath,backupDir,retention=7,label="control",expectedSchemaVersion=CLOUD_CONTROL_SCHEMA_VERSION,log=()=>{}})=>{
  log("backup_started",{label});
  try{
    const sourcePath=path.resolve(dbPath);const dir=path.resolve(backupDir);fs.mkdirSync(dir,{recursive:true,mode:0o700});
    const source=new DatabaseSync(sourcePath,{readOnly:true});try{const tenantCount=Number(source.prepare("SELECT COUNT(*) AS count FROM cloud_tenants").get().count||0);const temp=path.join(dir,`.${label}-${process.pid}-${Date.now()}.tmp.db`);const final=path.join(dir,`${label}-${timestamp()}.db`);try{fs.unlinkSync(temp);}catch{}
      await sqliteBackup(source,temp);privateFile(temp);const validation=validateControlDatabaseFile(temp,{expectedSchemaVersion});if(validation.tenantCount!==tenantCount)throw Object.assign(new Error("Backup tenant-count sanity check failed."),{code:"CONTROL_BACKUP_SANITY_FAILED"});fs.renameSync(temp,final);privateFile(final);rotateRetention(dir,retention);log("backup_completed",{label,schemaVersion:validation.schemaVersion,tenantCount:validation.tenantCount});return {file:final,...validation};
    }finally{source.close();}
  }catch(error){log("backup_failed",{label,reason:String(error?.code||"backup_failed")});throw error;}
};

const relayPortOpen=({host="127.0.0.1",port,timeoutMs=250}={})=>new Promise(resolve=>{if(!Number(port))return resolve(false);const target=["0.0.0.0","::"].includes(String(host))?"127.0.0.1":String(host||"127.0.0.1");const socket=net.createConnection({host:target,port:Number(port)});let done=false;const finish=value=>{if(done)return;done=true;socket.destroy();resolve(value);};socket.setTimeout(timeoutMs,()=>finish(false));socket.once("connect",()=>finish(true));socket.once("error",()=>finish(false));});

export const restoreControlDatabase=async({dbPath,backupDir,runtimeDataDir,sourceFile,retention=7,relayHost="127.0.0.1",relayPort=null,confirm,log=()=>{}})=>{
  log("restore_started",{});let operationLock=null;
  try{
    if(confirm!=="RESTORE")throw Object.assign(new Error("Explicit --confirm RESTORE is required."),{code:"RESTORE_CONFIRMATION_REQUIRED"});
    const source=path.resolve(sourceFile);const allowed=path.resolve(backupDir);if(!within(source,allowed))throw Object.assign(new Error("Restore source must be inside configured Cloud backup directory."),{code:"RESTORE_PATH_NOT_ALLOWED"});
    const lock=readCloudRuntimeLock(runtimeDataDir);if(lock.active)throw Object.assign(new Error("Cloud Relay must be stopped before restore."),{code:"CLOUD_RUNTIME_ACTIVE"});
    if(await relayPortOpen({host:relayHost,port:relayPort}))throw Object.assign(new Error("Cloud Relay endpoint is still listening; restore refused."),{code:"CLOUD_RELAY_STILL_LISTENING"});
    operationLock=await acquireCloudRuntimeLock(runtimeDataDir);
    const sourceValidation=validateControlDatabaseFile(source);let safety=null;if(fs.existsSync(dbPath))safety=await createControlDatabaseBackup({dbPath,backupDir,retention,label:"pre-restore",log});
    const temp=`${path.resolve(dbPath)}.${process.pid}.${Date.now()}.restore.tmp`;const sourceDb=new DatabaseSync(source,{readOnly:true});try{await sqliteBackup(sourceDb,temp);}finally{sourceDb.close();}
    privateFile(temp);const restoredValidation=validateControlDatabaseFile(temp);if(restoredValidation.tenantCount!==sourceValidation.tenantCount){try{fs.unlinkSync(temp);}catch{}throw Object.assign(new Error("Restored tenant count mismatch."),{code:"RESTORE_SANITY_FAILED"});}
    fs.mkdirSync(path.dirname(path.resolve(dbPath)),{recursive:true,mode:0o700});
    for(const suffix of ["-wal","-shm"]){try{fs.unlinkSync(`${path.resolve(dbPath)}${suffix}`);}catch{}}
    const old=`${path.resolve(dbPath)}.${process.pid}.${Date.now()}.old`;if(fs.existsSync(dbPath))fs.renameSync(dbPath,old);try{fs.renameSync(temp,path.resolve(dbPath));privateFile(path.resolve(dbPath));try{fs.unlinkSync(old);}catch{};}catch(error){try{if(fs.existsSync(old)&&!fs.existsSync(dbPath))fs.renameSync(old,path.resolve(dbPath));}catch{}throw error;}
    const finalValidation=validateControlDatabaseFile(dbPath);if(!finalValidation.ok)throw Object.assign(new Error("Restored database integrity failed."),{code:"CONTROL_DB_INTEGRITY_FAILED"});
    log("restore_completed",{schemaVersion:restoredValidation.schemaVersion,tenantCount:restoredValidation.tenantCount});return {restored:true,file:path.resolve(dbPath),sourceFile:source,safetyBackup:safety?.file||null,...restoredValidation};
  }catch(error){log("restore_failed",{reason:String(error?.code||"restore_failed")});throw error;}
  finally{await operationLock?.release?.();}
};

export const findRecentValidatedBackup=(backupDir,{maxAgeMs=24*60*60_000}={})=>{
  if(!fs.existsSync(backupDir))return {ok:false,code:"BACKUP_DIR_NOT_FOUND",file:null,ageMs:null};
  const candidates=fs.readdirSync(backupDir,{withFileTypes:true}).filter(e=>e.isFile()&&/^control-.*\.db$/.test(e.name)).map(e=>({file:path.join(backupDir,e.name),mtime:fs.statSync(path.join(backupDir,e.name)).mtimeMs})).sort((a,b)=>b.mtime-a.mtime);
  for(const item of candidates){try{validateControlDatabaseFile(item.file);const ageMs=Math.max(0,Date.now()-item.mtime);return {ok:ageMs<=maxAgeMs,code:ageMs<=maxAgeMs?"BACKUP_RECENT":"BACKUP_STALE",file:item.file,ageMs};}catch{}}
  return {ok:false,code:"VALID_BACKUP_NOT_FOUND",file:null,ageMs:null};
};
