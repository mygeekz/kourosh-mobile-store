export const SMS_RULE_CUTOVER_FLAG_KEY = "notification_sms_rule_cutover_enabled";
export const SMS_RULE_CUTOVER_PHASE_KEY = "notification_sms_rule_cutover_phase";
export const SMS_RULE_CUTOVER_PHASE_RULE6 = "rule6_due_today";
export const SMS_RULE_CUTOVER_PHASE_FINALIZED = "finalized";
export const SMS_RULE_CUTOVER_ORIGIN = "notification_rule_cutover_v1";
export const SMS_RULE_CUTOVER_RULE_ID = 6;
export const SMS_RULE_CUTOVER_APPROVED_BODY_ID = 423847;

export type SmsRuleCutoverGate = Readonly<{
  armed: boolean;
  reasonCode:
    | "READY"
    | "KILL_SWITCH_OFF"
    | "PHASE_NOT_ARMED"
    | "AUTO_SEND_SMS_DISABLED"
    | "RULE_NOT_READY"
    | "RULE_SHAPE_MISMATCH"
    | "PROVIDER_MISMATCH"
    | "BODY_ID_MISMATCH";
}>;

const normalized = (value: unknown) => String(value ?? "").trim();
const enabledFlag = (value: unknown) => ["1", "true", "on", "enabled"].includes(normalized(value).toLowerCase());
const isArmedPhase = (value: unknown) => [SMS_RULE_CUTOVER_PHASE_RULE6, SMS_RULE_CUTOVER_PHASE_FINALIZED].includes(normalized(value));

export function isSmsRuleCutoverPayload(payload: any): boolean {
  return normalized(payload?.cutover?.origin) === SMS_RULE_CUTOVER_ORIGIN;
}

export function getSmsRuleCutoverRuleId(payload: any): number | null {
  if (!isSmsRuleCutoverPayload(payload)) return null;
  const id = Number(payload?.cutover?.ruleId);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function evaluateSmsRuleCutoverSchedulerGate(
  settings: Readonly<Record<string, unknown>>,
  rule: Readonly<Record<string, unknown>> | null | undefined,
  options: Readonly<{ readinessReady: boolean; autoSendSmsEnabled: boolean }>,
): SmsRuleCutoverGate {
  if (!enabledFlag(settings[SMS_RULE_CUTOVER_FLAG_KEY])) return { armed: false, reasonCode: "KILL_SWITCH_OFF" };
  if (!isArmedPhase(settings[SMS_RULE_CUTOVER_PHASE_KEY])) return { armed: false, reasonCode: "PHASE_NOT_ARMED" };
  if (!options.autoSendSmsEnabled) return { armed: false, reasonCode: "AUTO_SEND_SMS_DISABLED" };
  const provider = normalized(settings.sms_provider || "meli_payamak").toLowerCase();
  if (provider !== "meli_payamak") return { armed: false, reasonCode: "PROVIDER_MISMATCH" };
  if (Number(settings.meli_payamak_installment_due_notice_pattern_id || 0) !== SMS_RULE_CUTOVER_APPROVED_BODY_ID) {
    return { armed: false, reasonCode: "BODY_ID_MISMATCH" };
  }
  if (!rule || Number(rule.id) !== SMS_RULE_CUTOVER_RULE_ID
    || Number(rule.enabled) !== 1 || normalized(rule.channel) !== "sms"
    || normalized(rule.eventType) !== "INSTALLMENT_DUE"
    || normalized(rule.timingType) !== "BEFORE_DUE_DATE"
    || Number(rule.daysOffset) !== 0
    || normalized(rule.templateKey) !== "installment_due_notice"
    || !["installment", "both"].includes(normalized(rule.targetType))) {
    return { armed: false, reasonCode: "RULE_SHAPE_MISMATCH" };
  }
  if (!options.readinessReady) return { armed: false, reasonCode: "RULE_NOT_READY" };
  return { armed: true, reasonCode: "READY" };
}

// Provider-boundary guard. This is deliberately independent of the scheduler gate so
// disabling the kill switch blocks already queued cutover rows before a provider call.
export function evaluateSmsRuleCutoverWorkerGate(
  settings: Readonly<Record<string, unknown>>,
  payload: any,
): SmsRuleCutoverGate & { applicable: boolean } {
  if (!isSmsRuleCutoverPayload(payload)) return { applicable: false, armed: true, reasonCode: "READY" };
  if (!enabledFlag(settings[SMS_RULE_CUTOVER_FLAG_KEY])) return { applicable: true, armed: false, reasonCode: "KILL_SWITCH_OFF" };
  if (!isArmedPhase(settings[SMS_RULE_CUTOVER_PHASE_KEY])) return { applicable: true, armed: false, reasonCode: "PHASE_NOT_ARMED" };
  if (getSmsRuleCutoverRuleId(payload) !== SMS_RULE_CUTOVER_RULE_ID) return { applicable: true, armed: false, reasonCode: "RULE_SHAPE_MISMATCH" };
  const provider = normalized(payload?.provider || settings.sms_provider || "meli_payamak").toLowerCase();
  if (provider !== "meli_payamak") return { applicable: true, armed: false, reasonCode: "PROVIDER_MISMATCH" };
  const payloadBodyId = Number(payload?.meliBodyId || 0);
  const configuredBodyId = Number(settings.meli_payamak_installment_due_notice_pattern_id || 0);
  if (payloadBodyId !== SMS_RULE_CUTOVER_APPROVED_BODY_ID || configuredBodyId !== SMS_RULE_CUTOVER_APPROVED_BODY_ID) {
    return { applicable: true, armed: false, reasonCode: "BODY_ID_MISMATCH" };
  }
  return { applicable: true, armed: true, reasonCode: "READY" };
}
