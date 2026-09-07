import assert from 'node:assert/strict';
import fs from 'node:fs';

const version = fs.readFileSync('KOUROSH_SOURCE_VERSION', 'utf8').trim();
const release = Number(version.slice(1));
const identity = fs.readFileSync('server/services/telegramIdentitySecurity.service.ts', 'utf8');
const runtime = fs.readFileSync('server/cloud/snapshots/miniAppSnapshotRuntime.ts', 'utf8');
const repo = fs.readFileSync('server/repositories/miniAppIdentity.repo.ts', 'utf8');

assert.match(version, /^v\d+$/);
assert.ok(release >= 248, `expected v248 or a compatible successor; found ${version}`);
assert.match(identity, /requestMiniAppSnapshotRefreshAfterIdentityChange/);
assert.match(identity, /import\("\.\.\/cloud\/snapshots\/miniAppSnapshotRuntime"\)/);

if (release >= 251) {
  assert.match(identity, /requestMiniAppIdentitySnapshotSync\(\{ kind, localSubjectId, expectedTelegramUserId \}\)/);
  const targetedCalls = (identity.match(/requestMiniAppSnapshotRefreshAfterIdentityChange\("(?:customer|partner)"/g) || []).length;
  assert.ok(targetedCalls >= 5, `expected at least 5 targeted identity-change sync triggers, found ${targetedCalls}`);
  if (release >= 361) {
    assert.match(identity, /TELEGRAM_PARTNER_LINKED/);
    assert.match(identity, /return \{ ok: true, code: isExplicitRebind \? "RELINKED" : "LINKED"/);
  } else {
    assert.match(identity, /TELEGRAM_PARTNER_LINKED[\s\S]{0,260}return \{ ok: true, code: "LINKED"/);
  }
  assert.match(identity, /linkCustomerTelegramIdentityById[\s\S]{0,1900}requestMiniAppSnapshotRefreshAfterIdentityChange\("customer", customerId, telegramUserId\)/);
  assert.match(identity, /linkPartnerTelegramIdentityById[\s\S]{0,1900}requestMiniAppSnapshotRefreshAfterIdentityChange\("partner", partnerId, telegramUserId\)/);
  assert.match(identity, /unlinkCustomerTelegramIdentity[\s\S]{0,1600}requestMiniAppSnapshotRefreshAfterIdentityChange\("customer", customerId, null\)/);
  assert.match(identity, /unlinkPartnerTelegramIdentity[\s\S]{0,1600}requestMiniAppSnapshotRefreshAfterIdentityChange\("partner", partnerId, null\)/);
} else {
  assert.match(identity, /requestMiniAppSnapshotRefresh\(delayMs\)/);
  const refreshCalls = (identity.match(/requestMiniAppSnapshotRefreshAfterIdentityChange\(\);/g) || []).length;
  assert.ok(refreshCalls >= 5, `expected at least 5 identity-change refresh triggers, found ${refreshCalls}`);
}

assert.match(runtime, /const DEFAULT_INTERVAL_MS = 5 \* 60 \* 1000/);
assert.match(runtime, /Math\.max\(1000, delayMs\)/);

// Security invariant: Mini App authentication continues to use telegram_user_id only;
// delivery chat ids are never promoted to authentication identity.
assert.match(repo, /partners WHERE telegram_user_id = \?/);
assert.doesNotMatch(repo, /findPartnerIdentities[\s\S]{0,800}(telegramChatId|telegram_chat_id)/);

console.log(JSON.stringify({
  status: 'PASS',
  regression: {
    identityChangesTriggerSnapshotRefresh: true,
    partnerLinkRefreshesImmediately: true,
    customerLinkRefreshesImmediately: true,
    unlinkTriggersRevocationRefresh: true,
    periodicReconciliationStillPresent: true,
    chatIdNotUsedAsMiniAppAuthentication: true,
    targetedIdentitySyncCoordinator: release >= 251,
  },
}, null, 2));
