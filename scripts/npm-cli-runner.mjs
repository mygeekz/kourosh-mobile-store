import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';

/**
 * Build a cross-platform npm CLI invocation.
 *
 * Windows cannot reliably execute npm.cmd through execFileSync/spawnSync on all
 * supported Node releases. Prefer npm_execpath when npm supplied it; otherwise
 * delegate command resolution to cmd.exe, which understands .cmd launchers.
 */
export function resolveNpmInvocation(args = [], options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const nodeExecutable = options.nodeExecutable ?? process.execPath;
  const npmExecPath = env.npm_execpath;

  if (npmExecPath && fs.existsSync(npmExecPath)) {
    return {
      file: nodeExecutable,
      args: [npmExecPath, ...args],
      mode: 'npm_execpath',
    };
  }

  if (platform === 'win32') {
    return {
      file: env.ComSpec || env.COMSPEC || 'cmd.exe',
      args: ['/d', '/c', 'npm', ...args],
      mode: 'windows_cmd',
    };
  }

  return {
    file: 'npm',
    args,
    mode: 'path',
  };
}

export function execNpmSync(args = [], options = {}) {
  const invocation = resolveNpmInvocation(args, options);
  const execOptions = {
    ...options,
    env: options.env ?? process.env,
  };

  delete execOptions.platform;
  delete execOptions.nodeExecutable;

  return execFileSync(invocation.file, invocation.args, execOptions);
}
