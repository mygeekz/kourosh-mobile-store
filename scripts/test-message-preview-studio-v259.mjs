import assert from 'node:assert/strict';
import fs from 'node:fs';
import { KOUROSH_RELEASE } from './lib/kourosh-release.mjs';

const read = (file) => fs.readFileSync(file, 'utf8');
const smsStudio = read('components/SmsPatternStudioModal.tsx');
const telegramStudio = read('components/TelegramTemplateTestModal.tsx');
const modalStack = read('pages/settings/SettingsModalStack.tsx');
const smsActions = read('pages/settings/useSettingsSmsOperationActions.ts');
const smsPanel = read('pages/settings/SettingsSmsPanel.tsx');
const telegramPanel = read('pages/settings/SettingsTelegramPanel.tsx');

assert.ok(Number(KOUROSH_RELEASE.slice(1)) >= 259, `expected v259 or a compatible successor; found ${KOUROSH_RELEASE}`);

// SMS: one runtime modal, two entry points, shared token state, explicit validation/send flow.
assert.match(modalStack, /SmsPatternStudioModal/);
assert.doesNotMatch(modalStack, /<SmsPatternTestModal/);
assert.doesNotMatch(modalStack, /<SmsPatternPreviewModal/);
assert.match(smsStudio, /data-ui-sms-pattern-studio="v259"/);
assert.match(smsStudio, /پیش‌نمایش و متغیرها/);
assert.match(smsStudio, /اعتبارسنجی و ارسال تست/);
assert.match(smsStudio, /متن اصلی پترن در پنل ملی‌پیامک تعریف می‌شود/);
assert.doesNotMatch(smsStudio, /پیش‌نمایش پیش‌نمایش پیام/);
assert.doesNotMatch(smsStudio, /متن واقعی پترن در پنل سرویس‌دهنده ذخیره تغییرات می‌شود/);
assert.match(smsStudio, /setValues\(tokenLabels\.map\(\(\) => ''\)\)/);
assert.match(smsStudio, /setTo\(''\)/);
assert.match(smsStudio, /patternIdentity/);
assert.match(smsStudio, /fetchAllowedSmsTestRecipients/);
assert.match(smsStudio, /allowlistReady/);
assert.doesNotMatch(smsStudio, /placeholder="مثلاً 09121234567"/);
assert.match(smsStudio, /tokensReady/);
assert.match(smsStudio, /\/api\/sms\/check-pattern/);
assert.match(smsActions, /previewTemplate = ''/);
assert.match(smsActions, /bodyId = ''/);
assert.match(smsPanel, /openSmsPatternPreview\([^\n]+pattern\.previewTemplate[^\n]+pattern\.tokens, value\)/);
assert.match(smsPanel, /openSmsPatternCheck\([^\n]+value, pattern\.tokens, pattern\.previewTemplate/);
assert.match(telegramPanel, /کد تأیید اتصال تلگرام: \{1\}/);

// Telegram: existing single modal becomes a preview -> validation -> send studio and resets on template identity changes.
assert.match(telegramStudio, /data-ui-telegram-template-studio="v258"/);
assert.match(telegramStudio, /پیش‌نمایش، اعتبارسنجی و ارسال تست/);
assert.match(telegramStudio, /انتخاب .* فقط اطلاعات نمونه پیش‌نمایش را پر می‌کند/);
assert.match(telegramStudio, /Chat ID تست\/مدیریت/);
assert.match(telegramStudio, /templateIdentity/);
assert.match(telegramStudio, /setActiveTab\('preview'\)/);
assert.match(telegramStudio, /setValues\(buildSampleValues\(null\)\)/);
assert.match(telegramStudio, /validation\.unknown\.length === 0/);
assert.match(telegramStudio, /missingValues\.length === 0/);
assert.match(telegramStudio, /\/api\/telegram\/check-message/);
assert.match(telegramStudio, /پیام به مشتری\/همکار انتخاب‌شده ارسال نمی‌شود/);

assert.match(smsStudio, /TextField/);
assert.doesNotMatch(smsStudio, /<input\b/);
assert.match(telegramStudio, /TextField/);
assert.doesNotMatch(telegramStudio, /<input\b/);
assert.match(smsStudio, /role="tab"/);
assert.match(telegramStudio, /role="tab"/);

console.log(JSON.stringify({
  status: 'PASS',
  release: KOUROSH_RELEASE,
  smsUnifiedStudio: true,
  telegramStagedStudio: true,
  stateResetOnTemplateSwitch: true,
  preSendValidation: true,
}, null, 2));
