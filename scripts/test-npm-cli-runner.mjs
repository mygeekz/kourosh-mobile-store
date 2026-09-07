import assert from 'node:assert/strict';
import { resolveNpmInvocation } from './npm-cli-runner.mjs';

const windows = resolveNpmInvocation(['--version'], {
  platform: 'win32',
  env: { ComSpec: 'C:\\Windows\\System32\\cmd.exe' },
  nodeExecutable: 'C:\\Program Files\\nodejs\\node.exe',
});
assert.equal(windows.file, 'C:\\Windows\\System32\\cmd.exe');
assert.deepEqual(windows.args, ['/d', '/c', 'npm', '--version']);
assert.equal(windows.mode, 'windows_cmd');

const posix = resolveNpmInvocation(['--version'], {
  platform: 'linux',
  env: {},
  nodeExecutable: '/usr/bin/node',
});
assert.equal(posix.file, 'npm');
assert.deepEqual(posix.args, ['--version']);
assert.equal(posix.mode, 'path');

console.log('npm CLI runner tests passed');
