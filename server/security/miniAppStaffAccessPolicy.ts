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

export const isMiniAppStaffRole = (role: unknown): role is MiniAppStaffRole =>
  role === "Admin" || role === "Manager";

export const resolveMiniAppStaffCapabilities = (
  role: unknown,
): readonly MiniAppStaffCapability[] =>
  isMiniAppStaffRole(role) ? ROLE_CAPABILITIES[role] : [];

export const miniAppStaffRoleHasCapability = (
  role: unknown,
  capability: MiniAppStaffCapability,
): boolean => resolveMiniAppStaffCapabilities(role).includes(capability);

export const MINI_APP_STAFF_ACCESS_MATRIX = ROLE_CAPABILITIES;
