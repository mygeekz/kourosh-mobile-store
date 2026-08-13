import fs from 'node:fs';
import path from 'node:path';

import { projectRoot, toPosix, walkFiles } from './ui-system/style-manifest-utils.mjs';

const failures = [];
const fail = (message) => failures.push(message);
const exists = (relativePath) => fs.existsSync(path.join(projectRoot, relativePath));
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

const retiredPath = 'components/ModalField.tsx';
const canonicalPath = 'components/ui/ModalField.tsx';

if (exists(retiredPath)) fail(`retired modal field renderer must stay removed: ${retiredPath}`);
if (!exists(canonicalPath)) fail(`canonical modal field is missing: ${canonicalPath}`);

const barrel = read('components/ui/index.ts');
if (!/default as ModalField/.test(barrel)) fail('@/components/ui must export ModalField');
if (!/ModalFieldProps/.test(barrel)) fail('@/components/ui must export ModalFieldProps');

const manifest = JSON.parse(read('config/ui/ui-manifest.json'));
const entry = (manifest.components ?? []).find((component) => component.id === 'modal-field');
if (!entry) {
  fail('UI manifest is missing canonical modal-field');
} else {
  if (entry.canonicalPath !== canonicalPath) fail(`modal-field canonicalPath must be ${canonicalPath}`);
  if (entry.exportName !== 'ModalField') fail('modal-field exportName must be ModalField');
  if (!(entry.replaces ?? []).includes(retiredPath)) fail(`modal-field must declare replacement of ${retiredPath}`);
}

if (exists(canonicalPath)) {
  const source = read(canonicalPath);
  for (const dependency of [
    "from './ControlShell'",
    "from './TextField'",
    "from './SelectField'",
    "from './TextareaField'",
  ]) {
    if (!source.includes(dependency)) fail(`${canonicalPath} must compose ${dependency}`);
  }
  if (!source.includes('<ControlShell')) fail(`${canonicalPath} must render the shared ControlShell`);
  if (/<(?:input|select|textarea)\b/.test(source)) {
    fail(`${canonicalPath} must not own native input/select/textarea renderers`);
  }
}

for (const [primitivePath, expectedMarker] of [
  ['components/ui/TextField.tsx', 'controlOnly'],
  ['components/ui/SelectField.tsx', 'controlOnly'],
  ['components/ui/TextareaField.tsx', 'controlOnly'],
]) {
  if (!exists(primitivePath)) {
    fail(`canonical primitive missing: ${primitivePath}`);
    continue;
  }
  if (!read(primitivePath).includes(expectedMarker)) {
    fail(`${primitivePath} must support ${expectedMarker} for shell composition`);
  }
}

const sourceRoots = ['app', 'components', 'contexts', 'hooks', 'pages', 'services', 'utils'];
const sourceFiles = sourceRoots.flatMap((root) =>
  walkFiles(path.join(projectRoot, root), (file) => /\.(?:ts|tsx)$/.test(file)),
);

const retiredPatterns = [
  /(?:^|\/)components\/ModalField$/,
  /^\.\.?\/ModalField$/,
  /^\.\.?\/components\/ModalField$/,
  /^\.\.\/\.\.\/components\/ModalField$/,
];

for (const absolute of sourceFiles) {
  const relative = toPosix(path.relative(projectRoot, absolute));
  const source = fs.readFileSync(absolute, 'utf8');
  for (const match of source.matchAll(/(?:import[^'";]*?from\s*|import\s*)['"]([^'"]+)['"]/g)) {
    const specifier = match[1].replace(/\.(?:ts|tsx|js|jsx)$/, '');
    if (retiredPatterns.some((pattern) => pattern.test(specifier))) {
      fail(`${relative} imports retired ModalField entry point: ${match[1]}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Modal field foundation audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Modal field foundation audit passed: dialog fields compose ControlShell and canonical input/select/textarea primitives, and the retired renderer cannot return.');
