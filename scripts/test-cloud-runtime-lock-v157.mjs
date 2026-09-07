import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { initializeCloudControlDatabase } from "../cloud/operations/cloudControlLifecycle.mjs";
import { readCloudRuntimeLock, resolveCloudProcessIdentity, resolveCloudRuntimeLockOwnerPath, resolveCloudRuntimeLockPath } from "../cloud/runtime/cloudRuntimeState.mjs";

const freePort=()=>new Promise((resolve,reject)=>{const server=net.createServer();server.once("error",reject);server.listen(0,"127.0.0.1",()=>{const port=server.address().port;server.close(error=>error?reject(error):resolve(port));});});
const waitForOutput=(child,pattern,timeoutMs=8000)=>new Promise((resolve,reject)=>{let output="";const timer=setTimeout(()=>reject(new Error(`Timed out waiting for ${pattern}; output=${output}`)),timeoutMs);const onData=data=>{output+=String(data);if(pattern.test(output)){clearTimeout(timer);resolve(output);}};child.stdout?.on("data",onData);child.stderr?.on("data",onData);child.once("exit",code=>{if(!pattern.test(output)){clearTimeout(timer);reject(new Error(`Process exited ${code}; output=${output}`));}});});
const waitExit=child=>new Promise(resolve=>child.once("exit",(code,signal)=>resolve({code,signal})));
const stopGracefully=async child=>{if(child.exitCode!==null)return child.exitCode;child.kill("SIGTERM");return (await waitExit(child)).code;};
const baseEnv=(runtime,dbPath,port)=>({...process.env,NODE_ENV:"development",KOUROSH_CLOUD_RUNTIME_DIR:runtime,KOUROSH_CLOUD_CONTROL_DB_PATH:dbPath,KOUROSH_CLOUD_BACKUP_DIR:path.join(runtime,"backups"),KOUROSH_CLOUD_PUBLIC_BASE_DOMAIN:"example.invalid",KOUROSH_CLOUD_CONTROL_HOST:"control.example.invalid",KOUROSH_CLOUD_CONNECTOR_HOST:"connector.example.invalid",KOUROSH_CLOUD_INSTANCE_COUNT:"1",KOUROSH_CLOUD_DEV_PROVISIONING:"0",KOUROSH_CLOUD_EDGE_CLIENT_IP_MODE:"direct",KOUROSH_CLOUD_RELAY_BIND_HOST:"127.0.0.1",KOUROSH_CLOUD_RELAY_PORT:String(port)});
const startRelay=(env)=>spawn(process.execPath,["cloud/relay-server/index.mjs"],{cwd:process.cwd(),env,stdio:["ignore","pipe","pipe"]});

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"kourosh-v157-lock-"));
try{
  assert.equal(process.platform,"linux","Pilot lock identity test requires the supported Linux runtime.");
  const currentIdentity=resolveCloudProcessIdentity(process.pid);assert.equal(currentIdentity.strong,true,"Linux /proc process identity must be available for the Pilot lock contract.");
  const runtime=path.join(temp,"runtime"),dbPath=path.join(runtime,"control.db"),port=await freePort();
  const config={runtimeDataDir:runtime,controlDbPath:dbPath,backupDir:path.join(runtime,"backups")};initializeCloudControlDatabase({config});
  const env=baseEnv(runtime,dbPath,port),lockFile=resolveCloudRuntimeLockPath(runtime);

  const fakeIdentity=`${currentIdentity.identity}:stale`;
  fs.writeFileSync(lockFile,JSON.stringify({pid:process.pid,startedAt:"2000-01-01T00:00:00.000Z",processIdentity:fakeIdentity,processIdentityMode:"linux_proc_start_ticks"}),{mode:0o600});
  const mismatched=readCloudRuntimeLock(runtime);assert.equal(mismatched.pidAlive,true);assert.equal(mismatched.identityMatch,false);assert.equal(mismatched.active,false);assert.equal(mismatched.ownershipMode,"process_identity_mismatch");
  const unrelatedRelay=startRelay(env);await waitForOutput(unrelatedRelay,/"event":"cloud_ready"/);assert.equal(await stopGracefully(unrelatedRelay),0);

  const activeRelay=startRelay(env);await waitForOutput(activeRelay,/"event":"cloud_ready"/);
  const activeLock=readCloudRuntimeLock(runtime);assert.equal(activeLock.active,true);assert.equal(activeLock.strongOwnership,true);assert.equal(activeLock.ownershipMode,"linux_proc_start_ticks");assert.match(String(activeLock.processIdentity||""),/^linux:[0-9a-f-]+:\d+$/);
  const lockOwnerFile=resolveCloudRuntimeLockOwnerPath(runtime);const lockBytesBefore=fs.readFileSync(lockOwnerFile,"utf8");
  const second=spawnSync(process.execPath,["cloud/relay-server/index.mjs"],{cwd:process.cwd(),env,encoding:"utf8",timeout:5000});assert.notEqual(second.status,0);assert.match(`${second.stdout}\n${second.stderr}`,/CLOUD_RUNTIME_ALREADY_ACTIVE|already active/i);assert.equal(fs.readFileSync(lockOwnerFile,"utf8"),lockBytesBefore,"Rejected second instance must not replace the active lock.");

  activeRelay.kill("SIGKILL");await waitExit(activeRelay);assert.equal(fs.existsSync(lockFile),true,"Crash must leave the lock file for stale-lock recovery testing.");
  const staleAfterCrash=readCloudRuntimeLock(runtime);assert.equal(staleAfterCrash.active,false);assert.equal(staleAfterCrash.pidAlive,false);
  const restarted=startRelay(env);await waitForOutput(restarted,/"event":"cloud_ready"/);const restartedLock=readCloudRuntimeLock(runtime);assert.equal(restartedLock.active,true);assert.equal(restartedLock.strongOwnership,true);assert.notEqual(restartedLock.processIdentity,activeLock.processIdentity);assert.equal(await stopGracefully(restarted),0);

  fs.writeFileSync(lockFile,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}),{mode:0o600});const legacy=readCloudRuntimeLock(runtime);assert.equal(legacy.active,true);assert.equal(legacy.strongOwnership,false);assert.equal(legacy.ownershipMode,"pid_only_legacy");fs.unlinkSync(lockFile);

  console.log(JSON.stringify({cloudRuntimeLockV157:"PASS",platform:process.platform,identityMode:currentIdentity.mode,unrelatedLivePidMismatchRejected:true,realActiveRelayBlockedSecondInstance:true,crashStaleLockRecovered:true,legacyPidOnlyFallbackReported:true},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
