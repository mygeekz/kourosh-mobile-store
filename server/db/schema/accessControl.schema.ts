import { runAsync } from "../query";

/**
 * Tenant-scoped access control foundation.
 * Existing users/roles remain intact for PWA backward compatibility.
 */
export const createAccessControlSchema = async (): Promise<void> => {
  await runAsync(`CREATE TABLE IF NOT EXISTS access_permissions (
    permission_key TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'))
  )`);

  await runAsync(`CREATE TABLE IF NOT EXISTS tenant_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','revoked')),
    created_by_user_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    UNIQUE(tenant_id,user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  )`);
  await runAsync("CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user ON tenant_memberships(user_id,status)");

  await runAsync(`CREATE TABLE IF NOT EXISTS access_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    role_key TEXT NOT NULL,
    name TEXT NOT NULL,
    is_system INTEGER NOT NULL DEFAULT 0 CHECK(is_system IN (0,1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    UNIQUE(tenant_id,role_key)
  )`);
  await runAsync("CREATE INDEX IF NOT EXISTS idx_access_roles_tenant ON access_roles(tenant_id,is_system)");

  await runAsync(`CREATE TABLE IF NOT EXISTS access_role_permissions (
    role_id INTEGER NOT NULL,
    permission_key TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    PRIMARY KEY(role_id,permission_key),
    FOREIGN KEY (role_id) REFERENCES access_roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_key) REFERENCES access_permissions(permission_key) ON DELETE RESTRICT
  )`);

  await runAsync(`CREATE TABLE IF NOT EXISTS tenant_membership_roles (
    membership_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    grant_source TEXT NOT NULL DEFAULT 'manual' CHECK(grant_source IN ('manual','legacy_role','system')),
    granted_by_user_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    PRIMARY KEY(membership_id,role_id,grant_source),
    FOREIGN KEY (membership_id) REFERENCES tenant_memberships(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES access_roles(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  )`);
  await runAsync("CREATE INDEX IF NOT EXISTS idx_membership_roles_role ON tenant_membership_roles(role_id,membership_id)");

  await runAsync(`CREATE TRIGGER IF NOT EXISTS trg_membership_role_tenant_insert
    BEFORE INSERT ON tenant_membership_roles
    BEGIN
      SELECT CASE WHEN (
        SELECT m.tenant_id FROM tenant_memberships m WHERE m.id=NEW.membership_id
      ) != (
        SELECT r.tenant_id FROM access_roles r WHERE r.id=NEW.role_id
      ) THEN RAISE(ABORT,'ACCESS_ROLE_TENANT_MISMATCH') END;
    END`);

  await runAsync(`CREATE TRIGGER IF NOT EXISTS trg_membership_role_tenant_update
    BEFORE UPDATE OF membership_id,role_id ON tenant_membership_roles
    BEGIN
      SELECT CASE WHEN (
        SELECT m.tenant_id FROM tenant_memberships m WHERE m.id=NEW.membership_id
      ) != (
        SELECT r.tenant_id FROM access_roles r WHERE r.id=NEW.role_id
      ) THEN RAISE(ABORT,'ACCESS_ROLE_TENANT_MISMATCH') END;
    END`);
};
