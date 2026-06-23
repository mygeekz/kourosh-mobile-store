#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const reportPath = path.resolve('docs/release/phase50-release-readiness.json');

if (!fs.existsSync(reportPath)) {
  console.error(`Release readiness report not found: ${reportPath}`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

console.log('');
console.log(`Kourosh Partner — ${report.title}`);
console.log('='.repeat(48));
console.log(`Phase: ${report.phase}`);
console.log(`Primary verification command: ${report.primaryVerificationCommand}`);
console.log('');
console.log('Recommended release gate:');
for (const step of report.recommendedReleaseGate) {
  console.log(`- ${step}`);
}
console.log('');
console.log('Core audit scripts:');
for (const script of report.coreAuditScripts) {
  console.log(`- npm run ${script}`);
}
console.log('');
console.log('Remaining risks:');
for (const risk of report.remainingRisks) {
  console.log(`- [${risk.risk}] ${risk.area}: ${risk.note}`);
}
console.log('');
