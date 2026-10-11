import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';

function transpile(file, jsx = false) {
  const source = fs.readFileSync(file, 'utf8');
  const compilerOptions = {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  };
  if (jsx) compilerOptions.jsx = ts.JsxEmit.ReactJSX;
  const compiled = ts.transpileModule(source, {
    compilerOptions,
    reportDiagnostics: true,
    fileName: file,
  });
  const errors = (compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join('; '));
  return compiled.outputText;
}

function load(file, deps = {}) {
  const module = { exports: {} };
  vm.runInNewContext(transpile(file), {
    module,
    exports: module.exports,
    console: { error() {}, warn() {}, info() {}, log() {} },
    require(name) {
      if (Object.hasOwn(deps, name)) return deps[name];
      throw new Error(`Unmocked import: ${name}`);
    },
  });
  return module.exports;
}

for (const file of [
  'server/smsService.ts',
  'server/utils/smsLogHelpers.ts',
  'server/utils/notificationOutboxRuntime.ts',
  'server/services/installments.service.ts',
  'server/utils/notificationAmountIntegrity.ts',
  'server/routes/reminderRuntime.routes.ts',
  'server/notifications/rules/smsRuleControlledCutover.ts',
]) transpile(file);
transpile('components/SmsLogsPanel.tsx', true);
console.log('PASS modified SMS logging files transpile without syntax diagnostics');

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE sms_logs(
  id INTEGER PRIMARY KEY AUTOINCREMENT, createdAt TEXT, createdByUserId INTEGER, createdByUsername TEXT,
  provider TEXT, eventType TEXT, entityType TEXT, entityId INTEGER, recipient TEXT, patternId TEXT,
  tokensJson TEXT, success INTEGER, requestJson TEXT, httpStatus INTEGER, rawResponseText TEXT,
  durationMs INTEGER, correlationId TEXT, responseJson TEXT, error TEXT, errorText TEXT, relatedLogId INTEGER
)`);

const contextStub = {
  buildNotificationContext: (row, payload, supplied = {}) => ({
    schemaVersion: 1,
    eventType: row.eventType ?? null,
    entityType: row.entityType ?? null,
    entityId: row.entityId ?? null,
    createdAt: row.createdAt ?? null,
    ...supplied,
  }),
  notificationValidationSummary: value => value ? { reason: value.reason } : null,
};

const logs = load('server/utils/smsLogHelpers.ts', {
  '../database': { runAsync: async (sql, params) => db.prepare(sql).run(...params) },
  './notificationContext': contextStub,
});

await logs.insertSmsLog({
  provider: 'meli_payamak',
  eventType: 'INSTALLMENT_COMPLETED',
  entityType: 'installment',
  entityId: 47,
  recipient: 'fixture-phone',
  success: true,
  request: {
    financialSms: {
      context: { eventType: 'INSTALLMENT_COMPLETED', entityType: 'installment_sale', entityId: 47, createdAt: '2026-09-21T00:00:00Z' },
      payload: { meliBodyId: 341280, tokens: ['name', '6200000'] },
    },
  },
  response: {
    success: true,
    message: 'ok',
    details: { Value: '1234567890123456', httpStatus: 200, rawResponseText: '{"Value":"123"}', durationMs: 321 },
  },
});

const row = db.prepare('SELECT * FROM sms_logs ORDER BY id DESC LIMIT 1').get();
assert.equal(row.patternId, '341280');
assert.equal(row.tokensJson, JSON.stringify(['name', '6200000']));
assert.equal(row.httpStatus, 200);
assert.equal(row.rawResponseText, '{"Value":"123"}');
assert.equal(row.durationMs, 321);
const request = JSON.parse(row.requestJson);
assert.equal(request.providerRequest.provider, 'meli_payamak');
assert.equal(request.providerRequest.patternId, '341280');
assert.deepEqual(Array.from(request.providerRequest.tokens), ['name', '6200000']);
assert.equal(Object.hasOwn(request.providerRequest, 'username'), false);
assert.equal(Object.hasOwn(request.providerRequest, 'password'), false);
console.log('PASS SMS logger recovers pattern/tokens and response telemetry without credentials');
db.close();

const cutover = load('server/notifications/rules/smsRuleControlledCutover.ts');
const rule6 = {
  id: 6, enabled: 1, channel: 'sms', targetType: 'installment', eventType: 'INSTALLMENT_DUE',
  timingType: 'BEFORE_DUE_DATE', daysOffset: 0, templateKey: 'installment_due_notice',
};
const payload = {
  provider: 'meli_payamak', meliBodyId: 423847,
  cutover: { origin: 'notification_rule_cutover_v1', phase: 'rule6_due_today', ruleId: 6 },
};
for (const phase of ['rule6_due_today', 'finalized']) {
  const settings = {
    sms_provider: 'meli_payamak',
    meli_payamak_installment_due_notice_pattern_id: '423847',
    notification_sms_rule_cutover_enabled: '1',
    notification_sms_rule_cutover_phase: phase,
  };
  const scheduler = cutover.evaluateSmsRuleCutoverSchedulerGate(settings, rule6, { readinessReady: true, autoSendSmsEnabled: true });
  assert.equal(scheduler.armed, true);
  assert.equal(scheduler.reasonCode, 'READY');
  const worker = cutover.evaluateSmsRuleCutoverWorkerGate(settings, payload);
  assert.equal(worker.applicable, true);
  assert.equal(worker.armed, true);
  assert.equal(worker.reasonCode, 'READY');
}
console.log('PASS Rule6 provider guard remains armed after finalized lifecycle phase');

const panel = fs.readFileSync('components/SmsLogsPanel.tsx', 'utf8');
for (const marker of [
  'resolveLogPatternId', 'resolveLogTokens', 'resolveLogHttpStatus',
  'resolveLogDurationMs', 'resolveLogRawResponse', 'getResponseDetails(selected)?.endpoint',
]) assert.ok(panel.includes(marker), `Missing UI fallback: ${marker}`);
console.log('PASS SMS log detail UI contains historical log fallbacks');
