import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { initializeCloudControlDatabase } from "../cloud/operations/cloudControlLifecycle.mjs";
import { acquireCloudRuntimeLock, readCloudRuntimeLock, releaseCloudRuntimeLockOwnership, resolveCloudProcessIdentity, resolveCloudRuntimeLockOwnerPath, resolveCloudRuntimeLockPath } from "../cloud/runtime/cloudRuntimeState.mjs";

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitExit=child=>child.exitCode!==null||child.signalCode?Promise.resolve({code:child.exitCode,signal:child.signalCode}):new Promise(resolve=>child.once("exit",(code,signal)=>resolve({code,signal})));
const waitForOutput=(child,pattern,timeoutMs=10_000)=>new Promise((resolve,reject)=>{let text="";const timer=setTimeout(()=>reject(new Error(`Timed out waiting for ${pattern}; output=${text}`)),timeoutMs);const onData=d=>{text+=String(d);if(pattern.test(text)){clearTimeout(timer);resolve(text);}};child.stdout?.on("data",onData);child.stderr?.on("data",onData);child.once("exit",code=>{if(!pattern.test(text)){clearTimeout(timer);reject(new Error(`Process exited ${code}; output=${text}`));}});});
const freePort=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.once("error",reject);s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});});
const baseEnv=(runtime,dbPath,port)=>({...process.env,NODE_ENV:"development",KOUROSH_CLOUD_RUNTIME_DIR:runtime,KOUROSH_CLOUD_CONTROL_DB_PATH:dbPath,KOUROSH_CLOUD_BACKUP_DIR:path.join(runtime,"backups"),KOUROSH_CLOUD_PUBLIC_BASE_DOMAIN:"example.invalid",KOUROSH_CLOUD_CONTROL_HOST:"control.example.invalid",KOUROSH_CLOUD_CONNECTOR_HOST:"connector.example.invalid",KOUROSH_CLOUD_INSTANCE_COUNT:"1",KOUROSH_CLOUD_DEV_PROVISIONING:"0",KOUROSH_CLOUD_EDGE_CLIENT_IP_MODE:"direct",KOUROSH_CLOUD_RELAY_BIND_HOST:"127.0.0.1",KOUROSH_CLOUD_RELAY_PORT:String(port)});

if(process.argv[2]==="--worker"){
  const runtime=process.argv[3],gate=process.argv[4];
  console.log("READY");
  while(!fs.existsSync(gate))await sleep(5);
  try{
    const lock=await acquireCloudRuntimeLock(runtime);
    console.log(`RESULT ${JSON.stringify({status:"acquired",pid:process.pid,lockId:lock.lockId})}`);
    const finish=async()=>{await lock.release();process.exit(0);};
    process.once("SIGTERM",()=>void finish());process.once("SIGINT",()=>void finish());
    setInterval(()=>{},1000);
  }catch(error){console.log(`RESULT ${JSON.stringify({status:"rejected",pid:process.pid,code:String(error?.code||error?.message||"LOCK_FAILED")})}`);process.exit(0);}
}
else{
  assert.equal(process.platform,"linux","v158 Pilot atomic lock concurrency test requires Linux.");
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"kourosh-v158-lock-concurrency-"));
  const workerScript=path.resolve(process.argv[1]);
  const spawnContenders=async(runtime,count,{expectWinner=true,label="round"}={})=>{
    fs.mkdirSync(runtime,{recursive:true,mode:0o700});const gate=path.join(temp,`gate-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const children=[];const states=[];
    for(let i=0;i<count;i++){
      const child=spawn(process.execPath,[workerScript,"--worker",runtime,gate],{cwd:process.cwd(),stdio:["ignore","pipe","pipe"]});children.push(child);states.push({ready:false,result:null,text:""});
      const idx=i;const onData=d=>{states[idx].text+=String(d);for(const line of states[idx].text.split(/\r?\n/)){if(line==="READY")states[idx].ready=true;if(line.startsWith("RESULT ")){try{states[idx].result=JSON.parse(line.slice(7));}catch{}}}};child.stdout.on("data",onData);child.stderr.on("data",onData);
    }
    const deadline=Date.now()+20_000;while(states.some(s=>!s.ready)){if(Date.now()>deadline)throw new Error(`Timed out waiting for ${count} contenders (${label}).`);await sleep(10);}fs.writeFileSync(gate,"go");
    const resultDeadline=Date.now()+15_000;while(states.some(s=>!s.result)){if(Date.now()>resultDeadline)throw new Error(`Timed out waiting for contention results (${label}): ${JSON.stringify(states.map(s=>s.text.slice(-200)))}`);await sleep(10);}
    const winners=states.map((s,i)=>({state:s.result,child:children[i]})).filter(x=>x.state.status==="acquired");
    const rejected=states.filter(s=>s.result.status==="rejected");
    if(expectWinner)assert.equal(winners.length,1,`${label}: exactly one contender must acquire`);else assert.equal(winners.length,0,`${label}: no contender may displace a live owner`);
    if(expectWinner)assert.equal(rejected.length,count-1);else assert.equal(rejected.length,count);
    for(const win of winners){win.child.kill("SIGTERM");await waitExit(win.child);}for(const [i,child] of children.entries()){if(states[i].result.status!=="acquired")await waitExit(child);}
    try{fs.unlinkSync(gate);}catch{}
    return {winners:winners.length,rejected:rejected.length,codes:[...new Set(rejected.map(s=>s.result.code))]};
  };
  try{
    // Test A: one atomic winner from 100 simultaneous child processes.
    const initialRuntime=path.join(temp,"empty-100");const empty100=await spawnContenders(initialRuntime,100,{label:"empty100"});

    // 20 independent process-level rounds, 50 contenders each.
    const rounds=[];for(let round=0;round<20;round++){rounds.push(await spawnContenders(path.join(temp,`round-${round}`),50,{label:`round${round}`}));}
    assert(rounds.every(r=>r.winners===1&&r.rejected===49));

    // Simultaneous stale reclamation. The stale metadata is a valid v158 lock directory with a dead PID.
    const staleRuntime=path.join(temp,"stale");fs.mkdirSync(resolveCloudRuntimeLockPath(staleRuntime),{recursive:true,mode:0o700});fs.writeFileSync(resolveCloudRuntimeLockOwnerPath(staleRuntime),JSON.stringify({lockId:"1".repeat(64),pid:99999999,startedAt:"2000-01-01T00:00:00.000Z",processIdentity:"linux:dead:1",processIdentityMode:"linux_proc_start_ticks",atomicOwnershipMode:"linux_abstract_unix_socket"}),{mode:0o600});
    const staleResult=await spawnContenders(staleRuntime,50,{label:"stale50"});assert.equal(staleResult.winners,1);

    // Old-owner release safety with a real crashed owner: A acquires, crashes, B reclaims, then simulated A cleanup cannot remove B.
    const oldRuntime=path.join(temp,"old-owner");fs.mkdirSync(oldRuntime,{recursive:true});const oldGate=path.join(temp,"gate-old-owner");const oldChild=spawn(process.execPath,[workerScript,"--worker",oldRuntime,oldGate],{cwd:process.cwd(),stdio:["ignore","pipe","pipe"]});let oldText="";let oldReady=false;let oldResult=null;oldChild.stdout.on("data",d=>{oldText+=String(d);for(const line of oldText.split(/\r?\n/)){if(line==="READY")oldReady=true;if(line.startsWith("RESULT ")){try{oldResult=JSON.parse(line.slice(7));}catch{}}}});oldChild.stderr.on("data",d=>oldText+=String(d));const oldDeadline=Date.now()+10_000;while(!oldReady){if(Date.now()>oldDeadline)throw new Error(`Old-owner worker did not become ready: ${oldText}`);await sleep(10);}fs.writeFileSync(oldGate,"go");while(!oldResult){if(Date.now()>oldDeadline)throw new Error(`Old-owner worker did not acquire: ${oldText}`);await sleep(10);}assert.equal(oldResult.status,"acquired");const oldToken=oldResult.lockId;oldChild.kill("SIGKILL");await waitExit(oldChild);assert.equal(readCloudRuntimeLock(oldRuntime).active,false);
    const replacement=await acquireCloudRuntimeLock(oldRuntime);assert.notEqual(replacement.lockId,oldToken);assert.equal(releaseCloudRuntimeLockOwnership(oldRuntime,oldToken),false);assert.equal(readCloudRuntimeLock(oldRuntime).lockId,replacement.lockId);await replacement.release();

    // Malformed directory is quarantined without recursive deletion of unknown content.
    const malformedRuntime=path.join(temp,"malformed");const malformedLock=resolveCloudRuntimeLockPath(malformedRuntime);fs.mkdirSync(malformedLock,{recursive:true});fs.writeFileSync(path.join(malformedLock,"do-not-delete.txt"),"preserve");const malformedOwner=await acquireCloudRuntimeLock(malformedRuntime);const quarantines=fs.readdirSync(malformedRuntime).filter(n=>n.startsWith("cloud-relay.lock.stale."));assert.equal(quarantines.length,1);assert.equal(fs.readFileSync(path.join(malformedRuntime,quarantines[0],"do-not-delete.txt"),"utf8"),"preserve");await malformedOwner.release();

    // Symlink path is rejected without following or changing its target.
    const symlinkRuntime=path.join(temp,"symlink");fs.mkdirSync(symlinkRuntime,{recursive:true});const target=path.join(temp,"symlink-target");fs.writeFileSync(target,"SAFE");fs.symlinkSync(target,resolveCloudRuntimeLockPath(symlinkRuntime));await assert.rejects(()=>acquireCloudRuntimeLock(symlinkRuntime),e=>e?.code==="CLOUD_RUNTIME_LOCK_UNSAFE_PATH");assert.equal(fs.readFileSync(target,"utf8"),"SAFE");

    // A real Relay owns the kernel lock; 50 contenders must all lose.
    const activeRuntime=path.join(temp,"active"),activeDb=path.join(activeRuntime,"control.db"),activePort=await freePort();initializeCloudControlDatabase({config:{runtimeDataDir:activeRuntime,controlDbPath:activeDb,backupDir:path.join(activeRuntime,"backups")}});const relay=spawn(process.execPath,["cloud/relay-server/index.mjs"],{cwd:process.cwd(),env:baseEnv(activeRuntime,activeDb,activePort),stdio:["ignore","pipe","pipe"]});await waitForOutput(relay,/"event":"cloud_ready"/);const activeResult=await spawnContenders(activeRuntime,50,{expectWinner:false,label:"active50"});assert.equal(activeResult.rejected,50);const live=readCloudRuntimeLock(activeRuntime);assert.equal(live.active,true);relay.kill("SIGTERM");assert.equal((await waitExit(relay)).code,0);

    // PID-reuse hardening remains: live unrelated PID + wrong process identity is stale.
    const pidRuntime=path.join(temp,"pid-reuse");fs.mkdirSync(pidRuntime,{recursive:true});const identity=resolveCloudProcessIdentity(process.pid);assert.equal(identity.strong,true);fs.mkdirSync(resolveCloudRuntimeLockPath(pidRuntime),{mode:0o700});fs.writeFileSync(resolveCloudRuntimeLockOwnerPath(pidRuntime),JSON.stringify({lockId:"3".repeat(64),pid:process.pid,startedAt:"2000-01-01T00:00:00.000Z",processIdentity:`${identity.identity}:wrong`,processIdentityMode:"linux_proc_start_ticks"}),{mode:0o600});const mismatch=readCloudRuntimeLock(pidRuntime);assert.equal(mismatch.pidAlive,true);assert.equal(mismatch.identityMatch,false);assert.equal(mismatch.active,false);

    console.log(JSON.stringify({cloudRuntimeLockConcurrencyV158:"PASS",emptyLock100:empty100,multiRound:{rounds:rounds.length,contendersPerRound:50,allExactlyOneWinner:true},staleLock50:staleResult,activeOwner50:activeResult,oldOwnerReleaseSafe:true,malformedLockQuarantined:true,symlinkAttackRejected:true,pidReuseRegression:true},null,2));
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
