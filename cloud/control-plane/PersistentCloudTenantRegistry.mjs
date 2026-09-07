import crypto from "node:crypto";
import path from "node:path";
import { CLOUD_CONTROL_SCHEMA_VERSION, openOperationalCloudControlDatabase } from "./cloudControlSchema.mjs";
import { buildTenantAssignment, requireCloudBaseDomain, validateAssignedMiniAppUrl, validateDnsHostname } from "../shared/cloudHostname.mjs";

const INSTALLATION_RE=/^inst_[A-Za-z0-9_-]{24}$/;
const STORE_RE=/^store_[A-Za-z0-9_-]{16,40}$/;
const normalizeHost=v=>String(v||"").trim().toLowerCase().replace(/\.$/,"");
const nowIso=()=>new Date().toISOString();
const fingerprint = (pem) => `ed25519_${crypto.createHash("sha256").update(pem,"utf8").digest("base64url")}`;
const canonicalEd25519PublicKey = (pem) => {
  try {
    const key=crypto.createPublicKey(String(pem||""));
    if(key.asymmetricKeyType!=="ed25519") throw new Error("Ed25519 public key required.");
    return key.export({format:"pem",type:"spki"}).toString();
  } catch {
    throw Object.assign(new Error("Ed25519 public key required."),{code:"PUBLIC_KEY_INVALID"});
  }
};
const parseCode = (code) => { const m=/^kce_([A-Za-z0-9_-]{12})_([A-Za-z0-9_-]{40,64})$/.exec(String(code||"").trim()); return m?{id:m[1],code:`kce_${m[1]}_${m[2]}`} : null; };
const hashCode = code => crypto.createHash("sha256").update(String(code),"utf8").digest("base64url");
const safeEqual = (a,b) => { const x=Buffer.from(String(a||""));const y=Buffer.from(String(b||""));return x.length===y.length&&x.length>0&&crypto.timingSafeEqual(x,y); };

export class PersistentCloudTenantRegistry {
  constructor(options={}) {
    const dbPath=path.resolve(String(options.dbPath||process.env.KOUROSH_CLOUD_CONTROL_DB_PATH||""));
    if(!dbPath || dbPath===path.resolve(".")) throw new Error("KOUROSH_CLOUD_CONTROL_DB_PATH is required.");
    this.dbPath=dbPath; this.connections=new Map();
    if(options.db){this.db=options.db;}
    else{const opened=openOperationalCloudControlDatabase(dbPath);this.db=opened.db;}
  }
  close(){this.db.close();}
  getSchemaVersion(){return Number(this.db.prepare("PRAGMA user_version").get().user_version||0);}
  checkIntegrity(){const row=this.db.prepare("PRAGMA quick_check").get();const value=String(Object.values(row||{})[0]||"");return {ok:value.toLowerCase()==="ok",result:value};}
  #row(row){if(!row)return null;return {installationId:row.installation_id,assignedStoreId:row.assigned_store_id,publicKeyPem:row.public_key_pem,publicKeyFingerprint:row.public_key_fingerprint,assignedHost:row.assigned_host,assignedPublicUrl:row.assigned_public_url,tenantStatus:row.tenant_status,credentialVersion:Number(row.credential_version||1),assignmentVersion:Number(row.assignment_version||1),createdAt:row.created_at,updatedAt:row.updated_at,lastConnectedAt:row.last_connected_at,lastDisconnectedAt:row.last_disconnected_at,revokedAt:row.revoked_at,activeConnection:this.connections.get(row.installation_id)||null};}
  async getTenant(id){return this.#row(this.db.prepare("SELECT * FROM cloud_tenants WHERE installation_id=?").get(String(id)));}
  async getTenantByStoreId(id){return this.#row(this.db.prepare("SELECT * FROM cloud_tenants WHERE assigned_store_id=?").get(String(id)));}
  async resolvePublicHost(host){return this.#row(this.db.prepare("SELECT * FROM cloud_tenants WHERE assigned_host=?").get(normalizeHost(host)));}
  async getCredential(id){const t=await this.getTenant(id);return t?{publicKeyPem:t.publicKeyPem,publicKeyFingerprint:t.publicKeyFingerprint,credentialVersion:t.credentialVersion}:null;}
  async assignConnection(id,connection){const old=this.connections.get(String(id))||null;this.connections.set(String(id),connection);return old;}
  async releaseConnection(id,connection){if(this.connections.get(String(id))===connection)this.connections.delete(String(id));}
  async markConnected(id){const now=nowIso();this.db.prepare("UPDATE cloud_tenants SET last_connected_at=?,updated_at=? WHERE installation_id=?").run(now,now,String(id));}
  async markDisconnected(id){const now=nowIso();this.db.prepare("UPDATE cloud_tenants SET last_disconnected_at=?,updated_at=? WHERE installation_id=?").run(now,now,String(id));}
  async registerTenant(input){
    const installationId=String(input.installationId||"").trim(); if(!INSTALLATION_RE.test(installationId))throw Object.assign(new Error("Invalid installation id."),{code:"INSTALLATION_ID_INVALID"});
    const publicKeyPem=canonicalEd25519PublicKey(input.publicKeyPem); const publicKeyFingerprint=fingerprint(publicKeyPem);
    if(input.publicKeyFingerprint && input.publicKeyFingerprint!==publicKeyFingerprint)throw Object.assign(new Error("Public key fingerprint mismatch."),{code:"PUBLIC_KEY_FINGERPRINT_MISMATCH"});
    const assignedStoreId=String(input.assignedStoreId||"").trim();if(!STORE_RE.test(assignedStoreId))throw Object.assign(new Error("Invalid store id."),{code:"STORE_ID_INVALID"});
    const checked=validateAssignedMiniAppUrl(input.assignedPublicUrl);if(!checked.ok)throw Object.assign(new Error("Assigned public URL invalid."),{code:"PUBLIC_URL_INVALID"});
    const now=nowIso();this.db.prepare("INSERT INTO cloud_tenants(installation_id,assigned_store_id,public_key_pem,public_key_fingerprint,assigned_host,assigned_public_url,tenant_status,credential_version,assignment_version,created_at,updated_at) VALUES(?,?,?,?,?,?, 'active',1,1,?,?)").run(installationId,assignedStoreId,publicKeyPem,publicKeyFingerprint,checked.host,checked.url,now,now);return this.getTenant(installationId);
  }
  createEnrollmentCode({purpose="enroll",targetStoreId=null,ttlMs=30*60_000,maxAttempts=8}={}){
    if(!["enroll","recovery"].includes(purpose))throw new Error("Invalid enrollment purpose.");
    if(purpose==="recovery"&&!STORE_RE.test(String(targetStoreId||"")))throw new Error("Recovery code requires a valid store id.");
    const id=crypto.randomBytes(9).toString("base64url").slice(0,12);const secret=crypto.randomBytes(32).toString("base64url");const code=`kce_${id}_${secret}`;const now=Date.now();const ttl=Math.max(60_000,Math.min(ttlMs,24*60*60_000));
    this.db.prepare("INSERT INTO cloud_enrollment_codes(code_id,code_hash,purpose,target_store_id,expires_at,used_at,attempts,max_attempts,created_at) VALUES(?,?,?,?,?,NULL,0,?,?)").run(id,hashCode(code),purpose,targetStoreId?String(targetStoreId):null,new Date(now+ttl).toISOString(),Math.max(1,Math.min(Number(maxAttempts)||8,20)),new Date(now).toISOString());
    return {code,expiresAt:new Date(now+ttl).toISOString(),purpose,targetStoreId};
  }
  #validateCode(code,purpose,targetStoreId){
    const parsed=parseCode(code);if(!parsed)throw Object.assign(new Error("Enrollment credential rejected."),{code:"ENROLLMENT_CODE_INVALID"});
    const row=this.db.prepare("SELECT * FROM cloud_enrollment_codes WHERE code_id=?").get(parsed.id);if(!row)throw Object.assign(new Error("Enrollment credential rejected."),{code:"ENROLLMENT_CODE_INVALID"});
    this.db.prepare("UPDATE cloud_enrollment_codes SET attempts=attempts+1 WHERE code_id=?").run(parsed.id);
    if(Number(row.attempts)>=Number(row.max_attempts))throw Object.assign(new Error("Enrollment attempt limit exceeded."),{code:"ENROLLMENT_ATTEMPTS_EXCEEDED"});
    if(row.used_at)throw Object.assign(new Error("Enrollment credential already used."),{code:"ENROLLMENT_CODE_USED"});
    if(Date.parse(row.expires_at)<=Date.now())throw Object.assign(new Error("Enrollment credential expired."),{code:"ENROLLMENT_CODE_EXPIRED"});
    if(row.purpose!==purpose)throw Object.assign(new Error("Enrollment credential purpose mismatch."),{code:"ENROLLMENT_CODE_INVALID"});
    if(targetStoreId && row.target_store_id!==targetStoreId)throw Object.assign(new Error("Enrollment credential target mismatch."),{code:"ENROLLMENT_CODE_INVALID"});
    if(!safeEqual(row.code_hash,hashCode(parsed.code)))throw Object.assign(new Error("Enrollment credential rejected."),{code:"ENROLLMENT_CODE_INVALID"});
    return row;
  }
  #allocateUniqueAssignment(baseDomain){
    const domain=requireCloudBaseDomain(baseDomain);
    for(let attempt=0;attempt<20;attempt+=1){const assignment=buildTenantAssignment({baseDomain:domain});if(!this.db.prepare("SELECT 1 FROM cloud_tenants WHERE assigned_host=?").get(assignment.assignedHost))return assignment;}
    throw Object.assign(new Error("Unable to allocate unique tenant host."),{code:"TENANT_HOST_ALLOCATION_FAILED"});
  }
  enrollTenant({installationId,publicKeyPem,enrollmentCode,baseDomain,connectorEndpoint}){
    const id=String(installationId||"").trim();if(!INSTALLATION_RE.test(id))throw Object.assign(new Error("Invalid installation id."),{code:"INSTALLATION_ID_INVALID"});
    const canonical=canonicalEd25519PublicKey(publicKeyPem);const fp=fingerprint(canonical);const domain=requireCloudBaseDomain(baseDomain);
    if(this.db.prepare("SELECT 1 FROM cloud_tenants WHERE installation_id=?").get(id))throw Object.assign(new Error("Installation already provisioned."),{code:"TENANT_EXISTS"});
    const codeRow=this.#validateCode(enrollmentCode,"enroll",null);
    this.db.exec("BEGIN IMMEDIATE");
    try{const storeId=`store_${crypto.randomBytes(15).toString("base64url")}`;const assignment=this.#allocateUniqueAssignment(domain);const now=nowIso();
      this.db.prepare("INSERT INTO cloud_tenants(installation_id,assigned_store_id,public_key_pem,public_key_fingerprint,assigned_host,assigned_public_url,tenant_status,credential_version,assignment_version,created_at,updated_at) VALUES(?,?,?,?,?,?, 'active',1,1,?,?)").run(id,storeId,canonical,fp,assignment.assignedHost,assignment.assignedPublicUrl,now,now);
      this.db.prepare("UPDATE cloud_enrollment_codes SET used_at=? WHERE code_id=?").run(now,codeRow.code_id);this.db.exec("COMMIT");return {installationId:id,assignedStoreId:storeId,assignedHost:assignment.assignedHost,assignedPublicUrl:assignment.assignedPublicUrl,assignmentVersion:1,connectorEndpoint,protocolVersion:1,publicKeyFingerprint:fp};
    }catch(error){try{this.db.exec("ROLLBACK");}catch{}throw error;}
  }
  rotateTenantKey({installationId,publicKeyPem,recoveryCode}){
    const tenant=this.db.prepare("SELECT * FROM cloud_tenants WHERE installation_id=?").get(String(installationId));if(!tenant)throw Object.assign(new Error("Tenant not found."),{code:"TENANT_NOT_FOUND"});
    const canonical=canonicalEd25519PublicKey(publicKeyPem);const fp=fingerprint(canonical);const codeRow=this.#validateCode(recoveryCode,"recovery",tenant.assigned_store_id);this.db.exec("BEGIN IMMEDIATE");
    try{const now=nowIso();this.db.prepare("UPDATE cloud_tenants SET public_key_pem=?,public_key_fingerprint=?,credential_version=credential_version+1,tenant_status='active',revoked_at=NULL,updated_at=? WHERE installation_id=?").run(canonical,fp,now,tenant.installation_id);this.db.prepare("UPDATE cloud_enrollment_codes SET used_at=? WHERE code_id=?").run(now,codeRow.code_id);this.db.exec("COMMIT");return this.getTenant(tenant.installation_id);}catch(error){try{this.db.exec("ROLLBACK");}catch{}throw error;}
  }
  async reassignTenantHost(storeId,{baseDomain}={}){
    const tenant=await this.getTenantByStoreId(storeId);if(!tenant)throw Object.assign(new Error("Tenant not found."),{code:"TENANT_NOT_FOUND"});const assignment=this.#allocateUniqueAssignment(baseDomain);const now=nowIso();
    this.db.exec("BEGIN IMMEDIATE");try{this.db.prepare("UPDATE cloud_tenants SET assigned_host=?,assigned_public_url=?,assignment_version=assignment_version+1,updated_at=? WHERE assigned_store_id=?").run(assignment.assignedHost,assignment.assignedPublicUrl,now,String(storeId));this.db.exec("COMMIT");return this.getTenantByStoreId(storeId);}catch(error){try{this.db.exec("ROLLBACK");}catch{}throw error;}
  }
  getHostReadinessIssues(){
    const issues=[];for(const row of this.db.prepare("SELECT assigned_store_id,assigned_host,assigned_public_url FROM cloud_tenants ORDER BY assigned_store_id").all()){const hostCheck=validateDnsHostname(String(row.assigned_host||""));const urlCheck=validateAssignedMiniAppUrl(String(row.assigned_public_url||""));if(!hostCheck.ok||!urlCheck.ok||urlCheck.host!==String(row.assigned_host||"").toLowerCase())issues.push({storeId:row.assigned_store_id,code:"HOST_REASSIGNMENT_REQUIRED"});}return issues;
  }
  revokeTenant(storeId){const now=nowIso();const r=this.db.prepare("UPDATE cloud_tenants SET tenant_status='revoked',revoked_at=?,updated_at=? WHERE assigned_store_id=?").run(now,now,String(storeId));if(!r.changes)throw Object.assign(new Error("Tenant not found."),{code:"TENANT_NOT_FOUND"});return this.getTenantByStoreId(storeId);}
  suspendTenant(storeId){const now=nowIso();const r=this.db.prepare("UPDATE cloud_tenants SET tenant_status='suspended',updated_at=? WHERE assigned_store_id=?").run(now,String(storeId));if(!r.changes)throw Object.assign(new Error("Tenant not found."),{code:"TENANT_NOT_FOUND"});return this.getTenantByStoreId(storeId);}
  activateTenant(storeId){const now=nowIso();const r=this.db.prepare("UPDATE cloud_tenants SET tenant_status='active',revoked_at=NULL,updated_at=? WHERE assigned_store_id=?").run(now,String(storeId));if(!r.changes)throw Object.assign(new Error("Tenant not found."),{code:"TENANT_NOT_FOUND"});return this.getTenantByStoreId(storeId);}
  listSchema(){return this.db.prepare("SELECT type,name,sql FROM sqlite_master WHERE type IN ('table','index') ORDER BY type,name").all();}
  listTenants(){return this.db.prepare("SELECT installation_id,assigned_store_id,public_key_fingerprint,assigned_host,assigned_public_url,tenant_status,credential_version,assignment_version,created_at,updated_at,last_connected_at,last_disconnected_at,revoked_at FROM cloud_tenants ORDER BY created_at").all();}
  getTenantCount(){return Number(this.db.prepare("SELECT COUNT(*) AS count FROM cloud_tenants").get().count||0);}
}

export { CLOUD_CONTROL_SCHEMA_VERSION };
