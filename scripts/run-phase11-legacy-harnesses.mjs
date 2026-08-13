#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const harnesses = [
  'server/tests/helpers/mlShadowScoreImportApplyReceiptExportPackageBuilderHarness.ts',
  'server/tests/helpers/mlShadowScoreImportApplyReceiptExportPackageRouteHarness.ts',
  'server/tests/helpers/mlShadowScoreImportApplyReceiptExportPackageRouteRuntimeBoundaryHarness.ts',
  'server/tests/helpers/mlShadowScoreImportApplyReceiptExportPackageSnapshotPersistenceHarness.ts',
  'server/tests/helpers/mlShadowScoreImportApplyReceiptExportPackageSnapshotRouteHarness.ts',
  'server/tests/helpers/mlShadowScoreImportApplyReceiptExportPackageSnapshotRouteBoundaryMatrixHarness.ts',
  'server/tests/helpers/mlShadowScoreImportApplyReceiptExportPackageSnapshotRouteErrorContractMatrixHarness.ts',
  'server/tests/helpers/mlShadowScoreImportApplyReceiptExportPackageSnapshotRouteReplayGuardMatrixHarness.ts',
  'server/tests/helpers/mlShadowScoreImportApplyReceiptExportReadRouteHarness.ts',
  'server/tests/helpers/mlShadowScoreImportApplyReceiptExportReadRouteRuntimeAuthBoundaryHarness.ts',
  'server/tests/helpers/mlShadowScoreImportApplyReceiptExportReadRouteRuntimeErrorBoundaryHarness.ts',
  'server/tests/helpers/mlShadowScoreImportApplyReceiptExportReadRouteErrorContractHarness.ts',
  'server/tests/helpers/mlShadowScoreImportApplyReceiptExportReadRouteResponseContractHarness.ts',
  'server/tests/helpers/mlShadowScoreImportApplyReceiptExportPackageRouteErrorContractMatrixHarness.ts',
];

for (const harness of harnesses) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', harness], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'inherit',
  });
  assert.equal(result.error, undefined, `${harness} could not start`);
  assert.equal(result.status, 0, `${harness} failed`);
}

console.log(`Phase 11 legacy harness suite passed (${harnesses.length}/${harnesses.length}).`);
