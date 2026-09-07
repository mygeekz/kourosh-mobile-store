import { spawnSync } from 'node:child_process';

const bin = process.platform === 'win32' ? './node_modules/.bin/tsc.cmd' : './node_modules/.bin/tsc';
const result = spawnSync(bin, ['-p', 'config/typescript-audits/tsconfig.settings.audit.json', '--pretty', 'false'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  timeout: 90_000,
  maxBuffer: 1024 * 1024 * 20,
});

if (result.error?.code === 'ETIMEDOUT') {
  console.error('Settings type-debt audit timed out.');
  process.exit(1);
}

const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
if (result.status !== 0) {
  if (output) console.error(output);
  process.exit(result.status ?? 1);
}

console.log('Settings type-debt audit passed: no structural diagnostics remain in Settings target files.');
