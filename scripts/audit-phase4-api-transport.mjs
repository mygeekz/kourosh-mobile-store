#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  PHASE4_MIGRATED_CLIENT_FILES,
  PHASE4_NATIVE_FETCH_ALLOWLIST,
} from './phase4-api-transport-scope.mjs';

const root = process.cwd();
const CLIENT_ROOTS = [
  'app',
  'components',
  'contexts',
  'hooks',
  'pages',
  'services',
  'utils',
];

const walk = (relativeDirectory) => {
  const absoluteDirectory = path.resolve(root, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) return [];
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return walk(relativePath);
    return /\.(?:ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')
      ? [relativePath]
      : [];
  });
};

const countCalls = (file) => {
  const source = fs.readFileSync(path.resolve(root, file), 'utf8');
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const result = { fetch: 0, apiFetch: 0 };
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === 'fetch') result.fetch += 1;
      if (node.expression.text === 'apiFetch') result.apiFetch += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return result;
};

const files = [...new Set(CLIENT_ROOTS.flatMap(walk))].sort();
const resultByFile = new Map(files.map((file) => [file, countCalls(file)]));
const violations = [];

for (const [file, result] of resultByFile) {
  const allowed = PHASE4_NATIVE_FETCH_ALLOWLIST[file] ?? 0;
  if (result.fetch !== allowed) {
    violations.push(
      `${file}: found ${result.fetch} native fetch call(s), expected ${allowed}`,
    );
  }
}

for (const file of PHASE4_MIGRATED_CLIENT_FILES) {
  const result = resultByFile.get(file);
  if (!result) {
    violations.push(`${file}: migrated source is missing`);
    continue;
  }
  if (result.fetch !== 0) {
    violations.push(`${file}: direct fetch returned after Phase 4 migration`);
  }
  if (result.apiFetch === 0) {
    violations.push(`${file}: no shared apiFetch call remains`);
  }
}

assert.deepEqual(
  violations,
  [],
  `Phase 4 API transport boundary violations:\n${violations.join('\n')}`,
);

const totals = [...resultByFile.values()].reduce(
  (sum, item) => ({
    nativeFetchCalls: sum.nativeFetchCalls + item.fetch,
    apiFetchCalls: sum.apiFetchCalls + item.apiFetch,
  }),
  { nativeFetchCalls: 0, apiFetchCalls: 0 },
);

console.log(JSON.stringify({
  status: 'passed',
  scannedClientFiles: files.length,
  migratedFiles: PHASE4_MIGRATED_CLIENT_FILES.length,
  ...totals,
  nativeFetchAllowlist: PHASE4_NATIVE_FETCH_ALLOWLIST,
}, null, 2));
