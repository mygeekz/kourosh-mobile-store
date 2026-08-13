import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createCloudRelayServer } from "../cloud/relay-server/relayServer.mjs";
import { PersistentCloudTenantRegistry } from "../cloud/control-plane/PersistentCloudTenantRegistry.mjs";
import { initializeCloudControlDatabase } from "../cloud/operations/cloudControlLifecycle.mjs";
import { createControlPlaneHttpHandler } from "../cloud/control-plane/controlPlaneApi.mjs";
import { createMiniAppGateway } from "./serve-miniapp-gateway.mjs";
import { enrollCloudConnector, rotateCloudConnectorCredential } from "../server/cloud/cloudEnrollment.ts";
import { ensureConnectorCredential } from "../server/cloud/connectorCredentialStore.ts";
import { LocalCloudConnector } from "../server/cloud/localCloudConnector.ts";

process.env.NODE_ENV="test";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,ms=4000,label="condition")=>{const end=Date.now()+ms;while(Date.now()<end){if(fn())return;await sleep(25);}assert.fail(`timeout: ${label}`);};
const listen=s=>new Promise(r=>s.listen(0,"127.0.0.1",()=>r(s.address().port)));
const close=s=>new Promise(r=>s.close(()=>r()));
const httpJson=(port,host,method,url,body,extra={})=>new Promise((resolve,reject)=>{const payload=body===undefined?null:Buffer.from(JSON.stringify(body));const req=http.request({hostname:"127.0.0.1",port,method,path:url,headers:{host,...(payload?{"content-type":"application/json","content-length":payload.length}:{}),...extra}},res=>{const chunks=[];res.on("data",c=>chunks.push(c));res.on("end",()=>{const text=Buffer.concat(chunks).toString();let parsed=text;try{parsed=JSON.parse(text);}catch{}resolve({status:res.statusCode,body:parsed,headers:res.headers});});});req.on("error",reject);req.end(payload||undefined);});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"kourosh-v153-control-"));process.env.KOUROSH_CLOUD_RUNTIME_DIR=path.join(temp,"local-runtime");
const dbPath=path.join(temp,"cloud-control.sqlite");const keyA=path.join(temp,"a.pem");const keyB=path.join(temp,"b.pem");
const INSTALL_A="inst_ABCDEFGHIJKLMNOPQRSTUVWX";const INSTALL_B="inst_ZYXWVUTSRQPONMLKJIHGFEDC";const INSTALL_C="inst_1234567890abcdefghijklmn";const TOKEN="123456789:abcdefghijklmnopqrstuvwxyzABCDE";

const telegram=http.createServer((_req,res)=>{res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({ok:true,result:{id:1,username:"mock_bot"}}));});const telegramPort=await listen(telegram);
initializeCloudControlDatabase({config:{runtimeDataDir:temp,controlDbPath:dbPath,backupDir:path.join(temp,"backups")}});
let registry=new PersistentCloudTenantRegistry({dbPath});
let controlHandler=null;
let relay=createCloudRelayServer({registry,telegramApiBaseUrl:`http://127.0.0.1:${telegramPort}`,allowTestTelegramOrigin:true,controlPlaneHandler:(...args)=>controlHandler(...args),limits:{heartbeatTimeoutMs:800,authDeadlineMs:500,requestTimeoutMs:1200}});const relayPort=await listen(relay.server);
controlHandler=createControlPlaneHttpHandler({registry,environment:"test",publicBaseDomain:"app.example.invalid",connectorEndpoint:`ws://127.0.0.1:${relayPort}/connector`,maxAttemptsPerMinute:1000});
process.env.KOUROSH_CLOUD_CONTROL_PLANE_URL=`http://127.0.0.1:${relayPort}`;

// Enrollment: high entropy, hashed at rest, single use, server-computed key fingerprint.
const codeA=registry.createEnrollmentCode({ttlMs:60_000});assert.match(codeA.code,/^kce_/);
const enrolledA=await enrollCloudConnector({installationId:INSTALL_A,enrollmentCode:codeA.code,privateKeyPath:keyA});
assert.match(enrolledA.assignedStoreId,/^store_/);assert.equal(new URL(enrolledA.assignedPublicUrl).hostname.endsWith(".app.example.invalid"),true);
const tenantA=await registry.getTenant(INSTALL_A);const credA=ensureConnectorCredential({privateKeyPath:keyA,createIfMissing:false});assert(credA);assert.equal(tenantA.publicKeyFingerprint,credA.publicKeyFingerprint);
const replay=await httpJson(relayPort,"control.invalid","POST","/control/v1/enroll",{installationId:INSTALL_C,publicKeyPem:credA.publicKeyPem,enrollmentCode:codeA.code});assert.equal(replay.status,400);assert.equal(replay.body.code,"ENROLLMENT_CODE_USED");
const badKeyCode=registry.createEnrollmentCode({ttlMs:60_000});const badKey=await httpJson(relayPort,"control.invalid","POST","/control/v1/enroll",{installationId:INSTALL_C,publicKeyPem:"not-a-key",enrollmentCode:badKeyCode.code});assert.equal(badKey.status,400);assert.equal(badKey.body.code,"PUBLIC_KEY_INVALID");
const expired=registry.createEnrollmentCode({ttlMs:60_000});registry.db.prepare("UPDATE cloud_enrollment_codes SET expires_at=? WHERE code_id=?").run(new Date(Date.now()-1000).toISOString(),/^kce_([A-Za-z0-9_-]{12})_/.exec(expired.code)[1]);const expiredRes=await httpJson(relayPort,"control.invalid","POST","/control/v1/enroll",{installationId:INSTALL_C,publicKeyPem:credA.publicKeyPem,enrollmentCode:expired.code});assert.equal(expiredRes.body.code,"ENROLLMENT_CODE_EXPIRED");
const attempt=registry.createEnrollmentCode({ttlMs:60_000,maxAttempts:2});const attemptId=/^kce_([A-Za-z0-9_-]{12})_/.exec(attempt.code)[1];const wrong=`kce_${attemptId}_${"A".repeat(43)}`;for(let i=0;i<2;i++){const r=await httpJson(relayPort,"control.invalid","POST","/control/v1/enroll",{installationId:INSTALL_C,publicKeyPem:credA.publicKeyPem,enrollmentCode:wrong});assert.equal(r.status,400);}const limited=await httpJson(relayPort,"control.invalid","POST","/control/v1/enroll",{installationId:INSTALL_C,publicKeyPem:credA.publicKeyPem,enrollmentCode:attempt.code});assert.equal(limited.body.code,"ENROLLMENT_ATTEMPTS_EXCEEDED");
const oversized=await new Promise((resolve,reject)=>{const body="x".repeat(70*1024);const req=http.request({hostname:"127.0.0.1",port:relayPort,path:"/control/v1/enroll",method:"POST",headers:{host:"control.invalid","content-type":"application/json","content-length":body.length}},res=>{res.resume();res.on("end",()=>resolve(res.statusCode));});req.on("error",e=>{if(e.code==="ECONNRESET")resolve(413);else reject(e)});req.end(body);});assert.equal(oversized,413);

const codeB=registry.createEnrollmentCode({ttlMs:60_000});const enrolledB=await enrollCloudConnector({installationId:INSTALL_B,enrollmentCode:codeB.code,privateKeyPath:keyB});assert.notEqual(enrolledA.assignedStoreId,enrolledB.assignedStoreId);assert.notEqual(enrolledA.assignedPublicUrl,enrolledB.assignedPublicUrl);
const tenantB=await registry.getTenant(INSTALL_B);const credB=ensureConnectorCredential({privateKeyPath:keyB,createIfMissing:false});assert(credB);assert.notEqual(tenantA.publicKeyFingerprint,tenantB.publicKeyFingerprint);
// Host uniqueness is DB-enforced.
const pairC=crypto.generateKeyPairSync("ed25519",{publicKeyEncoding:{format:"pem",type:"spki"},privateKeyEncoding:{format:"pem",type:"pkcs8"}});await assert.rejects(()=>registry.registerTenant({installationId:INSTALL_C,publicKeyPem:pairC.publicKey,assignedStoreId:"store_ABCDEFGHIJKLMNOP",assignedPublicUrl:tenantA.assignedPublicUrl}),/UNIQUE|constraint/i);

// Fresh cloud-managed Gateway requires no KOUROSH_MINIAPP_PUBLIC_HOST.
delete process.env.KOUROSH_MINIAPP_PUBLIC_HOST;delete process.env.KOUROSH_MINIAPP_GATEWAY_MODE;
const api=http.createServer((req,res)=>{const pathname=new URL(req.url||"/","http://api.invalid").pathname;const allowed=pathname==="/api/miniapp/auth"||pathname==="/api/miniapp/me"||pathname.startsWith("/api/miniapp/customer/")||pathname.startsWith("/api/miniapp/partner/")||pathname.startsWith("/api/miniapp/staff/");res.writeHead(allowed?200:404,{"content-type":"application/json"});res.end(JSON.stringify({success:allowed,path:pathname}));});const apiPort=await listen(api);
const dist=path.join(temp,"dist");fs.mkdirSync(path.join(dist,"assets"),{recursive:true});fs.writeFileSync(path.join(dist,"miniapp.html"),"<html></html>");fs.writeFileSync(path.join(dist,"assets","app-12345678.js"),"console.log(1)");
const gateway=createMiniAppGateway({distDir:dist,apiHost:"127.0.0.1",apiPort,logSink:()=>{}});const gatewayPort=await listen(gateway);
const connectorA=new LocalCloudConnector({installationId:INSTALL_A,endpoint:`ws://127.0.0.1:${relayPort}/connector`,publicKeyFingerprint:credA.publicKeyFingerprint,signChallenge:credA.signChallenge,environment:"test",miniAppGatewayOrigin:`http://127.0.0.1:${gatewayPort}`,heartbeatIntervalMs:100,backoffBaseMs:50,backoffMaxMs:100});connectorA.start();await waitFor(()=>connectorA.getStatus().connected,2500,"A connector");
for(const pathName of ["/api/miniapp/customer/profile","/api/miniapp/partner/profile","/api/miniapp/staff/profile"]){const r=await httpJson(relayPort,new URL(enrolledA.assignedPublicUrl).host,"GET",pathName);assert.equal(r.status,200);assert.equal(r.body.success,true);}
assert.equal((await httpJson(relayPort,new URL(enrolledA.assignedPublicUrl).host,"GET","/api/settings")).status,404);

// Cloud Telegram stays off local official API.
const nativeFetch=globalThis.fetch;let officialCalls=0;globalThis.fetch=async(input,init)=>{if(String(input).startsWith("https://api.telegram.org")){officialCalls++;throw new Error("BLOCKED");}return nativeFetch(input,init);};const tg=await connectorA.requestTelegram({botToken:TOKEN,method:"getMe",httpMethod:"GET"});assert.equal(tg.success,true);assert.equal(officialCalls,0);globalThis.fetch=nativeFetch;

// Persistent restart: assignment survives, sockets do not.
const beforeRestart={store:tenantA.assignedStoreId,url:tenantA.assignedPublicUrl,host:tenantA.assignedHost};connectorA.stop();await relay.close();registry.close();
registry=new PersistentCloudTenantRegistry({dbPath});const afterRestart=await registry.getTenant(INSTALL_A);assert.equal(afterRestart.assignedStoreId,beforeRestart.store);assert.equal(afterRestart.assignedPublicUrl,beforeRestart.url);assert.equal(afterRestart.assignedHost,beforeRestart.host);assert.equal(afterRestart.activeConnection,null);
controlHandler=null;relay=createCloudRelayServer({registry,telegramApiBaseUrl:`http://127.0.0.1:${telegramPort}`,allowTestTelegramOrigin:true,controlPlaneHandler:(...args)=>controlHandler(...args),limits:{heartbeatTimeoutMs:600,authDeadlineMs:500,requestTimeoutMs:1200}});const relayPort2=await listen(relay.server);controlHandler=createControlPlaneHttpHandler({registry,environment:"test",publicBaseDomain:"app.example.invalid",connectorEndpoint:`ws://127.0.0.1:${relayPort2}/connector`,maxAttemptsPerMinute:1000});process.env.KOUROSH_CLOUD_CONTROL_PLANE_URL=`http://127.0.0.1:${relayPort2}`;
const connectorRestart=new LocalCloudConnector({installationId:INSTALL_A,endpoint:`ws://127.0.0.1:${relayPort2}/connector`,publicKeyFingerprint:credA.publicKeyFingerprint,signChallenge:credA.signChallenge,environment:"test",miniAppGatewayOrigin:`http://127.0.0.1:${gatewayPort}`,heartbeatIntervalMs:100,backoffBaseMs:50,backoffMaxMs:100});connectorRestart.start();await waitFor(()=>connectorRestart.getStatus().connected,2500,"reconnect after persistent restart");
const tenantBAfterRestart=await registry.getTenant(INSTALL_B);assert.equal(tenantBAfterRestart.assignedStoreId,tenantB.assignedStoreId);assert.equal(tenantBAfterRestart.assignedHost,tenantB.assignedHost);
const connectorBRestart=new LocalCloudConnector({installationId:INSTALL_B,endpoint:`ws://127.0.0.1:${relayPort2}/connector`,publicKeyFingerprint:credB.publicKeyFingerprint,signChallenge:credB.signChallenge,environment:"test",gatewayRelaySecretPath:path.join(temp,"b-relay-secret"),gatewayRelayAssignmentPath:path.join(temp,"b-assignment.json"),heartbeatIntervalMs:100,backoffBaseMs:50,backoffMaxMs:100});connectorBRestart.start();await waitFor(()=>connectorBRestart.getStatus().connected,2500,"tenant B reconnect after persistent restart");assert.notEqual((await registry.getTenant(INSTALL_A)).activeConnection,(await registry.getTenant(INSTALL_B)).activeConnection);

// Recovery rotation: old key is invalidated; new key reconnects. Lost key cannot auto-takeover.
const recovery=registry.createEnrollmentCode({purpose:"recovery",targetStoreId:afterRestart.assignedStoreId,ttlMs:60_000});const oldCredential=credA;const rotated=await rotateCloudConnectorCredential({installationId:INSTALL_A,recoveryCode:recovery.code,privateKeyPath:keyA});assert.equal(rotated.assignedStoreId,afterRestart.assignedStoreId);await waitFor(()=>!connectorRestart.getStatus().connected,2500,"old connector disconnected after rotation");
const newCredential=ensureConnectorCredential({privateKeyPath:keyA,createIfMissing:false});assert(newCredential);assert.notEqual(newCredential.publicKeyFingerprint,oldCredential.publicKeyFingerprint);
const oldAttempt=new LocalCloudConnector({installationId:INSTALL_A,endpoint:`ws://127.0.0.1:${relayPort2}/connector`,publicKeyFingerprint:oldCredential.publicKeyFingerprint,signChallenge:oldCredential.signChallenge,environment:"test",backoffBaseMs:500,backoffMaxMs:500});oldAttempt.start();await sleep(400);assert.equal(oldAttempt.getStatus().connected,false);oldAttempt.stop();
const newConnector=new LocalCloudConnector({installationId:INSTALL_A,endpoint:`ws://127.0.0.1:${relayPort2}/connector`,publicKeyFingerprint:newCredential.publicKeyFingerprint,signChallenge:newCredential.signChallenge,environment:"test",miniAppGatewayOrigin:`http://127.0.0.1:${gatewayPort}`,heartbeatIntervalMs:100});newConnector.start();await waitFor(()=>newConnector.getStatus().connected,2500,"new rotated key connects");
fs.unlinkSync(keyA);assert.equal(ensureConnectorCredential({privateKeyPath:keyA,createIfMissing:false}),null);const takeoverCode=registry.createEnrollmentCode({ttlMs:60_000});await assert.rejects(()=>enrollCloudConnector({installationId:INSTALL_A,enrollmentCode:takeoverCode.code,privateKeyPath:keyA}),error=>error?.code==="TENANT_EXISTS");

// Revocation disconnects active tenant, blocks new auth and public host while local Gateway remains independently alive.
await registry.revokeTenant(afterRestart.assignedStoreId);await waitFor(()=>!newConnector.getStatus().connected,2500,"revoked connector disconnect");const publicRevoked=await httpJson(relayPort2,new URL(afterRestart.assignedPublicUrl).host,"GET","/miniapp.html");assert.equal(publicRevoked.status,503);
const localAssignmentPath=path.join(process.env.KOUROSH_CLOUD_RUNTIME_DIR,"miniapp-relay-assignment.json");assert.equal(fs.existsSync(localAssignmentPath),true,"local gateway assignment metadata remains local after Cloud revocation");

// Cloud metadata schema contains no business/financial persistence and no token/initData fields.
const schemaText=registry.listSchema().map(x=>String(x.sql||"")).join("\n").toLowerCase();for(const forbidden of ["customers","customer_ledger","partners_ledger","sales","installments","inventory","invoices","profit","imei","bot_token","initdata","bearer"])assert.equal(schemaText.includes(forbidden),false,`forbidden cloud schema token: ${forbidden}`);
assert.equal(registry.listTenants().length,2);

newConnector.stop();connectorRestart.stop();connectorBRestart.stop();await relay.close();registry.close();await close(gateway);await close(api);await close(telegram);
console.log(JSON.stringify({controlPlane:"PASS",persistentTenants:2,enrollmentSingleUse:true,hostUnique:true,persistentRestart:true,persistentTenantAAndBReconnect:true,keyRotation:true,lostKeyNoTakeover:true,revocation:true,miniAppRoles:["customer","partner","staff"],cloudTelegramOfficialLocalCalls:officialCalls,cloudBusinessSchema:false},null,2));
