#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const configPath = path.resolve(root, 'config/typescript-audits/tsconfig.client.phase0.json');
const files = [
  'app/feedback/AppToaster.tsx',
  'components/ExportMenu.tsx',
  'components/ShamsiDatePicker.tsx',
  'components/reports/SmartInsightModalShell.tsx',
  'components/ui/SelectField.tsx',
  'components/ui/AppSelectField.tsx',
  'components/ui/DialogShell.tsx',
  'components/ui/PortalLayer.tsx',
  'pages/AuditLog.tsx',
  'pages/Outbox.tsx',
  'pages/mobilePhones/mobilePhonesControllerSupport.tsx',
  'utils/floatingOverlayPosition.ts',
];

const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
if (loaded.error) throw new Error(ts.flattenDiagnosticMessageText(loaded.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, path.dirname(configPath));
const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
const targets = new Set(files);
const failures = ts.getPreEmitDiagnostics(program).filter((diagnostic) => {
  if (!diagnostic.file) return false;
  const file = path.relative(root, diagnostic.file.fileName).replace(/\\/g, '/');
  return targets.has(file);
});

if (failures.length) {
  const formatted = failures.map((diagnostic) => {
    const file = path.relative(root, diagnostic.file.fileName).replace(/\\/g, '/');
    const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start || 0);
    return `${file}:${position.line + 1}:${position.character + 1} TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
  });
  assert.fail(`Phase 5 targeted TypeScript diagnostics:\n${formatted.join('\n')}`);
}

console.log(JSON.stringify({ status: 'passed', checkedFiles: files.length, diagnostics: 0 }, null, 2));
