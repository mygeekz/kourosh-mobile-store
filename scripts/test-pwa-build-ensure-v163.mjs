#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ensureLocalPwaBuild,
  isDistCurrentForSource,
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
  assert.equal(builds, 0, 'Valid dist must never invoke Vite during normal startup');

  // Arbitrary source mtimes still do not trigger a scan/rebuild.
  fs.writeFileSync(path.join(root, 'App.tsx'), 'changed source');
  const afterSourceChange = ensureLocalPwaBuild({
    rootDir: root,
    stdout: { write() {} }, stderr: { write() {} },
    spawnSyncImpl() { builds += 1; return { status: 0 }; },
  });
  assert.equal(afterSourceChange.action, 'reuse');
  assert.equal(builds, 0, 'Source mtimes/content must not force a restart-time build when dist is valid');

  // Extracting a versioned release must invalidate an older valid dist exactly once.
  fs.writeFileSync(path.join(root, 'KOUROSH_SOURCE_VERSION'), 'v200\n');
  assert.equal(isDistCurrentForSource(root), false);
  const releaseChanged = ensureLocalPwaBuild({
    rootDir: root,
    stdout: { write() {} }, stderr: { write() {} },
    spawnSyncImpl() { builds += 1; makeValidDist(root); return { status: 0 }; },
  });
  assert.equal(releaseChanged.action, 'built');
  assert.equal(builds, 1, 'A new release marker must rebuild stale production output once');
  assert.equal(readDistSourceVersion(root), 'v200');

  const releaseReuse = ensureLocalPwaBuild({
    rootDir: root,
    stdout: { write() {} }, stderr: { write() {} },
    spawnSyncImpl() { builds += 1; return { status: 0 }; },
  });
  assert.equal(releaseReuse.action, 'reuse');
  assert.equal(builds, 1, 'The rebuilt matching release must be reused on later starts');

  const forced = ensureLocalPwaBuild({
    rootDir: root,
    force: true,
    stdout: { write() {} }, stderr: { write() {} },
    spawnSyncImpl() { builds += 1; makeValidDist(root); return { status: 0 }; },
  });
  assert.equal(forced.action, 'built');
  assert.equal(builds, 2, 'Forced rebuild must invoke build exactly once');

  fs.unlinkSync(path.join(root, 'dist', 'sw.js'));
  const missing = ensureLocalPwaBuild({
    rootDir: root,
    stdout: { write() {} }, stderr: { write() {} },
    spawnSyncImpl() { builds += 1; makeValidDist(root); return { status: 0 }; },
  });
  assert.equal(missing.action, 'built');
  assert.equal(builds, 3, 'Invalid dist must invoke build exactly once');

  console.log(JSON.stringify({
    validDistReusedWithoutBuild: true,
    sourceChangeDoesNotForceRestartBuild: true,
    releaseChangeRebuildsExactlyOnce: true,
    matchingReleaseReusesDist: true,
    forcedBuildSupported: true,
    missingOutputBuildsOnce: true,
  }, null, 2));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
