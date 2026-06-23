import { spawnSync } from 'node:child_process';

const configs = [
  ['components', 'config/typescript-audits/tsconfig.type-triage.components.json'],
  ['utils', 'config/typescript-audits/tsconfig.type-triage.utils.json'],
  ['hooks', 'config/typescript-audits/tsconfig.type-triage.hooks.json'],
  ['contexts', 'config/typescript-audits/tsconfig.type-triage.contexts.json'],
  ['dashboard', 'config/typescript-audits/tsconfig.type-triage.dashboard.json'],
];

const bin = process.platform === 'win32' ? './node_modules/.bin/tsc.cmd' : './node_modules/.bin/tsc';
const failures = [];

for (const [label, config] of configs) {
  const result = spawnSync(bin, ['-p', config, '--pretty', 'false'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 45_000,
    maxBuffer: 1024 * 1024 * 20,
  });

  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (result.error?.code === 'ETIMEDOUT') {
    failures.push(`${label}: timed out while running ${config}`);
    continue;
  }
  if (result.status !== 0) {
    failures.push(`${label}: ${config} failed\n${output}`);
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
