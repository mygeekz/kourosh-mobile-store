#!/usr/bin/env node
import { PersistentCloudTenantRegistry } from "./PersistentCloudTenantRegistry.mjs";
import { assertCloudMutationRuntimeSupported, resolveCloudProductionConfig } from "../runtime/cloudProductionConfig.mjs";
import { initializeCloudControlDatabase, migrateCloudControlDatabaseExplicit } from "../operations/cloudControlLifecycle.mjs";
import { createControlDatabaseBackup, restoreControlDatabase } from "../operations/controlDbBackup.mjs";

const args=process.argv.slice(2);const command=args[0]||"";const value=(name,def=null)=>{const i=args.indexOf(name);return i>=0?args[i+1]:def;};
const environment=String(process.env.NODE_ENV||"production");const config=resolveCloudProductionConfig(process.env,{environment});
const mutatingCommands=new Set(["init","migrate","backup","restore","create-enrollment","create-recovery","revoke","reassign-host"]);
if(mutatingCommands.has(command))assertCloudMutationRuntimeSupported(environment);
const log=(event,meta={})=>console.error(JSON.stringify({timestamp:new Date().toISOString(),event,...meta}));
const requireConfirm=(expected)=>{if(String(value("--confirm","")||"")!==expected)throw Object.assign(new Error(`--confirm ${expected} is required.`),{code:"OPERATION_CONFIRMATION_REQUIRED"});};

if(command==="init"){
  const result=initializeCloudControlDatabase({config,log});console.log(JSON.stringify(result,null,2));
}else if(command==="migrate"){
  const result=await migrateCloudControlDatabaseExplicit({config,confirm:String(value("--confirm","")||""),log});console.log(JSON.stringify(result,null,2));
}else if(command==="backup"){
  const result=await createControlDatabaseBackup({dbPath:config.controlDbPath,backupDir:config.backupDir,retention:config.backupRetention,log});console.log(JSON.stringify({backup:true,file:result.file,schemaVersion:result.schemaVersion,tenantCount:result.tenantCount},null,2));
}else if(command==="restore"){
  const source=String(value("--file","")||"");if(!source)throw new Error("--file is required.");requireConfirm("RESTORE");const result=await restoreControlDatabase({dbPath:config.controlDbPath,backupDir:config.backupDir,runtimeDataDir:config.runtimeDataDir,sourceFile:source,retention:config.backupRetention,relayHost:config.bindHost,relayPort:config.port,confirm:"RESTORE",log});console.log(JSON.stringify({restored:true,file:result.file,safetyBackup:result.safetyBackup,tenantCount:result.tenantCount},null,2));
}else{
  const registry=new PersistentCloudTenantRegistry({dbPath:config.controlDbPath});
  try{
    if(command==="create-enrollment"){
      const minutes=Math.max(1,Math.min(Number(value("--expires-minutes","30"))||30,1440));const created=registry.createEnrollmentCode({purpose:"enroll",ttlMs:minutes*60_000});console.log(JSON.stringify({enrollmentCode:created.code,expiresAt:created.expiresAt,note:"Shown once; do not store in logs."},null,2));
    }else if(command==="create-recovery"){
      const storeId=String(value("--store-id","")||"");if(!storeId)throw new Error("--store-id is required.");if(!await registry.getTenantByStoreId(storeId))throw new Error("Tenant not found.");const minutes=Math.max(1,Math.min(Number(value("--expires-minutes","30"))||30,1440));const created=registry.createEnrollmentCode({purpose:"recovery",targetStoreId:storeId,ttlMs:minutes*60_000});console.log(JSON.stringify({recoveryCode:created.code,expiresAt:created.expiresAt,storeId,note:"Shown once; do not store in logs."},null,2));
    }else if(command==="revoke"){
      const storeId=String(value("--store-id","")||"");if(!storeId)throw new Error("--store-id is required.");requireConfirm("REVOKE");const tenant=await registry.revokeTenant(storeId);console.log(JSON.stringify({revoked:true,storeId:tenant.assignedStoreId,installationId:tenant.installationId},null,2));
    }else if(command==="reassign-host"){
      const storeId=String(value("--store-id","")||"");if(!storeId)throw new Error("--store-id is required.");requireConfirm("REASSIGN");const before=await registry.getTenantByStoreId(storeId);if(!before)throw new Error("Tenant not found.");const tenant=await registry.reassignTenantHost(storeId,{baseDomain:config.publicBaseDomain});log("tenant_host_reassigned",{storeId,assignmentVersion:tenant.assignmentVersion});console.log(JSON.stringify({reassigned:true,storeId,oldHost:before.assignedHost,assignedHost:tenant.assignedHost,assignedPublicUrl:tenant.assignedPublicUrl,assignmentVersion:tenant.assignmentVersion},null,2));
    }else{throw new Error("Usage: init | migrate --confirm MIGRATE | create-enrollment | create-recovery --store-id <id> | revoke --store-id <id> --confirm REVOKE | reassign-host --store-id <id> --confirm REASSIGN | backup | restore --file <path> --confirm RESTORE");}
  }finally{registry.close();}
}
