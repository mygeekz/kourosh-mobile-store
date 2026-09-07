import type { ManagementPermission } from "./managementAccessPolicy";

export const MINI_APP_STAFF_CAPABILITIES = [
  "staff:executive:read",
  "staff:sales_summary:read",
  "staff:customer_lookup:read",
  "staff:inventory_lookup:read",
  "staff:installments:read",
  "staff:invoice_lookup:read",
] as const;

export type MiniAppStaffCapability = (typeof MINI_APP_STAFF_CAPABILITIES)[number];
export type MiniAppStaffRole = "Admin" | "Manager";

const ROLE_CAPABILITIES: Readonly<Record<MiniAppStaffRole, readonly MiniAppStaffCapability[]>> = {
  Admin: MINI_APP_STAFF_CAPABILITIES,
  Manager: MINI_APP_STAFF_CAPABILITIES,
};

const PERMISSION_CAPABILITY_MAP: Readonly<Partial<Record<ManagementPermission, readonly MiniAppStaffCapability[]>>> = {
  "dashboard.read": ["staff:executive:read"],
  "customers.ledger.read": ["staff:customer_lookup:read"],
  "sales.read": ["staff:sales_summary:read", "staff:invoice_lookup:read"],
  "inventory.read": ["staff:inventory_lookup:read"],
  "installments.read": ["staff:installments:read"],
};

export const isMiniAppStaffRole = (role: unknown): role is MiniAppStaffRole =>
  role === "Admin" || role === "Manager";

/** Legacy compatibility only. New authorization should use tenant permissions. */
export const resolveMiniAppStaffCapabilities = (
  role: unknown,
): readonly MiniAppStaffCapability[] =>
  isMiniAppStaffRole(role) ? ROLE_CAPABILITIES[role] : [];

export const resolveMiniAppStaffCapabilitiesFromPermissions = (
  permissions: readonly string[],
): MiniAppStaffCapability[] => {
  const result = new Set<MiniAppStaffCapability>();
  for (const permission of permissions) {
    const mapped = PERMISSION_CAPABILITY_MAP[permission as ManagementPermission] || [];
    for (const capability of mapped) result.add(capability);
  }
  return MINI_APP_STAFF_CAPABILITIES.filter((capability) => result.has(capability));
};

export const miniAppStaffRoleHasCapability = (
  role: unknown,
  capability: MiniAppStaffCapability,
): boolean => resolveMiniAppStaffCapabilities(role).includes(capability);

export const miniAppIdentityHasCapability = (
  identity: { capabilities?: readonly string[] } | null | undefined,
  capability: MiniAppStaffCapability,
): boolean => Boolean(identity?.capabilities?.includes(capability));

export const MINI_APP_STAFF_ACCESS_MATRIX = ROLE_CAPABILITIES;
