import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kourosh-pwa-runtime-'));
const dist = path.join(tempRoot, 'dist');
fs.mkdirSync(path.join(dist, 'icons'), { recursive: true });
fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });

fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><html><head><link rel="manifest" href="/manifest.webmanifest"></head><body>KOUROSH_TEST_SHELL</body></html>');
fs.writeFileSync(path.join(dist, 'sw.js'), 'self.addEventListener("install", () => self.skipWaiting());');
fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), JSON.stringify({
  id: '/',
  name: 'Kourosh Runtime Test',
  short_name: 'Kourosh',
  start_url: '/#/',
  display: 'standalone',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}));
for (const icon of ['icon-192.png', 'icon-512.png', 'maskable-512.png']) {
  fs.writeFileSync(path.join(dist, 'icons', icon), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
}
fs.writeFileSync(path.join(dist, 'assets', 'app-12345678.js'), 'console.log("runtime test");');

const api = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({
    path: req.url,
    forwardedFor: req.headers['x-forwarded-for'] || '',
    forwardedHost: req.headers['x-forwarded-host'] || '',
    forwardedProto: req.headers['x-forwarded-proto'] || '',
  }));
});

const listen = (server) => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(server.address()));
});

const closeServer = (server) => new Promise((resolve) => server.close(resolve));

let runtime;
try {
  const apiAddress = await listen(api);
  assert.equal(typeof apiAddress, 'object');

  runtime = spawn(process.execPath, [path.join(root, 'scripts', 'serve-local-pwa.mjs')], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      KOUROSH_PWA_TEST_HTTP: '1',
      KOUROSH_PWA_DIST_DIR: dist,
      KOUROSH_PWA_PORT: '0',
      KOUROSH_API_HOST: '127.0.0.1',
      KOUROSH_API_PORT: String(apiAddress.port),
      LOCAL_HOSTS_IP: '127.0.0.1',
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });

  const logs = [];
  runtime.stdout.on('data', (chunk) => logs.push(String(chunk)));
  runtime.stderr.on('data', (chunk) => logs.push(String(chunk)));
  const ready = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Runtime readiness timeout:\n${logs.join('')}`)), 12_000);
    runtime.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Runtime exited before readiness with ${code}:\n${logs.join('')}`));
    });
    runtime.on('message', (message) => {
      if (message?.type !== 'kourosh-pwa-runtime-ready') return;
      clearTimeout(timer);
      resolve(message);
    });
  });
  assert.equal(ready.protocol, 'http');
  const origin = `http://127.0.0.1:${ready.port}`;

  const index = await fetch(`${origin}/`);
  assert.equal(index.status, 200);
  assert.match(index.headers.get('content-type') || '', /^text\/html/);
  assert.match(index.headers.get('cache-control') || '', /no-store/);
  assert.match(await index.text(), /KOUROSH_TEST_SHELL/);

  const worker = await fetch(`${origin}/sw.js`);
  assert.equal(worker.status, 200);
  assert.match(worker.headers.get('content-type') || '', /^text\/javascript/);
  assert.equal(worker.headers.get('service-worker-allowed'), '/');
  assert.match(worker.headers.get('cache-control') || '', /no-store/);
  const etag = worker.headers.get('etag');
  assert.ok(etag);
  const notModified = await fetch(`${origin}/sw.js`, { headers: { 'If-None-Match': etag } });
  assert.equal(notModified.status, 304);

  const manifest = await fetch(`${origin}/manifest.webmanifest`);
  assert.equal(manifest.status, 200);
  assert.match(manifest.headers.get('content-type') || '', /^application\/manifest\+json/);

  const asset = await fetch(`${origin}/assets/app-12345678.js`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('cache-control') || '', /immutable/);

  const missingAsset = await fetch(`${origin}/missing.js`);
  assert.equal(missingAsset.status, 404);
  assert.doesNotMatch(await missingAsset.text(), /KOUROSH_TEST_SHELL/);

  const spaFallback = await fetch(`${origin}/settings/local`);
  assert.equal(spaFallback.status, 200);
  assert.match(await spaFallback.text(), /KOUROSH_TEST_SHELL/);

  const health = await fetch(`${origin}/__kourosh/pwa-health`);
  const healthPayload = await health.json();
  assert.deepEqual(healthPayload, {
      ok: true,
      runtime: 'kourosh-local-pwa',
      secure: false,
      serviceWorker: '/sw.js',
      manifest: '/manifest.webmanifest',
      network: {
        publicHost: '127.0.0.1',
        publicPort: ready.port,
        publicUrl: `${origin}/#/`,
        bindAddress: '127.0.0.1',
        shareable: false,
        hostDevice: true,
        remoteAccessVerified: false,
      },
    });

  const healthPost = await fetch(`${origin}/__kourosh/pwa-health`, { method: 'POST' });
  assert.equal(healthPost.status, 405);

  const proxied = await fetch(`${origin}/api/runtime-check?source=test`);
  assert.equal(proxied.status, 200);
  const proxyBody = await proxied.json();
  assert.equal(proxyBody.path, '/api/runtime-check?source=test');
  assert.equal(proxyBody.forwardedProto, 'http');
  assert.equal(proxyBody.forwardedHost, `127.0.0.1:${ready.port}`);
  assert.ok(proxyBody.forwardedFor);

  const staticPost = await fetch(`${origin}/`, { method: 'POST' });
  assert.equal(staticPost.status, 405);

  console.log('Local PWA server runtime integration test passed (static shell, strict asset 404, SPA fallback, MIME, cache policy, health and same-origin API proxy).');
} finally {
  if (runtime && runtime.exitCode === null) {
    runtime.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => runtime.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
    if (runtime.exitCode === null) runtime.kill('SIGKILL');
  }
  if (api.listening) await closeServer(api);
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
