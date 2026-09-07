import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  createMiniAppIdentityResolver,
  MiniAppIdentityResolutionError,
  type MiniAppIdentityLookup,
} from "../miniapp/miniAppIdentityResolver";

const lookup = (
  customers: Array<{ id: number; displayName?: string }>,
  partners: Array<{ id: number; displayName?: string }>,
): MiniAppIdentityLookup => ({
  findCustomerIdentities: async () => customers,
  findPartnerIdentities: async () => partners,
});

const sameCustomerThroughCompatibilityColumns = await createMiniAppIdentityResolver(
  lookup([{ id: 17, displayName: "بهزاد" }, { id: 17, displayName: "بهزاد" }], []),
)("99200123");
assert.equal(sameCustomerThroughCompatibilityColumns?.subjectId, 17);

await assert.rejects(
  createMiniAppIdentityResolver(lookup([{ id: 17 }, { id: 18 }], []))("99200123"),
  (error: unknown) => error instanceof MiniAppIdentityResolutionError,
);

const multiRelationship = await createMiniAppIdentityResolver(
  lookup([{ id: 17, displayName: "مشتری" }], [{ id: 8, displayName: "همکار" }]),
)("99200123");
assert.equal(multiRelationship?.kind, "customer");
assert.deepEqual(multiRelationship?.workspaces?.map((workspace) => workspace.kind), ["customer", "partner"]);

const managerPartner = await createMiniAppIdentityResolver({
  ...lookup([], [{ id: 8, displayName: "همکار" }]),
  findStaffIdentities: async () => [{
    id: 3,
    displayName: "مدیر",
    roleName: "Salesperson",
    permissions: ["dashboard.read", "partners.read"],
  }],
})("99200123");
assert.equal(managerPartner?.kind, "staff");
assert.deepEqual(managerPartner?.workspaces?.map((workspace) => workspace.kind), ["manager", "partner"]);
assert.deepEqual(managerPartner?.permissions, ["dashboard.read", "partners.read"]);

const managerCustomer = await createMiniAppIdentityResolver({
  ...lookup([{ id: 17, displayName: "مشتری" }], []),
  findStaffIdentities: async () => [{
    id: 3,
    displayName: "مدیر",
    roleName: "Manager",
    permissions: ["dashboard.read", "customers.read"],
  }],
})("99200123");
assert.deepEqual(managerCustomer?.workspaces?.map((workspace) => workspace.kind), ["manager", "customer"]);

const routeSource = fs.readFileSync(
  path.join(process.cwd(), "server", "routes", "miniapp.routes.ts"),
  "utf8",
);
assert.doesNotMatch(routeSource, /customer\/:customerId/);
assert.match(routeSource, /customerIdFromSession\(req\)/);
assert.match(routeSource, /MINIAPP_RESOURCE_NOT_FOUND/);
assert.equal(fs.existsSync(path.join(process.cwd(), "miniapp", "styles.css")), false);
const miniAppEntrySource = fs.readFileSync(path.join(process.cwd(), "miniapp", "index.tsx"), "utf8");
assert.match(miniAppEntrySource, /import "\.\.\/styles\/themes\.css"/);
assert.match(miniAppEntrySource, /import "\.\/tailwind\.css"/);
assert.doesNotMatch(miniAppEntrySource, /index\.css|tailwind-entry\.generated\.css/);

const miniAppCss = fs.readFileSync(path.join(process.cwd(), "miniapp", "tailwind.css"), "utf8");
assert.match(miniAppCss, /@config "\.\.\/tailwind\.miniapp\.config\.cjs"/);
assert.match(miniAppCss, /@tailwind base/);
assert.match(miniAppCss, /@tailwind components/);
assert.match(miniAppCss, /@tailwind utilities/);
assert.doesNotMatch(miniAppCss, /@apply|[{}]/);

const themes = fs.readFileSync(path.join(process.cwd(), "styles", "themes.css"), "utf8");
for (const token of [
  "--palette-page-rgb", "--palette-text-rgb", "--palette-surface-rgb",
  "--palette-border-subtle-rgb", "--primary", "--success", "--warning", "--danger",
  "--radius-sm", "--radius-md", "--radius-lg",
]) assert.match(themes, new RegExp(token));

console.log("Mini App identity ambiguity unit checks and isolated Tailwind architecture acceptance checks passed.");
