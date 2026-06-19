import fs from 'node:fs';
import assert from 'node:assert/strict';

const server = fs.readFileSync('server/index.ts', 'utf8');
const smartCenter = fs.readFileSync('pages/reports/SmartInsightCenter.tsx', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

assert.match(server, /\/api\/brain\/predictive/, 'Predictive Engine API route must exist.');
assert.match(server, /tomorrowSalesForecast/, 'Predictive Engine must forecast tomorrow sales.');
assert.match(server, /next7SalesForecast/, 'Predictive Engine must forecast next 7 days sales.');
assert.match(server, /daysToStockout/, 'Predictive Engine must calculate stockout risk.');
assert.match(server, /dueSoonAmount/, 'Predictive Engine must calculate collection pressure.');
assert.match(smartCenter, /\/api\/brain\/predictive/, 'Smart Insight Center must consume predictive endpoint.');
assert.match(smartCenter, /PREDICTIVE ENGINE/, 'Smart Insight Center must render Predictive Engine card.');
assert.equal(pkg.scripts['test:predictive-engine'], 'node server/tests/predictiveEngineGuard.test.mjs');

console.log('Predictive Engine guard passed.');
