import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { X509Certificate } from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootCaPath = path.join(root, 'certs', 'current-ca.crt');
const leafCertificatePath = path.join(root, 'certs', 'current-cert.cer');
const runtimeConfigPath = path.join(root, 'certs', 'local-domain-runtime.json');
const serverPath = path.join(root, 'scripts', 'serve-local-pwa.mjs');

if (!fs.existsSync(rootCaPath)) {
  throw new Error('current-ca.crt is missing; run npm run https:bootstrap first.');
}

const ca = fs.readFileSync(rootCaPath);
const rootCertificate = new X509Certificate(ca);
const expectedLeafCertificate = new X509Certificate(fs.readFileSync(leafCertificatePath));
const runtimeConfig = JSON.parse(fs.readFileSync(runtimeConfigPath, 'utf8'));
const targetDomain = String(runtimeConfig.targetDomain || '').trim();
const publishedIpAddresses = Array.isArray(runtimeConfig.certificateIpAddresses)
  ? runtimeConfig.certificateIpAddresses.map((value) => String(value || '').trim()).filter(Boolean)
  : [];
const publishedLanIp = publishedIpAddresses.find((value) => value !== '127.0.0.1') || '127.0.0.1';
assert.ok(targetDomain, 'local-domain-runtime.json must publish the active HTTPS domain.');
assert.notEqual(publishedLanIp, '127.0.0.1', 'The production HTTPS test requires a real non-loopback LAN IP.');
assert.equal(rootCertificate.ca, true);
assert.equal(rootCertificate.subject, rootCertificate.issuer);
assert.equal(rootCertificate.verify(rootCertificate.publicKey), true);
let runtime;

const request = (port, pathname, method = 'GET', headers = {}, servername = '', connectHost = '127.0.0.1') => new Promise((resolve, reject) => {
  const req = https.request({
    host: connectHost,
    port,
    path: pathname,
    method,
    ca,
    rejectUnauthorized: true,
    ...(servername ? { servername } : {}),
    headers,
  }, (res) => {
    const chunks = [];
    const peerCertificateRaw = res.socket?.getPeerCertificate(true)?.raw;
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => resolve({
      status: res.statusCode || 0,
      headers: res.headers,
      body: Buffer.concat(chunks).toString('utf8'),
      peerCertificateRaw,
    }));
  });
  req.setTimeout(10_000, () => req.destroy(new Error('HTTPS runtime request timed out')));
  req.on('error', reject);
  req.end();
});

try {
  const logs = [];
  runtime = spawn(process.execPath, [serverPath], {
    cwd: root,
    env: {
      ...process.env,
      KOUROSH_PWA_HOST: '0.0.0.0',
      KOUROSH_PWA_PORT: '0',
      LOCAL_HOSTS_IP: publishedLanIp,
      // A stale machine-level override used to make the runtime serve a leaf
      // that differed from the certificate validated by https:bootstrap.
      HTTPS_PFX_FILE: path.join(root, 'certs', 'stale-external-cert.pfx'),
      HTTPS_CERT_FILE: path.join(root, 'certs', 'stale-external-cert.pem'),
      HTTPS_KEY_FILE: path.join(root, 'certs', 'stale-external-key.pem'),
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  runtime.stdout.on('data', (chunk) => logs.push(String(chunk)));
  runtime.stderr.on('data', (chunk) => logs.push(String(chunk)));

  const ready = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`HTTPS runtime readiness timeout:\n${logs.join('')}`)), 15_000);
    runtime.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`HTTPS runtime exited before readiness with ${code}:\n${logs.join('')}`));
    });
    runtime.on('message', (message) => {
      if (message?.type !== 'kourosh-pwa-runtime-ready') return;
      clearTimeout(timer);
      resolve(message);
    });
  });

  assert.equal(ready.protocol, 'https');
  assert.ok(Number.isInteger(ready.port) && ready.port > 0);
  assert.equal(ready.bindAddress, '0.0.0.0', 'The production runtime must listen on every IPv4 interface, not loopback only.');
  assert.equal(ready.publicHost, publishedLanIp, 'The runtime must publish the certificate-verified LAN IP.');

  const health = await request(ready.port, '/__kourosh/pwa-health', 'GET', {}, targetDomain);
  assert.equal(health.status, 200);
  assert.ok(health.peerCertificateRaw, 'The runtime must expose a readable peer certificate.');
  const servedLeafCertificate = new X509Certificate(health.peerCertificateRaw);
  assert.equal(
    servedLeafCertificate.fingerprint256,
    expectedLeafCertificate.fingerprint256,
    'The runtime must serve the exact leaf certificate validated by https:bootstrap.',
  );
  assert.ok(
    servedLeafCertificate.checkIP(publishedLanIp),
    `The certificate actually served by the runtime must contain LAN IP ${publishedLanIp} as an IP SAN.`,
  );
  assert.deepEqual(JSON.parse(health.body), {
    ok: true,
    runtime: 'kourosh-local-pwa',
    secure: true,
    serviceWorker: '/sw.js',
    manifest: '/manifest.webmanifest',
    network: {
      publicHost: publishedLanIp,
      publicPort: ready.port,
      publicUrl: `https://${publishedLanIp}:${ready.port}/#/`,
      bindAddress: '0.0.0.0',
      shareable: true,
      hostDevice: true,
      remoteAccessVerified: false,
    },
  });

  assert.match(
    logs.join(''),
    new RegExp(`Production runtime ready: https://${publishedLanIp.replace(/\./g, '\\.')}:`),
    'The runtime must publish the same LAN IP that was verified in the served certificate.',
  );

  const domainHealth = await request(ready.port, '/__kourosh/pwa-health', 'GET', {}, targetDomain);
  assert.equal(domainHealth.status, 200, 'The trusted certificate must verify the configured DNS SAN as well as the LAN IP SAN.');

  const worker = await request(ready.port, '/sw.js', 'HEAD');
  assert.equal(worker.status, 200);
  assert.match(worker.headers['content-type'] || '', /^text\/javascript/);
  assert.equal(worker.headers['service-worker-allowed'], '/');
  assert.match(worker.headers['cache-control'] || '', /no-store/);

  const manifest = await request(ready.port, '/manifest.webmanifest', 'HEAD');
  assert.equal(manifest.status, 200);
  assert.match(manifest.headers['content-type'] || '', /^application\/manifest\+json/);
  assert.match(manifest.headers['cache-control'] || '', /no-store/);

  const shell = await request(ready.port, '/settings/local');
  assert.equal(shell.status, 200);
  assert.match(shell.headers['content-type'] || '', /^text\/html/);
  assert.match(shell.body, /manifest\.webmanifest/);

  const missingWorker = await request(ready.port, '/missing-sw.js');
  assert.equal(missingWorker.status, 404);
  assert.doesNotMatch(missingWorker.body, /manifest\.webmanifest/);

  console.log('Local PWA HTTPS runtime test passed (trusted Root CA verification, TLS/IP SAN, production shell, manifest, service worker headers and strict asset 404).');
} finally {
  if (runtime && runtime.exitCode === null) {
    runtime.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => runtime.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
    if (runtime.exitCode === null) runtime.kill('SIGKILL');
  }
}
