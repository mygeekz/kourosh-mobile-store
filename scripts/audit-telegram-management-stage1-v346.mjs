import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");

const schema = read("server/db/schema/accessControl.schema.ts");
for (const table of [
  "access_permissions",
  "tenant_memberships",
  "access_roles",
  "access_role_permissions",
  "tenant_membership_roles",
]) assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
assert.match(schema, /grant_source IN \('manual','legacy_role','system'\)/);
assert.match(schema, /ACCESS_ROLE_TENANT_MISMATCH/);

const policy = read("server/security/managementAccessPolicy.ts");
for (const permission of [
  "dashboard.read",
  "customers.read",
  "customers.ledger.read",
  "partners.read",
  "partners.ledger.read",
  "sales.read",
  "profits.read",
  "installments.read",
  "repairs.read",
  "inventory.read",
  "reports.read",
  "notifications.manage",
  "managers.manage",
]) assert.match(policy, new RegExp(permission.replaceAll(".", "\\.")));
for (const role of ["full_manager", "finance_manager", "sales_manager", "viewer"])
  assert.match(policy, new RegExp(role));

const init = read("server/db/core/initRuntime.ts");
assert.match(init, /await createAuthSettingsServicesSchema\(\);[\s\S]*await createAccessControlSchema\(\);/);
assert.match(init, /await ensureDefaultBusinessSettings\(\);[\s\S]*await seedAccessControlFoundation\(\);/);

const accessSeed = read("server/db/seeds/accessControl.seed.ts");
assert.match(accessSeed, /BEGIN IMMEDIATE[\s\S]*MANAGEMENT_PERMISSIONS[\s\S]*SYSTEM_ACCESS_ROLE_PRESETS[\s\S]*COMMIT/);
assert.match(accessSeed, /ROLLBACK/);

const authDb = read("server/db/domains/auth.db.ts");
assert.match(authDb, /syncLegacyUserAccessGrant\(result\.lastID/);
assert.match(authDb, /syncLegacyUserAccessGrant\(userId/);
assert.match(authDb, /BEGIN IMMEDIATE[\s\S]*syncLegacyUserAccessGrant\(result\.lastID[\s\S]*COMMIT/);
assert.match(authDb, /requestedLegacyRoleName[\s\S]*BEGIN IMMEDIATE[\s\S]*syncLegacyUserAccessGrant\(userId[\s\S]*COMMIT/);
const setup = read("server/auth/initialSetup.ts");
assert.match(setup, /syncLegacyUserAccessGrant\(Number\(result\.lastID\), ADMIN_ROLE_NAME\)/);

const accessDb = read("server/db/domains/accessControl.db.ts");
assert.match(accessDb, /grant_source='legacy_role'/);
assert.match(accessDb, /grant_source='manual'/);
assert.match(accessDb, /resolveUserTenantAuthorization/);
assert.match(accessDb, /SYSTEM_ACCESS_ROLE_IMMUTABLE/);
assert.match(accessDb, /isManagementPermission/);
assert.match(accessDb, /ACCESS_PERMISSION_INVALID/);
assert.match(accessDb, /permissions\.map\(\(row\) => row\.permissionKey\)\.filter\(isManagementPermission\)/);

const resolver = read("server/miniapp/miniAppIdentityResolver.ts");
assert.match(resolver, /kind: "manager"/);
assert.match(resolver, /workspaces/);
assert.doesNotMatch(resolver, /customers\.length\s*&&\s*partners\.length/);
assert.match(resolver, /hasAnyManagementPermission/);

const session = read("server/miniapp/miniAppSession.ts");
assert.match(session, /MiniAppWorkspaceKind = "customer" \| "partner" \| "manager"/);
assert.match(session, /workspaces\?: MiniAppWorkspace\[\]/);

const routes = read("server/routes/miniapp.routes.ts");
assert.match(routes, /miniAppIdentityHasCapability\(req\.miniAppIdentity, capability\)/);
assert.match(routes, /resolveMiniAppStaffCapabilitiesFromPermissions/);
assert.match(routes, /requireStaffPermissions\(\["dashboard\.read", "sales\.read", "profits\.read", "customers\.ledger\.read", "installments\.read", "inventory\.read"\]\)/);
assert.match(routes, /requireStaffPermissions\(\["sales\.read", "profits\.read"\]\)/);


const staffPolicy = read("server/security/miniAppStaffAccessPolicy.ts");
assert.match(staffPolicy, /"customers\.ledger\.read": \["staff:customer_lookup:read"\]/);

const staffSecurity = read("server/services/telegramIdentitySecurity.service.ts");
assert.match(staffSecurity, /resolveUserTenantAuthorization/);
assert.match(staffSecurity, /hasAnyManagementPermission/);
assert.match(staffSecurity, /ACCESS_CONTROL_SCHEMA_UNAVAILABLE/);

const edge = read("deployment/cloudflare-pages/_worker.js");
assert.match(edge, /MANAGEMENT_PERMISSION_KEYS/);
assert.match(edge, /hasManagementPermission/);
assert.match(edge, /identity\.workspaces/);

const telegramSchema = read("server/db/schema/telegramIdentity.schema.ts");
assert.match(telegramSchema, /user_telegram_links/);
assert.match(telegramSchema, /partners ADD COLUMN telegram_user_id/);
assert.match(telegramSchema, /idx_customers_telegram_user_unique/);

console.log("Telegram Management Center Stage 1 v346 source audit passed");
