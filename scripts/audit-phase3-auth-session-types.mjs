#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const scopes = [
  {
    name: 'client-auth-session-truth',
    config: 'config/typescript-audits/tsconfig.client.phase0.json',
    files: [
      'contexts/AuthContext.tsx',
      'utils/apiFetch.ts',
      'utils/authSession.ts',
      'components/ProtectedRoute.tsx',
      'components/PublicRoute.tsx',
      'components/RoleProtectedRoute.tsx',
    ],
  },
  {
    name: 'server-auth-session-truth',
    config: 'config/typescript-audits/tsconfig.server.phase0.json',
    files: [
      'server/utils/sessionAuth.ts',
      'server/routes/auth.routes.ts',
      'server/routes/authRouteRegistry.ts',
      'server/routes/users.routes.ts',
      'server/bootstrap/appComposition.ts',
      'server/bootstrap/coreBusinessRuntime.ts',
      'server/routes/coreBusinessRouteTypes.ts',
      'server/routes/coreBusinessRouteMicroRegistrars.ts',
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
    assert.fail(`Phase 3 targeted TypeScript diagnostics:\n${formatted.join('\n')}`);
  }
}

console.log(JSON.stringify({ status: 'passed', results }, null, 2));
