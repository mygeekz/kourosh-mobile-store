import fs from 'node:fs';

import {
  architectureLockBaselinePath,
  readArchitectureLockBaseline,
  scanUiArchitectureLock,
  summarizeArchitectureSnapshot,
} from './ui-system/ui-architecture-lock-utils.mjs';

if (!fs.existsSync(architectureLockBaselinePath)) {
  console.error('UI architecture lock baseline is missing: config/ui/ui-architecture-lock-baseline.json');
  process.exit(1);
}

const baseline = readArchitectureLockBaseline();
const current = scanUiArchitectureLock();
const failures = [];
const fail = (message) => failures.push(message);

if (baseline.schemaVersion !== 1) fail('architecture lock baseline schemaVersion must be 1');
if (baseline.policy?.newCssFilesAllowed !== false) fail('newCssFilesAllowed must remain false');
if (baseline.policy?.newPatchStyleFilesAllowed !== false) fail('newPatchStyleFilesAllowed must remain false');
if (baseline.policy?.importantUsageMayOnlyDecrease !== true) fail('importantUsageMayOnlyDecrease must remain true');
if (baseline.policy?.arbitraryBreakpointUsageMayOnlyDecrease !== true) fail('arbitraryBreakpointUsageMayOnlyDecrease must remain true');
if (baseline.policy?.arbitraryZIndexUsageMayOnlyDecrease !== true) fail('arbitraryZIndexUsageMayOnlyDecrease must remain true');
if (baseline.policy?.unregisteredUiFoundationFilesAllowed !== false) fail('unregisteredUiFoundationFilesAllowed must remain false');

const baselineCssPaths = new Set(baseline.cssPaths ?? []);
for (const cssPath of current.cssPaths) {
  if (!baselineCssPaths.has(cssPath)) fail(`new CSS file is forbidden: ${cssPath}`);
}

const baselineRuntimeCssPaths = new Set(baseline.runtimeActiveCssPaths ?? []);
for (const cssPath of current.runtimeActiveCssPaths) {
  if (!baselineRuntimeCssPaths.has(cssPath)) fail(`new runtime CSS entry is forbidden: ${cssPath}`);
}

const baselinePatchStylePaths = new Set(baseline.patchStylePaths ?? []);
for (const cssPath of current.patchStylePaths) {
  if (!baselinePatchStylePaths.has(cssPath)) fail(`new patch-style CSS filename is forbidden: ${cssPath}`);
}

const grandfatheredUiFoundationFiles = new Set(baseline.grandfatheredUiFoundationFiles ?? []);
for (const file of current.unregisteredUiFoundationFiles) {
  if (!grandfatheredUiFoundationFiles.has(file)) {
    fail(`unregistered UI foundation file is forbidden: ${file}; register it in config/ui/ui-manifest.json`);
  }
}

for (const [file, metrics] of Object.entries(current.byFile)) {
  const allowed = baseline.byFile?.[file] ?? {};
  for (const metric of ['importantDeclarations', 'arbitraryBreakpoints', 'arbitraryZIndexes']) {
    const currentCount = metrics[metric] ?? 0;
    const allowedCount = allowed[metric] ?? 0;
    if (currentCount > allowedCount) {
      fail(`${file}: ${metric} increased from ${allowedCount} to ${currentCount}`);
    }
  }
}

if (failures.length > 0) {
  console.error('UI architecture lock audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error('Architecture debt may only decrease. Update the baseline only after an explicit architecture review.');
  process.exit(1);
}

const summary = summarizeArchitectureSnapshot(current);
console.log('UI architecture lock passed. No new CSS inventory, patch stylesheet, unregistered UI foundation file, or architecture debt was introduced.');
console.log(`Locked snapshot: ${Object.entries(summary).map(([key, value]) => `${key}=${value}`).join(', ')}`);
