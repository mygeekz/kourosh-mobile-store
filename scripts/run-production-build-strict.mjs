import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { resolveNpmInvocation } from './npm-cli-runner.mjs';

const invocation = resolveNpmInvocation(['run', 'build']);
const result = spawnSync(invocation.file, invocation.args, {
  cwd: process.cwd(),
  env: process.env,
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 64,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.error) {
  console.error(`[setup] ERROR: production build could not start: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`[setup] ERROR: production build failed with exit code ${result.status ?? 'unknown'}.`);
  process.exit(result.status ?? 1);
}

const combinedOutput = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  .replace(/\u001B\[[0-?]*[ -\/]*[@-~]/g, '');

const cssSyntaxWarningCount = (combinedOutput.match(/\[css-syntax-error\]/g) ?? []).length;
if (cssSyntaxWarningCount > 0) {
  console.error(`[setup] ERROR: production build emitted ${cssSyntaxWarningCount} CSS syntax warning(s).`);
  console.error('[setup] Fix the source selectors before considering Setup successful.');
  process.exit(1);
}

console.log('[setup] Production build passed without CSS syntax warnings.');
