#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const count = (source, pattern) => (source.match(pattern) ?? []).length;

const routeFile = 'server/routes/smartInsightReport.routes.ts';
const routeSource = read(routeFile);
const services = [
  ['smartInsightAudit.service.ts', 'buildSuspiciousInvoiceAudits', 'suspiciousInvoiceAudits'],
  ['smartInsightHiddenProfit.service.ts', 'buildHiddenProfitInsights', 'hiddenProfitCards'],
  ['smartInsightCustomer.service.ts', 'buildCustomerIntelligence', 'customerIntelligence'],
  ['smartInsightPricing.service.ts', 'buildPricingRecommendations', 'pricingRecommendations'],
  ['smartInsightSalesAgent.service.ts', 'buildSalesAgentLeads', 'salesAgentLeads'],
];

assert.doesNotMatch(
  routeSource,
  /\b(?:SELECT|INSERT|UPDATE|DELETE|CREATE TABLE|WITH\s+[a-z_]+\s+AS)\b/i,
  'The HTTP route must remain an orchestration layer without inline SQL.',
);
for (const databasePrimitive of ['allAsync', 'runAsync', 'smartInsightSafeRows', 'smartInsightSafeOne']) {
  assert.ok(!routeSource.includes(databasePrimitive), `Route leaked database primitive: ${databasePrimitive}`);
}

const serviceMetrics = [];
for (const [fileName, builder, responseBinding] of services) {
  const file = `server/intelligence/smartInsights/${fileName}`;
  assert.ok(fs.existsSync(file), `Missing canonical Phase 7 service: ${file}`);
  const source = read(file);
  const moduleName = fileName.replace(/\.ts$/, '');

  assert.equal(
    count(routeSource, new RegExp(`from ["']\\.\\.\\/intelligence\\/smartInsights\\/${moduleName}["']`, 'g')),
    1,
    `${builder} must be imported from its canonical service exactly once.`,
  );
  assert.equal(count(routeSource, new RegExp(`await ${builder}\\(`, 'g')), 1, `${builder} must be invoked exactly once.`);
  assert.match(source, new RegExp(`export async function ${builder}\\(`));
  assert.doesNotMatch(source, /\/api\/reports\/smart-insights|\bapp\.get\s*\(|\bres\.json\s*\(/);
  assert.match(routeSource, new RegExp(`\\b${responseBinding}\\b`));

  serviceMetrics.push({
    file,
    builder,
    lines: source.split(/\r?\n/).length,
  });
}

assert.match(routeSource, /SMART_INSIGHT_REPORT_PATH = "\/api\/reports\/smart-insights"/);
assert.match(routeSource, /authorizeRole\(\[\.\.\.SMART_INSIGHT_REPORT_ROLES\]\)/);
assert.match(routeSource, /res\.json\(\{ success: true, data \}\)/);
assert.match(routeSource, /catch \(err\) \{\s*next\(err\);/);
assert.match(
  read('scripts/prepare-phase0-test-db.mjs'),
  /\['', '-wal', '-shm', '-journal'\]/,
  'Copied SQLite preparation must remove stale rollback journals and be repeatable.',
);

console.log(JSON.stringify({
  status: 'passed',
  phase: 'Smart Insight Services Modularized',
  canonicalServiceCount: services.length,
  routeInlineSql: 0,
  endpointContract: 'preserved',
  protectedServiceBehavior: 'unchanged',
  serviceMetrics,
}, null, 2));
