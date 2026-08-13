import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const configs = [
  // Run the heaviest bucket first so long combined production verification
  // does not leave it until after several TypeScript checks.
  ['dashboard', 'config/typescript-audits/tsconfig.type-triage.dashboard.json'],
  ['components', 'config/typescript-audits/tsconfig.type-triage.components.json'],
  ['utils', 'config/typescript-audits/tsconfig.type-triage.utils.json'],
  ['hooks', 'config/typescript-audits/tsconfig.type-triage.hooks.json'],
  ['contexts', 'config/typescript-audits/tsconfig.type-triage.contexts.json'],
];

const host = ts.sys;
const failures = [];

function formatDiagnostics(diagnostics) {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => root,
    getNewLine: () => host.newLine,
  });
}

for (const [label, config] of configs) {
  const configPath = path.join(root, config);
  const readResult = ts.readConfigFile(configPath, host.readFile);
  if (readResult.error) {
    failures.push(`${label}: failed to read ${config}\n${formatDiagnostics([readResult.error])}`);
    continue;
  }

  const parsed = ts.parseJsonConfigFileContent(
    readResult.config,
    host,
    path.dirname(configPath),
    undefined,
    configPath,
  );

  if (parsed.errors.length > 0) {
    failures.push(`${label}: failed to parse ${config}\n${formatDiagnostics(parsed.errors)}`);
    continue;
  }

  const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
    projectReferences: parsed.projectReferences,
  });

  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length > 0) {
    failures.push(`${label}: ${config} failed\n${formatDiagnostics(diagnostics)}`);
    continue;
  }

  console.log(`Type triage bucket passed: ${label}`);
}

if (failures.length > 0) {
  console.error('TypeScript triage audit failed:');
  console.error(failures.join('\n\n'));
  process.exit(1);
}

console.log('TypeScript triage audit passed: core structural buckets are clean. Settings and reports keep their dedicated audit scripts; full-project noUnused cleanup remains intentionally tracked as separate debt.');
