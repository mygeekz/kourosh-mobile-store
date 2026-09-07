import crypto from "node:crypto";
const normalizeHost = (value) => String(value || "").trim().toLowerCase().replace(/\.$/, "");
const canonicalPublicKey = pem => { const key=crypto.createPublicKey(String(pem||"")); if(key.asymmetricKeyType!=="ed25519") throw new Error("Ed25519 public key required."); return key.export({format:"pem",type:"spki"}).toString(); };
const fingerprint = pem => `ed25519_${crypto.createHash("sha256").update(pem,"utf8").digest("base64url")}`;

export class MemoryCloudTenantRegistry {
  #tenants = new Map();
  #hosts = new Map();
  #stores = new Map();
  #fingerprints = new Map();
  async getTenant(installationId) { return this.#tenants.get(String(installationId)) || null; }
  async getTenantByStoreId(storeId) { const id=this.#stores.get(String(storeId));return id?this.getTenant(id):null; }
  async registerTenant(input) {
    const installationId = String(input.installationId || "").trim();
    let publicKeyPem; try { publicKeyPem = canonicalPublicKey(input.publicKeyPem); } catch { throw new Error("Invalid tenant provisioning payload."); }
    const computedFingerprint=fingerprint(publicKeyPem); const supplied=String(input.publicKeyFingerprint||computedFingerprint).trim();
    const publicKeyFingerprint = computedFingerprint;
    const assignedStoreId = String(input.assignedStoreId || `store_${crypto.randomBytes(15).toString("base64url")}`).trim();
    const assignedPublicUrl = input.assignedPublicUrl ? String(input.assignedPublicUrl).trim() : null;
    if (!/^inst_[A-Za-z0-9_-]{24}$/.test(installationId) || !publicKeyFingerprint.startsWith("ed25519_") || supplied!==computedFingerprint) throw new Error("Invalid tenant provisioning payload.");
    let host = null;
    if (assignedPublicUrl) { const url = new URL(assignedPublicUrl); if (url.protocol !== "https:") throw new Error("Assigned public URL must use HTTPS."); host = normalizeHost(url.host); }
    const oldByHost=host&&this.#hosts.get(host); if(oldByHost&&oldByHost!==installationId) throw Object.assign(new Error("Assigned host already belongs to another tenant."),{code:"HOST_COLLISION"});
    const oldByStore=this.#stores.get(assignedStoreId); if(oldByStore&&oldByStore!==installationId) throw Object.assign(new Error("Store id collision."),{code:"STORE_ID_COLLISION"});
    const oldByFp=this.#fingerprints.get(publicKeyFingerprint); if(oldByFp&&oldByFp!==installationId) throw Object.assign(new Error("Public key collision."),{code:"PUBLIC_KEY_COLLISION"});
    const existing=this.#tenants.get(installationId); if(existing?.assignedHost&&existing.assignedHost!==host)this.#hosts.delete(existing.assignedHost);
    const tenant = { installationId, publicKeyPem, publicKeyFingerprint, assignedStoreId, assignedPublicUrl, assignedHost: host, tenantStatus:"active", credentialVersion:existing?.credentialVersion||1, activeConnection: existing?.activeConnection||null };
    this.#tenants.set(installationId, tenant); if (host) this.#hosts.set(host, installationId);this.#stores.set(assignedStoreId,installationId);this.#fingerprints.set(publicKeyFingerprint,installationId); return { ...tenant, activeConnection: undefined };
  }
  async getPublicKey(installationId) { return (await this.getTenant(installationId))?.publicKeyPem || null; }
  async getCredential(installationId) { const tenant = await this.getTenant(installationId); return tenant ? { publicKeyPem: tenant.publicKeyPem, publicKeyFingerprint: tenant.publicKeyFingerprint, credentialVersion:tenant.credentialVersion } : null; }
  async assignConnection(installationId, connection) { const tenant = await this.getTenant(installationId); if (!tenant) return null; const old = tenant.activeConnection; tenant.activeConnection = connection; return old; }
  async releaseConnection(installationId, connection) { const tenant = await this.getTenant(installationId); if (tenant?.activeConnection === connection) tenant.activeConnection = null; }
  async resolvePublicHost(host) { const id = this.#hosts.get(normalizeHost(host)); return id ? this.getTenant(id) : null; }
  async markConnected() {}
  async markDisconnected() {}
  async revokeTenant(storeId){const t=await this.getTenantByStoreId(storeId);if(!t)throw new Error("Tenant not found");t.tenantStatus="revoked";return t;}
}
