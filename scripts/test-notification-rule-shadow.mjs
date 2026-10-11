// Isolated fixtures only. Never load application startup, database or providers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../server/notifications/rules/', import.meta.url));
const files = ['notificationRuleTypes', 'notificationTemplateRegistry', 'evaluateNotificationRules', 'notificationRuleShadow'];
const sources = Object.fromEntries(files.map(name => [name, fs.readFileSync(path.join(root, name + '.ts'), 'utf8')]));
const calls = { imports: [], forbidden: [] };
const deny = name => () => { calls.forbidden.push(name); throw Error('Forbidden effect: ' + name); };
class ExplicitDate extends Date {
  constructor(...args) { if (!args.length) deny('implicit clock')(); super(...args); }
  static now = deny('Date.now');
}
const deterministicMath = Object.create(Math);
deterministicMath.random = deny('random');
const cache = {};
function load(name) {
  if (!files.includes(name)) return deny('module ' + name)();
  if (cache[name]) return cache[name];
  const module = { exports: {} };
  const result = ts.transpileModule(sources[name], { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  }, reportDiagnostics: true });
  assert.equal(result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  vm.runInNewContext(result.outputText, {
    module, exports: module.exports, Date: ExplicitDate, Math: deterministicMath,
    fetch: deny('network'), setTimeout: deny('timer'), setInterval: deny('timer'),
    console: { log: deny('console'), warn: deny('console'), error: deny('console') },
    require(specifier) {
      calls.imports.push(specifier);
      if (!specifier.startsWith('./') || !files.includes(specifier.slice(2))) return deny('import ' + specifier)();
      return load(specifier.slice(2));
    },
  }, { filename: name + '.js', timeout: 3000 });
  return cache[name] = module.exports;
}
const { evaluateNotificationRules: evaluate, adaptLegacyReminderRules: adapt } = load('evaluateNotificationRules');
const { notificationTemplateRegistry: registry } = load('notificationTemplateRegistry');
const { compareNotificationRuleDecisions: compare, runNotificationRuleShadow: shadow } = load('notificationRuleShadow');
const plain = value => JSON.parse(JSON.stringify(value));
const equal = (a, b) => assert.deepEqual(plain(a), plain(b));
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const rule = (overrides = {}) => ({ id: 7, version: 'revision-1', enabled: true,
  eventTypes: ['INSTALLMENT_DUE'], entityTypes: ['installment_payment'],
  timing: { type: 'BEFORE_DUE_DATE', daysOffset: 7 }, channel: 'sms',
  templateKey: 'installment_due_notice', conditions: { unpaid: true }, ...overrides });
const context = (overrides = {}) => ({ tenantId: 'fixture-tenant', storeId: 'fixture-store',
  eventType: 'INSTALLMENT_DUE', eventInstanceId: 'fixture-occurrence', entityType: 'installment_payment',
  entityId: 77, customerId: 35, sourceType: 'installment_payments', sourceId: 77,
  eventDate: null, dueDate: '2026-09-22', evaluatedAt: '2026-09-15T07:00:00Z', timezone: 'Asia/Tehran',
  facts: { conditions: { unpaid: true }, variables: { name: 'fixture', dueDate: '2026-09-22', amount: 12000000 },
    amountMeaning: 'scheduled_installment_amount' },
  rules: [rule()], availableTemplates: registry,
  channelCapabilities: { sms: { enabled: true, recipientAvailable: true, templateKeys: registry.map(t => t.key) } }, ...overrides });
const legacy = (overrides = {}) => ({ customerId: 35, sourceType: 'installment_payments', sourceId: 77,
  ruleId: 7, ruleVersion: 'revision-1', scheduledFor: '2026-09-15', schedulePrecision: 'local_date',
  templateKey: 'installment_due_notice', channel: 'sms', amountMeaning: 'scheduled_installment_amount', ...overrides });
const reason = (input, expected) => assert.equal(evaluate(input).decisions[0].reasonCode, expected);
let passed = 0;
function check(name, test) { test(); passed++; console.log('PASS ' + name); }

check('same frozen input produces identical output without mutation', () => {
  const input = freeze(context()); const before = JSON.stringify(input);
  equal(evaluate(input), evaluate(input)); assert.equal(JSON.stringify(input), before);
  reason(input, 'MATCHED');
});
for (const days of [0, 3, 7]) check('legacy days_until=' + days + ' maps and matches', () => {
  const rows = freeze([{ id: 7, enabled: 1, channel: 'sms', matchType: 'days_until', value: days, targetType: 'installment' }]);
  const result = adapt(rows, [{ ruleId: 7, entityType: 'installment_payment', templateKey: 'installment_due_notice' }]);
  assert.equal(result.issues.length, 0);
  assert.equal(result.rules[0].timing.type, days ? 'BEFORE_DUE_DATE' : 'DUE_DATE');
  reason(context({ dueDate: '2026-09-' + (15 + days), rules: result.rules }), 'MATCHED');
});
for (const days of [3, 7, 30]) check('overdue ' + days + ' days maps and matches', () => {
  const result = adapt([{ id: 7, enabled: 1, channel: 'sms', matchType: 'overdue_days', value: days, targetType: 'installment' }],
    [{ ruleId: 7, entityType: 'installment_payment', templateKey: 'installment_overdue' }]);
  const dueDate = new Date(Date.parse('2026-09-15T00:00:00Z') - days * 86400000).toISOString().slice(0, 10);
  assert.equal(result.rules[0].timing.type, 'AFTER_DUE_DATE');
  reason(context({ eventType: 'INSTALLMENT_OVERDUE', dueDate, rules: result.rules }), 'MATCHED');
});
check('legacy both expands targets; templates require explicit per-target bindings', () => {
  const rows = [{ id: 7, enabled: 1, channel: 'telegram', matchType: 'days_until', value: 7 }];
  const result = adapt(rows, []);
  assert.equal(result.rules.length, 2); assert.equal(result.issues.length, 2);
  assert.equal(result.rules[1].eventTypes[0], 'CHECK_DUE');
  assert.equal(result.rules[1].entityTypes[0], 'installment_check');
  assert.equal(result.rules[0].templateKey, '');
  const ambiguous = adapt(rows, [1, 2].map(() => ({ ruleId: 7, entityType: 'installment_payment', templateKey: 'installment_due_notice' })));
  assert.equal(ambiguous.issues[0].code, 'AMBIGUOUS_TEMPLATE_BINDING');
});
check('legacy invalid offset is rejected; negative offset preserves old sign meaning visibly', () => {
  const row = { id: 7, enabled: 1, channel: 'sms', matchType: 'days_until', value: 1.5 };
  assert.equal(adapt([row], []).rules.length, 0);
  const negative = adapt([{ ...row, value: -3 }], []);
  assert.equal(negative.issues[0].code, 'NEGATIVE_LEGACY_OFFSET');
  assert.equal(negative.rules[0].timing.type, 'AFTER_DUE_DATE');
});
check('disabled rule ignored', () => reason(context({ rules: [rule({ enabled: false })] }), 'RULE_DISABLED'));
check('missing fact blocks decision', () => reason(context({ facts: { ...context().facts, conditions: {} } }), 'REQUIRED_FACT_MISSING'));
check('false fact is present and fails condition', () => reason(context({ facts: { ...context().facts, conditions: { unpaid: false } } }), 'CONDITION_NOT_MET'));
check('inherited facts cannot satisfy rule', () => reason(context({ facts: { ...context().facts, conditions: Object.create({ unpaid: true }) } }), 'REQUIRED_FACT_MISSING'));
check('other event and entity do not match', () => {
  reason(context({ eventType: 'INSTALLMENT_SETTLED' }), 'EVENT_NOT_MATCHED');
  reason(context({ entityType: 'installment_check' }), 'TARGET_NOT_MATCHED');
});
check('scope and source identity required', () => {
  reason(context({ tenantId: null, storeId: null }), 'INVALID_CONTEXT');
  reason(context({ sourceId: 0 }), 'INVALID_CONTEXT');
  reason(context({ eventInstanceId: '' }), 'INVALID_CONTEXT');
});
check('timezone determines calendar day across UTC boundary', () => {
  reason(context({ evaluatedAt: '2026-09-14T21:00:00Z' }), 'MATCHED');
  reason(context({ evaluatedAt: '2026-09-14T21:00:00Z', timezone: 'UTC' }), 'NOT_DUE_YET');
  reason(context({ evaluatedAt: '2026-09-16T07:00:00Z' }), 'OCCURRENCE_PASSED');
});
check('invalid dates, implicit timezone and extreme offsets fail closed', () => {
  for (const dueDate of ['2026-02-30', '2026-2-03', '2026-09-22T00:00:00Z']) reason(context({ dueDate }), 'INVALID_DATE');
  reason(context({ evaluatedAt: '2026-09-15T07:00:00' }), 'INVALID_DATE');
  reason(context({ evaluatedAt: '2026-09-15T25:00:00Z' }), 'INVALID_DATE');
  reason(context({ timezone: 'not/a-zone' }), 'INVALID_TIMEZONE');
  reason(context({ rules: [rule({ timing: { type: 'BEFORE_DUE_DATE', daysOffset: Number.MAX_SAFE_INTEGER } })] }), 'INVALID_DATE');
  reason(context({ rules: [rule({ timing: { type: 'DUE_DATE', daysOffset: 7 } })] }), 'INVALID_RULE');
});
check('immediate event uses supplied instant and does not silently catch up old events', () => {
  const input = context({ rules: [rule({ timing: { type: 'IMMEDIATE', daysOffset: 0 } })], eventDate: '2026-09-15T10:00:00+03:30' });
  reason(input, 'MATCHED'); assert.equal(evaluate(input).decisions[0].scheduledFor, '2026-09-15T06:30:00.000Z');
  reason({ ...input, eventDate: '2026-09-15T11:00:00+03:30' }, 'NOT_DUE_YET');
  reason({ ...input, eventDate: '2026-09-14T10:00:00+03:30' }, 'OCCURRENCE_PASSED');
  reason({ ...input, eventDate: null }, 'INVALID_DATE');
});
check('channel availability is explicit; Telegram evaluated without a provider', () => {
  reason(context({ channelCapabilities: {} }), 'CHANNEL_UNAVAILABLE');
  reason(context({ channelCapabilities: { sms: { enabled: true, recipientAvailable: false, templateKeys: [] } } }), 'CHANNEL_UNAVAILABLE');
  reason(context({ rules: [rule({ channel: 'telegram' })], channelCapabilities: { telegram: context().channelCapabilities.sms } }), 'MATCHED');
});
check('template registry must exist, be enabled for channel, unambiguous and event compatible', () => {
  reason(context({ availableTemplates: [] }), 'TEMPLATE_UNAVAILABLE');
  reason(context({ channelCapabilities: { sms: { enabled: true, recipientAvailable: true, templateKeys: [] } } }), 'TEMPLATE_UNAVAILABLE');
  reason(context({ availableTemplates: [...registry, registry[1]] }), 'TEMPLATE_AMBIGUOUS');
  reason(context({ availableTemplates: [{ ...registry[1], eventTypes: ['OTHER'] }] }), 'TEMPLATE_EVENT_MISMATCH');
});
check('required variable checks preserve zero and never generate tokens', () => {
  const facts = context().facts;
  for (const value of [undefined, null, '', '   ', NaN, Infinity, {}, []]) {
    reason(context({ facts: { ...facts, variables: { ...facts.variables, amount: value } } }), 'REQUIRED_VARIABLE_MISSING');
  }
  reason(context({ facts: { ...facts, variables: { ...facts.variables, amount: 0 } } }), 'MATCHED');
  assert.equal('tokens' in evaluate(context()).decisions[0], false);
});
check('amount meaning is required and must match without changing amount', () => {
  reason(context({ facts: { ...context().facts, amountMeaning: null } }), 'AMOUNT_MEANING_MISSING');
  reason(context({ facts: { ...context().facts, amountMeaning: 'transaction_amount' } }), 'AMOUNT_MEANING_MISMATCH');
  reason(context({ availableTemplates: [{ ...registry[1], amountMeaning: null }] }), 'AMOUNT_MEANING_MISSING');
});
check('payment template explicitly requires transaction amount meaning', () => {
  const payment = context({ eventType: 'INSTALLMENT_PAYMENT_RECEIVED', eventDate: '2026-09-15T06:00:00Z',
    sourceType: 'installment_transactions', sourceId: 10,
    rules: [rule({ eventTypes: ['INSTALLMENT_PAYMENT_RECEIVED'], templateKey: 'payment_confirmation', timing: { type: 'IMMEDIATE', daysOffset: 0 } })],
    facts: { ...context().facts, amountMeaning: 'transaction_amount' } });
  reason(payment, 'MATCHED');
  reason({ ...payment, facts: context().facts }, 'AMOUNT_MEANING_MISMATCH');
});
check('non-amount template does not require an invented financial amount', () => {
  reason(context({ eventType: 'INSTALLMENT_SETTLED', eventDate: '2026-09-15T06:00:00Z',
    rules: [rule({ eventTypes: ['INSTALLMENT_SETTLED'], templateKey: 'installment_settlement', timing: { type: 'IMMEDIATE', daysOffset: 0 } })],
    facts: { conditions: { unpaid: true }, variables: { name: 'fixture' }, amountMeaning: null } }), 'MATCHED');
});
check('matching shadow results are silent and inputs stay unchanged', () => {
  const input = freeze({ context: context(), legacyDecisions: [legacy()] });
  const before = JSON.stringify(input), logs = [];
  const result = shadow(input, entry => logs.push(entry));
  assert.equal(result.differences.length, 0); assert.equal(logs.length, 0);
  assert.equal(JSON.stringify(input), before);
});
for (const [change, code] of [
  [{ customerId: 36 }, 'CUSTOMER_DIFFERENT'], [{ sourceId: 78 }, 'SOURCE_DIFFERENT'],
  [{ sourceType: 'installment_transactions' }, 'SOURCE_DIFFERENT'], [{ ruleId: 9 }, 'RULE_DIFFERENT'],
  [{ ruleId: null }, 'RULE_DIFFERENT'], [{ ruleVersion: 'revision-2' }, 'RULE_DIFFERENT'],
  [{ scheduledFor: '2026-09-14' }, 'SCHEDULED_DATE_DIFFERENT'], [{ templateKey: 'other' }, 'TEMPLATE_DIFFERENT'],
  [{ amountMeaning: 'remaining_installment_amount' }, 'AMOUNT_MEANING_DIFFERENT'],
]) check('shadow detects ' + code + ' (' + Object.keys(change)[0] + ')', () => {
  const logs = [], result = shadow({ context: context(), legacyDecisions: [legacy(change)] }, entry => logs.push(entry));
  equal(result.differences[0].codes, [code]); assert.equal(logs.length, 1);
});
check('missing decisions on either side and blocked reason are observable', () => {
  const logs = [];
  const blocked = shadow({ context: context({ facts: { ...context().facts, conditions: {} } }), legacyDecisions: [legacy()] }, e => logs.push(e));
  assert.equal(blocked.differences[0].missingFrom, 'evaluator');
  assert.equal(logs[0].blocked[0].reasonCode, 'REQUIRED_FACT_MISSING');
  const extra = shadow({ context: context(), legacyDecisions: [] }, e => logs.push(e));
  assert.equal(extra.differences[0].missingFrom, 'legacy');
});
check('reordering is silent, duplicate multiplicity and channel mismatch are visible', () => {
  const a = legacy(), b = legacy({ ruleId: 8 });
  assert.equal(compare([a, b], [b, a]).length, 0);
  assert.equal(compare([a, a], [a])[0].missingFrom, 'evaluator');
  assert.equal(compare([a], [{ ...a, channel: 'telegram' }]).length, 2);
});
check('ambiguous unmatched rules are not paired arbitrarily', () => {
  const result = compare([legacy({ ruleId: 1 }), legacy({ ruleId: 2 })], [legacy({ ruleId: 3 }), legacy({ ruleId: 4 })]);
  assert.equal(result.length, 4); assert.ok(result.every(d => d.codes[0] === 'MISSING_DECISION'));
});
check('shadow logs whitelist metadata, omit credentials and amount values', () => {
  const input = context(); input.facts.variables.token = 'SECRET'; input.initData = 'SECRET';
  const logs = [];
  shadow({ context: input, legacyDecisions: [legacy({ sourceId: 78, tokens: ['SECRET'], payload: { password: 'SECRET' } })] }, e => logs.push(e));
  const output = JSON.stringify(logs);
  assert.equal(output.includes('SECRET'), false); assert.equal(output.includes('12000000'), false);
});
check('logging failure is contained and reported', () => {
  const result = shadow({ context: context(), legacyDecisions: [] }, () => { throw Error('fixture logger unavailable'); });
  assert.equal(result.loggingFailed, true); assert.equal(result.evaluation.decisions[0].matched, true);
});
check('no database access: runtime imports confined to new pure modules', () => {
  assert.ok(calls.imports.every(name => files.includes(name.slice(2))));
  for (const [name, source] of Object.entries(sources)) {
    const ast = ts.createSourceFile(name + '.ts', source, ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier) assert.ok(files.some(file => node.moduleSpecifier.text === './' + file));
      }
      if (ts.isCallExpression(node)) {
        assert.notEqual(node.expression.kind, ts.SyntaxKind.ImportKeyword, 'dynamic imports prohibited');
        if (ts.isIdentifier(node.expression)) assert.notEqual(node.expression.text, 'require');
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
});
check('no outbox creation or retry: execution has no persistence dependency', () => {
  assert.equal(calls.imports.some(name => /outbox|database|sqlite|retry/i.test(name)), false);
  assert.equal(calls.forbidden.length, 0);
});
check('no SMS/Telegram provider or network calls during all decision branches', () => {
  assert.equal(calls.imports.some(name => /provider|melipayamak|telegram|messaging/i.test(name)), false);
  equal(calls.forbidden, []);
});

// Sanitized synthetic examples only: no production rows read and no files written.
for (const [label, change] of [['same', {}], ['amount-meaning', { amountMeaning: 'remaining_installment_amount' }], ['date', { scheduledFor: '2026-09-14' }]]) {
  const result = shadow({ context: context(), legacyDecisions: [legacy(change)] }, () => {});
  console.log('SHADOW EXAMPLE ' + JSON.stringify({ label, matched: result.evaluation.decisions[0].matched,
    differences: result.differences.map(d => d.codes) }));
}
console.log(`${passed}/${passed} notification rule shadow tests passed. No database, outbox or provider loaded.`);
