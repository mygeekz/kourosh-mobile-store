import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SMS_TEST_RECIPIENT_MAX_ITEMS,
  authorizeSmsTestRecipient,
  parseSmsTestRecipientAllowlist,
  serializeSmsTestRecipientAllowlist,
} from '../shared/smsTestRecipients.ts';

const read = (file) => fs.readFileSync(file, 'utf8');

const serialized = serializeSmsTestRecipientAllowlist([
  { phone: '۰۹۱۲ ۱۲۳ ۴۵۶۷', label: 'مدیر فروشگاه', enabled: true },
  { phone: '+989351112222', label: 'شماره دوم', enabled: false },
]);
const parsed = parseSmsTestRecipientAllowlist(serialized);
assert.deepEqual(parsed, [
  { phone: '09121234567', label: 'مدیر فروشگاه', enabled: true },
  { phone: '09351112222', label: 'شماره دوم', enabled: false },
]);
assert.equal(SMS_TEST_RECIPIENT_MAX_ITEMS, 10);
assert.equal(authorizeSmsTestRecipient('[]', '09121234567').code, 'SMS_TEST_ALLOWLIST_EMPTY');
assert.equal(authorizeSmsTestRecipient(serialized, '123').code, 'SMS_TEST_RECIPIENT_INVALID');
assert.equal(authorizeSmsTestRecipient(serialized, '09351112222').code, 'SMS_TEST_RECIPIENT_NOT_ALLOWED');
assert.equal(authorizeSmsTestRecipient(serialized, '09129999999').code, 'SMS_TEST_RECIPIENT_NOT_ALLOWED');
const allowed = authorizeSmsTestRecipient(serialized, '+98 912 123 4567');
assert.equal(allowed.ok, true);
assert.equal(allowed.ok ? allowed.recipient : '', '09121234567');

const route = read('server/routes/smsDiagnostics.routes.ts');
assert.match(route, /authorizeRole\(\["Admin", "Manager"\]\)/, 'Admin/Manager test send remains role protected');
assert.match(route, /\/api\/sms\/test-recipients/);
assert.equal((route.match(/authorizeSmsTestRecipient\(settings\[SMS_TEST_RECIPIENT_ALLOWLIST_SETTING_KEY\], to\)/g) || []).length, 2, 'single and bulk test routes must both enforce allowlist');
assert.match(route, /SMS_TEST_RECIPIENT_NOT_ALLOWED|authorizeSmsTestRecipient/);

const settingsRoute = read('server/routes/settings.routes.ts');
assert.match(settingsRoute, /app\.post\("\/api\/settings", authorizeRole\(\["Admin"\]\)/, 'only Admin may persist allowlist settings');
assert.match(settingsRoute, /SMS_TEST_RECIPIENT_ALLOWLIST_SETTING_KEY/);
assert.match(settingsRoute, /sanitizeSmsTestRecipients/);
assert.match(settingsRoute, /فهرست شماره‌های مجاز تست پیامک/);

const panel = read('pages/settings/SettingsSmsPanel.tsx');
assert.match(panel, /SmsTestRecipientAllowlistCard/);
assert.match(panel, /sms-test-allowlist-section/);
assert.match(read('components/SmsTestRecipientAllowlistCard.tsx'), /حداکثر/);
assert.match(read('components/SmsTestRecipientAllowlistCard.tsx'), /سمت سرور/);

const studio = read('components/SmsPatternStudioModal.tsx');
assert.match(studio, /fetchAllowedSmsTestRecipients/);
assert.match(studio, /شماره مجاز مقصد تست پیامک/);
assert.match(studio, /Allowlist ذخیره‌شده روی سرور/);
assert.doesNotMatch(studio, /placeholder="مثلاً 09121234567"/);

const bulk = read('components/SmsBulkTestModal.tsx');
assert.match(bulk, /fetchAllowedSmsTestRecipients/);
assert.match(bulk, /ارسال گروهی نیز فقط به Allowlist/);
assert.doesNotMatch(bulk, /<input className="app-input" value=\{recipient\}/);

const errors = read('utils/smsErrorMessage.ts');
assert.match(errors, /مقصد تست در فهرست مجاز نیست/);

console.log(JSON.stringify({
  status: 'PASS',
  release: 'v259',
  allowlistStoredInSettings: true,
  singleSendServerEnforced: true,
  bulkSendServerEnforced: true,
  arbitraryRecipientInputRemoved: true,
  adminManagedAllowlist: true,
}, null, 2));
