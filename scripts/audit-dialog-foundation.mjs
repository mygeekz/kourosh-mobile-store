import fs from 'node:fs';
import path from 'node:path';

import { projectRoot, toPosix, walkFiles } from './ui-system/style-manifest-utils.mjs';

const failures = [];
const fail = (message) => failures.push(message);
const exists = (relativePath) => fs.existsSync(path.join(projectRoot, relativePath));
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

const retiredEntryPoints = [
  'components/Modal.tsx',
  'components/ModalActions.tsx',
  'components/ui/ConfirmDialog.tsx',
];
for (const retiredPath of retiredEntryPoints) {
  if (exists(retiredPath)) fail(`retired dialog entry point must stay removed: ${retiredPath}`);
}

for (const requiredPath of [
  'components/ui/Dialog.tsx',
  'components/ui/DialogActions.tsx',
  'components/ui/DialogShell.tsx',
]) {
  if (!exists(requiredPath)) fail(`canonical dialog foundation file missing: ${requiredPath}`);
}

const uiBarrel = read('components/ui/index.ts');
for (const exportName of ['Dialog', 'DialogActions', 'DialogShell']) {
  if (!new RegExp(`\\b${exportName}\\b`).test(uiBarrel)) {
    fail(`@/components/ui must export ${exportName}`);
  }
}

const manifest = JSON.parse(read('config/ui/ui-manifest.json'));
const canonicalById = new Map((manifest.components ?? []).map((component) => [component.id, component]));
for (const [id, expectedPath, expectedExport] of [
  ['dialog', 'components/ui/Dialog.tsx', 'Dialog'],
  ['dialog-actions', 'components/ui/DialogActions.tsx', 'DialogActions'],
  ['dialog-shell', 'components/ui/DialogShell.tsx', 'DialogShell'],
]) {
  const entry = canonicalById.get(id);
  if (!entry) {
    fail(`UI manifest is missing canonical ${id}`);
    continue;
  }
  if (entry.canonicalPath !== expectedPath) fail(`${id}: canonicalPath must be ${expectedPath}`);
  if (entry.exportName !== expectedExport) fail(`${id}: exportName must be ${expectedExport}`);
}

const retiredLegacyPaths = new Set(retiredEntryPoints);
for (const legacy of manifest.legacyComponents ?? []) {
  if (retiredLegacyPaths.has(legacy.path)) {
    fail(`retired dialog adapter must not remain in legacyComponents: ${legacy.path}`);
  }
}

const adapterContracts = [
  ['components/modals/AppModal.tsx', "from '../ui/Dialog'"],
  ['components/modals/ModalActions.tsx', "from '../ui/DialogActions'"],
];
for (const [adapterPath, canonicalImport] of adapterContracts) {
  if (!exists(adapterPath)) {
    fail(`compatibility adapter missing: ${adapterPath}`);
    continue;
  }
  const source = read(adapterPath);
  if (!source.includes(canonicalImport)) fail(`${adapterPath} must delegate to ${canonicalImport}`);
  if (/\bfunction\b|React\.FC|createPortal\s*\(/.test(source)) {
    fail(`${adapterPath} must remain a re-export-only compatibility adapter`);
  }
}

const sourceFiles = [
  ...walkFiles(path.join(projectRoot, 'app'), (file) => /\.(?:ts|tsx)$/.test(file)),
  ...walkFiles(path.join(projectRoot, 'components'), (file) => /\.(?:ts|tsx)$/.test(file)),
  ...walkFiles(path.join(projectRoot, 'contexts'), (file) => /\.(?:ts|tsx)$/.test(file)),
  ...walkFiles(path.join(projectRoot, 'hooks'), (file) => /\.(?:ts|tsx)$/.test(file)),
  ...walkFiles(path.join(projectRoot, 'pages'), (file) => /\.(?:ts|tsx)$/.test(file)),
  ...walkFiles(path.join(projectRoot, 'services'), (file) => /\.(?:ts|tsx)$/.test(file)),
  ...walkFiles(path.join(projectRoot, 'utils'), (file) => /\.(?:ts|tsx)$/.test(file)),
];
const legacySpecifierPatterns = [
  /(?:^|\/)components\/Modal$/,
  /(?:^|\/)components\/ModalActions$/,
  /(?:^|\/)ui\/ConfirmDialog$/,
  /^\.\.?\/Modal$/,
  /^\.\.?\/ModalActions$/,
  /^\.\.?\/ui\/ConfirmDialog$/,
];
for (const absolute of sourceFiles) {
  const relative = toPosix(path.relative(projectRoot, absolute));
  if (relative === 'components/modals/index.ts') continue;
  const source = fs.readFileSync(absolute, 'utf8');
  for (const match of source.matchAll(/(?:import[^'";]*?from\s*|import\s*)['"]([^'"]+)['"]/g)) {
    const specifier = match[1].replace(/\.(?:ts|tsx|js|jsx)$/, '');
    if (legacySpecifierPatterns.some((pattern) => pattern.test(specifier))) {
      fail(`${relative} imports retired dialog entry point: ${match[1]}`);
    }
  }
}


const confirmContextPath = 'contexts/ConfirmContext.tsx';
if (!exists(confirmContextPath)) {
  fail(`${confirmContextPath} is missing`);
} else {
  const confirmContext = read(confirmContextPath);
  if (!confirmContext.includes("from '@/components/ui'")) {
    fail(`${confirmContextPath} must consume Dialog and DialogActions from @/components/ui`);
  }
  if (!confirmContext.includes('<Dialog') || !confirmContext.includes('<DialogActions')) {
    fail(`${confirmContextPath} must render the canonical Dialog/DialogActions confirmation flow`);
  }
}

if (failures.length > 0) {
  console.error('Dialog foundation audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Dialog foundation audit passed: runtime dialogs use the canonical Dialog/DialogActions foundation and retired public adapters cannot return.');
