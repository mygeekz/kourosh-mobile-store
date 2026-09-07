#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const runtimeRoots = ['pages', 'components', 'app'];
const allowedTableSources = new Set(['@/components/ui', './TableSystem']);

const isAllowedTableSource = (source) => (
  allowedTableSources.has(source)
  || source.endsWith('/components/ui')
);

const walk = (dir) => {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel));
    else if (/\.(?:tsx?|jsx?)$/.test(entry.name)) out.push(rel.replaceAll('\\', '/'));
  }
  return out;
};

const importRe = /import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?/g;
const tableJsxRe = /<Table(?:\s|>)/g;
let tableImportCount = 0;
let tableConsumerCount = 0;

for (const rel of runtimeRoots.flatMap(walk)) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  const tableImports = [];

  for (const match of source.matchAll(importRe)) {
    const specifiers = match[1]
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.split(/\s+as\s+/)[0].trim());
    if (!specifiers.includes('Table')) continue;
    tableImportCount += 1;
    const importSource = match[2];
    const line = source.slice(0, match.index).split('\n').length;
    tableImports.push({ importSource, line });
    if (!isAllowedTableSource(importSource)) {
      failures.push(`${rel}:${line} imports Table from "${importSource}"; Table must come from the canonical UI barrel/TableSystem only.`);
    }
  }

  const usesCanonicalTable = tableJsxRe.test(source);
  tableJsxRe.lastIndex = 0;
  if (usesCanonicalTable && rel !== 'components/ui/TableSystem.tsx') {
    tableConsumerCount += 1;
    if (!tableImports.some(({ importSource }) => isAllowedTableSource(importSource))) {
      failures.push(`${rel} renders <Table> without a canonical Table import.`);
    }
  }

  if (tableImports.length > 1) {
    failures.push(`${rel} imports Table more than once; keep a single canonical Table owner.`);
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const releaseAudit = String(packageJson.scripts?.['audit:release'] || '');
assert.match(releaseAudit, /audit:table-import-contract-v288/, 'audit:release must enforce the v288 Table import contract');
const sourceVersion = fs.readFileSync(path.join(root, 'KOUROSH_SOURCE_VERSION'), 'utf8').trim();
const sourceVersionNumber = Number(sourceVersion.replace(/^v/, ''));
assert.ok(Number.isInteger(sourceVersionNumber) && sourceVersionNumber >= 288, `KOUROSH_SOURCE_VERSION must be v288 or a compatible successor; found ${sourceVersion || '(missing)'}`);

if (failures.length) {
  console.error('Table import contract v288 audit FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Table import contract v288 audit passed (tableImports=${tableImportCount}, tableConsumers=${tableConsumerCount}, invalidOwners=0).`);
