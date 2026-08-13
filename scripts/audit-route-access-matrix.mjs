import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifestPath = path.join(root, 'app/routes/routeManifest.tsx');
const matrixPath = path.join(root, 'docs/access/route-access-matrix.json');

const manifest = fs.readFileSync(manifestPath, 'utf8');
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

const unique = (items) => [...new Set(items)];
const countByValue = (items) => items.reduce((acc, item) => {
  acc[item] = (acc[item] ?? 0) + 1;
  return acc;
}, {});

const routeLiteralPattern = /\broute\(\s*(['"])(.*?)\1/g;
const manifestRoutePaths = [];
let match;
while ((match = routeLiteralPattern.exec(manifest)) !== null) {
  manifestRoutePaths.push(match[2]);
}
const indexRouteCount = (manifest.match(/\bindexRoute\(/g) ?? []).length;
for (let index = 0; index < indexRouteCount; index += 1) manifestRoutePaths.push('(index)');

const matrixRecordCount = matrix.length;
const matrixManifestPaths = matrix.map((entry) => entry.manifestPath);
const manifestCounts = countByValue(manifestRoutePaths);
const matrixCounts = countByValue(matrixManifestPaths);
const countMismatches = unique([...manifestRoutePaths, ...matrixManifestPaths])
  .filter((routePath) => (manifestCounts[routePath] ?? 0) !== (matrixCounts[routePath] ?? 0));

const matrixKeys = matrix.map((entry) => entry.routeKey);
const duplicateKeys = unique(matrixKeys.filter((key, index) => matrixKeys.indexOf(key) !== index));
const invalidEntries = matrix.filter((entry) => {
  if (!entry.routeKey || !entry.manifestPath || !entry.effectivePath || !entry.access) return true;
  if (!Array.isArray(entry.allowedRoles) || !Array.isArray(entry.featureFlags)) return true;
  if (!['public', 'authenticated', 'role-protected'].includes(entry.access)) return true;
  if (entry.access === 'role-protected' && entry.allowedRoles.length === 0) return true;
  return false;
});

const requiredFeatureFlags = [
  'advanced_reports',
  'audit_log',
  'cash_sales',
  'installments',
  'mobile_phones',
  'notifications_outbox',
  'purchases_stock_counts',
  'repairs_services',
  'smart_insights',
];

const matrixFeatureFlags = unique(matrix.flatMap((entry) => entry.featureFlags));
const missingFeatureFlags = requiredFeatureFlags.filter((flag) => !matrixFeatureFlags.includes(flag));

const problems = [];
if (manifestRoutePaths.length !== matrixRecordCount) {
  problems.push(`Route record count mismatch: manifest=${manifestRoutePaths.length}, matrix=${matrixRecordCount}`);
}
if (countMismatches.length > 0) {
  problems.push(`Route manifest path mismatches: ${countMismatches.map((routePath) => `${routePath} manifest=${manifestCounts[routePath] ?? 0} matrix=${matrixCounts[routePath] ?? 0}`).join('; ')}`);
}
if (duplicateKeys.length > 0) {
  problems.push(`Duplicate route matrix keys: ${duplicateKeys.join(', ')}`);
}
if (invalidEntries.length > 0) {
  problems.push(`Invalid matrix entries: ${invalidEntries.map((entry) => entry.routeKey).join(', ')}`);
}
if (missingFeatureFlags.length > 0) {
  problems.push(`Missing documented feature flags: ${missingFeatureFlags.join(', ')}`);
}

if (problems.length > 0) {
  console.error('Route access matrix audit failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Route access matrix audit passed: ${matrixRecordCount} records documented and aligned with routeManifest.tsx.`);
