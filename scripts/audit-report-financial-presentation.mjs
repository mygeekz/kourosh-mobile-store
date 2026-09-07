import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const reportPresentation = read('utils/reportPresentation.ts');
const managerProfit = read('utils/managerProfit.ts');
const collectionRoute = read('server/routes/collectionCenterReports.routes.ts');
const collectionHelpers = read('server/utils/collectionCenterHelpers.ts');
const installmentRows = read('server/reporting/mobileSalesAnalytics/mobileSalesAnalyticsInstallmentRows.service.ts');
const installmentQueries = read('server/reporting/mobileSalesAnalytics/mobileSalesAnalyticsInstallments.service.ts');
const turnover = read('pages/reports/InventoryTurnoverReport.tsx');
const smartInsightCore = read('server/intelligence/smartInsights/smartInsightCore.service.ts');

assert.match(reportPresentation, /REPORT_MONEY_RESOLUTION_TOMAN\s*=\s*1(?:\s*;)?/, 'Report money must preserve exact Toman presentation resolution.');
assert.match(reportPresentation, /maximumFractionDigits:\s*Math\.max\(0, maximumFractionDigits\)/, 'Report percentages/ratios must explicitly cap decimals.');
assert.match(reportPresentation, /\\u2068/, 'Report numeric text must use bidi isolation in RTL surfaces.');
assert.doesNotMatch(managerProfit, /Math\.round\(amount\s*\/\s*MANAGER_MONEY_RESOLUTION/, 'Manager calculations must not round before computing rates.');
assert.match(collectionRoute, /normalizeCollectionItemFinancials/, 'Collection center must normalize financial invariants.');
assert.match(collectionRoute, /Math\.max\(0, Math\.min\(100, \(receivedAmount \/ contractualTotal\) \* 100\)\)/, 'Collection rates must remain in the 0..100 domain.');
assert.match(collectionRoute, /financialSource/, 'Collection merge must preserve accounting fields when operational rows win priority.');
assert.match(collectionHelpers, /Math\.max\(0, unpaidInstallmentAmount, unpaidCheckAmount\)/, 'Installment and check schedules must not be summed as separate debt.');
assert.match(collectionHelpers, /Number\(row\.overdueInstallmentCount \|\| 0\),\s*Number\(row\.overdueCheckCount \|\| 0\)/s, 'Overdue schedule counts must use the authoritative maximum.');
assert.match(installmentQueries, /id AS checkId/, 'Check rows must expose stable ids for receipt de-duplication.');
assert.match(installmentRows, /sourceType.*check_recovery/s, 'Mobile analytics must de-duplicate check recovery receipts.');
assert.match(turnover, /formatReportRatioText\(data\.inventoryTurnover, 2\)/, 'Inventory turnover must present a bounded ratio.');
assert.match(turnover, /formatReportDaysText\(data\.daysOfInventory, 1\)/, 'Inventory days must present a bounded decimal.');
assert.match(turnover, /grid gap-(?:2(?:\.5)?|3) sm:grid-cols-2 xl:grid-cols-4/, 'Inventory turnover must use the compact responsive KPI layout.');
assert.match(smartInsightCore, /SMART_INSIGHT_CURRENCY_BASE = "TOMAN"/, 'Smart insight report currency must match Toman database storage.');

const sourceFiles = [];
for (const folder of ['pages/reports', 'components/reports']) {
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(full);
    }
  };
  walk(path.join(root, folder));
}
const reportSurfaceSource = sourceFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
assert.doesNotMatch(reportSurfaceSource, /formatCurrencyText\s*\(/, 'Report surfaces must use the bounded report money formatter.');

const serverFiles = [];
const walkServer = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walkServer(full);
    else if (entry.name.endsWith('.ts')) serverFiles.push(full);
  }
};
walkServer(path.join(root, 'server'));
const serverSource = serverFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
assert.doesNotMatch(serverSource, /moneyDivisor\s*:\s*10/, 'Server report currency contracts must not divide Toman storage by ten.');

console.log(`Report financial/presentation audit passed: ${sourceFiles.length} report source files checked.`);
