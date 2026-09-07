#!/usr/bin/env node
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createCloudRelayServer } from "./relayServer.mjs";
import { MemoryCloudTenantRegistry } from "./tenantRegistry.mjs";
import { PersistentCloudTenantRegistry } from "../control-plane/PersistentCloudTenantRegistry.mjs";
import { CLOUD_CONTROL_SCHEMA_VERSION, openOperationalCloudControlDatabase } from "../control-plane/cloudControlSchema.mjs";
import { createControlPlaneHttpHandler } from "../control-plane/controlPlaneApi.mjs";
import { resolveCloudProductionConfig, assertCloudMutationRuntimeSupported } from "../runtime/cloudProductionConfig.mjs";
import { prepareCloudRuntimeFilesystem } from "../runtime/cloudRuntimeFilesystem.mjs";
import { initializeCloudControlDatabase } from "../operations/cloudControlLifecycle.mjs";
import { acquireCloudRuntimeLock } from "../runtime/cloudRuntimeState.mjs";

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  const environment=String(process.env.NODE_ENV||"production").trim().toLowerCase();
  const useLegacyMemory=["test","development"].includes(environment)&&!String(process.env.KOUROSH_CLOUD_CONTROL_DB_PATH||"").trim()&&!String(process.env.KOUROSH_CLOUD_PUBLIC_BASE_DOMAIN||"").trim();
  let config=null,lock=null,registry=null;
  const log=(event,meta={})=>console.log(JSON.stringify({timestamp:new Date().toISOString(),event,...meta}));
  try{
    if(!useLegacyMemory){
      // Operational startup deliberately does not use the immutable audit inspector.
      // The lock is acquired before the writable SQLite open so crash/WAL recovery is single-instance.
      config=resolveCloudProductionConfig(process.env,{environment});
      assertCloudMutationRuntimeSupported(environment);
      prepareCloudRuntimeFilesystem(config,{includeBackupDir:true});
      lock=await acquireCloudRuntimeLock(config.runtimeDataDir);
      if(!fs.existsSync(config.controlDbPath)){
        const devAutoInit=["test","development"].includes(environment)&&String(process.env.KOUROSH_CLOUD_DEV_AUTO_INIT||"")==="1";
        if(devAutoInit)initializeCloudControlDatabase({config,log});
        else throw Object.assign(new Error("Cloud Control DB is not initialized. Run cloud:init explicitly."),{code:"CONTROL_DB_NOT_INITIALIZED"});
      }
      const opened=openOperationalCloudControlDatabase(config.controlDbPath);
      if(opened.inspection.hostReadinessIssues.length){try{opened.db.close();}catch{}throw Object.assign(new Error("Cloud tenant host reassignment is required before startup."),{code:"HOST_REASSIGNMENT_REQUIRED"});}
      registry=new PersistentCloudTenantRegistry({dbPath:config.controlDbPath,db:opened.db});
    }else registry=new MemoryCloudTenantRegistry();
  }catch(error){try{registry?.close?.();}catch{}await lock?.release?.();throw error;}

  let relay;
  try{
    const controlPlaneHandler=useLegacyMemory?null:createControlPlaneHttpHandler({registry,environment,publicBaseDomain:config.publicBaseDomain,connectorEndpoint:config.connectorPublicEndpoint,controlHost:config.controlHost,log,assertMutationRuntimeSupported:()=>assertCloudMutationRuntimeSupported(environment)});
    relay=createCloudRelayServer({
      registry,controlPlaneHandler,
      edgeHosts:config?{controlHost:config.controlHost,connectorHost:config.connectorHost}:undefined,
      limits:config?.limits,
      enableDevProvisioning:useLegacyMemory&&String(process.env.KOUROSH_CLOUD_DEV_PROVISIONING||"")==="1",
      edgeTrust:{mode:config?.edgeClientIpMode||String(process.env.KOUROSH_CLOUD_EDGE_CLIENT_IP_MODE||"direct").trim(),trustedLoopbackEdgeSecret:config?.trustedLoopbackEdgeSecret||process.env.KOUROSH_CLOUD_TRUSTED_LOOPBACK_EDGE_SECRET,cloudflareTrustedProxyIps:config?.cloudflareTrustedProxyIps||String(process.env.KOUROSH_CLOUD_CLOUDFLARE_TRUSTED_PROXY_IPS||"").split(",").map(v=>v.trim()).filter(Boolean)},
      logSink:(record)=>console.log(JSON.stringify(record)),
    });
  }catch(error){try{registry.close?.();}catch{}await lock?.release?.();throw error;}
  const host=config?.bindHost||String(process.env.KOUROSH_CLOUD_RELAY_BIND_HOST||"127.0.0.1").trim()||"127.0.0.1";
  const port=config?.port||Number(process.env.KOUROSH_CLOUD_RELAY_PORT||8787);
  relay.server.listen(port,host,()=>{log("cloud_started",{bindHost:host,port,environment});log("cloud_ready",{schemaVersion:registry.getSchemaVersion?.()||CLOUD_CONTROL_SCHEMA_VERSION});});
  let closing=false;
  const shutdown=async(signal)=>{if(closing)return;closing=true;log("graceful_shutdown",{signal});const timeoutMs=config?.shutdownTimeoutMs||10_000;const hard=setTimeout(()=>{log("cloud_not_ready",{reason:"shutdown_timeout"});void lock?.release?.();process.exit(1);},timeoutMs);hard.unref?.();try{await relay.close();try{registry.close?.();}catch{}await lock?.release?.();clearTimeout(hard);process.exit(0);}catch{await lock?.release?.();clearTimeout(hard);process.exit(1);}};
  process.once("SIGTERM",()=>void shutdown("SIGTERM"));process.once("SIGINT",()=>void shutdown("SIGINT"));
}
