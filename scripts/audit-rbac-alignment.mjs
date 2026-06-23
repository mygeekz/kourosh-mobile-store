import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const rbacPath = path.join(root, 'utils/rbac.ts');
const matrixPath = path.join(root, 'docs/access/route-access-matrix.json');

const rbac = fs.readFileSync(rbacPath, 'utf8');
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

const problems = [];

if (!rbac.includes("from '../app/routes/routeAccessMatrix'")) {
  problems.push('utils/rbac.ts must import routeAccessMatrix as the route-policy source of truth.');
}

if (/\bconst\s+PATH_RULES\b|\bPATH_RULES\s*[:=]/.test(rbac)) {
  problems.push('utils/rbac.ts still declares local PATH_RULES; RBAC must derive route access from routeAccessMatrix.');
}

for (const requiredExport of [
  'normalizeAppPath',
  'getRouteAccessEntryForPath',
  'canAccessPath',
  'filterNavItemsByRole',
]) {
  if (!new RegExp(`export\\s+function\\s+${requiredExport}\\b`).test(rbac)) {
    problems.push(`Missing RBAC helper export: ${requiredExport}.`);
  }
}

if (!/export\s+const\s+rbacAccessPolicySource\b/.test(rbac)) {
  problems.push('Missing rbacAccessPolicySource export for audit/debug visibility.');
}

const protectedEntries = matrix.filter((entry) => entry.access === 'role-protected');
const protectedWithoutRoles = protectedEntries.filter((entry) => !Array.isArray(entry.allowedRoles) || entry.allowedRoles.length === 0);
if (protectedWithoutRoles.length > 0) {
  problems.push(`Role-protected matrix entries without roles: ${protectedWithoutRoles.map((entry) => entry.routeKey).join(', ')}`);
}

const exactDuplicatePaths = matrix
  .filter((entry) => entry.effectivePath !== '*')
  .reduce((acc, entry) => {
    acc[entry.effectivePath] = acc[entry.effectivePath] ?? [];
    acc[entry.effectivePath].push(entry.routeKey);
    return acc;
  }, {});
const duplicateProtectedPolicies = Object.entries(exactDuplicatePaths)
  .filter(([, keys]) => keys.length > 1)
  .filter(([, keys]) => {
    const entries = keys.map((key) => matrix.find((entry) => entry.routeKey === key));
    const signatures = new Set(entries.map((entry) => `${entry.access}:${(entry.allowedRoles ?? []).join('|')}`));
    return signatures.size > 1;
  });
if (duplicateProtectedPolicies.length > 0) {
  problems.push(`Duplicate effective paths with conflicting access policies: ${duplicateProtectedPolicies.map(([routePath]) => routePath).join(', ')}`);
}

if (problems.length > 0) {
  console.error('RBAC alignment audit failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`RBAC alignment audit passed: utils/rbac.ts derives route access from ${matrix.length} documented route matrix records.`);
