import type { MiniAppIdentity, MiniAppWorkspace } from "./miniAppSession.js";
import {
  isMiniAppStaffRole,
  resolveMiniAppStaffCapabilities,
  resolveMiniAppStaffCapabilitiesFromPermissions,
} from "../security/miniAppStaffAccessPolicy.js";
import { hasAnyManagementPermission } from "../security/managementAccessPolicy.js";

export type MiniAppIdentityRecord = {
  id: number;
  displayName?: string | null;
  roleName?: string | null;
  permissions?: string[];
};

export type MiniAppIdentityLookup = {
  findCustomerIdentities: (telegramUserId: string) => Promise<MiniAppIdentityRecord[]>;
  findPartnerIdentities: (telegramUserId: string) => Promise<MiniAppIdentityRecord[]>;
  findStaffIdentities?: (telegramUserId: string) => Promise<MiniAppIdentityRecord[]>;
};

const CUSTOMER_CAPABILITIES = [
  "customer:read_own",
  "customer:account:read_own",
  "customer:installments:read_own",
  "customer:invoices:read_own",
] as const;

const PARTNER_CAPABILITIES = [
  "partner:read_own",
  "partner:ledger:read_own",
  "partner:purchases:read_own",
  "partner:phones:read_own",
] as const;

export class MiniAppIdentityResolutionError extends Error {
  readonly code = "MINIAPP_IDENTITY_AMBIGUOUS";

  constructor() {
    super("این حساب تلگرام به بیش از یک پرونده هم‌نوع متصل است. با مدیر سیستم تماس بگیرید.");
    this.name = "MiniAppIdentityResolutionError";
  }
}

const uniqueById = (records: MiniAppIdentityRecord[]): MiniAppIdentityRecord[] => {
  const byId = new Map<number, MiniAppIdentityRecord>();
  for (const record of records || []) {
    const id = Number(record?.id || 0);
    if (!Number.isInteger(id) || id <= 0 || byId.has(id)) continue;
    const normalized: MiniAppIdentityRecord = {
      id,
      displayName: record.displayName || null,
      permissions: Array.isArray(record.permissions) ? [...new Set(record.permissions.map(String))] : undefined,
    };
    if (record.roleName) normalized.roleName = record.roleName;
    byId.set(id, normalized);
  }
  return [...byId.values()];
};

const customerWorkspace = (record: MiniAppIdentityRecord): MiniAppWorkspace => ({
  kind: "customer",
  subjectId: record.id,
  displayName: String(record.displayName || "مشتری کوروش"),
  capabilities: [...CUSTOMER_CAPABILITIES],
  permissions: [],
});

const partnerWorkspace = (record: MiniAppIdentityRecord): MiniAppWorkspace => ({
  kind: "partner",
  subjectId: record.id,
  displayName: String(record.displayName || "همکار کوروش"),
  capabilities: [...PARTNER_CAPABILITIES],
  permissions: [],
});

const managerWorkspace = (record: MiniAppIdentityRecord): MiniAppWorkspace | null => {
  const hasExplicitPermissions = Array.isArray(record.permissions);
  if (hasExplicitPermissions && !hasAnyManagementPermission(record.permissions || [])) return null;
  if (!hasExplicitPermissions && !isMiniAppStaffRole(record.roleName)) return null;
  const permissions = record.permissions || [];
  const capabilities = hasExplicitPermissions
    ? resolveMiniAppStaffCapabilitiesFromPermissions(permissions)
    : [...resolveMiniAppStaffCapabilities(record.roleName)];
  return {
    kind: "manager",
    subjectId: record.id,
    displayName: String(record.displayName || "کاربر کوروش"),
    roleName: record.roleName || null,
    capabilities,
    permissions: [...permissions],
  };
};


export const selectMiniAppWorkspace = (
  identity: MiniAppIdentity,
  requestedKind: MiniAppWorkspace["kind"] | null | undefined,
): MiniAppIdentity | null => {
  if (!requestedKind) return identity;
  const workspace = (identity.workspaces || []).find((item) => item.kind === requestedKind);
  if (!workspace) return null;
  if (workspace.kind === "manager") {
    return {
      kind: "staff",
      subjectId: workspace.subjectId,
      displayName: workspace.displayName,
      telegramUserId: identity.telegramUserId,
      roleName: workspace.roleName || undefined,
      capabilities: [...workspace.capabilities],
      permissions: [...workspace.permissions],
      workspaces: identity.workspaces,
    };
  }
  return {
    kind: workspace.kind,
    subjectId: workspace.subjectId,
    displayName: workspace.displayName,
    telegramUserId: identity.telegramUserId,
    capabilities: [...workspace.capabilities],
    permissions: [],
    workspaces: identity.workspaces,
  };
};

export const createMiniAppIdentityResolver = (
  lookup: MiniAppIdentityLookup,
) => async (telegramUserId: string): Promise<MiniAppIdentity | null> => {
  const [staffRecords, customerRecords, partnerRecords] = await Promise.all([
    lookup.findStaffIdentities?.(telegramUserId) ?? Promise.resolve([]),
    lookup.findCustomerIdentities(telegramUserId),
    lookup.findPartnerIdentities(telegramUserId),
  ]);
  const staff = uniqueById(staffRecords);
  const customers = uniqueById(customerRecords);
  const partners = uniqueById(partnerRecords);

  // Multiple matches inside the same business relationship remain unsafe.
  if (staff.length > 1 || customers.length > 1 || partners.length > 1) {
    throw new MiniAppIdentityResolutionError();
  }

  const workspaces: MiniAppWorkspace[] = [];
  const manager = staff[0] ? managerWorkspace(staff[0]) : null;
  if (manager) workspaces.push(manager);
  if (customers[0]) workspaces.push(customerWorkspace(customers[0]));
  if (partners[0]) workspaces.push(partnerWorkspace(partners[0]));
  if (!workspaces.length) return null;

  // Preserve v345 launch behavior: managerial access wins when present; otherwise
  // Customer remains the stable default before Partner. Additional relationships
  // are exposed as workspaces for the Stage 4 switcher without breaking old clients.
  const selected = workspaces[0];
  if (selected.kind === "manager") {
    return {
      kind: "staff",
      subjectId: selected.subjectId,
      displayName: selected.displayName,
      telegramUserId,
      roleName: selected.roleName || undefined,
      capabilities: [...selected.capabilities],
      permissions: [...selected.permissions],
      workspaces,
    };
  }
  return {
    kind: selected.kind,
    subjectId: selected.subjectId,
    displayName: selected.displayName,
    telegramUserId,
    capabilities: [...selected.capabilities],
    permissions: [],
    workspaces,
  };
};
