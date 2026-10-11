import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  evaluateSmsRuleCutoverSchedulerGate,
  evaluateSmsRuleCutoverWorkerGate,
  SMS_RULE_CUTOVER_APPROVED_BODY_ID,
  SMS_RULE_CUTOVER_FLAG_KEY,
  SMS_RULE_CUTOVER_ORIGIN,
  SMS_RULE_CUTOVER_PHASE_KEY,
  SMS_RULE_CUTOVER_PHASE_RULE6,
  SMS_RULE_CUTOVER_PHASE_FINALIZED,
} from '../server/notifications/rules/smsRuleControlledCutover.ts';

const rule6 = {
  id: 6, enabled: 1, channel: 'sms', targetType: 'installment',
  eventType: 'INSTALLMENT_DUE', timingType: 'BEFORE_DUE_DATE', daysOffset: 0,
  templateKey: 'installment_due_notice',
};
const baseSettings = {
  sms_provider: 'meli_payamak', auto_send_installment_due: 'sms',
  meli_payamak_installment_due_notice_pattern_id: String(SMS_RULE_CUTOVER_APPROVED_BODY_ID),
};
const armedSettings = { ...baseSettings, [SMS_RULE_CUTOVER_FLAG_KEY]: '1', [SMS_RULE_CUTOVER_PHASE_KEY]: SMS_RULE_CUTOVER_PHASE_RULE6 };
const finalizedSettings = { ...baseSettings, [SMS_RULE_CUTOVER_FLAG_KEY]: '1', [SMS_RULE_CUTOVER_PHASE_KEY]: SMS_RULE_CUTOVER_PHASE_FINALIZED };

assert.equal(evaluateSmsRuleCutoverSchedulerGate(baseSettings, rule6, { readinessReady: true, autoSendSmsEnabled: true }).reasonCode, 'KILL_SWITCH_OFF');
assert.equal(evaluateSmsRuleCutoverSchedulerGate({ ...baseSettings, [SMS_RULE_CUTOVER_FLAG_KEY]: '1' }, rule6, { readinessReady: true, autoSendSmsEnabled: true }).reasonCode, 'PHASE_NOT_ARMED');
assert.equal(evaluateSmsRuleCutoverSchedulerGate({ ...armedSettings, meli_payamak_installment_due_notice_pattern_id: '999' }, rule6, { readinessReady: true, autoSendSmsEnabled: true }).reasonCode, 'BODY_ID_MISMATCH');
assert.equal(evaluateSmsRuleCutoverSchedulerGate(armedSettings, { ...rule6, id: 5 }, { readinessReady: true, autoSendSmsEnabled: true }).reasonCode, 'RULE_SHAPE_MISMATCH');
assert.equal(evaluateSmsRuleCutoverSchedulerGate(armedSettings, rule6, { readinessReady: false, autoSendSmsEnabled: true }).reasonCode, 'RULE_NOT_READY');
assert.equal(evaluateSmsRuleCutoverSchedulerGate(armedSettings, rule6, { readinessReady: true, autoSendSmsEnabled: false }).reasonCode, 'AUTO_SEND_SMS_DISABLED');
assert.deepEqual(evaluateSmsRuleCutoverSchedulerGate(armedSettings, rule6, { readinessReady: true, autoSendSmsEnabled: true }), { armed: true, reasonCode: 'READY' });
assert.deepEqual(evaluateSmsRuleCutoverSchedulerGate(finalizedSettings, rule6, { readinessReady: true, autoSendSmsEnabled: true }), { armed: true, reasonCode: 'READY' });

const payload = { provider: 'meli_payamak', meliBodyId: SMS_RULE_CUTOVER_APPROVED_BODY_ID, cutover: { origin: SMS_RULE_CUTOVER_ORIGIN, phase: SMS_RULE_CUTOVER_PHASE_RULE6, ruleId: 6 } };
assert.equal(evaluateSmsRuleCutoverWorkerGate({}, { provider: 'meli_payamak' }).applicable, false);
assert.equal(evaluateSmsRuleCutoverWorkerGate(baseSettings, payload).reasonCode, 'KILL_SWITCH_OFF');
assert.deepEqual(evaluateSmsRuleCutoverWorkerGate(armedSettings, payload), { applicable: true, armed: true, reasonCode: 'READY' });
assert.deepEqual(evaluateSmsRuleCutoverWorkerGate(finalizedSettings, payload), { applicable: true, armed: true, reasonCode: 'READY' });
assert.equal(evaluateSmsRuleCutoverWorkerGate(armedSettings, { ...payload, meliBodyId: 999 }).reasonCode, 'BODY_ID_MISMATCH');

const schedulerSource = fs.readFileSync(new URL('../server/utils/telegramEventNotificationRuntime.ts', import.meta.url), 'utf8');
const outboxSource = fs.readFileSync(new URL('../server/utils/notificationOutboxRuntime.ts', import.meta.url), 'utf8');
const bootstrapSource = fs.readFileSync(new URL('../server/bootstrap/messagingRuntime.ts', import.meta.url), 'utf8');
assert.match(schedulerSource, /runControlledSmsRule6Cutover/);
assert.match(schedulerSource, /observeSchedulerRuleCandidate\(shadowState/);
assert.match(schedulerSource, /if \(!decision\.matched\)/);
assert.match(schedulerSource, /eventType: "INSTALLMENT_DUE_NOTICE"/);
assert.match(schedulerSource, /cutover\.armed && et === "INSTALLMENT_DUE_TODAY"/);
assert.match(schedulerSource, /dedupeToday: true, dedupeEventWindowHours: 36/);
assert.match(outboxSource, /evaluateSmsRuleCutoverWorkerGate/);
assert.match(outboxSource, /CUTOVER_GUARD_BLOCKED/);
assert.match(outboxSource, /attempts=maxAttempts/);
assert.match(bootstrapSource, /hasCustomerDailyCap: deps\.hasCustomerDailyCap/);
assert.match(bootstrapSource, /hasPendingCustomerCapInOutbox: deps\.hasPendingCustomerCapInOutbox/);

console.log('PASS controlled SMS rule cutover: default-off kill switch, rule-6-only scheduler gate, legacy same-day SMS handoff, outbox/provider boundary guard');
