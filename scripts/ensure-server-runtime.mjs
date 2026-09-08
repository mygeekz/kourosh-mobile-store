import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function probeExistingKouroshApi({ port = 3001, timeoutMs = 3000 } = {}) {
  return new Promise(resolve => {
    let done = false;
    const finish = state => { if (!done) { done = true; resolve(state); } };
    const req = http.request({ hostname: '127.0.0.1', port, path: '/api/miniapp/auth', method: 'POST', headers: { 'content-type': 'application/json', 'content-length': 2 }, agent: false }, res => {
      let body = '';
      res.on('data', chunk => {
        body += chunk;
        if (body.length > 16384) { finish('occupied'); res.destroy(); }
      });
      res.on('error', () => finish('unknown'));
      res.on('end', () => {
        try {
          const value = JSON.parse(body);
          finish(res.statusCode === 401 && String(res.headers['content-type']).includes('application/json') && value.success === false && value.code === 'MINIAPP_INIT_DATA_INVALID' && typeof value.requestId === 'string' && value.requestId.length > 0 ? 'kourosh' : 'occupied');
        } catch { finish('occupied'); }
      });
    });
    req.setTimeout(timeoutMs, () => { finish('unknown'); req.destroy(); });
    req.on('error', error => finish(error.code === 'ECONNREFUSED' ? 'free' : 'unknown'));
    req.end('{}');
  });
}

export async function ensureServerRuntime({ probe = probeExistingKouroshApi, spawnRuntime = () => spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], { cwd: root, stdio: 'inherit', windowsHide: true }), intervalMs = 10000, signals = process, report = console.log } = {}) {
  const state = await probe();
  if (state !== 'free' && state !== 'kourosh') throw new Error('Port 3001 cannot safely be reused; no process started.');
  if (state === 'free') {
    // Direct Node invocation avoids Windows .cmd shell execution and leaves a
    // single owned child for signal forwarding. Equivalent to server:runtime.
    report('[server-runtime] Starting Kourosh API.');
    const child = spawnRuntime();
    return new Promise((resolve, reject) => {
      const stop = () => child.kill();
      const cleanup = () => { signals.removeListener('SIGINT', stop); signals.removeListener('SIGTERM', stop); };
      signals.once('SIGINT', stop); signals.once('SIGTERM', stop);
      child.once('error', () => { cleanup(); reject(new Error('API child failed to start.')); });
      child.once('exit', code => { cleanup(); resolve(code ?? 1); });
    });
  }
  report('[server-runtime] Reusing verified Kourosh API on 127.0.0.1:3001.');
  // Keep concurrently's dependency alive, but report loss of the dependency.
  // Never kill/restart an API owned by the Windows-login launcher.
  return new Promise(resolve => {
    let failures = 0, timer, stopped = false;
    const stop = (code = 0) => {
      stopped = true; clearTimeout(timer);
      signals.removeListener('SIGINT', onSignal); signals.removeListener('SIGTERM', onSignal);
      resolve(code);
    };
    const onSignal = () => stop();
    const check = async () => {
      const next = await probe().catch(() => 'unknown');
      if (stopped) return;
      failures = next === 'kourosh' ? 0 : failures + 1;
      if (failures >= 3) { report('[server-runtime] Existing API is no longer healthy.'); stop(1); }
      else timer = setTimeout(check, intervalMs);
    };
    signals.once('SIGINT', onSignal); signals.once('SIGTERM', onSignal);
    timer = setTimeout(check, intervalMs);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ensureServerRuntime().then(code => { process.exitCode = code; }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
