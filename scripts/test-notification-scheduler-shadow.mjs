import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import moment from 'jalali-moment';
import { compile, extract, readSource, loadShadowModules } from './lib/notification-rule-shadow-harness.mjs';
const shadow = loadShadowModules();
const equal = (a, b) => assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
const row = { paymentId: 77, saleId: 33, customerId: 35, customerFullName: 'fixture', customerPhone: 'PRIVATE_PHONE',
  dueDate: '1405/06/31', originalAmountDue: 12000000, effectiveRemaining: 9000000 };
const rules = (offset = 7, extra = {}) => [{ id: 7, enabled: 1, channel: 'sms', matchType: 'days_until', value: offset,
  targetType: 'installment', updatedAt: 'fixture-v1', templateKey: 'installment_due_notice', ...extra }];
const state = (extra = {}) => ({ rules: rules(), timezone: 'Asia/Tehran', storeId: 'fixture-store',
  configuredTemplateKeys: ['installment_due_notice', 'installment_due_3', 'installment_due_7', 'installment_overdue', 'check_due'], ...extra });
const input = (extra = {}) => ({ kind: 'installment', row, mode: 'sms', originalEventType: 'INSTALLMENT_DUE_7',
  legacyDate: '2026-09-15', evaluatedAt: '2026-09-15T07:00:00Z', ...extra });
const observe = (s = state(), i = input(), log = () => {}) => shadow.observeSchedulerRuleCandidate(s, i, log)[0];

for (const days of [0,3,7]) await check('real legacy installment ' + days + '-day decision normalizes without changing production event', () => {
  const dueDate = moment('2026-09-15').add(days, 'day').format('jYYYY/jMM/jDD');
  const event = 'INSTALLMENT_DUE_' + (days || 'TODAY');
  const result = observe(state({ rules: rules(days) }), input({ row: { ...row, dueDate }, originalEventType: event }));
  assert.equal(result.originalEventType, event); assert.equal(result.normalizedEvent, 'INSTALLMENT_DUE');
  assert.equal(result.evaluation.decisions[0].matched, true);
  assert.ok(result.differences.some(d => d.codes.includes('RULE_DIFFERENT'))); // legacy has no stored rule
});
await check('overdue rule detects new occurrence absent from hardcoded scheduler', () => {
  const result = observe(state({ rules: rules(3, { matchType: 'overdue_days', templateKey: 'installment_overdue' }) }),
    input({ originalEventType: null, row: { ...row, dueDate: '2026-09-12' } }));
  assert.equal(result.evaluation.decisions[0].matched, true);
  assert.equal(result.normalizedEvent, 'INSTALLMENT_OVERDUE');
  assert.ok(result.differences.some(d => d.codes.includes('MISSING_LEGACY_DECISION')));
});
await check('check uses original check amount and check source ID', () => {
  const result = observe(state({ rules: rules(0, { targetType: 'check', templateKey: 'check_due' }) }), input({ kind: 'check',
    originalEventType: 'CHECK_DUE_TODAY', row: { checkId: 8, customerId: 35, customerFullName: 'fixture',
      customerPhoneNumber: 'PRIVATE_PHONE', checkNumber: 'fixture', dueDate: '2026-09-15', amount: 100, originalAmount: 300 } }));
  assert.equal(result.evaluation.decisions[0].matched, true); assert.equal(result.sourceId, 8);
  assert.equal(result.normalizedEvent, 'CHECK_DUE');
});
await check('Telegram rules never become SMS rules; no default SMS rule created', () => {
  const result = observe(state({ rules: rules(7, { channel: 'telegram' }) }));
  assert.equal(result.evaluation.decisions.length, 0);
  assert.ok(result.differences.some(d => d.codes.includes('MISSING_NEW_DECISION')));
});
await check('missing configured SMS template blocks new decision', () => {
  const result = observe(state({ configuredTemplateKeys: [] }));
  assert.equal(result.evaluation.decisions[0].reasonCode, 'TEMPLATE_UNAVAILABLE');
  assert.ok(result.differences.some(d => d.codes.includes('NEW_DECISION_BLOCKED')));
});
await check('Telegram semantic template does not require SMS provider configuration', () => {
  const result = observe(state({ rules: rules(7, { channel: 'telegram' }), configuredTemplateKeys: [] }),
    input({ mode: 'telegram', row: { ...row, telegramChatId: 'PRIVATE_CHAT_ID' } }));
  assert.equal(result.evaluation.decisions[0].matched, true);
  assert.equal(result.evaluation.decisions[0].channel, 'telegram');
});
await check('free-text rule cannot invent a semantic/provider binding', () => {
  const result = observe(state({ rules: rules(7, { templateKey: undefined, template: 'PRIVATE_TEXT {name} {amount}' }) }));
  assert.equal(result.evaluation.decisions[0].reasonCode, 'TEMPLATE_UNAVAILABLE');
  const literal = observe(state({ rules: rules(7, { templateKey: undefined, template: 'installment_due_notice' }) }));
  assert.equal(literal.evaluation.decisions[0].reasonCode, 'TEMPLATE_UNAVAILABLE');
});
await check('one rule template capability cannot enable an unconfigured occurrence', () => {
  const result = observe(state({ rules: [...rules(0), ...rules(7, { id: 8 })], configuredTemplateKeys: ['installment_due_notice'] }));
  assert.equal(result.evaluation.decisions[1].reasonCode, 'TEMPLATE_UNAVAILABLE');
});
await check('calendar normalization and configured timezone boundary are explicit', () => {
  assert.equal(shadow.schedulerCivilDate('1405/06/31'), '2026-09-22');
  const result = observe(state(), input({ evaluatedAt: '2026-09-14T21:00:00Z', legacyDate: '2026-09-14' }));
  assert.equal(result.evaluation.decisions[0].matched, true);
  assert.ok(result.differences.some(d => d.codes.includes('SCHEDULED_DATE_DIFFERENT')));
  const utc = observe(state({ timezone: 'UTC' }), input({ evaluatedAt: '2026-09-14T21:00:00Z' }));
  assert.equal(utc.evaluation.decisions[0].reasonCode, 'NOT_DUE_YET');
});
await check('normalized event and channel differences are named', () => {
  const a = { customerId: 1, sourceType: 'installment', sourceId: 2, normalizedEvent: 'INSTALLMENT_DUE',
    ruleId: 1, ruleVersion: null, scheduledFor: '2026-09-15', schedulePrecision: 'local_date', templateKey: 'a', amountMeaning: 'a', channel: 'sms' };
  assert.ok(shadow.compareNotificationRuleDecisions([a], [{ ...a, normalizedEvent: 'CHECK_DUE' }])[0].codes.includes('EVENT_DIFFERENT'));
  assert.ok(shadow.compareNotificationRuleDecisions([a], [{ ...a, channel: 'telegram' }])[0].codes.includes('CHANNEL_DIFFERENT'));
});
await check('structured log excludes phone, amount, text, tokens and settings', () => {
  const logs = [];
  observe(state({ rules: rules(7, { templateKey: undefined, template: 'PRIVATE_TEXT' }) }), input({ row: { ...row, credentials: 'SECRET' } }), e => logs.push(e));
  assert.equal(/PRIVATE_PHONE|PRIVATE_TEXT|12000000|9000000|SECRET/.test(JSON.stringify(logs)), false);
});
await check('readers load actual channels and only SELECT config; snapshot copies rule scalars', async () => {
  const calls = [], raw = rules();
  const s = await shadow.prepareSchedulerRuleShadow({ installation_id: 'fixture', meli_payamak_installment_due_7_pattern_id: '42', bot_token: 'SECRET' }, {
    getEnabledReminderRules: async c => { calls.push(c); return c === 'sms' ? raw : []; },
    getAsync: async sql => { assert.match(sql, /^SELECT timezone FROM reminder_config/); return { timezone: 'Asia/Tehran' }; },
  });
  equal(calls, ['sms', 'telegram']); raw[0].value = 999;
  assert.equal(s.rules[0].value, 7); assert.equal(JSON.stringify(s).includes('SECRET'), false);
});

const runtimeFile = 'server/utils/telegramEventNotificationRuntime.ts';
const removeShadow = text => text.replace(/^[ \t]*\/\/ shadow-only:start\n[\s\S]*?^[ \t]*\/\/ shadow-only:end\n/gm, '');
await check('all pre-existing runtime source is byte-equivalent after removing observation-only blocks', () => {
  assert.equal(createHash('sha256').update(removeShadow(readSource(runtimeFile))).digest('hex'),
    '676644cc4dfcc9fbba4388a46db2baf544f5d68f342f22a1f155c6a9f5f4442d');
});
const schedulerSource = extract(runtimeFile, ['runAutoSendRulesOnce']);
async function runFixture({ old = false, fail = '', tg = false } = {}) {
  const calls = [], logs = [], fixed = '2026-09-15T07:00:00Z';
  const now = moment(fixed);
  const candidates = [0,3,7,8,-3].map((n,i) => ({ ...row, paymentId: i + 1, dueDate: now.clone().add(n,'day').format('jYYYY/jMM/jDD') }));
  const bindings = {
    moment: (...args) => args.length ? moment(...args) : moment(fixed),
    getAllSettingsAsObject: async () => ({ installation_id: 'fixture', auto_send_installment_due: 'both', auto_send_check_due: 'sms', auto_send_repair_ready: 'off' }),
    normalizeAutoSendMode: value => value,
    getEnabledReminderRules: async channel => {
      if (channel === 'sms' && fail === 'loader') throw Error('SECRET');
      return channel === 'telegram' ? (tg ? rules(7, { channel: 'telegram' }) : []) : rules();
    }, getAsync: async () => ({ timezone: 'Asia/Tehran' }),
    ensureReminderRulesTables: async () => {},
    runCustomerTelegramNotificationsTick: async () => calls.push(['legacyTick']),
    getPendingInstallmentPaymentsWithCustomer: async () => candidates,
    getPendingInstallmentChecksWithCustomer: async () => [{ ...candidates[0], checkId: 12, originalAmount: 100, amount: 100 }],
    getRepairsReadyForPickupFromDb: async () => [],
    enqueueEventNotifications: async (...args) => calls.push(['enqueue', ...args]),
    processOneOutboxRow: async () => { calls.push(['process']); return false; },
    ...shadow,
    observeSchedulerRuleCandidate: (...args) => { if (fail === 'evaluator') throw Error('SECRET'); return shadow.observeSchedulerRuleCandidate(...args); },
    console: { info: (...args) => { if (fail === 'logger') throw Error('SECRET'); logs.push(args); }, warn() {}, error() {} },
  };
  const runtime = compile(old ? removeShadow(schedulerSource) : schedulerSource, bindings);
  await runtime.runAutoSendRulesOnce(); return { calls, logs };
}
for (const fail of ['', 'evaluator', 'logger', 'loader']) await check('actual scheduler preserves enqueue, process and event args: ' + (fail || 'normal'), async () => {
  for (const tg of [false, true]) {
    const before = await runFixture({ old: true, tg }), after = await runFixture({ fail, tg });
    equal(after.calls, before.calls);
    assert.equal(after.calls.filter(c => c[0] === 'enqueue').length, 4);
  }
});
await check('malformed rule and logger failure contained in observation boundary', () => {
  let continued = false;
  shadow.safelyObserveSchedulerCandidate(() => observe(state({ rules: [null] })));
  shadow.safelyObserveSchedulerCandidate(() => observe(state(), input(), () => { throw Error('SECRET'); }));
  continued = true; assert.equal(continued, true);
});
await check('shadow module graph has no database, outbox, provider or retry capability', () => {
  assert.ok(shadow.imports.every(p => p === 'jalali-moment' || ['../../../shared/messages','../../../shared/notifications/smsReminderRule'].includes(p) || /^\.\/(evaluateNotificationRules|notificationRuleTypes|notificationRuleShadow|notificationTemplateRegistry|smsReminderRuleReadiness)$/.test(p)));
  // All branches above execute without any DB writer or sender binding in the VM.
  assert.ok(!shadow.imports.some(p => /database|outbox|smsService|telegramService|routes/.test(p)));
});
console.log(`${passed}/${passed} scheduler shadow checks passed; mock legacy effects only; no SMS or Telegram sent.`);
