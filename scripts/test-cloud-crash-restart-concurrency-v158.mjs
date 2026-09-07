import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { initializeCloudControlDatabase } from "../cloud/operations/cloudControlLifecycle.mjs";
import { readCloudRuntimeLock, resolveCloudRuntimeLockPath } from "../cloud/runtime/cloudRuntimeState.mjs";

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const freePort=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.once("error",reject);s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});});
const waitForOutput=(child,pattern,timeoutMs=8000)=>new Promise((resolve,reject)=>{let text="";const timer=setTimeout(()=>reject(new Error(`Timed out waiting for ${pattern}; output=${text}`)),timeoutMs);const onData=d=>{text+=String(d);if(pattern.test(text)){clearTimeout(timer);resolve(text);}};child.stdout?.on("data",onData);child.stderr?.on("data",onData);child.once("exit",code=>{if(!pattern.test(text)){clearTimeout(timer);reject(new Error(`Process exited ${code}; output=${text}`));}});});
const waitExit=child=>child.exitCode!==null||child.signalCode?Promise.resolve({code:child.exitCode,signal:child.signalCode}):new Promise(resolve=>child.once("exit",(code,signal)=>resolve({code,signal})));
const baseEnv=(runtime,db,port)=>({...process.env,NODE_ENV:"development",KOUROSH_CLOUD_RUNTIME_DIR:runtime,KOUROSH_CLOUD_CONTROL_DB_PATH:db,KOUROSH_CLOUD_BACKUP_DIR:path.join(runtime,"backups"),KOUROSH_CLOUD_PUBLIC_BASE_DOMAIN:"example.invalid",KOUROSH_CLOUD_CONTROL_HOST:"control.example.invalid",KOUROSH_CLOUD_CONNECTOR_HOST:"connector.example.invalid",KOUROSH_CLOUD_INSTANCE_COUNT:"1",KOUROSH_CLOUD_DEV_PROVISIONING:"0",KOUROSH_CLOUD_EDGE_CLIENT_IP_MODE:"direct",KOUROSH_CLOUD_RELAY_BIND_HOST:"127.0.0.1",KOUROSH_CLOUD_RELAY_PORT:String(port)});
const startRelay=env=>spawn(process.execPath,["cloud/relay-server/index.mjs"],{cwd:process.cwd(),env,stdio:["ignore","pipe","pipe"]});
const insertCrashRow=async dbPath=>{
  const writer=`import {DatabaseSync} from 'node:sqlite';const db=new DatabaseSync(process.argv[1]);db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; PRAGMA synchronous=FULL;');const now=new Date().toISOString();db.prepare("INSERT INTO cloud_tenants(installation_id,assigned_store_id,public_key_pem,public_key_fingerprint,assigned_host,assigned_public_url,tenant_status,credential_version,assignment_version,created_at,updated_at) VALUES(?,?,?,?,?,?, 'active',1,1,?,?)").run('inst_v158_restart_00000001','store_v158restart01','PUBLIC-v158','fp-v158-restart','s-v158restart1234.apps.example.invalid','https://s-v158restart1234.apps.example.invalid/miniapp.html',now,now);console.log('COMMITTED');setInterval(()=>{},1000);`;
  const child=spawn(process.execPath,["--input-type=module","-e",writer,dbPath],{cwd:process.cwd(),stdio:["ignore","pipe","pipe"]});await waitForOutput(child,/COMMITTED/);await sleep(50);assert(fs.existsSync(`${dbPath}-wal`));assert(fs.statSync(`${dbPath}-wal`).size>0);child.kill("SIGKILL");await waitExit(child);
};

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"kourosh-v158-crash-many-"));
try{
  assert.equal(process.platform,"linux");
  const runtime=path.join(temp,"runtime"),dbPath=path.join(runtime,"control.db"),port=await freePort(),env=baseEnv(runtime,dbPath,port);
  initializeCloudControlDatabase({config:{runtimeDataDir:runtime,controlDbPath:dbPath,backupDir:path.join(runtime,"backups")}});
  const first=startRelay(env);await waitForOutput(first,/"event":"cloud_ready"/);const firstLock=readCloudRuntimeLock(runtime);assert.equal(firstLock.active,true);assert.equal(firstLock.strongOwnership,true);
  await insertCrashRow(dbPath);assert(fs.statSync(`${dbPath}-wal`).size>0);
  first.kill("SIGKILL");await waitExit(first);assert.equal(fs.existsSync(resolveCloudRuntimeLockPath(runtime)),true,"Crash must leave stale metadata lock residue.");assert.equal(readCloudRuntimeLock(runtime).active,false);assert(fs.existsSync(`${dbPath}-wal`)&&fs.statSync(`${dbPath}-wal`).size>0,"Crash must leave non-empty WAL before concurrent restart.");

  const contenders=[];const states=[];
  for(let i=0;i<25;i++){
    const child=startRelay(env);const state={child,text:"",ready:false,exited:false,code:null};states.push(state);contenders.push(child);
    const onData=d=>{state.text+=String(d);if(state.text.includes('"event":"cloud_ready"'))state.ready=true;};child.stdout.on("data",onData);child.stderr.on("data",onData);child.once("exit",code=>{state.exited=true;state.code=code;});
  }
  const deadline=Date.now()+15_000;while(true){const ready=states.filter(s=>s.ready).length;const settled=states.filter(s=>s.ready||s.exited).length;if(ready>=1&&settled===25)break;if(Date.now()>deadline)throw new Error(`Concurrent restart timed out: ${JSON.stringify(states.map(s=>({ready:s.ready,exited:s.exited,code:s.code,tail:s.text.slice(-200)})))}`);await sleep(20);}
  const winners=states.filter(s=>s.ready);assert.equal(winners.length,1,"Exactly one Relay may become ready after crash.");const losers=states.filter(s=>!s.ready);assert.equal(losers.length,24);for(const loser of losers){assert.notEqual(loser.code,0);assert.match(loser.text,/CLOUD_RUNTIME_ALREADY_ACTIVE|already active/i);}
  const winner=winners[0];const live=readCloudRuntimeLock(runtime);assert.equal(live.active,true);assert.equal(live.pid,winner.child.pid);
  winner.child.kill("SIGTERM");assert.equal((await waitExit(winner.child)).code,0);

  const db=new DatabaseSync(dbPath);try{assert(db.prepare("SELECT 1 AS ok FROM cloud_tenants WHERE public_key_fingerprint='fp-v158-restart'").get());const quick=String(Object.values(db.prepare("PRAGMA quick_check").get()||{})[0]||"");assert.equal(quick.toLowerCase(),"ok");assert.equal(Number(db.prepare("PRAGMA user_version").get().user_version),2);}finally{db.close();}

  console.log(JSON.stringify({cloudCrashManyRestartV158:"PASS",restartContenders:25,readyWinners:1,rejectedContenders:24,staleLockReclaimed:true,walRecovered:true,committedMetadataPreserved:true,quickCheck:"ok",schemaVersion:2},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
