#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceDirs = ['components', 'pages', 'styles'];
const modalDebtPatterns = [
  /createPortal/g,
  /window\.confirm|(?<![A-Za-z0-9_$])confirm\(/g,
  /z-\[(?:9999|2147483647)\]/g,
  /people-modal-form|people-modal-summary/g,
  /restore-backup-modal-v22|confirm-dialog-surface--restore/g,
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'generated') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx?|css)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const hits = [];
for (const dir of sourceDirs) {
  for (const file of walk(path.join(root, dir))) {
    const rel = path.relative(root, file);
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of modalDebtPatterns) {
      const matches = text.match(pattern);
      if (matches?.length) hits.push({ file: rel, pattern: pattern.source, count: matches.length });
    }
  }
}

const sourceHits = hits.filter((hit) => !hit.file.startsWith('styles/'));
const styleHits = hits.filter((hit) => hit.file.startsWith('styles/'));

console.log(JSON.stringify({
  checkedDirs: sourceDirs,
  sourceHits,
  styleHits,
  note: 'sourceHits must stay empty except the two central portal files; styleHits are legacy CSS debt pending safe deletion after visual QA.',
}, null, 2));
