#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const scopes = [
  {
    name: 'client-financial-truth',
    config: 'config/typescript-audits/tsconfig.client.phase0.json',
    files: [
      'utils/apiFetch.ts',
      'pages/Expenses.tsx',
      'pages/Invoices.tsx',
      'pages/reports/FinancialOverview.tsx',
      'pages/Dashboard.tsx',
      'components/header/headerTypes.ts',
      'components/header/useHeaderQuickData.ts',
      'components/header/HeaderQuickActions.tsx',
    ],
  },
  {
    name: 'server-financial-truth',
    config: 'config/typescript-audits/tsconfig.server.phase0.json',
    files: [
      'server/routes/expenses.routes.ts',
      'server/routes/financialOverviewReports.routes.ts',
    ],
  },
];

const results = [];
for (const scope of scopes) {
  const configPath = path.resolve(root, scope.config);
  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
  if (loaded.error) throw new Error(ts.flattenDiagnosticMessageText(loaded.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, path.dirname(configPath));
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
  const targets = new Set(scope.files);
  const failures = ts.getPreEmitDiagnostics(program).filter((diagnostic) => {
    if (!diagnostic.file) return false;
    const file = path.relative(root, diagnostic.file.fileName).replace(/\\/g, '/');
    return targets.has(file);
  });
  results.push({ scope: scope.name, checkedFiles: targets.size, diagnostics: failures.length });
  if (failures.length) {
    const formatted = failures.map((diagnostic) => {
      const file = path.relative(root, diagnostic.file.fileName).replace(/\\/g, '/');
      const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start || 0);
      return `${file}:${position.line + 1}:${position.character + 1} TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
    });
    assert.fail(`Phase 2 targeted TypeScript diagnostics:\n${formatted.join('\n')}`);
  }
}

console.log(JSON.stringify({ status: 'passed', results }, null, 2));
