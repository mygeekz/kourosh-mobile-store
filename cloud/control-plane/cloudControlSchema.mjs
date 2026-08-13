import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { validateAssignedMiniAppUrl, validateDnsHostname } from "../shared/cloudHostname.mjs";

export const CLOUD_CONTROL_SCHEMA_VERSION=2;

const tableExists=(db,name)=>Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(String(name)));
const columnNames=(db,table)=>new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(row=>String(row.name)));
const schemaRows=(db)=>db.prepare("SELECT type,name,sql FROM sqlite_master WHERE type IN ('table','index') ORDER BY type,name").all();
const schemaText=(db)=>schemaRows(db).map(row=>String(row.sql||"").toLowerCase()).join("\n");
const forbiddenSchema=/\b(customers?|partners?|sales?|installments?|inventory|invoices?|profit|payments?|ledger|imei|bot[_ ]?token|telegram[_ ]?token|initdata|bearer)\b/i;

export const createCloudControlSchemaV2=(db)=>{
  db.exec(`CREATE TABLE IF NOT EXISTS cloud_tenants (
 installation_id TEXT PRIMARY KEY,
 assigned_store_id TEXT NOT NULL UNIQUE,
 public_key_pem TEXT NOT NULL,
 public_key_fingerprint TEXT NOT NULL UNIQUE,
 assigned_host TEXT NOT NULL COLLATE NOCASE UNIQUE,
 assigned_public_url TEXT NOT NULL,
 tenant_status TEXT NOT NULL CHECK(tenant_status IN ('active','suspended','revoked')) DEFAULT 'active',
 credential_version INTEGER NOT NULL DEFAULT 1,
 assignment_version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 last_connected_at TEXT,
 last_disconnected_at TEXT,
 revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS cloud_enrollment_codes (
 code_id TEXT PRIMARY KEY,
 code_hash TEXT NOT NULL,
 purpose TEXT NOT NULL CHECK(purpose IN ('enroll','recovery')),
 target_store_id TEXT,
 expires_at TEXT NOT NULL,
 used_at TEXT,
 attempts INTEGER NOT NULL DEFAULT 0,
 max_attempts INTEGER NOT NULL DEFAULT 8,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cloud_enrollment_expiry ON cloud_enrollment_codes(expires_at);`);
};

export const configureWritableCloudControlDatabase=(db)=>{
  try{db.enableLoadExtension(false);}catch{}
  db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA synchronous=NORMAL; PRAGMA trusted_schema=OFF;");
};

export const configureOperationalCloudControlDatabase=(db)=>{
  try{db.enableLoadExtension(false);}catch{}
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA synchronous=NORMAL; PRAGMA trusted_schema=OFF;");
};

export const readCloudSchemaVersion=(db)=>Number(db.prepare("PRAGMA user_version").get().user_version||0);

export const initializeCloudControlSchema=(db)=>{
  const version=readCloudSchemaVersion(db);
  if(version>CLOUD_CONTROL_SCHEMA_VERSION)throw Object.assign(new Error("Cloud metadata schema is newer than this runtime."),{code:"CLOUD_SCHEMA_NEWER_THAN_RUNTIME"});
  if(tableExists(db,"cloud_tenants")||tableExists(db,"cloud_enrollment_codes")||version!==0)throw Object.assign(new Error("Control database is not empty; explicit migration/inspection is required."),{code:"CONTROL_DB_NOT_EMPTY"});
  db.exec("BEGIN IMMEDIATE");
  try{createCloudControlSchemaV2(db);db.exec(`PRAGMA user_version=${CLOUD_CONTROL_SCHEMA_VERSION}`);db.exec("COMMIT");}
  catch(error){try{db.exec("ROLLBACK");}catch{}throw error;}
};

export const migrateCloudControlSchema=(db,{failureInjector}={})=>{
  const fromVersion=readCloudSchemaVersion(db);
  if(fromVersion>CLOUD_CONTROL_SCHEMA_VERSION)throw Object.assign(new Error("Cloud metadata schema is newer than this runtime."),{code:"CLOUD_SCHEMA_NEWER_THAN_RUNTIME"});
  if(fromVersion===CLOUD_CONTROL_SCHEMA_VERSION)return {migrated:false,fromVersion,toVersion:CLOUD_CONTROL_SCHEMA_VERSION};
  if(fromVersion<1||!tableExists(db,"cloud_tenants"))throw Object.assign(new Error("Unsupported Cloud schema; initialize a new Control DB explicitly."),{code:"CLOUD_SCHEMA_MIGRATION_UNSUPPORTED"});
  db.exec("BEGIN IMMEDIATE");
  try{
    if(fromVersion===1){
      createCloudControlSchemaV2(db);
      const cols=columnNames(db,"cloud_tenants");
      if(!cols.has("assignment_version"))db.exec("ALTER TABLE cloud_tenants ADD COLUMN assignment_version INTEGER NOT NULL DEFAULT 1");
      failureInjector?.("after-v1-schema");
      db.exec(`PRAGMA user_version=${CLOUD_CONTROL_SCHEMA_VERSION}`);
    }
    failureInjector?.("before-commit");
    db.exec("COMMIT");
    return {migrated:true,fromVersion,toVersion:CLOUD_CONTROL_SCHEMA_VERSION};
  }catch(error){try{db.exec("ROLLBACK");}catch{}throw error;}
};


export const assertCurrentCloudControlDatabaseConnection=(db)=>{
  const version=readCloudSchemaVersion(db);
  if(version>CLOUD_CONTROL_SCHEMA_VERSION)throw Object.assign(new Error("Cloud metadata schema is newer than this runtime."),{code:"CLOUD_SCHEMA_NEWER_THAN_RUNTIME"});
  if(version<CLOUD_CONTROL_SCHEMA_VERSION)throw Object.assign(new Error("Cloud schema migration is required."),{code:"CLOUD_SCHEMA_MIGRATION_REQUIRED"});
  if(!tableExists(db,"cloud_tenants")||!tableExists(db,"cloud_enrollment_codes"))throw Object.assign(new Error("Cloud Control DB schema is incomplete."),{code:"CONTROL_DB_SCHEMA_INVALID"});
  if(!columnNames(db,"cloud_tenants").has("assignment_version"))throw Object.assign(new Error("Cloud schema migration is required."),{code:"CLOUD_SCHEMA_MIGRATION_REQUIRED"});
  const quick=String(Object.values(db.prepare("PRAGMA quick_check").get()||{})[0]||"");if(quick.toLowerCase()!=="ok")throw Object.assign(new Error("Cloud Control DB integrity check failed."),{code:"CONTROL_DB_INTEGRITY_FAILED"});
  if(forbiddenSchema.test(schemaText(db)))throw Object.assign(new Error("Cloud Control DB schema is unsafe."),{code:"CLOUD_BUSINESS_SCHEMA_DETECTED"});
  return {schemaVersion:version,integrity:quick};
};


const readHostReadinessIssues=(db)=>{
  const issues=[];
  if(!tableExists(db,"cloud_tenants"))return issues;
  const cols=columnNames(db,"cloud_tenants");
  if(!cols.has("assigned_store_id")||!cols.has("assigned_host")||!cols.has("assigned_public_url"))return issues;
  for(const row of db.prepare("SELECT assigned_store_id,assigned_host,assigned_public_url FROM cloud_tenants ORDER BY assigned_store_id").all()){
    const host=String(row.assigned_host||"").toLowerCase();
    const hostCheck=validateDnsHostname(host);
    const urlCheck=validateAssignedMiniAppUrl(String(row.assigned_public_url||""));
    if(!hostCheck.ok||!urlCheck.ok||urlCheck.host!==host)issues.push({storeId:String(row.assigned_store_id||""),code:"HOST_REASSIGNMENT_REQUIRED"});
  }
  return issues;
};

export const openOperationalCloudControlDatabase=(dbPath)=>{
  const resolved=path.resolve(String(dbPath||""));
  if(!resolved||!fs.existsSync(resolved))throw Object.assign(new Error("Cloud Control DB is not initialized."),{code:"CONTROL_DB_NOT_INITIALIZED"});
  let db;
  try{
    db=new DatabaseSync(resolved);
    configureOperationalCloudControlDatabase(db);
    const current=assertCurrentCloudControlDatabaseConnection(db);
    const hostReadinessIssues=readHostReadinessIssues(db);
    const tenantCount=Number(db.prepare("SELECT COUNT(*) AS count FROM cloud_tenants").get().count||0);
    return {db,inspection:{exists:true,initialized:true,schemaVersion:current.schemaVersion,migrationRequired:false,newerThanRuntime:false,integrity:"ok",tenantCount,hostReadinessIssues,schemaSafety:"metadata_only",schemaRows:schemaRows(db)}};
  }catch(error){try{db?.close();}catch{}throw error;}
};

export const inspectCloudControlDatabase=(dbPath)=>{
  const resolved=path.resolve(String(dbPath||""));
  if(!resolved||!fs.existsSync(resolved))return {exists:false,initialized:false,schemaVersion:null,migrationRequired:false,newerThanRuntime:false,integrity:null,tenantCount:0,hostReadinessIssues:[],schemaSafety:"unknown",schemaRows:[]};
  const walPath=`${resolved}-wal`;if(fs.existsSync(walPath)&&fs.statSync(walPath).size>0)return {exists:true,initialized:false,schemaVersion:null,migrationRequired:false,newerThanRuntime:false,integrity:"unknown",tenantCount:0,hostReadinessIssues:[],schemaSafety:"unknown",schemaRows:[],errorCode:"CONTROL_DB_WAL_ACTIVE_READONLY_INSPECTION_BLOCKED",errorMessage:"Read-only immutable inspection refused while a non-empty WAL is present."};
  let db;
  const immutableUrl=`${pathToFileURL(resolved).href}?immutable=1`;
  try{db=new DatabaseSync(immutableUrl,{readOnly:true});
    const version=readCloudSchemaVersion(db);
    const quick=String(Object.values(db.prepare("PRAGMA quick_check").get()||{})[0]||"");
    const hasTenants=tableExists(db,"cloud_tenants");
    const rows=schemaRows(db);const text=rows.map(row=>String(row.sql||"").toLowerCase()).join("\n");
    let tenantCount=0;const hostReadinessIssues=hasTenants?readHostReadinessIssues(db):[];
    if(hasTenants)tenantCount=Number(db.prepare("SELECT COUNT(*) AS count FROM cloud_tenants").get().count||0);
    return {exists:true,initialized:hasTenants&&version>0,schemaVersion:version,migrationRequired:version<CLOUD_CONTROL_SCHEMA_VERSION,newerThanRuntime:version>CLOUD_CONTROL_SCHEMA_VERSION,integrity:quick.toLowerCase()==="ok"?"ok":quick,tenantCount,hostReadinessIssues,schemaSafety:forbiddenSchema.test(text)?"unsafe":"metadata_only",schemaRows:rows};
  }catch(error){return {exists:true,initialized:false,schemaVersion:null,migrationRequired:false,newerThanRuntime:false,integrity:"error",tenantCount:0,hostReadinessIssues:[],schemaSafety:"unknown",schemaRows:[],errorCode:String(error?.code||"CONTROL_DB_INSPECTION_FAILED"),errorMessage:String(error?.message||error)};}
  finally{try{db?.close();}catch{}}
};

export const assertCurrentCloudControlDatabase=(dbPath)=>{
  const inspection=inspectCloudControlDatabase(dbPath);
  if(inspection.errorCode)throw Object.assign(new Error(inspection.errorMessage||inspection.errorCode),{code:inspection.errorCode,inspection});
  if(!inspection.exists||!inspection.initialized)throw Object.assign(new Error("Cloud Control DB is not initialized."),{code:"CONTROL_DB_NOT_INITIALIZED",inspection});
  if(inspection.newerThanRuntime)throw Object.assign(new Error("Cloud schema is newer than this runtime."),{code:"CLOUD_SCHEMA_NEWER_THAN_RUNTIME",inspection});
  if(inspection.migrationRequired)throw Object.assign(new Error("Cloud schema migration is required."),{code:"CLOUD_SCHEMA_MIGRATION_REQUIRED",inspection});
  if(inspection.integrity!=="ok")throw Object.assign(new Error("Cloud Control DB integrity check failed."),{code:"CONTROL_DB_INTEGRITY_FAILED",inspection});
  if(inspection.schemaSafety!=="metadata_only")throw Object.assign(new Error("Cloud Control DB schema is unsafe."),{code:"CLOUD_BUSINESS_SCHEMA_DETECTED",inspection});
  return inspection;
};
