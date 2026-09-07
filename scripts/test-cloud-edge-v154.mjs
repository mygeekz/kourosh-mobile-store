import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createCloudRelayServer } from "../cloud/relay-server/relayServer.mjs";
import { PersistentCloudTenantRegistry } from "../cloud/control-plane/PersistentCloudTenantRegistry.mjs";
import { initializeCloudControlDatabase } from "../cloud/operations/cloudControlLifecycle.mjs";
import { createControlPlaneHttpHandler } from "../cloud/control-plane/controlPlaneApi.mjs";

process.env.NODE_ENV="test";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"kourosh-v154-edge-"));
const dbPath=path.join(temp,"control.db");
const CONTROL="control.example.invalid";
const CONNECTOR="connector.example.invalid";
const BASE="example.invalid";
initializeCloudControlDatabase({config:{runtimeDataDir:temp,controlDbPath:dbPath,backupDir:path.join(temp,"backups")}});
const registry=new PersistentCloudTenantRegistry({dbPath});
const pair=crypto.generateKeyPairSync("ed25519",{publicKeyEncoding:{format:"pem",type:"spki"},privateKeyEncoding:{format:"pem",type:"pkcs8"}});
const code=registry.createEnrollmentCode({ttlMs:60_000});
const tenant=registry.enrollTenant({installationId:"inst_ABCDEFGHIJKLMNOPQRSTUVWX",publicKeyPem:pair.publicKey,enrollmentCode:code.code,baseDomain:BASE,connectorEndpoint:`wss://${CONNECTOR}/connector`});
const control=createControlPlaneHttpHandler({registry,environment:"test",publicBaseDomain:BASE,connectorEndpoint:`wss://${CONNECTOR}/connector`,controlHost:CONTROL,maxAttemptsPerMinute:1000});
const relay=createCloudRelayServer({registry,controlPlaneHandler:control,edgeHosts:{controlHost:CONTROL,connectorHost:CONNECTOR},limits:{authDeadlineMs:300,maxUnauthenticatedConnectionsPerIp:5,connectorAttemptsPerMinute:1000}});
await new Promise(resolve=>relay.server.listen(0,"127.0.0.1",resolve));
const port=relay.server.address().port;

const request=(host,method,url,body)=>new Promise((resolve,reject)=>{const payload=body==null?null:Buffer.from(JSON.stringify(body));const req=http.request({hostname:"127.0.0.1",port,method,path:url,headers:{host,...(payload?{"content-type":"application/json","content-length":String(payload.length)}:{})}},res=>{const chunks=[];res.on("data",c=>chunks.push(c));res.on("end",()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString("utf8")}));});req.on("error",reject);req.end(payload||undefined);});
const rawUpgrade=(host)=>new Promise((resolve,reject)=>{const socket=net.connect(port,"127.0.0.1",()=>{const key=crypto.randomBytes(16).toString("base64");socket.write(`GET /connector HTTP/1.1\r\nHost: ${host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`);});let data="";const timer=setTimeout(()=>{socket.destroy();reject(new Error("upgrade timeout"));},1500);socket.on("data",chunk=>{data+=chunk.toString("latin1");if(data.includes("\r\n\r\n")){clearTimeout(timer);const m=/^HTTP\/1\.1\s+(\d+)/.exec(data);const status=Number(m?.[1]||0);socket.destroy();resolve(status);}});socket.on("error",e=>{clearTimeout(timer);reject(e);});});

const tenantHost=new URL(tenant.assignedPublicUrl).hostname;
assert.equal((await request(tenantHost,"POST","/control/v1/enroll",{})).status,404);
assert.notEqual(await rawUpgrade(tenantHost),101);
assert.equal((await request(CONTROL,"GET","/miniapp.html")).status,404);
assert.equal((await request(CONNECTOR,"POST","/control/v1/enroll",{})).status,404);
assert.equal((await request(CONNECTOR,"GET","/miniapp.html")).status,404);
const health=await request(CONTROL,"GET","/healthz");assert.equal(health.status,200);assert.equal(health.body,"ok");
assert.equal(await rawUpgrade(CONNECTOR),101);
const controlWrongMethod=await request(CONTROL,"GET","/control/v1/enroll");assert.equal(controlWrongMethod.status,404);
assert.equal(controlWrongMethod.headers["access-control-allow-origin"],undefined);
assert.equal(controlWrongMethod.headers["set-cookie"],undefined);
assert.equal(controlWrongMethod.headers["cache-control"],"no-store");

await relay.close();registry.close();fs.rmSync(temp,{recursive:true,force:true});
console.log(JSON.stringify({edgeHostIsolation:"PASS",tenantHost,tenantControlRejected:true,tenantConnectorRejected:true,controlMiniAppRejected:true,connectorControlRejected:true,connectorMiniAppRejected:true,connectorHostUpgradeAccepted:true,livenessMinimal:true},null,2));
