const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const preload = path.resolve(__dirname, 'postcss-warning-filter.cjs');
const viteJs = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const viteCmd = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');

if (!fs.existsSync(preload)) {
  console.error(`[kourosh] PostCSS warning filter was not found at: ${preload}`);
  process.exit(1);
}

let command;
let args;
let shell = false;

if (fs.existsSync(viteJs)) {
  // Prefer the real JS entry and pass --require as a proper argv item.
  // This avoids NODE_OPTIONS path escaping issues on Windows, especially paths like D:\Kourosh\end\...
  command = process.execPath;
  args = ['--require', preload, viteJs, ...process.argv.slice(2)];
} else if (fs.existsSync(viteCmd)) {
  // Last-resort fallback. No NODE_OPTIONS is injected here, because quoted Windows paths in env
  // can be mangled by npm/concurrently. Vite still starts; only the optional warning filter is skipped.
  command = viteCmd;
  args = [...process.argv.slice(2)];
  shell = process.platform === 'win32';
} else {
  console.error('[kourosh] Vite CLI was not found. Run npm install, then try again.');
  process.exit(1);
}

const child = spawn(command, args, {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env },
  shell,
});

child.on('error', (error) => {
  console.error('[kourosh] Failed to start Vite:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
