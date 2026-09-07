import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MELI_PAYAMAK_PATTERN_DEFINITIONS,
  TELEGRAM_TEMPLATE_DEFINITIONS,
  buildMeliPayamakPatternTokens,
  buildTelegramTemplatePreset,
  cleanAppMessage,
} from '../shared/messages.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const bad = [
  'عملیات ناعملیات با موفقیت انجام شد بود',
  'ثبت اطلاعات نشده است',
  'ثبت اطلاعات گردید',
  'تماس حاصل فرمایید',
  'به موقع',
  'فروشگاه کوروش. موبایل کوروش',
];

assert.equal(MELI_PAYAMAK_PATTERN_DEFINITIONS.length, 14, 'SMS catalog must have 14 templates');
assert.equal(TELEGRAM_TEMPLATE_DEFINITIONS.length, 14, 'Telegram catalog must have 14 templates');
assert.equal(new Set(MELI_PAYAMAK_PATTERN_DEFINITIONS.map(x=>x.key)).size, 14, 'SMS keys must be unique');
assert.equal(new Set(TELEGRAM_TEMPLATE_DEFINITIONS.map(x=>x.key)).size, 14, 'Telegram keys must be unique');

for (const d of MELI_PAYAMAK_PATTERN_DEFINITIONS) {
  assert.equal(d.tokens.length, d.tokenKeys.length, `${d.key}: token metadata mismatch`);
  const placeholders = [...d.previewTemplate.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1]));
  assert.deepEqual(placeholders, d.tokenKeys.map((_k, i) => i + 1), `${d.key}: preview placeholder order mismatch`);
  for (const phrase of bad) assert.ok(!d.previewTemplate.includes(phrase), `${d.key}: bad phrase ${phrase}`);
  assert.ok(d.previewTemplate.includes('فروشگاه کوروش'), `${d.key}: brand must be unified`);
}
for (const d of TELEGRAM_TEMPLATE_DEFINITIONS) {
  for (const phrase of bad) assert.ok(!d.preview.includes(phrase), `${d.key}: bad phrase ${phrase}`);
  for (const audience of ['customer','partner','manager']) {
    const t = buildTelegramTemplatePreset(d.key, audience, 'formal');
    assert.ok(t.trim(), `${d.key}/${audience}: preset empty`);
    for (const phrase of bad) assert.ok(!t.includes(phrase), `${d.key}/${audience}: bad phrase ${phrase}`);
  }
}

const cases = [
  ['meli_payamak_installment_due_notice_pattern_id',{name:'ن',dueDate:'1405/06/01',amount:'100'},['ن','1405/06/01','100']],
  ['meli_payamak_repair_cost_notice_pattern_id',{name:'ن',deviceModel:'A',estimatedCost:'200'},['ن','A','200']],
  ['meli_payamak_repair_status_pattern_id',{deviceModel:'A',status:'آماده'},['A','آماده']],
  ['meli_payamak_account_balance_pattern_id',{status:'بدهی شما',amount:'300'},['بدهی شما','300']],
  ['meli_payamak_check_failed_pattern_id',{name:'ن',dueDate:'1405/06/01',amount:'400'},['ن','1405/06/01','400']],
  ['meli_payamak_invoice_created_pattern_id',{name:'ن',invoiceNo:'42',total:'500'},['ن','42','500']],
  ['meli_payamak_invoice_payment_received_pattern_id',{name:'ن',invoiceNo:'42',amount:'250'},['ن','42','250']],
];
for (const [key,vars,expected] of cases) assert.deepEqual(buildMeliPayamakPatternTokens(key,vars),expected,key);

assert.match(buildTelegramTemplatePreset('telegram_check_failed_message','customer','formal'), /برگشتی/);
assert.match(buildTelegramTemplatePreset('telegram_invoice_payment_received_message','manager','formal'), /دریافت وجه فاکتور/);
assert.ok(!cleanAppMessage('عملیات ناعملیات با موفقیت انجام شد بود ثبت شد').includes('عملیات ناعملیات'));

const runtime = read('server/utils/telegramEventNotificationRuntime.ts');
assert.match(runtime, /buildMeliPayamakPatternTokens/);
assert.ok(!runtime.includes('tokenCandidates'), 'generic SMS tokenCandidates must not return');
assert.match(runtime, /telegram_installment_payment_received_message/);
assert.ok(!runtime.includes('APP_MESSAGES.telegram.installmentSettled'));


const reminderRuntime = read('server/routes/reminderRuntime.routes.ts');
assert.match(reminderRuntime, /buildMeliPayamakPatternTokens/);
const installmentsService = read('server/services/installments.service.ts');
assert.match(installmentsService, /buildMeliPayamakPatternTokens/);
const telegramLogs = read('components/TelegramLogsPanel.tsx');
assert.match(telegramLogs, /INSTALLMENT_COMPLETED[^\n]*telegram_installment_settlement_message/);
assert.match(telegramLogs, /INSTALLMENT_PAYMENT_RECEIVED[^\n]*telegram_installment_payment_received_message/);

const repairsRoute = read('server/routes/repairs.routes.ts');
assert.match(repairsRoute, /buildMeliPayamakPatternTokens/);
assert.match(repairsRoute, /buildTelegramTemplatePreset/);
assert.ok(!repairsRoute.includes('const telegramCard ='), 'repair route must not keep duplicate prepared Telegram cards');

const smsVm = read('pages/settings/settingsSmsViewModels.ts');
assert.match(smsVm, /MELI_PAYAMAK_PATTERN_DEFINITIONS/);
const tgVm = read('pages/settings/settingsTelegramViewModels.ts');
assert.match(tgVm, /TELEGRAM_TEMPLATE_DEFINITIONS/);
assert.match(tgVm, /buildTelegramTemplatePreset/);
const collectionHelpers = read('server/utils/collectionCenterHelpers.ts');
assert.match(collectionHelpers, /MESSAGE_BRAND_NAME/);

const settingsRepo = read('server/repositories/settings.repo.ts');
assert.match(settingsRepo, /cleanAppMessage/);
assert.match(settingsRepo, /startsWith\("telegram_"\).*endsWith\("_message"\)/s);

const audience = read('server/utils/telegramAudienceHelpers.ts');
assert.match(audience, /buildTelegramTemplatePreset/);
assert.match(audience, /cleanAppMessage/);

for (const p of [
  'server/utils/telegramAudienceHelpers.ts',
  'server/utils/telegramEventNotificationRuntime.ts',
  'server/routes/reminderRuntime.routes.ts',
  'server/routes/telegramRuntime.routes.ts',
  'server/routes/smsDiagnostics.routes.ts',
  'server/routes/repairs.routes.ts',
  'server/repositories/settings.repo.ts',
  'pages/settings/settingsSmsViewModels.ts',
  'pages/settings/settingsTelegramViewModels.ts',
]) {
  const s=read(p);
  for (const phrase of bad) assert.ok(!s.includes(phrase), `${p}: stale bad phrase ${phrase}`);
}

console.log('PASS v259 messaging templates: central catalog, wording, token order, runtime wiring');
