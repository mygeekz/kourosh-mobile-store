#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.resolve(root, file), 'utf8');
const walk = (relativeDirectory) => fs.readdirSync(path.resolve(root, relativeDirectory), { withFileTypes: true })
  .flatMap((entry) => {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return entry.name === 'tests' ? [] : walk(relativePath);
    return entry.name.endsWith('.ts') ? [relativePath] : [];
  });

const serverFiles = walk('server').sort();
const routeFile = 'server/routes/smartInsightReport.routes.ts';
const routeSource = read(routeFile);
const appSource = read('server/app.ts');
const registrarSource = read('server/routes/coreBusinessRouteMicroRegistrars.ts');
const adapterSource = read('server/routes/coreBusinessRouteAdapters.ts');
const coreSource = read('server/intelligence/smartInsights/smartInsightCore.service.ts');

const exactPathLiteral = /["']\/api\/reports\/smart-insights["']/g;
const pathReferences = serverFiles.filter((file) => (
  (read(file).match(/["']\/api\/reports\/smart-insights["']/g) ?? []).length > 0
));
const registrationOwners = serverFiles.filter((file) => (
  file === routeFile
    && /app\.get\(\s*SMART_INSIGHT_REPORT_PATH/.test(read(file))
));
assert.deepEqual(registrationOwners, [routeFile], 'The Smart Insight endpoint must have one registration owner.');
assert.deepEqual(
  pathReferences,
  ['server/commercialModuleFlags.ts', routeFile],
  'Only the commercial feature rule and canonical route may reference the exact Smart Insight path.',
);
assert.equal((routeSource.match(exactPathLiteral) ?? []).length, 1);
assert.doesNotMatch(appSource, /\/api\/reports\/smart-insights/);

assert.match(routeSource, /export const SMART_INSIGHT_REPORT_PATH = "\/api\/reports\/smart-insights"/);
assert.match(routeSource, /export const SMART_INSIGHT_REPORT_ROLES = \[/);
for (const role of ['Admin', 'Manager', 'Salesperson', 'Marketer']) {
  assert.match(routeSource, new RegExp(`"${role}"`), `Missing preserved role: ${role}`);
}
assert.match(routeSource, /app\.get\(\s*SMART_INSIGHT_REPORT_PATH/);
assert.match(routeSource, /authorizeRole\(\[\.\.\.SMART_INSIGHT_REPORT_ROLES\]\)/);

assert.equal((registrarSource.match(/registerSmartInsightReportRoutes\(app,/g) ?? []).length, 1);
assert.match(registrarSource, /createSmartInsightReportRoutesDeps\(deps\)/);
assert.match(adapterSource, /export function createSmartInsightReportRoutesDeps/);
for (const dependency of [
  'buildProductSalesCollectionsReport',
  'buildProductSalesCollectionRisk',
  'enrichCollectionCenterItems',
]) {
  assert.match(adapterSource, new RegExp(dependency));
}

for (const queryContract of [
  'req.query.fromDate',
  'req.query.from',
  'req.query.toDate',
  'req.query.to',
  'req.query.resetAt',
]) {
  assert.ok(routeSource.includes(queryContract), `Query compatibility is missing: ${queryContract}`);
}
assert.match(routeSource, /status\(400\)[\s\S]*message: "بازه زمانی نامعتبر است\."/);
assert.match(routeSource, /res\.json\(\{ success: true, data \}\)/);
assert.match(routeSource, /catch \(err\) \{\s*next\(err\);/);
assert.doesNotMatch(routeSource, /status\(500\)/, 'Errors must remain delegated to the shared error boundary.');

for (const helper of [
  'SMART_INSIGHT_CURRENCY_BASE',
  'SMART_INSIGHT_DISPLAY_CURRENCY',
  'smartInsightPercent',
  'smartInsightShamsi',
  'smartInsightSeverityFromScore',
]) {
  assert.match(coreSource, new RegExp(`\\b${helper}\\b`), `Smart Insight helper export is missing: ${helper}`);
}

const expressMethodCallSites = serverFiles.reduce(
  (count, file) => count + (read(file).match(/\bapp\.(?:get|post|put|patch|delete)\s*\(/g) ?? []).length,
  0,
);

console.log(JSON.stringify({
  status: 'passed',
  exactPathOwner: routeFile,
  registrationOwnerCount: registrationOwners.length,
  pathReferenceCount: pathReferences.length,
  directRouteInServerApp: 0,
  registrarCallCount: 1,
  preservedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'],
  observedExpressMethodCallSites: expressMethodCallSites,
  behaviorContract: 'preserved',
}, null, 2));
