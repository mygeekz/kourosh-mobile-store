import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { PersistentCloudTenantRegistry, CLOUD_CONTROL_SCHEMA_VERSION } from "../cloud/control-plane/PersistentCloudTenantRegistry.mjs";
import { initializeCloudControlDatabase } from "../cloud/operations/cloudControlLifecycle.mjs";
import { createControlDatabaseBackup, restoreControlDatabase, validateControlDatabaseFile } from "../cloud/operations/controlDbBackup.mjs";
import { resolveCloudProductionConfig, cloudRuntimePolicy } from "../cloud/runtime/cloudProductionConfig.mjs";
import { auditCloudProductionReadiness } from "../cloud/runtime/cloudReadiness.mjs";
import { createCloudRelayServer } from "../cloud/relay-server/relayServer.mjs";
import { generateConnectorCredentialMaterial } from "../server/cloud/connectorCredentialStore.ts";
import { LocalCloudConnector } from "../server/cloud/localCloudConnector.ts";
import { readGatewayRelayAssignment } from "../server/cloud/gatewayRelayRuntimeFiles.mjs";
import { enrollCloudConnector } from "../server/cloud/cloudEnrollment.ts";
import { spawn } from "node:child_process";

process.env.NODE_ENV="test";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,ms=4000,label="condition")=>{const end=Date.now()+ms;while(Date.now()<end){const v=fn();if(v)return v;await sleep(25);}assert.fail(`timeout: ${label}`);};
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"kourosh-v154-ops-"));
const runtimeDir=path.join(temp,"runtime");const backupDir=path.join(runtimeDir,"backups");const dbPath=path.join(runtimeDir,"control.db");
fs.mkdirSync(runtimeDir,{recursive:true});process.env.KOUROSH_CLOUD_RUNTIME_DIR=path.join(temp,"local-runtime");
const BASE="example.invalid";const CONNECTOR_HOST="connector.example.invalid";const CONNECTOR_ENDPOINT=`wss://${CONNECTOR_HOST}/connector`;
const INSTALL_A="inst_ABCDEFGHIJKLMNOPQRSTUVWX";const INSTALL_B="inst_ZYXWVUTSRQPONMLKJIHGFEDC";
const keyA=generateConnectorCredentialMaterial();const keyB=generateConnectorCredentialMaterial();

initializeCloudControlDatabase({config:{runtimeDataDir:runtimeDir,controlDbPath:dbPath,backupDir,backupRetention:7}});
let registry=new PersistentCloudTenantRegistry({dbPath});
assert.equal(registry.getSchemaVersion(),CLOUD_CONTROL_SCHEMA_VERSION);assert.equal(registry.checkIntegrity().ok,true);
const codeA=registry.createEnrollmentCode({ttlMs:60_000});const tenantA=registry.enrollTenant({installationId:INSTALL_A,publicKeyPem:keyA.publicKeyPem,enrollmentCode:codeA.code,baseDomain:BASE,connectorEndpoint:CONNECTOR_ENDPOINT});
const codeB=registry.createEnrollmentCode({ttlMs:60_000});const tenantB=registry.enrollTenant({installationId:INSTALL_B,publicKeyPem:keyB.publicKeyPem,enrollmentCode:codeB.code,baseDomain:BASE,connectorEndpoint:CONNECTOR_ENDPOINT});
assert.notEqual(tenantA.assignedHost,tenantB.assignedHost);
const originalA=await registry.getTenant(INSTALL_A);const originalB=await registry.getTenant(INSTALL_B);
registry.close();

// Actual SQLite-consistent backup -> mutate -> explicit restore -> reopen.
const backup=await createControlDatabaseBackup({dbPath,backupDir,retention:7});assert.equal(backup.ok,true);assert.equal(backup.tenantCount,2);assert.equal(validateControlDatabaseFile(backup.file).quickCheck.toLowerCase(),"ok");
registry=new PersistentCloudTenantRegistry({dbPath});await registry.reassignTenantHost(originalA.assignedStoreId,{baseDomain:BASE});registry.revokeTenant(originalB.assignedStoreId);const mutatedA=await registry.getTenant(INSTALL_A);assert.notEqual(mutatedA.assignedHost,originalA.assignedHost);registry.close();
const restored=await restoreControlDatabase({dbPath,backupDir,runtimeDataDir:runtimeDir,sourceFile:backup.file,retention:7,confirm:"RESTORE"});assert.equal(restored.restored,true);assert(restored.safetyBackup);
registry=new PersistentCloudTenantRegistry({dbPath});const restoredA=await registry.getTenant(INSTALL_A);const restoredB=await registry.getTenant(INSTALL_B);assert.equal(restoredA.assignedHost,originalA.assignedHost);assert.equal(restoredA.publicKeyFingerprint,originalA.publicKeyFingerprint);assert.equal(restoredB.tenantStatus,"active");assert.equal(restoredB.publicKeyFingerprint,originalB.publicKeyFingerprint);assert.equal(registry.checkIntegrity().ok,true);

// Assignment reconciliation and restart/reconnect: sockets remain memory-only.
let relay=createCloudRelayServer({registry,limits:{heartbeatTimeoutMs:700,authDeadlineMs:500,requestTimeoutMs:1200}});await new Promise(resolve=>relay.server.listen(0,"127.0.0.1",resolve));let relayPort=relay.server.address().port;
const secretPath=path.join(temp,"gateway-secret");const assignmentPath=path.join(temp,"gateway-assignment.json");
let connector=new LocalCloudConnector({installationId:INSTALL_A,endpoint:`ws://127.0.0.1:${relayPort}/connector`,publicKeyFingerprint:keyA.publicKeyFingerprint,signChallenge:keyA.signChallenge,environment:"test",heartbeatIntervalMs:100,backoffBaseMs:30,backoffMaxMs:60,gatewayRelaySecretPath:secretPath,gatewayRelayAssignmentPath:assignmentPath});connector.start();await waitFor(()=>connector.getStatus().connected,2500,"connector initial connect");const beforeVersion=connector.getStatus().assignmentVersion;
const reassigned=await registry.reassignTenantHost(originalA.assignedStoreId,{baseDomain:BASE});await waitFor(()=>connector.getStatus().assignmentVersion===reassigned.assignmentVersion,2500,"assignment reconciliation");assert.equal(connector.getStatus().assignedHost,reassigned.assignedHost);assert.equal(readGatewayRelayAssignment({assignmentPath}).assignedHost,reassigned.assignedHost);assert(reassigned.assignmentVersion>beforeVersion);
connector.stop();await relay.close();registry.close();
registry=new PersistentCloudTenantRegistry({dbPath});const afterRestart=await registry.getTenant(INSTALL_A);assert.equal(afterRestart.assignedHost,reassigned.assignedHost);assert.equal(afterRestart.activeConnection,null);
relay=createCloudRelayServer({registry,limits:{heartbeatTimeoutMs:700,authDeadlineMs:500,requestTimeoutMs:1200}});await new Promise(resolve=>relay.server.listen(0,"127.0.0.1",resolve));relayPort=relay.server.address().port;
connector=new LocalCloudConnector({installationId:INSTALL_A,endpoint:`ws://127.0.0.1:${relayPort}/connector`,publicKeyFingerprint:keyA.publicKeyFingerprint,signChallenge:keyA.signChallenge,environment:"test",heartbeatIntervalMs:100,backoffBaseMs:30,backoffMaxMs:60,gatewayRelaySecretPath:secretPath,gatewayRelayAssignmentPath:assignmentPath});connector.start();await waitFor(()=>connector.getStatus().connected,2500,"connector reconnect after restart");assert.equal(connector.getStatus().assignedHost,reassigned.assignedHost);connector.stop();await relay.close();registry.close();

// Canonical config and production policy. Production Node 24 is intentionally not claimed on this Node 22 session.
const prodEnv={NODE_ENV:"production",KOUROSH_CLOUD_RUNTIME_DIR:runtimeDir,KOUROSH_CLOUD_CONTROL_DB_PATH:dbPath,KOUROSH_CLOUD_BACKUP_DIR:backupDir,KOUROSH_CLOUD_PUBLIC_BASE_DOMAIN:BASE,KOUROSH_CLOUD_CONTROL_HOST:"control.example.invalid",KOUROSH_CLOUD_CONNECTOR_HOST:CONNECTOR_HOST,KOUROSH_CLOUD_INSTANCE_COUNT:"1",KOUROSH_CLOUD_DEV_PROVISIONING:"0",KOUROSH_CLOUD_EDGE_CLIENT_IP_MODE:"direct"};
const config=resolveCloudProductionConfig(prodEnv,{environment:"production"});assert.equal(config.tenantNamespace,"apps.example.invalid");assert.equal(config.connectorPublicEndpoint,CONNECTOR_ENDPOINT);assert.equal(config.instanceCount,1);
assert.throws(()=>resolveCloudProductionConfig({...prodEnv,KOUROSH_CLOUD_CONTROL_HOST:CONNECTOR_HOST},{environment:"production"}));assert.throws(()=>resolveCloudProductionConfig({...prodEnv,KOUROSH_CLOUD_PUBLIC_BASE_DOMAIN:"https://example.invalid"},{environment:"production"}));assert.throws(()=>resolveCloudProductionConfig({...prodEnv,KOUROSH_CLOUD_INSTANCE_COUNT:"2"},{environment:"production"}),e=>e?.code==="MULTI_INSTANCE_UNSUPPORTED");assert.throws(()=>resolveCloudProductionConfig({...prodEnv,KOUROSH_CLOUD_DEV_PROVISIONING:"1"},{environment:"production"}),e=>e?.code==="UNSAFE_DEV_PROVISIONING");
const policy=cloudRuntimePolicy("production");assert.equal(policy.required,"Node 24 LTS");assert.equal(policy.ok,Number(process.versions.node.split(".")[0])===24);
const readiness=auditCloudProductionReadiness(prodEnv,{environment:"production"});if(Number(process.versions.node.split(".")[0])!==24){assert.equal(readiness.status,"FAIL");assert.equal(readiness.checks.find(x=>x.name==="runtime")?.status,"FAIL");}

// Actual SIGTERM path: stop accepting, close connectors/DB, release runtime lock, exit bounded.
const portProbe=http.createServer();await new Promise(resolve=>portProbe.listen(0,"127.0.0.1",resolve));const processPort=portProbe.address().port;await new Promise(resolve=>portProbe.close(resolve));
const childEnv={...process.env,...prodEnv,NODE_ENV:"development",KOUROSH_CLOUD_RELAY_PORT:String(processPort),KOUROSH_CLOUD_RUNTIME_DIR:runtimeDir,KOUROSH_CLOUD_CONTROL_DB_PATH:dbPath,KOUROSH_CLOUD_BACKUP_DIR:backupDir};
const child=spawn(process.execPath,["cloud/relay-server/index.mjs"],{cwd:process.cwd(),env:childEnv,stdio:["ignore","pipe","pipe"]});let childOutput="";child.stdout.on("data",d=>childOutput+=d.toString());child.stderr.on("data",d=>childOutput+=d.toString());await waitFor(()=>childOutput.includes('"event":"cloud_ready"'),5000,"child cloud_ready");child.kill("SIGTERM");const childExit=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill("SIGKILL");reject(new Error("graceful shutdown timeout"));},5000);child.once("exit",code=>{clearTimeout(timer);resolve(code);});});assert.equal(childExit,0);assert(childOutput.includes('"event":"graceful_shutdown"'));assert.equal(fs.existsSync(path.join(runtimeDir,"cloud-relay.lock")),false);

// Local assignment validation fails closed for malformed control-plane assignment.
const fake=http.createServer(async(req,res)=>{req.resume();await new Promise(r=>req.on("end",r));res.writeHead(201,{"content-type":"application/json"});res.end(JSON.stringify({success:true,data:{assignedStoreId:"store_ABCDEFGHIJKLMNOP",assignedPublicUrl:"https://bad_host.apps.example.invalid/miniapp.html",connectorEndpoint:"wss://connector.example.invalid/connector",protocolVersion:1,assignmentVersion:1}}));});await new Promise(resolve=>fake.listen(0,"127.0.0.1",resolve));const fakePort=fake.address().port;
const enrollmentCode=`kce_ABCDEFGHIJKL_${"A".repeat(43)}`;await assert.rejects(()=>enrollCloudConnector({installationId:"inst_1234567890abcdefghijklmn",enrollmentCode,controlPlaneUrl:`http://127.0.0.1:${fakePort}`,privateKeyPath:path.join(temp,"invalid-assignment-key.pem")}),e=>e?.code==="CLOUD_ASSIGNMENT_INVALID");await new Promise(resolve=>fake.close(resolve));

fs.rmSync(temp,{recursive:true,force:true});
console.log(JSON.stringify({cloudOperations:"PASS",schemaVersion:CLOUD_CONTROL_SCHEMA_VERSION,backupValidated:true,restoreValidated:true,restoredTenants:2,assignmentReconciled:true,restartReconnect:true,productionRuntimePolicy:policy,productionReadinessOnActualRuntime:readiness.status,localMalformedAssignmentRejected:true,gracefulSignalShutdown:true},null,2));
