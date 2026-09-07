#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ensureLocalPwaBuild,
  isDistCurrentForSource,
  readDistSourceFingerprint,
  readDistSourceVersion,
  validateGeneratedOutputs,
} from './ensure-local-pwa-build.mjs';

const makeValidDist = (root) => {
  const dist = path.join(root, 'dist');
  fs.mkdirSync(path.join(dist, 'icons'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><link rel="manifest" href="/manifest.webmanifest">');
  fs.writeFileSync(path.join(dist, 'sw.js'), 'self.addEventListener("fetch",()=>{});');
  fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), JSON.stringify({
    name: 'Kourosh', start_url: '/', display: 'standalone',
    icons: [{ sizes: '192x192 512x512' }],
  }));
  for (const name of ['icon-192.png', 'icon-512.png', 'maskable-512.png']) {
    fs.writeFileSync(path.join(dist, 'icons', name), 'x');
  }
};

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kourosh-pwa-ensure-v163-'));
try {
  makeValidDist(root);
  assert.equal(validateGeneratedOutputs(root), true);

  let builds = 0;
  const reuse = ensureLocalPwaBuild({
    rootDir: root,
    stdout: { write() {} }, stderr: { write() {} },
    spawnSyncImpl() { builds += 1; return { status: 0 }; },
  });
  assert.equal(reuse.action, 'reuse');
  assert.equal(builds, 0, 'Unversioned legacy install keeps established valid-dist reuse behavior');

  // A versioned install must rebuild once to establish both release and source fingerprint stamps.
  fs.writeFileSync(path.join(root, 'App.tsx'), 'initial source');
  fs.writeFileSync(path.join(root, 'KOUROSH_SOURCE_VERSION'), 'v200\n');
  assert.equal(isDistCurrentForSource(root), false);
  const releaseChanged = ensureLocalPwaBuild({
    rootDir: root,
    stdout: { write() {} }, stderr: { write() {} },
    spawnSyncImpl() { builds += 1; makeValidDist(root); return { status: 0 }; },
  });
  assert.equal(releaseChanged.action, 'built');
  assert.equal(builds, 1, 'A new release identity must rebuild stale production output once');
  assert.equal(readDistSourceVersion(root), 'v200');
  assert.match(readDistSourceFingerprint(root), /^[a-f0-9]{64}$/);

  const releaseReuse = ensureLocalPwaBuild({
    rootDir: root,
    stdout: { write() {} }, stderr: { write() {} },
    spawnSyncImpl() { builds += 1; return { status: 0 }; },
  });
  assert.equal(releaseReuse.action, 'reuse');
  assert.equal(builds, 1, 'Matching release + fingerprint must reuse dist on later starts');

  // Critical regression: staged UI work can keep the same Mini App release marker.
  // Source changes must still invalidate the compiled PWA exactly once.
  fs.writeFileSync(path.join(root, 'App.tsx'), 'changed staged UI source');
  assert.equal(isDistCurrentForSource(root), false);
  const fingerprintChanged = ensureLocalPwaBuild({
    rootDir: root,
    stdout: { write() {} }, stderr: { write() {} },
    spawnSyncImpl() { builds += 1; makeValidDist(root); return { status: 0 }; },
  });
  assert.equal(fingerprintChanged.action, 'built');
  assert.equal(builds, 2, 'Same release with changed source fingerprint must rebuild exactly once');

  const fingerprintReuse = ensureLocalPwaBuild({
    rootDir: root,
    stdout: { write() {} }, stderr: { write() {} },
    spawnSyncImpl() { builds += 1; return { status: 0 }; },
  });
  assert.equal(fingerprintReuse.action, 'reuse');
  assert.equal(builds, 2, 'Rebuilt fingerprint must be reused on the next start');

  const forced = ensureLocalPwaBuild({
    rootDir: root,
    force: true,
    stdout: { write() {} }, stderr: { write() {} },
    spawnSyncImpl() { builds += 1; makeValidDist(root); return { status: 0 }; },
  });
  assert.equal(forced.action, 'built');
  assert.equal(builds, 3, 'Forced rebuild must invoke build exactly once');

  fs.unlinkSync(path.join(root, 'dist', 'sw.js'));
  const missing = ensureLocalPwaBuild({
    rootDir: root,
    stdout: { write() {} }, stderr: { write() {} },
    spawnSyncImpl() { builds += 1; makeValidDist(root); return { status: 0 }; },
  });
  assert.equal(missing.action, 'built');
  assert.equal(builds, 4, 'Invalid dist must invoke build exactly once');

  console.log(JSON.stringify({
    unversionedLegacyReusePreserved: true,
    releaseChangeRebuildsExactlyOnce: true,
    matchingReleaseAndFingerprintReuseDist: true,
    sameReleaseSourceChangeRebuildsExactlyOnce: true,
    forcedBuildSupported: true,
    missingOutputBuildsOnce: true,
  }, null, 2));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
