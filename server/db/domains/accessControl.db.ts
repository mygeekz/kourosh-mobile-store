import crypto from "node:crypto";
import { getLocalTenantIdentity } from "../../connectivity/localTenantIdentity";
import { isManagementPermission, type ManagementPermission } from "../../security/managementAccessPolicy";
import { revokeMiniAppStaffSessions } from "../../miniapp/miniAppSession";
import { allTypedAsync, getTypedAsync, runAsync } from "../query";

type MembershipRow = { id: number; tenantId: string; userId: number; status: "active" | "suspended" | "revoked" };
type RoleRow = { id: number; roleKey: string; name: string };
type PermissionRow = { permissionKey: string };

const requestManagerSnapshotRefresh = (): void => {
  void import("../../cloud/snapshots/miniAppSnapshotRuntime")
    .then(({ requestMiniAppSnapshotRefresh }) => requestMiniAppSnapshotRefresh(0))
    .catch(() => undefined);
};


const assertAccessControlSchemaAvailable = async (): Promise<void> => {
  const row = await getTypedAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='tenant_memberships' LIMIT 1",
  );
  if (!row) throw new Error("ACCESS_CONTROL_SCHEMA_UNAVAILABLE");
};
export type TenantUserAuthorization = {
  tenantId: string;
  membershipId: number;
  userId: number;
  status: "active" | "suspended" | "revoked";
  roles: Array<{ id: number; key: string; name: string }>;
  permissions: ManagementPermission[];
};

export const ensureTenantMembershipForUser = async (
  userId: number,
  createdByUserId: number | null = null,
): Promise<MembershipRow> => {
  const { tenantId } = await getLocalTenantIdentity();
  await runAsync(
    `INSERT INTO tenant_memberships(tenant_id,user_id,status,created_by_user_id)
     VALUES(?,?,'active',?)
     ON CONFLICT(tenant_id,user_id) DO NOTHING`,
    [tenantId, userId, createdByUserId],
  );
  const row = await getTypedAsync<MembershipRow>(
    `SELECT id,tenant_id AS tenantId,user_id AS userId,status
     FROM tenant_memberships WHERE tenant_id=? AND user_id=? LIMIT 1`,
    [tenantId, userId],
  );
  if (!row) throw new Error("TENANT_MEMBERSHIP_CREATE_FAILED");
  return row;
};

export const syncLegacyUserAccessGrant = async (
  userId: number,
  legacyRoleName?: string | null,
): Promise<void> => {
  const membership = await ensureTenantMembershipForUser(userId);
  const { tenantId } = membership;
  const fullRole = await getTypedAsync<{ id: number }>(
    "SELECT id FROM access_roles WHERE tenant_id=? AND role_key='full_manager' LIMIT 1",
    [tenantId],
  );
  if (!fullRole) return;
  await runAsync(
    "DELETE FROM tenant_membership_roles WHERE membership_id=? AND grant_source='legacy_role'",
    [membership.id],
  );
  if (legacyRoleName === "Admin" || legacyRoleName === "Manager") {
    await runAsync(
      `INSERT OR IGNORE INTO tenant_membership_roles(membership_id,role_id,grant_source)
       VALUES(?,?,'legacy_role')`,
      [membership.id, fullRole.id],
    );
  }
};

export const resolveUserTenantAuthorization = async (
  userId: number,
): Promise<TenantUserAuthorization | null> => {
  await assertAccessControlSchemaAvailable();
  const { tenantId } = await getLocalTenantIdentity();
  const membership = await getTypedAsync<MembershipRow>(
    `SELECT id,tenant_id AS tenantId,user_id AS userId,status
     FROM tenant_memberships WHERE tenant_id=? AND user_id=? LIMIT 1`,
    [tenantId, userId],
  );
  if (!membership || membership.status !== "active") return null;

  const roles = await allTypedAsync<RoleRow>(
    `SELECT DISTINCT r.id,r.role_key AS roleKey,r.name
     FROM tenant_membership_roles mr
     JOIN access_roles r ON r.id=mr.role_id
     WHERE mr.membership_id=? AND r.tenant_id=?
     ORDER BY r.is_system DESC,r.id ASC`,
    [membership.id, tenantId],
  );
  const permissions = await allTypedAsync<PermissionRow>(
    `SELECT DISTINCT rp.permission_key AS permissionKey
     FROM tenant_membership_roles mr
     JOIN access_roles r ON r.id=mr.role_id AND r.tenant_id=?
     JOIN access_role_permissions rp ON rp.role_id=r.id
     WHERE mr.membership_id=?
     ORDER BY rp.permission_key ASC`,
    [tenantId, membership.id],
  );
  return {
    tenantId,
    membershipId: membership.id,
    userId,
    status: membership.status,
    roles: roles.map((role) => ({ id: role.id, key: role.roleKey, name: role.name })),
    permissions: permissions.map((row) => row.permissionKey).filter(isManagementPermission),
  };
};

export const userHasManagementPermission = async (
  userId: number,
  permission: ManagementPermission,
): Promise<boolean> => {
  const authorization = await resolveUserTenantAuthorization(userId);
  return Boolean(authorization?.permissions.includes(permission));
};

export type TenantAccessRole = {
  id: number;
  key: string;
  name: string;
  isSystem: boolean;
  permissions: ManagementPermission[];
};

export const listTenantAccessRoles = async (): Promise<TenantAccessRole[]> => {
  const { tenantId } = await getLocalTenantIdentity();
  const rows = await allTypedAsync<{
    id: number;
    roleKey: string;
    name: string;
    isSystem: number;
    permissionKey?: string | null;
  }>(
    `SELECT r.id,r.role_key AS roleKey,r.name,r.is_system AS isSystem,rp.permission_key AS permissionKey
     FROM access_roles r
     LEFT JOIN access_role_permissions rp ON rp.role_id=r.id
     WHERE r.tenant_id=?
     ORDER BY r.is_system DESC,r.id ASC,rp.permission_key ASC`,
    [tenantId],
  );
  const byId = new Map<number, TenantAccessRole>();
  for (const row of rows) {
    const current = byId.get(row.id) || {
      id: row.id,
      key: row.roleKey,
      name: row.name,
      isSystem: Boolean(row.isSystem),
      permissions: [],
    };
    if (row.permissionKey && isManagementPermission(row.permissionKey)) current.permissions.push(row.permissionKey);
    byId.set(row.id, current);
  }
  return [...byId.values()];
};

const normalizePermissionSet = (permissions: readonly unknown[]): ManagementPermission[] => {
  const normalized: ManagementPermission[] = [];
  for (const permission of permissions) {
    if (!isManagementPermission(permission)) throw new Error("ACCESS_PERMISSION_INVALID");
    normalized.push(permission);
  }
  return [...new Set(normalized)].sort();
};

export const createCustomAccessRole = async (
  name: string,
  permissions: readonly ManagementPermission[],
): Promise<TenantAccessRole> => {
  const normalizedName = String(name || "").trim();
  if (normalizedName.length < 2 || normalizedName.length > 80) throw new Error("ACCESS_ROLE_NAME_INVALID");
  const normalizedPermissions = normalizePermissionSet(permissions);
  const { tenantId } = await getLocalTenantIdentity();
  const roleKey = `custom_${crypto.randomBytes(12).toString("base64url")}`;
  await runAsync("BEGIN IMMEDIATE");
  try {
    const inserted = await runAsync(
      "INSERT INTO access_roles(tenant_id,role_key,name,is_system) VALUES(?,?,?,0)",
      [tenantId, roleKey, normalizedName],
    );
    for (const permission of normalizedPermissions) {
      await runAsync(
        "INSERT INTO access_role_permissions(role_id,permission_key) VALUES(?,?)",
        [inserted.lastID, permission],
      );
    }
    await runAsync("COMMIT");
    return {
      id: inserted.lastID,
      key: roleKey,
      name: normalizedName,
      isSystem: false,
      permissions: normalizedPermissions,
    };
  } catch (error) {
    await runAsync("ROLLBACK").catch(() => undefined);
    throw error;
  }
};

export const replaceCustomAccessRolePermissions = async (
  roleId: number,
  permissions: readonly ManagementPermission[],
): Promise<boolean> => {
  const { tenantId } = await getLocalTenantIdentity();
  const role = await getTypedAsync<{ id: number; isSystem: number }>(
    "SELECT id,is_system AS isSystem FROM access_roles WHERE id=? AND tenant_id=? LIMIT 1",
    [roleId, tenantId],
  );
  if (!role) return false;
  if (role.isSystem) throw new Error("SYSTEM_ACCESS_ROLE_IMMUTABLE");
  const normalizedPermissions = normalizePermissionSet(permissions);
  const affectedUsers = await allTypedAsync<{ userId: number }>(
    `SELECT DISTINCT m.user_id AS userId
       FROM tenant_membership_roles mr
       JOIN tenant_memberships m ON m.id=mr.membership_id
      WHERE mr.role_id=? AND m.tenant_id=?`,
    [roleId, tenantId],
  );
  await runAsync("BEGIN IMMEDIATE");
  try {
    await runAsync("DELETE FROM access_role_permissions WHERE role_id=?", [roleId]);
    for (const permission of normalizedPermissions) {
      await runAsync(
        "INSERT INTO access_role_permissions(role_id,permission_key) VALUES(?,?)",
        [roleId, permission],
      );
    }
    await runAsync(
      "UPDATE access_roles SET updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?",
      [roleId],
    );
    await runAsync("COMMIT");
    for (const row of affectedUsers) revokeMiniAppStaffSessions(Number(row.userId));
    requestManagerSnapshotRefresh();
    return true;
  } catch (error) {
    await runAsync("ROLLBACK").catch(() => undefined);
    throw error;
  }
};

export const grantAccessRoleToUser = async (
  userId: number,
  roleId: number,
  grantedByUserId: number | null = null,
): Promise<boolean> => {
  const membership = await ensureTenantMembershipForUser(userId, grantedByUserId);
  const role = await getTypedAsync<{ id: number }>(
    "SELECT id FROM access_roles WHERE id=? AND tenant_id=? LIMIT 1",
    [roleId, membership.tenantId],
  );
  if (!role) return false;
  const result = await runAsync(
    `INSERT OR IGNORE INTO tenant_membership_roles(membership_id,role_id,grant_source,granted_by_user_id)
     VALUES(?,?,'manual',?)`,
    [membership.id, roleId, grantedByUserId],
  );
  if (result.changes > 0) {
    revokeMiniAppStaffSessions(userId);
    requestManagerSnapshotRefresh();
  }
  return result.changes > 0;
};

export const revokeManualAccessRoleFromUser = async (
  userId: number,
  roleId: number,
): Promise<boolean> => {
  const { tenantId } = await getLocalTenantIdentity();
  const result = await runAsync(
    `DELETE FROM tenant_membership_roles
     WHERE grant_source='manual' AND role_id=? AND membership_id IN (
       SELECT id FROM tenant_memberships WHERE tenant_id=? AND user_id=?
     )`,
    [roleId, tenantId, userId],
  );
  if (result.changes > 0) {
    revokeMiniAppStaffSessions(userId);
    requestManagerSnapshotRefresh();
  }
  return result.changes > 0;
};

export const setTenantMembershipStatus = async (
  userId: number,
  status: "active" | "suspended" | "revoked",
): Promise<boolean> => {
  const { tenantId } = await getLocalTenantIdentity();
  const result = await runAsync(
    `UPDATE tenant_memberships
     SET status=?,updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')
     WHERE tenant_id=? AND user_id=?`,
    [status, tenantId, userId],
  );
  if (result.changes > 0) {
    revokeMiniAppStaffSessions(userId);
    requestManagerSnapshotRefresh();
  }
  return result.changes > 0;
};
