import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { initializeCloudControlDatabase } from "../cloud/operations/cloudControlLifecycle.mjs";

const hash=file=>fs.existsSync(file)?crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"):null;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const freePort=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.once("error",reject);s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});});
const baseEnv=(runtime,db,port)=>({...process.env,NODE_ENV:"development",KOUROSH_CLOUD_RUNTIME_DIR:runtime,KOUROSH_CLOUD_CONTROL_DB_PATH:db,KOUROSH_CLOUD_BACKUP_DIR:path.join(runtime,"backups"),KOUROSH_CLOUD_PUBLIC_BASE_DOMAIN:"example.invalid",KOUROSH_CLOUD_CONTROL_HOST:"control.example.invalid",KOUROSH_CLOUD_CONNECTOR_HOST:"connector.example.invalid",KOUROSH_CLOUD_INSTANCE_COUNT:"1",KOUROSH_CLOUD_DEV_PROVISIONING:"0",KOUROSH_CLOUD_EDGE_CLIENT_IP_MODE:"direct",KOUROSH_CLOUD_RELAY_BIND_HOST:"127.0.0.1",KOUROSH_CLOUD_RELAY_PORT:String(port)});
const prodAuditEnv=(runtime,db,port)=>({...baseEnv(runtime,db,port),NODE_ENV:"production"});
const waitForOutput=(child,pattern,timeoutMs=7000)=>new Promise((resolve,reject)=>{let text="";const timer=setTimeout(()=>reject(new Error(`Timed out waiting for ${pattern}; output=${text}`)),timeoutMs);const onData=d=>{text+=String(d);if(pattern.test(text)){clearTimeout(timer);resolve(text);}};child.stdout?.on("data",onData);child.stderr?.on("data",onData);child.once("exit",code=>{if(!pattern.test(text)){clearTimeout(timer);reject(new Error(`Process exited ${code}; output=${text}`));}});});
const stopChild=async child=>{if(child.exitCode!==null)return child.exitCode;child.kill("SIGTERM");return await new Promise(resolve=>child.once("exit",code=>resolve(code)));};
const insertCrashRow=async(dbPath,suffix)=>{
  const writer=`import {DatabaseSync} from 'node:sqlite';\nconst db=new DatabaseSync(process.argv[1]);db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; PRAGMA synchronous=FULL;');const now=new Date().toISOString();db.prepare(\"INSERT INTO cloud_tenants(installation_id,assigned_store_id,public_key_pem,public_key_fingerprint,assigned_host,assigned_public_url,tenant_status,credential_version,assignment_version,created_at,updated_at) VALUES(?,?,?,?,?,?, 'active',1,1,?,?)\").run('inst_${suffix.padEnd(24,'X').slice(0,24)}','store_${suffix.padEnd(16,'Y').slice(0,16)}','PUBLIC-${suffix}','fp-${suffix}','s-${suffix.toLowerCase()}12345678.apps.example.invalid','https://s-${suffix.toLowerCase()}12345678.apps.example.invalid/miniapp.html',now,now);console.log('COMMITTED');setInterval(()=>{},1000);`;
  const child=spawn(process.execPath,["--input-type=module","-e",writer,dbPath],{cwd:process.cwd(),stdio:["ignore","pipe","pipe"]});
  await waitForOutput(child,/COMMITTED/);await sleep(50);assert(fs.existsSync(`${dbPath}-wal`));assert(fs.statSync(`${dbPath}-wal`).size>0);child.kill("SIGKILL");await new Promise(r=>child.once("exit",r));return {wal:`${dbPath}-wal`,shm:`${dbPath}-shm`};
};
const verifyRow=(dbPath,suffix)=>{const db=new DatabaseSync(dbPath);try{const row=db.prepare("SELECT installation_id FROM cloud_tenants WHERE public_key_fingerprint=?").get(`fp-${suffix}`);assert(row);const quick=String(Object.values(db.prepare("PRAGMA quick_check").get()||{})[0]||"");assert.equal(quick.toLowerCase(),"ok");assert.equal(Number(db.prepare("PRAGMA user_version").get().user_version),2);}finally{db.close();}};

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"kourosh-v156-crash-"));
try{
  const runtime=path.join(temp,"runtime"),dbPath=path.join(runtime,"control.db"),port=await freePort();
  const config={runtimeDataDir:runtime,controlDbPath:dbPath,backupDir:path.join(runtime,"backups")};initializeCloudControlDatabase({config});
  const first=await insertCrashRow(dbPath,"CRASHA");
  const before={db:hash(dbPath),wal:hash(first.wal),shm:hash(first.shm)};
  const audit=spawnSync(process.execPath,["scripts/audit-cloud-production-readiness-v155.mjs"],{cwd:process.cwd(),env:prodAuditEnv(runtime,dbPath,port),encoding:"utf8"});
  assert.notEqual(audit.status,0);assert.match(`${audit.stdout}\n${audit.stderr}`,/CONTROL_DB_WAL_ACTIVE_READONLY_INSPECTION_BLOCKED/);
  assert.deepEqual({db:hash(dbPath),wal:hash(first.wal),shm:hash(first.shm)},before);
  const lockPath=path.join(runtime,"cloud-relay.lock");fs.writeFileSync(lockPath,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));const blocked=spawnSync(process.execPath,["cloud/relay-server/index.mjs"],{cwd:process.cwd(),env:baseEnv(runtime,dbPath,port),encoding:"utf8",timeout:4000});assert.notEqual(blocked.status,0);assert.match(`${blocked.stdout}\n${blocked.stderr}`,/CLOUD_RUNTIME_ALREADY_ACTIVE|already active/i);assert.deepEqual({db:hash(dbPath),wal:hash(first.wal),shm:hash(first.shm)},before);fs.unlinkSync(lockPath);
  const relay=spawn(process.execPath,["cloud/relay-server/index.mjs"],{cwd:process.cwd(),env:baseEnv(runtime,dbPath,port),stdio:["ignore","pipe","pipe"]});
  await waitForOutput(relay,/"event":"cloud_ready"/);assert.equal(await stopChild(relay),0);verifyRow(dbPath,"CRASHA");

  // Idempotency: crash after operational recovery and lock acquisition but before HTTP listen, then start Relay again.
  const second=await insertCrashRow(dbPath,"CRASHB");assert(fs.statSync(second.wal).size>0);
  const recoveryProbe=`import {resolveCloudProductionConfig} from './cloud/runtime/cloudProductionConfig.mjs';import {prepareCloudRuntimeFilesystem} from './cloud/runtime/cloudRuntimeFilesystem.mjs';import {acquireCloudRuntimeLock} from './cloud/runtime/cloudRuntimeState.mjs';import {openOperationalCloudControlDatabase} from './cloud/control-plane/cloudControlSchema.mjs';const c=resolveCloudProductionConfig(process.env,{environment:'development'});prepareCloudRuntimeFilesystem(c,{includeBackupDir:true});const l=await acquireCloudRuntimeLock(c.runtimeDataDir);const o=openOperationalCloudControlDatabase(c.controlDbPath);console.log('RECOVERED_BEFORE_LISTEN');process.kill(process.pid,'SIGKILL');`;
  const probe=spawn(process.execPath,["--input-type=module","-e",recoveryProbe],{cwd:process.cwd(),env:baseEnv(runtime,dbPath,port),stdio:["ignore","pipe","pipe"]});await waitForOutput(probe,/RECOVERED_BEFORE_LISTEN/);await new Promise(r=>probe.once("exit",r));
  const relay2=spawn(process.execPath,["cloud/relay-server/index.mjs"],{cwd:process.cwd(),env:baseEnv(runtime,dbPath,port),stdio:["ignore","pipe","pipe"]});await waitForOutput(relay2,/"event":"cloud_ready"/);assert.equal(await stopChild(relay2),0);verifyRow(dbPath,"CRASHB");

  const legacyRuntime=path.join(temp,"legacy-runtime"),legacyDb=path.join(legacyRuntime,"control.db"),legacyPort=await freePort();fs.mkdirSync(legacyRuntime,{recursive:true});const legacy=new DatabaseSync(legacyDb);legacy.exec(`CREATE TABLE cloud_tenants (installation_id TEXT PRIMARY KEY,assigned_store_id TEXT NOT NULL UNIQUE,public_key_pem TEXT NOT NULL,public_key_fingerprint TEXT NOT NULL UNIQUE,assigned_host TEXT NOT NULL COLLATE NOCASE UNIQUE,assigned_public_url TEXT NOT NULL,tenant_status TEXT NOT NULL DEFAULT 'active',credential_version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,last_connected_at TEXT,last_disconnected_at TEXT,revoked_at TEXT);CREATE TABLE cloud_enrollment_codes(code_id TEXT PRIMARY KEY,code_hash TEXT NOT NULL,purpose TEXT NOT NULL,target_store_id TEXT,expires_at TEXT NOT NULL,used_at TEXT,attempts INTEGER NOT NULL DEFAULT 0,max_attempts INTEGER NOT NULL DEFAULT 8,created_at TEXT NOT NULL);PRAGMA user_version=1;`);legacy.close();const legacyStart=spawnSync(process.execPath,["cloud/relay-server/index.mjs"],{cwd:process.cwd(),env:baseEnv(legacyRuntime,legacyDb,legacyPort),encoding:"utf8",timeout:4000});assert.notEqual(legacyStart.status,0);assert.match(`${legacyStart.stdout}\n${legacyStart.stderr}`,/CLOUD_SCHEMA_MIGRATION_REQUIRED|migration is required/i);const legacyCheck=new DatabaseSync(legacyDb,{readOnly:true});assert.equal(Number(legacyCheck.prepare("PRAGMA user_version").get().user_version),1);legacyCheck.close();

  console.log(JSON.stringify({cloudCrashRecovery:"PASS",auditDidNotRecoverWal:true,lockPrecedesRecovery:true,operationalStartupRecovered:true,committedMetadataPreserved:true,startupRecoveryIdempotent:true,startupDoesNotMigrate:true,quickCheck:"ok",schemaVersion:2},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
