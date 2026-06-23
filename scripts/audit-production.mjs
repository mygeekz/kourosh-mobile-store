import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const strict = process.argv.includes('--strict') || process.env.KOUROSH_AUDIT_STRICT === '1';
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const tscBin = process.platform === 'win32' ? 'node_modules/.bin/tsc.cmd' : 'node_modules/.bin/tsc';
const hasLocalTsc = exists(tscBin);

const groups = [
  {
    name: 'access-policy',
    required: true,
    audits: [
      ['routes', 'scripts/audit-route-access-matrix.mjs'],
      ['rbac', 'scripts/audit-rbac-alignment.mjs'],
      ['features', 'scripts/audit-feature-access-policy.mjs'],
      ['navigation', 'scripts/audit-navigation-policy.mjs'],
      ['settings-features', 'scripts/audit-settings-feature-policy.mjs'],
    ],
  },
  {
    name: 'shell',
    required: true,
    audits: [
      ['shell', 'scripts/audit-shell.mjs'],
    ],
  },
  {
    name: 'ui-contracts',
    required: true,
    audits: [
      ['unused-imports', 'scripts/audit-unused-imports.mjs'],
      ['empty-state-consumers', 'scripts/audit-empty-state-consumers.mjs'],
      ['empty-state-adapter', 'scripts/audit-empty-state-adapter-removal.mjs'],
      ['ui-props', 'scripts/audit-ui-prop-contracts.mjs'],
      ['icons', 'scripts/audit-icon-compatibility-contracts.mjs'],
      ['navigation-icons', 'scripts/audit-navigation-icon-metadata.mjs'],
      ['fontawesome-renderer', 'scripts/audit-fontawesome-renderer.mjs'],
      ['static-icons', 'scripts/audit-static-icon-surface.mjs'],
    ],
  },
  {
    name: 'targeted-typescript',
    required: strict || hasLocalTsc,
    skipReason: hasLocalTsc ? null : 'local TypeScript binary not found; run npm install, or use npm run audit:production:strict when dependency-backed TypeScript audits must be enforced',
    audits: [
      ['settings-types', 'scripts/audit-settings-type-debt.mjs'],
      ['reports-types', 'scripts/audit-reports-type-debt.mjs'],
      ['types-triage', 'scripts/audit-typescript-triage.mjs'],
    ],
  },
];

const failures = [];
const missing = [];
const skipped = [];
const results = [];

const runAudit = (groupName, label, script) => {
  if (!exists(script)) {
    missing.push({ group: groupName, name: label, script });
    failures.push(`${groupName}/${label}: missing script ${script}`);
    results.push({ group: groupName, name: label, status: 'missing', script });
    return;
  }

  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024 * 30,
    timeout: 120_000,
  });

  const stdout = result.stdout?.trim() ?? '';
  const stderr = result.stderr?.trim() ?? '';

  if (result.error?.code === 'ETIMEDOUT') {
    failures.push(`${groupName}/${label}: timed out after 120s`);
    results.push({ group: groupName, name: label, status: 'timeout', script });
    return;
  }

  if (result.status !== 0) {
    failures.push(`${groupName}/${label}: failed with exit code ${result.status ?? 'unknown'}${stderr ? `\n${stderr}` : ''}${stdout ? `\n${stdout}` : ''}`);
    results.push({ group: groupName, name: label, status: 'failed', exitCode: result.status, script });
    return;
  }

  results.push({ group: groupName, name: label, status: 'passed', script });
};

for (const group of groups) {
  if (!group.required && group.skipReason) {
    for (const [label, script] of group.audits) {
      skipped.push({ group: group.name, name: label, script, reason: group.skipReason });
      results.push({ group: group.name, name: label, status: 'skipped', script, reason: group.skipReason });
    }
    continue;
  }

  for (const [label, script] of group.audits) runAudit(group.name, label, script);
}

const requiredDocs = [
  'docs/architecture/phase48-shell-audit-consolidation.md',
  'docs/access/route-access-matrix.md',
  'docs/access/rbac-alignment.md',
  'docs/access/feature-access-policy.md',
  'docs/access/navigation-policy.md',
  'docs/access/settings-feature-policy.md',
  'docs/typescript/phase22-type-debt-triage.md',
];

for (const doc of requiredDocs) {
  if (!exists(doc)) failures.push(`required production-audit documentation missing: ${doc}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const requiredScript of ['audit:shell', 'audit:production']) {
  if (!packageJson.scripts?.[requiredScript]) failures.push(`package.json missing required script: ${requiredScript}`);
}

const summary = {
  status: failures.length > 0 ? 'failed' : 'passed',
  mode: strict ? 'strict' : 'standard',
  hasLocalTsc,
  passed: results.filter((entry) => entry.status === 'passed').length,
  skipped: skipped.length,
  failed: results.filter((entry) => ['failed', 'missing', 'timeout'].includes(entry.status)).length,
  results,
  requiredDocs,
};

if (failures.length > 0) {
  console.error('Production audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
