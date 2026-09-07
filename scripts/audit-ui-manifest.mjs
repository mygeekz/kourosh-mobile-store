import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'config/ui/ui-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const failures = [];
const fail = (message) => failures.push(message);

if (manifest.schemaVersion !== 1) fail('UI manifest schemaVersion must be 1');
if (!manifest.version) fail('UI manifest version is required');
if (manifest.styleSystem?.manifest !== 'styles/manifest/style-manifest.json') {
  fail('UI manifest must point to styles/manifest/style-manifest.json');
}
if (manifest.styleSystem?.runtimeEntry !== 'app/bootstrap/styles.ts') {
  fail('UI manifest runtime style entry must be app/bootstrap/styles.ts');
}
if (manifest.styleSystem?.pageLevelCssImportsAllowed !== false) {
  fail('pageLevelCssImportsAllowed must remain false');
}
if (manifest.componentPolicy?.canonicalImportPath !== '@/components/ui') {
  fail('canonical component import path must remain @/components/ui');
}
if (manifest.componentPolicy?.newDuplicateComponentsAllowed !== false) {
  fail('newDuplicateComponentsAllowed must remain false');
}
if (manifest.componentPolicy?.legacyUsageMayOnlyDecrease !== true) {
  fail('legacyUsageMayOnlyDecrease must remain true');
}
if (manifest.styleSystem?.newLocalCssFilesAllowed !== false) {
  fail('newLocalCssFilesAllowed must remain false');
}
if (manifest.styleSystem?.patchStyleFilesMayOnlyDecrease !== true) {
  fail('patchStyleFilesMayOnlyDecrease must remain true');
}
if (manifest.styleSystem?.importantUsageMayOnlyDecrease !== true) {
  fail('importantUsageMayOnlyDecrease must remain true');
}
if (manifest.componentPolicy?.directCanonicalFileImportsAllowed !== false) {
  fail('directCanonicalFileImportsAllowed must remain false');
}
if (manifest.componentPolicy?.newLegacyImportsAllowed !== false) {
  fail('newLegacyImportsAllowed must remain false');
}
if (manifest.architectureLock?.status !== 'enforced') {
  fail('architectureLock.status must remain enforced');
}
if (manifest.architectureLock?.baseline !== 'config/ui/ui-architecture-lock-baseline.json') {
  fail('architecture lock baseline path must remain config/ui/ui-architecture-lock-baseline.json');
}
if (manifest.architectureLock?.audit !== 'scripts/audit-ui-architecture-lock.mjs') {
  fail('architecture lock audit path must remain scripts/audit-ui-architecture-lock.mjs');
}
for (const [rule, expected] of Object.entries({
  newCssFilesAllowed: false,
  newPatchStyleFilesAllowed: false,
  importantUsageMayOnlyDecrease: true,
  arbitraryBreakpointUsageMayOnlyDecrease: true,
  arbitraryZIndexUsageMayOnlyDecrease: true,
  unregisteredUiFoundationFilesAllowed: false,
})) {
  if (manifest.architectureLock?.rules?.[rule] !== expected) {
    fail(`architectureLock.rules.${rule} must remain ${expected}`);
  }
}

const componentIds = new Set();
const exportNames = new Set();
for (const component of manifest.components ?? []) {
  if (componentIds.has(component.id)) fail(`duplicate component id: ${component.id}`);
  componentIds.add(component.id);
  if (exportNames.has(component.exportName)) fail(`duplicate canonical export name: ${component.exportName}`);
  exportNames.add(component.exportName);

  const canonicalPath = path.join(root, component.canonicalPath);
  const barrelPath = path.join(root, component.barrelPath);
  if (!fs.existsSync(canonicalPath)) fail(`${component.id}: canonical file missing: ${component.canonicalPath}`);
  if (!fs.existsSync(barrelPath)) fail(`${component.id}: barrel file missing: ${component.barrelPath}`);
  if (fs.existsSync(barrelPath)) {
    const barrel = fs.readFileSync(barrelPath, 'utf8');
    const exportPattern = new RegExp(`\\bas\\s+${component.exportName}\\b|\\b${component.exportName}\\b`);
    if (!exportPattern.test(barrel)) fail(`${component.id}: ${component.exportName} is not exported by ${component.barrelPath}`);
  }
  if (component.status !== 'canonical') fail(`${component.id}: canonical registry entries must have status=canonical`);
}

for (const legacy of manifest.legacyComponents ?? []) {
  if (!fs.existsSync(path.join(root, legacy.path))) fail(`legacy component missing: ${legacy.path}`);
  if (!componentIds.has(legacy.replacementId)) fail(`${legacy.path}: unknown replacementId ${legacy.replacementId}`);
  if (legacy.newImportsAllowed !== false) fail(`${legacy.path}: newImportsAllowed must remain false`);
}

const breakpointValues = Object.values(manifest.responsiveContract?.breakpoints ?? {});
if (breakpointValues.some((value) => !Number.isInteger(value) || value <= 0)) fail('all reserved breakpoints must be positive integers');
if (new Set(breakpointValues).size !== breakpointValues.length) fail('reserved breakpoint values must be unique');

const layerEntries = Object.entries(manifest.layerContract?.layers ?? {});
for (let index = 1; index < layerEntries.length; index += 1) {
  if (layerEntries[index][1] <= layerEntries[index - 1][1]) {
    fail(`layer contract must be strictly ascending: ${layerEntries[index - 1][0]} -> ${layerEntries[index][0]}`);
  }
}

if (failures.length > 0) {
  console.error('UI manifest audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`UI manifest audit passed: ${manifest.components.length} canonical components and ${manifest.legacyComponents.length} registered legacy adapters.`);
