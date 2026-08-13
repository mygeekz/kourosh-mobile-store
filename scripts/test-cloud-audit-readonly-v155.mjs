import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { initializeCloudControlDatabase } from "../cloud/operations/cloudControlLifecycle.mjs";

const hash=file=>fs.existsSync(file)?crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"):null;
const snapshot=root=>{if(!fs.existsSync(root))return null;const out={};const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const full=path.join(dir,e.name),rel=path.relative(root,full);if(e.isDirectory()){out[`${rel}/`]="dir";walk(full);}else out[rel]=hash(full);}};walk(root);return out;};
const envFor=(runtime,db)=>({...process.env,NODE_ENV:"production",KOUROSH_CLOUD_RUNTIME_DIR:runtime,KOUROSH_CLOUD_CONTROL_DB_PATH:db,KOUROSH_CLOUD_BACKUP_DIR:path.join(runtime,"backups"),KOUROSH_CLOUD_PUBLIC_BASE_DOMAIN:"example.invalid",KOUROSH_CLOUD_CONTROL_HOST:"control.example.invalid",KOUROSH_CLOUD_CONNECTOR_HOST:"connector.example.invalid",KOUROSH_CLOUD_INSTANCE_COUNT:"1",KOUROSH_CLOUD_DEV_PROVISIONING:"0",KOUROSH_CLOUD_EDGE_CLIENT_IP_MODE:"direct"});
const runAudit=env=>spawnSync(process.execPath,["scripts/audit-cloud-production-readiness-v155.mjs"],{cwd:process.cwd(),env,encoding:"utf8"});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"kourosh-v155-readonly-"));
try{
  // Missing DB/runtime: command must not create any persistent path.
  const missingRuntime=path.join(temp,"missing-runtime"),missingDb=path.join(missingRuntime,"control.db");const beforeMissing=snapshot(missingRuntime);const missing=runAudit(envFor(missingRuntime,missingDb));assert.notEqual(missing.status,0);assert.match(`${missing.stdout}\n${missing.stderr}`,/CONTROL_DB_NOT_INITIALIZED/);assert.equal(fs.existsSync(missingDb),false);assert.deepEqual(snapshot(missingRuntime),beforeMissing);assert.equal(fs.existsSync(missingRuntime),false);

  // Legacy v1: exact database bytes and schema version remain unchanged; no sidecars created.
  const legacyRuntime=path.join(temp,"legacy");fs.mkdirSync(path.join(legacyRuntime,"backups"),{recursive:true});const legacyDb=path.join(legacyRuntime,"control.db");const legacy=new DatabaseSync(legacyDb);legacy.exec(`CREATE TABLE cloud_tenants (installation_id TEXT PRIMARY KEY,assigned_store_id TEXT NOT NULL UNIQUE,public_key_pem TEXT NOT NULL,public_key_fingerprint TEXT NOT NULL UNIQUE,assigned_host TEXT NOT NULL COLLATE NOCASE UNIQUE,assigned_public_url TEXT NOT NULL,tenant_status TEXT NOT NULL DEFAULT 'active',credential_version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,last_connected_at TEXT,last_disconnected_at TEXT,revoked_at TEXT);CREATE TABLE cloud_enrollment_codes(code_id TEXT PRIMARY KEY,code_hash TEXT NOT NULL,purpose TEXT NOT NULL,target_store_id TEXT,expires_at TEXT NOT NULL,used_at TEXT,attempts INTEGER NOT NULL DEFAULT 0,max_attempts INTEGER NOT NULL DEFAULT 8,created_at TEXT NOT NULL);PRAGMA user_version=1;`);legacy.close();const legacyHash=hash(legacyDb),legacySnapshot=snapshot(legacyRuntime);const legacyRun=runAudit(envFor(legacyRuntime,legacyDb));assert.notEqual(legacyRun.status,0);assert.match(`${legacyRun.stdout}\n${legacyRun.stderr}`,/CLOUD_SCHEMA_MIGRATION_REQUIRED/);assert.equal(hash(legacyDb),legacyHash);assert.deepEqual(snapshot(legacyRuntime),legacySnapshot);const legacyCheck=new DatabaseSync(legacyDb,{readOnly:true});assert.equal(Number(legacyCheck.prepare("PRAGMA user_version").get().user_version),1);legacyCheck.close();assert.equal(fs.existsSync(`${legacyDb}-wal`),false);assert.equal(fs.existsSync(`${legacyDb}-shm`),false);

  // Current v2: byte-stable and no WAL/SHM artifacts.
  const currentRuntime=path.join(temp,"current"),currentDb=path.join(currentRuntime,"control.db");initializeCloudControlDatabase({config:{runtimeDataDir:currentRuntime,controlDbPath:currentDb,backupDir:path.join(currentRuntime,"backups")}});for(const suffix of ["-wal","-shm"]){try{fs.unlinkSync(`${currentDb}${suffix}`);}catch{}}const currentHash=hash(currentDb),currentSnapshot=snapshot(currentRuntime);const currentRun=runAudit(envFor(currentRuntime,currentDb));assert.notEqual(currentRun.status,0);assert.equal(hash(currentDb),currentHash);assert.deepEqual(snapshot(currentRuntime),currentSnapshot);assert.equal(fs.existsSync(`${currentDb}-wal`),false);assert.equal(fs.existsSync(`${currentDb}-shm`),false);

  console.log(JSON.stringify({cloudAuditReadonly:"PASS",missingDbRemainedAbsent:true,legacyDbByteStable:true,legacySchemaVersion:1,currentDbByteStable:true,newWalShmArtifacts:0},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
