import { getLocalTenantIdentity } from "../../connectivity/localTenantIdentity";
import {
  MANAGEMENT_PERMISSION_LABELS,
  MANAGEMENT_PERMISSIONS,
  SYSTEM_ACCESS_ROLE_PRESETS,
} from "../../security/managementAccessPolicy";
import { allTypedAsync, getTypedAsync, runAsync } from "../query";
import { syncLegacyUserAccessGrant } from "../domains/accessControl.db";

type UserRoleRow = { id: number; roleName: string };

export const seedAccessControlFoundation = async (): Promise<void> => {
  const { tenantId } = await getLocalTenantIdentity();

  await runAsync("BEGIN IMMEDIATE");
  try {
    for (const permission of MANAGEMENT_PERMISSIONS) {
      await runAsync(
        `INSERT INTO access_permissions(permission_key,name) VALUES(?,?)
         ON CONFLICT(permission_key) DO UPDATE SET name=excluded.name`,
        [permission, MANAGEMENT_PERMISSION_LABELS[permission]],
      );
    }

    for (const preset of SYSTEM_ACCESS_ROLE_PRESETS) {
      await runAsync(
        `INSERT INTO access_roles(tenant_id,role_key,name,is_system) VALUES(?,?,?,1)
         ON CONFLICT(tenant_id,role_key) DO UPDATE SET name=excluded.name,is_system=1,updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')`,
        [tenantId, preset.key, preset.name],
      );
      const role = await getTypedAsync<{ id: number }>(
        "SELECT id FROM access_roles WHERE tenant_id=? AND role_key=? LIMIT 1",
        [tenantId, preset.key],
      );
      if (!role) throw new Error(`ACCESS_ROLE_SEED_FAILED:${preset.key}`);
      await runAsync("DELETE FROM access_role_permissions WHERE role_id=?", [role.id]);
      for (const permission of preset.permissions) {
        await runAsync(
          "INSERT INTO access_role_permissions(role_id,permission_key) VALUES(?,?)",
          [role.id, permission],
        );
      }
    }

    const marker = await getTypedAsync<{ value?: string }>(
      "SELECT value FROM settings WHERE key='access_control_legacy_backfill_v1' LIMIT 1",
    );
    if (marker?.value !== "1") {
      const users = await allTypedAsync<UserRoleRow>(
        `SELECT u.id,r.name AS roleName FROM users u JOIN roles r ON r.id=u.roleId ORDER BY u.id ASC`,
      );
      for (const user of users) await syncLegacyUserAccessGrant(user.id, user.roleName);
      await runAsync(
        `INSERT INTO settings(key,value) VALUES('access_control_legacy_backfill_v1','1')
         ON CONFLICT(key) DO UPDATE SET value='1'`,
      );
    }

    await runAsync("COMMIT");
  } catch (error) {
    await runAsync("ROLLBACK").catch(() => undefined);
    throw error;
  }
};
