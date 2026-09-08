import { spawnSync } from 'node:child_process';

// Local release checks. Fixtures use memory databases and mocked/loopback
// transports; this runner does not deploy or send real Telegram messages.
const tests = [
  ['scripts/test-ensure-server-runtime.mjs', []],
  ['scripts/test-miniapp-store-connectivity-v250.mjs', ['--experimental-strip-types']],
  ['scripts/test-miniapp-availability-state-v253.mjs', ['--experimental-strip-types']],
  ['server/tests/telegramIdentityAuthorizationV148.test.ts', ['--import', 'tsx']],
  ['server/tests/miniAppStaffV149.test.ts', ['--import', 'tsx']],
  ['scripts/test-telegram-manager-identity.mjs', []],
  ['scripts/test-miniapp-release-identity-e2e.mjs', ['--experimental-strip-types', '--experimental-loader', './scripts/ts-runtime-loader-v163.mjs']],
  ['scripts/test-miniapp-snapshot-contract-v165.mjs', ['--experimental-strip-types', '--experimental-loader', './scripts/ts-runtime-loader-v163.mjs']],
  ['scripts/test-miniapp-snapshot-sync-v166.mjs', ['--experimental-strip-types', '--experimental-loader', './scripts/ts-runtime-loader-v163.mjs']],
  ['scripts/test-miniapp-edge-v167.mjs', []],
  ['scripts/test-miniapp-offline-edge-v192.mjs', []],
  ['scripts/test-miniapp-snapshot-runtime-v193.mjs', []],
  ['scripts/test-telegram-manager-read-snapshot-v362.mjs', []],
  ['scripts/test-telegram-manager-d1-schema-v362.mjs', []],
  ['scripts/test-telegram-partner-rebind-v361.mjs', []],
  ['scripts/test-telegram-webhook-failover-v356.mjs', ['--experimental-strip-types']],
  ['scripts/test-telegram-system-transport-v359.mjs', ['--experimental-strip-types', '--experimental-loader', './scripts/ts-extension-loader.mjs']],
  ['scripts/test-telegram-management-stage3-permissions-v348.mjs', ['--experimental-strip-types']],
  ['scripts/test-telegram-management-stage8-security-v353.mjs', ['--experimental-strip-types']],
  ['scripts/test-miniapp-cloudflare-prepare-v267.mjs', []],
];
let failed = 0;
for (const [file, flags] of tests) {
  const result = spawnSync(process.execPath, [...flags, file], { encoding: 'utf8', timeout: 120000 });
  const passed = result.status === 0;
  if (!passed) failed++;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${file}`);
  if (!passed) console.log(result.error?.message || `${result.stdout}\n${result.stderr}`);
}
console.log(JSON.stringify({ total: tests.length, passed: tests.length - failed, failed }));
process.exitCode = failed ? 1 : 0;
