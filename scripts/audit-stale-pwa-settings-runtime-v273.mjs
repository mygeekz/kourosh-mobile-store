#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const modalStack = read('pages/settings/SettingsModalStack.tsx');
const controller = read('pages/settings/SettingsController.tsx');
const ensure = read('scripts/ensure-local-pwa-build.mjs');

assert.match(controller, /const renderCtx = \{[\s\S]*?\beditUserFormErrors,/, 'Settings render context must expose editUserFormErrors.');
assert.match(controller, /const renderCtx = \{[\s\S]*?\bsetResetPasswordErrors,/, 'Settings render context must expose setResetPasswordErrors.');
assert.match(modalStack, /const \{[\s\S]*?\beditUserFormErrors,[\s\S]*?\} = ctx;/, 'SettingsModalStack must destructure editUserFormErrors from ctx.');
assert.match(modalStack, /const \{[\s\S]*?\bsetResetPasswordErrors,[\s\S]*?\} = ctx;/, 'SettingsModalStack must destructure setResetPasswordErrors from ctx.');
assert.match(modalStack, /editUserFormErrors=\{editUserFormErrors\}/, 'SettingsModalStack must pass editUserFormErrors to SettingsUsersModals.');
assert.match(modalStack, /setResetPasswordErrors=\{setResetPasswordErrors\}/, 'SettingsModalStack must pass setResetPasswordErrors to SettingsUsersModals.');

assert.match(ensure, /DIST_FINGERPRINT_FILE = '\.kourosh-source-fingerprint'/, 'PWA build ensure must persist a source fingerprint.');
assert.match(ensure, /computeSourceFingerprint/, 'PWA build ensure must compute a deterministic source fingerprint.');
assert.match(ensure, /!distFingerprint/, 'A legacy dist without a fingerprint must be considered stale.');
assert.match(ensure, /distFingerprint === currentFingerprint/, 'PWA reuse must require a matching source fingerprint.');
assert.doesNotMatch(
  ensure,
  /return readDistSourceVersion\(rootDir\) === sourceVersion;/,
  'Version-only dist reuse must not return after staged UI releases.',
);

console.log(JSON.stringify({
  status: 'PASS',
  issue: 'Settings editUserFormErrors runtime crash persisted because start:https could reuse an older dist/ when staged UI source changed without changing the Mini App release marker.',
  settingsContextFixedInSource: true,
  resetPasswordSetterContextFixedInSource: true,
  versionOnlyPwaReuseRetired: true,
  sourceFingerprintRequiredForReuse: true,
  legacyDistWithoutFingerprintRebuildsOnce: true,
}, null, 2));
