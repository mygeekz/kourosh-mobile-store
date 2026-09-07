export type CloudTenantConnectionHandle = unknown;
export type CloudTenantStatus = "active" | "suspended" | "revoked";

export type CloudTenantRecord = {
  installationId: string;
  publicKeyPem: string;
  publicKeyFingerprint: string;
  assignedStoreId: string;
  assignedPublicUrl: string | null;
  assignedHost: string | null;
  tenantStatus?: CloudTenantStatus;
  credentialVersion?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastConnectedAt?: string | null;
  lastDisconnectedAt?: string | null;
  revokedAt?: string | null;
  activeConnection?: CloudTenantConnectionHandle | null;
};

export type RegisterCloudTenantInput = {
  installationId: string;
  publicKeyPem: string;
  publicKeyFingerprint?: string;
  assignedStoreId?: string;
  assignedPublicUrl?: string | null;
};

/**
 * Cloud-only tenant metadata seam. Implementations may persist routing/auth metadata,
 * but never Kourosh business/financial data or Telegram Bot credentials.
 */
export interface CloudTenantRegistry {
  getTenant(installationId: string): Promise<CloudTenantRecord | null> | CloudTenantRecord | null;
  registerTenant(input: RegisterCloudTenantInput): Promise<CloudTenantRecord> | CloudTenantRecord;
  getCredential(installationId: string): Promise<Pick<CloudTenantRecord, "publicKeyPem" | "publicKeyFingerprint" | "credentialVersion"> | null> | Pick<CloudTenantRecord, "publicKeyPem" | "publicKeyFingerprint" | "credentialVersion"> | null;
  assignConnection(installationId: string, connection: CloudTenantConnectionHandle): Promise<CloudTenantConnectionHandle | null> | CloudTenantConnectionHandle | null;
  releaseConnection(installationId: string, connection: CloudTenantConnectionHandle): Promise<void> | void;
  resolvePublicHost(host: string): Promise<CloudTenantRecord | null> | CloudTenantRecord | null;
}
