import fs from 'node:fs';
import path from 'node:path';
import { projectRoot } from './ui-system/style-manifest-utils.mjs';
import { findDirectCssImports, scanUiBoundaries } from './ui-system/ui-boundary-utils.mjs';

const baselinePath = path.join(projectRoot, 'docs/ui/baselines/ui-boundary-baseline.json');
if (!fs.existsSync(baselinePath)) {
  console.error('UI boundary baseline is missing. Run: npm run ui:baseline:update');
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const current = scanUiBoundaries();
const failures = [];

const directCssImports = findDirectCssImports();
if (directCssImports.length > 0) {
  for (const violation of directCssImports) {
    failures.push(`${violation.file}:${violation.line} imports CSS directly (${violation.specifier}); use app/bootstrap/styles.ts via the style manifest`);
  }
}

for (const [file, currentMetrics] of Object.entries(current.byFile)) {
  const allowedMetrics = baseline.byFile[file] ?? {};
  for (const metric of current.metrics) {
    const currentCount = currentMetrics[metric] ?? 0;
    const allowedCount = allowedMetrics[metric] ?? 0;
    if (currentCount > allowedCount) {
      failures.push(`${file}: ${metric} increased from ${allowedCount} to ${currentCount}`);
    }
  }
}

if (failures.length > 0) {
  console.error('UI boundary audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error('Existing debt may be reduced, but baseline increases are forbidden.');
  process.exit(1);
}

const totals = {};
for (const metrics of Object.values(current.byFile)) {
  for (const metric of current.metrics) totals[metric] = (totals[metric] ?? 0) + (metrics[metric] ?? 0);
}
console.log(`UI boundary audit passed. CSS imports are centralized; tracked legacy usage did not increase.`);
console.log(`Current debt snapshot: ${Object.entries(totals).map(([key, value]) => `${key}=${value}`).join(', ')}`);
