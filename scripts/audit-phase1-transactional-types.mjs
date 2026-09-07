#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const scopes = [
  {
    name: 'client-transactions',
    config: 'config/typescript-audits/tsconfig.client.phase0.json',
    exactFiles: [
      'pages/Purchases.tsx',
      'pages/InstallmentSaleDetailPage.tsx',
      'components/PriceInput.tsx',
    ],
    identifierOnlyFiles: ['pages/mobilePhones/MobilePhonesMainWorkspace.tsx'],
  },
  {
    name: 'server-transactions-and-messaging',
    config: 'config/typescript-audits/tsconfig.server.phase0.json',
    exactFiles: [
      'server/salesOrders.ts',
      'server/repositories/purchaseReceipts.repo.ts',
      'server/bootstrap/messagingRuntime.ts',
      'server/bootstrap/messagingRuntimeDeps.ts',
      'server/utils/telegramEventNotificationRuntime.ts',
      'server/utils/telegramPollingRuntime.ts',
      'server/utils/notificationOutboxRuntime.ts',
    ],
    identifierOnlyFiles: [],
  },
];

const results = [];
for (const scope of scopes) {
  const configPath = path.resolve(root, scope.config);
  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
  if (loaded.error) throw new Error(ts.flattenDiagnosticMessageText(loaded.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, path.dirname(configPath));
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const exact = new Set(scope.exactFiles);
  const identifierOnly = new Set(scope.identifierOnlyFiles);
  const failures = diagnostics.filter((diagnostic) => {
    if (!diagnostic.file) return false;
    const file = path.relative(root, diagnostic.file.fileName).replace(/\\/g, '/');
    if (exact.has(file)) return true;
    return identifierOnly.has(file) && [2304, 2552].includes(diagnostic.code);
  });
  results.push({ scope: scope.name, checkedFiles: exact.size + identifierOnly.size, diagnostics: failures.length });
  if (failures.length) {
    const formatted = failures.map((diagnostic) => {
      const file = path.relative(root, diagnostic.file.fileName).replace(/\\/g, '/');
      const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start || 0);
      return `${file}:${position.line + 1}:${position.character + 1} TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
    });
    assert.fail(`Phase 1 targeted TypeScript diagnostics:\n${formatted.join('\n')}`);
  }
}

console.log(JSON.stringify({ status: 'passed', results }, null, 2));
