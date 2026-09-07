import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createLoginRateLimiter } from "../server/middleware/loginRateLimiter.ts";
import { createCloudRelayServer } from "../cloud/relay-server/relayServer.mjs";
import { MemoryCloudTenantRegistry } from "../cloud/relay-server/tenantRegistry.mjs";
import { createMiniAppGateway } from "./serve-miniapp-gateway.mjs";
import { ensureConnectorCredential } from "../server/cloud/connectorCredentialStore.ts";
import { ensureGatewayRelaySecret, writeGatewayRelayAssignment } from "../server/cloud/gatewayRelayRuntimeFiles.mjs";
import { LocalCloudConnector } from "../server/cloud/localCloudConnector.ts";

process.env.NODE_ENV = "test";
const INSTALL = "inst_ABCDEFGHIJKLMNOPQRSTUVWX";
const TOKEN = "123456789:abcdefghijklmnopqrstuvwxyzABCDE";
const sleep = (ms) => new Promise(r=>setTimeout(r,ms));
const waitFor = async (fn, ms=3000, label="condition") => { const until=Date.now()+ms; while(Date.now()<until){if(fn())return;await sleep(20);}assert.fail(`timeout: ${label}`); };
const listen = (server) => new Promise(resolve=>server.listen(0,"127.0.0.1",()=>resolve(server.address().port)));
const close = (server) => new Promise(resolve=>server.close(()=>resolve()));
const temp = fs.mkdtempSync(path.join(os.tmpdir(),"kourosh-v153-stage0-"));
const secretPath = path.join(temp,"relay-secret");
const assignmentPath = path.join(temp,"assignment.json");
const keyPath = path.join(temp,"connector.pem");
const host = "store-a.example.invalid";
const hostB = "store-b.example.invalid";
const publicUrl = `https://${host}/miniapp.html`;
const cred = ensureConnectorCredential({privateKeyPath:keyPath}); assert(cred);
const relaySecret = ensureGatewayRelaySecret({secretPath}); assert(relaySecret);
writeGatewayRelayAssignment(publicUrl,{assignmentPath});

// Actual Kourosh login limiter, adapted to a tiny HTTP fixture. Gateway-created XFF is treated as req.ip.
const limiter = createLoginRateLimiter({ maxAttempts: 30, windowMs: 60_000 });
const backend = http.createServer((req,res)=>{
  if(new URL(req.url||"/","http://backend.invalid").pathname!=="/api/miniapp/auth"){res.writeHead(200,{"content-type":"application/json"});return res.end('{"success":true}');}
  const fakeReq = { ip: String(req.headers["x-forwarded-for"]||req.socket.remoteAddress||"unknown"), socket:req.socket };
  const fakeRes = {
    statusCode: 200,
    setHeader:(k,v)=>res.setHeader(k,v),
    once:(event,fn)=>res.once(event,fn),
    status(code){this.statusCode=code;return this;},
    json(body){res.writeHead(this.statusCode,{"content-type":"application/json"});res.end(JSON.stringify(body));return this;},
  };
  limiter(fakeReq,fakeRes,()=>{fakeRes.statusCode=401;res.writeHead(401,{"content-type":"application/json"});res.end('{"success":false}');});
});
const backendPort = await listen(backend);
const dist = path.join(temp,"dist-miniapp");fs.mkdirSync(path.join(dist,"assets"),{recursive:true});fs.writeFileSync(path.join(dist,"miniapp.html"),"<html></html>");fs.writeFileSync(path.join(dist,"assets","app-12345678.js"),"console.log(1)");
const gateway = createMiniAppGateway({distDir:dist,apiHost:"127.0.0.1",apiPort:backendPort,gatewayMode:"cloud_relay_internal",relaySecretPath:secretPath,relayAssignmentPath:assignmentPath,logSink:()=>{}});
const gatewayPort=await listen(gateway);
const registry=new MemoryCloudTenantRegistry();
await registry.registerTenant({installationId:INSTALL,publicKeyPem:cred.publicKeyPem,publicKeyFingerprint:cred.publicKeyFingerprint,assignedStoreId:"store_a_opaque",assignedPublicUrl:publicUrl});
const credB=ensureConnectorCredential({privateKeyPath:path.join(temp,"connector-b.pem")}); assert(credB);
await registry.registerTenant({installationId:"inst_ZYXWVUTSRQPONMLKJIHGFEDC",publicKeyPem:credB.publicKeyPem,publicKeyFingerprint:credB.publicKeyFingerprint,assignedStoreId:"store_b_opaque",assignedPublicUrl:`https://${hostB}/miniapp.html`});
const edgeSecret="edge-secret-for-test-only-abcdefghijklmnopqrstuvwxyz";
const relay=createCloudRelayServer({registry,edgeTrust:{mode:"trusted_loopback_edge",trustedLoopbackEdgeSecret:edgeSecret},limits:{authDeadlineMs:800,maxUnauthenticatedConnectionsPerIp:5,connectorAttemptsPerMinute:30,heartbeatTimeoutMs:2000,requestTimeoutMs:1000,publicRequestsPerMinutePerIp:40,publicGlobalRequestsPerMinutePerIp:1000}});
const relayPort=await listen(relay.server);
const connector=new LocalCloudConnector({installationId:INSTALL,endpoint:`ws://127.0.0.1:${relayPort}/connector`,publicKeyFingerprint:cred.publicKeyFingerprint,signChallenge:cred.signChallenge,environment:"test",miniAppGatewayOrigin:`http://127.0.0.1:${gatewayPort}`,gatewayRelaySecretPath:secretPath,gatewayRelayAssignmentPath:assignmentPath,heartbeatIntervalMs:100,backoffBaseMs:50,backoffMaxMs:100});
connector.start(); await waitFor(()=>connector.getStatus().connected,2000,"connector connected");

const cloudRequest = (clientIp, spoof={}) => new Promise((resolve,reject)=>{
  const body=Buffer.from('{"initData":"invalid-test"}');
  const req=http.request({hostname:"127.0.0.1",port:relayPort,path:"/api/miniapp/auth",method:"POST",headers:{host,"content-type":"application/json","content-length":body.length,"x-kourosh-edge-auth":edgeSecret,"x-kourosh-edge-client-ip":clientIp,"x-forwarded-for":spoof.xff||"203.0.113.250","cf-connecting-ip":spoof.cf||"203.0.113.251"}},res=>{const chunks=[];res.on("data",c=>chunks.push(c));res.on("end",()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString()}));});
  req.on("error",reject);req.end(body);
});
for(let i=0;i<30;i++){const r=await cloudRequest("198.51.100.10");assert.equal(r.status,401);}
assert.equal((await cloudRequest("198.51.100.10")).status,429,"Client A should hit its own limiter bucket");
assert.equal((await cloudRequest("198.51.100.11")).status,401,"Client B must retain an independent bucket");
assert.equal((await cloudRequest("198.51.100.10",{xff:"198.51.100.11",cf:"198.51.100.11"})).status,429,"spoofed public forwarding headers must not select B bucket");

// Cloud coarse public limiter is tenant + client scoped; Tenant A cannot consume Tenant B's bucket.
const staticRequest = (targetHost, clientIp) => new Promise((resolve,reject)=>{
  const req=http.request({hostname:"127.0.0.1",port:relayPort,path:"/miniapp.html",method:"GET",headers:{host:targetHost,"x-kourosh-edge-auth":edgeSecret,"x-kourosh-edge-client-ip":clientIp}},res=>{res.resume();res.on("end",()=>resolve(res.statusCode));});
  req.on("error",reject);req.end();
});
for(let i=0;i<40;i++) assert.equal(await staticRequest(host,"198.51.100.55"),200);
assert.equal(await staticRequest(host,"198.51.100.55"),429,"Tenant A cloud coarse bucket should be bounded");
assert.equal(await staticRequest(hostB,"198.51.100.55"),503,"Tenant B must not inherit Tenant A cloud coarse bucket");

// Unauthenticated socket cap + auth deadline recovery.
const unauth=[];
for(let i=0;i<5;i++){const ws=new WebSocket(`ws://127.0.0.1:${relayPort}/connector`);unauth.push(ws);await new Promise(resolve=>{ws.addEventListener("open",resolve,{once:true});ws.addEventListener("error",resolve,{once:true});});}
assert.equal(relay.getUnauthenticatedConnectionCount(),5);
const sixth=new WebSocket(`ws://127.0.0.1:${relayPort}/connector`);let sixthRejected=false;sixth.addEventListener("error",()=>{sixthRejected=true;});sixth.addEventListener("close",()=>{sixthRejected=true;});await sleep(120);assert.equal(sixthRejected,true,"per-IP unauth cap must reject sixth socket");
await waitFor(()=>relay.getUnauthenticatedConnectionCount()===0,2500,"auth deadline cleanup");
assert.equal(connector.getStatus().connected,true,"valid authenticated tenant remains connected");
for(const ws of unauth){try{ws.close();}catch{}}
connector.stop();await relay.close();await close(gateway);await close(backend);

// Bounded outbound Telegram response with deliberately tiny wire limit.
const largeTelegram=http.createServer((_req,res)=>{res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({ok:true,result:{blob:"x".repeat(5000)}}));});
const telegramPort=await listen(largeTelegram);
const registry2=new MemoryCloudTenantRegistry();await registry2.registerTenant({installationId:INSTALL,publicKeyPem:cred.publicKeyPem,publicKeyFingerprint:cred.publicKeyFingerprint,assignedStoreId:"store_a_opaque",assignedPublicUrl:publicUrl});
const relay2=createCloudRelayServer({registry:registry2,telegramApiBaseUrl:`http://127.0.0.1:${telegramPort}`,allowTestTelegramOrigin:true,limits:{maxWireBytes:1024,maxTelegramResponseBytes:8*1024,authDeadlineMs:1000,heartbeatTimeoutMs:2000}});const relayPort2=await listen(relay2.server);
const connector2=new LocalCloudConnector({installationId:INSTALL,endpoint:`ws://127.0.0.1:${relayPort2}/connector`,publicKeyFingerprint:cred.publicKeyFingerprint,signChallenge:cred.signChallenge,environment:"test",maxWireBytes:1024,gatewayRelaySecretPath:secretPath,gatewayRelayAssignmentPath:assignmentPath,heartbeatIntervalMs:100});connector2.start();await waitFor(()=>connector2.getStatus().connected,2000,"wire-limit connector");
const result=await connector2.requestTelegram({botToken:TOKEN,method:"getMe",httpMethod:"GET"});assert.equal(result.success,false);assert.equal(result.errorCode,"CLOUD_RELAY_RESPONSE_TOO_LARGE");assert(relay2.getMaxOutboundFrameBytesObserved()<=1024,"outbound frame exceeded maxWireBytes");
connector2.stop();await relay2.close();await close(largeTelegram);

console.log(JSON.stringify({stage0:"PASS",rateLimitIsolation:true,spoofedXffIgnored:true,tenantRateLimitIsolation:true,unauthDeadline:true,unauthPerIpCap:true,authLimiterBounded:relay.getAuthAttemptLimiterSize()<=4096,maxOutboundFrameBytes:relay2.getMaxOutboundFrameBytesObserved(),telegramLargeResponseCode:result.errorCode},null,2));
