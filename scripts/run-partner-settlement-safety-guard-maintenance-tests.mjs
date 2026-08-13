#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const maintenanceTests = Object.freeze([
  'server/tests/partnerSettlementSafetyGuardProductionSourceScopeMaintenance.test.mjs',
  'server/tests/partnerSettlementSafetyGuardBroadKeywordScopeLint.test.mjs',
  'server/tests/partnerSettlementProtectedSourceScopeFixtures.test.mjs',
  'server/tests/partnerSettlementSafetyGuardCoverageDriftContract.test.mjs',
  'server/tests/partnerSettlementSafetyGuardFamilyConsistency.test.mjs',
  'server/tests/partnerSettlementAtomicSubmitReadModelLockGuard.test.mjs',
  'server/tests/partnerSettlementPhase3ASafetyGuard.test.mjs',
  'server/tests/partnerSettlementPhase3BSafetyGuard.test.mjs',
  'server/tests/partnerSettlementPhase3CSafetyGuard.test.mjs',
  'server/tests/partnerSettlementPhase3DSafetyGuard.test.mjs',
]);

const failures = [];
console.log(`[partner-settlement-safety-guards:maintenance] Running ${maintenanceTests.length} focused guards.`);

for (const [index, testFile] of maintenanceTests.entries()) {
  console.log(`\n[${index + 1}/${maintenanceTests.length}] node ${testFile}`);
  const result = spawnSync(process.execPath, [path.join(root, testFile)], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) failures.push({ testFile, detail: result.error.message });
  else if (result.status !== 0) failures.push({ testFile, detail: `exit status ${result.status}` });
}

console.log('\n[partner-settlement-safety-guards:maintenance] Summary');
console.log(`Total: ${maintenanceTests.length}`);
console.log(`Passed: ${maintenanceTests.length - failures.length}`);
console.log(`Failed: ${failures.length}`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`- ${failure.testFile}: ${failure.detail}`);
  process.exit(1);
}

console.log('All Partner Settlement safety-guard maintenance tests passed.');
