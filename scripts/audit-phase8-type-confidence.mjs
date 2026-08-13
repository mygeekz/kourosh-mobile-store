#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();

const allowedClientFiles = new Set();

const allowedServerFiles = new Set();

const audit = (scope, configRelativePath, allowedFiles, maxDiagnostics, allowedCodes = null) => {
  const configPath = path.resolve(root, configRelativePath);
  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
  if (loaded.error) throw new Error(ts.flattenDiagnosticMessageText(loaded.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, path.dirname(configPath));
  assert.equal(parsed.errors.length, 0, `${scope} TypeScript config must parse without errors`);

  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const violations = diagnostics.filter((diagnostic) => {
    if (!diagnostic.file) return true;
    const file = path.relative(root, diagnostic.file.fileName).replace(/\\/g, '/');
    return !allowedFiles.has(file) || (allowedCodes && !allowedCodes.has(diagnostic.code));
  });

  const format = (diagnostic) => {
    const file = diagnostic.file
      ? path.relative(root, diagnostic.file.fileName).replace(/\\/g, '/')
      : '<global>';
    return `${file} TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
  };

  assert.ok(diagnostics.length <= maxDiagnostics, `${scope} diagnostics exceeded ${maxDiagnostics}: ${diagnostics.length}`);
  assert.deepEqual(violations.map(format), [], `${scope} gained diagnostics outside its explicitly quarantined legacy files`);

  return {
    scope,
    diagnostics: diagnostics.length,
    maxDiagnostics,
    affectedFiles: new Set(diagnostics.map((item) => item.file && path.relative(root, item.file.fileName))).size,
    permittedCodes: allowedCodes ? [...allowedCodes].map((code) => `TS${code}`) : 'protected-files-only',
  };
};

const result = [
  audit('client', 'config/typescript-audits/tsconfig.client.phase0.json', allowedClientFiles, 0),
  audit('server', 'config/typescript-audits/tsconfig.server.phase0.json', allowedServerFiles, 0),
];

console.log(JSON.stringify({ status: 'passed', result }, null, 2));
