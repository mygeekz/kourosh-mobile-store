import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { acquireCloudRuntimeLock, readCloudRuntimeLock } from "../runtime/cloudRuntimeState.mjs";
import { prepareCloudRuntimeFilesystem } from "../runtime/cloudRuntimeFilesystem.mjs";
import { CLOUD_CONTROL_SCHEMA_VERSION, configureWritableCloudControlDatabase, initializeCloudControlSchema, inspectCloudControlDatabase, migrateCloudControlSchema } from "../control-plane/cloudControlSchema.mjs";
import { createControlDatabaseBackup } from "./controlDbBackup.mjs";

const chmodPrivate=(file)=>{try{fs.chmodSync(file,0o600);}catch{}};

export const initializeCloudControlDatabase=({config,log=()=>{}}={})=>{
  if(!config)throw new Error("Cloud config is required.");
  const existing=inspectCloudControlDatabase(config.controlDbPath);
  if(existing.exists){
    if(existing.schemaVersion===CLOUD_CONTROL_SCHEMA_VERSION&&existing.integrity==="ok"&&existing.schemaSafety==="metadata_only")return {initialized:true,alreadyInitialized:true,schemaVersion:existing.schemaVersion,tenantCount:existing.tenantCount};
    if(existing.newerThanRuntime)throw Object.assign(new Error("Cloud schema is newer than this runtime."),{code:"CLOUD_SCHEMA_NEWER_THAN_RUNTIME"});
    if(existing.migrationRequired)throw Object.assign(new Error("Cloud schema migration is required; run cloud:migrate explicitly."),{code:"CLOUD_SCHEMA_MIGRATION_REQUIRED"});
    throw Object.assign(new Error("Existing Control DB is not a valid initialized database."),{code:"CONTROL_DB_INITIALIZATION_CONFLICT"});
  }
  prepareCloudRuntimeFilesystem(config,{includeBackupDir:true});
  const file=path.resolve(config.controlDbPath);let db;
  try{db=new DatabaseSync(file);configureWritableCloudControlDatabase(db);initializeCloudControlSchema(db);const row=db.prepare("PRAGMA quick_check").get();const quick=String(Object.values(row||{})[0]||"");if(quick.toLowerCase()!=="ok")throw Object.assign(new Error("Control DB integrity failed after initialization."),{code:"CONTROL_DB_INTEGRITY_FAILED"});}
  catch(error){try{db?.close();}catch{}try{fs.unlinkSync(file);}catch{}for(const suffix of ["-wal","-shm"]){try{fs.unlinkSync(`${file}${suffix}`);}catch{}}throw error;}
  finally{try{db?.close();}catch{}}
  chmodPrivate(file);log("control_db_initialized",{schemaVersion:CLOUD_CONTROL_SCHEMA_VERSION});return {initialized:true,alreadyInitialized:false,schemaVersion:CLOUD_CONTROL_SCHEMA_VERSION,tenantCount:0};
};

export const migrateCloudControlDatabaseExplicit=async({config,confirm,failureInjector,log=()=>{}}={})=>{
  if(!config)throw new Error("Cloud config is required.");
  if(confirm!=="MIGRATE")throw Object.assign(new Error("Explicit --confirm MIGRATE is required."),{code:"MIGRATION_CONFIRMATION_REQUIRED"});
  const inspection=inspectCloudControlDatabase(config.controlDbPath);
  if(!inspection.exists||!inspection.initialized)throw Object.assign(new Error("Cloud Control DB is not initialized."),{code:"CONTROL_DB_NOT_INITIALIZED"});
  if(inspection.newerThanRuntime)throw Object.assign(new Error("Cloud schema is newer than this runtime."),{code:"CLOUD_SCHEMA_NEWER_THAN_RUNTIME"});
  if(!inspection.migrationRequired)return {migrated:false,alreadyCurrent:true,fromVersion:inspection.schemaVersion,toVersion:CLOUD_CONTROL_SCHEMA_VERSION,backup:null};
  const active=readCloudRuntimeLock(config.runtimeDataDir);if(active.active)throw Object.assign(new Error("Cloud Relay must be stopped before migration."),{code:"CLOUD_RUNTIME_ACTIVE"});
  prepareCloudRuntimeFilesystem(config,{includeBackupDir:true});
  const backup=await createControlDatabaseBackup({dbPath:config.controlDbPath,backupDir:config.backupDir,retention:config.backupRetention,label:"pre-migrate",expectedSchemaVersion:inspection.schemaVersion,log});
  const lock=await acquireCloudRuntimeLock(config.runtimeDataDir);let db;
  try{
    db=new DatabaseSync(config.controlDbPath);configureWritableCloudControlDatabase(db);const migrated=migrateCloudControlSchema(db,{failureInjector});db.close();db=null;chmodPrivate(config.controlDbPath);
    const after=inspectCloudControlDatabase(config.controlDbPath);if(after.schemaVersion!==CLOUD_CONTROL_SCHEMA_VERSION||after.integrity!=="ok")throw Object.assign(new Error("Cloud migration verification failed."),{code:"CLOUD_MIGRATION_VERIFY_FAILED"});
    log("control_db_migrated",{fromVersion:inspection.schemaVersion,toVersion:CLOUD_CONTROL_SCHEMA_VERSION});return {...migrated,backup:backup.file};
  }finally{try{db?.close();}catch{}await lock.release();}
};
