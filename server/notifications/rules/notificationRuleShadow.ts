import { evaluateNotificationRules } from "./evaluateNotificationRules";
import type { NotificationChannel, NotificationEvaluationContext, NotificationEvaluationResult } from "./notificationRuleTypes";

// Prepared, normalized candidates at the same stage: BEFORE delivery windows, caps,
// deduplication, outbox creation or sending. Null ruleId identifies a hardcoded legacy rule.
// One invocation covers one tenant/store and event instance. Dates must use the same
// calendar/instant precision as the evaluator; never supply provider tokens here.
export type ShadowCandidate = Readonly<{
  normalizedEvent?: string;
  customerId: number; sourceType: string; sourceId: number;
  ruleId: number | null; ruleVersion: string | null;
  scheduledFor: string; schedulePrecision: "local_date" | "instant";
  templateKey: string; channel: NotificationChannel; amountMeaning: string | null;
}>;
export type ShadowDifferenceCode = "CUSTOMER_DIFFERENT" | "SOURCE_DIFFERENT" | "RULE_DIFFERENT"
  | "SCHEDULED_DATE_DIFFERENT" | "TEMPLATE_DIFFERENT" | "AMOUNT_MEANING_DIFFERENT" | "MISSING_DECISION"
  | "EVENT_DIFFERENT" | "CHANNEL_DIFFERENT" | "MISSING_LEGACY_DECISION" | "MISSING_NEW_DECISION" | "NEW_DECISION_BLOCKED";
export type ShadowDifference = Readonly<{
  codes: readonly ShadowDifferenceCode[];
  missingFrom: "legacy" | "evaluator" | null;
  legacy: ShadowCandidate | null;
  evaluator: ShadowCandidate | null;
}>;

// Whitelist fields: callers may hold SMS tokens or customer details on their objects.
function summary(value: ShadowCandidate): ShadowCandidate {
  return { normalizedEvent: value.normalizedEvent, customerId: value.customerId, sourceType: value.sourceType, sourceId: value.sourceId,
    ruleId: value.ruleId, ruleVersion: value.ruleVersion, scheduledFor: value.scheduledFor,
    schedulePrecision: value.schedulePrecision, templateKey: value.templateKey,
    channel: value.channel, amountMeaning: value.amountMeaning };
}
function changes(a: ShadowCandidate, b: ShadowCandidate): ShadowDifferenceCode[] {
  const codes: ShadowDifferenceCode[] = [];
  if (a.normalizedEvent !== b.normalizedEvent) codes.push("EVENT_DIFFERENT");
  if (a.customerId !== b.customerId) codes.push("CUSTOMER_DIFFERENT");
  if (a.sourceType !== b.sourceType || a.sourceId !== b.sourceId) codes.push("SOURCE_DIFFERENT");
  if (a.ruleId !== b.ruleId || a.ruleVersion !== b.ruleVersion) codes.push("RULE_DIFFERENT");
  if (a.scheduledFor !== b.scheduledFor || a.schedulePrecision !== b.schedulePrecision) codes.push("SCHEDULED_DATE_DIFFERENT");
  if (a.templateKey !== b.templateKey) codes.push("TEMPLATE_DIFFERENT");
  if (a.amountMeaning !== b.amountMeaning) codes.push("AMOUNT_MEANING_DIFFERENT");
  return codes;
}

// Multiset comparison: reordering is not a difference and duplicates are not collapsed.
// Never pair different channels. Ambiguous many-to-many leftovers are reported as
// missing decisions instead of inventing a correspondence between unrelated rules.
export function compareNotificationRuleDecisions(
  legacyInput: readonly ShadowCandidate[], evaluatorInput: readonly ShadowCandidate[],
): readonly ShadowDifference[] {
  const differences: ShadowDifference[] = [];
  for (const channel of ["sms", "telegram"] as const) {
    const legacy = legacyInput.filter(value => value.channel === channel).map(summary);
    const evaluator = evaluatorInput.filter(value => value.channel === channel).map(summary);
    for (let i = legacy.length - 1; i >= 0; i--) {
      const j = evaluator.findIndex(value => changes(legacy[i], value).length === 0);
      if (j !== -1) { legacy.splice(i, 1); evaluator.splice(j, 1); }
    }
    const pair = (i: number, j: number) => {
      const a = legacy.splice(i, 1)[0], b = evaluator.splice(j, 1)[0];
      differences.push({ codes: changes(a, b), missingFrom: null, legacy: a, evaluator: b });
    };
    for (let i = legacy.length - 1; i >= 0; i--) {
      const id = legacy[i].ruleId;
      if (id == null || legacy.filter(value => value.ruleId === id).length !== 1) continue;
      const matches = evaluator.map((value, j) => value.ruleId === id ? j : -1).filter(j => j !== -1);
      if (matches.length === 1) pair(i, matches[0]);
    }
    if (legacy.length === 1 && evaluator.length === 1) pair(0, 0);
    for (const value of legacy) differences.push({ codes: ["MISSING_DECISION", "MISSING_NEW_DECISION"], missingFrom: "evaluator", legacy: value, evaluator: null });
    for (const value of evaluator) differences.push({ codes: ["MISSING_DECISION", "MISSING_LEGACY_DECISION"], missingFrom: "legacy", legacy: null, evaluator: value });
  }
  // Retain missing-on-each-channel evidence; also name an unambiguous channel change.
  if (legacyInput.length === 1 && evaluatorInput.length === 1 && legacyInput[0].channel !== evaluatorInput[0].channel) {
    for (const difference of differences) (difference.codes as ShadowDifferenceCode[]).push("CHANNEL_DIFFERENT");
  }
  return differences;
}

export type NotificationShadowLog = Readonly<{
  code: "NOTIFICATION_RULE_SHADOW_DIFFERENCE";
  tenantId: string | null; storeId: string | null; eventType: string; eventInstanceId: string; evaluatedAt: string;
  differences: readonly ShadowDifference[];
  blocked: readonly { ruleId: number; channel: NotificationChannel; reasonCode: string }[];
}>;

// Explicit opt-in shadow execution boundary. Accepts captured legacy outcomes; does
// NOT run the old scheduler (which can send). No runtime hooks are installed here.
// Logging is the only effect, injected by the caller. Logging failure cannot affect delivery.
export function runNotificationRuleShadow(
  input: Readonly<{ context: NotificationEvaluationContext; legacyDecisions: readonly ShadowCandidate[]; includeNormalizedEvent?: boolean }>,
  logDifference: (entry: NotificationShadowLog) => void,
): Readonly<{ evaluation: NotificationEvaluationResult; differences: readonly ShadowDifference[]; loggingFailed: boolean }> {
  const { context } = input;
  const evaluation = evaluateNotificationRules(context);
  const candidates: ShadowCandidate[] = evaluation.decisions.filter(decision => decision.matched).map(decision => ({
    normalizedEvent: input.includeNormalizedEvent ? context.eventType : undefined,
    customerId: context.customerId, sourceType: context.sourceType, sourceId: context.sourceId,
    ruleId: decision.ruleId, ruleVersion: decision.ruleVersion, scheduledFor: decision.scheduledFor!,
    schedulePrecision: decision.schedulePrecision, templateKey: decision.templateKey, channel: decision.channel,
    amountMeaning: context.availableTemplates.find(template => template.key === decision.templateKey)!.amountMeaning,
  }));
  const differences = compareNotificationRuleDecisions(input.legacyDecisions, candidates);
  let loggingFailed = false;
  const blocked = evaluation.decisions.filter(value => !value.matched && ![
    "RULE_DISABLED", "EVENT_NOT_MATCHED", "TARGET_NOT_MATCHED", "NOT_DUE_YET", "OCCURRENCE_PASSED", "CONDITION_NOT_MET",
  ].includes(value.reasonCode));
  if (blocked.length) (differences as ShadowDifference[]).push({ codes: ["NEW_DECISION_BLOCKED"], missingFrom: null, legacy: null, evaluator: null });
  if (differences.length) {
    try {
      logDifference({ code: "NOTIFICATION_RULE_SHADOW_DIFFERENCE", tenantId: context.tenantId, storeId: context.storeId,
        eventType: context.eventType, eventInstanceId: context.eventInstanceId, evaluatedAt: context.evaluatedAt,
        differences, blocked: blocked.map(value => ({
          ruleId: value.ruleId, channel: value.channel, reasonCode: value.reasonCode,
        })),
      });
    } catch { loggingFailed = true; }
  }
  return { evaluation, differences, loggingFailed };
}
