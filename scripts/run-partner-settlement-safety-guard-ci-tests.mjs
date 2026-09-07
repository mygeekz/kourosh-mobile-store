#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const ciContracts = Object.freeze([
  'server/tests/partnerSettlementSafetyGuardCiChangedPathClassifier.test.mjs',
  'server/tests/partnerSettlementSafetyGuardCiPlannerContract.test.mjs',
  'server/tests/partnerSettlementSafetyGuardCiWorkflow.test.mjs',
  'scripts/run-partner-settlement-safety-guard-maintenance-tests.mjs',
]);

const failures = [];
console.log(`[partner-settlement-safety-guards:ci] Running ${ciContracts.length} CI/maintenance stages.`);

for (const [index, target] of ciContracts.entries()) {
  console.log(`\n[${index + 1}/${ciContracts.length}] node ${target}`);
  const result = spawnSync(process.execPath, [path.join(root, target)], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) failures.push({ target, detail: result.error.message });
  else if (result.status !== 0) failures.push({ target, detail: `exit status ${String(result.status)}` });
}

console.log('\n[partner-settlement-safety-guards:ci] Summary');
console.log(`Stages: ${ciContracts.length}`);
console.log(`Passed: ${ciContracts.length - failures.length}`);
console.log(`Failed: ${failures.length}`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`- ${failure.target}: ${failure.detail}`);
  process.exit(1);
}

console.log('All Partner Settlement CI and maintenance guard stages passed.');
