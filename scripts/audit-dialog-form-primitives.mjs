import fs from 'node:fs';
import path from 'node:path';

import { projectRoot, toPosix, walkFiles } from './ui-system/style-manifest-utils.mjs';

const failures = [];
const fail = (message) => failures.push(message);
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

const sourceRoots = ['app', 'components', 'contexts', 'hooks', 'pages', 'services', 'utils'];
const sourceFiles = sourceRoots.flatMap((root) =>
  walkFiles(path.join(projectRoot, root), (file) => /\.(?:ts|tsx)$/.test(file)),
);

let modalFieldCount = 0;
let canonicalTextControls = 0;
let canonicalSelectControls = 0;
let canonicalTextareaControls = 0;

for (const absolute of sourceFiles) {
  const relative = toPosix(path.relative(projectRoot, absolute));
  const source = fs.readFileSync(absolute, 'utf8');

  for (const match of source.matchAll(/<ModalField\b[\s\S]*?<\/ModalField>/g)) {
    modalFieldCount += 1;
    const block = match[0];
    const startLine = source.slice(0, match.index).split('\n').length;

    if (/<(?:input|select|textarea)\b/.test(block)) {
      fail(`${relative}:${startLine} renders a native input/select/textarea inside ModalField; use TextField, SelectField or TextareaField from @/components/ui`);
    }

    canonicalTextControls += (block.match(/<TextField\b/g) ?? []).length;
    canonicalSelectControls += (block.match(/<SelectField\b/g) ?? []).length;
    canonicalTextareaControls += (block.match(/<TextareaField\b/g) ?? []).length;
  }
}

const modalFieldPath = 'components/ui/ModalField.tsx';
const modalFieldSource = read(modalFieldPath);
for (const forbiddenCompatibilityBranch of [
  "tag === 'input'",
  "tag === 'select'",
  "tag === 'textarea'",
]) {
  if (modalFieldSource.includes(forbiddenCompatibilityBranch)) {
    fail(`${modalFieldPath} still accepts native control tags through compatibility branch: ${forbiddenCompatibilityBranch}`);
  }
}

for (const canonicalPrimitive of ['TextField', 'SelectField', 'TextareaField']) {
  if (!modalFieldSource.includes(`primaryChild.type === ${canonicalPrimitive}`)) {
    fail(`${modalFieldPath} must explicitly compose ${canonicalPrimitive}`);
  }
}

const packageJson = JSON.parse(read('package.json'));
if (!packageJson.scripts?.['audit:dialog-form-primitives']) {
  fail('package.json must expose audit:dialog-form-primitives');
}

if (failures.length > 0) {
  console.error('Dialog form primitives audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'passed',
  modalFieldCount,
  canonicalControls: {
    text: canonicalTextControls,
    select: canonicalSelectControls,
    textarea: canonicalTextareaControls,
  },
  rawNativeControlsInsideModalField: 0,
}, null, 2));
