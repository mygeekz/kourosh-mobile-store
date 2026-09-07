#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

const root = process.cwd();
const settingsRoot = path.join(root, 'pages', 'settings');

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});

const files = walk(settingsRoot)
  .filter((file) => /\.tsx?$/.test(file))
  .map((file) => path.relative(root, file).replaceAll('\\', '/'));

const program = ts.createProgram(files, {
  noEmit: true,
  noResolve: true,
  skipLibCheck: true,
  jsx: ts.JsxEmit.ReactJSX,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowSyntheticDefaultImports: true,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
});

// Vite/esbuild transpiles TypeScript without semantic checking. A missing local
// identifier therefore survives production bundling and becomes a runtime
// ReferenceError. These diagnostics specifically catch unresolved/typoed names
// while intentionally ignoring missing package declarations in noResolve mode.
const freeIdentifierCodes = new Set([2304, 2551, 2552]);
const failures = ts.getPreEmitDiagnostics(program)
  .filter((diagnostic) => freeIdentifierCodes.has(diagnostic.code))
  .map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');
    if (!diagnostic.file || diagnostic.start == null) return { code: diagnostic.code, message };
    const location = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    return {
      code: diagnostic.code,
      file: path.relative(root, diagnostic.file.fileName).replaceAll('\\', '/'),
      line: location.line + 1,
      column: location.character + 1,
      message,
    };
  });

if (failures.length > 0) {
  console.error(JSON.stringify({
    status: 'FAIL',
    scope: 'pages/settings/**/*.{ts,tsx}',
    reason: 'Unresolved local identifiers can compile with Vite/esbuild and crash at runtime.',
    failures,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'PASS',
  scope: 'pages/settings/**/*.{ts,tsx}',
  filesChecked: files.length,
  unresolvedLocalIdentifiers: 0,
  guardedDiagnostics: [...freeIdentifierCodes],
}, null, 2));
